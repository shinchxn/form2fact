import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../src/types/index.ts';
import { AppError } from './core/errors/AppError.ts';
import { db } from './db.ts';

const FALLBACK_DEV_SECRET = 'form2fact-dev-jwt-secret-do-not-use-in-production-32c';

/**
 * Validates and resolves the active JWT signing key.
 * In production mode, an externally configured high-entropy secret (>= 32 chars)
 * is strictly required. Application startup fails immediately if absent or insecure.
 */
export function resolveJwtSecret(
  envSecret = process.env.JWT_SECRET,
  nodeEnv = process.env.NODE_ENV,
  exitFn: (code: number) => void = (code) => process.exit(code)
): string {
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    if (!envSecret || envSecret.trim().length === 0) {
      console.error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production environment!');
      exitFn(1);
      throw new Error('JWT_SECRET missing in production');
    }

    if (envSecret === FALLBACK_DEV_SECRET || envSecret === 'form2fact-scrutiny-engine-jwt-secret-key-2026') {
      console.error('FATAL SECURITY ERROR: JWT_SECRET must not use insecure default/fallback values in production!');
      exitFn(1);
      throw new Error('JWT_SECRET uses insecure fallback in production');
    }

    if (envSecret.length < 32) {
      console.error('FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters in length for production security!');
      exitFn(1);
      throw new Error('JWT_SECRET too short in production');
    }

    return envSecret;
  }

  // Development / Test configuration
  if (envSecret && envSecret.trim().length >= 16) {
    return envSecret;
  }

  return FALLBACK_DEV_SECRET;
}

const JWT_SECRET = resolveJwtSecret();
const TOKEN_EXPIRY = '24h';

export interface AuthenticatedUser extends User {
  organizationId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  organizationId?: string;
}

/**
 * Signs a cryptographically verified JWT token with trusted server-side claims.
 */
export function generateToken(user: AuthenticatedUser, customSecret?: string): string {
  const secretToUse = customSecret || JWT_SECRET;
  return jwt.sign(
    {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      department: user.department,
      organizationId: user.organizationId || 'org-aicte-western'
    },
    secretToUse,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verifies and decodes a signed JWT token string.
 */
export function verifyToken(token: string, customSecret?: string): AuthenticatedUser | null {
  try {
    const secretToUse = customSecret || JWT_SECRET;
    const decoded = jwt.verify(token, secretToUse) as any;
    return {
      id: decoded.id,
      displayName: decoded.displayName,
      email: decoded.email,
      role: decoded.role as UserRole,
      department: decoded.department,
      organizationId: decoded.organizationId || 'org-aicte-western'
    };
  } catch {
    // Graceful backward compatibility in non-production: accept tokens signed with fallback dev secret
    if (process.env.NODE_ENV !== 'production' && !customSecret && JWT_SECRET !== FALLBACK_DEV_SECRET) {
      try {
        const decoded = jwt.verify(token, FALLBACK_DEV_SECRET) as any;
        return {
          id: decoded.id,
          displayName: decoded.displayName,
          email: decoded.email,
          role: decoded.role as UserRole,
          department: decoded.department,
          organizationId: decoded.organizationId || 'org-aicte-western'
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Enforces mandatory valid JWT authentication across protected endpoints.
 * Revalidates user identity and role freshness against the database to prevent
 * unauthorized privilege retention post-role change.
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Authorization header missing or malformed.',
      code: 'UNAUTHORIZED'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication session token.',
      code: 'INVALID_TOKEN'
    });
  }

  // Token freshness check: revalidate user and role from persistent server-side record
  const dbUser = db.getUserById(decoded.id);
  if (!dbUser) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed: User account record does not exist or has been disabled.',
      code: 'USER_NOT_FOUND'
    });
  }

  // Role revocation guard: ensure stale token cannot retain revoked privileges
  if (dbUser.role !== decoded.role) {
    return res.status(401).json({
      success: false,
      error: 'Authentication session invalidated due to a permission or role modification. Please re-authenticate.',
      code: 'ROLE_REVOKED'
    });
  }

  req.user = {
    id: dbUser.id,
    displayName: dbUser.displayName,
    email: dbUser.email,
    role: dbUser.role,
    department: dbUser.department,
    organizationId: dbUser.organizationId || decoded.organizationId || 'org-aicte-western'
  };
  req.organizationId = req.user.organizationId;
  next();
}

/**
 * Optional authentication middleware for backward-compatible demonstration helper routes.
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const dbUser = db.getUserById(decoded.id);
      if (dbUser && dbUser.role === decoded.role) {
        req.user = {
          id: dbUser.id,
          displayName: dbUser.displayName,
          email: dbUser.email,
          role: dbUser.role,
          department: dbUser.department,
          organizationId: dbUser.organizationId || decoded.organizationId || 'org-aicte-western'
        };
        req.organizationId = req.user.organizationId;
      }
    }
  }
  next();
}

/**
 * Server-enforced Role-Based Access Control (RBAC).
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required before verifying access privileges.',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Persona role '${req.user.role}' lacks authorization for this statutory action. Required: ${allowedRoles.join(', ')}.`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

/**
 * Enforces Organization / Tenant isolation
 */
export function requireOrg(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const userOrg = req.user?.organizationId || req.organizationId;
  const targetOrg = req.params.orgId || req.headers['x-organization-id'] as string;

  if (targetOrg && userOrg && targetOrg !== userOrg && req.user?.role !== 'Administrator') {
    return next(AppError.forbidden(`Cross-tenant access prohibited for organization: ${targetOrg}`));
  }

  next();
}

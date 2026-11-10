import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db.ts';
import { DocumentRecord, DocumentType, ExtractedField, ScrutinyReportData, User, FiveClassLabel, AnnotationRecord } from '../src/types/index.ts';
import { extractFieldsFromPages, runDeepScrutinyAnalysis } from './extraction.ts';
import { evaluateSingleRuleSandbox } from './rulesEngine.ts';
import {
  AuthenticatedRequest,
  authenticateToken,
  requireRole,
  requireOrg,
  generateToken
} from './auth.ts';
import { domainRegistry } from './domains/index.ts';
import { buildAicteLeasePreview } from './domains/aicte/adapter.ts';
import { OrganizationService } from './modules/organizations/organization.service.ts';
import { PairwiseFieldClassifier } from './modules/verification/pairwiseEngine.ts';
import { BharatCodeService } from './modules/explanation/bharatCodeService.ts';
import { modelRegistry, modelRouter } from './modules/ai/providers/index.ts';
import { jobQueue } from './core/jobs/index.ts';
import { storageProvider } from './core/storage/index.ts';
import { validate } from './core/validation/validate.ts';
import { errorHandler } from './core/errors/errorHandler.ts';
import { securityHeaders } from './core/securityHeaders.ts';
import { authRateLimiter } from './core/rateLimit.ts';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// JSON and URL-encoded body parsers
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Baseline security headers on every API response
router.use(securityHeaders);

// =========================================================================
// PUBLIC ENDPOINTS (No JWT required)
// =========================================================================

/**
 * Health check endpoint for container probes & operational monitoring
 */
router.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Form2Fact Document Intelligence Platform',
    version: '1.2.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Institutional Login with email and password
 * MED-2 remediation: bounded by per-IP+email rate limiter (429 on excess)
 */
router.post('/api/v1/auth/login', authRateLimiter.middleware('auth-login'), (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // BLOCKER 1: In production mode, demo persona credentials are strictly prohibited
  const DEMO_EMAILS = [
    'aruna.rao@scrutiny.edu.in',
    'vk.sharma@scrutiny.edu.in',
    'meenakshi.s@audit.gov.in',
    'rajesh.verma@scrutiny.edu.in'
  ];
  if (process.env.NODE_ENV === 'production' && DEMO_EMAILS.includes(cleanEmail)) {
    return res.status(401).json({ success: false, error: 'Demonstration persona credentials are strictly prohibited in production mode.' });
  }

  const user = db.getUserByEmail(cleanEmail);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid institutional credentials.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ success: false, error: 'Invalid institutional credentials.' });
  }

  const safeUser: User = {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    department: user.department,
    organizationId: user.organizationId
  };

  const token = generateToken(safeUser);
  db.setCurrentUser(safeUser);

  res.json({
    success: true,
    token,
    user: safeUser
  });
});

/**
 * One-time secure initial administrator provisioning
 * P0 Security: Requires high-entropy out-of-band BOOTSTRAP_SECRET.
 * Employs atomic SQLite transaction locking to eliminate administrator claiming race conditions.
 */
router.post('/api/v1/auth/bootstrap-admin', authRateLimiter.middleware('auth-bootstrap'), (req: Request, res: Response) => {
  const expectedSecret = process.env.BOOTSTRAP_SECRET;
  if (!expectedSecret || !expectedSecret.trim()) {
    return res.status(403).json({
      success: false,
      error: 'HTTP bootstrap endpoint is disabled. Provision administrator via BOOTSTRAP_ADMIN_* environment variables.'
    });
  }

  const clientSecret = (req.headers['x-bootstrap-secret'] || req.body?.bootstrapSecret) as string | undefined;
  if (!clientSecret || typeof clientSecret !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'Missing bootstrap authorization secret.'
    });
  }

  const expectedBuffer = Buffer.from(expectedSecret);
  const clientBuffer = Buffer.from(clientSecret);
  const secretsMatch = expectedBuffer.length === clientBuffer.length && crypto.timingSafeEqual(expectedBuffer, clientBuffer);

  if (!secretsMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid bootstrap authorization secret.'
    });
  }

  const { email, password, displayName, organizationId } = req.body;
  const result = db.bootstrapAdmin({ email, password, displayName, organizationId });

  if (!result.success || !result.user) {
    return res.status(result.statusCode).json({
      success: false,
      error: result.error
    });
  }

  const token = generateToken(result.user);
  res.status(201).json({
    success: true,
    message: 'Initial system administrator bootstrapped successfully.',
    user: result.user,
    token
  });
});

/**
 * List available user personas (authenticated; MED-1 remediation).
 * Password hashes are strictly excluded from the response.
 */
router.get('/api/v1/users', authenticateToken, (_req: Request, res: Response) => {
  const users = db.getAllUsers().map(u => ({
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    department: u.department,
    organizationId: u.organizationId
  }));
  res.json({ success: true, data: users });
});

// =========================================================================
// 0. AUTHENTICATION & IDENTITY APIS (Authenticated)
// =========================================================================

/**
 * Get current authenticated user session
 */
router.get('/api/v1/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * Switch persona in demonstration mode
 * P0-02 Defense: Client-supplied roles are NEVER trusted. Claims are derived strictly from persistent DB records.
 * HIGH-1 remediation: requires a valid authenticated session. Previously unauthenticated
 * callers could mint session tokens for any seeded user without credentials.
 */
router.post('/api/v1/user', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Dynamic persona switching is disabled in production.' });
  }

  return authenticateToken(req as AuthenticatedRequest, res, () => {
    const targetId = req.body?.id;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Target user ID is required.' });
    }

    const user = db.getUserById(targetId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in institutional registry.' });
    }

    // Derive claims strictly from persistent database record, ignoring any client-supplied role
    const resolvedUser: User = {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      department: user.department,
      organizationId: user.organizationId
    };

    db.setCurrentUser(resolvedUser);
    const token = generateToken(resolvedUser);

    res.json({
      success: true,
      data: resolvedUser,
      token
    });
  });
});

/**
 * P0-02: Administrator-only user role modification endpoint.
 * Prevents self-role elevation and lockout.
 */
router.patch('/api/v1/users/:id/role', authenticateToken, requireRole(['Administrator']), (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body;
  const targetUserId = req.params.id;

  const normalizedRole = role === 'Viewer' ? 'Read-only Viewer' : role;
  if (!normalizedRole || !['Administrator', 'Reviewer', 'Read-only Viewer'].includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      error: 'Valid role (Administrator, Reviewer, Read-only Viewer) is required.'
    });
  }

  // Prevent self-role elevation or lockout
  if (req.user?.id === targetUserId) {
    return res.status(400).json({
      success: false,
      error: 'Administrators cannot modify their own active role to prevent accidental lockout.'
    });
  }

  const updatedUser = db.updateUserRole(targetUserId, normalizedRole, req.user);
  if (!updatedUser) {
    return res.status(404).json({ success: false, error: 'Target user not found in institutional registry.' });
  }

  res.json({
    success: true,
    data: updatedUser
  });
});

// =========================================================================
// 1. APPLICATIONS MANAGEMENT
// =========================================================================

router.get('/api/v1/applications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const apps = db.getAllApplications(userOrgId, isAdmin);

  const search = (req.query.search as string || '').toLowerCase().trim();
  const status = req.query.status as string;
  const category = req.query.category as string;

  let filtered = apps;
  if (search) {
    filtered = filtered.filter(a =>
      a.referenceNumber.toLowerCase().includes(search) ||
      a.institutionName.toLowerCase().includes(search) ||
      a.declaredDetails.address.toLowerCase().includes(search) ||
      a.declaredDetails.societyOrTrustName.toLowerCase().includes(search)
    );
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(a => a.reviewStatus === status || a.status === status);
  }
  if (category && category !== 'all') {
    filtered = filtered.filter(a => a.applicationType === category);
  }

  res.json({ success: true, count: filtered.length, data: filtered });
});

router.post('/api/v1/applications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { institutionName, declaredDetails } = req.body;
    if (!institutionName || !institutionName.trim()) {
      return res.status(400).json({ success: false, error: 'Institution Legal Name is required.' });
    }

    if (declaredDetails?.landAreaAcres !== undefined && Number(declaredDetails.landAreaAcres) < 0) {
      return res.status(400).json({ success: false, error: 'Campus land area cannot be negative.' });
    }

    if (declaredDetails?.sanctionedIntake !== undefined && Number(declaredDetails.sanctionedIntake) < 0) {
      return res.status(400).json({ success: false, error: 'Sanctioned intake capacity cannot be negative.' });
    }

    const newApp = db.createApplication(
      {
        ...req.body,
        organizationId: req.user?.organizationId || 'org-aicte-western'
      },
      req.user
    );
    res.status(201).json({ success: true, data: newApp });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/applications/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    // Check if docket exists under another regional organization for proper 403 response
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const documents = db.getDocumentsByApplication(app.id);
  const findings = db.getFindingsByApplication(app.id, userOrgId, isAdmin);
  const fields = db.getFieldsByApplication(app.id);

  res.json({
    success: true,
    data: {
      ...app,
      documents,
      findings,
      extractedFields: fields
    }
  });
});

/**
 * Record final docket-level scrutiny decision
 */
router.post('/api/v1/applications/:id/decision', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
  const { decisionType, rationale } = req.body;
  if (!decisionType || !['Approved', 'Rejected', 'Clarification Required'].includes(decisionType)) {
    return res.status(400).json({ success: false, error: 'Valid decisionType (Approved, Rejected, Clarification Required) is required.' });
  }
  if (!rationale || !rationale.trim()) {
    return res.status(400).json({ success: false, error: 'A written decision rationale is required for statutory sign-off.' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);
  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application docket not found.' });
  }

  const result = db.recordApplicationDecision(req.params.id, decisionType, rationale.trim(), req.user);
  res.json({ success: true, data: result });
});

// =========================================================================
// 2. DOCUMENT INTAKE, UPLOAD & STORAGE
// =========================================================================

router.post('/api/v1/applications/:id/documents', authenticateToken, requireRole(['Administrator', 'Reviewer']), upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const applicationId = req.params.id;
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(applicationId, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(applicationId);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const documentType = (req.body.documentType || 'Land Lease Deed') as DocumentType;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // 1. Strict Magic-Byte Header Verification: Must begin with %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (file.buffer.length < 5 || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file format: Uploaded file does not contain a valid PDF cryptographic header (%PDF-).'
    });
  }

  // 2. Generate secure UUID identifier
  const docId = `doc-${crypto.randomUUID()}`;

  // 3. Save using the configured storage provider
  const storageMetadata = await storageProvider.save(
    applicationId,
    docId,
    file.buffer,
    'application/pdf'
  );

  const checksum = storageMetadata.checksum;
  const relativeStorageKey = storageMetadata.storageKey;
  let pageCount = 1;
  let extractedPages: NonNullable<DocumentRecord['extractedTextByPage']> = [];
  let isScannedOrTextPoor = false;
  let processingStatus: DocumentRecord['processingStatus'] = 'Extracted';

  // 4. PDF Text Parsing
  try {
    const pdfModule: any = await import('pdf-parse');
    const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse;
    let pdfData: { numpages: number; text: string } = { numpages: 1, text: '' };
    if (PDFParse) {
      const parser = new PDFParse({ data: file.buffer });
      try {
        const result = await parser.getText();
        pdfData = { numpages: result.total || result.pages?.length || 1, text: result.text || '' };
      } finally {
        await parser.destroy().catch(() => {});
      }
    } else if (typeof pdfModule.default === 'function') {
      const v1 = await pdfModule.default(file.buffer);
      pdfData = { numpages: v1.numpages || 1, text: v1.text || '' };
    }
    pageCount = pdfData.numpages || 1;
    const rawAllText = pdfData.text || '';

    // Split pages by form feed if available
    const rawPages = rawAllText.split('\f').filter((t: string) => t.trim().length > 0);
    if (rawPages.length > 0) {
      extractedPages = rawPages.map((text: string, idx: number) => ({ page: idx + 1, text }));
    } else if (rawAllText.trim().length > 0) {
      extractedPages = [{ page: 1, text: rawAllText }];
    } else {
      extractedPages = [];
    }

    if (rawAllText.trim().length < 40) {
      isScannedOrTextPoor = true;
      processingStatus = 'Scanned Unreadable';
    }
  } catch (err: any) {
    console.warn('PDF parsing error encountered:', err.message);
    processingStatus = 'Failed';
  }

  // 5. OCR fallback for scanned or text-poor PDFs
  if (isScannedOrTextPoor || processingStatus === 'Failed') {
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    const ocrServiceToken = process.env.OCR_SERVICE_TOKEN;

    if (aiServiceUrl && ocrServiceToken) {
      try {
        const formData = new FormData();

        formData.append(
          'file',
          new Blob([new Uint8Array(file.buffer)], {
            type: 'application/pdf'
          }),
          path.basename(file.originalname)
        );

        const ocrResponse = await fetch(
          `${aiServiceUrl.replace(/\/+$/, '')}/api/v1/ocr/pdf`,
          {
            method: 'POST',
            headers: {
              'X-OCR-Service-Token': ocrServiceToken
            },
            body: formData,
            signal: AbortSignal.timeout(180000)
          }
        );

        if (!ocrResponse.ok) {
          throw new Error(`OCR service returned HTTP ${ocrResponse.status}`);
        }

        const ocrData = await ocrResponse.json() as {
          pageCount?: number;
          pages?: Array<{
            pageNumber: number;
            text: string;
            extractionMethod: 'text_layer' | 'ocr';
            ocrConfidence: number | null;
            characterCount: number;
            status: 'extracted' | 'unreadable';
          }>;
        };

        if (!Array.isArray(ocrData.pages) || ocrData.pages.length === 0) {
          throw new Error('OCR service returned no page results');
        }

        extractedPages = ocrData.pages.map(page => ({
          page: page.pageNumber,
          text: typeof page.text === 'string' ? page.text : '',
          extractionMethod: page.extractionMethod,
          ocrConfidence: page.ocrConfidence ?? null,
          characterCount: page.characterCount,
          status: page.status
        }));

        pageCount = ocrData.pageCount || extractedPages.length;
        isScannedOrTextPoor = true;

        processingStatus = extractedPages.some(
          page => page.text.trim().length > 0
        )
          ? 'Extracted'
          : 'Scanned Unreadable';

      } catch (ocrError) {
        console.warn('OCR fallback failed; original PDF remains stored.');

        if (processingStatus !== 'Failed') {
          processingStatus = 'Scanned Unreadable';
        }
      }
    } else {
      console.warn('OCR fallback skipped: service configuration missing.');
    }
  }

  const docRecord: DocumentRecord = {

    id: docId,
    applicationId,
    originalFilename: path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_'),
    documentType,
    storageKey: relativeStorageKey,
    mimeType: 'application/pdf',
    sizeBytes: file.size,
    checksum,
    pageCount,
    processingStatus,
    isScannedOrTextPoor,
    extractedTextByPage: extractedPages.length > 0 ? extractedPages : undefined,
    createdAt: new Date().toISOString()
  };

  db.addDocument(docRecord, req.user);

  // 5. Extract structured fields if text parsed successfully
  if (processingStatus === 'Extracted' && extractedPages.length > 0) {
    const extractedFields = extractFieldsFromPages(
      docId,
      applicationId,
      documentType,
      extractedPages.map(p => ({ pageNumber: p.page, text: p.text }))
    );
    db.saveExtractedFields(extractedFields);
  }

  // 6. Automatically trigger deterministic validation
  db.runValidation(applicationId, req.user);

  res.status(201).json({ success: true, data: docRecord });
});

router.get('/api/v1/applications/:id/documents', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const docs = db.getDocumentsByApplication(req.params.id);
  res.json({ success: true, data: docs });
});

/**
 * P0-04: Stream stored PDF securely with authentication, tenant isolation, and path traversal protection
 */
router.get('/api/v1/applications/:id/documents/:docId/file', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id: applicationId, docId } = req.params;
  // Path traversal defense: strictly alphanumeric, hyphen, underscore
  const safeIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!safeIdRegex.test(applicationId) || !safeIdRegex.test(docId)) {
    return res.status(400).json({ success: false, error: 'Invalid document or application identifier format.' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(applicationId, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(applicationId);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application docket not found.' });
  }

  const doc = db.getDocumentById(docId);
  if (!doc || doc.applicationId !== app.id) {
    return res.status(404).json({ success: false, error: 'Document record not found in docket.' });
  }

  // Verify the stored key matches this application's document
  const expectedStorageKey = `dockets/${app.id}/${doc.id}.pdf`;

  if (doc.storageKey !== expectedStorageKey) {
    return res.status(400).json({
      success: false,
      error: 'Invalid document storage key.'
    });
  }

  try {
    const fileStream = await storageProvider.getStream(doc.storageKey);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    fileStream.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Unable to read stored document.'
        });
      } else {
        res.destroy(error);
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    return res.status(404).json({
      success: false,
      error: 'Stored document file binary not found.'
    });
  }
});

/**
 * Delete document with role enforcement and tenant isolation
 */
  router.delete('/api/v1/documents/:id', authenticateToken, requireRole(['Administrator', 'Reviewer']), async (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id);

  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(doc.applicationId, userOrgId, isAdmin);

  if (!app) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Document belongs to an application in another organization.'
    });
  }

  const expectedStorageKey = `dockets/${doc.applicationId}/${doc.id}.pdf`;

  if (doc.storageKey !== expectedStorageKey) {
    return res.status(400).json({
      success: false,
      error: 'Invalid document storage key.'
    });
  }

  let fileBuffer: Buffer;

  try {
    fileBuffer = await storageProvider.getBuffer(doc.storageKey);
  } catch {
    return res.status(404).json({
      success: false,
      error: 'Stored document file not found. Database record was not deleted.'
    });
  }

  try {
    const fileDeleted = await storageProvider.delete(doc.storageKey);

    if (!fileDeleted) {
      return res.status(500).json({
        success: false,
        error: 'Could not delete stored document.'
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Storage deletion failed.'
    });
  }

  try {
    const success = db.removeDocument(req.params.id, req.user);

    if (!success) {
      await storageProvider.save(doc.applicationId, doc.id, fileBuffer, 'application/pdf');

      return res.status(404).json({
        success: false,
        error: 'Document record not found. PDF was restored.'
      });
    }
  } catch {
    try {
      await storageProvider.save(doc.applicationId, doc.id, fileBuffer, 'application/pdf');
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Database deletion failed and PDF restoration failed. Manual recovery is required.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Database deletion failed. PDF was restored.'
    });
  }

  return res.json({
    success: true,
    message: 'Document and stored PDF deleted successfully.'
  });
});

// =========================================================================
// 3. EXTRACTED FIELDS & MANUAL CORRECTIONS
// =========================================================================

router.get('/api/v1/documents/:id/fields', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(doc.applicationId, userOrgId, isAdmin);

  if (!app) {
    return res.status(403).json({ success: false, error: 'Access denied: Document belongs to an application in another organization.' });
  }

  const fields = db.getFieldsByDocument(req.params.id);
  res.json({ success: true, data: fields });
});

router.patch('/api/v1/fields/:id', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
  const { correctedValue, note } = req.body;
  if (!correctedValue || !correctedValue.trim()) {
    return res.status(400).json({ success: false, error: 'Corrected value is required.' });
  }
  if (!note || !note.trim()) {
    return res.status(400).json({ success: false, error: 'A justification note is mandatory for audit accountability.' });
  }

  const field = db.getFieldById(req.params.id);
  if (!field) {
    return res.status(404).json({ success: false, error: 'Field not found' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(field.applicationId, userOrgId, isAdmin);

  if (!app) {
    return res.status(403).json({ success: false, error: 'Access denied: Field belongs to an application in another organization.' });
  }

  const updatedField = db.correctField(req.params.id, correctedValue.trim(), note.trim(), req.user);
  res.json({ success: true, data: updatedField });
});

// =========================================================================
// 4. VALIDATION ENGINE & RULES CATALOG
// =========================================================================

// AICTE regulatory preview — does not modify production validation results.
router.get('/api/v1/applications/:id/aicte-preview', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Application belongs to another regional organization.'
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Application not found'
    });
  }

  const documents = db.getDocumentsByApplication(req.params.id);
  const fields = db.getFieldsByApplication(req.params.id);

  const preview = buildAicteLeasePreview(app, documents, fields);

  return res.json({
    success: true,
    data: preview
  });
});

router.post('/api/v1/applications/:id/validate', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const result = db.runValidation(req.params.id, req.user);
  res.json({ success: true, data: result });
});

router.get('/api/v1/rules', authenticateToken, (_req: Request, res: Response) => {
  const rules = db.getAllRules();
  res.json({ success: true, data: rules });
});

router.patch('/api/v1/rules/:id', authenticateToken, requireRole(['Administrator']), (req: AuthenticatedRequest, res: Response) => {
  const rule = db.updateRule(req.params.id, req.body, req.user);
  if (!rule) {
    return res.status(404).json({ success: false, error: 'Rule not found' });
  }
  res.json({ success: true, data: rule });
});

/**
 * Execute pure sandbox test evaluation for a rule without modifying database state
 */
router.post('/api/v1/rules/test', authenticateToken, (req: Request, res: Response) => {
  const { ruleKey, declaredValue, evidenceValue, documentType, applicationCategory, evaluationYear, parcels } = req.body;
  if (!ruleKey) {
    return res.status(400).json({ success: false, error: 'ruleKey is required for sandbox evaluation.' });
  }
  const result = evaluateSingleRuleSandbox(String(ruleKey).toUpperCase(), {
    declaredValue,
    evidenceValue,
    documentType,
    applicationCategory,
    evaluationYear,
    parcels
  });
  res.json({ success: true, data: result });
});

router.post('/api/v1/rules/:id/test', authenticateToken, (req: Request, res: Response) => {
  const ruleIdOrKey = req.params.id;
  const rule = db.getRuleById(ruleIdOrKey) || db.getAllRules().find(r => r.ruleKey.toLowerCase() === ruleIdOrKey.toLowerCase());
  const ruleKey = rule ? rule.ruleKey : ruleIdOrKey.toUpperCase();
  const { declaredValue, evidenceValue, documentType, applicationCategory, evaluationYear, parcels } = req.body;

  const result = evaluateSingleRuleSandbox(ruleKey, {
    declaredValue,
    evidenceValue,
    documentType,
    applicationCategory,
    evaluationYear,
    parcels
  });
  res.json({ success: true, data: result });
});

// =========================================================================
// 5. FINDINGS & ADJUDICATION
// =========================================================================

router.get('/api/v1/findings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const findings = db.getAllFindings(userOrgId, isAdmin);

  const status = req.query.status as string;
  const category = req.query.category as string;
  const severity = req.query.severity as string;

  let filtered = findings;
  if (status && status !== 'all') {
    filtered = filtered.filter(f => f.status === status);
  }
  if (category && category !== 'all') {
    filtered = filtered.filter(f => f.category === category);
  }
  if (severity && severity !== 'all') {
    filtered = filtered.filter(f => f.severity === severity);
  }

  res.json({ success: true, count: filtered.length, data: filtered });
});

router.get('/api/v1/applications/:id/findings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const findings = db.getFindingsByApplication(req.params.id, userOrgId, isAdmin);
  res.json({ success: true, data: findings });
});

router.get('/api/v1/findings/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const finding = db.getFindingById(req.params.id);
  if (!finding) {
    return res.status(404).json({ success: false, error: 'Finding not found' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(finding.applicationId, userOrgId, isAdmin);

  if (!app) {
    return res.status(403).json({ success: false, error: 'Access denied: Finding belongs to an application in another organization.' });
  }

  res.json({ success: true, data: finding });
});

router.post('/api/v1/findings/:id/review', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
  const { action, newStatus, note } = req.body;
  if (!action || !newStatus || !note || !note.trim()) {
    return res.status(400).json({ success: false, error: 'Action, newStatus, and justification note are mandatory for review decisions.' });
  }

  const finding = db.getFindingById(req.params.id);
  if (!finding) {
    return res.status(404).json({ success: false, error: 'Finding not found' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(finding.applicationId, userOrgId, isAdmin);

  if (!app) {
    return res.status(403).json({ success: false, error: 'Access denied: Finding belongs to an application in another organization.' });
  }

  const updatedFinding = db.recordReviewAction(req.params.id, action, newStatus, note.trim(), req.user);
  res.json({ success: true, data: updatedFinding });
});

/**
 * Multi-Model AI Provider Discovery Endpoint:
 * Lists all registered AI providers, active models, platforms, and capabilities.
 */
router.get('/api/v1/ai/providers', authenticateToken, async (_req: Request, res: Response) => {
  const metadata = modelRegistry.listMetadata();
  const healthCache = await modelRegistry.checkAllHealth({ timeoutMs: 3000 });

  const providersWithStatus = metadata.map(meta => ({
    ...meta,
    isConfigured: modelRegistry.get(meta.id)?.isConfigured() ?? false,
    health: healthCache[meta.id]
  }));

  res.json({
    success: true,
    count: providersWithStatus.length,
    data: providersWithStatus
  });
});

/**
 * Multi-Model AI Provider Health Check Endpoint
 */
router.get('/api/v1/ai/providers/:id/health', authenticateToken, async (req: Request, res: Response) => {
  const provider = modelRegistry.get(req.params.id);
  if (!provider) {
    return res.status(404).json({ success: false, error: `Provider '${req.params.id}' not found.` });
  }

  const health = await provider.checkHealth();
  res.json({
    success: true,
    providerId: provider.metadata.id,
    health
  });
});

/**
 * Multi-Model Finding Explanation Endpoint:
 * Generates an evidence-grounded AI explanation for an existing finding using the requested
 * or default provider (e.g. BharatCode Qwen 3.8 27B, DeepSeek v4.1 Flash, or Adaption).
 * Authoritative finding and classifier label remain strictly preserved.
 */
router.post('/api/v1/findings/:id/explain', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const finding = db.getFindingById(req.params.id);
  if (!finding) {
    return res.status(404).json({ success: false, error: 'Finding not found' });
  }

  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(finding.applicationId, userOrgId, isAdmin);

  if (!app) {
    return res.status(403).json({ success: false, error: 'Access denied: Finding belongs to an application in another organization.' });
  }

  // Derive 5-class label from finding characteristics
  let label: 'MATCH' | 'MISMATCH' | 'MISSING' | 'UNCERTAIN' | 'NOT_COMPARABLE' = 'MISMATCH';
  if (finding.severity === 'Information Missing') {
    label = 'MISSING';
  } else if (finding.status === 'Unable to Determine' || finding.explanation.toLowerCase().includes('uncertain') || finding.explanation.toLowerCase().includes('scanned')) {
    label = 'UNCERTAIN';
  } else if (finding.status === 'Dismissed') {
    label = 'NOT_COMPARABLE';
  } else if (finding.status === 'Corrected' && (!finding.evidenceValue || finding.declaredValue === finding.evidenceValue)) {
    label = 'MATCH';
  }

  const primaryEvidence = finding.evidenceList?.[0];
  const requestedProviderId = req.body?.providerId;
  const preferredLanguage = req.body?.preferredLanguage;

  const result = await modelRouter.routeExplanation({
    claim: {
      fieldName: finding.ruleKey || 'statutory_claim',
      fieldLabel: finding.title || 'Institutional Declaration',
      rawValue: finding.declaredValue || 'N/A',
      sourceText: finding.explanation
    },
    evidence: {
      fieldName: finding.ruleKey || 'supporting_evidence',
      fieldLabel: primaryEvidence?.evidenceRole || 'Supporting Evidence',
      rawValue: finding.evidenceValue || 'Missing',
      documentName: primaryEvidence?.documentName,
      documentId: primaryEvidence?.documentId,
      pageNumber: primaryEvidence?.pageNumber,
      sourceText: primaryEvidence?.evidenceText
    },
    classifierResult: {
      label,
      confidence: 0.95,
      explanation: finding.explanation
    },
    ruleContext: {
      ruleKey: finding.ruleKey,
      ruleTitle: finding.title,
      requirement: finding.explanation
    },
    preferredLanguage
  }, {
    providerId: requestedProviderId
  });

  res.json({
    success: result.success,
    status: result.status,
    data: result.data,
    modelUsed: result.modelUsed,
    providerId: result.providerId,
    latencyMs: result.latencyMs,
    error: result.error,
    groundingAlerts: result.groundingAlerts
  });
});

/**
 * Unified Multi-Model Arbitrary Pairwise Explanation Endpoint
 */
router.post('/api/v1/ai/explain', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { claim, evidence, classifierResult, ruleContext, providerId, preferredLanguage } = req.body;

  if (!claim || !claim.fieldName || !claim.rawValue || !classifierResult || !classifierResult.label) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: claim (fieldName, rawValue) and classifierResult (label, confidence, explanation) are mandatory.'
    });
  }

  const result = await modelRouter.routeExplanation({
    claim,
    evidence,
    classifierResult,
    ruleContext,
    preferredLanguage
  }, {
    providerId
  });

  res.json({
    success: result.success,
    status: result.status,
    data: result.data,
    modelUsed: result.modelUsed,
    providerId: result.providerId,
    latencyMs: result.latencyMs,
    error: result.error,
    groundingAlerts: result.groundingAlerts
  });
});

/**
 * Arbitrary Pairwise BharatCode Explanation Endpoint (Legacy compatibility)
 */
router.post('/api/v1/ai/bharatcode/explain', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { claim, evidence, classifierResult, ruleContext } = req.body;

  if (!claim || !claim.fieldName || !claim.rawValue || !classifierResult || !classifierResult.label) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: claim (fieldName, rawValue) and classifierResult (label, confidence, explanation) are mandatory.'
    });
  }

  const result = await modelRouter.routeExplanation({
    claim,
    evidence,
    classifierResult,
    ruleContext
  }, {
    providerId: 'bharatcode-qwen'
  });

  res.json({
    success: result.success,
    status: result.status,
    data: result.data,
    modelUsed: result.modelUsed,
    latencyMs: result.latencyMs,
    error: result.error
  });
});

// =========================================================================
// 6. REPORTS & EXPORTS
// =========================================================================

router.get('/api/v1/applications/:id/report', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const documents = db.getDocumentsByApplication(app.id);
  const fields = db.getFieldsByApplication(app.id);
  const findings = db.getFindingsByApplication(app.id, userOrgId, isAdmin);
  const reviewActions = db.getReviewActionsByApplication(app.id);

  const report: ScrutinyReportData = {
    application: app,
    documents,
    extractedFields: fields,
    findings,
    reviewActions,
    validationSummary: {
      validationRunId: `run-${app.id.slice(-8)}-current`,
      applicationId: app.id,
      status: findings.some(f => f.status === 'Confirmed' || f.status === 'Open') ? 'Errors Detected' : 'Completed',
      rulesEvaluatedCount: db.getAllRules().filter(r => r.enabled).length,
      passedChecksCount: Math.max(0, db.getAllRules().filter(r => r.enabled).length - findings.length),
      findingsRaisedCount: findings.length,
      timestamp: new Date().toISOString()
    },
    generatedAt: new Date().toISOString(),
    generatedBy: req.user?.displayName || db.currentUser.displayName
  };

  res.json({ success: true, data: report });
});

// =========================================================================
// 7. AUDIT LEDGER
// =========================================================================

router.get('/api/v1/audit', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const events = db.getAuditEvents(userOrgId, isAdmin);
  res.json({ success: true, data: events });
});

router.get('/api/v1/applications/:id/audit', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  // Include docket-level events plus finding-level events (e.g., adjudications)
  // whose entity reference is a finding belonging to this application.
  const findingRefs = db.getFindingsByApplication(req.params.id, userOrgId, isAdmin)
    .map(f => f.reference)
    .filter((r): r is string => Boolean(r));

  const events = db.getAuditEvents(userOrgId, isAdmin).filter(
    e => e.entityReference.includes(app.referenceNumber) ||
         e.entityReference.includes(app.id) ||
         findingRefs.some(ref => e.entityReference.includes(ref))
  );
  res.json({ success: true, data: events });
});

// =========================================================================
// 8. DEEP SCRUTINY & DEMO RESET
// =========================================================================

router.post('/api/v1/applications/:id/deep-scrutiny', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'Administrator';
  const userOrgId = req.user?.organizationId;
  const app = db.getApplicationById(req.params.id, userOrgId, isAdmin);

  if (!app) {
    const globalApp = db.getApplicationById(req.params.id);
    if (globalApp && globalApp.organizationId !== userOrgId) {
      return res.status(403).json({ success: false, error: 'Access denied: Application belongs to another regional organization.' });
    }
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const documents = db.getDocumentsByApplication(app.id);
  const fields = db.getFieldsByApplication(app.id);
  const findings = db.getFindingsByApplication(app.id, userOrgId, isAdmin);
  const customQuery = typeof req.body?.query === 'string' ? req.body.query.trim() : undefined;

  const memo = await runDeepScrutinyAnalysis(app, documents, fields, findings, customQuery);
  const actor = req.user || db.currentUser;

  db.recordAudit({
    actorId: actor.id,
    actorName: actor.displayName,
    action: 'Deep Scrutiny Synthesis Executed',
    entityType: 'Application',
    entityReference: app.referenceNumber,
    note: `Mode: ${memo.thinkingMode} (${memo.modelUsed})`
  });

  res.json({ success: true, data: memo });
});

router.post('/api/v1/reset-demo', authenticateToken, requireRole(['Administrator']), (_req: Request, res: Response) => {
  db.seedDefaultData(true);
  res.json({ success: true, message: 'Institutional scrutiny demonstration dataset reloaded successfully into persistent storage.' });
});

// =========================================================================
// 9. DOMAIN PACKS & EXTENSION REGISTRY
// =========================================================================

router.get('/api/v1/domains', authenticateToken, (_req: Request, res: Response) => {
  const domains = domainRegistry.list();
  res.json({ success: true, count: domains.length, data: domains });
});

router.get('/api/v1/domains/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const pack = domainRegistry.get(req.params.id);
    res.json({ success: true, data: pack });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 10. ORGANIZATIONS & TENANT ISOLATION
// =========================================================================

router.get('/api/v1/organizations', authenticateToken, (_req: Request, res: Response) => {
  const orgs = OrganizationService.getAllOrganizations();
  res.json({ success: true, count: orgs.length, data: orgs });
});

router.get('/api/v1/organizations/:id', authenticateToken, requireOrg, (req: Request, res: Response) => {
  const org = OrganizationService.getOrganizationById(req.params.id);
  if (!org) {
    return res.status(404).json({ success: false, error: 'Organization not found.' });
  }
  res.json({ success: true, data: org });
});

// =========================================================================
// 11. PAIRWISE FIELD MISMATCH CLASSIFICATION
// =========================================================================

const PairwiseSchema = z.object({
  domainId: z.string().optional(),
  relationshipId: z.string().optional(),
  claimField: z.object({
    fieldId: z.string().optional(),
    documentId: z.string().optional(),
    documentName: z.string().optional(),
    fieldName: z.string(),
    fieldLabel: z.string(),
    rawValue: z.string(),
    normalizedValue: z.string().optional(),
    pageNumber: z.number().optional(),
    sourceText: z.string().optional(),
    confidence: z.number().optional()
  }),
  evidenceField: z.object({
    fieldId: z.string().optional(),
    documentId: z.string().optional(),
    documentName: z.string().optional(),
    fieldName: z.string(),
    fieldLabel: z.string(),
    rawValue: z.string(),
    normalizedValue: z.string().optional(),
    pageNumber: z.number().optional(),
    sourceText: z.string().optional(),
    confidence: z.number().optional()
  }).optional(),
  comparisonType: z.enum(['date', 'numeric', 'entity-name', 'code', 'generic']).optional(),
  toleranceThreshold: z.number().optional(),
  confidenceThreshold: z.number().optional()
});

router.post('/api/v1/verification/pairwise', authenticateToken, validate({ body: PairwiseSchema }), async (req: Request, res: Response) => {
  const result = await PairwiseFieldClassifier.compare(req.body);
  res.json({ success: true, data: result });
});

// =========================================================================
// 12. ASYNCHRONOUS DOCUMENT PROCESSING JOBS
// =========================================================================

router.get('/api/v1/jobs/:id', authenticateToken, (req: Request, res: Response) => {
  const job = jobQueue.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found or expired.' });
  }
  res.json({ success: true, data: job });
});

// =========================================================================
// 13. V3 HUMAN ANNOTATION WORKBENCH
// =========================================================================

/**
 * Lists candidate annotation tasks with blind-review masking and tenant scoping.
 */
router.get('/api/v1/annotations/records', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const institutionId = req.query.institutionId as string | undefined;
  const records = db.getAnnotationRecords({
    status: status === 'all' ? undefined : status,
    institutionId: institutionId === 'all' ? undefined : institutionId,
    organizationId: req.user?.role === 'Administrator' ? undefined : req.user?.organizationId,
    userId: req.user?.id,
    role: req.user?.role
  });
  res.json({ success: true, data: records });
});

/**
 * Retrieves a single annotation task by ID with blind review masking.
 */
router.get('/api/v1/annotations/records/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const record = db.getAnnotationRecordById(req.params.id, req.user?.id, req.user?.role);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Annotation record not found.' });
  }
  // Tenant check
  if (req.user?.role !== 'Administrator' && record.organizationId && req.user?.organizationId && record.organizationId !== req.user.organizationId) {
    return res.status(403).json({ success: false, error: 'Cross-tenant access prohibited for this annotation task.' });
  }
  res.json({ success: true, data: record });
});

/**
 * Creates a new candidate annotation task from institutional claim/evidence pair.
 * Allowed: Administrator, Reviewer, Data Collector.
 */
router.post('/api/v1/annotations/records', authenticateToken, requireRole(['Administrator', 'Reviewer', 'Data Collector']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const record = db.createAnnotationRecord({
      ...req.body,
      organizationId: req.user?.organizationId || 'org-aicte-western'
    });
    res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create annotation record.' });
  }
});

/**
 * Saves a user's draft or submits an independent blind annotation.
 * Allowed: Administrator, Reviewer, Annotator, Adjudicator.
 */
router.post('/api/v1/annotations/records/:id/annotate', authenticateToken, requireRole(['Administrator', 'Reviewer', 'Annotator', 'Adjudicator']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label, rationale, isDraft } = req.body;
    if (!label) {
      return res.status(400).json({ success: false, error: 'Annotation label is required.' });
    }
    const result = db.saveUserAnnotation(
      req.params.id,
      {
        id: req.user!.id,
        displayName: req.user!.displayName,
        role: req.user!.role,
        organizationId: req.user!.organizationId
      },
      { label, rationale: rationale || '', isDraft: Boolean(isDraft) }
    );
    res.json({ success: true, data: result.record, annotation: result.annotation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to save annotation.' });
  }
});

/**
 * Resolves a disputed annotation record (third-reviewer adjudication).
 * Allowed: Administrator, Adjudicator.
 */
router.post('/api/v1/annotations/records/:id/adjudicate', authenticateToken, requireRole(['Administrator', 'Adjudicator']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label, rationale } = req.body;
    if (!label || !rationale) {
      return res.status(400).json({ success: false, error: 'Final label and adjudication rationale are required.' });
    }
    const record = db.adjudicateRecord(
      req.params.id,
      {
        id: req.user!.id,
        displayName: req.user!.displayName,
        role: req.user!.role,
        organizationId: req.user!.organizationId
      },
      { label, rationale }
    );
    res.json({ success: true, data: record });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message || 'Failed to adjudicate record.' });
  }
});

/**
 * Computes real-time annotation quality metrics, label distributions, raw agreement and Cohen's Kappa.
 */
router.get('/api/v1/annotations/metrics', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user?.role === 'Administrator' ? undefined : req.user?.organizationId;
  const metrics = db.getAnnotationMetrics(orgId);
  res.json({ success: true, data: metrics });
});

/**
 * Exports agreed and adjudicated records to canonical V3 gold-standard JSONL and manifest.
 * Allowed: Administrator, Reviewer, Adjudicator.
 */
router.post('/api/v1/annotations/export', authenticateToken, requireRole(['Administrator', 'Reviewer', 'Adjudicator']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const outPath = typeof req.body?.outPath === 'string' && req.body.outPath.trim() ? req.body.outPath.trim() : undefined;
    const result = db.exportGoldStandard({
      organizationId: req.user?.organizationId,
      role: req.user?.role,
      outPath
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to export gold standard dataset.' });
  }
});

/**
 * Reviewer Authorization Governance Endpoints
 */
router.post('/api/v1/reviewers/authorize', authenticateToken, requireRole(['Administrator']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, role, verifiedIdentityRef, issuingAuthority, authorizationReference } = req.body;
    if (!userId || !role || !verifiedIdentityRef || !issuingAuthority || !authorizationReference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required authorization fields: userId, role, verifiedIdentityRef, issuingAuthority, authorizationReference.'
      });
    }
    if (req.user!.id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Self-approval prohibited: Administrators cannot approve their own reviewer authorization.'
      });
    }
    const authorization = db.authorizeReviewer(req.user!, req.body);
    res.status(201).json({ success: true, data: authorization });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to authorize reviewer.' });
  }
});

router.post('/api/v1/reviewers/authorizations/:id/revoke', authenticateToken, requireRole(['Administrator']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Substantive revocation rationale (minimum 10 characters) is required.'
      });
    }
    const authorization = db.revokeReviewerAuthorization(req.user!, req.params.id, reason.trim());
    res.json({ success: true, data: authorization });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to revoke reviewer authorization.' });
  }
});

router.get('/api/v1/reviewers/authorizations', authenticateToken, requireRole(['Administrator', 'Reviewer', 'Adjudicator']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.role === 'Administrator' ? (req.query.organizationId as string) : req.user!.organizationId;
    const authorizations = db.listReviewerAuthorizations(orgId);
    res.json({ success: true, data: authorizations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list authorizations.' });
  }
});

router.get('/api/v1/reviewers/authorizations/:userId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = db.getReviewerAuthorization(req.params.userId);
    res.json({ success: true, data: auth });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch authorization.' });
  }
});

/**
 * Institutional Docket Intake & Lifecycle Endpoints
 */
router.post('/api/v1/intake/dockets', authenticateToken, requireRole(['Administrator', 'Reviewer', 'Data Collector']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { docketNumber, institutionName, sourceOrganization, authorizationReference, documentPath } = req.body;
    if (!docketNumber || !institutionName || !sourceOrganization || !authorizationReference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required docket fields: docketNumber, institutionName, sourceOrganization, authorizationReference.'
      });
    }
    // Path traversal prevention
    if (documentPath && (documentPath.includes('..') || documentPath.includes('\0'))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document path: path traversal is prohibited.'
      });
    }
    const docket = db.createInstitutionalDocket(req.user!, req.body);
    res.status(201).json({ success: true, data: docket });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create institutional docket.' });
  }
});

router.get('/api/v1/intake/dockets', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.role === 'Administrator' ? (req.query.organizationId as string) : req.user!.organizationId;
    const dockets = db.getInstitutionalDockets({
      organizationId: orgId,
      lifecycleState: req.query.lifecycleState as string,
      provenanceStatus: req.query.provenanceStatus as string
    });
    res.json({ success: true, data: dockets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list institutional dockets.' });
  }
});

router.get('/api/v1/intake/dockets/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const docket = db.getInstitutionalDocketById(req.params.id);
    if (!docket) {
      return res.status(404).json({ success: false, error: `Institutional docket '${req.params.id}' not found.` });
    }
    // Regional tenant isolation
    if (req.user!.role !== 'Administrator' && docket.organizationId !== req.user!.organizationId) {
      return res.status(403).json({ success: false, error: 'Access denied: Docket belongs to another regional organization.' });
    }
    const transitions = db.getDocketTransitions(docket.id);
    res.json({ success: true, data: { ...docket, transitions } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch institutional docket.' });
  }
});

router.post('/api/v1/intake/dockets/:id/verify-provenance', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, notes } = req.body;
    if (!status || !notes || notes.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Status and substantive verification notes (minimum 10 characters) are required.'
      });
    }
    const docket = db.verifyDocketProvenance(req.user!, req.params.id, status, notes.trim());
    res.json({ success: true, data: docket });
  } catch (err: any) {
    const statusCode = err.message?.includes('Cross-tenant') ? 403 : 400;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to verify docket provenance.' });
  }
});

router.post('/api/v1/intake/dockets/:id/transition', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { toState, rationale } = req.body;
    if (!toState || !rationale || rationale.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Destination state and substantive transition rationale (minimum 10 characters) are required.'
      });
    }
    const docket = db.transitionDocketLifecycle(req.user!, req.params.id, toState, rationale.trim());
    res.json({ success: true, data: docket });
  } catch (err: any) {
    const statusCode = err.message?.includes('Cross-tenant') ? 403 : 400;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to transition docket lifecycle.' });
  }
});

/**
 * Cryptographic Audit Ledger Verification Endpoints
 */
router.get('/api/v1/ledger/verify', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const verification = db.verifyLedgerChain();
    res.json({ success: true, data: verification });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to verify ledger integrity.' });
  }
});

router.get('/api/v1/ledger/report', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = db.generateLedgerIntegrityReport();
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate ledger integrity report.' });
  }
});

/**
 * Operational Acceptance Dashboard Endpoint
 */
router.get('/api/v1/intake/dashboard', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.role === 'Administrator' ? (req.query.organizationId as string) : req.user!.organizationId;
    const dashboard = db.getOperationalDashboard(orgId, req.user!.role);
    res.json({ success: true, data: dashboard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate operational dashboard.' });
  }
});

// Centralized error handler
router.use(errorHandler);

export default router;

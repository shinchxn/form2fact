import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db.ts';
import { DocumentRecord, DocumentType, ExtractedField, ScrutinyReportData, User } from '../src/types/index.ts';
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
import { OrganizationService } from './modules/organizations/organization.service.ts';
import { PairwiseFieldClassifier } from './modules/verification/pairwiseEngine.ts';
import { jobQueue } from './core/jobs/index.ts';
import { validate } from './core/validation/validate.ts';
import { errorHandler } from './core/errors/errorHandler.ts';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// JSON and URL-encoded body parsers
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

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
 */
router.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const user = db.getUserByEmail(email.toLowerCase().trim());
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
 * List available demo user personas (public metadata; password hashes strictly excluded)
 */
router.get('/api/v1/users', (_req: Request, res: Response) => {
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
 */
router.post('/api/v1/user', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Dynamic persona switching is disabled in production.' });
  }

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

  // 2. Generate secure UUID identifier & SHA-256 checksum
  const docId = `doc-${crypto.randomUUID()}`;
  const checksum = `sha256-${crypto.createHash('sha256').update(file.buffer).digest('hex').slice(0, 16)}`;

  // 3. Durable Disk Storage: write file to ./data/dockets/{appId}/{docId}.pdf
  const docketDir = path.resolve(process.cwd(), 'data', 'dockets', applicationId);
  if (!fs.existsSync(docketDir)) {
    fs.mkdirSync(docketDir, { recursive: true });
  }
  const storageFilePath = path.join(docketDir, `${docId}.pdf`);
  fs.writeFileSync(storageFilePath, file.buffer);

  const relativeStorageKey = `dockets/${applicationId}/${docId}.pdf`;

  let pageCount = 1;
  let extractedPages: NonNullable<DocumentRecord['extractedTextByPage']> = [];
  let isScannedOrTextPoor = false;
  let processingStatus: DocumentRecord['processingStatus'] = 'Extracted';

  // 4. PDF Text Parsing
  try {
    const pdfModule = await import('pdf-parse');
    const parser = (pdfModule as any).default || (pdfModule as any);
    const pdfData = typeof parser === 'function' ? await parser(file.buffer) : { numpages: 1, text: '' };
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
router.get('/api/v1/applications/:id/documents/:docId/file', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
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

  const docketDir = path.resolve(process.cwd(), 'data', 'dockets', app.id);
  const diskPath = path.resolve(docketDir, `${doc.id}.pdf`);

  // Verify file path is strictly contained inside the docket directory
  if (!diskPath.startsWith(docketDir + path.sep)) {
    return res.status(400).json({ success: false, error: 'Illegal path traversal attempt.' });
  }

  if (!fs.existsSync(diskPath)) {
    return res.status(404).json({ success: false, error: 'Stored document file binary not found on disk.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalFilename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.sendFile(diskPath);
});

/**
 * Delete document with role enforcement and tenant isolation
 */
router.delete('/api/v1/documents/:id', authenticateToken, requireRole(['Administrator', 'Reviewer']), (req: AuthenticatedRequest, res: Response) => {
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

  const success = db.removeDocument(req.params.id, req.user);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }
  res.json({ success: true, message: 'Document removed from docket and validation rules updated.' });
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

  const events = db.getAuditEvents(userOrgId, isAdmin).filter(
    e => e.entityReference.includes(app.referenceNumber) || e.entityReference.includes(app.id)
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

// Centralized error handler
router.use(errorHandler);

export default router;

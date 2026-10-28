import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { db } from './db.ts';
import { DocumentRecord, DocumentType, ExtractedField, ScrutinyReportData } from '../src/types/index.ts';
import { extractFieldsFromPages, runDeepScrutinyAnalysis } from './extraction.ts';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Middleware for JSON
router.use(express.json());

// 1. Applications
router.get('/api/v1/applications', (req: Request, res: Response) => {
  const apps = db.getAllApplications();
  const search = (req.query.search as string || '').toLowerCase().trim();
  const status = req.query.status as string;
  const category = req.query.category as string;

  let filtered = apps;
  if (search) {
    filtered = filtered.filter(a => 
      a.referenceNumber.toLowerCase().includes(search) || 
      a.institutionName.toLowerCase().includes(search) ||
      a.declaredDetails.address.toLowerCase().includes(search)
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

router.post('/api/v1/applications', (req: Request, res: Response) => {
  try {
    const newApp = db.createApplication(req.body);
    res.status(201).json({ success: true, data: newApp });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/applications/:id', (req: Request, res: Response) => {
  const app = db.getApplicationById(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }
  const documents = db.getDocumentsByApplication(app.id);
  const findings = db.getFindingsByApplication(app.id);
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

// 2. Document Upload & Extraction
router.post('/api/v1/applications/:id/documents', upload.single('file'), async (req: Request, res: Response) => {
  const applicationId = req.params.id;
  const app = db.getApplicationById(applicationId);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const documentType = (req.body.documentType || 'Land Lease Deed') as DocumentType;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // Validate MIME type
  if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ success: false, error: 'Only PDF documents are supported for institutional scrutiny.' });
  }

  const docId = `doc-${Date.now().toString().slice(-6)}`;
  const checksum = `sha256-${crypto.createHash('sha256').update(file.buffer).digest('hex').slice(0, 16)}`;

  let pageCount = 1;
  let extractedPages: { page: number; text: string }[] = [];
  let isScannedOrTextPoor = false;
  let processingStatus: DocumentRecord['processingStatus'] = 'Extracted';

  try {
    let rawAllText = '';
    try {
      const pdfModule = await import('pdf-parse');
      const parser = (pdfModule as any).default || (pdfModule as any);
      const pdfData = typeof parser === 'function' ? await parser(file.buffer) : { numpages: 1, text: file.buffer.toString('utf-8') };
      pageCount = pdfData.numpages || 1;
      rawAllText = pdfData.text || '';
    } catch {
      rawAllText = file.buffer.toString('utf-8');
    }

    // Split pages by form feed if available, or approximate
    const rawPages = rawAllText.split('\f').filter(t => t.trim().length > 0);
    if (rawPages.length > 0) {
      extractedPages = rawPages.map((text, idx) => ({ page: idx + 1, text }));
    } else {
      extractedPages = [{ page: 1, text: rawAllText }];
    }

    if (rawAllText.trim().length < 40) {
      isScannedOrTextPoor = true;
      processingStatus = 'Scanned Unreadable';
    }
  } catch (err: any) {
    console.warn('PDF parsing encountered warning:', err.message);
    processingStatus = 'Failed';
  }

  const docRecord: DocumentRecord = {
    id: docId,
    applicationId,
    originalFilename: file.originalname,
    documentType,
    storageKey: `dockets/${applicationId}/${file.originalname}`,
    mimeType: 'application/pdf',
    sizeBytes: file.size,
    checksum,
    pageCount,
    processingStatus,
    isScannedOrTextPoor,
    extractedTextByPage: extractedPages,
    createdAt: new Date().toISOString()
  };

  db.addDocument(docRecord);

  // Extract structured fields
  if (processingStatus === 'Extracted' && extractedPages.length > 0) {
    const extractedFields = extractFieldsFromPages(
      docId,
      applicationId,
      documentType,
      extractedPages.map(p => ({ pageNumber: p.page, text: p.text }))
    );
    extractedFields.forEach(f => db.extractedFields.set(f.id, f));
  }

  // Automatically trigger deterministic validation
  db.runValidation(applicationId);

  res.status(201).json({ success: true, data: docRecord });
});

router.get('/api/v1/applications/:id/documents', (req: Request, res: Response) => {
  const docs = db.getDocumentsByApplication(req.params.id);
  res.json({ success: true, data: docs });
});

router.delete('/api/v1/documents/:id', (req: Request, res: Response) => {
  const success = db.removeDocument(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }
  res.json({ success: true, message: 'Document removed from docket' });
});

// 3. Extracted Fields & Manual Correction
router.get('/api/v1/documents/:id/fields', (req: Request, res: Response) => {
  const fields = db.getFieldsByDocument(req.params.id);
  res.json({ success: true, data: fields });
});

router.patch('/api/v1/fields/:id', (req: Request, res: Response) => {
  const { correctedValue, note } = req.body;
  if (!correctedValue) {
    return res.status(400).json({ success: false, error: 'Corrected value is required' });
  }
  const updatedField = db.correctField(req.params.id, correctedValue, note || 'Scrutiny Officer Correction');
  if (!updatedField) {
    return res.status(404).json({ success: false, error: 'Field not found' });
  }
  res.json({ success: true, data: updatedField });
});

// 4. Validation Engine
router.post('/api/v1/applications/:id/validate', (req: Request, res: Response) => {
  const result = db.runValidation(req.params.id);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }
  res.json({ success: true, data: result });
});

// 5. Findings Workspace
router.get('/api/v1/findings', (req: Request, res: Response) => {
  const findings = db.getAllFindings();
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

router.get('/api/v1/applications/:id/findings', (req: Request, res: Response) => {
  const findings = db.getFindingsByApplication(req.params.id);
  res.json({ success: true, data: findings });
});

router.get('/api/v1/findings/:id', (req: Request, res: Response) => {
  const finding = db.getFindingById(req.params.id);
  if (!finding) {
    return res.status(404).json({ success: false, error: 'Finding not found' });
  }
  res.json({ success: true, data: finding });
});

router.post('/api/v1/findings/:id/review', (req: Request, res: Response) => {
  const { action, newStatus, note } = req.body;
  if (!action || !newStatus || !note) {
    return res.status(400).json({ success: false, error: 'Action, newStatus, and justification note are mandatory for review decisions.' });
  }

  const updatedFinding = db.recordReviewAction(req.params.id, action, newStatus, note);
  if (!updatedFinding) {
    return res.status(404).json({ success: false, error: 'Finding not found' });
  }
  res.json({ success: true, data: updatedFinding });
});

// 6. Reports
router.get('/api/v1/applications/:id/report', (req: Request, res: Response) => {
  const app = db.getApplicationById(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }
  const documents = db.getDocumentsByApplication(app.id);
  const fields = db.getFieldsByApplication(app.id);
  const findings = db.getFindingsByApplication(app.id);
  const reviewActions = db.getReviewActionsByApplication(app.id);

  const report: ScrutinyReportData = {
    application: app,
    documents,
    extractedFields: fields,
    findings,
    reviewActions,
    validationSummary: {
      validationRunId: `run-${app.id.slice(-4)}-current`,
      applicationId: app.id,
      status: findings.some(f => f.status === 'Confirmed' || f.status === 'Open') ? 'Errors Detected' : 'Completed',
      rulesEvaluatedCount: db.getAllRules().filter(r => r.enabled).length,
      passedChecksCount: Math.max(0, db.getAllRules().filter(r => r.enabled).length - findings.length),
      findingsRaisedCount: findings.length,
      timestamp: new Date().toISOString()
    },
    generatedAt: new Date().toISOString(),
    generatedBy: db.currentUser.displayName
  };

  res.json({ success: true, data: report });
});

// 7. Audit Log
router.get('/api/v1/audit', (req: Request, res: Response) => {
  const events = db.getAuditEvents();
  res.json({ success: true, data: events });
});

router.get('/api/v1/applications/:id/audit', (req: Request, res: Response) => {
  const app = db.getApplicationById(req.params.id);
  if (!app) return res.status(404).json({ success: false, error: 'Application not found' });
  const events = db.getAuditEvents().filter(e => e.entityReference.includes(app.referenceNumber) || e.entityReference.includes(app.id));
  res.json({ success: true, data: events });
});

// 8. Rules & Checks Catalog
router.get('/api/v1/rules', (_req: Request, res: Response) => {
  const rules = db.getAllRules();
  res.json({ success: true, data: rules });
});

router.patch('/api/v1/rules/:id', (req: Request, res: Response) => {
  const rule = db.updateRule(req.params.id, req.body);
  if (!rule) {
    return res.status(404).json({ success: false, error: 'Rule not found' });
  }
  res.json({ success: true, data: rule });
});

// 9. User & Demo State
router.get('/api/v1/user', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.currentUser });
});

router.post('/api/v1/user', (req: Request, res: Response) => {
  db.setCurrentUser(req.body);
  res.json({ success: true, data: db.currentUser });
});

router.post('/api/v1/applications/:id/deep-scrutiny', async (req: Request, res: Response) => {
  const app = db.getApplicationById(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }
  const documents = db.getDocumentsByApplication(app.id);
  const fields = db.getFieldsByApplication(app.id);
  const findings = db.getFindingsByApplication(app.id);
  const customQuery = typeof req.body?.query === 'string' ? req.body.query.trim() : undefined;

  const memo = await runDeepScrutinyAnalysis(app, documents, fields, findings, customQuery);
  db.recordAudit({
    actorId: db.currentUser.id,
    actorName: db.currentUser.displayName,
    action: 'Deep Scrutiny Synthesis Executed',
    entityType: 'Application',
    entityReference: app.referenceNumber,
    note: `Mode: ${memo.thinkingMode} (${memo.modelUsed})`
  });

  res.json({ success: true, data: memo });
});

router.post('/api/v1/reset-demo', (_req: Request, res: Response) => {
  db.seedDefaultData();
  res.json({ success: true, message: 'Institutional scrutiny demonstration dataset reloaded successfully.' });
});

export default router;

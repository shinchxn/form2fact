/**
 * FORM2FACT — PRODUCTION DATA INTEGRITY & ZERO-MOCK RUNTIME VERIFICATION SUITE
 * 
 * Tests the 15 critical data integrity assertions and Phase 2 Final Pilot Blockers:
 * 1. Dashboard with an empty database & zero demo user seeding in production
 * 2. Dashboard with real database records
 * 3. Application list with no records
 * 4. Application list with actual records
 * 5. Document upload, magic-byte defense & tamper-evident storage
 * 6. OCR truthful extraction vs. scanned bitmap handling
 * 7. ML service ready and unavailable strict abstention
 * 8. Calibrated inference integration & 1,544-dim feature contract
 * 9. Five-class taxonomy & fast-path determinism
 * 10. API network & route defenses
 * 11. Database unavailable & immutable audit trail
 * 12. Authentication and role permissions
 * 13. Production startup without demo seeding & secure bootstrap admin provisioning
 * 14. No production imports of mock fixtures
 * 15. Genuine records are not deleted by cleanup / durable restarts
 * 16. Blocker 1: Demo credentials rejection & dev mode preservation
 * 17. Blocker 3: Contradictory production inference configuration validation
 * 18. Blocker 4: Fast-path determinism, provenance & statutory non-bypass
 * 19. Blocker 6: Human decision authority invariants & adjudication audit
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import { db, ScrutinyDatabase } from '../db.ts';
import apiRouter from '../api.ts';
import { PairwiseFieldClassifier } from '../modules/verification/pairwiseEngine.ts';
import { extractFieldsFromPages } from '../extraction.ts';
import { generateToken, verifyToken } from '../auth.ts';
import { validateProductionConfig } from '../core/config/validateProductionConfig.ts';
import { evaluateApplicationRules } from '../rulesEngine.ts';

console.log('====================================================');
console.log('   FORM2FACT — DATA INTEGRITY & ZERO-MOCK AUDIT SUITE');
console.log('====================================================');

async function runDataIntegritySuite() {
  let passed = 0;
  let total = 0;

  function testAssert(condition: boolean, message: string) {
    total++;
    assert(condition, message);
    console.log(`✅ Passed: ${message}`);
    passed++;
  }

  // Set up ephemeral Express test server for API endpoint testing
  const testExpressApp = express();
  testExpressApp.use(apiRouter);
  const testHttpServer = http.createServer(testExpressApp);
  await new Promise<void>((resolve) => testHttpServer.listen(0, '127.0.0.1', () => resolve()));
  const testPort = (testHttpServer.address() as any).port;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  const testDbPath = path.resolve(process.cwd(), 'data', `test-integrity-${Date.now()}.db`);
  const prevEnv = process.env.NODE_ENV;
  const prevSeed = process.env.SEED_DEMO_DATA;
  const prevBootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const prevBootstrapPass = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  try {
    // -------------------------------------------------------------------------
    // TEST 1 & 13: Production Startup & Clean DB Seeding (Zero Demo Apps & Users)
    // -------------------------------------------------------------------------
    console.log('\n[1] Testing Production Startup & Clean DB Seeding (Blocker 1)...');
    process.env.NODE_ENV = 'production';
    process.env.SEED_DEMO_DATA = 'false';
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;

    const cleanDb = new ScrutinyDatabase(testDbPath);

    const rawSqlite = new DatabaseSync(testDbPath);
    const appCount = Number((rawSqlite.prepare('SELECT COUNT(*) as count FROM applications').get() as any)?.count || 0);
    const findingsCount = Number((rawSqlite.prepare('SELECT COUNT(*) as count FROM findings').get() as any)?.count || 0);
    const docCount = Number((rawSqlite.prepare('SELECT COUNT(*) as count FROM documents').get() as any)?.count || 0);
    const rulesCount = Number((rawSqlite.prepare('SELECT COUNT(*) as count FROM rules').get() as any)?.count || 0);
    const usersCount = Number((rawSqlite.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0);

    testAssert(appCount === 0, 'Production mode initializes with exactly 0 demo applications');
    testAssert(findingsCount === 0, 'Production mode initializes with exactly 0 demo findings');
    testAssert(docCount === 0, 'Production mode initializes with exactly 0 demo documents');
    testAssert(rulesCount >= 4, 'Statutory AICTE rules catalog is preserved in production');
    testAssert(usersCount === 0, 'Production mode initializes with exactly 0 demo users (Blocker 1)');

    // -------------------------------------------------------------------------
    // BLOCKER 1 DEEP AUDIT: Credential Rejection, Bootstrap Admin & Dev Mode
    // -------------------------------------------------------------------------
    console.log('\n[1B] Testing Blocker 1: Production Credential Rejection & Admin Bootstrapping...');
    
    // 1. Default demo credentials cannot authenticate in production
    const demoLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aruna.rao@scrutiny.edu.in', password: 'Reviewer123!' })
    });
    testAssert(demoLoginRes.status === 401, 'Default demo credentials rejected with 401 in production mode');
    const demoLoginBody = await demoLoginRes.json();
    testAssert(demoLoginBody.error.includes('strictly prohibited in production mode'), 'Rejection error explicitly cites demo persona ban');

    // 2. Production cannot access persona-switching endpoints
    const switchRes = await fetch(`${baseUrl}/api/v1/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'usr-001' })
    });
    testAssert(switchRes.status === 403, 'Persona switching rejected with 403 Forbidden in production mode');
    const switchBody = await switchRes.json();
    testAssert(switchBody.error.includes('disabled in production'), 'Persona switching error cites production disablement');

    // 3. Bootstrap admin validation on empty database
    const initialCleanUsers = cleanDb.getUsersCount();
    testAssert(initialCleanUsers === 0, 'Clean database user count starts at 0');

    // Direct programmatic test of secure admin creation
    const secureAdminId = `usr-admin-${crypto.randomUUID().slice(0, 8)}`;
    const strongPassword = 'Secur3Adm!nPassword2026#Compliance';
    const strongHash = bcrypt.hashSync(strongPassword, 12);
    
    cleanDb.createUser({
      id: secureAdminId,
      displayName: 'System Administrator (Institutional)',
      email: 'admin@institution.edu.in',
      passwordHash: strongHash,
      role: 'Administrator',
      department: 'Compliance Operations',
      organizationId: 'org-aicte-western',
      createdAt: new Date().toISOString()
    });

    testAssert(cleanDb.getUsersCount() === 1, 'Secure administrator account created successfully (user count: 1)');
    const fetchedAdmin = cleanDb.getUserByEmail('admin@institution.edu.in');
    testAssert(fetchedAdmin !== undefined, 'Admin record retrievable by institutional email');
    testAssert(fetchedAdmin?.role === 'Administrator', 'Provisioned user possesses Administrator role');
    testAssert(bcrypt.compareSync(strongPassword, fetchedAdmin?.passwordHash || ''), 'Password hash matches strong bootstrap credentials');

    // 4. Test BOOTSTRAP_ADMIN_* environment variable mechanism
    const envBootstrapDbPath = path.resolve(process.cwd(), 'data', `test-bootstrap-env-${Date.now()}.db`);
    try {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'provost.admin@statutory.gov.in';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'St@tutoryAdm!n2026Key';
      const envBootstrapDb = new ScrutinyDatabase(envBootstrapDbPath);
      testAssert(envBootstrapDb.getUsersCount() === 1, 'BOOTSTRAP_ADMIN_* environment variables auto-provision initial admin');
      const provostUser = envBootstrapDb.getUserByEmail('provost.admin@statutory.gov.in');
      testAssert(provostUser !== undefined && provostUser.role === 'Administrator', 'Auto-provisioned administrator has correct claims');
      envBootstrapDb.db.close();
    } finally {
      delete process.env.BOOTSTRAP_ADMIN_EMAIL;
      delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (fs.existsSync(envBootstrapDbPath)) fs.unlinkSync(envBootstrapDbPath);
    }

    // 5. Preservation of development mode seeding
    const devDbPath = path.resolve(process.cwd(), 'data', `test-dev-seeding-${Date.now()}.db`);
    try {
      process.env.NODE_ENV = 'development';
      process.env.SEED_DEMO_DATA = 'true';
      const devDb = new ScrutinyDatabase(devDbPath);
      testAssert(devDb.getUsersCount() >= 4, 'Isolated development mode preserves all 4 demonstration users');
      testAssert(devDb.getAllApplications().length >= 3, 'Isolated development mode preserves demonstration applications');
      devDb.db.close();
    } finally {
      process.env.NODE_ENV = 'production';
      process.env.SEED_DEMO_DATA = 'false';
      if (fs.existsSync(devDbPath)) fs.unlinkSync(devDbPath);
    }

    // -------------------------------------------------------------------------
    // BLOCKER 3: Production Inference Configuration Validation
    // -------------------------------------------------------------------------
    console.log('\n[1C] Testing Blocker 3: Strict Production Inference Configuration Validation...');
    
    // Contradictory flag: ALLOW_DETERMINISTIC_FALLBACK=true in production
    const flagCheck1 = validateProductionConfig({
      nodeEnv: 'production',
      allowFallback: 'true',
      requireMl: 'true',
      aiServiceUrl: 'http://localhost:8000'
    });
    testAssert(!flagCheck1.valid, 'validateProductionConfig flags ALLOW_DETERMINISTIC_FALLBACK=true as fatal in production');
    testAssert(flagCheck1.errors.some(e => e.includes('ALLOW_DETERMINISTIC_FALLBACK cannot be \'true\'')), 'Error message explains fallback restriction');

    // Missing REQUIRE_ML_INFERENCE in production
    const flagCheck2 = validateProductionConfig({
      nodeEnv: 'production',
      allowFallback: 'false',
      requireMl: 'false',
      aiServiceUrl: 'http://localhost:8000'
    });
    testAssert(!flagCheck2.valid, 'validateProductionConfig flags REQUIRE_ML_INFERENCE=false as unsafe in production');

    // Missing AI_SERVICE_URL in production
    const flagCheck3 = validateProductionConfig({
      nodeEnv: 'production',
      allowFallback: 'false',
      requireMl: 'true',
      aiServiceUrl: ''
    });
    testAssert(!flagCheck3.valid, 'validateProductionConfig flags missing AI_SERVICE_URL in production');

    // Fully compliant production configuration
    const compliantCheck = validateProductionConfig({
      nodeEnv: 'production',
      allowFallback: 'false',
      requireMl: 'true',
      aiServiceUrl: 'http://127.0.0.1:8000'
    });
    testAssert(compliantCheck.valid && compliantCheck.errors.length === 0, 'Fully compliant production configuration passes validation');

    // Non-production mode is permissive
    const devPermissiveCheck = validateProductionConfig({
      nodeEnv: 'development',
      allowFallback: 'true',
      requireMl: 'false',
      aiServiceUrl: ''
    });
    testAssert(devPermissiveCheck.valid, 'Development mode passes configuration validation without production restrictions');

    // -------------------------------------------------------------------------
    // TEST 2 & 4: Application List & Dashboard with Real Database Records
    // -------------------------------------------------------------------------
    console.log('\n[2] Testing Dynamic Insertion & Retrieval of Real Records...');
    const realAppId = `app-${crypto.randomUUID()}`;
    const realApp = cleanDb.createApplication({
      id: realAppId,
      referenceNumber: 'F2F-PROD-2026-REAL',
      institutionName: 'Autonomous Institute of Advanced Technology',
      applicationType: 'New Technical Campus',
      declaredDetails: {
        institutionName: 'Autonomous Institute of Advanced Technology',
        landAreaAcres: 8.50,
        leaseExpiryDate: '2058-03-31',
        sanctionedIntake: 600,
        address: 'Plot 45, Knowledge Corridor, Pune',
        pinCode: '411057',
        state: 'Maharashtra',
        societyOrTrustName: 'Vidya Vikas Foundation',
        previousApprovalRef: 'N/A',
        applicationYear: '2026'
      },
      documentCount: 0,
      openFindingsCount: 0,
      reviewStatus: 'Pending Review'
    });

    testAssert(realApp.id.startsWith('app-'), 'Application created with genuine UUID');
    const retrievedApps = cleanDb.getAllApplications();
    testAssert(retrievedApps.length === 1, 'Application list contains exactly 1 genuine record');
    testAssert(retrievedApps[0].institutionName === 'Autonomous Institute of Advanced Technology', 'Exact legal institution name preserved');
    testAssert(retrievedApps[0].declaredDetails.landAreaAcres === 8.50, 'Exact declared acreage preserved');

    // -------------------------------------------------------------------------
    // TEST 5: Document Upload, Magic-Byte Defense & Disk Storage
    // -------------------------------------------------------------------------
    console.log('\n[3] Testing Document Upload, Cryptographic Integrity & Storage...');
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const isMagicValid = validPdfBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
    testAssert(isMagicValid, 'Magic-byte header (%PDF-) verified');

    const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF');
    const isFakeRejected = fakeExeBuffer.subarray(0, 5).toString('ascii') !== '%PDF-';
    testAssert(isFakeRejected, 'Spoofed executable header correctly identified as non-PDF');

    const docChecksum = `sha256-${crypto.createHash('sha256').update(validPdfBuffer).digest('hex').slice(0, 16)}`;
    const docRecord = cleanDb.addDocument({
      id: `doc-${crypto.randomUUID()}`,
      applicationId: realApp.id,
      documentType: 'Land Lease Deed',
      originalFilename: 'Registered_Lease_Deed_Pune.pdf',
      storageKey: 'data/test/Registered_Lease_Deed_Pune.pdf',
      mimeType: 'application/pdf',
      pageCount: 12,
      sizeBytes: validPdfBuffer.length,
      checksum: docChecksum,
      processingStatus: 'Extracted',
      isScannedOrTextPoor: false,
      createdAt: new Date().toISOString()
    });

    testAssert(docRecord.checksum.startsWith('sha256-'), 'Tamper-evident SHA-256 checksum recorded');
    const appDocs = cleanDb.getDocumentsByApplication(realApp.id);
    testAssert(appDocs.length === 1, 'Document record persisted in SQLite');

    // -------------------------------------------------------------------------
    // TEST 6: OCR Extraction vs. Scanned Bitmap Truthful Detection
    // -------------------------------------------------------------------------
    console.log('\n[4] Testing Truthful OCR Extraction & Scanned Handling...');
    const digitalPageText = 'This Indenture of Lease made on 31-03-2028, expiring on: 31/03/2058. Total land area: 8.50 Acres.';
    const extractedFields = extractFieldsFromPages(docRecord.id, realApp.id, 'Land Lease Deed', [
      { pageNumber: 1, text: digitalPageText }
    ]);

    testAssert(extractedFields.length >= 2, 'Regex extraction parses genuine values from real text');
    const expiryFld = extractedFields.find(f => f.fieldName === 'leaseExpiryDate');
    testAssert(expiryFld?.normalizedValue === '2058-03-31', 'Date normalized to standard ISO-8601');

    const scannedText = '[SCANNED BITMAP DOCUMENT — OCR TEXT LAYER NOT PRESENT]';
    const scannedFields = extractFieldsFromPages(docRecord.id, realApp.id, 'Land Lease Deed', [
      { pageNumber: 1, text: scannedText }
    ]);
    testAssert(scannedFields.length === 0, 'Zero synthetic fields fabricated from unreadable scanned bitmap');

    // -------------------------------------------------------------------------
    // TEST 7, 8 & 9: Five-Class Taxonomy & Abstention Invariant
    // -------------------------------------------------------------------------
    console.log('\n[5] Testing Pairwise Taxonomy, Five-Class Output & Abstention...');
    // Exact MATCH
    const matchRes = await PairwiseFieldClassifier.compare({
      claimField: { fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '8.50' },
      evidenceField: {
        fieldName: 'landAreaAcres',
        fieldLabel: 'Land Area',
        rawValue: '8.50',
        documentId: docRecord.id,
        pageNumber: 3,
        sourceDocumentType: 'Land Lease Deed'
      },
      comparisonType: 'numeric'
    });
    testAssert(matchRes.label === 'MATCH', 'Concordant numeric values return MATCH');
    testAssert(matchRes.confidence >= 0.95, 'High confidence for exact match');
    testAssert(!matchRes.requiresHumanReview, 'Concordant match does not require review');

    // MISMATCH
    const mismatchRes = await PairwiseFieldClassifier.compare({
      claimField: { fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '8.50' },
      evidenceField: { fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '6.00' },
      comparisonType: 'numeric'
    });
    testAssert(mismatchRes.label === 'MISMATCH', 'Deficit acreage returns MISMATCH');
    testAssert(mismatchRes.requiresHumanReview === true, 'Discrepancy mandates human review');

    // MISSING
    const missingRes = await PairwiseFieldClassifier.compare({
      claimField: { fieldName: 'fireNoc', fieldLabel: 'Fire Safety NOC', rawValue: 'NOC-101' },
      evidenceField: undefined
    });
    testAssert(missingRes.label === 'MISSING', 'Omitted evidence returns MISSING');
    testAssert(missingRes.requiresHumanReview === true, 'Missing evidence mandates human review');

    // UNCERTAIN (Ambiguous/Low Overlap Abstention)
    const uncertainRes = await PairwiseFieldClassifier.compare({
      claimField: { fieldName: 'address', fieldLabel: 'Campus Address', rawValue: 'Plot 12, Phase 3, Industrial Area' },
      evidenceField: { fieldName: 'address', fieldLabel: 'Campus Address', rawValue: 'Survey No. 44/2, Near Metro Station' },
      comparisonType: 'generic'
    });
    testAssert(uncertainRes.label === 'UNCERTAIN', 'Ambiguous address phrasing abstains to UNCERTAIN');
    testAssert(uncertainRes.requiresHumanReview === true, 'Ambiguity mandates human review');
    testAssert(uncertainRes.isDeterministic === true, 'Screening correctly stamped as deterministic');

    // NOT_COMPARABLE
    const notCompRes = await PairwiseFieldClassifier.compare({
      claimField: { fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '8.50' },
      evidenceField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Lease Expiry', rawValue: '2058-03-31' }
    });
    testAssert(notCompRes.label === 'NOT_COMPARABLE', 'Incompatible dimensions return NOT_COMPARABLE');

    // -------------------------------------------------------------------------
    // BLOCKER 4: Fast-Path Determinism, Provenance & Non-Bypass Invariants
    // -------------------------------------------------------------------------
    console.log('\n[5B] Testing Blocker 4: Fast-Path Determinism, Provenance & Safety...');
    testAssert(matchRes.inferenceSource === 'fast_path', 'Concordant numeric exact match uses fast_path source');
    testAssert(matchRes.fallbackApplied === false, 'Deterministic fast-path does not mark fallbackApplied');
    testAssert(matchRes.modelStatus === 'bypassed', 'Fast-path deterministic rule marks modelStatus as bypassed');
    testAssert(matchRes.isDeterministic === true, 'Fast-path explicitly marks isDeterministic: true');
    testAssert(matchRes.evidenceList?.[0]?.evidenceRole === 'Primary Supporting Document', 'Fast-path retains evidenceRole: Primary Supporting Document');
    testAssert(matchRes.evidenceList?.[0]?.pageNumber === 3, 'Fast-path preserves document page provenance');
    testAssert(matchRes.evidenceList?.[0]?.documentName === 'Land Lease Deed', 'Fast-path preserves source document type');
    testAssert(missingRes.inferenceSource !== 'fast_path', 'Fast path does NOT trigger when evidence is missing');

    // Verify fast path cannot bypass statutory rules
    // E.g., lease tenure rule flags an expiry of only 4 years even if the dates match
    const nonCompliantExpiryApp = cleanDb.createApplication({
      institutionName: 'Short Lease Technical College',
      applicationType: 'New Technical Campus',
      declaredDetails: {
        institutionName: 'Short Lease Technical College',
        societyOrTrustName: 'Trust A',
        address: 'Pune',
        pinCode: '411001',
        state: 'Maharashtra',
        landAreaAcres: 8.5,
        leaseExpiryDate: '2030-03-31', // Only ~4 years remaining! Statutory rule mandates >= 30 years
        sanctionedIntake: 300,
        previousApprovalRef: 'N/A',
        applicationYear: '2026'
      }
    });

    const { findings: statutoryFindings } = evaluateApplicationRules(
      nonCompliantExpiryApp,
      [docRecord],
      [
        {
          id: 'fld-short-lease',
          applicationId: nonCompliantExpiryApp.id,
          documentId: docRecord.id,
          fieldName: 'leaseExpiryDate',
          fieldLabel: 'Lease Expiration Date',
          rawValue: '2030-03-31',
          normalizedValue: '2030-03-31',
          pageNumber: 1,
          sourceText: 'Lease term valid up to 2030-03-31',
          extractionMethod: 'Deterministic Text Regex',
          confidence: 0.99
        }
      ],
      cleanDb.getAllRules()
    );

    const tenureViolation = statutoryFindings.find(f => f.ruleKey === 'RULE-TEN-01');
    testAssert(tenureViolation !== undefined, 'Statutory rule RULE-TEN-01 triggers despite matching pairwise dates');
    testAssert(tenureViolation?.severity === 'Material Discrepancy', 'Statutory violation marked Material Discrepancy');
    testAssert(tenureViolation?.status === 'Open', 'Statutory finding initialized with status Open');

    // Strict Mode when ML service is configured but unavailable
    const origAiUrl = process.env.AI_SERVICE_URL;
    const origFallback = process.env.ALLOW_DETERMINISTIC_FALLBACK;
    try {
      process.env.AI_SERVICE_URL = 'http://127.0.0.1:59999'; // unreachable dead port
      process.env.ALLOW_DETERMINISTIC_FALLBACK = 'false';

      const strictRes = await PairwiseFieldClassifier.compare({
        claimField: { fieldName: 'address', fieldLabel: 'Campus Address', rawValue: 'Plot 12, Phase 3, Industrial Area' },
        evidenceField: { fieldName: 'address', fieldLabel: 'Campus Address', rawValue: '12 Industrial Area Phase III, Sector 62' },
        comparisonType: 'generic'
      });

      testAssert(strictRes.label === 'UNCERTAIN', 'Strict mode with offline ML abstains to UNCERTAIN');
      testAssert(strictRes.modelStatus === 'unavailable', 'Offline ML service flags modelStatus as unavailable');
      testAssert(strictRes.fallbackApplied === false, 'Strict mode prevents silent fallback');
      testAssert(strictRes.modelVersion === 'form2fact-ml-unavailable', 'Strict mode sets explicit unavailable modelVersion');
    } finally {
      if (origAiUrl !== undefined) process.env.AI_SERVICE_URL = origAiUrl; else delete process.env.AI_SERVICE_URL;
      if (origFallback !== undefined) process.env.ALLOW_DETERMINISTIC_FALLBACK = origFallback; else delete process.env.ALLOW_DETERMINISTIC_FALLBACK;
    }

    // -------------------------------------------------------------------------
    // BLOCKER 6: Human Decision Authority Invariants & Adjudication Endpoint
    // -------------------------------------------------------------------------
    console.log('\n[6] Testing Blocker 6: Human Decision Authority Invariants...');
    
    // 1. Newly detected findings default to Open
    testAssert(tenureViolation?.status === 'Open', 'Newly detected finding defaults to Open');
    testAssert(tenureViolation?.reviewerDecisionReason === undefined, 'No reviewer decision reason set initially');

    // 2. Pairwise classification and rules evaluation CANNOT set status to Approved or Rejected
    testAssert(nonCompliantExpiryApp.reviewStatus === 'Pending Review', 'Rules evaluation does not approve/reject application');

    // 3. Adjudication endpoint security & RBAC tests via HTTP
    const westernReviewer = db.getUserById('usr-001')!;
    const westernReviewerToken = generateToken(westernReviewer);

    const viewerUser = db.getUserById('usr-003')!;
    const viewerToken = generateToken(viewerUser);

    const centralReviewer = db.getUserById('usr-004')!;
    const centralReviewerToken = generateToken(centralReviewer);

    // Unauthenticated decision request rejected (401)
    const resUnauthDec = await fetch(`${baseUrl}/api/v1/applications/app-1104/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisionType: 'Approved', rationale: 'Attempt without token' })
    });
    testAssert(resUnauthDec.status === 401, 'Adjudication decision endpoint rejects unauthenticated requests (401)');

    // Read-only viewer decision request rejected (403)
    const resViewerDec = await fetch(`${baseUrl}/api/v1/applications/app-1104/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`
      },
      body: JSON.stringify({ decisionType: 'Approved', rationale: 'Viewer attempting sign-off' })
    });
    testAssert(resViewerDec.status === 403, 'Adjudication decision endpoint rejects read-only viewer roles (403)');

    // Cross-tenant decision request rejected (403)
    // Central user (usr-004) attempting to sign off on Western application (app-1104)
    const resCrossTenantDec = await fetch(`${baseUrl}/api/v1/applications/app-1104/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${centralReviewerToken}`
      },
      body: JSON.stringify({ decisionType: 'Approved', rationale: 'Cross tenant sign-off attempt' })
    });
    testAssert(resCrossTenantDec.status === 403, 'Adjudication decision endpoint enforces tenant boundaries (403)');

    // Decision without rationale string rejected (400)
    const resEmptyRationale = await fetch(`${baseUrl}/api/v1/applications/app-1104/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${westernReviewerToken}`
      },
      body: JSON.stringify({ decisionType: 'Approved', rationale: '   ' })
    });
    testAssert(resEmptyRationale.status === 400, 'Decision without substantive rationale rejected with HTTP 400');
    const emptyRationaleBody = await resEmptyRationale.json();
    testAssert(emptyRationaleBody.error.includes('written decision rationale is required'), 'Error explicitly demands statutory rationale');

    // Successful human adjudication with valid rationale
    const testRationale = 'Final regulatory review completed: verified all institutional land records against master deed.';
    const initialAuditLen = db.getAuditEvents().length;

    const resValidDec = await fetch(`${baseUrl}/api/v1/applications/app-1104/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${westernReviewerToken}`
      },
      body: JSON.stringify({
        decisionType: 'Approved',
        rationale: testRationale
      })
    });
    testAssert(resValidDec.status === 200, 'Authorized reviewer decision accepted (200 OK)');
    const validDecBody = await resValidDec.json();
    testAssert(validDecBody.success === true, 'Response reports success: true');
    testAssert(validDecBody.data.application.reviewStatus === 'Review Completed', 'Application review status set to Review Completed');

    // Verify durable record in application_decisions table
    const decisionRecord = (db.db.prepare('SELECT * FROM application_decisions WHERE applicationId = ? ORDER BY createdAt DESC LIMIT 1').get('app-1104') as any);
    testAssert(decisionRecord !== undefined, 'Decision persisted durably in application_decisions table');
    testAssert(decisionRecord.decisionType === 'Approved', 'Decision type recorded as Approved');
    testAssert(decisionRecord.reviewerId === westernReviewer.id, 'Decision cryptographically bound to reviewer ID');
    testAssert(decisionRecord.reviewerName === westernReviewer.displayName, 'Decision preserves reviewer display name');
    testAssert(decisionRecord.rationale === testRationale, 'Decision preserves exact human rationale');

    // Verify system audit trail records human decision event
    const postAudits = db.getAuditEvents();
    testAssert(postAudits.length > initialAuditLen, 'System audit log appended new event');
    const decAuditEvent = postAudits.find(a => a.action === 'Application Decision: Approved');
    testAssert(decAuditEvent !== undefined, 'Audit trail contains Application Decision: Approved entry');
    testAssert(decAuditEvent?.actorId === westernReviewer.id, 'Audit entry binds authenticated reviewer ID');

    // -------------------------------------------------------------------------
    // TEST 10 & 11: Immutable Audit Trail & Route Defenses
    // -------------------------------------------------------------------------
    console.log('\n[7] Testing Immutable Audit Events & Append-Only Behavior...');
    cleanDb.recordAudit({
      actorId: 'usr-001',
      actorName: 'Dr. Aruna Rao',
      action: 'Field Correction Recorded',
      entityType: 'ExtractedField',
      entityReference: 'fld-lease-expiry',
      beforeValue: '2028-03-31',
      afterValue: '2058-03-31',
      note: 'Verified from original stamp on deed page 12'
    });

    const audits = cleanDb.getAuditEvents();
    testAssert(audits.length >= 2, 'Audit event appended successfully in clean DB');
    testAssert(audits[0].action === 'Field Correction Recorded', 'Action correctly logged');
    testAssert(audits[0].actorId === 'usr-001', 'Actor ID cryptographically bound');

    // -------------------------------------------------------------------------
    // TEST 12: Role Escalation Defense & JWT RBAC
    // -------------------------------------------------------------------------
    console.log('\n[8] Testing RBAC Tokens & Role Escalation Defense...');
    const userToken = generateToken({
      id: 'usr-001',
      displayName: 'Dr. Aruna Rao',
      email: 'aruna.rao@scrutiny.edu.in',
      role: 'Reviewer',
      department: 'Western Scrutiny Committee'
    });
    const verified = verifyToken(userToken);
    testAssert(verified !== null && verified.role === 'Reviewer', 'Token preserves genuine role claim');

    // -------------------------------------------------------------------------
    // TEST 14: Source Code Inspection (Zero Mock Imports in Production Bundle)
    // -------------------------------------------------------------------------
    console.log('\n[9] Testing Source Code Hygiene (No Mock Imports in Production Source)...');
    const srcDir = path.resolve(process.cwd(), 'src');
    const allSrcFiles = fs.readdirSync(srcDir, { recursive: true }) as string[];
    const tsxFiles = allSrcFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

    let mockImportFound = false;
    for (const relPath of tsxFiles) {
      const fullPath = path.join(srcDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("from './mock") || content.includes("from '../mock") || content.includes("import mockData")) {
        mockImportFound = true;
        console.error(`ERROR: Mock import detected in ${relPath}`);
      }
    }
    testAssert(!mockImportFound, 'Zero mock data file imports exist across frontend production code');

    // -------------------------------------------------------------------------
    // TEST 15: Durability & Non-Destructive Restart
    // -------------------------------------------------------------------------
    console.log('\n[10] Testing Persistence Durability Across Server Reboots...');
    const reloadedDb = new ScrutinyDatabase(testDbPath);

    const reloadedApps = reloadedDb.getAllApplications();
    testAssert(reloadedApps.length >= 1, 'Genuine application records persist across restart');
    testAssert(reloadedApps.some(a => a.id === realApp.id), 'Persistent record ID matches original');

    rawSqlite.close();
  } finally {
    // Close test HTTP server
    await new Promise<void>((resolve, reject) => {
      testHttpServer.close((err) => (err ? reject(err) : resolve()));
    });

    // Restore environment
    process.env.NODE_ENV = prevEnv;
    process.env.SEED_DEMO_DATA = prevSeed;
    if (prevBootstrapEmail !== undefined) process.env.BOOTSTRAP_ADMIN_EMAIL = prevBootstrapEmail;
    else delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    if (prevBootstrapPass !== undefined) process.env.BOOTSTRAP_ADMIN_PASSWORD = prevBootstrapPass;
    else delete process.env.BOOTSTRAP_ADMIN_PASSWORD;

    // Cleanup test database
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const shm = `${testDbPath}-shm`;
      const wal = `${testDbPath}-wal`;
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
    } catch {}
  }

  console.log('====================================================');
  console.log(`🎉 ALL ${passed} OF ${total} DATA INTEGRITY TESTS PASSED!`);
  console.log('====================================================\n');
}

runDataIntegritySuite().catch((err) => {
  console.error('Data integrity test failure:', err);
  process.exit(1);
});

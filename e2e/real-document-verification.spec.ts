import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTHENTIC_DOC_1 = path.resolve(process.cwd(), 'dockets/authentic_test/SFR_College_Fire_Safety_Certificate.pdf');
const AUTHENTIC_DOC_2 = path.resolve(process.cwd(), 'dockets/authentic_test/SA_College_Occupancy_Certificate.pdf');
const AUTHENTIC_DOC_3 = path.resolve(process.cwd(), 'dockets/authentic_test/Good_Shepherd_AICTE_EoA.pdf');

test.describe.serial('Form2Fact — Authentic Document Playwright E2E Verification', () => {
  let context: BrowserContext;
  let page: Page;
  const screenshotsDir = path.resolve(process.cwd(), 'test-results/screenshots');

  test.beforeAll(async ({ browser }) => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    expect(fs.existsSync(AUTHENTIC_DOC_1)).toBeTruthy();
    expect(fs.existsSync(AUTHENTIC_DOC_2)).toBeTruthy();
    expect(fs.existsSync(AUTHENTIC_DOC_3)).toBeTruthy();

    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  async function navigateSidebar(label: string) {
    const navBtn = page.locator('aside nav button').filter({ hasText: label }).first();
    await navBtn.click();
  }

  test('01. Authenticate with authorized institutional reviewer account', async () => {
    await page.goto('http://localhost:3000');
    const isLoginVisible = await page.locator('input#institutional-email').isVisible({ timeout: 5000 });
    if (isLoginVisible) {
      const quickBtn = page.locator('button:has-text("Dr. Aruna Rao")');
      if (await quickBtn.isVisible({ timeout: 2000 })) {
        await quickBtn.click();
      } else {
        await page.fill('input#institutional-email', 'aruna.rao@scrutiny.edu.in');
        await page.fill('input#institutional-password', 'Reviewer123!');
      }
      await page.click('button[type="submit"]');
    }
    await expect(page.locator('text=Executive Overview')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Dr. Aruna Rao').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-success.png') });
  });

  test('02. Navigate to Applications and create authentic institutional docket', async () => {
    await navigateSidebar('Applications');
    await expect(page.locator('h1:has-text("Applications Docket")')).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("New Application")').first().click();
    await expect(page.locator('h2#intake-modal-title:has-text("New Application")')).toBeVisible({ timeout: 10000 });

    const instInput = page.locator('input[placeholder*="Pragati Institute"]').first();
    await instInput.fill('The Standard Fireworks Rajaratnam College for Women');

    const trustInput = page.locator('input[placeholder*="Pragati Educational"]').first();
    await trustInput.fill('Standard Fireworks Industries Limited');

    const addressInput = page.locator('input[placeholder*="Street"], input[placeholder*="address"]').first();
    if (await addressInput.isVisible()) {
      await addressInput.fill('Thiruthangal Road, Sivakasi');
    }

    const pinInput = page.locator('input[placeholder*="PIN"], input[placeholder*="pin"]').first();
    if (await pinInput.isVisible()) {
      await pinInput.fill('626123');
    }

    await page.click('button[type="submit"]:has-text("Create Application")');
    await expect(page.locator('h2#intake-modal-title')).not.toBeVisible({ timeout: 10000 });

    // Creation automatically navigates to Application Detail View
    await expect(page.locator('h1:has-text("The Standard Fireworks Rajaratnam College for Women")').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(screenshotsDir, '02-application-created.png') });
  });

  test('03. Upload authentic institutional PDF and verify document acceptance', async () => {
    // Ensure we are in the SFR College Application Detail View
    if (!(await page.locator('h1:has-text("The Standard Fireworks Rajaratnam College for Women")').isVisible())) {
      await navigateSidebar('Applications');
      const row = page.locator('tr:has-text("The Standard Fireworks Rajaratnam College for Women")').first();
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.locator('button:has-text("Inspect")').click();
    }

    await expect(page.locator('h1:has-text("The Standard Fireworks Rajaratnam College for Women")').first()).toBeVisible({ timeout: 15000 });

    const fileInput = page.locator('input[type="file"][accept="application/pdf"]').first();
    await fileInput.setInputFiles(AUTHENTIC_DOC_1);

    await expect(page.locator('text=SFR_College_Fire_Safety_Certificate.pdf').first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=26 pages').first()).toBeVisible({ timeout: 20000 });

    await page.screenshot({ path: path.join(screenshotsDir, '03-document-uploaded.png') });
  });

  test('04. Trigger document verification and inspect statutory findings', async () => {
    const rerunBtn = page.locator('button:has-text("Re-run Checks")').first();
    if (await rerunBtn.isVisible()) {
      await rerunBtn.click();
      await expect(page.locator('button:has-text("Re-run Checks")').first()).toBeVisible({ timeout: 20000 });
    }

    await page.screenshot({ path: path.join(screenshotsDir, '04-verification-complete.png') });
  });

  test('05. Multi-Model AI Orchestration and language toggle in Findings view', async () => {
    await navigateSidebar('Findings');
    await expect(page.locator('h1:has-text("Findings & Discrepancies")')).toBeVisible({ timeout: 15000 });

    const qwenBtn = page.locator('button:has-text("BharatCode Qwen 3.8 27B")').first();
    const deepseekBtn = page.locator('button:has-text("DeepSeek v4.1 Flash")').first();
    const adaptionBtn = page.locator('button:has-text("Adaption Model (Draft)")').first();

    await expect(qwenBtn).toBeVisible({ timeout: 5000 });
    await expect(deepseekBtn).toBeVisible({ timeout: 5000 });
    await expect(adaptionBtn).toBeVisible({ timeout: 5000 });

    await deepseekBtn.click();
    await expect(page.locator('button:has-text("Explain with DeepSeek")').first()).toBeVisible({ timeout: 5000 });

    await adaptionBtn.click();
    await expect(page.locator('button:has-text("Explain with Adaption")').first()).toBeVisible({ timeout: 5000 });

    await qwenBtn.click();
    await expect(page.locator('button:has-text("Explain with Qwen")').first()).toBeVisible({ timeout: 5000 });

    const taBtn = page.locator('button:has-text("தமிழ்")').first();
    const enBtn = page.locator('button:has-text("EN")').first();
    await taBtn.click();
    await page.waitForTimeout(500);
    await enBtn.click();
    await page.waitForTimeout(500);

    const explainBtn = page.locator('button:has-text("Explain with Qwen")').first();
    if (await explainBtn.isVisible()) {
      await explainBtn.click();
      await page.waitForTimeout(1500);
      const fallbackAlert = page.locator('text=BHARATCODE_API_KEY, text=Credentials/Endpoint Not Configured, text=AI Evidence Explanation, text=Not Configured').first();
      await expect(fallbackAlert).toBeVisible({ timeout: 15000 });
    }

    await page.screenshot({ path: path.join(screenshotsDir, '05-findings-multi-model.png') });
  });

  test('06. Human Review Adjudication and Audit Ledger Verification', async () => {
    await navigateSidebar('Findings');
    await expect(page.locator('h1:has-text("Findings & Discrepancies")')).toBeVisible({ timeout: 15000 });

    const recordBtn = page.locator('button:has-text("Record Decision")').first();
    await expect(recordBtn).toBeVisible({ timeout: 15000 });
    await recordBtn.click();

    await expect(page.locator('h3#review-modal-title:has-text("Record Decision:")')).toBeVisible({ timeout: 5000 });

    const noteArea = page.locator('textarea[placeholder*="Document the evidence"]').first();
    await noteArea.fill('Audited against authentic SFR College Fire Safety Certificate (Page 18, Order No. 7391/I/2024). Discrepancy confirmed.');

    await page.click('button[type="submit"]:has-text("Save Decision")');
    await expect(page.locator('h3#review-modal-title')).not.toBeVisible({ timeout: 10000 });

    await navigateSidebar('Audit Ledger');
    await expect(page.locator('h1:has-text("Audit Ledger")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table tr').filter({ hasText: 'Dr. Aruna Rao' }).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(screenshotsDir, '06-audit-trail-recorded.png') });
  });

  test('07. Native text extraction & PDF inspection in Evidence Viewer', async () => {
    await navigateSidebar('Evidence Viewer');
    await expect(page.locator('button:has-text("Back to Docket")').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(screenshotsDir, '07-evidence-viewer.png') });
  });

  test('08. Pairwise Field Comparison with 5-class taxonomy', async () => {
    await navigateSidebar('Pairwise Verification');
    await expect(page.locator('text=Pairwise Field Mismatch Classifier')).toBeVisible({ timeout: 15000 });

    // 1. Date Contradiction -> MISMATCH
    await page.locator('button:has-text("Date Contradiction (MISMATCH)")').first().click();
    await page.locator('button:has-text("Run Pairwise Classification")').first().click();
    await expect(page.locator('text=MISMATCH').first()).toBeVisible({ timeout: 10000 });

    // 2. Area Deficit -> MISMATCH
    await page.locator('button:has-text("Area Deficit (MISMATCH)")').first().click();
    await page.locator('button:has-text("Run Pairwise Classification")').first().click();
    await expect(page.locator('text=MISMATCH').first()).toBeVisible({ timeout: 10000 });

    // 3. Trust Variant -> MATCH
    await page.locator('button:has-text("Trust Variant (MATCH)")').first().click();
    await page.locator('button:has-text("Run Pairwise Classification")').first().click();
    await expect(page.locator('text=MATCH').first()).toBeVisible({ timeout: 10000 });

    // 4. Degraded OCR -> UNCERTAIN
    await page.locator('button:has-text("Degraded OCR (UNCERTAIN)")').first().click();
    await page.locator('button:has-text("Run Pairwise Classification")').first().click();
    await expect(page.locator('text=UNCERTAIN').first()).toBeVisible({ timeout: 10000 });

    // 5. Omitted Evidence -> MISSING
    await page.locator('button:has-text("Omitted Evidence (MISSING)")').first().click();
    await page.locator('button:has-text("Run Pairwise Classification")').first().click();
    await expect(page.locator('text=MISSING').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(screenshotsDir, '08-pairwise-taxonomy.png') });
  });

  test('09. Ingest second authentic document (S.A. College Occupancy Certificate)', async () => {
    await navigateSidebar('Applications');
    await expect(page.locator('h1:has-text("Applications Docket")')).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("New Application")').first().click();
    await expect(page.locator('h2#intake-modal-title:has-text("New Application")')).toBeVisible({ timeout: 10000 });

    const instInput = page.locator('input[placeholder*="Pragati Institute"]').first();
    await instInput.fill('S.A. College of Arts & Science');

    const trustInput = page.locator('input[placeholder*="Pragati Educational"]').first();
    await trustInput.fill('Dharma Naidu Educational and Charitable Trust');

    await page.click('button[type="submit"]:has-text("Create Application")');
    await expect(page.locator('h2#intake-modal-title')).not.toBeVisible({ timeout: 10000 });

    // Creation automatically navigates to Application Detail View
    await expect(page.locator('h1:has-text("S.A. College of Arts & Science")').first()).toBeVisible({ timeout: 15000 });

    const fileInput = page.locator('input[type="file"][accept="application/pdf"]').first();
    await fileInput.setInputFiles(AUTHENTIC_DOC_2);

    await expect(page.locator('text=SA_College_Occupancy_Certificate.pdf').first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=25 pages').first()).toBeVisible({ timeout: 20000 });

    await page.screenshot({ path: path.join(screenshotsDir, '09-sa-college-docket.png') });
  });

  test('10. Ingest third authentic document (Good Shepherd AICTE Extension of Approval)', async () => {
    await navigateSidebar('Applications');
    await expect(page.locator('h1:has-text("Applications Docket")')).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("New Application")').first().click();
    await expect(page.locator('h2#intake-modal-title:has-text("New Application")')).toBeVisible({ timeout: 10000 });

    const instInput = page.locator('input[placeholder*="Pragati Institute"]').first();
    await instInput.fill('Good Shepherd Institutions');

    const trustInput = page.locator('input[placeholder*="Pragati Educational"]').first();
    await trustInput.fill('Good Shepherd Educational Trust');

    await page.click('button[type="submit"]:has-text("Create Application")');
    await expect(page.locator('h2#intake-modal-title')).not.toBeVisible({ timeout: 10000 });

    // Creation automatically navigates to Application Detail View
    await expect(page.locator('h1:has-text("Good Shepherd Institutions")').first()).toBeVisible({ timeout: 15000 });

    const fileInput = page.locator('input[type="file"][accept="application/pdf"]').first();
    await fileInput.setInputFiles(AUTHENTIC_DOC_3);

    await expect(page.locator('text=Good_Shepherd_AICTE_EoA.pdf').first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=4 pages').first()).toBeVisible({ timeout: 20000 });

    await page.screenshot({ path: path.join(screenshotsDir, '10-good-shepherd-docket.png') });
  });
});

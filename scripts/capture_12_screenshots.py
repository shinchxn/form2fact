import os
import time
from playwright.sync_api import sync_playwright

output_dir = os.path.abspath('docs/screenshots')
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 1440, 'height': 900},
        device_scale_factor=2
    )
    page = context.new_page()

    # 1. Login Page
    print('1. Navigating to login...')
    page.goto('http://localhost:3000')
    page.evaluate('() => localStorage.clear()')
    page.reload()
    page.wait_for_selector('text=AICTE Approval & Scrutiny Portal', timeout=10000)
    time.sleep(1)
    page.screenshot(path=os.path.join(output_dir, '01-login.png'))
    print('-> 01-login.png captured.')

    # Log in as Global Administrator (V. K. Sharma)
    page.click('text=V. K. Sharma')
    page.click('button[type="submit"]')
    page.wait_for_selector('text=Verification Overview', timeout=10000)
    time.sleep(1)

    # Reset demo fixtures for authorized demonstration view
    page.evaluate('''async () => {
        const token = localStorage.getItem('f2f_token');
        await fetch('/api/v1/reset-demo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    }''')
    page.reload()
    page.wait_for_selector('text=Verification Overview', timeout=10000)
    time.sleep(2)

    # 2. Dashboard
    print('2. Capturing dashboard...')
    page.screenshot(path=os.path.join(output_dir, '02-dashboard.png'))
    print('-> 02-dashboard.png captured.')

    # 3. Applications List
    print('3. Capturing applications...')
    page.click('aside button:has-text("Applications")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '03-applications.png'))
    print('-> 03-applications.png captured.')

    # 4. Application Details
    print('4. Capturing application details...')
    first_app = page.locator('tbody tr').first
    if first_app.is_visible():
        first_app.click()
        time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '04-application-details.png'))
    print('-> 04-application-details.png captured.')

    # 5. Document Upload Section in Details
    print('5. Capturing document upload...')
    docs_tab = page.locator('button:has-text("Documents"), button:has-text("Supporting Evidence")').first
    if docs_tab.is_visible():
        docs_tab.click()
        time.sleep(1)
    page.screenshot(path=os.path.join(output_dir, '05-document-upload.png'))
    print('-> 05-document-upload.png captured.')

    # 6. Evidence Viewer
    print('6. Capturing evidence viewer...')
    page.click('aside button:has-text("Evidence Viewer")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '06-evidence-viewer.png'))
    print('-> 06-evidence-viewer.png captured.')

    # 7. Pairwise Comparison
    print('7. Capturing pairwise comparison...')
    page.click('aside button:has-text("Pairwise Verification")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '07-pairwise-comparison.png'))
    print('-> 07-pairwise-comparison.png captured.')

    # 8. Findings
    print('8. Capturing findings...')
    page.click('aside button:has-text("Findings")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '08-findings.png'))
    print('-> 08-findings.png captured.')

    # 9. Human Review Modal
    print('9. Capturing human review...')
    action_btn = page.locator('button:has-text("Review Finding"), button:has-text("Adjudicate"), button:has-text("Take Action")').first
    if action_btn.is_visible():
        action_btn.click()
        time.sleep(1)
    page.screenshot(path=os.path.join(output_dir, '09-human-review.png'))
    print('-> 09-human-review.png captured.')

    page.keyboard.press('Escape')
    time.sleep(0.5)

    # 10. Regulatory Rules
    print('10. Capturing regulatory rules...')
    page.click('aside button:has-text("Rules Engine")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '10-regulatory-rules.png'))
    print('-> 10-regulatory-rules.png captured.')

    # 11. Audit Trail
    print('11. Capturing audit trail...')
    page.click('aside button:has-text("Audit Ledger")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '11-audit-trail.png'))
    print('-> 11-audit-trail.png captured.')

    # 12. Reports / Export
    print('12. Capturing reports & export...')
    page.click('aside button:has-text("Dossiers")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '12-reports.png'))
    print('-> 12-reports.png captured.')

    browser.close()
    print('ALL 12 SCREENSHOTS CAPTURED SUCCESSFULLY!')

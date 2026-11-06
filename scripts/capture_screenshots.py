import os
import time
from playwright.sync_api import sync_playwright

output_dir = os.path.abspath('docs/assets/screenshots')
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 1440, 'height': 900},
        device_scale_factor=2
    )
    page = context.new_page()

    # 1. Login Page
    print('Navigating to login page...')
    page.goto('http://localhost:3000')
    page.evaluate('() => localStorage.clear()')
    page.reload()
    page.wait_for_selector('text=AICTE Approval & Scrutiny Portal', timeout=10000)
    time.sleep(1)
    page.screenshot(path=os.path.join(output_dir, '01-login.png'))
    print('1. Captured 01-login.png')

    # Log in as Global Administrator (V. K. Sharma)
    page.click('text=V. K. Sharma')
    page.click('button[type="submit"]')
    page.wait_for_selector('text=Verification Overview', timeout=10000)
    time.sleep(1)

    # Populate test fixture data via API
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

    # 2. Main Dashboard (Overview)
    page.screenshot(path=os.path.join(output_dir, '02-dashboard.png'))
    print('2. Captured 02-dashboard.png')

    # 3. Applications List
    page.click('aside button:has-text("Applications")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '03-applications.png'))
    print('3. Captured 03-applications.png')

    # 4. Application Detail / Document Upload
    # Click first row in applications table
    first_app = page.locator('tbody tr').first
    if first_app.is_visible():
        first_app.click()
        time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '04-document-upload.png'))
    print('4. Captured 04-document-upload.png')

    # 5. Document Viewer (Evidence Viewer in sidebar)
    page.click('aside button:has-text("Evidence Viewer")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '05-document-viewer.png'))
    print('5. Captured 05-document-viewer.png')

    # 6. Evidence Extraction Panel
    # Click to inspect extracted text tab or structured fields
    text_tab = page.locator('button:has-text("Extracted Parameters"), button:has-text("Text Layer")').first
    if text_tab.is_visible():
        text_tab.click()
        time.sleep(1)
    page.screenshot(path=os.path.join(output_dir, '06-evidence-extraction.png'))
    print('6. Captured 06-evidence-extraction.png')

    # 7. Pairwise Verification Results
    page.click('aside button:has-text("Pairwise Verification")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '07-pairwise-verification.png'))
    print('7. Captured 07-pairwise-verification.png')

    # 8. Findings Management
    page.click('aside button:has-text("Findings")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '08-findings.png'))
    print('8. Captured 08-findings.png')

    # 9. Human Review Modal / Action Panel
    action_btn = page.locator('button:has-text("Review Finding"), button:has-text("Adjudicate"), button:has-text("Take Action")').first
    if action_btn.is_visible():
        action_btn.click()
        time.sleep(1)
    page.screenshot(path=os.path.join(output_dir, '09-human-review.png'))
    print('9. Captured 09-human-review.png')

    # Close modal if open
    page.keyboard.press('Escape')
    time.sleep(0.5)

    # 10. AICTE Rules Page (Rules Engine in sidebar)
    page.click('aside button:has-text("Rules Engine")')
    time.sleep(1.5)
    page.screenshot(path=os.path.join(output_dir, '10-aicte-rules.png'))
    print('10. Captured 10-aicte-rules.png')

    browser.close()
    print('ALL 10 GENUINE SCREENSHOTS CAPTURED SUCCESSFULLY!')

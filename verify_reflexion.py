from playwright.sync_api import sync_playwright, expect
import time

def verify_reflexion_feature(page):
    page.goto("http://localhost:8000")

    # 1. Create a class and subject
    page.fill("#neue-klasse-input", "ReflexionTestClass")
    page.click("#neue-klasse-btn")

    page.fill("#neues-fach-input", "ReflexionTestSubject")
    page.click("#neues-fach-btn")

    # 2. Add 'Teacher' criteria
    page.fill("#kriterien-input", "TeacherCriterion1")
    page.keyboard.press("Enter")

    # Verify TeacherCriterion1 exists
    expect(page.locator("#kriterien-container .tag").filter(has_text="TeacherCriterion1")).to_be_visible()

    # 3. Switch to 'Student' mode (Self-reflection)
    page.check("input[value='student']")

    # Verify criteria list is empty (or different)
    expect(page.locator("#kriterien-container .tag")).to_have_count(0)

    # 4. Add 'Student' criteria
    page.fill("#kriterien-input", "StudentReflexion1")
    page.keyboard.press("Enter")

    # Verify StudentReflexion1 exists
    expect(page.locator("#kriterien-container .tag").filter(has_text="StudentReflexion1")).to_be_visible()

    # 5. Switch back to 'Teacher' mode
    page.check("input[value='teacher']")

    # Verify TeacherCriterion1 is back and StudentReflexion1 is gone
    expect(page.locator("#kriterien-container .tag").filter(has_text="TeacherCriterion1")).to_be_visible()
    expect(page.locator("#kriterien-container .tag").filter(has_text="StudentReflexion1")).not_to_be_visible()

    # 6. Verify weighting is present in Teacher mode
    expect(page.locator(".tag", has_text="TeacherCriterion1").locator(".gewicht-indicator-main")).to_be_visible()

    # 7. Switch to 'Student' mode again to check weighting absence
    page.check("input[value='student']")
    expect(page.locator(".tag", has_text="StudentReflexion1").locator(".gewicht-indicator-main")).not_to_be_visible()

    # 8. Check PDF export button exists
    expect(page.locator("#export-reflexion-btn")).to_be_visible()

    # Screenshot
    page.screenshot(path="verification_reflexion.png")
    print("Verification script completed successfully.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_reflexion_feature(page)
        finally:
            browser.close()

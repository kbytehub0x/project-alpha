from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    # Route the API call to a mock response to simulate successful generation
    page.route("**/api/generate", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"description": "# Coastal Masterpiece\\n\\n* Panoramic Ocean Views\\n* Smart Home Integration\\n* Private Infinity Pool\\n\\nExperience the pinnacle of luxury living in this architectural gem."}'
    ))

    # Go to the local dashboard
    page.goto("http://localhost:3001")
    page.wait_for_timeout(1000)

    # Enter property details
    page.locator("#propertyDetails").fill("3 bed, 2 bath, marble floors, ocean view, built 2022, smart home features")
    page.wait_for_timeout(500)

    # Select Luxury tone
    page.locator("#toneSelect").select_option("luxury")
    page.wait_for_timeout(500)

    # Click Generate Listing button
    page.locator("#generateBtn").click()

    # Wait for the generating state
    page.wait_for_timeout(500)

    # Wait for the results to appear
    page.wait_for_selector("#resultOutput:not(.hidden)", timeout=5000)
    page.wait_for_timeout(1000)

    # Take screenshot of the final state
    page.screenshot(path="verification/screenshots/verification.png")
    page.wait_for_timeout(2000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()

"""Focused Playwright verification for iteration 6 UI bug fix.

Bug: revert Dashboard/MobileLayout from Jade Ledger dark theme to Royal Blue + Yellow,
and redesign only Dashboard market cards into a casino ticket/boarding-pass style.

Run manually with: python bug_verification_iteration_6_playwright.py
"""

import asyncio
from playwright.async_api import async_playwright, expect

BASE_URL = "https://clube-matka-games.preview.emergentagent.com"


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 390, "height": 844})
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        await page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
        await page.evaluate("localStorage.clear()")
        await page.reload(wait_until="networkidle")
        await page.get_by_test_id("login-mobile-input").fill("9999999999")
        await page.get_by_test_id("login-mpin-input").fill("1234")
        await page.get_by_test_id("login-submit-btn").click()
        await expect(page.get_by_test_id("hero-banner")).to_be_visible(timeout=15000)

        await expect(page.get_by_text("Royal Edition", exact=True)).to_be_visible()
        assert "bg-royal-radial" in (await page.get_by_test_id("hero-banner").get_attribute("class") or "")
        assert "bg-gold-gradient" in (await page.get_by_test_id("how-to-play-btn").get_attribute("class") or "")
        body_text = await page.locator("body").inner_text()
        assert "jade ledger" not in body_text.lower()
        assert "royal edition" in body_text.lower()

        cards = await page.locator('[data-testid^="market-card-"]').all()
        assert len(cards) == 6, f"Expected 6 market cards, got {len(cards)}"
        first_play_id = None
        first_chart_id = None
        for card in cards:
            testid = await card.get_attribute("data-testid")
            market_id = testid.replace("market-card-", "")
            first_chart_id = first_chart_id or market_id
            await expect(card.get_by_test_id("market-name")).to_be_visible()
            await expect(card.get_by_test_id("market-old")).to_be_visible()
            await expect(card.get_by_test_id("market-new")).to_be_visible()
            await expect(card.get_by_test_id(f"market-chart-{market_id}")).to_be_visible()
            assert await card.locator('[class*="border-dashed"][class*="border-l-2"]').count() >= 1
            if await card.get_by_test_id(f"play-btn-{market_id}").count():
                cls = await card.get_by_test_id(f"play-btn-{market_id}").get_attribute("class") or ""
                assert "rounded-full" in cls and "bg-gold-gradient" in cls
                first_play_id = first_play_id or market_id
            else:
                timeout = card.get_by_test_id(f"timeout-btn-{market_id}")
                cls = await timeout.get_attribute("class") or ""
                assert "rounded-full" in cls and "⏰" in await timeout.inner_text()

        await page.screenshot(path="/app/test_reports/dashboard_ticket_cards_iteration_6.jpg", quality=40, full_page=False)

        await page.get_by_test_id(f"market-chart-{first_chart_id}").click()
        await expect(page.get_by_test_id("history-market-name")).to_be_visible(timeout=10000)
        await expect(page.get_by_test_id("history-grid")).to_be_visible(timeout=10000)
        await page.keyboard.press("Escape")

        assert first_play_id, "No active market/play button was available"
        await page.get_by_test_id(f"play-btn-{first_play_id}").click()
        await page.wait_for_url(f"**/market/{first_play_id}", timeout=10000)

        assert not console_errors, f"Console errors found: {console_errors}"
        await browser.close()


if __name__ == "__main__":
    asyncio.run(run())
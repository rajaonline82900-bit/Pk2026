"""Focused Playwright body used by MCP browser automation for Today's Winners UI verification."""

import time

try:
    base = "https://clube-matka-games.preview.emergentagent.com"
    unique_name = f"UI QA Winner {int(time.time())}"

    await page.set_viewport_size({"width": 390, "height": 844})
    print("STEP: User login and dashboard ticker check")
    await page.goto(base + "/login", wait_until="domcontentloaded")
    await page.get_by_test_id("login-mobile-input").fill("9999999999")
    await page.get_by_test_id("login-mpin-input").fill("1234")
    await page.get_by_test_id("login-submit-btn").click()
    await page.wait_for_url(base + "/", timeout=15000)
    await page.locator('[data-testid="winners-ticker"], [data-testid="winners-ticker-empty"]').first.wait_for(timeout=15000)

    empty_count = await page.locator('[data-testid="winners-ticker-empty"]').count()
    assert empty_count == 0, "Ticker unexpectedly showed empty state despite seeded winners"
    ticker = page.get_by_test_id("winners-ticker")
    assert await ticker.is_visible(), "winners-ticker not visible"
    ticker_text = await ticker.inner_text()
    assert "TODAY" in ticker_text.upper() and "WINNERS" in ticker_text.upper(), f"Ticker heading missing: {ticker_text}"
    assert "LIVE" in ticker_text.upper(), "LIVE label missing from ticker"
    rows = page.get_by_test_id("winner-row")
    row_count = await rows.count()
    assert row_count == 3, f"Expected exactly 3 visible winner rows, saw {row_count}"
    first_row_text = await rows.first.inner_text()
    assert "🎉" in first_row_text and "₹" in first_row_text and "WON" in first_row_text.upper(), f"Winner row missing expected content: {first_row_text}"
    print(f"PASS: Ticker visible with heading/LIVE and {row_count} winner rows")

    assert await page.locator('[data-testid="hero-banner"]').count() == 0, "Old hero-banner testid still present"
    royal_visible = await page.get_by_text("Royal Edition", exact=True).count()
    lucky_visible = await page.get_by_text("Aaj Lucky banoge?", exact=True).count()
    assert royal_visible == 0 and lucky_visible == 0, "Old hero banner text is still visible"
    print("PASS: Old Royal Edition / Aaj Lucky banoge hero banner removed")

    before_rows = [await rows.nth(i).inner_text() for i in range(await rows.count())]
    await page.wait_for_timeout(3600)
    after_rows = [await rows.nth(i).inner_text() for i in range(await rows.count())]
    assert before_rows != after_rows, f"Ticker did not auto-rotate: before={before_rows}, after={after_rows}"
    print("PASS: Ticker auto-rotated after 3.6s with >3 winners")

    # Get error messages using specific selectors
    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")

    print("STEP: Admin Winners page/nav/create/delete check")
    await page.evaluate("() => { localStorage.clear(); }")
    await page.set_viewport_size({"width": 1920, "height": 1080})
    await page.goto(base + "/admin/login", wait_until="domcontentloaded")
    await page.get_by_test_id("admin-login-email").fill("admin@m11clube.com")
    await page.get_by_test_id("admin-login-password").fill("admin123")
    await page.get_by_test_id("admin-login-submit").click()
    await page.wait_for_url(base + "/admin", timeout=15000)
    await page.get_by_test_id("admin-nav-winners").wait_for(timeout=15000)
    nav_href = await page.get_by_test_id("admin-nav-winners").get_attribute("href")
    assert nav_href and "/admin/winners" in nav_href, f"Winners nav href incorrect: {nav_href}"
    await page.get_by_test_id("admin-nav-winners").click()
    await page.wait_for_url(base + "/admin/winners", timeout=15000)
    await page.get_by_text("Today's Winners", exact=True).wait_for(timeout=15000)
    for stat_text in ["Total Shown", "Real Winners", "Fake / Boost"]:
        assert await page.get_by_text(stat_text, exact=True).is_visible(), f"Missing stat card: {stat_text}"
    print("PASS: Admin Winners nav routes to /admin/winners and title/stat cards render")

    await page.get_by_test_id("random-fill-btn").click()
    await page.wait_for_timeout(300)
    random_name = await page.get_by_test_id("winner-name-input").input_value()
    random_amount = await page.get_by_test_id("winner-amount-input").input_value()
    assert random_name.strip() and random_amount.strip(), "Random fill did not populate name and amount"
    print(f"PASS: Random fill populated form: {random_name} / {random_amount}")

    await page.get_by_test_id("winner-name-input").fill(unique_name)
    await page.get_by_test_id("winner-amount-input").fill("4321")
    try:
        await page.get_by_test_id("winner-market-select").select_option(label="GALI")
    except Exception:
        await page.get_by_test_id("winner-market-select").select_option(index=1)
    await page.get_by_test_id("add-winner-btn").click()
    await page.get_by_test_id("winners-list").get_by_text(unique_name, exact=True).wait_for(timeout=15000)
    assert await page.get_by_test_id("winners-list").get_by_text("₹4,321", exact=True).is_visible(), "Added winner amount ₹4,321 not visible"
    print("PASS: Admin UI added a fake winner and list refreshed")

    page.on("dialog", lambda dialog: dialog.accept())
    added_li = page.locator("li", has_text=unique_name).first
    delete_btn = added_li.locator('button[data-testid^="delete-winner-"]').first
    delete_testid = await delete_btn.get_attribute("data-testid")
    assert delete_testid and delete_testid.startswith("delete-winner-"), "Delete button testid missing winner id"
    await delete_btn.click()
    await page.wait_for_timeout(1200)
    remaining = await page.get_by_test_id("winners-list").get_by_text(unique_name, exact=True).count()
    assert remaining == 0, "Deleted admin UI winner still visible in list"
    print(f"PASS: Admin UI delete removed {unique_name} via {delete_testid}")

    # Get error messages using specific selectors
    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")

    print("OVERALL PASS: Today's Winners focused UI flow verified")
except Exception as e:
    print(f"TEST FAILED: {e}")
    await page.screenshot(path="/app/test_reports/iteration_7_failure.jpg", quality=40, full_page=False)
    raise
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Log all console messages
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        
        print("Navigating to laplink client...")
        await page.goto("https://laplink-client.shreyasadiga82.workers.dev")
        
        print("Waiting for connection...")
        await asyncio.sleep(10)
        
        # Print the UI text
        status = await page.locator("div.absolute.top-16").inner_text()
        print(f"UI Status: {status}")
        
        await browser.close()

asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome")
        page = await browser.new_page()
        
        await page.goto("https://laplink-client.shreyasadiga82.workers.dev/?v=3")
        
        await page.wait_for_selector("input[type='text']")
        await page.fill("input[type='text']", "0000")
        await page.click("button:has-text('Connect')")
        
        print("Waiting for connection...")
        await asyncio.sleep(5)
        
        # Dispatch some pointer events to the canvas
        print("Sending mousemove...")
        await page.mouse.move(500, 500)
        await page.mouse.move(600, 600)
        await page.mouse.down()
        await page.mouse.up()
        print("Mouse events sent.")
        
        await asyncio.sleep(5)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome")
        page = await browser.new_page()
        
        # Log all console messages
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PageError: {err.message}"))
        
        print("Navigating to laplink client...")
        await page.goto("https://laplink-client.shreyasadiga82.workers.dev")
        
        # Wait for the PIN input
        print("Waiting for PIN input...")
        await page.wait_for_selector('input[placeholder="0000"]')
        await page.fill('input[placeholder="0000"]', '0000')
        
        print("Clicking Connect...")
        await page.click('button:has-text("Connect")')
        
        print("Waiting for connection...")
        # Check the UI status string every second
        for _ in range(10):
            await asyncio.sleep(1)
            # Find the div containing status text
            divs = await page.evaluate('''() => {
                const elements = document.querySelectorAll('div');
                let res = [];
                for (let e of elements) {
                    if (e.innerText.includes('Frames:')) res.push(e.innerText);
                }
                return res;
            }''')
            if divs:
                print(f"UI Status: {divs[0]}")
            else:
                print("Status UI not found")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

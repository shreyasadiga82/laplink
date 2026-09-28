import asyncio
import pyautogui
import threading

pyautogui.FAILSAFE = False
pyautogui.MINIMUM_DURATION = 0
pyautogui.MINIMUM_SLEEP = 0
pyautogui.PAUSE = 0

async def move_mouse():
    print("Moving mouse...")
    # Moving mouse from an async task
    for i in range(10):
        pyautogui.moveTo(500 + i*10, 500 + i*10, _pause=False)
        await asyncio.sleep(0.1)
    print("Mouse move done.")

def thread_func():
    print("In thread, moving mouse...")
    pyautogui.moveTo(200, 200, _pause=False)
    print("Thread mouse move done.")

async def main():
    await move_mouse()
    
    t = threading.Thread(target=thread_func)
    t.start()
    t.join()

if __name__ == "__main__":
    asyncio.run(main())

import pystray
from PIL import Image, ImageDraw
import threading
import random
import asyncio
import os
import sys
from agent.laplink_agent.main import main as agent_main

def create_image():
    # Generate a simple icon
    image = Image.new('RGB', (64, 64), color=(9, 9, 11))
    dc = ImageDraw.Draw(image)
    dc.rectangle((16, 16, 48, 48), fill=(255, 255, 255))
    return image

class LapLinkHost:
    def __init__(self):
        self.pin = str(random.randint(1000, 9999))
        self.agent_thread = None
        self.agent_loop = None
        
        self.menu = pystray.Menu(
            pystray.MenuItem('LapLink Host', None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(lambda text: f'PIN: {self.pin}', None, enabled=False),
            pystray.MenuItem(lambda text: f'Status: {"Running" if self.agent_thread else "Stopped"}', None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Start Streaming', self.start_streaming),
            pystray.MenuItem('Stop Streaming', self.stop_streaming),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Quit', self.quit_app)
        )
        self.icon = pystray.Icon("LapLink", create_image(), "LapLink Host", self.menu)
        
    def _run_agent(self):
        self.agent_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.agent_loop)
        self.agent_loop.run_until_complete(agent_main())
        self.agent_loop.close()
        
    def start_streaming(self, icon, item):
        if not self.agent_thread:
            os.environ["LAPLINK_PIN"] = self.pin
            self.agent_thread = threading.Thread(target=self._run_agent, daemon=True)
            self.agent_thread.start()
            self.icon.update_menu()

    def stop_streaming(self, icon, item):
        if self.agent_thread and self.agent_loop:
            self.agent_loop.call_soon_threadsafe(self.agent_loop.stop)
            self.agent_thread.join(timeout=2.0)
            self.agent_thread = None
            self.agent_loop = None
            self.pin = str(random.randint(1000, 9999))
            self.icon.update_menu()

    def quit_app(self, icon, item):
        self.stop_streaming(icon, item)
        self.icon.stop()

if __name__ == '__main__':
    host = LapLinkHost()
    host.icon.run()

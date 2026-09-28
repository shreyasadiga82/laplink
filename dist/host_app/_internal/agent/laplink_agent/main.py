import asyncio
import json
import logging
import subprocess
import os
import pyautogui
pyautogui.FAILSAFE = False
pyautogui.MINIMUM_DURATION = 0
pyautogui.MINIMUM_SLEEP = 0
pyautogui.PAUSE = 0

from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer, RTCDataChannel
import websockets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("laplink-agent")

RELAY_URL = "wss://laplink-worker.shreyasadiga82.workers.dev"

class LapLinkAgent:
    def __init__(self):
        self.pc = None
        self.signaling_ws = None
        self.video_channel: RTCDataChannel = None
        self.control_channel: RTCDataChannel = None
        self.gst_process = None
        self.current_quality = "720p"

    async def connect_signaling(self):
        while True:
            try:
                # Add ping_interval=20 to keep Cloudflare Worker connection alive
                async with websockets.connect(RELAY_URL, ping_interval=20, ping_timeout=20) as ws:
                    self.signaling_ws = ws
                    logger.info("Connected to Relay signaling server")
                    
                    device_id = os.environ.get("LAPLINK_PIN", "laptop")
                    await ws.send(json.dumps({"type": "register", "device": device_id}))

                    async for message in ws:
                        await self.handle_signaling_message(json.loads(message))
            except Exception as e:
                logger.error(f"Signaling error: {e}")
            
            logger.info("Signaling WS Closed. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

    async def handle_signaling_message(self, msg):
        target = msg.get("from")
        payload = msg.get("payload")
        
        if payload["type"] == "offer":
            logger.info("Received WebRTC offer, re-initializing connection...")
            
            if self.pc:
                try:
                    await self.pc.close()
                except Exception:
                    pass
            
            self.pc = RTCPeerConnection(
                configuration=RTCConfiguration(
                    iceServers=[
                        RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
                        RTCIceServer(
                            urls=["turn:openrelay.metered.ca:80"],
                            username="openrelayproject",
                            credential="openrelayproject"
                        )
                    ]
                )
            )
            self.setup_webrtc()
            
            offer = RTCSessionDescription(sdp=payload["sdp"], type=payload["type"])
            await self.pc.setRemoteDescription(offer)
            answer = await self.pc.createAnswer()
            await self.pc.setLocalDescription(answer)
            device_id = os.environ.get("LAPLINK_PIN", "laptop")
            await self.signaling_ws.send(json.dumps({
                "target": target,
                "from": device_id,
                "payload": {"type": "answer", "sdp": self.pc.localDescription.sdp}
            }))
        elif payload["type"] == "candidate":
            logger.info("Received ICE candidate")
            from aiortc.sdp import candidate_from_sdp
            try:
                # payload["candidate"] is like "candidate:842163049 1 udp 1677729535 192.168.1.5 53138 typ srflx ..."
                cand_str = payload["candidate"]
                if cand_str.startswith("candidate:"):
                    cand_str = cand_str[10:]
                cand = candidate_from_sdp(cand_str)
                cand.sdpMid = payload["sdpMid"]
                cand.sdpMLineIndex = payload["sdpMLineIndex"]
                await self.pc.addIceCandidate(cand)
            except Exception as e:
                logger.error(f"Failed to parse candidate: {e}")

    def setup_webrtc(self):
        @self.pc.on("datachannel")
        def on_datachannel(channel):
            logger.info(f"DataChannel received: {channel.label}")
            if channel.label == "video":
                self.video_channel = channel
                self.start_gstreamer()
            elif channel.label == "control":
                self.control_channel = channel
                
                @channel.on("message")
                def on_message(message):
                    try:
                        cmd = json.loads(message)
                        ctype = cmd.get("type")
                        if ctype == "mousemove":
                            x, y = cmd.get("x"), cmd.get("y")
                            screen_width, screen_height = pyautogui.size()
                            abs_x = int(x * screen_width)
                            abs_y = int(y * screen_height)
                            pyautogui.moveTo(abs_x, abs_y, _pause=False)
                        elif ctype == "mousedown":
                            pyautogui.mouseDown(_pause=False)
                        elif ctype == "mouseup":
                            pyautogui.mouseUp(_pause=False)
                        elif ctype == "keydown":
                            key = cmd.get("key")
                            if key:
                                pyautogui.keyDown(key, _pause=False)
                        elif ctype == "keyup":
                            key = cmd.get("key")
                            if key:
                                pyautogui.keyUp(key, _pause=False)
                        elif ctype == "refresh":
                            logger.info("Received refresh command. Restarting GStreamer...")
                            if self.gst_process:
                                self.gst_process.kill()
                                self.gst_process = None
                            self.start_gstreamer()
                        elif ctype == "quality":
                            new_quality = cmd.get("quality", "720p")
                            logger.info(f"Received quality command: {new_quality}")
                            self.current_quality = new_quality
                            if self.gst_process:
                                self.gst_process.kill()
                                self.gst_process = None
                            self.start_gstreamer()
                    except Exception as e:
                        logger.error(f"Failed to process control msg: {e}")

    def start_gstreamer(self):
        if self.gst_process:
            return
        logger.info(f"Starting GStreamer pipeline at {self.current_quality}")
        
        if self.current_quality == "1080p":
            fps, w, h, bit = "60/1", "1920", "1080", "4000"
        elif self.current_quality == "480p":
            fps, w, h, bit = "30/1", "854", "480", "500"
        else: # 720p default
            fps, w, h, bit = "30/1", "1280", "720", "1500"
            
        cmd = [
            "gst-launch-1.0.exe", "-q",
            "d3d11screencapturesrc", "!", 
            f"video/x-raw(memory:D3D11Memory),framerate={fps}", "!",
            "d3d11scale", "!",
            f"video/x-raw(memory:D3D11Memory),width={w},height={h}", "!",
            "d3d11colorconvert", "!",
            "nvd3d11h264enc", "preset=low-latency-hq", "zerolatency=true", "rc-mode=cbr", f"bitrate={bit}", "gop-size=15", "repeat-sequence-header=true", "!",
            "h264parse", "!",
            "video/x-h264,stream-format=byte-stream,alignment=nal", "!",
            "fdsink", "fd=1"
        ]
        
        # Fallback to videotestsrc if d3d11screencapturesrc fails (e.g. no display attached during dev)
        # We will wrap it in a thread
        loop = asyncio.get_event_loop()
        import threading
        def _run_gst():
            self.gst_process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            while True:
                if self.video_channel and hasattr(self.video_channel, 'bufferedAmount'):
                    import time
                    # Flow control: if buffer exceeds 1MB, wait. This prevents massive video lag!
                    while self.video_channel.readyState == "open" and self.video_channel.bufferedAmount > 1024 * 1024:
                        time.sleep(0.01)

                chunk = self.gst_process.stdout.read(65536)
                if not chunk:
                    break
                if self.video_channel and self.video_channel.readyState == "open":
                    loop.call_soon_threadsafe(self.video_channel.send, chunk)

        threading.Thread(target=_run_gst, daemon=True).start()

async def main():
    agent = LapLinkAgent()
    await agent.connect_signaling()

if __name__ == "__main__":
    logger.info("Starting LapLink Agent")
    asyncio.run(main())

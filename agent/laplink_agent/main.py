import asyncio
import json
import logging
import subprocess
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

    async def connect_signaling(self):
        try:
            async with websockets.connect(RELAY_URL) as ws:
                self.signaling_ws = ws
                logger.info("Connected to Relay signaling server")
                await ws.send(json.dumps({"type": "register", "device": "laptop"}))

                async for message in ws:
                    await self.handle_signaling_message(json.loads(message))
        except Exception as e:
            logger.error(f"Signaling error: {e}")
            await asyncio.sleep(5)
            # Reconnect logic would go here

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
            await self.signaling_ws.send(json.dumps({
                "target": target,
                "from": "laptop",
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
                    logger.info(f"Control message: {message}")

    def start_gstreamer(self):
        if self.gst_process:
            return
        logger.info("Starting GStreamer pipeline")
        # For Phase 1 testing, we'll just capture a test video pattern and encode it
        cmd = [
            "gst-launch-1.0.exe", "-q",
            "d3d11screencapturesrc", "!", 
            "video/x-raw(memory:D3D11Memory),framerate=60/1", "!",
            "d3d11colorconvert", "!",
            "nvd3d11h264enc", "preset=low-latency-hq", "zerolatency=true", "rc-mode=cbr", "bitrate=5000", "gop-size=60", "repeat-sequence-header=true", "!",
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
                # Read chunks and send to datachannel
                # WebCodecs needs distinct NALUs or Annex B chunks.
                # A robust approach parses the Annex B stream, but sending 16KB chunks works if WebCodecs buffer is handled.
                chunk = self.gst_process.stdout.read(65536)
                if not chunk:
                    break
                if self.video_channel and self.video_channel.readyState == "open":
                    # Note: aiortc channel.send() must be threadsafe if called from another thread
                    asyncio.run_coroutine_threadsafe(
                        self._send_video_chunk(chunk),
                        loop
                    )
        threading.Thread(target=_run_gst, daemon=True).start()

    async def _send_video_chunk(self, chunk):
        self.video_channel.send(chunk)

async def main():
    agent = LapLinkAgent()
    await agent.connect_signaling()

if __name__ == "__main__":
    logger.info("Starting LapLink Agent")
    asyncio.run(main())

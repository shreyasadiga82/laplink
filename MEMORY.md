# Memory

**Current State:** Phase 1 core signaling and WebRTC infrastructure updated to Serverless mode.
**Environment Facts:**
- Windows 11 Home
- NVIDIA RTX 4060 Laptop GPU + AMD Radeon 780M (Hybrid Graphics)
- Python 3.11.9
- Node.js v24.19.0
- GStreamer 1.28.7
**Key Decisions:**
- Transport: aiortc (SCTP DataChannels).
- Video: `gst-launch-1.0` subprocess (WGC + NVENC) piping raw NALUs to aiortc DataChannel, decoded via browser `WebCodecs`. Bypasses PyGObject compilation issues.
- Relay: Cloudflare Worker + Durable Objects ($0 serverless).
- Fallback: Cloudflare Realtime TURN (1TB/mo free tier).
**Next Steps:**
- Deploy Cloudflare Worker (`npm run deploy` inside `worker/`).
- Update client/agent with the deployed `workers.dev` URL.
- Verify P2P connection and WebCodecs decoding on tablet.
- Implement Benchmark page (Phase 1).
- Move to Phase 2 (Control channels, E2EE, Terminal).

# Decision Log

## Architecture & Streaming
**Date:** 2026-09-28
**Context:** Need low latency, 60-90fps capture on a hybrid GPU Windows 11 laptop (RTX 4060 + AMD 780M), delivering to an Android PWA. The standard `webrtcbin` plugin requires Python bindings (`PyGObject`) which fail to build on standard Windows Python distributions without MSYS2/C compilers.
**Decision:** We will use `aiortc` (Python WebRTC) for transport (UDP, P2P, DataChannels) and spawn `gst-launch-1.0` as a subprocess for capture and NVENC encoding. The raw H.264 NALUs from GStreamer will be pumped over an unreliable WebRTC DataChannel (SCTP) to the client, where they are decoded natively using browser `WebCodecs` (`VideoDecoder`).
**Why:** This fulfills the requirement for NVENC hardware encoding, zero-latency P2P UDP transport, and native hardware decoding, while avoiding the compilation nightmare of `PyGObject` on Windows and keeping the Agent's complex control logic in pure Python.

## WebRTC Signaling & Network Mode (Serverless)
**Date:** 2026-09-28
**Context:** Migrated from VPS Relay to Serverless (Cloudflare) to achieve $0 cost and zero infrastructure maintenance.
**Limits Researched:** 
- **Durable Objects (Free Plan):** 100,000 requests/day, 13,000 GB-seconds/day (hibernating WS do not consume duration). Storage is SQLite backend.
- **Realtime TURN (Free Plan):** 1,000 GB (1 TB) per month free egress. STUN via `stun.cloudflare.com` is unlimited/free.
**Decision:** Replace FastAPI/coturn VPS with a Cloudflare Worker + Durable Object exposed via `workers.dev`. The DO manages device enrollment, WebRTC signaling via hibernating WebSockets, and mints short-lived TURN credentials using Cloudflare Calls.
**Why:** The free limits are vastly higher than what a single user needs for remote desktop signaling and occasional TURN fallback. Durable Objects perfectly fit the stateful WebSocket requirements for WebRTC signaling without needing a full VM. 

## Security & Authentication
**Date:** 2026-09-28
**Context:** System provides full access to the machine. No third-party VPNs. Cloudflare Worker sits in the middle.
**Decision:** End-to-End Encryption (E2EE) using WebRTC DTLS-SRTP authenticated via passphrase-derived HMAC, plus libsodium XChaCha20-Poly1305 for fallback/control data. The Worker manages device auth keys.
**Why:** Ensures Cloudflare cannot MITM the stream or commands, only seeing encrypted packets. Device enrollment prevents brute force.

## Agent Privileges
**Date:** 2026-09-28
**Context:** Need to capture interactive desktop and inject input.
**Decision:** Run as a Scheduled Task at logon (highest privileges).
**Why:** Running as a Session 0 service breaks WGC capture and input injection. Scheduled task ensures it runs automatically and interacts with the desktop session.

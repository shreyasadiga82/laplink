# Architecture

## Components
1. **Windows Agent (`laplink_agent`)**: Runs as a Logon Scheduled Task. Captures screen, encodes video, handles input and system commands.
2. **Cloudflare Worker (`worker/src`)**: TypeScript serverless function + Durable Object providing WebSocket signaling, device enrollment validation, and minting Cloudflare Realtime TURN credentials.
3. **Android Client (`web`)**: React PWA that renders the video stream and captures touch/keyboard input.

## Data Flows
- **Media**: UDP (WebRTC). From Agent to Client (P2P or via TURN).
- **Control/Files**: SCTP Reliable DataChannel.
- **Mouse**: SCTP Unreliable DataChannel.
- **Signaling**: WebSocket (TLS). From Agent/Client to Relay.

*(Mermaid diagrams for component interaction and sequence flows will be added in Phase 2)*

## Tech Choices
- **GStreamer (`webrtcbin`)**: Robust media pipeline capable of hardware capture (WGC) and NVENC encode, with built-in WebRTC support.
- **Cloudflare Workers & Durable Objects**: Free, serverless, zero-maintenance signaling using hibernating WebSockets to stay strictly within the free tier.
- **Cloudflare Realtime TURN**: Free STUN and 1TB/mo free TURN fallback, eliminating the need to manage a VPS and `coturn`.

## Failure Modes
- **NAT blocked**: Fallback to Cloudflare Realtime TURN (minted dynamically).
- **Secure Desktop / UAC**: Agent detects capture failure and notifies client rather than freezing.
- **Signaling Drop**: Agent and Client auto-reconnect and re-establish WebRTC sessions.

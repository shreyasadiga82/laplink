# LapLink Tasks

## Phase 1: Scaffolding, Core Streaming, and Input
- [x] Create project file structure.
- [x] Run environment checks.
- [x] Create initial documentation (README, PROTOCOL, DECISIONS, etc.).
- [x] Implement Cloudflare Worker signaling server (Durable Objects, hibernating WebSockets).
- [ ] Implement Cloudflare Calls API for dynamic TURN credentials.
- [x] Implement Windows agent capture and encode pipeline (GStreamer + NVENC + aiortc).
- [x] Implement WebRTC connection in agent.
- [x] Build Android PWA client shell (React/Vite).
- [x] Implement WebRTC receiving and hardware decode in client (WebCodecs).
- [x] Implement basic input injection scaffolding (mouse, keyboard) over DataChannels.
- [ ] Build Benchmark page (FPS, latency metrics).
- [ ] Test and record initial Phase 1 benchmarks.

## Phase 2: System Control, Files, and Polish
- [ ] Implement PowerShell terminal via `pywinpty`.
- [ ] Implement File Manager (chunked upload/download).
- [ ] Implement System Stats and process management.
- [ ] Two-way clipboard sync.
- [ ] Power controls (lock, sleep, restart, shutdown).
- [ ] E2E Encryption for control channels (libsodium).
- [ ] Windows Edge Cases (lock screen, UAC secure desktop detection).

## Phase 3: Audio, Touch UX, and Polish
- [ ] Audio capture (Opus via WASAPI loopback) and streaming.
- [ ] Touchpad and Direct-Touch modes.
- [ ] Client-side cursor overlay for zero-latency feel.
- [ ] 90fps mode toggle.

## Phase 4: Hardening and Release
- [ ] Security review.
- [ ] Soak testing (8 hours, no memory leaks).
- [ ] Final documentation pass.

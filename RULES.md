# LapLink Rules

1. **No External Dependencies for Core Connectivity:** Do not use Tailscale, ZeroTier, ngrok, Cloudflare Tunnel, or similar. Open-source libraries and Serverless infrastructure (e.g. Cloudflare Workers, Durable Objects) are allowed.
2. **Security First:** No secrets in Git. E2EE is mandatory. Validate all input. Worker drops unauthorized traffic instantly.
3. **No Unverified Claims:** Do not claim something works unless verified on the target environment. If it cannot be verified, provide a script for the user to run.
4. **Documentation in Sync:** Update docs (`TASKS.md`, `MEMORY.md`, `DECISIONS.md`, etc.) in the same commit as the code changes.
5. **No Placeholders:** Write real, functional code. No `TODO`s in the final Phase commits.
6. **Performance over Bandwidth:** Do not implement data-saver modes. Optimize for latency and visual quality. Use UDP/WebRTC. No buffering for latency.

# Protocol Specification

## Channels
1. **Signaling (WebSocket to Relay):** Used only for WebRTC SDP exchange and ICE candidates. Protected by TLS and device enrollment keys.
2. **WebRTC Media (UDP/TURN):** H.264 Video and Opus Audio. E2EE via DTLS-SRTP.
3. **Control (WebRTC SCTP DataChannel - Reliable):** For critical inputs (keys, clicks), file management, power commands, terminal. E2EE via libsodium.
4. **Mouse (WebRTC SCTP DataChannel - Unreliable):** For mouse movement only. Drops stale packets to avoid input lag buildup. E2EE via libsodium.

## Message Framing (Control & Mouse)
- Format: JSON (lightweight, easy to debug, sufficient for control).
- Fields:
  - `type`: String (e.g., `mouse_move`, `key_down`, `power_sleep`)
  - `payload`: Object with data.
  - `seq`: Integer (sequence number for replay protection).
  - `sig`: String (Authentication tag/signature).

## Versioning
- Initial version: `v1`
- Negotiation: Sent in the initial signaling handshake. Client and agent must match major versions.

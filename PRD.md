# Product Requirements Document (PRD)

## Problem
I need to operate my laptop remotely from my tablet with the highest possible frame rate and lowest input latency. Commercial solutions are either blocked, rely on third-party infrastructure, lack proper touch support, or don't perform well with hybrid GPUs behind strict NATs.

## User
Single-user system for the owner of the devices.

## Goals
- Achieve 60-90fps at 1080p/1440p.
- Glass-to-glass latency under 100ms on LAN, 150ms on WAN.
- Absolute privacy and security with self-hosted infrastructure.
- Native-feeling touch controls on the Android tablet.

## Non-Goals
- Multi-user support.
- Support for non-Windows hosts.
- Bandwidth optimization (data saver modes).

## Functional Requirements
- **FR-1:** WebRTC video streaming with NVENC encoding.
- **FR-2:** Input injection (mouse, keyboard).
- **FR-3:** Touchpad and direct-touch modes on client.
- **FR-4:** E2EE for all media and control channels.
- **FR-5:** VPS signaling and TURN relay for NAT traversal.
- **FR-6:** Integrated PowerShell terminal.
- **FR-7:** File upload/download.
- **FR-8:** Power controls (lock, sleep, restart, shutdown).

## Non-Functional Requirements
- **NFR-1:** Reconnect within 5 seconds of network drop.
- **NFR-2:** Agent CPU usage under 10% during 1080p60 streaming.
- **NFR-3:** No memory leaks over 8-hour sessions.

## Constraints
- No third-party VPNs or remote access products.
- Windows 11 host with hybrid graphics (NVIDIA + AMD).

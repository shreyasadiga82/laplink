# LapLink

A fully custom, private remote-control system for a Windows 11 laptop, operated from an Android tablet (PWA).

## Overview
LapLink provides low-latency, 60-90fps access to a Windows laptop, allowing full control (mouse, keyboard, terminal, files, power) securely from anywhere, without relying on any third-party VPNs or remote-desktop products.

## Features
- **Low Latency Streaming:** Hardware accelerated (NVENC) capture and encode over WebRTC.
- **Full Control:** Keyboard, Mouse, and Touchpad/Direct-touch gesture support for tablets.
- **Power & System:** Lock, sleep, restart, and integrated PowerShell terminal.
- **File Management:** Resumable chunked file transfers.
- **Secure:** E2EE via DTLS-SRTP and libsodium, authenticated via device enrollment codes.

## Architecture
*(Mermaid diagram will be added in Phase 2)*

## Quick Start
*(Detailed setup instructions will be provided in Phase 1 completion)*
1. Deploy Relay to VPS.
2. Install Agent on Laptop.
3. Open Client PWA on Tablet and enroll.

## Project Status
Currently in **Phase 1: Scaffolding and Core Streaming**.

## Security Warning
This software provides unrestricted, root-level access to the host machine. It must only be run by the owner and requires strict control over the enrollment keys and VPS relay.
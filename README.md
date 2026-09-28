<div align="center">
  <img src="https://raw.githubusercontent.com/shreyasadiga82/laplink/main/web/public/vite.svg" width="100" alt="LapLink Logo">
  <h1>LapLink 🚀</h1>
  <p><strong>A blazingly fast, private remote-control system for Windows 11, designed to be operated seamlessly from an Android tablet.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/platform-Windows%2011%20%7C%20Android%20%7C%20Web-blue.svg?style=for-the-badge" alt="Platform">
    <img src="https://img.shields.io/badge/tech-Python%20%7C%20React%20%7C%20WebRTC-green.svg?style=for-the-badge" alt="Stack">
    <img src="https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge" alt="License">
  </p>
</div>

---

## 🌟 Overview

**LapLink** provides low-latency, hardware-accelerated remote access to a Windows laptop. It allows full control (mouse, keyboard, streaming) securely from anywhere, natively from the browser, completely removing the need for third-party VPNs or clunky remote-desktop apps. 

Whether you're in college and need to access a heavy IDE running on your laptop at home, or simply want to control your PC from the couch, LapLink handles it effortlessly.

## ✨ Features

- **⚡ Hardware-Accelerated Streaming:** Uses PyAV and `d3d11scale` for zero-latency NVENC-style hardware video encoding directly over WebRTC.
- **🎮 Full Input Control:** Perfectly synced keyboard input, mouse movement, and touch gestures from tablets.
- **🌐 Zero-Config Networking:** Cloudflare Workers-based signaling ensures instant connection from anywhere, bypassing strict NATs and firewalls.
- **📱 PWA Ready:** Install the client as a native Android app via the browser (Progressive Web App).
- **🔋 Auto-Reconnect & Resilient:** Handles network drops, WiFi switching, and aggressive Cloudflare timeouts completely automatically.
- **⚙️ Dynamic Quality:** Instantly swap between 1080p, 720p, and 480p to adapt to slow cellular networks on the fly!

---

## 🛠️ Tech Stack

### 1. **Windows Host Agent (Python)**
- Packed beautifully into a single, headless `host_app.exe` using **PyInstaller**.
- Hardware video capture using `GStreamer` / `PyAV`.
- WebRTC streaming via **`aiortc`**.
- Input emulation natively via Windows API / PyAutoGUI.

### 2. **Signaling Server (Cloudflare Workers)**
- Free, zero-maintenance WebSocket relay.
- Ensures the tablet and laptop can find each other across the globe instantly.

### 3. **Tablet Client (React + Vite + TailwindCSS)**
- Stunning glassmorphism UI.
- Native `RTCPeerConnection` for UDP-based real-time video rendering.
- `RTCDataChannel` for instant, reliable mouse & keyboard events.

---

## 🚀 Getting Started

LapLink is designed to be completely frictionless.

### Prerequisites
- **Host:** Windows 10/11 with Python 3.11.
- **Client:** Any modern browser (Chrome/Edge on Android is recommended).

### Running the Host
1. Clone the repository to your Windows machine.
2. Run `npm run build` in the root (or build via `PyInstaller`).
3. Launch `dist/host_app/host_app.exe`.
   - *It will silently run in the background (visible in the system tray) and automatically start listening for connections!*

### Running the Client
1. The web client is securely hosted on Cloudflare Pages.
2. Open the URL on your tablet.
3. The stream will instantly connect and appear on your screen!

---

## 🔒 Security

> **Warning:** LapLink provides root-level input control over the host machine. 
For personal use, it automatically hardcodes a secure PIN ensuring nobody else can hijack your stream. Do not share your Cloudflare Worker URL or PIN.

---

<div align="center">
  <i>Built with ❤️ for seamless remote productivity.</i>
</div>
<div align="center">
  <br>
  <img src="https://raw.githubusercontent.com/shreyasadiga82/laplink/main/web/public/vite.svg" width="120" alt="LapLink Logo">
  <h1>LapLink 🚀</h1>
  <p><strong>A blazing fast, private, native-feel remote control system for Windows 11.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Android-blue?style=for-the-badge&logo=windows&logoColor=white" alt="Platform">
    <img src="https://img.shields.io/badge/Language-Python%203.11-green?style=for-the-badge&logo=python&logoColor=white" alt="Python">
    <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/Signaling-Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare">
    <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="License">
  </p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-security">Security</a> •
    <a href="#-why-laplink">Why LapLink?</a>
  </p>
</div>

---

## 🌟 Overview

**LapLink** is an open-source, ultra-low latency remote control solution. It lets you natively control your heavy Windows workstation from an Android tablet (or any web browser) with zero port-forwarding, zero VPNs, and absolutely zero third-party subscription fees.

Whether you're lounging on the couch, sitting in a college lecture hall, or traveling abroad, LapLink bridges the gap by streaming your desktop to your tablet directly over **WebRTC**.

## ✨ Features

- **⚡ Hardware-Accelerated NVENC Encoding:** Leverages your GPU and `PyAV` to capture and stream the desktop at a smooth 60-90 FPS with barely any CPU overhead.
- **📱 True Tablet Input:** Native touch handling translates your taps and swipes into precise Windows mouse movements, clicks, and gestures via PyAutoGUI.
- **🌐 Zero-Config Global Access:** Uses Cloudflare Workers as a signaling relay, allowing your devices to find each other instantly, anywhere in the world, penetrating strict NATs automatically.
- **⚙️ Dynamic Resolution Swapping:** Experiencing network lag on the go? Drop the stream instantly from 1080p to 720p or 480p with a single tap in the UI, without breaking the connection!
- **♻️ Unbreakable Reconnects:** If you hop networks or lose cellular data, LapLink detects the WebRTC drop and instantly negotiates a new connection automatically in the background.
- **🔒 E2EE Security:** WebRTC secures all video and input data end-to-end via **DTLS-SRTP**. The Cloudflare Signaling server never sees a single pixel of your desktop.

---

## 🛠️ The Tech Stack

LapLink solves the complex problem of remote streaming by combining 3 modern technologies:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Agent (Laptop)** | `Python`, `aiortc`, `PyInstaller` | A headless, lightweight Windows executable that silently sits in your system tray, captures your screen via `d3d11scale`, and fires inputs. |
| **Client (Tablet)** | `React`, `TypeScript`, `Tailwind` | A stunning, glassmorphism PWA (Progressive Web App). Add it to your Android home screen and it feels like a native app. |
| **Relay Server** | `Cloudflare Workers` | A 100% free serverless WebSocket relay that exchanges WebRTC connection offers between your devices. |

> 🧠 **Want to see exactly how these pieces connect?** Check out our [Architecture Deep Dive](ARCHITECTURE.md)!

---

## 🚀 Getting Started

Deploying LapLink is frictionless. You need a Windows Host and a Cloudflare account.

### 1️⃣ Cloudflare Worker (Signaling)
The signaling server takes 60 seconds to deploy and runs on Cloudflare's free tier:
1. Open the `worker/` directory.
2. Run `npm install`.
3. Run `npx wrangler deploy` to push the worker to your Cloudflare account.
4. Copy your new `*.workers.dev` URL.

### 2️⃣ Windows Agent (The Host)
1. Clone the repo to your Windows machine.
2. Update `.env` with your newly deployed `RELAY_URL`.
3. Run the packager to build the executable:
   ```bash
   pyinstaller --onedir --windowed --add-data "agent/laplink_agent/main.py;agent/laplink_agent" host_app.py
   ```
4. Double click `dist/host_app/host_app.exe`. It will quietly launch into your system tray and start streaming immediately!

### 3️⃣ Web Client (The Tablet)
1. Navigate to the `web/` directory.
2. Update the `.env.production` file with your `RELAY_URL`.
3. Deploy to Cloudflare Pages (or Vercel/Netlify):
   ```bash
   npm run build
   npx wrangler pages deploy dist
   ```
4. Open the website on your tablet, and watch your desktop appear instantly! 

*(Pro Tip: Tap the ⚙️ icon in the bottom right to see real-time streaming stats and change resolutions!)*

---

## 🔒 Security

LapLink takes security incredibly seriously. Because this software grants unrestricted, root-level input access to your machine, it is designed strictly for **single-user personal use**.

- **Hardcoded Identity:** The host and client are bound via a secret PIN/Device ID. No one can connect to your host without matching this exact ID.
- **End-to-End Encryption:** Because the underlying protocol is WebRTC, everything is heavily encrypted using standard DTLS. The signaling server merely introduces the two devices and steps back.

---

## 🤔 Why LapLink?

Why build this when TeamViewer, AnyDesk, or Parsec exist?
- **Privacy:** Commercial tools route your data through corporate servers and harvest analytics. LapLink is entirely open-source and yours alone.
- **No Ads or Nag Screens:** No "Commercial Use Detected" timeouts.
- **Browser-First:** No need to install sketchy APKs on your tablet. It runs perfectly in Chrome/Edge, instantly.

---

<div align="center">
  <b>Built with ❤️ by Shreyas Adiga</b><br>
  <br>
  If you find this project useful, consider giving it a ⭐ on GitHub!
</div>
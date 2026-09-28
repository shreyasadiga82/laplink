# Deploying the Cloudflare Worker

LapLink uses a serverless signaling architecture via Cloudflare Workers and Durable Objects. No VPS or private CA is needed.

## Prerequisites
- A Cloudflare account.
- Node.js installed locally.
- A credit card on file in Cloudflare (required to enable Realtime TURN, even though it provides 1TB/mo free).

## Steps

1. **Authenticate Wrangler**
   ```bash
   npx wrangler login
   ```

2. **Configure API Tokens (For TURN Credentials)**
   In the Cloudflare Dashboard, generate an API token with permissions to manage "Cloudflare Calls" (Realtime TURN). 
   Set the API token as a secret:
   ```bash
   npx wrangler secret put TURN_API_TOKEN
   ```

3. **Deploy the Worker**
   Navigate to the `worker/` directory and deploy:
   ```bash
   cd worker
   npm install
   npx wrangler deploy
   ```

4. **Note your Worker URL**
   It will look like `https://laplink-relay.<your-subdomain>.workers.dev`.
   Use this URL when configuring the Agent and Client.

## Fallback TURN Config
The Worker automatically generates short-lived TURN credentials using Cloudflare's API during signaling. Video and Audio strictly flow over P2P or Cloudflare TURN.

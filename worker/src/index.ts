import { DurableObject } from "cloudflare:workers";

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace;
  TURN_API_TOKEN?: string;
  TURN_APP_ID?: string;
}

// Durable Object handling WebSockets via the Hibernating API
export class SignalingRoom extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    
    // Accept and register the WebSocket for hibernation
    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Broadcast signaling message to all other connected websockets
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      if (socket !== ws) {
        try {
          socket.send(message);
        } catch (e) {
          // Ignore failed sends
        }
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Automatically unregistered by the runtime
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    // Automatically handled
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Provide Cloudflare Realtime TURN credentials
    if (url.pathname === '/turn') {
        if (!env.TURN_API_TOKEN || !env.TURN_APP_ID) {
            return new Response("TURN not configured", { status: 501 });
        }
        try {
            // Create short-lived TURN credentials
            const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_APP_ID}/credentials`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.TURN_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ttl: 86400 })
            });
            const turnData = await response.json();
            return new Response(JSON.stringify(turnData), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        } catch (e) {
            return new Response("Error fetching TURN credentials", { status: 500 });
        }
    }

    // Connect to the single signaling room Durable Object
    const id = env.SIGNALING_ROOM.idFromName("laplink-global-room");
    const obj = env.SIGNALING_ROOM.get(id);
    
    return obj.fetch(request);
  },
};

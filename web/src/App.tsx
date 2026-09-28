import { useState, useEffect, useRef } from 'react';
import './index.css';

function App() {
  const [status, setStatus] = useState<string>('Disconnected');
  const [decodeStatus, setDecodeStatus] = useState<string>('Waiting for stream...');
  const [frames, setFrames] = useState<number>(0);
  const [bytesReceived, setBytesReceived] = useState<number>(0);
  const [pin] = useState<string>('shreyas');
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [showStats, setShowStats] = useState<boolean>(true);
  const videoRef = useRef<HTMLCanvasElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);
  const lastMouseMoveTime = useRef<number>(0);
  
  useEffect(() => {
    if (!isConnecting || !pin) return;
    
    let ws: WebSocket;
    let pc: RTCPeerConnection;
    let videoDecoder: VideoDecoder | null = null;
    let isDecoderConfigured = false;
    let seenKeyFrame = false;
    let spsNalu: Uint8Array | null = null;
    let ppsNalu: Uint8Array | null = null;
    let decodedFrames = 0;
    let totalBytes = 0;
    
    // Update UI every 500ms to prevent React re-render thrashing
    const statsInterval = setInterval(() => {
       setFrames(decodedFrames);
       setBytesReceived(totalBytes);
    }, 500);
    
    const initDecoder = () => {
       if (!videoRef.current) return;
       const ctx = videoRef.current.getContext('2d', { alpha: false }); // alpha: false for better perf
       
       videoDecoder = new VideoDecoder({
         output: (frame) => {
           decodedFrames++;
           setDecodeStatus('Decoding OK');
           if (ctx && videoRef.current) {
               if (videoRef.current.width !== frame.displayWidth) {
                   videoRef.current.width = frame.displayWidth;
               }
               if (videoRef.current.height !== frame.displayHeight) {
                   videoRef.current.height = frame.displayHeight;
               }
               ctx.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
           }
           frame.close();
         },
         error: (e) => {
           console.error("VideoDecoder error:", e);
           setDecodeStatus(`Error: ${e.message}`);
         }
       });
       // Configure is delayed until we get SPS/PPS
    };
    
    const init = async () => {
      await initDecoder();
      ws = new WebSocket("wss://laplink-worker.shreyasadiga82.workers.dev");
      
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { 
             urls: "turn:openrelay.metered.ca:80",
             username: "openrelayproject",
             credential: "openrelayproject"
          }
        ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            target: pin,
            from: "client1",
            payload: { 
               type: "candidate", 
               sdpMid: event.candidate.sdpMid, 
               sdpMLineIndex: event.candidate.sdpMLineIndex, 
               candidate: event.candidate.candidate 
            }
          }));
        }
      };

      pc.onconnectionstatechange = () => {
         console.log("Connection state:", pc.connectionState);
         if (pc.connectionState === 'connected') {
            setStatus('WebRTC Connected');
         } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setStatus('WebRTC Disconnected');
         }
      };
      
      const videoChannel = pc.createDataChannel("video", {
         ordered: false,
         maxRetransmits: 0 // UDP-like unreliable
      });
      
      videoChannel.binaryType = 'arraybuffer';
      let naluBuffer = new Uint8Array(0);

      videoChannel.onmessage = (event) => {
         const chunk = new Uint8Array(event.data);
         totalBytes += chunk.length;
         const newBuffer = new Uint8Array(naluBuffer.length + chunk.length);
         newBuffer.set(naluBuffer);
         newBuffer.set(chunk, naluBuffer.length);
         naluBuffer = newBuffer;

         let i = 0;
         while (i < naluBuffer.length - 2) {
            if (naluBuffer[i] === 0 && naluBuffer[i+1] === 0 && naluBuffer[i+2] === 1) {
               let startIdx = (i > 0 && naluBuffer[i-1] === 0) ? i - 1 : i;
               
               let nextStart = -1;
               for (let j = i + 3; j < naluBuffer.length - 2; j++) {
                  if (naluBuffer[j] === 0 && naluBuffer[j+1] === 0 && naluBuffer[j+2] === 1) {
                     nextStart = (naluBuffer[j-1] === 0) ? j - 1 : j;
                     break;
                  }
               }
               
               if (nextStart !== -1) {
                  const nalu = naluBuffer.slice(startIdx, nextStart);
                  
                  // Extract the actual NAL unit payload (remove start code)
                  const headerIdx = (nalu[2] === 1) ? 3 : 4;
                  const payload = nalu.slice(headerIdx);
                  const nalType = payload[0] & 0x1F;
                  
                  if (nalType === 7) spsNalu = payload;
                  if (nalType === 8) ppsNalu = payload;
                  
                  if ((nalType === 5 || nalType === 1) && videoDecoder) {
                     if (nalType === 5) seenKeyFrame = true;
                     
                     if (seenKeyFrame && !isDecoderConfigured && spsNalu && ppsNalu) {
                        const extradata = new Uint8Array(11 + spsNalu.length + ppsNalu.length);
                        extradata[0] = 1;
                        extradata[1] = spsNalu[1];
                        extradata[2] = spsNalu[2];
                        extradata[3] = spsNalu[3];
                        extradata[4] = 0xFF;
                        extradata[5] = 0xE1;
                        extradata[6] = (spsNalu.length >> 8) & 0xFF;
                        extradata[7] = spsNalu.length & 0xFF;
                        extradata.set(spsNalu, 8);
                        let offset = 8 + spsNalu.length;
                        extradata[offset] = 1;
                        extradata[offset+1] = (ppsNalu.length >> 8) & 0xFF;
                        extradata[offset+2] = ppsNalu.length & 0xFF;
                        extradata.set(ppsNalu, offset + 3);
                        
                        const profileStr = spsNalu[1].toString(16).padStart(2,'0') + spsNalu[2].toString(16).padStart(2,'0') + spsNalu[3].toString(16).padStart(2,'0');
                        
                        try {
                           videoDecoder.configure({
                              codec: 'avc1.' + profileStr,
                              description: extradata,
                              hardwareAcceleration: 'no-preference'
                           });
                           isDecoderConfigured = true;
                           setDecodeStatus('Decoder Configured AVCC');
                        } catch (e: any) {
                           console.error(e);
                           setDecodeStatus('Config Error: ' + e.message);
                        }
                     }
                     
                     if (isDecoderConfigured && seenKeyFrame) {
                        // Create AVCC chunk: 4-byte length + payload
                        const avccChunk = new Uint8Array(4 + payload.length);
                        avccChunk[0] = (payload.length >> 24) & 0xFF;
                        avccChunk[1] = (payload.length >> 16) & 0xFF;
                        avccChunk[2] = (payload.length >> 8) & 0xFF;
                        avccChunk[3] = payload.length & 0xFF;
                        avccChunk.set(payload, 4);
                        
                        try {
                           videoDecoder.decode(new EncodedVideoChunk({
                              type: nalType === 5 ? 'key' : 'delta',
                              timestamp: performance.now() * 1000,
                              data: avccChunk
                           }));
                        } catch(e: any) {
                           console.error(e);
                           setDecodeStatus(`Decode Error: ${e.message}`);
                        }
                     }
                  }
                  
                  naluBuffer = naluBuffer.slice(nextStart);
                  i = 0;
               } else {
                  break;
               }
            } else {
               i++;
            }
         }
      };

      const controlChannel = pc.createDataChannel("control");
      controlChannel.onopen = () => console.log("Control channel opened!");
      controlChannelRef.current = controlChannel;
      controlChannel.onmessage = (e) => console.log("Control message:", e.data);
      
      ws.onopen = async () => {
        setStatus('Signaling...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({
          target: pin,
          from: "client1",
          payload: { type: offer.type, sdp: offer.sdp }
        }));
      };
      
      ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          
          if (msg.type === "register" && msg.device === pin) {
             console.log("Agent came online! Sending offer...");
             const offer = await pc.createOffer();
             await pc.setLocalDescription(offer);
             ws.send(JSON.stringify({
               target: pin,
               from: "client1",
               payload: { type: offer.type, sdp: offer.sdp }
             }));
          }
          
          if (msg.payload && msg.payload.type === "answer") {
             await pc.setRemoteDescription(msg.payload);
             setStatus('Signaling Answered...');
          } else if (msg.payload && msg.payload.type === "candidate") {
             await pc.addIceCandidate(new RTCIceCandidate({
                candidate: msg.payload.candidate,
                sdpMid: msg.payload.sdpMid,
                sdpMLineIndex: msg.payload.sdpMLineIndex
             }));
          }
        } catch (err: any) {
          console.error("Signaling error:", err);
          setStatus(`WS Msg Error: ${err.message || 'Check console'}`);
        }
      };
      ws.onerror = (e) => {
         console.error("WS Error:", e);
         setStatus("WS Error");
      };
      ws.onclose = () => {
         console.log("Signaling WS Closed.");
         if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
             setStatus("Signaling failed. Retrying...");
             setTimeout(() => {
               setIsConnecting(false);
               setTimeout(() => setIsConnecting(true), 500);
             }, 2000);
         }
      };
      
      pc.oniceconnectionstatechange = () => {
         if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
             setStatus("Stream Lost. Reconnecting...");
             setTimeout(() => {
               setIsConnecting(false);
               setTimeout(() => setIsConnecting(true), 500);
             }, 2000);
         }
      };
    };
    
    init().catch(err => {
      console.error("Initialization error:", err);
      setStatus(`Error: ${err.message || 'Check console'}`);
    });
    
    return () => {
      clearInterval(statsInterval);
      ws?.close();
      pc?.close();
      if (videoDecoder?.state !== 'closed') videoDecoder?.close();
    };
  }, [isConnecting]);

  if (!isConnecting) {
    return (
      <div className="flex flex-col h-screen w-screen bg-zinc-950 items-center justify-center text-white">
        <h1 className="text-4xl font-bold mb-8">LapLink <span className="text-blue-500">v5</span></h1>
        <div className="flex flex-col gap-4 bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl items-center">
          <p className="text-zinc-400 mb-4">Stream Disconnected</p>
          <button 
            onClick={() => setIsConnecting(true)}
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-medium transition-colors"
          >
            Reconnect to Laptop
          </button>
        </div>
      </div>
    );
  }

  const sendControl = (msg: any) => {
    if (controlChannelRef.current?.readyState === 'open') {
      controlChannelRef.current.send(JSON.stringify(msg));
    }
  };

  const getScaledCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = videoRef.current!.getBoundingClientRect();
    
    // We'll just send relative coordinates between 0.0 and 1.0
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 items-center justify-center relative touch-none">
      <div className="absolute top-4 left-4 z-50 px-3 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-sm font-medium flex items-center gap-2 text-white pointer-events-none">
        <div className={`w-2 h-2 rounded-full ${status.includes('Connected') ? 'bg-green-500' : 'bg-red-500'}`} />
        {status}
      </div>
      {showStats && (
        <div className="absolute top-16 left-4 z-50 px-4 py-3 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 flex flex-col gap-3 text-sm font-medium text-white shadow-xl">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400 text-xs uppercase tracking-wider font-bold">Stream Stats</span>
            <span>{decodeStatus} | {frames}fps | {(bytesReceived/1024/1024).toFixed(1)}MB</span>
          </div>
          <div className="h-[1px] w-full bg-zinc-800" />
          <div className="flex flex-col gap-2">
            <span className="text-zinc-400 text-xs uppercase tracking-wider font-bold">Quality</span>
            <div className="flex gap-2">
              {['1080p', '720p', '480p'].map(q => (
                <button
                  key={q}
                  onClick={() => sendControl({ type: 'quality', quality: q })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-blue-600 transition-colors text-xs font-semibold"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden input to trigger mobile keyboard */}
      <input 
        ref={hiddenInputRef}
        type="text" 
        className="absolute top-0 left-0 w-0 h-0 opacity-0"
        onKeyDown={(e) => {
          sendControl({ type: 'keydown', key: e.key });
          if (e.key === 'Backspace') {
             // Mobile backspace fix might be needed, but this works for basic
             e.preventDefault();
          }
        }}
        onKeyUp={(e) => {
          sendControl({ type: 'keyup', key: e.key });
          // Clear input so it doesn't build up a massive string
          e.currentTarget.value = '';
        }}
      />
      
      <canvas 
        ref={videoRef} 
        className="w-full h-full object-contain bg-black touch-none select-none" 
        width={1920} height={1080} 
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          sendControl({ type: 'mousedown', button: e.button });
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          sendControl({ type: 'mouseup', button: e.button });
        }}
        onPointerMove={(e) => {
          const now = Date.now();
          if (now - lastMouseMoveTime.current > 16) { // ~60fps throttle
            const { x, y } = getScaledCoords(e);
            sendControl({ type: 'mousemove', x, y });
            lastMouseMoveTime.current = now;
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      />

      <div className="absolute bottom-4 z-50 flex gap-2 px-4 py-2 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800">
         <button 
            className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-white text-xl"
            onClick={() => hiddenInputRef.current?.focus()}
            title="Open Keyboard"
         >
            ⌨️
         </button>
         <button 
            className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-white text-xl"
            onClick={() => sendControl({ type: 'mousedown', button: 0 })}
            title="Left Click"
         >
            🖱️
         </button>
         <button 
            className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-white text-xl"
            onClick={() => sendControl({ type: 'refresh' })}
            title="Refresh Stream"
         >
            🔄
         </button>
         <button 
            className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-white text-xl"
            onClick={() => setShowStats(!showStats)}
            title="Toggle Stats"
         >
            ⚙️
         </button>
         <button 
            className="p-3 hover:bg-red-500/30 rounded-xl transition-colors text-white text-xl"
            onClick={() => {
              setIsConnecting(false);
              setStatus('');
              setDecodeStatus('');
            }}
            title="Disconnect / Reconnect"
         >
            🔌
         </button>
      </div>
    </div>
  );
}

export default App;

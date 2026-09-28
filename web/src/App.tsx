import { useState, useEffect, useRef } from 'react';
import './index.css';

function App() {
  const [status, setStatus] = useState<string>('Disconnected');
  const [decodeStatus, setDecodeStatus] = useState<string>('Waiting for stream...');
  const [frames, setFrames] = useState<number>(0);
  const [bytesReceived, setBytesReceived] = useState<number>(0);
  const videoRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
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
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            target: "laptop",
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
                              hardwareAcceleration: 'prefer-hardware'
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
      controlChannel.onmessage = (e) => console.log("Control message:", e.data);
      
      ws.onopen = async () => {
        setStatus('Signaling...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({
          target: "laptop",
          from: "client1",
          payload: { type: offer.type, sdp: offer.sdp }
        }));
      };
      
      ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          
          if (msg.type === "register" && msg.device === "laptop") {
             console.log("Agent came online! Sending offer...");
             const offer = await pc.createOffer();
             await pc.setLocalDescription(offer);
             ws.send(JSON.stringify({
               target: "laptop",
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
      ws.onclose = () => setStatus("WS Closed");
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
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 items-center justify-center relative">
      <div className="absolute top-4 left-4 z-50 px-3 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-sm font-medium flex items-center gap-2 text-white">
        <div className={`w-2 h-2 rounded-full ${status.includes('Connected') ? 'bg-green-500' : 'bg-red-500'}`} />
        {status}
      </div>
      <div className="absolute top-16 left-4 z-50 px-3 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-sm font-medium text-white">
        {decodeStatus} | Frames: {frames} | Bytes: {bytesReceived}
      </div>
      
      <canvas ref={videoRef} className="w-full h-full object-contain bg-black" width={1920} height={1080} />

      <div className="absolute bottom-4 z-50 flex gap-2 px-4 py-2 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800">
         <button className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-white text-xl">
            ⌨️
         </button>
         <button className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-white text-xl">
            🖱️
         </button>
         <button className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-white text-xl">
            ⚙️
         </button>
      </div>
    </div>
  );
}

export default App;

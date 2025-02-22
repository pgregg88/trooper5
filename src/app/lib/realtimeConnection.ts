import { RefObject } from "react";
import { SimpleAudioProcessor } from "./audioEffects";

// Create a single processor instance
const audioProcessor = new SimpleAudioProcessor();

export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel; toggleAudioProcessing: () => Promise<boolean> }> {
  // Check if we're in a secure context
  if (!window.isSecureContext) {
    throw new Error(
      "Voice features require a secure connection. You can access this application via:\n1. http://localhost:3000 (for local development)\n2. https://[your-ip]:3443 (for network access)\n\nNote: Accessing via IP on port 3000 will automatically redirect to HTTPS."
    );
  }

  // Check if mediaDevices is available
  if (!navigator.mediaDevices) {
    throw new Error(
      "Voice features are not available. This could be because:\n1. You're not using a secure connection\n2. Your browser doesn't support required features\n\nTry accessing via:\n- http://localhost:3000 (for local development)\n- https://[your-ip]:3443 (for network access)"
    );
  }

  const pc = new RTCPeerConnection();

  pc.ontrack = async (e) => {
    if (audioElement.current) {
      try {
        // Try to connect through audio processor
        await audioProcessor.connectStream(e.streams[0], audioElement as RefObject<HTMLAudioElement>);
      } catch (processingError) {
        console.error('Failed to initialize audio processing:', processingError);
        // Fallback to direct connection
        audioElement.current.srcObject = e.streams[0];
      }
    }
  };

  try {
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);
  } catch (error) {
    throw new Error(
      "Unable to access your microphone. This could be because:\n1. You haven't granted microphone permissions\n2. You're not using a secure connection\n\nTry accessing via:\n- http://localhost:3000 (for local development)\n- https://[your-ip]:3443 (for network access)"
    );
  }

  const dc = pc.createDataChannel("oai-events");

  dc.addEventListener("message", async (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    // Handle audio buffer events
    if (audioProcessor.isActive()) {
      if (data.type === "output_audio_buffer.started") {
        await audioProcessor.playMicClick(true);
      } else if (data.type === "output_audio_buffer.stopped") {
        await audioProcessor.playMicClick(false);
        await audioProcessor.playStaticEffect();
      }
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const baseUrl = "https://api.openai.com/v1/realtime";
  const model = "gpt-4o-realtime-preview-2024-12-17";

  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${EPHEMERAL_KEY}`,
      "Content-Type": "application/sdp",
    },
  });

  const answerSdp = await sdpResponse.text();
  const answer: RTCSessionDescriptionInit = {
    type: "answer",
    sdp: answerSdp,
  };

  await pc.setRemoteDescription(answer);

  // Return connection objects and toggle function
  return { 
    pc, 
    dc,
    toggleAudioProcessing: () => audioProcessor.toggle()
  };
} 
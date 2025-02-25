import { RefObject } from "react";
import { SimpleAudioProcessor } from "./audioEffects";

// Create a single processor instance
const audioProcessor = new SimpleAudioProcessor();

export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>,
  isAudioProcessingEnabled: boolean = true
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel; toggleAudioProcessing: () => Promise<boolean>; resetAudioProcessor: () => Promise<void> }> {
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

  // Initialize audio processor state
  await audioProcessor.disconnect(); // Ensure clean initial state
  
  const pc = new RTCPeerConnection();

  // Handle incoming audio from API
  pc.ontrack = async (e) => {
    if (audioElement.current) {
      try {
        // Process audio based on current state
        if (isAudioProcessingEnabled) {
          console.log('Initializing with audio processing enabled');
          await audioProcessor.processOutputAudio(e.streams[0], audioElement as RefObject<HTMLAudioElement>);
        } else {
          console.log('Initializing with direct audio');
          audioElement.current.srcObject = e.streams[0];
        }
      } catch (processingError) {
        console.error('Failed to initialize audio processing:', processingError);
        // Fallback to direct connection
        audioElement.current.srcObject = e.streams[0];
      }
    }
  };

  // Set up microphone input - using browser defaults
  try {
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]); // Direct microphone connection
  } catch (error) {
    console.error('Microphone access error:', error);
    throw new Error(
      "Unable to access your microphone. This could be because:\n1. You haven't granted microphone permissions\n2. You're not using a secure connection\n\nTry accessing via:\n- http://localhost:3000 (for local development)\n- https://[your-ip]:3443 (for network access)"
    );
  }

  const dc = pc.createDataChannel("oai-events");

  // Add message handler for audio effects
  dc.addEventListener("message", async (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      
      // Handle audio buffer events for sound effects
      if (audioProcessor.isActive()) {
        if (data.type === "output_audio_buffer.started") {
          // Add a small delay before playing the first audio
          if (!audioProcessor.hasPlayedFirstAudio) {
            await new Promise(resolve => setTimeout(resolve, 500));
            audioProcessor.hasPlayedFirstAudio = true;
          }
          await audioProcessor.playMicClick(true);
        } else if (data.type === "output_audio_buffer.stopped") {
          await audioProcessor.playMicClick(false);
          await audioProcessor.playStaticEffect();
        }
      }

      // Handle mode changes
      if (data.type === "mode_change") {
        // Reset audio processor state
        await audioProcessor.disconnect();
        await new Promise(resolve => setTimeout(resolve, 100));
        if (audioProcessor.isActive()) {
          // Get current receiver stream
          const currentStream = pc.getReceivers()[0]?.track ? 
            new MediaStream([pc.getReceivers()[0].track]) : 
            null;
          
          if (currentStream && audioElement.current) {
            await audioProcessor.processOutputAudio(currentStream, audioElement as RefObject<HTMLAudioElement>);
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
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

  // Return connection objects and audio functions
  return { 
    pc, 
    dc,
    toggleAudioProcessing: async () => {
      try {
        // Get current receiver stream
        let currentStream: MediaStream | null = null;
        if (pc.getReceivers().length > 0) {
          const track = pc.getReceivers()[0].track;
          if (track) {
            currentStream = new MediaStream([track]);
          }
        }

        if (!currentStream) {
          console.warn('No audio stream available for processing');
          return audioProcessor.isActive();
        }

        // Toggle the processor state
        const isEnabled = !audioProcessor.isActive(); // Pre-calculate target state
        
        if (isEnabled) {
          // Enabling processing
          console.log('Enabling audio processing');
          await audioProcessor.processOutputAudio(currentStream, audioElement as RefObject<HTMLAudioElement>);
        } else {
          // Disabling processing
          console.log('Disabling audio processing');
          await audioProcessor.disconnect();
          if (audioElement.current) {
            audioElement.current.srcObject = currentStream;
          }
        }

        return audioProcessor.isActive();
      } catch (error) {
        console.error('Error in toggleAudioProcessing:', error);
        return audioProcessor.isActive();
      }
    },
    resetAudioProcessor: async () => {
      await audioProcessor.disconnect();
      if (pc.getReceivers().length > 0) {
        const track = pc.getReceivers()[0].track;
        if (track && audioElement.current) {
          audioElement.current.srcObject = new MediaStream([track]);
        }
      }
    }
  };
} 
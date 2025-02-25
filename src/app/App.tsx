"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";

// Types
import { AgentConfig, SessionStatus } from "./types";

// Context providers & hooks
import { useTranscript } from "./contexts/TranscriptContext";
import { useEvent } from "./contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "./agentConfigs";

function App() {
  const searchParams = useSearchParams();

  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);
  const [isAudioProcessingEnabled, setIsAudioProcessingEnabled] = useState<boolean>(true);
  const [vadThreshold, setVadThreshold] = useState<number>(0.5);
  const [toggleAudioProcessingFn, setToggleAudioProcessingFn] = useState<(() => Promise<boolean>) | null>(null);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [agentSpeechEndTime, setAgentSpeechEndTime] = useState<number>(0);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
    setIsAgentSpeaking,
    setAgentSpeechEndTime,
  });

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Agent: ${selectedAgentName}`,
        currentAgent
      );
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      console.log(
        `updatingSession, isPTTACtive=${isPTTActive} sessionStatus=${sessionStatus}`
      );
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const initializeAudioSystem = () => {
    if (!audioElementRef.current) {
      audioElementRef.current = document.createElement("audio");
      
      // Initialize audio context and gain node if not already initialized
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        
        // Create a short silent buffer for initialization
        const silentBuffer = audioContextRef.current.createBuffer(1, 1024, audioContextRef.current.sampleRate);
        const channelData = silentBuffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = 0;
        }
        
        // Set up audio graph
        const source = audioContextRef.current.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioContextRef.current.destination);
        
        // Start with low volume and ramp up
        gainNodeRef.current.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
        gainNodeRef.current.gain.linearRampToValueAtTime(1, audioContextRef.current.currentTime + 0.5);
        
        source.start();
      }
      
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;
    }
  };

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        setSessionStatus("DISCONNECTED");
        return;
      }

      // Initialize audio system first
      initializeAudioSystem();

      const { pc, dc, toggleAudioProcessing } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef,
        isAudioProcessingEnabled
      );
      pcRef.current = pc;
      dcRef.current = dc;
      setToggleAudioProcessingFn(() => toggleAudioProcessing);

      // Add event listeners before setting connection state
      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
        setSessionStatus("CONNECTED"); // Move here from createRealtimeConnection
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
        setSessionStatus("DISCONNECTED");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
        setSessionStatus("DISCONNECTED");
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        handleServerEventRef.current(JSON.parse(e.data));
      });

      setDataChannel(dc);
    } catch (err: any) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);

    logClientEvent({}, "disconnected");
  };

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    cancelAssistantSpeech();

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: userText.trim() }],
        },
      },
      "(send user text message)"
    );
    setUserText("");

    sendClientEvent({ type: "response.create" }, "trigger response");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    // Detect if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Only enable VAD if agent is not speaking and cooldown period has passed
    const cooldownPeriod = 1000; // 1 second cooldown after agent stops speaking
    const canEnableVAD = !isAgentSpeaking && (Date.now() - agentSpeechEndTime) > cooldownPeriod;

    // Adjust VAD settings based on device type and speaking state
    const turnDetection = isPTTActive || !canEnableVAD
      ? null
      : {
          type: "server_vad",
          threshold: isMobile ? vadThreshold * 0.5 : vadThreshold,
          prefix_padding_ms: isMobile ? 500 : 300,
          silence_duration_ms: isMobile ? 400 : 200,
          create_response: true,
        };

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "ash",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  const cancelAssistantSpeech = async () => {
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("can't cancel, no recent assistant message found");
      return;
    }
    if (mostRecentAssistantMessage.status === "DONE") {
      console.log("No truncation needed, message is DONE");
      return;
    }

    sendClientEvent({
      type: "conversation.item.truncate",
      item_id: mostRecentAssistantMessage?.itemId,
      content_index: 0,
      audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
    });
    sendClientEvent(
      { type: "response.cancel" },
      "(cancel due to user interruption)"
    );
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
      return;
    cancelAssistantSpeech();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
  };

  const handleTalkButtonUp = () => {
    if (
      sessionStatus !== "CONNECTED" ||
      dataChannel?.readyState !== "open" ||
      !isPTTUserSpeaking
    )
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    sendClientEvent({ type: "response.create" }, "trigger response PTT");
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };

  const handleSelectedAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
    setSelectedAgentName(newAgentName);
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  const onToggleAudioProcessing = async () => {
    if (toggleAudioProcessingFn) {
      try {
        const isEnabled = await toggleAudioProcessingFn();
        console.log('Audio processing toggled:', isEnabled);
        setIsAudioProcessingEnabled(isEnabled);
        
        // Save to localStorage
        localStorage.setItem(
          "audioProcessingEnabled",
          isEnabled.toString()
        );
      } catch (error) {
        console.error('Error toggling audio processing:', error);
      }
    }
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedVadThreshold = localStorage.getItem("vadThreshold");
    if (storedVadThreshold) {
      setVadThreshold(parseFloat(storedVadThreshold));
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
    const storedAudioProcessingEnabled = localStorage.getItem(
      "audioProcessingEnabled"
    );
    if (storedAudioProcessingEnabled) {
      setIsAudioProcessingEnabled(storedAudioProcessingEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    localStorage.setItem(
      "audioProcessingEnabled",
      isAudioProcessingEnabled.toString()
    );
  }, [isAudioProcessingEnabled]);

  useEffect(() => {
    localStorage.setItem("vadThreshold", vadThreshold.toString());
    if (sessionStatus === "CONNECTED" && !isPTTActive) {
      updateSession();
    }
  }, [vadThreshold]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        // Ensure audio context is running
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Set gain to normal level
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current?.currentTime || 0);
        }
        
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
        // Reduce gain to zero when disabled
        if (gainNodeRef.current && audioContextRef.current) {
          gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        }
      }
    }
  }, [isAudioPlaybackEnabled]);

  return (
    <div className="flex flex-col h-screen bg-black relative sw-scanline max-w-[100vw] overflow-x-hidden">
      <div className="sw-grid absolute inset-0 opacity-20 pointer-events-none"></div>
      <header className="flex items-center justify-center px-4 sm:px-6 py-4 bg-[#1A1A1A] border-b border-[#B87A3D] relative z-10">
        <div className="flex items-center gap-x-4">
          <Image
            src="/Imperial_Emblem.svg"
            alt="Imperial Emblem"
            width={32}
            height={32}
            className="invert opacity-80"
          />
          <h1 className="text-lg sm:text-xl font-bold text-[#A3FF47] sw-terminal uppercase tracking-wider glow-green">
            Imperial Intelligence Terminal
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col sm:flex-row overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6 relative z-10 bg-[#1A1A1A]/80">
        <div className={`flex-1 flex min-h-0 ${isEventsPaneExpanded ? 'sm:w-1/2' : 'w-full'} transition-all duration-200`}>
          <Transcript
            userText={userText}
            setUserText={setUserText}
            onSendMessage={handleSendTextMessage}
            canSend={
              sessionStatus === "CONNECTED" &&
              dcRef.current?.readyState === "open"
            }
          />
        </div>
        {isEventsPaneExpanded && (
          <div className="flex-1 min-h-[300px] sm:min-h-0 border border-[#B87A3D]/50">
            <Events
              isExpanded={true}
            />
          </div>
        )}
      </main>

      <style jsx global>{`
        .glow-green {
          text-shadow: 0 0 10px rgba(163, 255, 71, 0.5);
        }
        .sw-terminal {
          font-family: "Share Tech Mono", monospace;
        }
        .sw-scanline {
          background: linear-gradient(to bottom, rgba(255,255,255,0.03) 50%, transparent 50%);
          background-size: 100% 4px;
          background-repeat: repeat;
        }
        .sw-grid {
          background-image: 
            linear-gradient(to right, rgba(184, 122, 61, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(184, 122, 61, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>

      <div className="relative z-10 bg-[#1A1A1A] border-t border-[#B87A3D]">
        <BottomToolbar
          sessionStatus={sessionStatus}
          onToggleConnection={onToggleConnection}
          isPTTActive={isPTTActive}
          setIsPTTActive={setIsPTTActive}
          isPTTUserSpeaking={isPTTUserSpeaking}
          handleTalkButtonDown={handleTalkButtonDown}
          handleTalkButtonUp={handleTalkButtonUp}
          isEventsPaneExpanded={isEventsPaneExpanded}
          setIsEventsPaneExpanded={setIsEventsPaneExpanded}
          isAudioPlaybackEnabled={isAudioPlaybackEnabled}
          setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
          isAudioProcessingEnabled={isAudioProcessingEnabled}
          onToggleAudioProcessing={onToggleAudioProcessing}
          vadThreshold={vadThreshold}
          setVadThreshold={setVadThreshold}
          selectedAgentName={selectedAgentName}
          selectedAgentConfigSet={selectedAgentConfigSet}
          currentAgentConfig={searchParams.get("agentConfig") || defaultAgentSetKey}
          defaultAgentSetKey={defaultAgentSetKey}
          onAgentChange={handleAgentChange}
          onSelectedAgentChange={handleSelectedAgentChange}
          allAgentSets={allAgentSets}
        />
      </div>
    </div>
  );
}

export default App;

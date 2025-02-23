"use client";

import React from "react";
import { SessionStatus } from "../types";

export interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (active: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (expanded: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  isAudioProcessingEnabled: boolean;
  onToggleAudioProcessing: () => void;
  vadThreshold: number;
  setVadThreshold: (threshold: number) => void;
  selectedAgentName: string;
  selectedAgentConfigSet: any[] | null;
  currentAgentConfig: string;
  defaultAgentSetKey: string;
  onAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSelectedAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  allAgentSets: Record<string, any>;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  isAudioProcessingEnabled,
  onToggleAudioProcessing,
  vadThreshold,
  setVadThreshold,
  selectedAgentName,
  selectedAgentConfigSet,
  currentAgentConfig,
  defaultAgentSetKey,
  onAgentChange,
  onSelectedAgentChange,
  allAgentSets,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-[#A3FF47] text-base p-2 w-36 rounded-sm h-full border border-[#B87A3D] sw-terminal uppercase tracking-wider";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";

    if (isConnected) {
      return `bg-[#B87A3D]/20 hover:bg-[#B87A3D]/30 ${cursorClass} ${baseClasses}`;
    }
    return `bg-[#1A1A1A] hover:bg-[#B87A3D]/20 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#1A1A1A]">
      {/* Main Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={onToggleConnection}
          className={getConnectionButtonClasses()}
          disabled={isConnecting}
        >
          {getConnectionButtonLabel()}
        </button>

        <div className="flex flex-row items-center gap-2">
          <input
            id="push-to-talk"
            type="checkbox"
            checked={isPTTActive}
            onChange={e => setIsPTTActive(e.target.checked)}
            disabled={!isConnected}
            className="w-4 h-4 accent-[#A3FF47] bg-[#1A1A1A] border-[#B87A3D]"
          />
          <label htmlFor="push-to-talk" className="flex items-center cursor-pointer text-[#A3FF47] sw-terminal">
            Push to talk
          </label>
          <button
            onMouseDown={handleTalkButtonDown}
            onMouseUp={handleTalkButtonUp}
            onTouchStart={handleTalkButtonDown}
            onTouchEnd={handleTalkButtonUp}
            disabled={!isPTTActive}
            className={
              (isPTTUserSpeaking ? "bg-[#B87A3D]/50" : "bg-[#1A1A1A]") +
              " py-1 px-4 cursor-pointer rounded-sm text-[#A3FF47] border border-[#B87A3D] sw-terminal uppercase tracking-wider" +
              (!isPTTActive ? " opacity-50" : " hover:bg-[#B87A3D]/30")
            }
          >
            Talk
          </button>
        </div>

        <div className="flex flex-row items-center gap-2">
          <input
            id="audio-playback"
            type="checkbox"
            checked={isAudioPlaybackEnabled}
            onChange={e => setIsAudioPlaybackEnabled(e.target.checked)}
            disabled={!isConnected}
            className="w-4 h-4 accent-[#A3FF47] bg-[#1A1A1A] border-[#B87A3D]"
          />
          <label htmlFor="audio-playback" className="flex items-center cursor-pointer text-[#A3FF47] sw-terminal">
            Audio playback
          </label>
        </div>

        <div className="flex flex-row items-center gap-2">
          <input
            id="audio-processing"
            type="checkbox"
            checked={isAudioProcessingEnabled}
            onChange={onToggleAudioProcessing}
            disabled={!isConnected}
            className="w-4 h-4 accent-[#A3FF47] bg-[#1A1A1A] border-[#B87A3D]"
          />
          <label htmlFor="audio-processing" className="flex items-center cursor-pointer text-[#A3FF47] sw-terminal">
            Voice effect
          </label>
        </div>

        <div className="flex flex-row items-center gap-2">
          <input
            id="logs"
            type="checkbox"
            checked={isEventsPaneExpanded}
            onChange={e => setIsEventsPaneExpanded(e.target.checked)}
            className="w-4 h-4 accent-[#A3FF47] bg-[#1A1A1A] border-[#B87A3D]"
          />
          <label htmlFor="logs" className="flex items-center cursor-pointer text-[#A3FF47] sw-terminal">
            Logs
          </label>
        </div>

        {!isPTTActive && (
          <div className="flex items-center gap-x-2 sw-terminal">
            <label className="text-sm text-[#A3FF47] uppercase tracking-wider">Mic Sensitivity:</label>
            <div className="flex gap-x-1">
              {[0.1, 0.3, 0.6].map((value) => {
                const label = isMobile
                  ? value === 0.1 ? "VERY LOW" : value === 0.3 ? "LOW" : "MED"
                  : value === 0.1 ? "LOW" : value === 0.3 ? "MED" : "HIGH";
                
                return (
                  <button
                    key={value}
                    onClick={() => setVadThreshold(value)}
                    disabled={!isConnected}
                    className={`px-2 py-1 text-xs rounded-sm sw-terminal uppercase tracking-wider transition-all border ${
                      vadThreshold === value
                        ? "bg-[#B87A3D]/30 border-[#B87A3D] text-[#A3FF47]"
                        : "bg-[#1A1A1A] border-[#B87A3D]/50 text-[#A3FF47] hover:bg-[#B87A3D]/20"
                    } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => setIsPTTActive(!isPTTActive)}
          className={`px-3 py-2 text-sm rounded-sm sw-terminal uppercase tracking-wider border ${
            isPTTActive
              ? "bg-[#B87A3D]/30 border-[#B87A3D] text-[#A3FF47]"
              : "bg-[#1A1A1A] border-[#B87A3D]/50 text-[#A3FF47] hover:bg-[#B87A3D]/20"
          }`}
        >
          {isPTTActive ? "Push to Talk" : "Voice Activity"}
        </button>
      </div>

      {/* Agent Selection Controls */}
      <div className="pt-4 mt-4 border-t border-[#B87A3D]/50">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 px-4 sm:px-12 md:px-24 lg:px-32">
          <select
            value={currentAgentConfig || defaultAgentSetKey}
            onChange={onAgentChange}
            className="w-full px-4 py-2 rounded-sm border border-[#B87A3D] bg-[#1A1A1A] text-[#A3FF47] sw-terminal uppercase tracking-wider focus:outline-none focus:border-[#A3FF47]"
          >
            {Object.keys(allAgentSets).map((agentKey) => (
              <option key={agentKey} value={agentKey}>
                {agentKey}
              </option>
            ))}
          </select>
          <select
            value={selectedAgentName}
            onChange={onSelectedAgentChange}
            className="w-full px-4 py-2 rounded-sm border border-[#B87A3D] bg-[#1A1A1A] text-[#A3FF47] sw-terminal uppercase tracking-wider focus:outline-none focus:border-[#A3FF47]"
          >
            {selectedAgentConfigSet?.map(agent => (
              <option key={agent.name} value={agent.name}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default BottomToolbar;

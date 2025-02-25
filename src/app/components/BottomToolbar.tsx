"use client";

import React from "react";
import { SessionStatus, AgentConfig } from "../types";

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
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  currentAgentConfig: string;
  onAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSelectedAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  allAgentSets: Record<string, AgentConfig[]>;
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
  selectedAgentName,
  selectedAgentConfigSet,
  currentAgentConfig,
  onAgentChange,
  onSelectedAgentChange,
  allAgentSets
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

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
      {/* Agent Selection Controls */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center">
          <label className="flex items-center text-base gap-1 mr-2 font-medium text-[#A3FF47] sw-terminal">
            Scenario
          </label>
          <div className="relative inline-block">
            <select
              value={currentAgentConfig}
              onChange={onAgentChange}
              className="appearance-none border border-[#B87A3D] rounded-sm text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none bg-[#1A1A1A] text-[#A3FF47] sw-terminal"
            >
              {Object.keys(allAgentSets).map((agentKey) => (
                <option key={agentKey} value={agentKey}>
                  {agentKey}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentAgentConfig && (
          <div className="flex items-center">
            <label className="flex items-center text-base gap-1 mr-2 font-medium text-[#A3FF47] sw-terminal">
              Agent
            </label>
            <div className="relative inline-block">
              <select
                value={selectedAgentName}
                onChange={onSelectedAgentChange}
                className="appearance-none border border-[#B87A3D] rounded-sm text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none bg-[#1A1A1A] text-[#A3FF47] sw-terminal"
              >
                {selectedAgentConfigSet?.map(agent => (
                  <option key={agent.name} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}

export default BottomToolbar;

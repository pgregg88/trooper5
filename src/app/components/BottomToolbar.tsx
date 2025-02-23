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
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-imperial-white text-base p-2 w-36 rounded-full h-full";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";

    if (isConnected) {
      // Connected -> label "Disconnect" -> Imperial red
      return `bg-imperial-red hover:opacity-80 ${cursorClass} ${baseClasses}`;
    }
    // Disconnected or connecting -> label is either "Connect" or "Connecting" -> Imperial gray
    return `bg-imperial-gray hover:opacity-80 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className="p-4 flex flex-row items-center justify-center gap-x-8 border-t border-gray-200 dark:border-imperial-gray bg-white dark:bg-imperial-black">
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
          className="w-4 h-4 accent-imperial-red"
        />
        <label htmlFor="push-to-talk" className="flex items-center cursor-pointer dark:text-imperial-white">
          Push to talk
        </label>
        <button
          onMouseDown={handleTalkButtonDown}
          onMouseUp={handleTalkButtonUp}
          onTouchStart={handleTalkButtonDown}
          onTouchEnd={handleTalkButtonUp}
          disabled={!isPTTActive}
          className={
            (isPTTUserSpeaking ? "bg-imperial-red" : "bg-imperial-gray") +
            " py-1 px-4 cursor-pointer rounded-full text-imperial-white" +
            (!isPTTActive ? " opacity-50" : " hover:opacity-80")
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
          className="w-4 h-4 accent-imperial-red"
        />
        <label htmlFor="audio-playback" className="flex items-center cursor-pointer dark:text-imperial-white">
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
          className="w-4 h-4 accent-imperial-red"
        />
        <label htmlFor="audio-processing" className="flex items-center cursor-pointer dark:text-imperial-white">
          Voice effect
        </label>
      </div>

      <div className="flex flex-row items-center gap-2">
        <input
          id="logs"
          type="checkbox"
          checked={isEventsPaneExpanded}
          onChange={e => setIsEventsPaneExpanded(e.target.checked)}
          className="w-4 h-4 accent-imperial-red"
        />
        <label htmlFor="logs" className="flex items-center cursor-pointer dark:text-imperial-white">
          Logs
        </label>
      </div>

      {!isPTTActive && (
        <div className="flex items-center gap-x-2 sw-terminal">
          <label className="text-sm text-gray-700 dark:text-imperial-white uppercase tracking-wider">Mic Sensitivity:</label>
          <div className="flex gap-x-1">
            {[0.2, 0.5, 0.8].map((value) => (
              <button
                key={value}
                onClick={() => setVadThreshold(value)}
                disabled={!isConnected}
                className={`px-2 py-1 text-xs rounded-sm sw-terminal uppercase tracking-wider transition-all ${
                  vadThreshold === value
                    ? "bg-empire-gold text-black"
                    : "bg-imperial-gray text-imperial-white hover:opacity-80"
                } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {value === 0.2 ? "LOW" : value === 0.5 ? "MED" : "HIGH"}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsPTTActive(!isPTTActive)}
        className={`px-3 py-2 text-sm rounded-sm sw-terminal uppercase tracking-wider ${
          isPTTActive
            ? "bg-empire-gold text-black hover:opacity-80"
            : "bg-gray-200 dark:bg-imperial-gray text-gray-700 dark:text-imperial-white hover:bg-gray-300 dark:hover:opacity-80"
        }`}
      >
        {isPTTActive ? "Push to Talk" : "Voice Activity"}
      </button>
    </div>
  );
}

export default BottomToolbar;

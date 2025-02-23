"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "../contexts/EventContext";
import { LoggedEvent } from "../types";
import Image from "next/image";

export interface EventsProps {
  isExpanded: boolean;
}

function Events({ isExpanded }: EventsProps) {
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);

  const { loggedEvents, toggleExpand } = useEvent();

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded]);

  const [justCopied, setJustCopied] = useState(false);

  const handleCopyLogs = async () => {
    try {
      const logText = loggedEvents
        .map(log => `${log.timestamp} ${log.eventName}\n${log.eventData ? JSON.stringify(log.eventData, null, 2) : ''}`)
        .join('\n\n');
      await navigator.clipboard.writeText(logText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy logs:', error);
    }
  };

  return (
    <div className={`flex-1 flex flex-col bg-[#1A1A1A] min-h-0 relative sw-scanline h-full border border-[#B87A3D]/50`}>
      <div className="sw-grid absolute inset-0 opacity-20"></div>
      <div className="flex flex-col h-full relative">
        <div className="flex items-center justify-between p-4 border-b border-[#B87A3D]/50">
          <div className="flex items-center gap-x-2">
            <Image 
              src="/Imperial_Emblem.svg" 
              alt="Imperial Emblem" 
              width={20} 
              height={20} 
              className="invert opacity-80"
            />
            <h2 className="text-[#A3FF47] font-bold sw-terminal uppercase tracking-wider glow-green">System Logs</h2>
          </div>
          <button
            onClick={handleCopyLogs}
            className={`text-sm px-3 py-2 rounded-sm bg-[#1A1A1A] border border-[#B87A3D] hover:bg-[#B87A3D]/20 text-[#A3FF47] sw-terminal uppercase tracking-wider`}
          >
            {justCopied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div
          ref={eventLogsContainerRef}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-y-2"
        >
          {loggedEvents.map((log) => {
            const isError = log.eventName.toLowerCase().includes('error') || log.eventData?.response?.status_details?.error != null;
            const isWarning = log.eventName.toLowerCase().includes('warning');

            return (
              <div
                key={log.id}
                className="flex flex-col text-sm sw-terminal"
                onClick={() => toggleExpand(log.id.toString())}
              >
                <div className="flex items-center gap-x-2">
                  <span className={`font-mono text-xs ${
                    isError ? "text-red-500" : 
                    isWarning ? "text-[#FFD700]" : 
                    "text-[#B87A3D]"
                  } uppercase tracking-wider`}>
                    {log.timestamp}
                  </span>
                  <span className={`font-mono ${
                    isError ? "text-red-500" : 
                    isWarning ? "text-[#FFD700]" : 
                    "text-[#A3FF47]"
                  } uppercase tracking-wider`}>
                    {log.eventName}
                  </span>
                  {log.eventData && (
                    <span className="text-[#B87A3D] cursor-pointer hover:text-[#A3FF47]">
                      ▶
                    </span>
                  )}
                </div>
                {log.expanded && log.eventData && (
                  <div className="ml-4 mt-1">
                    <pre className="text-xs text-[#B87A3D] font-mono whitespace-pre-wrap">
                      {JSON.stringify(log.eventData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Events;

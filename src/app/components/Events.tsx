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
    <div className={`flex-1 flex flex-col bg-white dark:bg-imperial-black min-h-0 rounded-xl relative sw-scanline ${isExpanded ? 'w-1/2' : 'w-0 opacity-0'} transition-all duration-200`}>
      <div className="imperial-bg"></div>
      <div className="sw-grid absolute inset-0 opacity-10"></div>
      <div className="flex flex-col h-full relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-imperial-gray">
          <div className="flex items-center gap-x-2">
            <Image 
              src="/Imperial_Emblem.svg" 
              alt="Imperial Emblem" 
              width={20} 
              height={20} 
              className="invert"
            />
            <h2 className="text-gray-900 dark:text-imperial-white font-bold sw-terminal uppercase tracking-wider">System Logs</h2>
          </div>
          <button
            onClick={handleCopyLogs}
            className={`text-sm px-3 py-2 rounded-sm bg-gray-200 dark:bg-imperial-gray hover:bg-gray-300 dark:hover:opacity-80 sw-terminal uppercase tracking-wider`}
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
                    isError ? "text-imperial-red" : 
                    isWarning ? "text-empire-gold" : 
                    "text-gray-400 dark:text-imperial-gray"
                  } uppercase tracking-wider`}>
                    {log.timestamp}
                  </span>
                  <span className={`font-mono ${
                    isError ? "text-imperial-red" : 
                    isWarning ? "text-empire-gold" : 
                    "text-gray-800 dark:text-imperial-white"
                  } uppercase tracking-wider`}>
                    {log.eventName}
                  </span>
                  {log.eventData && (
                    <span className="text-gray-400 dark:text-imperial-gray cursor-pointer hover:text-empire-gold dark:hover:text-empire-gold">
                      ▶
                    </span>
                  )}
                </div>
                {log.expanded && log.eventData && (
                  <div className="ml-4 mt-1">
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs text-gray-600 dark:text-imperial-white border-l border-imperial-red pl-2">
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

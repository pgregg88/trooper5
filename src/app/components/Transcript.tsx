"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "../types";
import Image from "next/image";
import { useTranscript } from "../contexts/TranscriptContext";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-imperial-black min-h-0 rounded-xl relative sw-scanline">
      <div className="imperial-bg pointer-events-none"></div>
      <div className="sw-grid absolute inset-0 opacity-10 pointer-events-none"></div>
      <div className="relative flex-1 min-h-0 z-10">
        <button
          onClick={handleCopyTranscript}
          className={`absolute w-20 top-3 right-2 mr-1 z-20 text-sm px-3 py-2 rounded-sm bg-gray-200 dark:bg-imperial-gray hover:bg-gray-300 dark:hover:opacity-80 sw-terminal uppercase tracking-wider`}
        >
          {justCopied ? "Copied!" : "Copy"}
        </button>

        <div
          ref={transcriptRef}
          className="overflow-auto p-4 flex flex-col gap-y-4 h-full"
        >
          {transcriptItems.map((item) => {
            const { itemId, type, role, data, expanded, timestamp, title = "", isHidden } = item;

            if (isHidden) {
              return null;
            }

            if (type === "MESSAGE") {
              const isUser = role === "user";
              const baseContainer = "flex justify-end flex-col";
              const containerClasses = `${baseContainer} ${isUser ? "items-end" : "items-start"}`;
              const bubbleBase = `max-w-lg p-3 rounded-sm border ${
                isUser 
                  ? "bg-imperial-gray text-imperial-white border-imperial-gray" 
                  : "bg-imperial-red text-imperial-white border-imperial-red"
              } sw-terminal`;
              const isBracketedMessage = title.startsWith("[") && title.endsWith("]");
              const messageStyle = isBracketedMessage ? "italic text-gray-400 dark:text-empire-gold" : "";
              const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;

              return (
                <div key={itemId} className={containerClasses}>
                  <div className={bubbleBase}>
                    <div className={`text-xs ${isUser ? "text-gray-300" : "text-gray-300"} font-mono uppercase tracking-wider`}>
                      {timestamp}
                    </div>
                    <div className={`whitespace-pre-wrap ${messageStyle} leading-relaxed`}>
                      <ReactMarkdown>{displayTitle}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div
                  key={itemId}
                  className="flex flex-col justify-start items-start text-gray-500 text-sm sw-terminal"
                >
                  <span className="text-xs font-mono uppercase tracking-wider">{timestamp}</span>
                  <div
                    className={`whitespace-pre-wrap flex items-center font-mono text-sm text-gray-800 dark:text-imperial-white ${
                      data ? "cursor-pointer hover:text-empire-gold dark:hover:text-empire-gold" : ""
                    } uppercase tracking-wider`}
                    onClick={() => data && toggleTranscriptItemExpand(itemId)}
                  >
                    {data && (
                      <span
                        className={`text-imperial-red mr-1 transform transition-transform duration-200 select-none font-mono ${
                          expanded ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▶
                      </span>
                    )}
                    {title}
                  </div>
                  {expanded && data && (
                    <div className="text-gray-800 dark:text-imperial-white text-left">
                      <pre className="border-l border-imperial-red ml-1 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div
                  key={itemId}
                  className="flex justify-center text-gray-500 text-sm italic font-mono sw-terminal uppercase tracking-wider"
                >
                  Unknown item type: {type}{" "}
                  <span className="ml-2 text-xs">{timestamp}</span>
                </div>
              );
            }
          })}
        </div>
      </div>

      <div className="p-4 flex items-center gap-x-2 flex-shrink-0 border-t border-gray-200 dark:border-imperial-gray relative z-20">
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) {
              onSendMessage();
            }
          }}
          className="flex-1 px-4 py-2 focus:outline-none bg-white dark:bg-imperial-gray text-gray-900 dark:text-imperial-white rounded-sm border border-gray-200 dark:border-imperial-gray placeholder-gray-500 dark:placeholder-gray-300 sw-terminal uppercase tracking-wider"
          placeholder="ENTER MESSAGE..."
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="bg-imperial-red text-imperial-white rounded-sm p-2 disabled:opacity-50 hover:opacity-80 transition-opacity border border-imperial-red"
        >
          <Image 
            src="/Imperial_Emblem.svg" 
            alt="Send" 
            width={20} 
            height={20} 
            className="invert"
          />
        </button>
      </div>
    </div>
  );
}

export default Transcript;

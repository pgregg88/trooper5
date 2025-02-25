"use client";

import { useRef } from "react";
import { ServerEvent, SessionStatus, AgentConfig } from "../types";
import { useTranscript } from "../contexts/TranscriptContext";
import { useEvent } from "../contexts/EventContext";

export interface UseHandleServerEventParams {
  setSessionStatus: (status: SessionStatus) => void;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  setSelectedAgentName: (name: string) => void;
  setIsAgentSpeaking: (speaking: boolean) => void;
  setAgentSpeechEndTime: (time: number) => void;
  resetAudioProcessor?: () => Promise<void>;
}

export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
  setIsAgentSpeaking,
  setAgentSpeechEndTime,
  resetAudioProcessor
}: UseHandleServerEventParams) {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItemStatus,
  } = useTranscript();

  const { logServerEvent } = useEvent();

  const handleFunctionCall = async (functionCallParams: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    const args = JSON.parse(functionCallParams.arguments);
    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    if (!currentAgent) {
      console.error('No agent found for function call:', functionCallParams);
      return;
    }

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    // Handle agent transfers
    if (functionCallParams.name === "transferAgents") {
      const destinationAgent = args.destination_agent;
      const newAgentConfig =
        selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;
      if (newAgentConfig) {
        // Reset audio processor before changing agents
        if (resetAudioProcessor) {
          await resetAudioProcessor();
        }
        
        setSelectedAgentName(destinationAgent);
        addTranscriptBreadcrumb(
          `Mode Change`,
          {
            from: selectedAgentName,
            to: destinationAgent,
            reason: args.reason || "Mode transition triggered",
            timestamp: new Date().toISOString()
          }
        );

        // Send mode change event to trigger audio reset
        sendClientEvent({
          type: "mode_change",
          from: selectedAgentName,
          to: destinationAgent
        });

        // Create a new response to start the new agent
        setTimeout(() => {
          sendClientEvent({ type: "response.create" });
        }, 500);
      }
      const functionCallOutput = {
        destination_agent: destinationAgent,
        did_transfer: !!newAgentConfig,
      };
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(functionCallOutput),
        },
      });
      return;
    }

    try {
      // Use the agent's tool logic if available
      if (currentAgent.toolLogic?.[functionCallParams.name]) {
        const fn = currentAgent.toolLogic[functionCallParams.name];
        const result = await fn(args, transcriptItems);

        // Send the result
        sendClientEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: functionCallParams.call_id,
            output: JSON.stringify(result),
          },
        });

        // Create a new response
        sendClientEvent({ type: "response.create" });
      }
    } catch (error) {
      console.error('Function call error:', error);
      const errorResult = {
        error: true,
        reason: "Tool execution error",
        message: error instanceof Error ? error.message : "Unknown error",
        call_id: functionCallParams.call_id,
      };

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(errorResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    }
  };

  const handleServerEvent = (serverEvent: ServerEvent) => {
    logServerEvent(serverEvent);

    switch (serverEvent.type) {
      case "output_audio_buffer.started": {
        setIsAgentSpeaking(true);
        break;
      }

      case "output_audio_buffer.stopped": {
        setIsAgentSpeaking(false);
        setAgentSpeechEndTime(Date.now());
        break;
      }

      case "session.created": {
        if (serverEvent.session?.id) {
          setSessionStatus("CONNECTED");
          addTranscriptBreadcrumb(
            `session.id: ${
              serverEvent.session.id
            }\nStarted at: ${new Date().toLocaleString()}`
          );
        }
        break;
      }

      case "conversation.item.created": {
        let text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          "";
        const role = serverEvent.item?.role as "user" | "assistant";
        const itemId = serverEvent.item?.id;
        const messageAgent = serverEvent.item?.name;

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          break;
        }

        if (itemId && role) {
          if (role === "user" && !text) {
            text = "[Transcribing...]";
          }
          
          if (role === "assistant") {
            if (messageAgent && messageAgent !== selectedAgentName) {
              addTranscriptBreadcrumb(
                "Message Filtered",
                {
                  reason: "Message from different agent context",
                  from_agent: messageAgent,
                  current_agent: selectedAgentName,
                  filtered_text: text
                }
              );
              break;
            }
          }
          
          addTranscriptMessage(itemId, role, text);
        }
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        const itemId = serverEvent.item_id;
        const finalTranscript =
          !serverEvent.transcript || serverEvent.transcript === "\n"
            ? "[inaudible]"
            : serverEvent.transcript;
        
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
          // Let the server handle response creation
        }
        break;
      }

      case "response.audio_transcript.delta": {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || "";
        if (itemId) {
          updateTranscriptMessage(itemId, deltaText, true);
        }
        break;
      }

      case "response.output_item.done": {
        const itemId = serverEvent.item?.id;
        if (itemId) {
          updateTranscriptItemStatus(itemId, "DONE");
        }
        break;
      }

      case "response.done": {
        if (serverEvent.response?.output) {
          serverEvent.response.output.forEach((outputItem) => {
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              handleFunctionCall({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              });
            }
          });
        }
        break;
      }

      default:
        break;
    }
  };

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}

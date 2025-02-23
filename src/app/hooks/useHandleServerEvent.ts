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
  shouldForceResponse?: boolean;
}

export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
  setIsAgentSpeaking,
  setAgentSpeechEndTime,
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

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    if (currentAgent?.toolLogic?.[functionCallParams.name]) {
      const fn = currentAgent.toolLogic[functionCallParams.name];
      const fnResult = await fn(args, transcriptItems);
      
      if (functionCallParams.name === 'analyzeVoicePattern') {
        addTranscriptBreadcrumb(
          `Voice Analysis Results`,
          {
            type: args.analysisType,
            confidence: fnResult.confidenceScore,
            detectedPatterns: fnResult.detectedPhrases || fnResult.detectedIndicators,
            recommendation: fnResult.recommendation,
            exceedsThreshold: fnResult.exceedsThreshold
          }
        );

        // Chain to next appropriate function based on analysis type
        if (args.analysisType === 'imperial_verification' && !fnResult.exceedsThreshold) {
          handleFunctionCall({
            name: "verifyImperialCredentials",
            arguments: JSON.stringify({
              claimedRank: "Captain",
              clearanceCode: args.voiceSignature.match(/Code\s+([A-Z0-9-]+)/i)?.[1] || "",
              voiceSignature: args.voiceSignature
            })
          });
          return; // Let the chain continue
        }
      } else if (functionCallParams.name === 'verifyImperialCredentials') {
        addTranscriptBreadcrumb(
          `Imperial Verification Results`,
          {
            verified: fnResult.verified,
            level: fnResult.authorityLevel,
            reason: fnResult.reason
          }
        );
        
        // After verification completes, always trigger a response
        sendClientEvent({ type: "response.create" });
        return;
      } else if (functionCallParams.name === 'logCurrentState') {
        addTranscriptBreadcrumb(
          `State Transition`,
          {
            state: fnResult.state,
            description: fnResult.data?.description,
            reason: fnResult.data?.instructions?.[0],
            timestamp: new Date().toISOString()
          }
        );

        // After state transition, trigger appropriate next steps
        if (fnResult.state === '3_imperial_check') {
          handleFunctionCall({
            name: "analyzeVoicePattern",
            arguments: JSON.stringify({
              voiceSignature: transcriptItems[transcriptItems.length - 1]?.data?.text || "",
              analysisType: "imperial_verification"
            })
          });
          return;
        }
      } else {
        addTranscriptBreadcrumb(
          `${functionCallParams.name} Results`,
          fnResult
        );
      }

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(fnResult),
        },
      });
      
      // Only trigger response if this is the end of a chain
      if (fnResult?.needsResponse !== false) {
        sendClientEvent({ type: "response.create" });
      }
    } else if (functionCallParams.name === "transferAgents") {
      const destinationAgent = args.destination_agent;
      const newAgentConfig =
        selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;
      if (newAgentConfig) {
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
      addTranscriptBreadcrumb(
        `function call: ${functionCallParams.name} response`,
        functionCallOutput
      );
    } else {
      const simulatedResult = { result: true };
      addTranscriptBreadcrumb(
        `function call fallback: ${functionCallParams.name}`,
        simulatedResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(simulatedResult),
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
        
        // Track suspicion for unclear or evasive responses
        if (finalTranscript === "[inaudible]") {
          handleFunctionCall({
            name: "trackSuspicionLevel",
            arguments: JSON.stringify({
              interactionType: "hesitation",
              intensity: "0.6"
            })
          });
        } else if (finalTranscript.toLowerCase().includes("uh") || 
                   finalTranscript.toLowerCase().includes("um") ||
                   finalTranscript.split(" ").length < 3) {
          handleFunctionCall({
            name: "trackSuspicionLevel",
            arguments: JSON.stringify({
              interactionType: "hesitation",
              intensity: "0.4"
            })
          });
        }
        
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
          // Only trigger a new response when we get actual user input
          sendClientEvent({ type: "response.create" });
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

      case "response.done": {
        if (serverEvent.response?.output) {
          addTranscriptBreadcrumb(
            "Response Processing",
            {
              timestamp: new Date().toISOString(),
              agent: selectedAgentName,
              hasOutput: !!serverEvent.response.output.length
            }
          );

          // Process explicit function calls from the response first
          const functionCalls = serverEvent.response.output
            .filter(outputItem => 
              outputItem.type === "function_call" && 
              outputItem.name && 
              outputItem.arguments
            );

          if (functionCalls.length > 0) {
            // Only process the first function call, let the chain handle the rest
            const firstCall = functionCalls[0];
            if (firstCall.name) {
              addTranscriptBreadcrumb(
                "Function Call Detected",
                {
                  name: firstCall.name,
                  timestamp: new Date().toISOString()
                }
              );
              
              handleFunctionCall({
                name: firstCall.name,
                call_id: firstCall.call_id,
                arguments: firstCall.arguments || "{}"
              });
            }
            break; // Exit early to let the chain complete
          }

          // Only check for automatic state transitions if no explicit function calls
          const responseText = serverEvent.item?.content?.[0]?.text || "";
          const currentState = transcriptItems
            .filter(item => item.type === "BREADCRUMB" && item.title === "State Transition")
            .pop()?.data?.state || "1_initial_contact";

          // Handle state-based function calls sequentially
          const hasImperialClaim = responseText.toLowerCase().includes("captain") || 
                                 responseText.toLowerCase().includes("imperial") ||
                                 responseText.toLowerCase().includes("code");
                                 
          if (hasImperialClaim && currentState !== "3_imperial_check") {
            // Start with state transition
            handleFunctionCall({
              name: "logCurrentState",
              arguments: JSON.stringify({
                state_id: "3_imperial_check",
                state_data: {
                  description: "Imperial credentials claimed - initiating verification",
                  instructions: ["Verify rank and clearance code", "Check voice patterns"]
                }
              })
            });
            break; // Let the chain continue with voice analysis and verification
          } else if (responseText.toLowerCase().includes("suspicious") && currentState !== "7_high_suspicion") {
            handleFunctionCall({
              name: "logCurrentState",
              arguments: JSON.stringify({
                state_id: "7_high_suspicion",
                state_data: {
                  description: "Transition to high suspicion due to suspicious behavior",
                  reason: "Suspicious behavior detected in response"
                }
              })
            });
            break;
          } else if (responseText.toLowerCase().includes("move along") && currentState !== "8_civilian_dismissal") {
            handleFunctionCall({
              name: "logCurrentState",
              arguments: JSON.stringify({
                state_id: "8_civilian_dismissal",
                state_data: {
                  description: "Transition to civilian dismissal",
                  reason: "Issuing move along command"
                }
              })
            });
            break;
          }

          // Do NOT automatically trigger new responses
          // Let the agent or user interaction drive the conversation
        } else {
          addTranscriptBreadcrumb(
            "Response Without Output",
            {
              timestamp: new Date().toISOString(),
              agent: selectedAgentName
            }
          );
          // Do NOT automatically trigger new responses here either
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

      default:
        break;
    }
  };

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}

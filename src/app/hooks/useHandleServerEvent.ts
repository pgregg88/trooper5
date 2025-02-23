"use client";

import { useRef } from "react";
import { ServerEvent, SessionStatus, AgentConfig } from "../types";
import { useTranscript } from "../contexts/TranscriptContext";
import { useEvent } from "../contexts/EventContext";
import { imperialVerificationLogic, VerificationResult, VERIFICATION_STATES } from "../agentConfigs/stormtrooper/tools/imperialVerification";

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

interface ResponseEvent {
  response?: {
    id?: string;
    output?: Array<{
      type?: string;
      name?: string;
      arguments?: any;
      call_id?: string;
    }>;
    status_details?: {
      error?: any;
    };
  };
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
  
  // Add response management state
  const activeResponseRef = useRef<string | null>(null);
  const lastAudioTimestampRef = useRef<number>(0);
  const audioBufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Increased buffer to allow for natural speech patterns and thought collection
  const HESITATION_BUFFER_MS = 4000; // 4 second buffer for natural pauses
  const RESPONSE_TIMEOUT_MS = 10000; // 10 second max response time

  const clearAudioBuffer = () => {
    if (audioBufferTimeoutRef.current) {
      clearTimeout(audioBufferTimeoutRef.current);
      audioBufferTimeoutRef.current = null;
    }
  };

  const waitForHesitation = async (): Promise<void> => {
    return new Promise((resolve) => {
      clearAudioBuffer();
      audioBufferTimeoutRef.current = setTimeout(() => {
        const timeSinceLastAudio = Date.now() - lastAudioTimestampRef.current;
        if (timeSinceLastAudio >= HESITATION_BUFFER_MS) {
          resolve();
        }
      }, HESITATION_BUFFER_MS);
    });
  };

  const handleResponseTimeout = (responseId: string) => {
    setTimeout(() => {
      if (activeResponseRef.current === responseId) {
        addTranscriptBreadcrumb('Response Timeout', {
          responseId,
          duration: RESPONSE_TIMEOUT_MS,
          timestamp: new Date().toISOString()
        });
        activeResponseRef.current = null;
      }
    }, RESPONSE_TIMEOUT_MS);
  };

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

    if (functionCallParams.name === 'verifyImperialCredentials') {
      const call_id = functionCallParams.call_id || `verify_${Date.now()}`;
      
      try {
        // Check if we already have an active verification
        if (activeResponseRef.current) {
          addTranscriptBreadcrumb('Verification Blocked', {
            reason: 'Verification already in progress',
            blockedCallId: call_id,
            activeResponseId: activeResponseRef.current,
            timestamp: new Date().toISOString()
          });
          return { needsResponse: false };
        }

        const result = await imperialVerificationLogic({
          ...args,
          item_call_id: call_id
        });

        addTranscriptBreadcrumb(
          `Imperial Verification Result`,
          {
            verified: result.verified,
            state: result.verificationState,
            reason: result.reason,
            timestamp: new Date().toISOString()
          }
        );

        // Send verification result
        sendClientEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id,
            output: JSON.stringify(result),
          },
        });

        // Create response only if verification completed or failed
        if (result.verificationState === VERIFICATION_STATES.COMPLETE || 
            result.verificationState === VERIFICATION_STATES.FAILED) {
          sendClientEvent({ type: "response.create" });
        }

        return { needsResponse: false };
      } catch (error) {
        console.error('Verification error:', error);
        const errorResult: VerificationResult = {
          verified: false,
          authorityLevel: 0,
          reason: "Verification system error",
          verificationState: VERIFICATION_STATES.FAILED,
          challengeQuestion: null,
          statusUpdate: "Imperial HQ communication disrupted",
          recommendations: ["System error", "Report to command"],
          item_call_id: call_id,
          event_id: call_id
        };

        sendClientEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id,
            output: JSON.stringify(errorResult),
          },
        });
        sendClientEvent({ type: "response.create" });
        return { needsResponse: false };
      }
    } else if (currentAgent?.toolLogic?.[functionCallParams.name]) {
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

        // Return results without triggering verification
        if (args.analysisType === 'imperial_verification') {
          const voiceVerificationResult = {
            type: "voice_verification",
            call_id: functionCallParams.call_id,
            output: JSON.stringify({
              voicePatternMatch: !fnResult.exceedsThreshold,
              confidenceScore: fnResult.confidenceScore,
              recommendation: fnResult.recommendation
            })
          };

          sendClientEvent({
            type: "conversation.item.create",
            item: voiceVerificationResult
          });

          // Only proceed if voice patterns are acceptable
          if (!fnResult.exceedsThreshold) {
            return { needsResponse: false };
          }
        }
        
        return { needsResponse: true };
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
        if (fnResult.state === VERIFICATION_STATES.VOICE_CHECK) {
          // First analyze voice patterns
          await handleFunctionCall({
            name: "analyzeVoicePattern",
            arguments: JSON.stringify({
              voiceSignature: transcriptItems[transcriptItems.length - 1]?.data?.text || "",
              analysisType: "imperial_verification"
            })
          });

          // Get the latest voice verification result from transcript items
          const voiceVerification = transcriptItems
            .reverse()
            .find(item => 
              item.data?.type === 'voice_verification' &&
              item.data?.output
            );

          // Only proceed with verification if voice patterns are acceptable
          if (voiceVerification?.data?.output) {
            const voiceData = JSON.parse(voiceVerification.data.output);
            if (!voiceData.exceedsThreshold) {
              handleFunctionCall({
                name: "verifyImperialCredentials",
                arguments: JSON.stringify({
                  claimedRank: transcriptItems[transcriptItems.length - 1]?.data?.claimedRank || "",
                  clearanceCode: transcriptItems[transcriptItems.length - 1]?.data?.text?.match(/Code\s+([A-Z0-9-]+)/i)?.[1] || "",
                  voiceSignature: transcriptItems[transcriptItems.length - 1]?.data?.text || ""
                })
              });
            }
          } else {
            // Voice patterns suspicious - trigger response
            sendClientEvent({ type: "response.create" });
          }
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
      const call_id = functionCallParams.call_id || `fallback_${Date.now()}`;
      
      addTranscriptBreadcrumb(
        `function call fallback: ${functionCallParams.name}`,
        simulatedResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id,
          output: JSON.stringify(simulatedResult),
        },
      });
      
      // Only create new response if we have a valid call_id
      if (call_id) {
        sendClientEvent({ type: "response.create" });
      }
    }
  };

  const handleServerEvent = (serverEvent: ServerEvent) => {
    logServerEvent(serverEvent);

    switch (serverEvent.type) {
      case "input_audio_buffer.speech_started": {
        lastAudioTimestampRef.current = Date.now();
        clearAudioBuffer();
        break;
      }

      case "input_audio_buffer.speech_stopped": {
        // Start hesitation buffer
        waitForHesitation().then(() => {
          if (!activeResponseRef.current) {
            sendClientEvent({ type: "response.create" });
          }
        });
        break;
      }

      case "response.created": {
        const responseId = (serverEvent as ResponseEvent).response?.id;
        if (responseId) {
          if (activeResponseRef.current) {
            addTranscriptBreadcrumb('Response Blocked', {
              reason: 'Active response in progress',
              blockedResponseId: responseId,
              activeResponseId: activeResponseRef.current,
              timestamp: new Date().toISOString()
            });
            return;
          }
          activeResponseRef.current = responseId;
          handleResponseTimeout(responseId);
        }
        break;
      }

      case "response.done": {
        const responseId = (serverEvent as ResponseEvent).response?.id;
        if (responseId === activeResponseRef.current) {
          activeResponseRef.current = null;
          clearAudioBuffer();
        }
        break;
      }

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
          // Only create response if there isn't one active
          if (!activeResponseRef.current) {
            sendClientEvent({ type: "response.create" });
          } else {
            addTranscriptBreadcrumb('Response Skipped', {
              reason: 'Active response exists',
              transcript: finalTranscript,
              activeResponseId: activeResponseRef.current,
              timestamp: new Date().toISOString()
            });
          }
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

      default:
        break;
    }
  };

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}

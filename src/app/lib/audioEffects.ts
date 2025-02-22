import { RefObject } from "react";

export class SimpleAudioProcessor {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isProcessing: boolean = false;
  private currentStream: MediaStream | null = null;
  private currentAudioElement: RefObject<HTMLAudioElement> | null = null;

  async connectStream(stream: MediaStream, audioElement: RefObject<HTMLAudioElement>) {
    this.currentStream = stream;
    this.currentAudioElement = audioElement;

    try {
      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Create nodes
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.destination = this.audioContext.createMediaStreamDestination();
      this.filter = this.audioContext.createBiquadFilter();

      // Configure basic filter (just as a proof of concept)
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 1000;

      // Connect nodes
      this.source.connect(this.filter);
      this.filter.connect(this.destination);

      // Set audio element source
      if (audioElement.current) {
        audioElement.current.srcObject = this.destination.stream;
      }

      this.isProcessing = true;
      console.log('Audio processing enabled');
    } catch (error) {
      console.error('Failed to setup audio processing:', error);
      // Fallback to direct connection
      if (audioElement.current) {
        audioElement.current.srcObject = stream;
      }
    }
  }

  disconnect() {
    try {
      if (this.source) {
        this.source.disconnect();
      }
      if (this.filter) {
        this.filter.disconnect();
      }
      // Return to direct connection if we have a stream
      if (this.currentAudioElement?.current && this.currentStream) {
        this.currentAudioElement.current.srcObject = this.currentStream;
      }
      this.isProcessing = false;
      console.log('Audio processing disabled');
    } catch (error) {
      console.error('Error disconnecting audio processor:', error);
    }
  }

  async toggle() {
    if (this.isProcessing) {
      this.disconnect();
    } else if (this.currentStream && this.currentAudioElement) {
      await this.connectStream(this.currentStream, this.currentAudioElement);
    }
    return this.isProcessing;
  }

  isActive(): boolean {
    return this.isProcessing;
  }
} 
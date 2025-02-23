import { RefObject } from "react";

export class SimpleAudioProcessor {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private isProcessing: boolean = false;
  private currentStream: MediaStream | null = null;
  private currentAudioElement: RefObject<HTMLAudioElement> | null = null;
  public hasPlayedFirstAudio: boolean = false;

  // Filter nodes
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private resonance1: BiquadFilterNode | null = null;
  private resonance2: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;

  // Stormtrooper voice parameters
  private readonly PARAMS = {
    // EQ and resonance parameters
    highpassFreq: 500.0,
    lowpassFreq: 2500.0,
    resonanceFreq1: 1000.0,
    resonanceFreq2: 2000.0,
    resonanceQ: 5.0,
    resonanceGain: 12.0,        // Increased resonance gain
    outputGainDb: 12.0,         // Doubled output gain
    
    // Mic click parameters
    clickDuration: 0.04,        // 40ms duration
    clickFreq: 2000.0,          // 2kHz sine wave
    clickVolume: 3.0,           // Doubled click volume
    clickVariation: 0.2,        // Random variation in frequency/volume
    clickAttack: 0.1,           // Sharp attack (10% of duration)
    clickDecay: 0.3,            // Slower decay (30% of duration)
    clickGainDb: 6.0,           // Additional gain for clicks

    // Static effect parameters
    staticDurationMin: 0.08,
    staticDurationMax: 0.2,
    staticVolume: 0.8,          // Doubled static volume
    staticVariation: 0.3,
    staticRampPercent: 0.4,
    staticHighpassFreq: 1000,
    staticLowpassFreq: 4000,
    staticGainDb: 6.0           // Additional gain for static
  };

  private async generateMicClick(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const clickDuration = this.PARAMS.clickDuration;
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = clickDuration * sampleRate;
    
    // Create buffer for the click
    const clickBuffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = clickBuffer.getChannelData(0);

    // Generate click waveform with variation
    const volume = this.PARAMS.clickVolume * (1 + (Math.random() - 0.5) * this.PARAMS.clickVariation);
    const freq = this.PARAMS.clickFreq * (1 + (Math.random() - 0.5) * this.PARAMS.clickVariation);

    // Calculate envelope points
    const attackSamples = Math.floor(numSamples * this.PARAMS.clickAttack);

    // Fill buffer with sine wave
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Generate envelope
      let envelope;
      if (i < attackSamples) {
        // Linear attack
        envelope = i / attackSamples;
      } else {
        // Exponential decay
        const decayPosition = (i - attackSamples) / (numSamples - attackSamples);
        envelope = Math.exp(-decayPosition / this.PARAMS.clickDecay);
      }
      
      // Sine wave with envelope
      channelData[i] = volume * Math.sin(2 * Math.PI * freq * t) * envelope;
    }

    return clickBuffer;
  }

  public async playMicClick(isStartClick: boolean = true) {
    if (!this.audioContext || !this.destination || !this.gainNode) return;

    try {
      const clickBuffer = await this.generateMicClick();
      if (!clickBuffer) return;

      // Create source for the click
      const clickSource = this.audioContext.createBufferSource();
      clickSource.buffer = clickBuffer;

      // Create a bandpass filter specifically for the click
      const clickFilter = this.audioContext.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.value = this.PARAMS.clickFreq;
      clickFilter.Q.value = 2.0; // Narrower bandwidth for more "clicky" sound

      // Create a gain node for the click with additional boost
      const clickGain = this.audioContext.createGain();
      clickGain.gain.value = Math.pow(10, this.PARAMS.clickGainDb / 20);

      // Connect click through minimal chain for more presence
      clickSource
        .connect(clickFilter)
        .connect(clickGain)
        .connect(this.gainNode)
        .connect(this.destination);

      // Schedule and play the click
      clickSource.start(this.audioContext.currentTime);
      console.log(`Playing ${isStartClick ? 'start' : 'end'} mic click`);
    } catch (error) {
      console.error('Error playing mic click:', error);
    }
  }

  private async generateStaticEffect(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    // Generate random duration
    const duration = this.PARAMS.staticDurationMin + 
      Math.random() * (this.PARAMS.staticDurationMax - this.PARAMS.staticDurationMin);
    
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = Math.floor(duration * sampleRate);
    const rampSamples = Math.floor(numSamples * this.PARAMS.staticRampPercent);
    
    // Create buffer for the static
    const staticBuffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = staticBuffer.getChannelData(0);

    // Generate white noise with volume variation
    const volume = this.PARAMS.staticVolume * 
      (1 + (Math.random() - 0.5) * this.PARAMS.staticVariation);

    // Fill buffer with noise
    for (let i = 0; i < numSamples; i++) {
      // Generate noise
      let noise = (Math.random() * 2 - 1) * volume;
      
      // Apply volume ramp in the latter portion
      if (i >= numSamples - rampSamples) {
        const rampPosition = (i - (numSamples - rampSamples)) / rampSamples;
        noise *= 0.3 + (0.7 * rampPosition); // Start at 30% volume
      }
      
      channelData[i] = noise;
    }

    return staticBuffer;
  }

  public async playStaticEffect() {
    if (!this.audioContext || !this.destination || !this.gainNode) return;

    try {
      const staticBuffer = await this.generateStaticEffect();
      if (!staticBuffer) return;

      // Create nodes for static effect
      const staticSource = this.audioContext.createBufferSource();
      staticSource.buffer = staticBuffer;

      // Create bandpass filter for static
      const staticFilter = this.audioContext.createBiquadFilter();
      staticFilter.type = 'bandpass';
      staticFilter.frequency.value = (this.PARAMS.staticHighpassFreq + this.PARAMS.staticLowpassFreq) / 2;
      staticFilter.Q.value = 0.5;

      // Create gain node for static with additional boost
      const staticGain = this.audioContext.createGain();
      staticGain.gain.value = Math.pow(10, this.PARAMS.staticGainDb / 20);

      // Connect through a simplified chain with extra gain
      staticSource
        .connect(staticFilter)
        .connect(staticGain)
        .connect(this.gainNode)
        .connect(this.destination);

      // Schedule and play the static
      staticSource.start(this.audioContext.currentTime);
      console.log('Playing end-of-statement static effect');
    } catch (error) {
      console.error('Error playing static effect:', error);
    }
  }

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
      
      // Create filter chain
      this.highpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.resonance1 = this.audioContext.createBiquadFilter();
      this.resonance2 = this.audioContext.createBiquadFilter();
      this.gainNode = this.audioContext.createGain();

      // Configure highpass filter
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.value = this.PARAMS.highpassFreq;
      this.highpassFilter.Q.value = 0.7;

      // Configure lowpass filter
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = this.PARAMS.lowpassFreq;
      this.lowpassFilter.Q.value = 0.7;

      // Configure resonant peaks
      this.resonance1.type = 'peaking';
      this.resonance1.frequency.value = this.PARAMS.resonanceFreq1;
      this.resonance1.Q.value = this.PARAMS.resonanceQ;
      this.resonance1.gain.value = this.PARAMS.resonanceGain;

      this.resonance2.type = 'peaking';
      this.resonance2.frequency.value = this.PARAMS.resonanceFreq2;
      this.resonance2.Q.value = this.PARAMS.resonanceQ;
      this.resonance2.gain.value = this.PARAMS.resonanceGain;

      // Configure output gain (convert dB to linear)
      this.gainNode.gain.value = Math.pow(10, this.PARAMS.outputGainDb / 20);

      // Connect the nodes
      if (this.source && this.destination && 
          this.highpassFilter && this.lowpassFilter && 
          this.resonance1 && this.resonance2 && 
          this.gainNode) {
        this.source
          .connect(this.highpassFilter)
          .connect(this.lowpassFilter)
          .connect(this.resonance1)
          .connect(this.resonance2)
          .connect(this.gainNode)
          .connect(this.destination);
      }

      // Set audio element source
      if (audioElement.current) {
        audioElement.current.srcObject = this.destination.stream;
      }

      this.isProcessing = true;
      console.log('Stormtrooper voice effect enabled');

      // Play start mic click after setup is complete
      await this.playMicClick(true);
    } catch (error) {
      console.error('Failed to setup audio processing:', error);
      // Fallback to direct connection
      if (audioElement.current) {
        audioElement.current.srcObject = stream;
      }
    }
  }

  async disconnect() {
    try {
      // Play end mic click before disconnecting
      if (this.isProcessing) {
        await this.playMicClick(false);
        // Small delay to allow click to play
        await new Promise(resolve => setTimeout(resolve, this.PARAMS.clickDuration * 1000));
      }

      // Reset first audio flag
      this.hasPlayedFirstAudio = false;

      // Disconnect all nodes
      if (this.source) this.source.disconnect();
      if (this.highpassFilter) this.highpassFilter.disconnect();
      if (this.lowpassFilter) this.lowpassFilter.disconnect();
      if (this.resonance1) this.resonance1.disconnect();
      if (this.resonance2) this.resonance2.disconnect();
      if (this.gainNode) this.gainNode.disconnect();

      // Return to direct connection if we have a stream
      if (this.currentAudioElement?.current && this.currentStream) {
        this.currentAudioElement.current.srcObject = this.currentStream;
      }
      this.isProcessing = false;
      console.log('Stormtrooper voice effect disabled');
    } catch (error) {
      console.error('Error disconnecting audio processor:', error);
    }
  }

  async toggle() {
    if (this.isProcessing) {
      await this.disconnect();
    } else if (this.currentStream && this.currentAudioElement) {
      await this.connectStream(this.currentStream, this.currentAudioElement);
    }
    return this.isProcessing;
  }

  isActive(): boolean {
    return this.isProcessing;
  }
} 
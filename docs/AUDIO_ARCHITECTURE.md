# Audio Architecture

## Overview

The audio system in our stormtrooper simulation uses WebRTC to handle real-time audio streaming from OpenAI's API. The audio pipeline consists of several stages, from receiving the audio stream to applying stormtrooper voice effects and final playback.

## Core Components

### 1. WebRTC Connection

- Established in `src/app/lib/realtimeConnection.ts`
- Handles both audio stream and control messages
- Uses PCM16 format for input/output audio

```typescript
const pc = new RTCPeerConnection();
pc.ontrack = (e) => {
  if (audioElement.current) {
    audioElement.current.srcObject = e.streams[0];
  }
};
```

### 2. Audio Stream Flow

```mermaid
graph LR
    A[OpenAI API] -->|WebRTC MediaStream| B[RTCPeerConnection]
    B -->|ontrack event| C[Audio Processing]
    C -->|Processed Stream| D[HTMLAudioElement]
    D -->|Output| E[Speaker]
```

### 3. Session Configuration

```typescript
{
  modalities: ["text", "audio"],
  voice: "ash",
  input_audio_format: "pcm16",
  output_audio_format: "pcm16",
  input_audio_transcription: { model: "whisper-1" }
}
```

## Audio Processing Pipeline

### 1. Stream Interception

- Location: `ontrack` event handler in WebRTC connection
- Receives raw MediaStream from OpenAI
- Entry point for voice effect processing

### 2. Voice Effect Processing

- Implemented in `src/app/lib/audioEffects.ts`
- Uses Web Audio API for real-time processing
- Applies stormtrooper voice characteristics
- Includes fallback mechanism if processing fails

### 3. Playback Control

- Managed through HTMLAudioElement
- Supports enable/disable functionality
- Handles autoplay restrictions

## Event Sequence

1. **Start of Response**
   - `response.content_part.added`
   - Indicates beginning of audio response

2. **Audio Stream Start**
   - `output_audio_buffer.started`
   - WebRTC stream begins

3. **During Playback**
   - `response.audio_transcript.delta`
   - Real-time transcription updates

4. **Completion**
   - `response.audio_transcript.done`
   - `response.content_part.done`
   - `response.done`

## Error Handling

1. **Connection Errors**
   - Secure context validation
   - MediaDevices availability check
   - WebRTC connection failure handling

2. **Processing Errors**
   - Fallback to unprocessed audio
   - Graceful degradation of effects

3. **Playback Errors**
   - Autoplay blocking detection
   - Stream interruption handling

## Development vs Production

The audio architecture is designed to work consistently in both development (browser) and production (RPi5) environments:

- **Development**: Runs in web browser for testing
- **Production**: Runs on RPi5 with local audio hardware
- **Common**: Same WebRTC and audio processing pipeline

## Future Enhancements

1. **Voice Effect Improvements**
   - Additional stormtrooper voice characteristics
   - Dynamic effect parameter adjustment
   - Effect preset management

2. **Performance Optimization**
   - Audio buffer size tuning
   - Processing latency reduction
   - Resource usage optimization

3. **Monitoring and Debugging**
   - Audio pipeline metrics
   - Effect parameter visualization
   - Real-time audio analysis

## Code Examples

### Audio Processor Implementation

```typescript
export class StormtrooperAudioProcessor {
  private audioContext: AudioContext;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  
  constructor() {
    this.audioContext = new AudioContext();
  }

  processStream(inputStream: MediaStream): MediaStream {
    this.source = this.audioContext.createMediaStreamSource(inputStream);
    this.destination = this.audioContext.createMediaStreamDestination();
    
    // Effect chain setup
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    // Connect nodes
    this.source
      .connect(gainNode)
      .connect(filter)
      .connect(this.destination);
    
    return this.destination.stream;
  }
}
```

### Integration Point

```typescript
pc.ontrack = (e) => {
  if (audioElement.current) {
    try {
      const processedStream = audioProcessor.processStream(e.streams[0]);
      audioElement.current.srcObject = processedStream;
    } catch (error) {
      console.error('Audio processing failed, falling back to unprocessed audio');
      audioElement.current.srcObject = e.streams[0];
    }
  }
};
```

## Dependencies

- Web Audio API
- WebRTC
- MediaStream API
- HTMLAudioElement

## References

- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebRTC Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MediaStream Processing](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Processing_API)

# Aiola JavaScript SDK

This repository contains the official JavaScript/TypeScript SDKs for Aiola's services.

## Packages

### Speech-to-Text (STT)

```bash
npm install @aiola/stt
```

```typescript
import {
  AiolaStreamingClient,
  AiolaSocketNamespace,
  AiolaSocketConfig,
} from "@aiola/stt";

const client = new AiolaStreamingClient({
  baseUrl: "https://your-aiola-endpoint.com",
  namespace: AiolaSocketNamespace.EVENTS, // Available namespaces: EVENTS
  bearer: "your-auth-token",
  queryParams: {
    flow_id: "your-flow-id",
    execution_id: "your-execution-id",
    lang_code: "en_US",
    time_zone: "UTC",
  },
  // micConfig is optional - defaults to:
  // micConfig: {
  //   sampleRate: 16000,
  //   chunkSize: 4096,
  //   channels: 1
  // }
  events: {
    onTranscript: (data) => {
      console.log("Transcript:", data);
    },
    onEvents: (data) => {
      console.log("Event:", data);
    },
    onError: (error) => {
      console.error("Error:", error);
    },
    onStartRecord: () => {
      console.log("Recording started");
    },
    onStopRecord: () => {
      console.log("Recording stopped");
    },
  },
});

// Connect to the service
client.connect();

// Or connect and start recording automatically
client.connect(true);
```

### Configuration Reference

#### AiolaSocketNamespace

```typescript
enum AiolaSocketNamespace {
  EVENTS = "/events",
}
```

#### AiolaSocketConfig

```typescript
interface AiolaSocketConfig {
  baseUrl: string; // The base URL of the Aiola API
  namespace: AiolaSocketNamespace; // The namespace to connect to
  bearer: string; // Authentication token
  queryParams: {
    // Query parameters for the connection
    flow_id: string; // The flow ID to use
    execution_id: string; // Execution ID for the session
    lang_code: string; // Language code (e.g., "en_US")
    time_zone: string; // Time zone (e.g., "UTC")
    [key: string]: string; // Additional custom parameters
  };
  micConfig?: {
    // Optional microphone configuration
    sampleRate: number; // Default: 16000
    chunkSize: number; // Default: 4096
    channels: number; // Default: 1
  };
  events: {
    // Event handlers
    onTranscript: (data: any) => void; // Called when transcript is received
    onEvents: (data: any) => void; // Called for other events
    onConnect?: () => void; // Called when connected
    onStartRecord?: () => void; // Called when recording starts (only after permissions are granted)
    onStopRecord?: () => void; // Called when recording stops (only if recording was started)
    onKeyWordSet?: (keywords: string[]) => void; // Called when keywords are set
    onError?: (error: AiolaSocketError) => void; // Called on errors, including permission denied
  };
  transports?: "polling" | "websocket" | "all"; // Transport method to use
}
```

### Text-to-Speech (TTS)

```bash
npm install @aiola/tts
```

```typescript
import AiolaTTSClient from "@aiola/tts";

// First create the client
const client = new AiolaTTSClient({
  baseUrl: "https://your-aiola-endpoint.com",
  bearer: "your-auth-token",
});

// Get available voices
const voices = client.getVoices();
// Returns:
// {
//   Default: "af",
//   Bella: "af_bella",
//   Nicole: "af_nicole",
//   Sarah: "af_sarah",
//   Sky: "af_sky",
//   Adam: "am_adam",
//   Michael: "am_michael",
//   Emma: "bf_emma",
//   Isabella: "bf_isabella",
//   George: "bm_george",
//   Lewis: "bm_lewis"
// }

// Create a client with default voice using getVoices()
const clientWithDefault = new AiolaTTSClient({
  baseUrl: "https://your-aiola-endpoint.com",
  bearer: "your-auth-token",
  defaultVoice: voices.Default, // Using the Default voice from getVoices()
});

// Synthesize speech and get audio as a Blob
// Voice can be provided in the method call or will use defaultVoice from config
const audioBlob = await clientWithDefault.synthesizeSpeech(
  "Hello, world!",
  voices.Bella
);

// Using defaultVoice from config
const audioBlob2 = await clientWithDefault.synthesizeSpeech("Hello, world!");

// If neither voice parameter nor defaultVoice is provided, an error will be thrown
const clientWithoutDefault = new AiolaTTSClient({
  baseUrl: "https://your-aiola-endpoint.com",
  bearer: "your-auth-token",
});
// This will throw: "Voice is required for synthesis"
await clientWithoutDefault.synthesizeSpeech("Hello, world!");

// Stream the audio (also returns a Blob)
const streamBlob = await clientWithDefault.streamSpeech(
  "Hello, world!",
  voices.Nicole
);
```

#### TTSConfig Interface

```typescript
interface TTSConfig {
  baseUrl: string; // The base URL of the Aiola API
  bearer: string; // Authentication token
  defaultVoice?: string; // Optional default voice. If not provided, voice must be specified in method calls
}
```

### Setup

```bash
npm install
```

### Build all packages

```bash
npm run build
```

### Run example apps

From the root

```bash
npm run serve
```

And navigate to `examples` and navigate to wanted example

### Type checking

```bash
npm run type-check
```

### Connection and Recording

The STT client provides two ways to start recording:

1. Manual start:

```typescript
// First connect
client.connect();

// Then start recording when ready
await client.startRecording();
```

2. Automatic start:

```typescript
// Connect and start recording automatically after connection
client.connect(true);
```

When using automatic recording (`autoRecord = true`):

- Recording will start automatically after connection is established
- Microphone permissions will be requested immediately after connection
- All permission handling and error events will work the same as with manual recording

### Permission Handling

The STT client handles microphone permissions as follows:

1. When `startStreaming()` is called, the client will request microphone permissions from the user
2. If permissions are granted:
   - `onStartRecord` event is called
   - Recording begins
3. If permissions are denied:
   - `onError` event is called with `AiolaSocketErrorCode.MIC_ERROR`
   - No recording events (`onStartRecord`, `onStopRecord`) are emitted
   - No audio resources are initialized

### Methods

#### connect(autoRecord?: boolean)

Connects to the aiOla streaming service.

- `autoRecord`: Optional boolean parameter. If `true`, recording will start automatically after connection is established. Default is `false`.

#### startRecording()

Starts recording audio from the microphone. Must be called after `connect()` unless `autoRecord` was set to `true`.

#### stopRecording()

Stops recording audio and releases microphone resources.

#### closeSocket()

Disconnects from the aiOla streaming service.

#### setKeywords(keywords: string[])

Sets keywords for speech recognition.

- `keywords`: Array of strings to listen for. Pass an empty array to clear keywords.

## Development

### Building the SDK

1. Install dependencies:

```bash
npm install
```

2. Build all packages:

```bash
npm run build
```

This will build both STT and TTS packages, generate TypeScript declarations, and create production-ready bundles.

### Running Example Applications

1. Start the development server:

```bash
npm run serve
```

2. Navigate to the examples directory in your browser:
   - For STT examples: `http://localhost:3000/examples/stt`
   - For TTS examples: `http://localhost:3000/examples/tts`

### Development Workflow

1. Make changes to the source code in the respective package directories
2. Run the build command to compile changes:

```bash
npm run build
```

3. Test your changes using the example applications

## License

See [LICENSE](LICENSE) file for details.

## Support

For any issues or questions regarding the aiOla SDK, please [contact us](https://aiOla.ai/contact/)

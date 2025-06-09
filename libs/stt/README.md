# @aiola/web-sdk-stt

Aiola Speech-To-Text JavaScript SDK

## Speech-To-Text (STT)

### Install
```bash
npm i @aiola/web-sdk-stt
```

### Quick start
```typescript
import {
  AiolaStreamingClient,
  AiolaSocketNamespace,
  AiolaSocketConfig,
} from "@aiola/stt";

const client = new AiolaStreamingClient({
  baseUrl: "https://api.aiola.ai", // for enterprises, use custom endpoint 
  namespace: AiolaSocketNamespace.EVENTS,
  bearer: "<API-KEY>",
  queryParams: {
    flow_id: "TBD", //for enterprises, use custom flow id
    execution_id: "<unique-execution-id>",
    lang_code: "en_US",
    time_zone: "UTC",
  },
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

client.setKeywords(['aiola', 'api', 'testing']);

// start recording
client.startRecording();
```

### Connection and Recording

The STT client provides two ways to start recording:

#### 1. Manual start:

```typescript
// First connect
client.connect();

// Then start recording when ready
await client.startRecording();
```

#### 2. Automatic start
```typescript
client.connect(true);
```



### Configuration Reference
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

## License

See [LICENSE](LICENSE) file for details.

## Support

For any issues or questions regarding the aiOla STT SDK, please [contact us](https://aiOla.ai/contact/)


# @aiola/web-sdk-stt

Aiola Speech-To-Text JavaScript SDK

<div style="display: flex; gap: 20px; justify-content: center;">
  <img src="https://github.com/user-attachments/assets/1b97d1f8-64ad-454a-81b9-c76d82e2de58" alt="stt" style="max-width: 60%; border: 2px solid #0e9375; border-radius: 8px;">
</div>

example code can be found [here](https://github.com/aiola-lab/aiola-js-sdk-internal/tree/main/examples/stt-demo)

## Installation

```bash
npm install @aiola/web-sdk-stt
# or
yarn add @aiola/web-sdk-stt
```

## Usage

### Node.js (CommonJS)

```javascript
const { AiolaStreamingClient } = require("@aiola/web-sdk-stt");

const stt = new AiolaStreamingClient({
  // configuration options
});
```

### Modern JavaScript (ES Modules)

```javascript
import { AiolaStreamingClient } from "@aiola/web-sdk-stt";

const stt = new AiolaStreamingClient({
  // configuration options
});
```

### Browser (Direct Usage)

```html
 <script type="importmap">
    {
        "imports": {
          "@aiola/web-sdk-stt": "./node_modules/@aiola/web-sdk-stt/dist/bundle/index.js"
        }
    }
</script>
```

## API Documentation

```bash
npm install @aiola/web-sdk-stt
```

```typescript
import {
  AiolaStreamingClient,
  AiolaSocketNamespace,
  AiolaSocketConfig,
} from "@aiola/web-sdk-stt";

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

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## License

See [LICENSE](LICENSE) file for details.

## Support

For any issues or questions regarding the aiOla STT SDK, please [contact us](https://aiOla.ai/contact/)


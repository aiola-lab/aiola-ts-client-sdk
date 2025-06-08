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
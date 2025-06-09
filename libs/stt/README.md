# @aiola/web-sdk-stt

Aiola Speech-To-Text JavaScript SDK

#### Install
```bash
npm i @aiola/web-sdk-stt
```

#### quick start
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

#### Connection and Recording

The STT client provides two ways to start recording:

1. Manual start:

```typescript
// First connect
client.connect();

// Then start recording when ready
await client.startRecording();
```

## License

See [LICENSE](LICENSE) file for details.

## Support

For any issues or questions regarding the aiOla STT SDK, please [contact us](https://aiOla.ai/contact/)


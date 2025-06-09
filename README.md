# aiOla TypeScript SDK


This repository contains the official JavaScript/TypeScript SDKs for Aiola's voice services.


## TL;DR - Demo

Want to try out the playground? Just clone and run:

`. ./scripts/build_examples.sh `

<div style="display: flex; gap: 20px; justify-content: center;">
  <img src="https://github.com/user-attachments/assets/1b97d1f8-64ad-454a-81b9-c76d82e2de58
" alt="stt" style="max-width: 50%;">
 <img src="https://github.com/user-attachments/assets/1745bf3b-ac9c-43a9-a783-7608c34e490e
" alt="stt" style="max-width: 50%;">
</div>

## SDKs

- [aiola-tts](libs/tts/README.md): Text-to-Speech SDK
- [aiola-stt](libs/stt/README.md): Speech-to-Text SDK

## Installation

```bash
npm i @aiola/web-sdk-stt
npm i @aiola/web-sdk-tts
```

## Quick Examples

### Text-to-Speech
```typescript
import AiolaTTSClient from "@aiola/tts";
const client = new AiolaTTSClient({
  baseUrl: "https://api.aiola.ai",
  bearer: "<API-KEY>",
});
const voices = client.getVoices()
const audioBlob = await client.synthesizeSpeech(
  "Hello, world!",
  voices.Bella
);
```

### Speech-to-Text
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

## Features

| Speech-to-Text (STT)                                      | Text-to-Speech (TTS)                                  |
|:----------------------------------------------------------|:------------------------------------------------------|
| Real-time speech transcription                            | Convert text to speech and save as WAV files          |
| Keyword spotting                                          | Real-time streaming of synthesized speech             |
| Event-driven architecture                                 | Multiple voice options available                      |
| Multiple language support (en-US, de-DE, fr-FR, zh-ZH, es-ES, pt-PT)                                                          | Support for different audio formats (LINEAR16, PCM)   |


## License

MIT License

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
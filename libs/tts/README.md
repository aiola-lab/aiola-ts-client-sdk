# @aiola/web-sdk-tts

Aiola Text-to-Speech JavaScript SDK

<div style="display: flex; gap: 20px; justify-content: center;">
  <img src="https://github.com/user-attachments/assets/1745bf3b-ac9c-43a9-a783-7608c34e490e" alt="tts" style="max-width: 60%; border: 2px solid #0e9375; border-radius: 8px;">
</div>

example code can be found [here](https://github.com/aiola-lab/aiola-ts-client-sdk/tree/main/examples/tts-demo)
### Text-to-Speech (TTS)

#### Install
```bash
npm i @aiola/web-sdk-tts
```

#### quick start


```typescript
import AiolaTTSClient from "@aiola/tts";

// First create the client
const client = new AiolaTTSClient({
  baseUrl: "https://api.aiola.ai", // for enterprises, use custom endpoint
  bearer: "<API-KEY>",
});

//Get all voices
const voices = client.getVoices()

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

##### TTSConfig Interface

```typescript
interface TTSConfig {
  baseUrl: string; // The base URL of the Aiola API
  bearer: string; // Authentication token
  defaultVoice?: string; // Optional default voice. If not provided, voice must be specified in method calls
}
```
##### Available Voices

```typescript
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
```

## License

See [LICENSE](LICENSE) file for details.

## Support

For any issues or questions regarding the aiOla TTS SDK, please [contact us](https://aiOla.ai/contact/)

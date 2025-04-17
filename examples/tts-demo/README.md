# aiOla TTS Demo

This is a demonstration of the Aiola Text-to-Speech (TTS) SDK capabilities. The demo provides a simple web interface where you can convert text to speech using different voices, with options for both regular synthesis and streaming.

## Features

- Text-to-speech conversion
- Multiple voice options
- Two synthesis modes:
  - Regular synthesis (full audio file)
  - Streaming synthesis (real-time streaming)
- Audio playback controls

![tts](https://github.com/user-attachments/assets/1745bf3b-ac9c-43a9-a783-7608c34e490e)


## Prerequisites

- Node.js and npm installed
- Access to aiOla API (API key required)

## Setup

1. Install dependencies from the example dir:
```bash
cd  examples/tts-demo/
npm install
```

2. Configure the API credentials:
   Update the `baseUrl` and `bearer` token in `main.js` with your aiOla API credentials:

```javascript
const client = new AiolaTTSClient({
  baseUrl: "YOUR_API_BASE_URL",
  bearer: "YOUR_API_KEY",
});
```

## Usage
1. from the project root run 
```bash
npm run serve
``` 
2. Navigate to ```examples/tts-demo/```

3. Open the application in your web browser.

4. Enter the text you want to convert to speech
5. Select a voice from the dropdown menu
6. Choose either:
   - "Synthesize" for full audio file generation
   - "Stream" for real-time streaming synthesis
7. Listen to the generated audio using the audio player controls

## Implementation Details

The demo uses the aiOla TTS SDK (`AiOlaTTSClient`) to handle text-to-speech conversion. It provides two main methods:

- `synthesizeSpeech`: Generates a complete audio file
- `streamSpeech`: Provides real-time streaming of the audio

The audio is played using the HTML5 audio player, supporting standard audio controls.

## Error Handling

The application includes basic error handling for both synthesis methods:

- Failed synthesis attempts are logged to the console
- User-friendly error messages are displayed via alerts
- Buttons are disabled during processing to prevent multiple simultaneous requests

## License

See [LICENSE](LICENSE) file for details.

## Support

For any issues or questions regarding the aiOla TTS SDK, please [contact us](https://aiOla.ai/contact/)

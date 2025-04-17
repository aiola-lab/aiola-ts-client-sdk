export const SDK_VERSION = "0.1.0";

interface TTSConfig {
  baseUrl: string;
  bearer: string;
  defaultVoice?: string;
}

export default class AiolaTTSClient {
  private config: TTSConfig;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  public async synthesizeSpeech(text: string, voice?: string): Promise<Blob> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for synthesis");
    }

    if (!voice && !this.config.defaultVoice) {
      throw new Error("Voice is required for synthesis");
    }

    const payload = { text, voice: voice || this.config.defaultVoice };
    return await this.request("synthesize", payload);
  }

  public async streamSpeech(text: string, voice?: string): Promise<Blob> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for synthesis");
    }

    if (!voice && !this.config.defaultVoice) {
      throw new Error("Voice is required for streaming");
    }

    const payload = { text, voice: voice || this.config.defaultVoice };
    return await this.request("synthesize/stream", payload);
  }

  /**
   * Helper method to make API requests.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Object} data - The payload for the request.
   * @returns {Promise<Blob>} - The API response.
   */
  async request(endpoint: string, data: any) {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/tts/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${this.config.bearer}`,
          },
          body: new URLSearchParams(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.detail ||
            `TTS ${endpoint.split("/")[0]} failed: ${response.statusText}`
        );
      }

      if (endpoint === "synthesize") {
        return await response.blob();
      } else if (endpoint === "synthesize/stream") {
        if (!response.body) {
          throw new Error("Response body is null");
        }
        return response.body instanceof Blob
          ? response.body
          : await response.blob();
      }

      return await response.json();
    } catch (error) {
      console.error(`Error calling ${endpoint}:`, error);
      throw error;
    }
  }

  public getVoices(): Record<string, string> {
    return {
      Bella: "af_bella",
      Nicole: "af_nicole",
      Sarah: "af_sarah",
      Sky: "af_sky",
      Adam: "am_adam",
      Michael: "am_michael",
      Emma: "bf_emma",
      Isabella: "bf_isabella",
      George: "bm_george",
      Lewis: "bm_lewis",
    };
  }
}

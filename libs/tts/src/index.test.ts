import AiolaTTSClient from "./index";
import { ReadableStream } from "web-streams-polyfill";

describe("AiolaTTSClient", () => {
  const mockConfig = {
    baseUrl: "https://test.aiola.com",
    bearer: "test-token",
    defaultVoice: "en-US-1",
  };

  let client: AiolaTTSClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    client = new AiolaTTSClient(mockConfig);
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("synthesizeSpeech", () => {
    it("should make correct API call for speech synthesis", async () => {
      const mockBlob = new Blob(["mock audio data"], { type: "audio/wav" });
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({
          "Content-Type": "audio/wav",
        }),
        blob: () => Promise.resolve(mockBlob),
        json: () => Promise.resolve({}),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.synthesizeSpeech("Hello world");

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.baseUrl}/api/tts/synthesize`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${mockConfig.bearer}`,
          },
          body: expect.any(URLSearchParams),
        })
      );

      expect(result).toBe(mockBlob);
    });

    it("should throw error when API call fails", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: new Headers(),
        json: () => Promise.resolve({ detail: "Invalid request" }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(client.synthesizeSpeech("Hello world")).rejects.toThrow(
        "Invalid request"
      );
    });

    it("should throw error when neither voice nor defaultVoice is provided", async () => {
      const clientWithoutDefaultVoice = new AiolaTTSClient({
        baseUrl: mockConfig.baseUrl,
        bearer: mockConfig.bearer,
      });

      await expect(
        clientWithoutDefaultVoice.synthesizeSpeech("Hello world")
      ).rejects.toThrow("Voice is required for synthesis");
    });
  });

  describe("streamSpeech", () => {
    it("should make correct API call for speech streaming", async () => {
      const mockBlob = new Blob(["mock audio data"], { type: "audio/wav" });
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        blob: () => Promise.resolve(mockBlob),
        json: () => Promise.resolve({}),
        body: mockBlob,
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.streamSpeech("Hello world");

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.baseUrl}/api/tts/synthesize/stream`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${mockConfig.bearer}`,
          },
          body: expect.any(URLSearchParams),
        })
      );

      expect(result).toBeInstanceOf(Blob);
      expect(result).toBe(mockBlob);
    });

    it("should throw error when API call fails", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: new Headers(),
        json: () => Promise.resolve({ detail: "Invalid request" }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(client.streamSpeech("Hello world")).rejects.toThrow(
        "Invalid request"
      );
    });

    it("should throw error when response body is null", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        body: null,
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(client.streamSpeech("Hello world")).rejects.toThrow(
        "Response body is null"
      );
    });

    it("should throw error when neither voice nor defaultVoice is provided", async () => {
      const clientWithoutDefaultVoice = new AiolaTTSClient({
        baseUrl: mockConfig.baseUrl,
        bearer: mockConfig.bearer,
      });

      await expect(
        clientWithoutDefaultVoice.streamSpeech("Hello world")
      ).rejects.toThrow("Voice is required for streaming");
    });
  });
});

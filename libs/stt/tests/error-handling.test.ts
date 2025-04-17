import { jest } from "@jest/globals";
import {
  AiolaStreamingClient,
  AiolaSocketErrorCode,
  AiolaSocketError,
} from "../src";
import {
  mockConfig,
  createMockSocket,
  setupTestHooks,
  setupTestEnv,
  mockAudioContext,
  mockMediaStream,
  mockMediaDevices,
  mockAudioWorkletNode,
} from "./utils";

// Mock socket.io-client
jest.mock("socket.io-client", () => {
  return {
    io: jest.fn().mockReturnValue({
      on: jest.fn(),
      emit: jest.fn(),
      connected: false,
      disconnect: jest.fn(),
    }),
  };
});

// Setup global mocks
setupTestEnv();

describe("AiolaStreamingClient - Error Handling and Edge Cases", () => {
  let client: AiolaStreamingClient;
  let mockSocket: any;

  setupTestHooks();

  beforeEach(() => {
    mockSocket = createMockSocket();
    (require("socket.io-client") as any).io.mockReturnValue(mockSocket);

    client = new AiolaStreamingClient({
      ...mockConfig,
      micConfig: {
        sampleRate: 16000,
        chunkSize: 4096,
        channels: 1,
      },
    });
  });

  describe("Audio Worklet Processing", () => {
    it("should handle audio worklet message processing", async () => {
      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start recording to initialize audio worklet
      await client.startRecording();

      // Create a mock Float32Array for testing
      const mockFloat32Array = new Float32Array([0.5, -0.5, 1.5, -1.5]);

      // Simulate message from audio worklet
      const messageEvent = { data: mockFloat32Array } as MessageEvent;
      mockAudioWorkletNode.port.onmessage(messageEvent);

      // Verify socket emits binary data
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "binary_data",
        expect.any(ArrayBuffer)
      );
    });

    it("should handle errors during audio chunk processing", async () => {
      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start recording to initialize audio worklet
      await client.startRecording();

      // Mock socket.emit to throw an error
      mockSocket.emit.mockImplementationOnce(() => {
        throw new Error("Socket emit error");
      });

      // Create a mock Float32Array for testing
      const mockFloat32Array = new Float32Array([0.5, -0.5, 1.5, -1.5]);

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, "error");

      // Simulate message from audio worklet
      const messageEvent = { data: mockFloat32Array } as MessageEvent;
      mockAudioWorkletNode.port.onmessage(messageEvent);

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error processing chunk:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Advanced Error Handling", () => {
    it("should handle errors when stopping tracks in mediaStream", async () => {
      // Create mock tracks with error behavior
      const errorTrack = {
        stop: jest.fn().mockImplementation(() => {
          throw new Error("Track stop error");
        }),
      };

      // Mock the mediaStream to return our error track
      mockMediaStream.getTracks.mockReturnValueOnce([errorTrack]);

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start and then stop recording to trigger track stopping
      await client.startRecording();
      client.stopRecording();

      // Verify error handling occurred
      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ERROR,
          message: expect.stringContaining("Error stopping track"),
        })
      );
    });

    it("should handle non-Error objects in error handler", () => {
      // Directly call the private handleError method with a non-Error object
      const nonError = "This is not an Error object";
      (client as any).handleError(
        "Test error message",
        AiolaSocketErrorCode.GENERAL_ERROR,
        { originalError: nonError }
      );

      // Verify error callback was called with correct information
      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.GENERAL_ERROR,
          message: "Test error message",
          details: { originalError: nonError },
        })
      );
    });

    it("should handle socket error events", () => {
      client.connect();

      // Find the error handler registered for socket
      const errorHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === "error"
      )?.[1];

      if (errorHandler) {
        // Simulate socket error event
        errorHandler({ message: "Socket error occurred" });

        // Verify error handling
        expect(client["config"].events.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: AiolaSocketErrorCode.GENERAL_ERROR,
            message: expect.stringContaining("Socket error"),
          })
        );
      }
    });
  });

  describe("Float32 to Int16 Conversion", () => {
    it("should correctly convert Float32Array to Int16Array", () => {
      // Test with values within range [-1, 1]
      const float32Array = new Float32Array([0, 0.5, -0.5, 1, -1]);

      // Get access to the private method
      const result = (client as any).float32ToInt16(float32Array);

      // Expected values after conversion (scaled by 32767)
      const expected = new Int16Array([0, 16383, -16383, 32767, -32767]);

      // Verify conversion results
      expect(Array.from(result)).toEqual(Array.from(expected));
    });

    it("should clamp values outside the range [-1, 1]", () => {
      // Test with values outside range [-1, 1]
      const float32Array = new Float32Array([1.5, -1.5, 2, -2]);

      // Get access to the private method
      const result = (client as any).float32ToInt16(float32Array);

      // Expected values after conversion (clamped to [-1, 1] then scaled by 32767)
      const expected = new Int16Array([32767, -32767, 32767, -32767]);

      // Verify conversion results
      expect(Array.from(result)).toEqual(Array.from(expected));
    });
  });

  describe("AiolaSocketError", () => {
    it("should correctly serialize to JSON", () => {
      const error = new AiolaSocketError(
        "Test error message",
        AiolaSocketErrorCode.GENERAL_ERROR,
        { additionalInfo: "test" }
      );

      const jsonError = error.toJSON();

      expect(jsonError).toEqual({
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
      });
    });
  });
});

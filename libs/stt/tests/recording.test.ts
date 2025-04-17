import { jest } from "@jest/globals";
import { AiolaStreamingClient, AiolaSocketErrorCode } from "../src";
import {
  mockConfig,
  createMockSocket,
  setupTestHooks,
  setupTestEnv,
  mockAudioContext,
  mockMediaStream,
  mockMediaDevices,
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

describe("AiolaStreamingClient - Recording", () => {
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

  describe("startRecording", () => {
    it("should handle MIC_ERROR when socket is not connected", async () => {
      await client.startRecording();

      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ERROR,
          message: "Socket is not connected. Please call connect first.",
        })
      );
    });

    it("should initialize socket connection and start microphone", async () => {
      const mockMicSource = {
        connect: jest.fn(),
        disconnect: jest.fn(),
      };

      // Mock createMediaStreamSource
      mockAudioContext.createMediaStreamSource.mockReturnValue(mockMicSource);

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();

      expect(mockSocket.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "connect_error",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "transcript",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "events",
        expect.any(Function)
      );
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(
        mockMediaStream
      );
      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledWith(
        expect.stringContaining("blob:")
      );
      expect(mockMicSource.connect).toHaveBeenCalled();
    });

    it("should handle getUserMedia error", async () => {
      const error = new Error("Permission denied");
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(
        error as unknown as DOMException
      );

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start recording and wait for it to complete
      await client.startRecording();

      // Verify error handling
      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ERROR,
          message: expect.stringContaining("Permission denied"),
        })
      );
      // We never started recording, so onStopRecord should not be called
      expect(client["config"].events.onStopRecord).not.toHaveBeenCalled();
      // onStartRecord should not be called when permissions are denied
      expect(client["config"].events.onStartRecord).not.toHaveBeenCalled();
    });

    it("should handle permission denied case", async () => {
      // Mock getUserMedia to simulate permission denied
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(
        new Error("Permission denied") as unknown as DOMException
      );

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start recording and wait for it to complete
      await client.startRecording();

      // Verify that getUserMedia was called with correct parameters
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });

      // Verify error handling
      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ERROR,
          message: expect.stringContaining("Permission denied"),
        })
      );

      // Verify that recording events are not called since we never got permission
      expect(client["config"].events.onStartRecord).not.toHaveBeenCalled();
      expect(client["config"].events.onStopRecord).not.toHaveBeenCalled();

      // Verify that no audio context was created
      expect(mockAudioContext.createMediaStreamSource).not.toHaveBeenCalled();
    });

    it("should only call onStartRecord after getUserMedia permissions are granted", async () => {
      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start recording and wait for it to complete
      await client.startRecording();

      // Verify onStartRecord is called after getUserMedia succeeds
      expect(client["config"].events.onStartRecord).toHaveBeenCalled();
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
    });

    it("should handle multiple start/stop cycles", async () => {
      const mockMicSource = {
        connect: jest.fn(),
        disconnect: jest.fn(),
      };

      mockAudioContext.createMediaStreamSource.mockReturnValue(mockMicSource);

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // First cycle
      await client.startRecording();
      expect(client["config"].events.onStartRecord).toHaveBeenCalledTimes(1);
      expect(client["config"].events.onStopRecord).not.toHaveBeenCalled();

      client.stopRecording();
      expect(client["config"].events.onStopRecord).toHaveBeenCalledTimes(1);

      // Second cycle
      await client.startRecording();
      expect(client["config"].events.onStartRecord).toHaveBeenCalledTimes(2);
      expect(client["config"].events.onStopRecord).toHaveBeenCalledTimes(1);

      client.stopRecording();
      expect(client["config"].events.onStopRecord).toHaveBeenCalledTimes(2);
    });

    it("should call onStopRecord even if cleanup fails", async () => {
      // Mock createMediaStreamSource to throw an error
      mockAudioContext.createMediaStreamSource.mockImplementation(() => {
        throw new Error("Error");
      });

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();

      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ERROR,
          message: expect.stringContaining(
            "Error starting microphone recording"
          ),
        })
      );
      expect(client["config"].events.onStopRecord).toHaveBeenCalled();
    });

    it("should handle microphone recording error", async () => {
      const error = new Error("Error starting microphone recording");
      mockAudioContext.createMediaStreamSource.mockImplementation(() => {
        throw error;
      });

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();

      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ERROR,
          message: expect.stringContaining(
            "Error starting microphone recording"
          ),
        })
      );
    });

    it("should handle socket connection error and stop recording", async () => {
      // Start recording first
      client.connect();
      mockSocket.connected = true;
      await client.startRecording();

      // Spy on stopRecording
      const stopRecordingSpy = jest.spyOn(client, "stopRecording");

      // Simulate connection error
      const error = new Error("Connection failed");
      const connectErrorHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === "connect_error"
      )[1];
      connectErrorHandler(error);

      expect(stopRecordingSpy).toHaveBeenCalled();
      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.NETWORK_ERROR,
          message: expect.stringContaining("Socket connection error"),
        })
      );
    });

    it("should handle general socket error and stop recording", async () => {
      // Start recording first
      client.connect();
      mockSocket.connected = true;
      await client.startRecording();

      // Spy on stopRecording
      const stopRecordingSpy = jest.spyOn(client, "stopRecording");

      // Simulate socket error
      const error = new Error("Socket error occurred");
      const errorHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === "error"
      )[1];
      if (errorHandler) {
        errorHandler(error);
      }

      expect(stopRecordingSpy).toHaveBeenCalled();
      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.GENERAL_ERROR,
          message: expect.stringContaining("Socket error"),
        })
      );
    });

    it("should prevent concurrent recordings", async () => {
      const mockMicSource = {
        connect: jest.fn(),
        disconnect: jest.fn(),
      };

      mockAudioContext.createMediaStreamSource.mockReturnValue(mockMicSource);

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start first recording
      await client.startRecording();
      expect(client["config"].events.onStartRecord).toHaveBeenCalledTimes(1);
      expect(client["config"].events.onError).not.toHaveBeenCalled();

      // Try to start second recording while first is active
      await client.startRecording();
      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ALREADY_IN_USE,
          message:
            "Recording is already in progress. Please stop the current recording first.",
        })
      );
      expect(client["config"].events.onStartRecord).toHaveBeenCalledTimes(1); // Should not have been called again

      // Stop recording
      client.stopRecording();
      expect(client["config"].events.onStopRecord).toHaveBeenCalledTimes(1);
    });
  });

  describe("stopRecording", () => {
    it("should stop microphone and cleanup resources", async () => {
      const mockMicSource = {
        connect: jest.fn(),
        disconnect: jest.fn(),
      };

      mockAudioContext.createMediaStreamSource.mockReturnValue(mockMicSource);

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();
      client.stopRecording();

      expect(mockMicSource.disconnect).toHaveBeenCalled();
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(client["config"].events.onStopRecord).toHaveBeenCalled();
    });

    it("should handle microphone recording error", async () => {
      const error = new Error("Error stopping microphone recording");
      mockAudioContext.close.mockImplementation(() => {
        throw error;
      });

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      // Start recording to set up the audio context
      await client.startRecording();

      // Now stop recording which should trigger the error
      client.stopRecording();

      expect(client["config"].events.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AiolaSocketErrorCode.MIC_ERROR,
          message: expect.stringContaining(
            "Error stopping microphone recording"
          ),
        })
      );
    });
  });

  describe("recordingInProgress flag", () => {
    it("should be false initially", () => {
      // Accessing private property for testing
      expect(client["recordingInProgress"]).toBe(false);
    });

    it("should be true after successful recording start", async () => {
      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();
      // Accessing private property for testing
      expect(client["recordingInProgress"]).toBe(true);
    });

    it("should be false after stopping recording", async () => {
      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();
      client.stopRecording();
      // Accessing private property for testing
      expect(client["recordingInProgress"]).toBe(false);
    });

    it("should be false if getUserMedia fails", async () => {
      const error = new Error("Permission denied");
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(
        error as unknown as DOMException
      );

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();
      // Accessing private property for testing
      expect(client["recordingInProgress"]).toBe(false);
    });

    it("should be false if initialization fails after getUserMedia", async () => {
      // Mock AudioContext to throw error
      (global as any).AudioContext = jest.fn().mockImplementation(() => {
        throw new Error("AudioContext failed");
      });

      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();
      // Accessing private property for testing
      expect(client["recordingInProgress"]).toBe(false);
    });

    it("should be false after socket disconnection", async () => {
      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      await client.startRecording();
      client.closeSocket();
      // Accessing private property for testing
      expect(client["recordingInProgress"]).toBe(false);
    });
  });
});

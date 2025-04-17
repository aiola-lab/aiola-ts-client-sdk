import { jest } from "@jest/globals";
import { AiolaStreamingClient, AiolaSocketErrorCode } from "../src";
import {
  mockConfig,
  createMockSocket,
  setupTestHooks,
  setupTestEnv,
  mockAudioContext,
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

describe("AiolaStreamingClient - Additional Coverage", () => {
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

  it("should handle unexpected transport name", () => {
    // Set up mock socket with an unexpected transport name
    mockSocket.io = {
      engine: {
        transport: {
          name: "unknown_transport", // Not websocket or polling
        },
      },
    };

    // Spy on console.warn
    const consoleWarnSpy = jest.spyOn(console, "warn");

    // Connect to trigger the transport check
    client.connect();

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect"
    )[1];
    connectHandler();

    // Verify warning was logged with the unexpected transport name
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Unexpected transport name:",
      "unknown_transport"
    );

    consoleWarnSpy.mockRestore();
  });

  it("should handle socket.once error event for keywords", () => {
    // Connect first
    client.connect();
    mockSocket.connected = true;

    // Set up the socket.once mock to capture the callback
    let errorCallback: Function;
    mockSocket.once.mockImplementation((event: string, callback: Function) => {
      if (event === "error") {
        errorCallback = callback;
      }
    });

    // Set keywords to trigger the socket.once registration
    client.setKeywords(["test"]);

    // Execute the error callback with a mock error
    if (errorCallback) {
      errorCallback({ message: "Keyword setting error" });
    }

    // Verify error handling
    expect(client["config"].events.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: AiolaSocketErrorCode.KEYWORDS_ERROR,
        message: expect.stringContaining("Socket error"),
      })
    );
  });

  it("should handle nested recording stop errors", async () => {
    // Mock AudioContext.close to throw an error during cleanup
    mockAudioContext.close.mockImplementationOnce(() => {
      throw new Error("Close error");
    });

    // Mock the micSource disconnect to throw an error to test nested error handlers
    const mockMicSource = {
      connect: jest.fn(),
      disconnect: jest.fn().mockImplementation(() => {
        throw new Error("Disconnect error");
      }),
    };

    mockAudioContext.createMediaStreamSource.mockReturnValue(mockMicSource);

    // Connect socket first
    client.connect();
    mockSocket.connected = true;

    // Start recording to initialize the audio context
    await client.startRecording();

    // Force the isStoppingRecording flag to false to ensure the method runs
    (client as any).isStoppingRecording = false;

    // Now stop recording to trigger the cleanup process
    client.stopRecording();

    // Verify multiple errors were handled
    expect(client["config"].events.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: AiolaSocketErrorCode.MIC_ERROR,
        message: expect.stringContaining("Error disconnecting micSource"),
      })
    );

    // Check that we received the closing audioContext error
    expect(client["config"].events.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: AiolaSocketErrorCode.MIC_ERROR,
        message: expect.stringContaining("Error closing audioContext"),
      })
    );
  });

  it("should not attempt to stop recording if already stopping", async () => {
    // Connect socket first
    client.connect();
    mockSocket.connected = true;

    // Start recording
    await client.startRecording();

    // Set isStoppingRecording flag to true
    (client as any).isStoppingRecording = true;

    // Try to stop recording
    client.stopRecording();

    // Verify that no further actions were taken since we're already stopping
    expect(mockAudioContext.close).not.toHaveBeenCalled();
  });
});

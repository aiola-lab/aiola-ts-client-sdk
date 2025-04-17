import { jest } from "@jest/globals";
import { AiolaStreamingClient, AiolaSocketErrorCode } from "../src";
import {
  mockConfig,
  createMockSocket,
  setupTestHooks,
  setupTestEnv,
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

describe("AiolaStreamingClient - Socket", () => {
  let client: AiolaStreamingClient;
  let mockSocket: any;

  setupTestHooks();

  beforeEach(() => {
    mockSocket = createMockSocket();
    (require("socket.io-client") as any).io.mockReturnValue(mockSocket);

    client = new AiolaStreamingClient(mockConfig);
  });

  describe("closeSocket", () => {
    it("should disconnect socket", async () => {
      // Connect socket first
      client.connect();
      mockSocket.connected = true;

      client.closeSocket();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(client["socket"]).toBeNull();
    });

    it("should not throw error when socket is already closed", async () => {
      // Don't connect socket
      client.closeSocket();

      // Should not cause any errors
      expect(client["config"].events.onError).not.toHaveBeenCalled();
    });
  });

  describe("socket events", () => {
    it("should handle transcript event", () => {
      client.connect();

      // Simulate transcript event
      const transcriptData = { text: "test transcript" };
      const transcriptHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === "transcript"
      )?.[1];

      if (transcriptHandler) {
        transcriptHandler(transcriptData);
        expect(client["config"].events.onTranscript).toHaveBeenCalledWith(
          transcriptData
        );
      }
    });

    it("should handle events event", () => {
      client.connect();

      // Simulate events event
      const eventsData = { type: "test_event", data: { value: "test" } };
      const eventsHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === "events"
      )?.[1];

      if (eventsHandler) {
        eventsHandler(eventsData);
        expect(client["config"].events.onEvents).toHaveBeenCalledWith(
          eventsData
        );
      }
    });

    it("should not call event handlers that were not provided", () => {
      // Create client without some event handlers
      const clientWithoutHandlers = new AiolaStreamingClient({
        ...mockConfig,
        events: {
          ...mockConfig.events,
          onTranscript: undefined,
          onEvents: undefined,
        },
      });

      clientWithoutHandlers.connect();

      // Get transcript and events handlers
      const transcriptHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === "transcript"
      )?.[1];

      const eventsHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === "events"
      )?.[1];

      // Call the handlers if they exist
      if (transcriptHandler) {
        transcriptHandler({ text: "test" });
      }

      if (eventsHandler) {
        eventsHandler({ type: "test" });
      }

      // No errors should occur
      expect(
        clientWithoutHandlers["config"].events.onError
      ).not.toHaveBeenCalled();
    });
  });
});

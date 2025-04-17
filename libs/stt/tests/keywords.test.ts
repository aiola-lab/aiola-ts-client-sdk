import { jest } from "@jest/globals";
import {
  AiolaStreamingClient,
  AiolaSocketError,
  AiolaSocketErrorCode,
} from "../src";
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

describe("AiolaStreamingClient - Keywords", () => {
  let client: AiolaStreamingClient;
  let mockSocket: any;

  setupTestHooks();

  beforeEach(() => {
    mockSocket = createMockSocket();
    (require("socket.io-client") as any).io.mockReturnValue(mockSocket);

    client = new AiolaStreamingClient(mockConfig);
  });

  it("should throw KEYWORDS_ERROR for invalid input", () => {
    expect(() => client.setKeywords(null as any)).toThrow(AiolaSocketError);
    expect(() => client.setKeywords(null as any)).toThrow(
      "Keywords must be a valid array"
    );

    expect(() => client.setKeywords(undefined as any)).toThrow(
      AiolaSocketError
    );
    expect(() => client.setKeywords(undefined as any)).toThrow(
      "Keywords must be a valid array"
    );

    expect(() => client.setKeywords([""])).toThrow(AiolaSocketError);
    expect(() => client.setKeywords([""])).toThrow(
      "At least one valid keyword must be provided"
    );
  });

  it("should clear keywords when empty array is provided", () => {
    // First set some keywords
    client.setKeywords(["test", "keywords"]);
    expect(client.getActiveKeywords()).toEqual(["test", "keywords"]);

    // Now clear them
    client.setKeywords([]);
    expect(client.getActiveKeywords()).toEqual([]);
  });

  it("should emit keywords when socket is connected", async () => {
    client.connect();
    mockSocket.connected = true;

    const keywords = ["test", "keywords"];
    client.setKeywords(keywords);

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "set_keywords",
      expect.any(Uint8Array),
      expect.any(Function)
    );
  });

  it("should store keywords and not emit when socket is not connected", () => {
    const keywords = ["test", "keywords"];
    client.setKeywords(keywords);

    expect(client.getActiveKeywords()).toEqual(keywords);
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("should handle successful keyword setting", async () => {
    client.connect();
    mockSocket.connected = true;

    const keywords = ["test", "keywords"];
    client.setKeywords(keywords);

    // Simulate successful response
    const callback = mockSocket.emit.mock.calls[0][2];
    callback({ status: "received" });

    expect(client["config"].events.onKeyWordSet).toHaveBeenCalledWith(keywords);
    expect(client["config"].events.onError).not.toHaveBeenCalled();
  });

  it("should handle keyword setting failure", async () => {
    client.connect();
    mockSocket.connected = true;

    const keywords = ["test", "keywords"];
    client.setKeywords(keywords);

    // Simulate error response
    const callback = mockSocket.emit.mock.calls[0][2];
    callback({ error: "Failed to set keywords" });

    expect(client["config"].events.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: AiolaSocketErrorCode.KEYWORDS_ERROR,
        message: expect.stringContaining("Failed to set keywords"),
      })
    );
  });

  it("should emit empty keywords to server when clearing keywords and socket is connected", () => {
    client.connect();
    mockSocket.connected = true;

    // Clear keywords
    client.setKeywords([]);

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "set_keywords",
      expect.any(Uint8Array),
      expect.any(Function)
    );

    // Simulate successful response
    const callback = mockSocket.emit.mock.calls[0][2];
    callback({ status: "received" });

    expect(client["config"].events.onKeyWordSet).toHaveBeenCalledWith([]);
    expect(client["config"].events.onError).not.toHaveBeenCalled();
  });

  it("should handle server error when clearing keywords", () => {
    client.connect();
    mockSocket.connected = true;

    // Clear keywords
    client.setKeywords([]);

    // Simulate error response
    const callback = mockSocket.emit.mock.calls[0][2];
    callback({ error: "Failed to clear keywords" });

    expect(client["config"].events.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: AiolaSocketErrorCode.KEYWORDS_ERROR,
        message: expect.stringContaining("Failed to clear keywords"),
      })
    );
  });

  it("should resend keywords on reconnection", async () => {
    const keywords = ["test", "keywords"];
    client.setKeywords(keywords);

    client.connect();

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect"
    )[1];
    mockSocket.connected = true;
    connectHandler();

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "set_keywords",
      expect.any(Uint8Array),
      expect.any(Function)
    );
  });
});

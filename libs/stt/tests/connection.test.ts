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

describe("AiolaStreamingClient - Connection", () => {
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

  it("should handle socket initialization failure", async () => {
    // Mock io to return null
    (require("socket.io-client") as any).io.mockReturnValueOnce(null);

    client.connect();

    expect(client["config"].events.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: AiolaSocketErrorCode.NETWORK_ERROR,
        message: "Failed to initialize socket connection",
      })
    );
  });

  it("should start recording automatically when autoRecord is true", async () => {
    // Connect with autoRecord set to true
    client.connect(true);

    // Simulate successful connection
    mockSocket.connected = true;
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect"
    )[1];
    await connectCallback();

    // Wait for any async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify that onStartRecord was called
    expect(client["config"].events.onStartRecord).toHaveBeenCalled();
  });

  it("should not start recording automatically when autoRecord is false", async () => {
    // Connect with autoRecord set to false (default)
    client.connect();

    // Simulate successful connection
    mockSocket.connected = true;
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect"
    )[1];
    await connectCallback();

    // Wait for any async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify that onStartRecord was not called
    expect(client["config"].events.onStartRecord).not.toHaveBeenCalled();
  });

  it("should call onConnect with websocket transport when using websocket", () => {
    // Mock the socket's transport name
    mockSocket.io = {
      engine: {
        transport: {
          name: "websocket",
        },
      },
    };

    client.connect();

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect"
    )[1];
    connectHandler();

    expect(client["config"].events.onConnect).toHaveBeenCalledWith("websocket");
  });

  it("should call onConnect with polling transport when using polling", () => {
    // Mock the socket's transport name
    mockSocket.io = {
      engine: {
        transport: {
          name: "polling",
        },
      },
    };

    client.connect();

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect"
    )[1];
    connectHandler();

    expect(client["config"].events.onConnect).toHaveBeenCalledWith("polling");
  });

  it("should call onConnect with polling transport when websocket upgrade fails", () => {
    // Create a new client with websocket transport configured
    const websocketClient = new AiolaStreamingClient({
      ...mockConfig,
      transports: "websocket",
    });

    // Mock the socket's transport name to simulate websocket upgrade failure
    mockSocket.io = {
      engine: {
        transport: {
          name: "polling", // Even though websocket was requested, it fell back to polling
        },
      },
    };

    websocketClient.connect();

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect"
    )[1];
    connectHandler();

    // Should still call onConnect with the actual transport being used (polling)
    expect(websocketClient["config"].events.onConnect).toHaveBeenCalledWith(
      "polling"
    );
  });

  it("should handle socket connection error", async () => {
    client.connect();

    // Simulate connection error
    const error = new Error("Connection failed");
    const connectErrorHandler = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "connect_error"
    )[1];
    connectErrorHandler(error);

    expect(client["config"].events.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: AiolaSocketErrorCode.NETWORK_ERROR,
        message: expect.stringContaining("Socket connection error"),
      })
    );
  });

  it("should call onDisconnect when socket disconnects", () => {
    client.connect();

    // Simulate disconnection
    const disconnectHandler = mockSocket.on.mock.calls.find(
      (call: [string, Function]) => call[0] === "disconnect"
    )[1];
    disconnectHandler();

    expect(client["config"].events.onDisconnect).toHaveBeenCalled();
  });

  it("should call onDisconnect when closeSocket is called", () => {
    client.connect();
    client.closeSocket();

    expect(client["config"].events.onDisconnect).toHaveBeenCalled();
  });

  it("should not call onDisconnect if handler is not provided", () => {
    // Create client without onDisconnect handler
    const clientWithoutDisconnect = new AiolaStreamingClient({
      ...mockConfig,
      events: {
        ...mockConfig.events,
        onDisconnect: undefined,
      },
    });

    clientWithoutDisconnect.connect();
    clientWithoutDisconnect.closeSocket();

    // Verify no error occurred
    expect(
      clientWithoutDisconnect["config"].events.onError
    ).not.toHaveBeenCalled();
  });
});

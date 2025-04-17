import { jest } from "@jest/globals";
import { AiolaSocketConfig, AiolaSocketNamespace } from "../src";

// Mock AudioContext and related APIs
export const mockAudioContext = {
  createMediaStreamSource: jest.fn(),
  audioWorklet: {
    addModule: jest.fn(),
  },
  close: jest.fn(),
};

export const mockAudioWorkletNode = {
  port: { onmessage: jest.fn() },
  connect: jest.fn(),
};

// Create mock MediaStream
export const mockMediaStream = {
  getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
} as unknown as MediaStream;

// Setup mock mediaDevices
export const mockMediaDevices = {
  getUserMedia: jest
    .fn<() => Promise<MediaStream>>()
    .mockResolvedValue(mockMediaStream),
};

export const mockConfig: AiolaSocketConfig = {
  baseUrl: "http://test.com",
  namespace: AiolaSocketNamespace.EVENTS,
  bearer: "test-token",
  queryParams: {},
  events: {
    onTranscript: jest.fn(),
    onEvents: jest.fn(),
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onStartRecord: jest.fn(),
    onStopRecord: jest.fn(),
    onKeyWordSet: jest.fn(),
    onError: jest.fn(),
  },
};

export function createMockSocket() {
  return {
    on: jest.fn(),
    emit: jest.fn(),
    connected: false,
    disconnect: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    io: {
      engine: {
        transport: {
          name: "websocket",
        },
      },
    },
  };
}

export function setupTestEnv() {
  // Mock window.AudioContext
  (global as any).AudioContext = jest
    .fn()
    .mockImplementation(() => mockAudioContext);

  (global as any).AudioWorkletNode = jest
    .fn()
    .mockImplementation(() => mockAudioWorkletNode);

  // Mock URL object
  (global as any).URL = {
    createObjectURL: jest.fn().mockReturnValue("blob:mock-url"),
    revokeObjectURL: jest.fn(),
  };

  // Mock navigator.mediaDevices if needed
  if (!global.navigator) {
    (global as any).navigator = {};
  }

  // Set up mediaDevices
  Object.defineProperty(navigator, "mediaDevices", {
    value: mockMediaDevices,
    writable: true,
  });

  // Mock TextEncoder
  (global as any).TextEncoder = class {
    encode(str: string): Uint8Array {
      return new Uint8Array(Buffer.from(str));
    }
  };
}

export function setupTestHooks() {
  let consoleErrorSpy: any;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Suppress console output for all tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    // Reset getUserMedia mock before each test
    mockMediaDevices.getUserMedia.mockReset();
    mockMediaDevices.getUserMedia.mockResolvedValue(mockMediaStream);
  });

  afterEach(() => {
    // Restore console output
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });
}

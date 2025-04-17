import "whatwg-fetch";
import { io } from "socket.io-client";
import { setupTestEnv } from "./tests/utils";

// Setup all global mocks needed for tests
setupTestEnv();

// Additional mocks that aren't in utils.ts

// Mock Blob (not in utils.ts)
global.Blob = jest.fn().mockImplementation(() => ({})) as any;

// Mock document.cookie (not in utils.ts)
Object.defineProperty(document, "cookie", {
  writable: true,
  value: "",
});

// Mock window.io (not in utils.ts)
(global as any).window = {
  ...global.window,
  io,
};

// Socket.io-client mock
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

// Note: The setupTestEnv function from utils.ts includes all the necessary mocks:
// - AudioContext and AudioWorkletNode
// - URL object
// - navigator.mediaDevices
// - TextEncoder

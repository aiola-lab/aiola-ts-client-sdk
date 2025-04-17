import { jest } from "@jest/globals";
import { setupTestEnv } from "./utils";

describe("Test Utilities", () => {
  it("should setup global mocks for testing", () => {
    // Preserve original navigator mediaDevices
    const originalMediaDevices =
      global.navigator && (global.navigator as any).mediaDevices;

    // Temporarily set to undefined instead of trying to delete
    if (global.navigator) {
      (global.navigator as any).mediaDevices = undefined;
    }

    // Run the setup function
    setupTestEnv();

    // Verify global objects were mocked
    expect(global.AudioContext).toBeDefined();
    expect(global.AudioWorkletNode).toBeDefined();
    expect(global.URL).toBeDefined();
    expect(global.navigator).toBeDefined();
    expect((global.navigator as any).mediaDevices).toBeDefined();
    expect((global.navigator as any).mediaDevices.getUserMedia).toBeDefined();
    expect(global.TextEncoder).toBeDefined();

    // Restore original if needed
    if (originalMediaDevices && global.navigator) {
      (global.navigator as any).mediaDevices = originalMediaDevices;
    }
  });
});

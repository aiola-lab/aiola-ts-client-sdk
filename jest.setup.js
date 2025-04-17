require("@testing-library/jest-dom");

// Mock window.AudioContext
class MockAudioContext {
  createMediaStreamSource() {
    return {
      connect: jest.fn(),
    };
  }

  audioWorklet = {
    addModule: jest.fn().mockResolvedValue(undefined),
  };
}

global.AudioContext = MockAudioContext;

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
        },
      ],
    }),
  },
});

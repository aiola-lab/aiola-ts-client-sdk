import { io } from "socket.io-client";

declare global {
  interface Window {
    io: typeof io;
  }
}

export {};

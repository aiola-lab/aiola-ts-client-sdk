import "whatwg-fetch";
import { ReadableStream } from "web-streams-polyfill";

// Add Response to global scope
global.Response = Response;
global.ReadableStream = ReadableStream;

// Mock fetch
global.fetch = jest.fn();

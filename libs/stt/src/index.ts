import { Socket, io } from "socket.io-client";

export class AiolaStreamingClient {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private recordingInProgress: boolean = false;
  private config: AiolaSocketConfig & {
    micConfig: NonNullable<AiolaSocketConfig["micConfig"]>;
  };
  private activeKeywords: string[] = [];
  private isStoppingRecording: boolean = false;

  constructor(config: AiolaSocketConfig) {
    // Set default micConfig values if not provided
    this.config = {
      ...config,
      micConfig: {
        sampleRate: 16000,
        chunkSize: 4096,
        channels: 1,
        ...(config.micConfig || {}),
      },
    };
  }

  /**
   * Handle error by logging it and emitting the error event
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  private handleError(
    message: string,
    code: AiolaSocketErrorCode = AiolaSocketErrorCode.GENERAL_ERROR,
    details?: Record<string, any>
  ): void {
    const error = new AiolaSocketError(message, code, details);
    console.error(error.toString());
    this.config.events.onError?.(error);
  }

  /**
   * Get the currently active keywords
   * @returns The array of active keywords
   */
  public getActiveKeywords(): string[] {
    return [...this.activeKeywords];
  }

  /**
   * Connect to the aiOla streaming service
   */
  public connect(autoRecord = false): void {
    const { bearer, transports, events } = this.config;
    const _bearer = `Bearer ${bearer}`;
    const _transports =
      transports === "polling" ? ["polling"] : ["polling", "websocket"];

    // Clean up any existing socket connection
    this.cleanupSocket();

    this.socket = io(this.buildEndpoint(), {
      withCredentials: true,
      path: this.buildPath(),
      query: {
        ...this.config.queryParams,
        'x-aiola-api-key': bearer,
      },
      transports: _transports,
      transportOptions: {
        polling: {
          extraHeaders: { Authorization: _bearer },
        },
        websocket: {
          extraHeaders: { Authorization: _bearer },
        },
      },
    });

    if (!this.socket) {
      this.handleError(
        "Failed to initialize socket connection",
        AiolaSocketErrorCode.NETWORK_ERROR
      );
      return;
    }

    this.socket.on("connect", () => {
      const transportName = this.socket?.io?.engine?.transport?.name;

      if (transportName === "polling" || transportName === "websocket") {
        events.onConnect?.(transportName);
      } else {
        console.warn("Unexpected transport name:", transportName);
      }

      if (autoRecord) {
        this.startRecording();
      }

      // If there are active keywords, resend them on reconnection
      if (this.activeKeywords.length > 0) {
        this.setKeywords(this.activeKeywords);
      }
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.stopRecording();
      this.handleError(
        `Socket error: ${error.message}`,
        AiolaSocketErrorCode.GENERAL_ERROR,
        { originalError: error }
      );
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.stopRecording();
      this.closeSocket();
      this.handleError(
        `Socket connection error: ${error.message}`,
        AiolaSocketErrorCode.NETWORK_ERROR,
        { originalError: error }
      );
    });

    this.socket.on("disconnect", () => {
      this.cleanupSocket();
    });

    this.socket.on("transcript", events.onTranscript ?? (() => {}));
    this.socket.on("events", events.onEvents ?? (() => {}));
  }

  private cleanupSocket(): void {
    if (this.socket) {
      // Remove all event listeners
      this.socket.removeAllListeners();

      // Only stop recording if it's actually in progress
      if (this.recordingInProgress) {
        this.stopRecording();
      }

      // Emit disconnect event
      this.config.events.onDisconnect?.();

      // Clear the socket reference
      this.socket = null;
    }
  }

  public closeSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.cleanupSocket();
    }
  }

  public async startRecording(): Promise<void> {
    if (!this.socket?.connected) {
      this.handleError(
        "Socket is not connected. Please call connect first.",
        AiolaSocketErrorCode.MIC_ERROR
      );
      return;
    }

    // Check if recording is already in progress
    if (this.recordingInProgress) {
      this.handleError(
        "Recording is already in progress. Please stop the current recording first.",
        AiolaSocketErrorCode.MIC_ALREADY_IN_USE
      );
      return;
    }

    const { micConfig } = this.config;
    try {
      // Get media stream first before setting recordingInProgress
      this.mediaStream = await navigator.mediaDevices
        .getUserMedia({
          audio: true,
        })
        .catch((error) => {
          this.handleError(
            `Failed to access microphone: ${error.message}`,
            AiolaSocketErrorCode.MIC_ERROR,
            { originalError: error }
          );
          return null;
        });

      if (!this.mediaStream) {
        return;
      }

      // Set recordingInProgress only after we successfully get the media stream
      this.recordingInProgress = true;
      this.config.events.onStartRecord?.();

      this.audioContext = new AudioContext({
        sampleRate: micConfig.sampleRate,
      });
      this.micSource = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );

      const processorCode = `
        class AudioProcessor extends AudioWorkletProcessor {
          constructor(options) {
            super();
            this.chunkSize = options.processorOptions.chunkSize;
            this.buffer = new Float32Array(this.chunkSize);
            this.bufferIndex = 0;
          }

          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (!input || !input[0]) return true;

            const channel = input[0];
            for (let i = 0; i < channel.length; i++) {
              this.buffer[this.bufferIndex] = channel[i];
              this.bufferIndex++;

              if (this.bufferIndex >= this.chunkSize) {
                this.port.postMessage(this.buffer);
                this.bufferIndex = 0;
              }
            }

            return true;
          }
        }

        registerProcessor("audio-processor", AudioProcessor);
      `;

      const blob = new Blob([processorCode], {
        type: "application/javascript",
      });
      const url = URL.createObjectURL(blob);

      await this.audioContext.audioWorklet.addModule(url);

      this.audioWorkletNode = new AudioWorkletNode(
        this.audioContext,
        "audio-processor",
        {
          processorOptions: { chunkSize: micConfig.chunkSize },
        }
      );

      this.audioWorkletNode.port.onmessage = async (event: MessageEvent) => {
        try {
          const chunk = event.data;
          const int16Array = this.float32ToInt16(chunk);
          this.socket?.emit("binary_data", int16Array.buffer);
        } catch (error) {
          console.error("Error processing chunk:", error);
        }
      };

      this.micSource.connect(this.audioWorkletNode);
    } catch (error) {
      // Ensure recordingInProgress is set to false before cleanup
      this.recordingInProgress = false;
      this.stopRecording();
      this.handleError(
        `Error starting microphone recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        AiolaSocketErrorCode.MIC_ERROR,
        { originalError: error }
      );
    }
  }

  public stopRecording(): void {
    if (this.isStoppingRecording) {
      return;
    }

    try {
      this.isStoppingRecording = true;
      this.config.events.onStopRecord?.();

      // Disconnect and cleanup micSource
      if (this.micSource) {
        try {
          this.micSource.disconnect();
        } catch (error) {
          this.handleError(
            `Error disconnecting micSource: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            AiolaSocketErrorCode.MIC_ERROR,
            { originalError: error }
          );
        } finally {
          this.micSource = null;
        }
      }

      // Cleanup audioWorkletNode
      if (this.audioWorkletNode) {
        try {
          this.audioWorkletNode.disconnect();
        } catch (error) {
          this.handleError(
            `Error disconnecting audioWorkletNode: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            AiolaSocketErrorCode.MIC_ERROR,
            { originalError: error }
          );
        } finally {
          this.audioWorkletNode = null;
        }
      }

      // Stop and cleanup mediaStream
      if (this.mediaStream) {
        try {
          const tracks = this.mediaStream.getTracks();
          tracks.forEach((track) => {
            try {
              track.stop();
            } catch (error) {
              this.handleError(
                `Error stopping track: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
                AiolaSocketErrorCode.MIC_ERROR,
                { originalError: error }
              );
            }
          });
        } catch (error) {
          this.handleError(
            `Error stopping mediaStream: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            AiolaSocketErrorCode.MIC_ERROR,
            { originalError: error }
          );
        } finally {
          this.mediaStream = null;
        }
      }

      // Close and cleanup audioContext
      if (this.audioContext) {
        try {
          this.audioContext.close();
        } catch (error) {
          this.handleError(
            `Error closing audioContext: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            AiolaSocketErrorCode.MIC_ERROR,
            { originalError: error }
          );
        } finally {
          this.audioContext = null;
        }
      }
    } catch (error) {
      this.handleError(
        `Error stopping microphone recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        AiolaSocketErrorCode.MIC_ERROR,
        { originalError: error }
      );
    } finally {
      // Ensure all resources are nullified even if there was an error
      this.micSource = null;
      this.mediaStream = null;
      this.audioContext = null;
      this.audioWorkletNode = null;
      this.recordingInProgress = false;
      this.isStoppingRecording = false;
    }
  }

  /**
   * Set keywords for speech recognition
   * @param keywords Array of keywords to listen for
   * @throws {AiolaSocketError} If keywords are invalid or if there's an error setting them
   */
  public setKeywords(keywords: string[]): void {
    if (!Array.isArray(keywords)) {
      throw new AiolaSocketError(
        "Keywords must be a valid array",
        AiolaSocketErrorCode.KEYWORDS_ERROR
      );
    }

    // Allow empty array to clear keywords
    if (keywords.length === 0) {
      this.activeKeywords = [];
      if (this.socket?.connected) {
        this.socket.emit(
          "set_keywords",
          new Uint8Array(),
          (ack: { status: string; error?: string }) => {
            if (ack?.error) {
              console.error("Server returned error:", ack.error);
              this.handleError(
                `Server error: ${ack.error}`,
                AiolaSocketErrorCode.KEYWORDS_ERROR
              );
              return;
            }
            if (ack?.status === "received") {
              this.config.events.onKeyWordSet?.([]);
            }
          }
        );
      }
      return;
    }

    const validKeywords = keywords
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (validKeywords.length === 0) {
      throw new AiolaSocketError(
        "At least one valid keyword must be provided",
        AiolaSocketErrorCode.KEYWORDS_ERROR
      );
    }

    // Store the keywords immediately, they will be the active set whether connected or not
    this.activeKeywords = validKeywords;

    if (!this.socket || !this.socket.connected) {
      return;
    }

    try {
      const binaryData = new TextEncoder().encode(
        JSON.stringify(validKeywords)
      );
      this.socket.emit(
        "set_keywords",
        binaryData,
        (ack: { status: string; error?: string }) => {
          if (ack?.error) {
            console.error("Server returned error:", ack.error);
            this.handleError(
              `Server error: ${ack.error}`,
              AiolaSocketErrorCode.KEYWORDS_ERROR
            );
            return;
          }

          if (ack?.status === "received") {
            this.config.events.onKeyWordSet?.(validKeywords);
          }
        }
      );

      // Listen for server errors
      this.socket.once("error", (error: any) => {
        console.error("Socket error:", error);
        this.handleError(
          `Socket error: ${error.message || "Unknown error"}`,
          AiolaSocketErrorCode.KEYWORDS_ERROR
        );
      });
    } catch (error) {
      this.handleError(
        `Error emitting keywords: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        AiolaSocketErrorCode.KEYWORDS_ERROR,
        { originalError: error }
      );
      throw error;
    }
  }

  //---- Private methods ----//

  private buildEndpoint(): string {
    return `${this.config.baseUrl}${this.config.namespace}`;
  }

  private buildPath(): string {
    return `/api/voice-streaming/socket.io`;
  }

  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      int16Array[i] = Math.min(1, Math.max(-1, float32Array[i])) * 32767;
    }
    return int16Array;
  }
}

/**
 * Configuration for the aiOla streaming client
 */
export interface AiolaSocketConfig {
  baseUrl: string;
  namespace: AiolaSocketNamespace;
  bearer: string;
  queryParams: Record<string, string>;
  micConfig?: {
    sampleRate: number;
    chunkSize: number;
    channels: number;
  };
  events: {
    onTranscript?: (data: any) => void;
    onEvents?: (data: any) => void;
    onConnect?: (transportProtocolName: "polling" | "websocket") => void;
    onDisconnect?: () => void;
    onStartRecord?: () => void;
    onStopRecord?: () => void;
    onKeyWordSet?: (keywords: string[]) => void;
    onError?: (error: AiolaSocketError) => void;
  };
  transports?: "polling" | "websocket" | "all";
}

export enum AiolaSocketNamespace {
  EVENTS = "/events",
}

/**
 * Custom error codes for aiOla SDK errors
 */
export enum AiolaSocketErrorCode {
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  NETWORK_ERROR = "NETWORK_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  KEYWORDS_ERROR = "KEYWORDS_ERROR",
  MIC_ERROR = "MIC_ERROR",
  MIC_ALREADY_IN_USE = "MIC_ALREADY_IN_USE",
  STREAMING_ERROR = "STREAMING_ERROR",
  GENERAL_ERROR = "GENERAL_ERROR",
}

/**
 * Custom error class for aiOla SDK
 */
export class AiolaSocketError extends Error {
  public readonly code: AiolaSocketErrorCode;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: AiolaSocketErrorCode = AiolaSocketErrorCode.GENERAL_ERROR,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "AiolaError";
    this.code = code;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AiolaSocketError.prototype);
  }

  /**
   * Creates a string representation of the error including the error code
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  /**
   * Creates a plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

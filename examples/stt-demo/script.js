import {
  AiolaStreamingClient,
  AiolaSocketError,
  AiolaSocketErrorCode,
  AiolaSocketNamespace,
} from "@aiola/web-sdk-stt";

const baseUrl = "<BASE_URL>";
const bearer = "<BEARER>";
const flowId = "<FLOW_ID>";
const executionId = "<EXECUTION_ID>";
const langCode = "<LANG_CODE>";
const timeZone = "<TIME_ZONE>";

const messageContainer = document.getElementById("messageContainer");
const socketToggle = document.getElementById("socketToggle");
const recordingToggle = document.getElementById("recordingToggle");
const keywordsInput = document.getElementById("keywordsInput");
const setKeywordsButton = document.getElementById("setKeywordsButton");

function showMessage(message, isError = false) {
  messageContainer.innerHTML = `<span class="${
    isError ? "error" : ""
  }">${message}</span>`;
}

function handleError(error, context = "") {
  console.error(`Error in ${context}:`, error);
  let errorMessage = error.message || "An unexpected error occurred";

  if (error instanceof AiolaSocketError) {
    switch (error.code) {
      case AiolaSocketErrorCode.NETWORK_ERROR:
        errorMessage = `Network connection error. ${error.message}`;
        break;
      case AiolaSocketErrorCode.AUTHENTICATION_ERROR:
        errorMessage = `Authentication error. ${error.message}`;
        break;
      case AiolaSocketErrorCode.MIC_ERROR:
        errorMessage = `Microphone error. ${error.message}`;
        break;
      case AiolaSocketErrorCode.MIC_ALREADY_IN_USE:
        // Silently handle concurrent recording attempt
        console.log("Mic already in use");
        return;
      case AiolaSocketErrorCode.KEYWORDS_ERROR:
        errorMessage = `Error setting keywords. ${error.message}`;
        break;
      case AiolaSocketErrorCode.STREAMING_ERROR:
        errorMessage = `Streaming error. ${error.message}`;
        break;
      default:
        errorMessage = error.message;
    }

    console.log("errorMessage", errorMessage);
    showMessage(errorMessage, true);
  } else {
    showMessage(errorMessage, true);
  }
}

function updateRecordingStatus(recording) {
  recordingToggle.classList.toggle("active", recording);
  const micIcon = recordingToggle.querySelector("i");
  if (micIcon) {
    micIcon.className = recording ? "ti ti-microphone" : "ti ti-microphone-off";
  }
}

function updateSocketStatus(connected) {
  socketToggle.classList.toggle("active", connected);
  const socketIcon = socketToggle.querySelector("i");
  if (socketIcon) {
    socketIcon.className = connected
      ? "ti ti-plug-connected"
      : "ti ti-plug-connected-x";
  }
  showMessage(
    connected ? "Socket connected successfully" : "Socket disconnected"
  );
}

const client = new AiolaStreamingClient({
  baseUrl: baseUrl,
  bearer: bearer,
  namespace: AiolaSocketNamespace.EVENTS,
  transports: "websocket",
  queryParams: {
    flow_id: flowId,
    execution_id: executionId,
    lang_code: langCode,
    time_zone: timeZone,
  },
  events: {
    onTranscript: (data) => {
      console.log("onTranscript callback called");
      console.log("Transcript:", data.transcript);
      const transcriptDiv = document.getElementById("transcript");
      const newTranscript = document.createElement("div");
      newTranscript.textContent = data.transcript;
      transcriptDiv.appendChild(newTranscript);
      transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    },
    onEvents: (data) => {
      console.log("onEvents callback called");
      console.log("Event:", data);
    },
    onConnect: (transportName) => {
      console.log("Connected using:", transportName);
      updateSocketStatus(true);
      showMessage("Connected to the server");
    },
    onDisconnect: () => {
      console.log("onDisconnect callback called");
      updateSocketStatus(false);
      showMessage("Disconnected from the server");
    },
    onError: (error) => {
      console.log("onError callback called");
      handleError(error, "connection");
    },
    onStartRecord: () => {
      console.log("onStartRecord callback called");
      showMessage("Recording started");
      updateRecordingStatus(true);
    },
    onStopRecord: () => {
      console.log("onStopRecord callback called");
      showMessage("Recording stopped");
      updateRecordingStatus(false);
    },
    onKeyWordSet: (keywords) => {
      console.log("onKeyWordSet callback called");
      showMessage(`Keywords set: ${keywords.join(", ")}`);
    },
    onKeyWordsError: (error) => {
      console.log("onKeyWordsError callback called");
      handleError(error, "keywords");
    },
    onAudioQualityIssue: (issue) => {
      console.warn("Audio quality issue detected:", issue);
      let message = "";
      switch (issue) {
        case AudioQualityIssue.SILENCE:
          message = "⚠️ Microphone is too quiet or not picking up sound";
          break;
        case AudioQualityIssue.CLIPPING:
          message = "⚠️ Microphone is too loud and causing distortion";
          break;
        case AudioQualityIssue.LOW_SIGNAL:
          message = "⚠️ Microphone signal is too weak";
          break;
        case AudioQualityIssue.NO_SIGNAL:
          message = "⚠️ No audio signal detected from microphone";
          break;
        case AudioQualityIssue.GOOD_SIGNAL:
          message = "✅ Microphone signal is good";
          break;
      }
      // Add more detailed logging
      console.debug("Audio quality thresholds:", {
        silenceThreshold:
          client.config.micConfig.qualityThresholds.silenceThreshold,
        clippingThreshold:
          client.config.micConfig.qualityThresholds.clippingThreshold,
        minSignalLevel:
          client.config.micConfig.qualityThresholds.minSignalLevel,
      });
      // Only show error messages, not the good signal message
      if (issue !== AudioQualityIssue.GOOD_SIGNAL) {
        showMessage(message, true);
      }
    },
  },
});

socketToggle.addEventListener("click", async () => {
  console.log("socketToggle clicked");
  const isConnected = socketToggle.classList.contains("active");
  try {
    if (isConnected) {
      client.closeSocket();
      const isRecording = recordingToggle.classList.contains("active");
    } else {
      showMessage("Connecting...");
      client.connect();
    }
  } catch (error) {
    handleError(error, "socket toggle");
  }
});

recordingToggle.addEventListener("click", async () => {
  const isRecording = recordingToggle.classList.contains("active");
  try {
    if (isRecording) {
      client.stopRecording();
    } else {
      await client.startRecording();
    }
  } catch (error) {
    handleError(error, "recording toggle had failed");
  }
});

setKeywordsButton.addEventListener("click", () => {
  const keywords = keywordsInput.value
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  try {
    client.setKeywords(keywords);
    showMessage(`Keywords set: ${keywords.join(", ")}`);
  } catch (error) {
    handleError(error, "keywords");
  }
});

// Add keyboard support for setting keywords
keywordsInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    setKeywordsButton.click();
  }
});

import AiolaTTSClient from "@aiola/web-sdk-tts";

const client = new AiolaTTSClient({
  baseUrl: "https://api.aiola.ai",
  bearer: "qLDczk3BESZt2vcU1Tqqb1sSJ9DjsKYGygKdRPhLSg0p", //Playground token - Limited usage!!
});

const textInput = document.getElementById("textInput");
const voiceSelect = document.getElementById("voiceSelect");
const synthesizeBtn = document.getElementById("synthesizeBtn");
const streamBtn = document.getElementById("streamBtn");
const audioPlayer = document.getElementById("audioPlayer");

// Populate voice select dropdown
const voices = client.getVoices();
console.log(voices);
voiceSelect.innerHTML = Object.entries(voices)
  .map(([name, id]) => `<option value="${id}">${name}</option>`)
  .join("");

synthesizeBtn.addEventListener("click", async () => {
  try {
    synthesizeBtn.classList.add("button-selected");
    streamBtn.classList.remove("button-selected");
    const text = textInput.value;
    const voice = voiceSelect.value;

    synthesizeBtn.disabled = true;
    // const audioBuffer = await client.synthesizeSpeech(text, voice);

    // const blob = new Blob([audioBuffer], { type: "audio/wav" });
    const blob = await client.synthesizeSpeech(text, voice);
    const url = URL.createObjectURL(blob);

    audioPlayer.src = url;
    audioPlayer.style.display = "block";
    audioPlayer.play();
  } catch (error) {
    synthesizeBtn.classList.remove("button-selected");
    console.error("Synthesis failed:", error);
    alert("Failed to synthesize speech. Check console for details.");
  } finally {
    synthesizeBtn.disabled = false;
  }
});

streamBtn.addEventListener("click", async () => {
  try {
    synthesizeBtn.classList.remove("button-selected");
    streamBtn.classList.add("button-selected");
    const text = textInput.value;
    const voice = voiceSelect.value;

    streamBtn.disabled = true;
    const stream = await client.streamSpeech(text, voice);

    const response = new Response(stream);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    audioPlayer.src = url;
    audioPlayer.style.display = "block";
    audioPlayer.play();
  } catch (error) {
    synthesizeBtn.classList.remove("button-selected");
    console.error("Streaming failed:", error);
    alert("Failed to stream speech. Check console for details.");
  } finally {
    streamBtn.disabled = false;
  }
});

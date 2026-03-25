/**
 * george.js — George voice agent frontend module
 *
 * Usage:
 *   import { startGeorge, stopGeorge, onStatusChange } from './george.js';
 *
 *   onStatusChange(({ status, ...data }) => {
 *     // status values: connecting | listening | processing | speaking | transcript
 *     //                response | done | error | disconnected | stopped
 *   });
 *
 *   await startGeorge('wss://your-george-server/ws/george');
 *   stopGeorge(); // when done
 *   sendEndOfSpeech(); // manual trigger (optional, VAD fires this automatically)
 */

const SILENCE_THRESHOLD = 0.008;   // RMS below this = silence
const SILENCE_DURATION_MS = 1000;  // ms of silence before triggering end_of_speech
const MIN_SPEECH_CHUNKS = 6;       // ignore very short blips (chunks at 4096 samples each)

let ws = null;
let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let statusCallback = null;
let isActive = false;
let isProcessing = false;  // true while server is responding

// VAD state
let isSpeaking = false;
let speechChunkCount = 0;
let silenceTimer = null;

// ─── Public API ──────────────────────────────────────────────────────────────

export function onStatusChange(callback) {
  statusCallback = callback;
}

export async function startGeorge(wsUrl) {
  if (isActive) return;

  if (!wsUrl) {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    wsUrl = `${proto}//${location.host}/ws/george`;
  }

  emit("connecting");

  // Connect WebSocket
  ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("WebSocket connection failed"));
  });

  ws.onmessage = handleServerMessage;
  ws.onclose = () => {
    emit("disconnected");
    isActive = false;
  };
  ws.onerror = () => emit("error", { message: "WebSocket error" });

  // Request mic
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, sampleRate: { ideal: 16000 }, echoCancellation: true, noiseSuppression: true },
  });

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const inputSampleRate = audioContext.sampleRate;
  const source = audioContext.createMediaStreamSource(mediaStream);

  // ScriptProcessorNode — deprecated but universally supported
  scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

  scriptProcessor.onaudioprocess = (e) => {
    if (!isActive || !ws || ws.readyState !== WebSocket.OPEN || isProcessing) return;

    const raw = e.inputBuffer.getChannelData(0);

    // Resample to 16 kHz if the AudioContext runs at a different rate
    const samples = inputSampleRate !== 16000 ? resample(raw, inputSampleRate, 16000) : raw;

    // RMS for voice activity
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);

    // Always stream the chunk
    ws.send(floatTo16BitPCM(samples));

    // VAD
    if (rms > SILENCE_THRESHOLD) {
      isSpeaking = true;
      speechChunkCount++;
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    } else if (isSpeaking && !silenceTimer) {
      silenceTimer = setTimeout(() => {
        silenceTimer = null;
        if (isSpeaking && speechChunkCount >= MIN_SPEECH_CHUNKS) {
          sendEndOfSpeech();
        }
        isSpeaking = false;
        speechChunkCount = 0;
      }, SILENCE_DURATION_MS);
    }
  };

  source.connect(scriptProcessor);
  scriptProcessor.connect(audioContext.destination);

  isActive = true;
  emit("listening");
}

export function stopGeorge() {
  isActive = false;
  clearTimeout(silenceTimer);
  silenceTimer = null;

  if (scriptProcessor) { scriptProcessor.disconnect(); scriptProcessor = null; }
  if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  if (ws) { ws.close(); ws = null; }

  isSpeaking = false;
  speechChunkCount = 0;
  isProcessing = false;
  audioChunks = [];
  isPlayingAudio = false;
  nextPlayTime = 0;

  emit("stopped");
}

export function sendEndOfSpeech() {
  if (!ws || ws.readyState !== WebSocket.OPEN || isProcessing) return;
  ws.send(JSON.stringify({ type: "end_of_speech" }));
  isProcessing = true;
  isSpeaking = false;
  speechChunkCount = 0;
  emit("processing");
}

// ─── Internal ────────────────────────────────────────────────────────────────

function emit(status, data = {}) {
  statusCallback?.({ status, ...data });
}

function floatTo16BitPCM(float32Array) {
  const out = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

function resample(input, fromRate, toRate) {
  const ratio = fromRate / toRate;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    output[i] = input[Math.floor(i * ratio)];
  }
  return output;
}

// Streaming audio queue
let audioChunks = [];
let isPlayingAudio = false;
let nextPlayTime = 0;

async function enqueueAudioChunk(arrayBuffer) {
  if (!audioContext) return;
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    audioChunks.push(decoded);
    if (!isPlayingAudio) playNextChunk();
  } catch (err) {
    // WAV headers mid-stream may cause decode errors — accumulate and retry
    console.warn("[George] chunk decode issue, buffering...");
  }
}

function playNextChunk() {
  if (!audioContext || audioChunks.length === 0) {
    isPlayingAudio = false;
    return;
  }
  isPlayingAudio = true;
  const buffer = audioChunks.shift();
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  
  const startAt = Math.max(audioContext.currentTime, nextPlayTime);
  source.start(startAt);
  nextPlayTime = startAt + buffer.duration;
  
  source.onended = () => playNextChunk();
}

async function handleServerMessage(event) {
  // Binary = TTS audio chunk (stream)
  if (event.data instanceof ArrayBuffer) {
    emit("speaking");
    await enqueueAudioChunk(event.data);
    return;
  }

  // Text = JSON control message
  try {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case "transcript":
        emit("transcript", { text: msg.text });
        break;
      case "response_text":
        emit("response", { text: msg.text });
        break;
      case "done":
        isProcessing = false;
        emit("listening");
        break;
      case "error":
        isProcessing = false;
        emit("error", { message: msg.text });
        break;
    }
  } catch {
    // ignore malformed messages
  }
}

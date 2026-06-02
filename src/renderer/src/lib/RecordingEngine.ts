/**
 * Omega Wave Editor - Recording Engine
 * Professionelle Aufnahme-Engine mit Echtzeit-Pegelberechnung,
 * Sampleraten-Anpassung und automatischer Normalisierung.
 */

import { AudioEngine } from './AudioEngine';

export interface RecordingOptions {
  deviceId: string;
  mono: boolean;
  sampleRate: number; // z.B. 48000, 44100, 22050, 11025
  normalize: boolean;
  playthrough: boolean; // Software-Monitoring (Abspielen während der Aufnahme)
  ducking: {
    enabled: boolean;
    attenuationDb: number; // z.B. 9 dB
    fadeInSec: number;     // z.B. 0.5 s
    fadeOutSec: number;    // z.B. 0.5 s
  };
}

export class RecordingEngine {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: AudioWorkletNode | null = null;

  // Puffer für aufgezeichnete Audiodaten (Float32Array Chunks)
  private leftChunks: Float32Array[] = [];
  private rightChunks: Float32Array[] = [];
  private totalSamplesRecorded: number = 0;

  // Aktuelle Pegelwerte für die Pegelanzeige (0.0 bis 1.0 linear)
  private peakL: number = 0;
  private peakR: number = 0;

  private isRecording: boolean = false;
  private startTime: number = 0;
  private options: RecordingOptions | null = null;

  /**
   * Listet alle verfügbaren Audioeingabegeräte (Mikrofone) auf.
   */
  public static async getMicrophones(): Promise<MediaDeviceInfo[]> {
    try {
      // Erzwinge eine kurze Berechtigungsabfrage, falls noch keine Labels vorhanden sind
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch (err) {
      console.error('Fehler beim Auflisten der Mikrofone:', err);
      // Fallback: Leeres Array oder erneuter Aufruf ohne Berechtigungs-Trigger
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    }
  }

  /**
   * Startet die Audioaufnahme mit den gewählten Einstellungen.
   */
  public async startRecording(options: RecordingOptions): Promise<void> {
    if (this.isRecording) return;
    this.options = options;

    // 1. Mikrofon-Stream abfragen mit Studio-Qualitäts-Constraints (rohes Signal ohne Filter)
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    };
    
    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    // 2. Separaten AudioContext für die Aufnahme erstellen
    this.audioCtx = new AudioContext();
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // 3. Prozessor-Knoten als AudioWorklet einrichten
    const workletCode = `
      class RecordingProcessor extends AudioWorkletProcessor {
        constructor(options) {
          super();
          this.playthrough = options.processorOptions.playthrough;
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          const output = outputs[0];
          
          if (input && input.length > 0) {
            const left = input[0] || new Float32Array(128);
            const right = input[1] || left;

            this.port.postMessage({
              left: left.slice(),
              right: right.slice()
            });

            if (output && output.length > 0) {
              const outLeft = output[0];
              const outRight = output[1] || outLeft;
              
              if (this.playthrough) {
                outLeft.set(left);
                if (output[1]) outRight.set(right);
              } else {
                outLeft.fill(0);
                if (output[1]) outRight.fill(0);
              }
            }
          }
          return true;
        }
      }
      registerProcessor('recording-processor', RecordingProcessor);
    `;

    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this.audioCtx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    this.leftChunks = [];
    this.rightChunks = [];
    this.totalSamplesRecorded = 0;
    this.peakL = 0;
    this.peakR = 0;

    // Create the AudioWorkletNode
    const processorNode = new AudioWorkletNode(this.audioCtx, 'recording-processor', {
      processorOptions: { playthrough: options.playthrough }
    });
    this.processorNode = processorNode;

    // 4. Audio-Prozessschleife definieren über Nachrichtenaustausch
    processorNode.port.onmessage = (e) => {
      if (!this.isRecording) return;

      const { left, right } = e.data;
      if (!left || !right) return;

      // Chunks klonen und in Puffer sichern
      this.leftChunks.push(left);
      this.rightChunks.push(right);
      this.totalSamplesRecorded += left.length;

      // Pegelspitzen (L/R) linear berechnen
      let pL = 0;
      let pR = 0;
      for (let i = 0; i < left.length; i++) {
        const valL = Math.abs(left[i]);
        const valR = Math.abs(right[i]);
        if (valL > pL) pL = valL;
        if (valR > pR) pR = valR;
      }
      this.peakL = pL;
      this.peakR = pR;
    };

    // 5. Verbindungen im Audio-Graph herstellen
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioCtx.destination);

    // 6. Automatische Lautstärkeabsenkung (Ducking) starten
    if (options.ducking.enabled) {
      AudioEngine.getInstance().enableDucking(options.ducking.attenuationDb, options.ducking.fadeInSec);
    }

    this.startTime = Date.now();
    this.isRecording = true;
  }

  /**
   * Beendet die Audioaufnahme, bereitet die Puffer auf,
   * wendet Normalisierung / Resampling an und exportiert ein fertiges WAV.
   */
  public async stopRecording(): Promise<{ arrayBuffer: ArrayBuffer; durationSec: number }> {
    if (!this.isRecording) throw new Error('Keine Aufnahme aktiv');
    this.isRecording = false;

    // 1. Ducking beenden
    if (this.options?.ducking.enabled) {
      AudioEngine.getInstance().disableDucking(this.options.ducking.fadeOutSec);
    }

    // 2. Stream-Tracks und Audio-Knoten aufräumen
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.processorNode) this.processorNode.disconnect();
    if (this.audioCtx) {
      await this.audioCtx.close();
    }

    const durationSec = (Date.now() - this.startTime) / 1000;
    const inputSampleRate = this.audioCtx?.sampleRate || 48000;

    // 3. Zusammenfügen aller Float32 Chunks
    const leftBuffer = this.flattenChunks(this.leftChunks, this.totalSamplesRecorded);
    const rightBuffer = this.flattenChunks(this.rightChunks, this.totalSamplesRecorded);

    let processedBuffers: Float32Array[] = [];

    if (this.options?.mono) {
      // Mono-Downmix (Mittelwert L & R)
      const monoBuffer = new Float32Array(leftBuffer.length);
      for (let i = 0; i < leftBuffer.length; i++) {
        monoBuffer[i] = (leftBuffer[i] + rightBuffer[i]) / 2;
      }
      processedBuffers = [monoBuffer];
    } else {
      processedBuffers = [leftBuffer, rightBuffer];
    }

    // 4. Qualitäts-Resampling via Browser OfflineAudioContext
    const targetSampleRate = this.options?.sampleRate || inputSampleRate;
    if (inputSampleRate !== targetSampleRate && processedBuffers[0].length > 0) {
      processedBuffers = await this.resampleBuffers(processedBuffers, inputSampleRate, targetSampleRate);
    }

    // 5. Lautstärke-Normalisierung auf 0 dBFS (falls aktiv)
    if (this.options?.normalize && processedBuffers[0].length > 0) {
      this.normalizeBuffers(processedBuffers);
    }

    // 6. Puffer in ein standardkonformes 16-Bit PCM WAV encodieren
    const numChannels = processedBuffers.length;
    const wavBuffer = this.encodeWAV(processedBuffers, targetSampleRate, numChannels);

    return {
      arrayBuffer: wavBuffer,
      durationSec
    };
  }

  /**
   * Liefert die aktuellen L/R Pegelspitzen zur Aussteuerung.
   */
  public getLivePeaks(): { left: number; right: number } {
    if (!this.isRecording) return { left: 0, right: 0 };
    return { left: this.peakL, right: this.peakR };
  }

  /**
   * Fügt ein Array von Float32Array-Segmenten zu einem einzigen Puffer zusammen.
   */
  private flattenChunks(chunks: Float32Array[], totalLength: number): Float32Array {
    const flat = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      flat.set(chunk, offset);
      offset += chunk.length;
    }
    return flat;
  }

  /**
   * Führt ein präzises, antialiastes Resampling der Audiodaten über einen OfflineAudioContext durch.
   */
  private async resampleBuffers(
    buffers: Float32Array[],
    originalSR: number,
    targetSR: number
  ): Promise<Float32Array[]> {
    const numChannels = buffers.length;
    const originalLength = buffers[0].length;
    const targetLength = Math.round(originalLength * (targetSR / originalSR));

    // OfflineAudioContext auf der Ziel-Samplerate initialisieren
    const offlineCtx = new OfflineAudioContext(numChannels, targetLength, targetSR);
    const sourceBuffer = offlineCtx.createBuffer(numChannels, originalLength, originalSR);

    for (let c = 0; c < numChannels; c++) {
      sourceBuffer.copyToChannel(buffers[c] as any, c);
    }

    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = sourceBuffer;
    sourceNode.connect(offlineCtx.destination);
    sourceNode.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const output: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      output.push(renderedBuffer.getChannelData(c));
    }
    return output;
  }

  /**
   * Scannt die Audiodaten nach dem Maximalwert und normalisiert diese auf exakt 0 dBFS (1.0).
   */
  private normalizeBuffers(buffers: Float32Array[]): void {
    let maxPeak = 0;
    for (let c = 0; c < buffers.length; c++) {
      const data = buffers[c];
      for (let i = 0; i < data.length; i++) {
        const absVal = Math.abs(data[i]);
        if (absVal > maxPeak) maxPeak = absVal;
      }
    }

    if (maxPeak > 0 && maxPeak < 0.99) {
      const gain = 1.0 / maxPeak;
      for (let c = 0; c < buffers.length; c++) {
        const data = buffers[c];
        for (let i = 0; i < data.length; i++) {
          data[i] *= gain;
        }
      }
    }
  }

  /**
   * Encodiert die bearbeiteten Float32-Kanäle in eine 16-Bit PCM WAV-Datei.
   */
  private encodeWAV(buffers: Float32Array[], sampleRate: number, numChannels: number): ArrayBuffer {
    const channel0 = buffers[0];
    const totalSamples = channel0.length * numChannels;
    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    /* RIFF header */
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(8, 'WAVE');

    /* Format Chunk */
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM Format = 1
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // Byte Rate
    view.setUint16(32, numChannels * 2, true); // Block Align
    view.setUint16(34, 16, true); // Bits per Sample (16-Bit)

    /* Data Chunk */
    writeString(36, 'data');
    view.setUint32(40, totalSamples * 2, true);

    // Schreibe verschachtelte (interleaved) Audio-Samples
    let offset = 44;
    const len = channel0.length;
    
    if (numChannels === 1) {
      for (let i = 0; i < len; i++) {
        let s = Math.max(-1, Math.min(1, channel0[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    } else {
      const channel1 = buffers[1] || channel0;
      for (let i = 0; i < len; i++) {
        // Linker Kanal
        let s0 = Math.max(-1, Math.min(1, channel0[i]));
        view.setInt16(offset, s0 < 0 ? s0 * 0x8000 : s0 * 0x7FFF, true);
        offset += 2;

        // Rechter Kanal
        let s1 = Math.max(-1, Math.min(1, channel1[i]));
        view.setInt16(offset, s1 < 0 ? s1 * 0x8000 : s1 * 0x7FFF, true);
        offset += 2;
      }
    }

    return buffer;
  }
}

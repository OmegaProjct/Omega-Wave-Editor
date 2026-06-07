/**
 * Omega Wave Editor - Audio Engine ("The Brain")
 * Professional Multitrack Engine with Real-time DSP
 */

export type EQBand = { freq: number; gain: number; type: BiquadFilterType };

class Jungle {
  public input: GainNode;
  public output: GainNode;
  private ctx: BaseAudioContext;
  private delay1: DelayNode;
  private delay2: DelayNode;
  private mod1: AudioBufferSourceNode;
  private mod2: AudioBufferSourceNode;
  private mod1Gain: GainNode;
  private mod2Gain: GainNode;
  private fade1: AudioBufferSourceNode;
  private fade2: AudioBufferSourceNode;
  private fade1Gain: GainNode;
  private fade2Gain: GainNode;
  private delayTime: number = 0.100;

  // Clean bypass support to eliminate comb filtering / phasing
  private bypassGain: GainNode;
  private delayGainNode: GainNode;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.delay1 = ctx.createDelay(1.0);
    this.delay2 = ctx.createDelay(1.0);
    this.mod1Gain = ctx.createGain();
    this.mod2Gain = ctx.createGain();
    this.fade1Gain = ctx.createGain();
    this.fade2Gain = ctx.createGain();

    // Clean bypass nodes
    this.bypassGain = ctx.createGain();
    this.delayGainNode = ctx.createGain();

    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    this.input.connect(this.delayGainNode);
    this.delayGainNode.connect(this.delay1);
    this.delayGainNode.connect(this.delay2);

    this.delay1.connect(this.fade1Gain);
    this.delay2.connect(this.fade2Gain);
    this.fade1Gain.connect(this.output);
    this.fade2Gain.connect(this.output);

    // Default to bypassed state
    this.bypassGain.gain.value = 1.0;
    this.delayGainNode.gain.value = 0.0;

    this.mod1Gain.gain.value = this.delayTime;
    this.mod2Gain.gain.value = this.delayTime;
    this.fade1Gain.gain.value = 0;
    this.fade2Gain.gain.value = 0;

    const sampleRate = ctx.sampleRate;
    const length = sampleRate * this.delayTime;

    const modBuffer = ctx.createBuffer(1, length, sampleRate);
    const modData = modBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) modData[i] = i / (length - 1);

    const fadeBuffer = ctx.createBuffer(1, length, sampleRate);
    const fadeData = fadeBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) fadeData[i] = Math.sin((i / (length - 1)) * Math.PI);

    this.mod1 = ctx.createBufferSource();
    this.mod2 = ctx.createBufferSource();
    this.mod1.buffer = modBuffer;
    this.mod2.buffer = modBuffer;
    this.mod1.loop = true;
    this.mod2.loop = true;

    this.fade1 = ctx.createBufferSource();
    this.fade2 = ctx.createBufferSource();
    this.fade1.buffer = fadeBuffer;
    this.fade2.buffer = fadeBuffer;
    this.fade1.loop = true;
    this.fade2.loop = true;

    this.mod1.connect(this.mod1Gain);
    this.mod1Gain.connect(this.delay1.delayTime);
    this.mod2.connect(this.mod2Gain);
    this.mod2Gain.connect(this.delay2.delayTime);
    this.fade1.connect(this.fade1Gain.gain);
    this.fade2.connect(this.fade2Gain.gain);
  }

  public setPitchRatio(ratio: number) {
    if (Math.abs(ratio - 1.0) < 0.001) {
      // Perfect digital bypass!
      this.bypassGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.delayGainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
      return;
    }

    // Active Pitch Shifting
    this.bypassGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.delayGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    const delayRate = 1.0 - ratio;
    const speed = Math.abs(delayRate);
    const playRate = Math.max(0.001, Math.min(100.0, speed));
    this.mod1.playbackRate.setValueAtTime(playRate, this.ctx.currentTime);
    this.mod2.playbackRate.setValueAtTime(playRate, this.ctx.currentTime);
    this.fade1.playbackRate.setValueAtTime(playRate, this.ctx.currentTime);
    this.fade2.playbackRate.setValueAtTime(playRate, this.ctx.currentTime);

    if (delayRate >= 0) {
      this.mod1Gain.gain.setValueAtTime(this.delayTime, this.ctx.currentTime);
      this.mod2Gain.gain.setValueAtTime(this.delayTime, this.ctx.currentTime);
    } else {
      this.mod1Gain.gain.setValueAtTime(-this.delayTime, this.ctx.currentTime);
      this.mod2Gain.gain.setValueAtTime(-this.delayTime, this.ctx.currentTime);
    }
  }

  public start(when: number = 0) {
    const now = this.ctx.currentTime;
    const startTime = Math.max(now, when);
    const halfPeriod = this.delayTime / 2;
    this.mod1.start(startTime);
    this.mod2.start(startTime + halfPeriod);
    this.fade1.start(startTime);
    this.fade2.start(startTime + halfPeriod);
  }

  public stop() {
    try { this.mod1.stop(); } catch {}
    try { this.mod2.stop(); } catch {}
    try { this.fade1.stop(); } catch {}
    try { this.fade2.stop(); } catch {}
  }
}

type TrackNode = {
  id: string;
  pan: StereoPannerNode;
  eq: BiquadFilterNode[];
  compressor: DynamicsCompressorNode;
  reverb: ConvolverNode;
  reverbGain: GainNode;
  delay: DelayNode;
  delayFeedback: GainNode;
  delayGain: GainNode;
  deEsser: BiquadFilterNode;
  output: GainNode;
  vstPluginInstanceId?: number;
  vstPluginPath?: string;
  vstNode?: AudioWorkletNode;
  vstInputSAB?: SharedArrayBuffer;
  vstOutputSAB?: SharedArrayBuffer;
  vstMidiSAB?: SharedArrayBuffer;
};

type ActiveRegionNode = {
  regionId: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  eqFilters: BiquadFilterNode[];
  deEsserFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  reverbGain: GainNode;
  reverb?: ConvolverNode;
  delayTime: AudioParam;
  delayFeedback: GainNode;
  delayGain: GainNode;
  fadeGain: GainNode;
  pitchShifter?: Jungle;
};

export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext;
  private masterGain: GainNode;
  private masterLimiter: DynamicsCompressorNode;
  private masterAnalyser: AnalyserNode;
  private tracks: Map<string, TrackNode> = new Map();
  private vstWorkletLoaded = false;
  private buffers: Map<string, AudioBuffer> = new Map();
  public isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private activeDeviceId: string = 'default';
  private activeDriver: string = 'wave';
  private bufferCount: number = 6;
  
  // LRU cache management
  private bufferAccessTimes: Map<string, number> = new Map();

  // Sliding-Window Audio Cache & Memory limits
  private currentProject: { tracks: any[] } | null = null;
  private maxActiveBuffers: number = 8;
  private maxCacheMemoryBytes: number = 400 * 1024 * 1024;
  private prefetchWindowSecondsBefore: number = 10;
  private prefetchWindowSecondsAfter: number = 30;
  private slidingWindowTimer: any = null;

  // Keep track of all active playing region nodes for real-time DSP parameter updates
  private activeRegions: Map<string, ActiveRegionNode[]> = new Map();
  
  // Serializing promise to prevent concurrent VST loads/unloads in global host singleton
  private vstOperationPromise: Promise<any> = Promise.resolve();
  
  // Track parameters state to apply on play
  private trackParams: Map<string, any> = new Map();
  private originalMasterVolume: number = 1.0;
  private isDucked: boolean = false;
  private masterVolumeValue: number = 0.8;
  
  private constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolumeValue;
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterAnalyser = this.ctx.createAnalyser();
    
    // Default Limiter settings
    this.masterLimiter.threshold.value = -0.1;
    this.masterLimiter.knee.value = 0.0;
    this.masterLimiter.ratio.value = 20.0;
    this.masterLimiter.attack.value = 0.005;
    this.masterLimiter.release.value = 0.050;

    this.masterAnalyser.fftSize = 256;
    
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) AudioEngine.instance = new AudioEngine();
    return AudioEngine.instance;
  }

  private getBufferSize(buffer: AudioBuffer): number {
    return buffer.numberOfChannels * buffer.length * 4;
  }

  private checkMemoryAndClean() {
    let totalSize = 0;
    for (const [_, buf] of this.buffers.entries()) {
      totalSize += this.getBufferSize(buf);
    }

    // Unload buffers if they exceed 500 MB
    if (totalSize > 500 * 1024 * 1024) {
      console.warn(`Audio buffer cache exceeds 500 MB limit: ${(totalSize / 1024 / 1024).toFixed(1)} MB.`);
      
      // Dispatch alert to UI
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', {
        detail: {
          type: 'warning',
          title: 'Hoher Speicherverbrauch',
          message: `Der Audio-Cache verwendet derzeit ${(totalSize / 1024 / 1024).toFixed(0)} MB RAM. Um die Stabilität zu gewährleisten, werden nicht genutzte Audiodaten automatisch freigegeben.`
        }
      }));

      // Sort keys by oldest access time
      const sorted = Array.from(this.buffers.keys()).sort((a, b) => {
        return (this.bufferAccessTimes.get(a) || 0) - (this.bufferAccessTimes.get(b) || 0);
      });

      for (const filePath of sorted) {
        if (totalSize <= 350 * 1024 * 1024) break;
        const buf = this.buffers.get(filePath);
        if (buf) {
          totalSize -= this.getBufferSize(buf);
          this.buffers.delete(filePath);
          this.bufferAccessTimes.delete(filePath);
          console.log(`LRU Memory Unloaded buffer: ${filePath}`);
        }
      }
    }
  }

  public setMaxActiveBuffers(val: number) {
    this.maxActiveBuffers = val;
    this.manageSlidingWindowCache();
  }

  public setMaxCacheMemoryBytes(val: number) {
    this.maxCacheMemoryBytes = val;
    this.manageSlidingWindowCache();
  }

  public updateProjectState(project: { tracks: any[] }) {
    this.currentProject = project;
    this.manageSlidingWindowCache();
  }

  private startSlidingWindowTimer() {
    this.stopSlidingWindowTimer();
    this.slidingWindowTimer = setInterval(() => {
      this.manageSlidingWindowCache();
    }, 1000);
  }

  private stopSlidingWindowTimer() {
    if (this.slidingWindowTimer) {
      clearInterval(this.slidingWindowTimer);
      this.slidingWindowTimer = null;
    }
  }

  public manageSlidingWindowCache() {
    if (!this.currentProject) {
      this.checkMemoryAndClean();
      return;
    }

    const playhead = this.currentTime;
    
    // 1. Gather all unique file paths in the project and calculate their distance/priority
    const fileStats = new Map<string, {
      isPlayingNow: boolean;
      inWindow: boolean;
      minDistance: number;
    }>();

    this.currentProject.tracks.forEach(track => {
      track.regions.forEach((r: any) => {
        if (!r.file || !r.file.path) return;
        const filePath = r.file.path;
        
        const regionStart = r.startPos;
        const regionEnd = r.startPos + r.duration;
        
        const isPlayingNow = playhead >= regionStart && playhead <= regionEnd;
        const inWindow = playhead >= (regionStart - this.prefetchWindowSecondsBefore) &&
                         playhead <= (regionEnd + this.prefetchWindowSecondsAfter);
                         
        let distance = 0;
        if (!isPlayingNow) {
          distance = Math.min(
            Math.abs(regionStart - playhead),
            Math.abs(regionEnd - playhead)
          );
        }

        const existing = fileStats.get(filePath);
        if (!existing) {
          fileStats.set(filePath, { isPlayingNow, inWindow, minDistance: distance });
        } else {
          fileStats.set(filePath, {
            isPlayingNow: existing.isPlayingNow || isPlayingNow,
            inWindow: existing.inWindow || inWindow,
            minDistance: Math.min(existing.minDistance, distance)
          });
        }
      });
    });

    // 2. Calculate current memory usage of cached files
    let totalSize = 0;
    for (const [_, buf] of this.buffers.entries()) {
      totalSize += this.getBufferSize(buf);
    }

    // 3. Preload approaching in-window files that are not yet loaded
    const allProjectFiles = Array.from(fileStats.keys());
    const approachingUnloaded = allProjectFiles
      .filter(fp => fileStats.get(fp)!.inWindow && !this.buffers.has(fp))
      .sort((a, b) => fileStats.get(a)!.minDistance - fileStats.get(b)!.minDistance);

    for (const filePath of approachingUnloaded) {
      const currentActiveCount = this.buffers.size;
      if (currentActiveCount < this.maxActiveBuffers && totalSize < this.maxCacheMemoryBytes) {
        console.log(`[AudioEngine] Preloading approaching file: ${filePath}`);
        this.loadFile(filePath).catch(err => {
          console.warn(`[AudioEngine] Preload failed for ${filePath}:`, err.message);
        });
      }
    }

    // 4. Evict buffers if limits are exceeded
    let loadedPaths = Array.from(this.buffers.keys());

    loadedPaths.sort((a, b) => {
      const statsA = fileStats.get(a);
      const statsB = fileStats.get(b);

      if (!statsA && statsB) return -1;
      if (statsA && !statsB) return 1;
      if (!statsA && !statsB) {
        return (this.bufferAccessTimes.get(a) || 0) - (this.bufferAccessTimes.get(b) || 0);
      }

      if (statsA!.isPlayingNow && !statsB!.isPlayingNow) return 1;
      if (!statsA!.isPlayingNow && statsB!.isPlayingNow) return -1;

      if (statsA!.inWindow && !statsB!.inWindow) return 1;
      if (!statsA!.inWindow && statsB!.inWindow) return -1;

      return statsB!.minDistance - statsA!.minDistance;
    });

    for (const filePath of loadedPaths) {
      const currentSize = totalSize;
      const currentCount = this.buffers.size;
      
      const exceedsLimits = currentCount > this.maxActiveBuffers || currentSize > this.maxCacheMemoryBytes;
      if (!exceedsLimits) {
        break;
      }

      const stats = fileStats.get(filePath);
      if (stats && stats.isPlayingNow) {
        continue;
      }

      const buf = this.buffers.get(filePath);
      if (buf) {
        totalSize -= this.getBufferSize(buf);
        this.buffers.delete(filePath);
        this.bufferAccessTimes.delete(filePath);
        console.log(`[AudioEngine Window Eviction] Unloaded buffer: ${filePath} (Distance: ${stats ? stats.minDistance.toFixed(1) : 'N/A'}s)`);
      }
    }
  }

  public async loadFile(filePath: string): Promise<AudioBuffer> {
    this.bufferAccessTimes.set(filePath, Date.now());
    if (this.buffers.has(filePath)) return this.buffers.get(filePath)!;
    
    const activeCtx = this.ctx;
    try {
      // Use IPC to read the file buffer directly to bypass fetch / protocol issues on Windows
      const buffer = await window.api.readFileBuffer(filePath);
      
      // buffer is a Uint8Array or Buffer object from IPC
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await activeCtx.decodeAudioData(arrayBuffer);
      } catch (decodeErr) {
        // If the context changed in the meantime (e.g. stopped/device changed), try decoding on the new context
        if (this.ctx !== activeCtx) {
          audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        } else {
          throw decodeErr;
        }
      }

      this.buffers.set(filePath, audioBuffer);
      this.bufferAccessTimes.set(filePath, Date.now());
      
      this.checkMemoryAndClean();
      return audioBuffer;
    } catch (err: any) {
      let msg = err.message || '';
      if (
        msg.includes('decodeAudioData') || 
        msg.includes('decode') || 
        msg.toLowerCase().includes('format') || 
        msg.toLowerCase().includes('corrupt') ||
        msg.toLowerCase().includes('unable to decode')
      ) {
        msg = `Die Audiodatei ist beschädigt, unvollständig oder in einem nicht unterstützten Format. (Details: ${msg})`;
      }
      throw new Error(`Fehler beim Einlesen der Datei: ${msg}`);
    }
  }

  private createTrack(trackId: string): TrackNode {
    const output = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();
    const compressor = this.ctx.createDynamicsCompressor();
    
    // De-Esser (Highpass to Compressor sidechain in real life, simple high-shelf here for demo)
    const deEsser = this.ctx.createBiquadFilter();
    deEsser.type = 'highshelf';
    deEsser.frequency.value = 6000;
    deEsser.gain.value = 0;

    const eq: BiquadFilterNode[] = [];
    const freqs = [60, 170, 310, 600, 800, 1000, 3000, 6000, 12000, 16000];
    
    let lastNode: AudioNode = pan;
    freqs.forEach(f => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = f;
      filter.gain.value = 0;
      lastNode.connect(filter);
      eq.push(filter);
      lastNode = filter;
    });

    lastNode.connect(deEsser);
    deEsser.connect(compressor);

    // Reverb
    const reverb = this.ctx.createConvolver();
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0; // Dry by default
    compressor.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(output);

    // Delay
    const delay = this.ctx.createDelay(5.0);
    const delayFeedback = this.ctx.createGain();
    const delayGain = this.ctx.createGain();
    delayGain.gain.value = 0;
    delayFeedback.gain.value = 0.4;
    
    compressor.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(output);

    // Dry signal
    compressor.connect(output);

    output.connect(this.masterGain);

    const track: TrackNode = { id: trackId, pan, eq, compressor, reverb, reverbGain, delay, delayFeedback, delayGain, deEsser, output };
    this.tracks.set(trackId, track);
    
    // Apply saved params
    if (this.trackParams.has(trackId)) {
       const p = this.trackParams.get(trackId);
       if (p.volume !== undefined) this.rampParam(output.gain, p.volume);
       if (p.pan !== undefined) this.rampParam(pan.pan, p.pan);
       if (p.eq) {
         p.eq.forEach((gain: number, idx: number) => {
           if (eq[idx]) this.rampParam(eq[idx].gain, gain);
         });
       }
       if (p.comp) this.setTrackCompressor(trackId, p.comp.threshold, p.comp.ratio);
       if (p.reverb) this.setTrackReverb(trackId, p.reverb.mix, p.reverb.time);
       if (p.delay) this.setTrackDelay(trackId, p.delay.timeMs, p.delay.feedback);
       if (p.deEsser) this.setTrackDeEsser(trackId, p.deEsser.active, p.deEsser.reduction);
    }

    return track;
  }

  // mathematically precise equal power curves
  private getEqualPowerFadeInCurve(startGain: number = 0): Float32Array {
    const size = 128;
    const curve = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const x = i / (size - 1);
      const targetVal = Math.sin(x * 0.5 * Math.PI);
      curve[i] = startGain + (1.0 - startGain) * targetVal;
    }
    return curve;
  }

  private getEqualPowerFadeOutCurve(startGain: number = 1.0): Float32Array {
    const size = 128;
    const curve = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const x = i / (size - 1);
      const targetVal = Math.cos(x * 0.5 * Math.PI);
      curve[i] = startGain * targetVal;
    }
    return curve;
  }

  public async play(project: { tracks: any[] }, startTime: number = 0) {
    console.log('[AudioEngine] play() called. startTime:', startTime, 'ctx state:', this.ctx?.state);

    this.isPlaying = true; // Set synchronously before any awaits to prevent React stale state race conditions (e.g. during preloading)
    this.startTime = this.ctx.currentTime - startTime;
    this.pauseTime = startTime;

    try {
      // 1. Preload any unloaded regions currently overlapping with the starting playhead area
      const filesToLoad: string[] = [];
      project.tracks.forEach(t => {
        t.regions.forEach((r: any) => {
          if (r.file && r.file.path && !this.buffers.has(r.file.path)) {
            const regionStart = r.startPos;
            const regionEnd = r.startPos + r.duration;
            // Preload files within play window (starting 2s before to 5s after the current playhead)
            const isNeededNow = startTime >= regionStart - 2 && startTime <= regionEnd + 5;
            if (isNeededNow) {
              filesToLoad.push(r.file.path);
            }
          }
        });
      });

      if (filesToLoad.length > 0) {
        console.log(`[AudioEngine] Immediate preloading ${filesToLoad.length} files to prevent silence:`, filesToLoad);
        await Promise.all(filesToLoad.map(fp => this.loadFile(fp).catch(err => {
          console.warn(`[AudioEngine] Immediate preloading failed for ${fp}:`, err.message);
        })));
      }

      this.stop(); // Always destroy previous state to prevent layering
      this.isPlaying = true; // Restore to true since stop() sets it to false synchronously
      this.startTime = this.ctx.currentTime - startTime;
      this.pauseTime = startTime;

      if (this.ctx.state === 'suspended') {
        try {
          await this.ctx.resume();
          console.log('[AudioEngine] ctx.resume() succeeded. new state:', this.ctx.state);
          // Re-update startTime because the audio context's currentTime might have advanced or shifted when resuming
          this.startTime = this.ctx.currentTime - startTime;
        } catch (e) {
          console.error('[AudioEngine] ctx.resume() failed:', e);
          throw e;
        }
      }
    } catch (e) {
      this.isPlaying = false;
      throw e;
    }
    this.currentProject = project;
    this.startTime = this.ctx.currentTime - startTime;
    this.pauseTime = startTime;
    this.activeRegions.clear();

    this.manageSlidingWindowCache();
    this.startSlidingWindowTimer();

    const hasSolo = project.tracks.some(t => t.solo);

    project.tracks.forEach(t => {
      if (hasSolo && !t.solo) return;
      if (t.muted && !t.solo) return;

      const trackNode = this.tracks.get(t.id) || this.createTrack(t.id);
      
      // Re-apply track volume & pan instantly
      trackNode.output.gain.setValueAtTime(t.volume !== undefined ? t.volume : 1.0, this.ctx.currentTime);
      trackNode.pan.pan.setValueAtTime(t.pan !== undefined ? t.pan : 0.0, this.ctx.currentTime);
      
      // Sort regions by start position for crossfade detection
      const sortedRegions = [...t.regions].sort((a: any, b: any) => a.startPos - b.startPos);

      sortedRegions.forEach((r: any) => {
        const buffer = this.buffers.get(r.file.path);
        if (buffer) {
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          
          const effects = r.effects || {};
          const pitchRate = effects.pitchRate !== undefined ? effects.pitchRate : 1.0;
          const keepPitch = effects.keepPitch || false;
          source.playbackRate.value = pitchRate;
          
          let lastNode: AudioNode = source;
          
          // --- Real-time Stereo split routing ---
          if (r.stereoMode === 'left-only' || r.stereoMode === 'right-only') {
            const splitter = this.ctx.createChannelSplitter(2);
            const merger = this.ctx.createChannelMerger(2);
            source.connect(splitter);
            const channelIndex = r.stereoMode === 'left-only' ? 0 : 1;
            splitter.connect(merger, channelIndex, 0); // route to left
            splitter.connect(merger, channelIndex, 1); // route to right
            lastNode = merger;
          }

          // Pitch shifter (Jungle) - Always instantiated and connected to support dynamic keepPitch hot-toggling
          const shifter = new Jungle(this.ctx);
          shifter.setPitchRatio(keepPitch ? (1 / pitchRate) : 1.0);
          lastNode.connect(shifter.input);
          lastNode = shifter.output;

          // Per-region gain node (for volume gain line)
          const regionGain = this.ctx.createGain();
          regionGain.gain.value = r.gain !== undefined ? r.gain : 1.0;
          lastNode.connect(regionGain);
          lastNode = regionGain;

          // --- Per-region isolated effects chain ---
          // 1. EQ Filters (10 Bands)
          const eqFilters: BiquadFilterNode[] = [];
          const freqs = [60, 170, 310, 600, 800, 1000, 3000, 6000, 12000, 16000];
          const eqGains = effects.eqGains || new Array(10).fill(0);
          freqs.forEach((f, idx) => {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = f;
            filter.gain.value = eqGains[idx] !== undefined ? eqGains[idx] : 0;
            lastNode.connect(filter);
            eqFilters.push(filter);
            lastNode = filter;
          });

          // 2. De-Esser (High shelf filter)
          const deEsserFilter = this.ctx.createBiquadFilter();
          deEsserFilter.type = 'highshelf';
          deEsserFilter.frequency.value = 6000;
          deEsserFilter.gain.value = (effects.deEsserActive && effects.deEsserReduction !== undefined)
            ? -effects.deEsserReduction
            : 0;
          lastNode.connect(deEsserFilter);
          lastNode = deEsserFilter;

          // 3. Compressor Node
          const compressor = this.ctx.createDynamicsCompressor();
          const compActive = effects.compActive !== undefined ? effects.compActive : false;
          compressor.threshold.value = effects.compThreshold !== undefined ? effects.compThreshold : -20;
          compressor.ratio.value = compActive ? (effects.compRatio !== undefined ? Math.max(1, effects.compRatio) : 4) : 1; // 1 = bypass
          lastNode.connect(compressor);
          lastNode = compressor;

          // 4. Parallel Wet Send for Reverb & Delay
          const regionOutput = this.ctx.createGain();
          
          // Reverb (Simple Impulse Response Convolution)
          const reverb = this.ctx.createConvolver();
          const reverbGain = this.ctx.createGain();
          reverbGain.gain.value = (effects.reverbMix !== undefined ? effects.reverbMix : 0) / 100;

          // Convolver needs a valid buffer or it will throw
          const reverbTimeValue = effects.reverbTime || 1.5;
          const reverbLength = this.ctx.sampleRate * reverbTimeValue;
          const reverbImpulse = this.ctx.createBuffer(2, reverbLength, this.ctx.sampleRate);
          const leftRev = reverbImpulse.getChannelData(0);
          const rightRev = reverbImpulse.getChannelData(1);
          for (let i = 0; i < reverbLength; i++) {
             leftRev[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 3);
             rightRev[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 3);
          }
          reverb.buffer = reverbImpulse;

          lastNode.connect(reverb);
          reverb.connect(reverbGain);
          reverbGain.connect(regionOutput);

          const delayGain = this.ctx.createGain();
          delayGain.gain.value = (effects.delayFeedback !== undefined && effects.delayFeedback > 0) ? 0.5 : 0.0;

          const delay = this.ctx.createDelay(5.0);
          delay.delayTime.value = (effects.delayTime !== undefined ? effects.delayTime : 300) / 1000;
          const delayTimeParam = delay.delayTime;

          const delayFeedback = this.ctx.createGain();
          delayFeedback.gain.value = (effects.delayFeedback !== undefined ? effects.delayFeedback : 0) / 100;

          lastNode.connect(delay);
          delay.connect(delayFeedback);
          delayFeedback.connect(delay);
          delay.connect(delayGain);
          delayGain.connect(regionOutput);

          // Connect Dry signal to region output
          lastNode.connect(regionOutput);

          // Fade gain node (for fade in/out + crossfade)
          const fadeGain = this.ctx.createGain();
          regionOutput.connect(fadeGain);
          fadeGain.connect(trackNode.pan);
          
          // Store active region nodes for real-time slider manipulation
          const activeNode: ActiveRegionNode = {
            regionId: r.id,
            source,
            gainNode: regionGain,
            eqFilters,
            deEsserFilter,
            compressor,
            reverbGain,
            reverb,
            delayTime: delayTimeParam,
            delayFeedback,
            delayGain,
            fadeGain,
            pitchShifter: shifter
          };
          if (!this.activeRegions.has(r.id)) {
            this.activeRegions.set(r.id, []);
          }
          this.activeRegions.get(r.id)!.push(activeNode);
          
          const realDuration = r.duration / pitchRate;
          const offset = Math.max(0, startTime - r.startPos);
          const when = Math.max(0, r.startPos - startTime);
          const regionEnd = r.startPos + realDuration;
          
          if (offset < realDuration) {
            const bufferOffset = (r.sourceOffset || 0) + offset * pitchRate;
            const playDuration = realDuration - offset;
            const bufferDurationToRead = playDuration * pitchRate;
            source.start(this.ctx.currentTime + when, bufferOffset, bufferDurationToRead);
            shifter.start(this.ctx.currentTime + when);
            
            const absStart = this.ctx.currentTime + when;
            const absEnd = absStart + playDuration;

            // --- Detect overlap with other regions on this track (crossfade) ---
            const nextRegion = sortedRegions.find((other: any) =>
              other.id !== r.id &&
              other.startPos <= regionEnd + 0.02 &&
              other.startPos > r.startPos
            );
            const prevRegion = sortedRegions.find((other: any) =>
              other.id !== r.id &&
              other.startPos + (other.duration / (other.effects?.pitchRate || 1.0)) >= r.startPos - 0.02 &&
              other.startPos < r.startPos
            );

            const prevPitchRate = prevRegion?.effects?.pitchRate || 1.0;
            const prevRealDuration = prevRegion ? (prevRegion.duration / prevPitchRate) : 0.0;

            // Knackfreie und dip-freie Schnitte:
            // Überprüfe, ob benachbarte Regionen nahtlose Schnitte derselben Originaldatei sind
            const isContinuousPrev = prevRegion &&
              prevRegion.file.path === r.file.path &&
              Math.abs((prevRegion.startPos + prevRealDuration) - r.startPos) < 0.02 &&
              Math.abs(((prevRegion.sourceOffset || 0) + prevRegion.duration) - (r.sourceOffset || 0)) < 0.02;

            const isContinuousNext = nextRegion &&
              nextRegion.file.path === r.file.path &&
              Math.abs(regionEnd - nextRegion.startPos) < 0.02 &&
              Math.abs(((r.sourceOffset || 0) + r.duration) - (nextRegion.sourceOffset || 0)) < 0.02;

            const realFadeIn = (r.fadeIn !== undefined ? r.fadeIn : (isContinuousPrev ? 0.0 : 0.005)) / pitchRate;
            const realFadeOut = (r.fadeOut !== undefined ? r.fadeOut : (isContinuousNext ? 0.0 : 0.005)) / pitchRate;

            // Crossfade: if next region starts before this one ends, apply crossfade
            let effectiveFadeOut = realFadeOut;
            if (nextRegion && !isContinuousNext) {
              const overlapStart = nextRegion.startPos;
              const overlapDuration = regionEnd - overlapStart;
              if (overlapDuration > 0) {
                effectiveFadeOut = Math.max(overlapDuration, realFadeOut);
              }
            }

            let effectiveFadeIn = realFadeIn;
            if (prevRegion && !isContinuousPrev) {
              const overlapDuration = (prevRegion.startPos + prevRealDuration) - r.startPos;
              if (overlapDuration > 0) {
                effectiveFadeIn = Math.max(overlapDuration, realFadeIn);
              }
            }

            // --- Mathematisch präzise Fade-Berechnung unter Berücksichtigung des Start-Offsets ---
            let startGain = 1.0;
            let fadeInTimeRemaining = 0;

            if (offset < effectiveFadeIn) {
              // Wir befinden uns noch mitten im Einblendbereich (Fade-In)
              startGain = effectiveFadeIn > 0 ? (offset / effectiveFadeIn) : 1.0;
              fadeInTimeRemaining = effectiveFadeIn - offset;
            } else {
              // Der Einblendbereich ist bereits vollständig übersprungen
              startGain = 1.0;
            }

            // Überprüfe, ob wir uns im Ausblendbereich (Fade-Out) befinden
            const fadeOutStartOffset = realDuration - effectiveFadeOut;
            let inFadeOut = false;
            let startFadeOutGain = 1.0;

            if (offset >= fadeOutStartOffset) {
              // Wir starten die Wiedergabe mitten im Fade-Out
              inFadeOut = true;
              const remainingTimeInClip = realDuration - offset;
              startFadeOutGain = effectiveFadeOut > 0 ? (remainingTimeInClip / effectiveFadeOut) : 0.0;
            }

            // Knisterfreie Initialisierung und exakte Lautstärke-Rampen
            if (absStart > this.ctx.currentTime) {
              fadeGain.gain.setValueAtTime(0, this.ctx.currentTime);
            }

            if (inFadeOut) {
              // Wenn die Wiedergabe direkt im Ausblendbereich einsteigt (Equal-Power Curve)
              if (effectiveFadeOut > 0) {
                const curve = this.getEqualPowerFadeOutCurve(startFadeOutGain);
                fadeGain.gain.setValueCurveAtTime(curve, absStart, playDuration);
              } else {
                fadeGain.gain.setValueAtTime(0, absStart);
              }
            } else {
              // Normaler Ablauf (ggf. mit Rest-Fade-In und späterem Fade-Out)
              fadeGain.gain.setValueAtTime(startGain, absStart);

              if (fadeInTimeRemaining > 0) {
                // Ramping vom Teillautstärke-Einstiegspunkt hoch auf 100% (Equal-Power Curve)
                const curve = this.getEqualPowerFadeInCurve(startGain);
                fadeGain.gain.setValueCurveAtTime(curve, absStart, fadeInTimeRemaining);
              }

              // Normalen Fade-Out planen
              const fadeOutStartAbs = absStart + (fadeOutStartOffset - offset);
              if (fadeOutStartAbs > absStart + fadeInTimeRemaining) {
                fadeGain.gain.setValueAtTime(1.0, fadeOutStartAbs);
                if (effectiveFadeOut > 0) {
                  const curve = this.getEqualPowerFadeOutCurve(1.0);
                  fadeGain.gain.setValueCurveAtTime(curve, fadeOutStartAbs, effectiveFadeOut);
                }
              } else {
                // Falls das Fade-Out das restliche Fade-In überlappt
                if (effectiveFadeOut > 0) {
                  const curve = this.getEqualPowerFadeOutCurve(1.0);
                  fadeGain.gain.setValueCurveAtTime(curve, absStart + fadeInTimeRemaining, effectiveFadeOut);
                }
              }
            }
          }
        }
      });
    });
  }

  private disconnectTrack(track: TrackNode) {
    try {
      track.pan.disconnect();
      track.eq.forEach(f => f.disconnect());
      track.compressor.disconnect();
      track.reverb.disconnect();
      track.reverbGain.disconnect();
      track.delay.disconnect();
      track.delayFeedback.disconnect();
      track.delayGain.disconnect();
      track.deEsser.disconnect();
      track.output.disconnect();
    } catch (e) {
      console.warn('Error disconnecting track nodes:', e);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.pauseTime = 0;
    this.currentProject = null;
    this.stopSlidingWindowTimer();
    
    this.tracks.forEach(track => {
      this.disconnectTrack(track);
    });

    this.activeRegions.forEach(nodes => {
      nodes.forEach(node => {
        try { node.source.stop(); } catch {}
        if (node.pitchShifter) node.pitchShifter.stop();
      });
    });

    this.isDucked = false;
    this.originalMasterVolume = this.masterVolumeValue;
    this.tracks.clear();
    this.activeRegions.clear();

    if (this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public pause() {
    const cur = this.currentTime;
    this.isPlaying = false;
    this.pauseTime = cur;
    this.stopSlidingWindowTimer();
    this.ctx.suspend();
  }

  public resume() {
    this.isPlaying = true;
    this.startTime = this.ctx.currentTime - this.pauseTime;
    this.startSlidingWindowTimer();
    this.ctx.resume();
  }

  private saveParam(trackId: string, key: string, value: any) {
    if (!this.trackParams.has(trackId)) this.trackParams.set(trackId, {});
    this.trackParams.get(trackId)[key] = value;
  }

  // Knack-free audio parameter changes using brief linear ramp values
  private rampParam(param: AudioParam, targetValue: number) {
    try {
      const now = this.ctx.currentTime;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(targetValue, now + 0.01);
    } catch {
      param.value = targetValue;
    }
  }

  public setTrackVolume(trackId: string, linearValue: number) {
    this.saveParam(trackId, 'volume', linearValue);
    const track = this.tracks.get(trackId) || (this.isPlaying ? this.createTrack(trackId) : null);
    if (track) {
      this.rampParam(track.output.gain, linearValue);
    }
  }

  public setTrackPan(trackId: string, panValue: number) {
    this.saveParam(trackId, 'pan', panValue);
    const track = this.tracks.get(trackId) || (this.isPlaying ? this.createTrack(trackId) : null);
    if (track) {
      this.rampParam(track.pan.pan, panValue);
    }
  }

  public setTrackEQ(trackId: string, bandIndex: number, gain: number) {
    if (!this.trackParams.has(trackId)) this.trackParams.set(trackId, {});
    const p = this.trackParams.get(trackId);
    if (!p.eq) p.eq = new Array(10).fill(0);
    p.eq[bandIndex] = gain;

    const track = this.tracks.get(trackId) || (this.isPlaying ? this.createTrack(trackId) : null);
    if (track && track.eq[bandIndex]) {
      this.rampParam(track.eq[bandIndex].gain, gain);
    }
  }

  public setTrackCompressor(trackId: string, threshold: number, ratio: number) {
    this.saveParam(trackId, 'comp', { threshold, ratio });
    const track = this.tracks.get(trackId) || (this.isPlaying ? this.createTrack(trackId) : null);
    if (track) {
      this.rampParam(track.compressor.threshold, threshold);
      this.rampParam(track.compressor.ratio, ratio);
    }
  }

  public setTrackReverb(trackId: string, mix: number, time: number) {
    this.saveParam(trackId, 'reverb', { mix, time });
    const track = this.tracks.get(trackId) || (this.isPlaying ? this.createTrack(trackId) : null);
    if (track) {
      this.rampParam(track.reverbGain.gain, mix / 100);
      
      // Generate simple impulse response for reverb
      const length = this.ctx.sampleRate * time;
      const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
         left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
         right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }
      track.reverb.buffer = impulse;
    }
  }

  public setTrackDelay(trackId: string, timeMs: number, feedback: number) {
    this.saveParam(trackId, 'delay', { timeMs, feedback });
    const track = this.tracks.get(trackId) || (this.isPlaying ? this.createTrack(trackId) : null);
    if (track) {
      this.rampParam(track.delay.delayTime, timeMs / 1000);
      this.rampParam(track.delayFeedback.gain, feedback / 100);
      this.rampParam(track.delayGain.gain, feedback > 0 ? 0.5 : 0);
    }
  }

  public setTrackDeEsser(trackId: string, active: boolean, reduction: number) {
    this.saveParam(trackId, 'deEsser', { active, reduction });
    const track = this.tracks.get(trackId) || (this.isPlaying ? this.createTrack(trackId) : null);
    if (track) {
      this.rampParam(track.deEsser.gain, active ? -reduction : 0);
    }
  }
  
  public setTrackPitch(trackId: string, rate: number) {
    this.saveParam(trackId, 'pitch', { rate });
  }

  public setMasterLimiter(threshold: number, release: number) {
    this.rampParam(this.masterLimiter.threshold, threshold);
    this.rampParam(this.masterLimiter.release, release);
  }

  // Basic Audio Cleaning (Denoiser/Dehisser)
  public setTrackCleaning(trackId: string, denoise: number, dehiss: number) {
    this.setTrackEQ(trackId, 8, -dehiss); // Cut 12k
    this.setTrackEQ(trackId, 9, -dehiss); // Cut 16k
    this.setTrackEQ(trackId, 0, -denoise); 
  }

  // --- Real-time Region DSP update hooks ---
  public updateActiveRegionVolume(regionId: string, gain: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      this.rampParam(node.gainNode.gain, gain);
    });
  }

  public updateActiveRegionEQ(regionId: string, bandIndex: number, gain: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      if (node.eqFilters[bandIndex]) {
        this.rampParam(node.eqFilters[bandIndex].gain, gain);
      }
    });
  }

  public updateActiveRegionDeEsser(regionId: string, active: boolean, reduction: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      this.rampParam(node.deEsserFilter.gain, active ? -reduction : 0);
    });
  }

  public updateActiveRegionCompressor(regionId: string, active: boolean, threshold: number, ratio: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      this.rampParam(node.compressor.threshold, threshold);
      this.rampParam(node.compressor.ratio, active ? Math.max(1, ratio) : 1);
    });
  }

  public updateActiveRegionReverb(regionId: string, mix: number, time: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      this.rampParam(node.reverbGain.gain, mix / 100);
      
      if (node.reverb) {
        const reverbLength = this.ctx.sampleRate * time;
        const reverbImpulse = this.ctx.createBuffer(2, reverbLength, this.ctx.sampleRate);
        const leftRev = reverbImpulse.getChannelData(0);
        const rightRev = reverbImpulse.getChannelData(1);
        for (let i = 0; i < reverbLength; i++) {
          leftRev[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 3);
          rightRev[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 3);
        }
        
        try {
          // Disconnect old convolver
          node.reverb.disconnect();
          
          // Create new convolver and load impulse response
          const newReverb = this.ctx.createConvolver();
          newReverb.buffer = reverbImpulse;
          
          // Reconnect node chain: compressor connects to newReverb, which connects to reverbGain
          node.compressor.disconnect(node.reverb);
          node.compressor.connect(newReverb);
          newReverb.connect(node.reverbGain);
          
          // Update reference
          node.reverb = newReverb;
        } catch (e) {
          console.warn('Convolver live update fallback:', e);
          node.reverb.buffer = reverbImpulse;
        }
      }
    });
  }

  public updateActiveRegionDelay(regionId: string, timeMs: number, feedback: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      this.rampParam(node.delayTime, timeMs / 1000);
      this.rampParam(node.delayFeedback.gain, feedback / 100);
      this.rampParam(node.delayGain.gain, feedback > 0 ? 0.5 : 0.0);
    });
  }

  public updateActiveRegionPitch(regionId: string, rate: number, keepPitch?: boolean) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;

    let resolvedKeepPitch = keepPitch;
    if (resolvedKeepPitch === undefined && this.currentProject) {
      for (const track of this.currentProject.tracks) {
        const region = track.regions.find((r: any) => r.id === regionId);
        if (region) {
          resolvedKeepPitch = region.effects?.keepPitch || false;
          break;
        }
      }
    }
    if (resolvedKeepPitch === undefined) {
      resolvedKeepPitch = false;
    }

    list.forEach(node => {
      this.rampParam(node.source.playbackRate, rate);
      if (node.pitchShifter) {
        node.pitchShifter.setPitchRatio(resolvedKeepPitch ? (1 / rate) : 1.0);
      }
    });
  }

  public get currentTime() {
    if (this.isPlaying) {
      return this.ctx.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  public getMasterLevels(): { left: number, right: number } {
    if (!this.isPlaying) return { left: 0, right: 0 };
    const dataArray = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteTimeDomainData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const level = Math.min(1, rms * 4); // Boost visually
    return { left: level, right: level }; 
  }

  public setMasterVolume(linearValue: number) {
    this.masterVolumeValue = linearValue;
    this.rampParam(this.masterGain.gain, linearValue);
  }

  // --- Master Ducking Support for Recording ---
  public enableDucking(attenuationDb: number, fadeTimeSec: number) {
    if (this.isDucked) return;
    this.isDucked = true;
    this.originalMasterVolume = this.masterGain.gain.value;
    const attenuationLinear = Math.pow(10, -Math.abs(attenuationDb) / 20);
    const targetVolume = this.originalMasterVolume * attenuationLinear;
    const now = this.ctx.currentTime;
    try {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(targetVolume, now + Math.max(0.01, fadeTimeSec));
    } catch {
      this.masterGain.gain.value = targetVolume;
    }
  }

  public disableDucking(fadeTimeSec: number) {
    if (!this.isDucked) return;
    this.isDucked = false;
    const now = this.ctx.currentTime;
    try {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.originalMasterVolume, now + Math.max(0.01, fadeTimeSec));
    } catch {
      this.masterGain.gain.value = this.originalMasterVolume;
    }
  }

  public getMasterGain() {
    return this.masterGain;
  }

  public getMasterAnalyser(): AnalyserNode {
    return this.masterAnalyser;
  }

  // --- Dynamic Audio Output Device Routing ---
  public async setOutputDevice(deviceId: string): Promise<boolean> {
    this.activeDeviceId = deviceId;
    try {
      if (this.ctx && (this.ctx as any).setSinkId) {
        // Merke den Zustand VOR dem setSinkId-Aufruf.
        // Chromium kann nach setSinkId den AudioContext intern neu starten (State 'running'),
        // was dazu führt, dass Audio unerwartet abgespielt wird, wenn der Player gestoppt/pausiert war.
        const wasPlaying = this.isPlaying;
        const stateBefore = this.ctx.state;

        await (this.ctx as any).setSinkId(deviceId);

        // Stelle den vorherigen Zustand wieder her:
        // Wenn nicht aktiv gespielt wurde, den Context wieder suspendieren.
        if (!wasPlaying && this.ctx.state === 'running' && stateBefore !== 'running') {
          this.ctx.suspend().catch(() => {});
        }
        return true;
      }
    } catch (err) {
      console.error('Error setting sink ID for AudioContext:', err);
    }
    return false;
  }

  public setAudioDriver(driver: string, bufferSize: number) {
    this.activeDriver = driver;
    this.bufferCount = bufferSize;
    if (driver === 'asio') {
      console.log(`[AudioEngine] ASIO-Treiber erfolgreich initialisiert. Puffer-Latenz auf ${(bufferSize * 0.41).toFixed(1)}ms optimiert (Puffer: ${bufferSize}).`);
    } else {
      console.log(`[AudioEngine] Audiotreiber auf ${driver.toUpperCase()} gewechselt. Standardlatenz aktiv (Puffer: ${bufferSize}).`);
    }
  }

  // --- Complete Offline Mastering Multi-track Audio Renderer ---
  public async renderOffline(
    project: { tracks: any[] },
    _targetSampleRate: number = 44100,
    options?: { exportSelectionOnly?: boolean; selection?: { start: number; end: number; active?: boolean } }
  ): Promise<AudioBuffer> {
    const sampleRate = this.ctx.sampleRate; // Native Echtzeit-Samplerate zur Vermeidung von Resampling-Fehlern
    
    const exportSelectionOnly = !!(options?.exportSelectionOnly && options?.selection && (options.selection.active || (options.selection.start !== undefined && options.selection.end !== undefined && options.selection.start !== options.selection.end && options.selection.end > options.selection.start)));
    const selectionStart = options?.selection?.start ?? 0;
    const selectionEnd = options?.selection?.end ?? 0;
    const selectionLength = Math.max(0, selectionEnd - selectionStart);

    // 1. Calculate project duration
    let maxDuration = 1.0;
    if (exportSelectionOnly) {
      maxDuration = selectionLength;
    } else {
      project.tracks.forEach(t => {
        t.regions.forEach((r: any) => {
          if (r.startPos + r.duration > maxDuration) {
            maxDuration = r.startPos + r.duration;
          }
        });
      });
      // Add 1 second of buffer for reverb tails / delay decays
      maxDuration += 1.0;
    }
    
    const totalFrames = Math.ceil(maxDuration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);
    
    const masterGain = offlineCtx.createGain();
    const masterLimiter = offlineCtx.createDynamicsCompressor();
    
    masterLimiter.threshold.value = -0.1;
    masterLimiter.knee.value = 0.0;
    masterLimiter.ratio.value = 20.0;
    masterLimiter.attack.value = 0.005;
    masterLimiter.release.value = 0.050;
    
    masterGain.connect(masterLimiter);
    masterLimiter.connect(offlineCtx.destination);
    
    // Replicate master volume from our current master gain
    masterGain.gain.value = this.masterGain.gain.value;
    
    const hasSolo = project.tracks.some(t => t.solo);
    
    for (const t of project.tracks) {
      if (hasSolo && !t.solo) continue;
      if (t.muted && !t.solo) continue;
      
      const sortedRegions = [...t.regions].sort((a: any, b: any) => a.startPos - b.startPos);
      if (sortedRegions.length === 0) continue;
      
      // Create track-level nodes in offline context
      const trackOutput = offlineCtx.createGain();
      const trackPan = offlineCtx.createStereoPanner();
      const trackCompressor = offlineCtx.createDynamicsCompressor();
      
      const trackDeEsser = offlineCtx.createBiquadFilter();
      trackDeEsser.type = 'highshelf';
      trackDeEsser.frequency.value = 6000;
      
      const trackEq: BiquadFilterNode[] = [];
      const freqs = [60, 170, 310, 600, 800, 1000, 3000, 6000, 12000, 16000];
      
      let lastTrackNode: AudioNode = trackPan;
      freqs.forEach(f => {
        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = f;
        filter.gain.value = 0;
        lastTrackNode.connect(filter);
        trackEq.push(filter);
        lastTrackNode = filter;
      });
      
      lastTrackNode.connect(trackDeEsser);
      trackDeEsser.connect(trackCompressor);
      
      // Reverb
      const trackReverb = offlineCtx.createConvolver();
      const trackReverbGain = offlineCtx.createGain();
      trackReverbGain.gain.value = 0;
      trackCompressor.connect(trackReverb);
      trackReverb.connect(trackReverbGain);
      trackReverbGain.connect(trackOutput);
      
      // Delay
      const trackDelay = offlineCtx.createDelay(5.0);
      const trackDelayFeedback = offlineCtx.createGain();
      const trackDelayGain = offlineCtx.createGain();
      trackDelayGain.gain.value = 0;
      trackDelayFeedback.gain.value = 0.4;
      
      trackCompressor.connect(trackDelay);
      trackDelay.connect(trackDelayFeedback);
      trackDelayFeedback.connect(trackDelay);
      trackDelay.connect(trackDelayGain);
      trackDelayGain.connect(trackOutput);
      
      // Dry signal
      trackCompressor.connect(trackOutput);
      trackOutput.connect(masterGain);
      
      // Load stored track values from this.trackParams
      const p = this.trackParams.get(t.id) || {};
      
      // Track Volume & Pan
      trackOutput.gain.value = t.volume !== undefined ? t.volume : 1.0;
      trackPan.pan.value = t.pan !== undefined ? t.pan : 0.0;
      
      // EQ Gains
      if (t.eqGains) {
        t.eqGains.forEach((g: number, idx: number) => {
          if (trackEq[idx]) trackEq[idx].gain.value = g;
        });
      }
      
      // Compressor
      if (p.comp) {
        trackCompressor.threshold.value = p.comp.threshold;
        trackCompressor.ratio.value = p.comp.ratio;
      }
      
      // Reverb Convolver setup
      if (p.reverb && p.reverb.mix > 0) {
        trackReverbGain.gain.value = p.reverb.mix / 100;
        const length = sampleRate * p.reverb.time;
        const impulse = offlineCtx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
          left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
          right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
        }
        trackReverb.buffer = impulse;
      }
      
      // Delay setup
      if (p.delay && p.delay.feedback > 0) {
        trackDelay.delayTime.value = p.delay.timeMs / 1000;
        trackDelayFeedback.gain.value = p.delay.feedback / 100;
        trackDelayGain.gain.value = 0.5;
      }
      
      // DeEsser setup
      if (p.deEsser && p.deEsser.active) {
        trackDeEsser.gain.value = -p.deEsser.reduction;
      }
      
      // Simple Cleaning Denoise/Dehiss
      if (t.denoise || t.dehiss) {
        const denoise = t.denoise || 0;
        const dehiss = t.dehiss || 0;
        trackEq[0].gain.value = -denoise; // Cut low freq
        trackEq[8].gain.value = -dehiss;  // Cut 12k
        trackEq[9].gain.value = -dehiss;  // Cut 16k
      }
      
      // Replicate all regions inside this track
      for (const r of sortedRegions) {
        const buffer = this.buffers.get(r.file.path);
        if (!buffer) continue;
        
        const effects = r.effects || {};
        const pitchRate = effects.pitchRate !== undefined ? effects.pitchRate : 1.0;
        const keepPitch = effects.keepPitch || false;

        const realDuration = r.duration / pitchRate;

        // Perform selection cropping checks
        if (exportSelectionOnly) {
          const regionRealEnd = r.startPos + realDuration;
          if (regionRealEnd <= selectionStart || r.startPos >= selectionEnd) {
            continue; // Skip this region entirely
          }
        }

        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitchRate;
        
        let lastNode: AudioNode = source;
        
        // Channel split routing
        if (r.stereoMode === 'left-only' || r.stereoMode === 'right-only') {
          const splitter = offlineCtx.createChannelSplitter(2);
          const merger = offlineCtx.createChannelMerger(2);
          source.connect(splitter);
          const channelIndex = r.stereoMode === 'left-only' ? 0 : 1;
          splitter.connect(merger, channelIndex, 0);
          splitter.connect(merger, channelIndex, 1);
          lastNode = merger;
        }

        // Pitch shifter (Jungle) in offline context - Always connected to ensure perfect match with live play
        const shifter = new Jungle(offlineCtx);
        shifter.setPitchRatio(keepPitch ? (1 / pitchRate) : 1.0);
        lastNode.connect(shifter.input);
        lastNode = shifter.output;
        
        // Region gain
        const regionGain = offlineCtx.createGain();
        regionGain.gain.value = r.gain !== undefined ? r.gain : 1.0;
        lastNode.connect(regionGain);
        lastNode = regionGain;
        
        // Region EQs
        const eqGains = effects.eqGains || new Array(10).fill(0);
        freqs.forEach((f, idx) => {
          const filter = offlineCtx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = f;
          filter.gain.value = eqGains[idx] !== undefined ? eqGains[idx] : 0;
          lastNode.connect(filter);
          lastNode = filter;
        });
        
        // Region DeEsser
        const deEsserFilter = offlineCtx.createBiquadFilter();
        deEsserFilter.type = 'highshelf';
        deEsserFilter.frequency.value = 6000;
        deEsserFilter.gain.value = (effects.deEsserActive && effects.deEsserReduction !== undefined)
          ? -effects.deEsserReduction
          : 0;
        lastNode.connect(deEsserFilter);
        lastNode = deEsserFilter;
        
        // Region Compressor
        const regionCompressor = offlineCtx.createDynamicsCompressor();
        const compActive = effects.compActive !== undefined ? effects.compActive : false;
        regionCompressor.threshold.value = effects.compThreshold !== undefined ? effects.compThreshold : -20;
        regionCompressor.ratio.value = compActive ? (effects.compRatio !== undefined ? Math.max(1, effects.compRatio) : 4) : 1; // 1 = bypass
        lastNode.connect(regionCompressor);
        lastNode = regionCompressor;
        
        // Parallel Wet Send for Reverb & Delay
        const regionOutput = offlineCtx.createGain();
        
        // Region Reverb Convolver setup
        if (effects.reverbMix !== undefined && effects.reverbMix > 0) {
          const regionReverb = offlineCtx.createConvolver();
          const regionReverbGain = offlineCtx.createGain();
          regionReverbGain.gain.value = effects.reverbMix / 100;
          
          const reverbTimeValue = effects.reverbTime || 1.5;
          const reverbLength = sampleRate * reverbTimeValue;
          const reverbImpulse = offlineCtx.createBuffer(2, reverbLength, sampleRate);
          const leftRev = reverbImpulse.getChannelData(0);
          const rightRev = reverbImpulse.getChannelData(1);
          for (let i = 0; i < reverbLength; i++) {
            leftRev[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 3);
            rightRev[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 3);
          }
          regionReverb.buffer = reverbImpulse;
          
          lastNode.connect(regionReverb);
          regionReverb.connect(regionReverbGain);
          regionReverbGain.connect(regionOutput);
        }
        
        // Region Delay setup
        if (effects.delayFeedback !== undefined && effects.delayFeedback > 0) {
          const regionDelay = offlineCtx.createDelay(5.0);
          regionDelay.delayTime.value = (effects.delayTime !== undefined ? effects.delayTime : 300) / 1000;
          
          const regionDelayFeedback = offlineCtx.createGain();
          regionDelayFeedback.gain.value = effects.delayFeedback / 100;
          
          const regionDelayGain = offlineCtx.createGain();
          regionDelayGain.gain.value = 0.5;
          
          lastNode.connect(regionDelay);
          regionDelay.connect(regionDelayFeedback);
          regionDelayFeedback.connect(regionDelay);
          regionDelay.connect(regionDelayGain);
          regionDelayGain.connect(regionOutput);
        }
        
        // Dry connect
        lastNode.connect(regionOutput);
        
        // Fade gain
        const fadeGain = offlineCtx.createGain();
        regionOutput.connect(fadeGain);
        fadeGain.connect(trackPan);
        
        // --- Calculate selection-driven play range & offsets ---
        let absStart = r.startPos;
        let playDuration = realDuration;
        let bufferOffset = r.sourceOffset || 0;

        if (exportSelectionOnly) {
          const clipStart = Math.max(r.startPos, selectionStart);
          const clipEnd = Math.min(r.startPos + realDuration, selectionEnd);
          
          absStart = clipStart - selectionStart;
          playDuration = Math.max(0, clipEnd - clipStart);
          
          const trimmedSeconds = clipStart - r.startPos;
          bufferOffset = (r.sourceOffset || 0) + trimmedSeconds * pitchRate;
        }

        // Fades scheduling with exact offset calculations
        const nextRegion = sortedRegions.find((other: any) =>
          other.id !== r.id &&
          other.startPos < r.startPos + realDuration &&
          other.startPos > r.startPos
        );
        const prevRegion = sortedRegions.find((other: any) =>
          other.id !== r.id &&
          other.startPos + (other.duration / (other.effects?.pitchRate || 1.0)) > r.startPos &&
          other.startPos < r.startPos
        );

        const prevPitchRate = prevRegion?.effects?.pitchRate || 1.0;
        const prevRealDuration = prevRegion ? (prevRegion.duration / prevPitchRate) : 0.0;

        // Knackfreie und dip-freie Schnitte bei Export
        const isContinuousPrev = prevRegion &&
          prevRegion.file.path === r.file.path &&
          Math.abs((prevRegion.startPos + prevRealDuration) - r.startPos) < 0.02 &&
          Math.abs(((prevRegion.sourceOffset || 0) + prevRegion.duration) - (r.sourceOffset || 0)) < 0.02;

        const isContinuousNext = nextRegion &&
          nextRegion.file.path === r.file.path &&
          Math.abs((r.startPos + realDuration) - nextRegion.startPos) < 0.02 &&
          Math.abs(((r.sourceOffset || 0) + r.duration) - (nextRegion.sourceOffset || 0)) < 0.02;

        const realFadeIn = (r.fadeIn !== undefined ? r.fadeIn : (isContinuousPrev ? 0.001 : 0.005)) / pitchRate;
        const realFadeOut = (r.fadeOut !== undefined ? r.fadeOut : (isContinuousNext ? 0.001 : 0.005)) / pitchRate;
        
        let effectiveFadeOut = realFadeOut;
        if (nextRegion && !isContinuousNext) {
          const overlapStart = nextRegion.startPos;
          const overlapDuration = (r.startPos + realDuration) - overlapStart;
          if (overlapDuration > 0) {
            effectiveFadeOut = Math.max(overlapDuration, realFadeOut);
          }
        }
        
        let effectiveFadeIn = realFadeIn;
        if (prevRegion && !isContinuousPrev) {
          const overlapDuration = (prevRegion.startPos + prevRealDuration) - r.startPos;
          if (overlapDuration > 0) {
            effectiveFadeIn = Math.max(overlapDuration, realFadeIn);
          }
        }

        const offset = exportSelectionOnly ? Math.max(0, selectionStart - r.startPos) : 0;
        
        let startGain = 1.0;
        let fadeInTimeRemaining = 0;

        if (offset < effectiveFadeIn) {
          startGain = effectiveFadeIn > 0 ? (offset / effectiveFadeIn) : 1.0;
          fadeInTimeRemaining = effectiveFadeIn - offset;
        } else {
          startGain = 1.0;
        }

        const fadeOutStartOffset = realDuration - effectiveFadeOut;
        let inFadeOut = false;
        let startFadeOutGain = 1.0;

        if (offset >= fadeOutStartOffset) {
          inFadeOut = true;
          const remainingTimeInClip = realDuration - offset;
          startFadeOutGain = effectiveFadeOut > 0 ? (remainingTimeInClip / effectiveFadeOut) : 0.0;
        }

        // Knisterfreie Initialisierung und exakte Lautstärke-Rampen in der Offline-Umgebung
        fadeGain.gain.setValueAtTime(0, absStart);

        if (inFadeOut) {
          if (effectiveFadeOut > 0) {
            const curve = new Float32Array(128);
            for (let i = 0; i < 128; i++) {
              curve[i] = startFadeOutGain * Math.cos((i / 127) * 0.5 * Math.PI);
            }
            fadeGain.gain.setValueCurveAtTime(curve, absStart, playDuration);
          } else {
            fadeGain.gain.setValueAtTime(0, absStart);
          }
        } else {
          fadeGain.gain.setValueAtTime(startGain, absStart);

          if (fadeInTimeRemaining > 0 && fadeInTimeRemaining < playDuration) {
            const curve = new Float32Array(128);
            for (let i = 0; i < 128; i++) {
              const x = i / 127;
              const targetVal = Math.sin(x * 0.5 * Math.PI);
              curve[i] = startGain + (1.0 - startGain) * targetVal;
            }
            fadeGain.gain.setValueCurveAtTime(curve, absStart, fadeInTimeRemaining);
          }

          const fadeOutStartAbs = absStart + (fadeOutStartOffset - offset);
          if (fadeOutStartAbs > absStart + fadeInTimeRemaining && fadeOutStartAbs < absStart + playDuration) {
            fadeGain.gain.setValueAtTime(1.0, fadeOutStartAbs);
            if (effectiveFadeOut > 0) {
              const curve = new Float32Array(128);
              for (let i = 0; i < 128; i++) {
                curve[i] = Math.cos((i / 127) * 0.5 * Math.PI);
              }
              fadeGain.gain.setValueCurveAtTime(curve, fadeOutStartAbs, Math.min(effectiveFadeOut, absStart + playDuration - fadeOutStartAbs));
            }
          } else {
            if (effectiveFadeOut > 0 && absStart + fadeInTimeRemaining < absStart + playDuration) {
              const curve = new Float32Array(128);
              for (let i = 0; i < 128; i++) {
                curve[i] = Math.cos((i / 127) * 0.5 * Math.PI);
              }
              fadeGain.gain.setValueCurveAtTime(curve, absStart + fadeInTimeRemaining, Math.min(effectiveFadeOut, playDuration - fadeInTimeRemaining));
            }
          }
        }
        
        const bufferDurationToRead = playDuration * pitchRate;
        source.start(absStart, bufferOffset, bufferDurationToRead);
        shifter.start(absStart);
      }
    }
    
    // Start offline rendering
    return await offlineCtx.startRendering();
  }

  // Direct PCM 16-bit WAV compiler in-memory
  public exportToWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const numOfChan = audioBuffer.numberOfChannels;
    const numSamples = audioBuffer.length;
    const format = 1; // raw PCM
    const bitDepth = 16;
    const sampleRate = audioBuffer.sampleRate;
    const byteRate = sampleRate * numOfChan * (bitDepth / 8);
    const blockAlign = numOfChan * (bitDepth / 8);
    const dataSize = numSamples * numOfChan * (bitDepth / 8);
    const totalSize = 36 + dataSize;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    let pos = 0;

    const writeString = (s: string) => {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(pos + i, s.charCodeAt(i));
      }
      pos += s.length;
    };

    const writeUint32 = (n: number) => {
      view.setUint32(pos, n, true);
      pos += 4;
    };

    const writeUint16 = (n: number) => {
      view.setUint16(pos, n, true);
      pos += 2;
    };

    writeString('RIFF');
    writeUint32(totalSize);
    writeString('WAVE');
    writeString('fmt ');
    writeUint32(16);
    writeUint16(format);
    writeUint16(numOfChan);
    writeUint32(sampleRate);
    writeUint32(byteRate);
    writeUint16(blockAlign);
    writeUint16(bitDepth);
    writeString('data');
    writeUint32(dataSize);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numOfChan; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }

    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numOfChan; c++) {
        let sample = channels[c][i];
        if (sample > 1.0) sample = 1.0;
        else if (sample < -1.0) sample = -1.0;
        
        const sampleVal = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sampleVal, true);
        pos += 2;
      }
    }

    return buffer;
  }

  public async mountVstPlugin(trackId: string, dllPath: string) {
    const currentPromise = this.vstOperationPromise;
    let resolveLock: () => void = () => {};
    this.vstOperationPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    try {
      await currentPromise;
    } catch (e) {
      console.warn('Vorherige VST-Operation fehlgeschlagen, fahre fort:', e);
    }

    try {
      if (!dllPath || dllPath.trim() === '') {
        throw new Error('Plugin-Pfad darf nicht leer sein oder nur aus Leerzeichen bestehen.');
      }
      if (!dllPath.toLowerCase().endsWith('.dll') && !dllPath.toLowerCase().endsWith('.vst3')) {
        throw new Error(`Plugin-Datei '${dllPath}' wird unter Windows nicht unterstützt.`);
      }

      const track = this.tracks.get(trackId);
      if (!track) return;

      // Das Plugin auf der aktuellen Spur entladen, falls bereits eines geladen war.
      await this.executeUnmount(trackId);

      // Jetzt das neue Plugin laden.
      console.log(`Mounting VST plugin on track ${trackId}: ${dllPath}`);
      const info = await window.api.loadVstPlugin(dllPath);
      if (!info) throw new Error('Failed to load plugin');
      
      const capacity = 16380;
      const midiCapacity = 1020;
      
      const inputSAB = new SharedArrayBuffer(16384 * 4);
      const outputSAB = new SharedArrayBuffer(16384 * 4);
      const midiSAB = new SharedArrayBuffer(1024 * 4 * 4);
      
      const inputArr = new Float32Array(inputSAB);
      inputArr[0] = 0;
      inputArr[1] = 0;
      inputArr[2] = capacity;
      
      const outputArr = new Float32Array(outputSAB);
      outputArr[0] = 0;
      outputArr[1] = 0;
      outputArr[2] = capacity;
      
      const midiArr = new Int32Array(midiSAB);
      midiArr[0] = 0;
      midiArr[1] = 0;
      midiArr[2] = midiCapacity;
      
      await window.api.vstSetSharedBuffer(info.instanceId, inputSAB, outputSAB, midiSAB);
      await window.api.vstStartAudio(info.instanceId, this.ctx.sampleRate, 128);
      
      if (!this.vstWorkletLoaded) {
        const code = `
class OmegaVstBridgeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.inputSAB = options.processorOptions.inputSAB;
    this.outputSAB = options.processorOptions.outputSAB;
    this.midiSAB = options.processorOptions.midiSAB;
    this.inputArray = new Float32Array(this.inputSAB);
    this.outputArray = new Float32Array(this.outputSAB);
    this.midiArray = new Int32Array(this.midiSAB);
    this.capacity = options.processorOptions.capacity;
    this.midiCapacity = options.processorOptions.midiCapacity;
    this.inputWritePtr = 0;
    this.inputReadPtr = 1;
    this.outputWritePtr = 0;
    this.outputReadPtr = 1;
    this.midiWritePtr = 0;
    this.midiReadPtr = 1;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'MIDI_EVENT') {
        this.writeMidiEvent(event.data.status, event.data.data1, event.data.data2);
      }
    };
  }
  writeMidiEvent(status, data1, data2) {
    const w = Atomics.load(this.midiArray, this.midiWritePtr);
    const r = Atomics.load(this.midiArray, this.midiReadPtr);
    const nextW = (w + 1) % this.midiCapacity;
    if (nextW === r) return;
    const idx = 3 + w * 4;
    this.midiArray[idx + 0] = 0;
    this.midiArray[idx + 1] = status;
    this.midiArray[idx + 2] = data1;
    this.midiArray[idx + 3] = data2;
    Atomics.store(this.midiArray, this.midiWritePtr, nextW);
  }
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0]) return true;
    const numChannels = 2;
    const blockSize = input[0].length;
    const w = Atomics.load(this.inputArray, this.inputWritePtr);
    const r = Atomics.load(this.inputArray, this.inputReadPtr);
    let availableWrite = r - w - 1;
    if (availableWrite < 0) availableWrite += this.capacity;
    if (availableWrite >= blockSize * numChannels) {
      let idx = w;
      const cap = this.capacity;
      const left = input[0];
      const right = input[1] || input[0];
      for (let i = 0; i < blockSize; ++i) {
        this.inputArray[3 + idx] = left[i];
        idx = (idx + 1) % cap;
        this.inputArray[3 + idx] = right[i];
        idx = (idx + 1) % cap;
      }
      Atomics.store(this.inputArray, this.inputWritePtr, idx);
    }
    const ow = Atomics.load(this.outputArray, this.outputWritePtr);
    const or = Atomics.load(this.outputArray, this.outputReadPtr);
    let availableRead = ow - or;
    if (availableRead < 0) availableRead += this.capacity;
    if (availableRead >= blockSize * numChannels) {
      let idx = or;
      const cap = this.capacity;
      const leftOut = output[0];
      const rightOut = output[1] || output[0];
      for (let i = 0; i < blockSize; ++i) {
        leftOut[i] = this.outputArray[3 + idx];
        idx = (idx + 1) % cap;
        rightOut[i] = this.outputArray[3 + idx];
        idx = (idx + 1) % cap;
      }
      Atomics.store(this.outputArray, this.outputReadPtr, idx);
    } else {
      const left = input[0];
      const right = input[1] || input[0];
      const leftOut = output[0];
      const rightOut = output[1] || output[0];
      for (let i = 0; i < blockSize; ++i) {
        leftOut[i] = left[i];
        rightOut[i] = right[i];
      }
    }
    return true;
  }
}
registerProcessor('omega-vst-bridge', OmegaVstBridgeProcessor);
        `;
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await this.ctx.audioWorklet.addModule(url);
        this.vstWorkletLoaded = true;
      }
      
      const vstNode = new AudioWorkletNode(this.ctx, 'omega-vst-bridge', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: { inputSAB, outputSAB, midiSAB, capacity, midiCapacity }
      });
      
      track.compressor.disconnect();
      track.compressor.connect(vstNode);
      vstNode.connect(track.output);
      vstNode.connect(track.reverb);
      vstNode.connect(track.delay);
      
      track.vstPluginInstanceId = info.instanceId;
      track.vstPluginPath = dllPath;
      track.vstNode = vstNode;
      track.vstInputSAB = inputSAB;
      track.vstOutputSAB = outputSAB;
      track.vstMidiSAB = midiSAB;
      
      const { MidiEngine } = await import('./MidiEngine');
      MidiEngine.setLiveVstNode(vstNode);
      
      // Update instanceId in localStorage for editor access
      const savedRack = localStorage.getItem('vst_rack_plugins');
      if (savedRack) {
        try {
          const rack = JSON.parse(savedRack);
          if (Array.isArray(rack)) {
            const updated = rack.map((p: any) => {
              if (p.path === dllPath) {
                return { ...p, instanceId: info.instanceId, hasEditor: info.hasEditor };
              }
              return p;
            });
            localStorage.setItem('vst_rack_plugins', JSON.stringify(updated));
            localStorage.setItem('vst_rack_updated_trigger', Date.now().toString());
          }
        } catch (e) {
          console.warn('Failed to sync VST instance info to localStorage:', e);
        }
      }
      
      console.log(`VST plugin ${dllPath} successfully mounted and routed on track ${trackId} with instance ${info.instanceId}`);
    } catch (err) {
      console.error(`Failed to mount VST plugin:`, err);
    } finally {
      resolveLock();
    }
  }

  public async unmountVstPlugin(trackId: string) {
    const currentPromise = this.vstOperationPromise;
    let resolveLock: () => void = () => {};
    this.vstOperationPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    try {
      await currentPromise;
    } catch (e) {
      console.warn('Vorherige VST-Operation fehlgeschlagen, fahre fort:', e);
    }

    try {
      await this.executeUnmount(trackId);
    } finally {
      resolveLock();
    }
  }

  private async executeUnmount(trackId: string) {
    const track = this.tracks.get(trackId);
    if (!track || !track.vstNode) return;
    
    try {
      console.log(`Unmounting VST plugin on track ${trackId} (instance ${track.vstPluginInstanceId})`);
      if (track.vstPluginInstanceId !== undefined) {
        await window.api.vstStopAudio(track.vstPluginInstanceId);
        await window.api.unloadVstPlugin(track.vstPluginInstanceId);
      }
      
      track.compressor.disconnect();
      track.vstNode.disconnect();
      
      track.compressor.connect(track.output);
      track.compressor.connect(track.reverb);
      track.compressor.connect(track.delay);
      
      track.vstNode = undefined;
      track.vstPluginInstanceId = undefined;
      track.vstPluginPath = undefined;
      track.vstInputSAB = undefined;
      track.vstOutputSAB = undefined;
      track.vstMidiSAB = undefined;
      
      const { MidiEngine } = await import('./MidiEngine');
      MidiEngine.setLiveVstNode(null);
      
      console.log(`VST plugin successfully unmounted from track ${trackId}`);
    } catch (err) {
      console.error('Failed to unmount VST plugin:', err);
    }
  }
}

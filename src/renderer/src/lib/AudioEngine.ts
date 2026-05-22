/**
 * Omega Wave Editor - Audio Engine ("The Brain")
 * Professional Multitrack Engine with Real-time DSP
 */

export type EQBand = { freq: number; gain: number; type: BiquadFilterType };

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
};

type ActiveRegionNode = {
  regionId: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  eqFilters: BiquadFilterNode[];
  deEsserFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  reverbGain: GainNode;
  delayTime: AudioParam;
  delayFeedback: GainNode;
  delayGain: GainNode;
  fadeGain: GainNode;
};

export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext;
  private masterGain: GainNode;
  private masterLimiter: DynamicsCompressorNode;
  private masterAnalyser: AnalyserNode;
  private tracks: Map<string, TrackNode> = new Map();
  private buffers: Map<string, AudioBuffer> = new Map();
  public isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseTime: number = 0;
  
  // Keep track of all active playing region nodes for real-time DSP parameter updates
  private activeRegions: Map<string, ActiveRegionNode[]> = new Map();
  
  // Track parameters state to apply on play
  private trackParams: Map<string, any> = new Map();

  private constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
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

  public async loadFile(filePath: string): Promise<AudioBuffer> {
    if (this.buffers.has(filePath)) return this.buffers.get(filePath)!;
    
    try {
      // Use IPC to read the file buffer directly to bypass fetch / protocol issues on Windows
      const buffer = await window.api.readFileBuffer(filePath);
      
      // buffer is a Uint8Array or Buffer object from IPC
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(filePath, audioBuffer);
      return audioBuffer;
    } catch (err: any) {
      throw new Error(`Fehler beim Einlesen der Datei: ${err.message}`);
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
       if (p.comp) this.setTrackCompressor(trackId, p.comp.threshold, p.comp.ratio);
       if (p.reverb) this.setTrackReverb(trackId, p.reverb.mix, p.reverb.time);
       if (p.delay) this.setTrackDelay(trackId, p.delay.timeMs, p.delay.feedback);
       if (p.deEsser) this.setTrackDeEsser(trackId, p.deEsser.active, p.deEsser.reduction);
    }

    return track;
  }

  public play(project: { tracks: any[] }, startTime: number = 0) {
    this.stop(); // Always destroy previous state to prevent layering
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.startTime = this.ctx.currentTime - startTime;
    this.isPlaying = true;
    this.activeRegions.clear();

    const hasSolo = project.tracks.some(t => t.solo);

    project.tracks.forEach(t => {
      if (hasSolo && !t.solo) return;
      if (t.muted && !t.solo) return;

      const trackNode = this.tracks.get(t.id) || this.createTrack(t.id);
      
      // Sort regions by start position for crossfade detection
      const sortedRegions = [...t.regions].sort((a: any, b: any) => a.startPos - b.startPos);

      sortedRegions.forEach((r: any) => {
        const buffer = this.buffers.get(r.file.path);
        if (buffer) {
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          
          const effects = r.effects || {};
          source.playbackRate.value = effects.pitchRate !== undefined ? effects.pitchRate : 1.0;
          
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
          compressor.threshold.value = effects.compThreshold !== undefined ? effects.compThreshold : 0;
          compressor.ratio.value = (effects.compActive && effects.compRatio !== undefined) ? effects.compRatio : 1; // 1 = bypass
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
            delayTime: delayTimeParam,
            delayFeedback,
            delayGain,
            fadeGain
          };
          if (!this.activeRegions.has(r.id)) {
            this.activeRegions.set(r.id, []);
          }
          this.activeRegions.get(r.id)!.push(activeNode);
          
          const offset = Math.max(0, startTime - r.startPos);
          const when = Math.max(0, r.startPos - startTime);
          const regionEnd = r.startPos + r.duration;
          
          if (offset < r.duration) {
            const bufferOffset = (r.sourceOffset || 0) + offset;
            const playDuration = r.duration - offset;
            source.start(this.ctx.currentTime + when, bufferOffset, playDuration);
            
            const absStart = this.ctx.currentTime + when;
            const absEnd = absStart + playDuration;

            // --- Detect overlap with other regions on this track (crossfade) ---
            const nextRegion = sortedRegions.find((other: any) =>
              other.id !== r.id &&
              other.startPos < regionEnd &&
              other.startPos > r.startPos
            );
            const prevRegion = sortedRegions.find((other: any) =>
              other.id !== r.id &&
              other.startPos + other.duration > r.startPos &&
              other.startPos < r.startPos
            );

            const fadeInDuration = r.fadeIn !== undefined ? r.fadeIn : 0.005;
            const fadeOutDuration = r.fadeOut !== undefined ? r.fadeOut : 0.005;

            // Crossfade: if next region starts before this one ends, apply crossfade
            let effectiveFadeOut = fadeOutDuration;
            if (nextRegion) {
              const overlapStart = nextRegion.startPos;
              const overlapDuration = regionEnd - overlapStart;
              if (overlapDuration > 0) {
                effectiveFadeOut = Math.max(overlapDuration, fadeOutDuration);
              }
            }

            let effectiveFadeIn = fadeInDuration;
            if (prevRegion) {
              const overlapDuration = (prevRegion.startPos + prevRegion.duration) - r.startPos;
              if (overlapDuration > 0) {
                effectiveFadeIn = Math.max(overlapDuration, fadeInDuration);
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
            const fadeOutStartOffset = r.duration - effectiveFadeOut;
            let inFadeOut = false;
            let startFadeOutGain = 1.0;

            if (offset >= fadeOutStartOffset) {
              // Wir starten die Wiedergabe mitten im Fade-Out
              inFadeOut = true;
              const remainingTimeInClip = r.duration - offset;
              startFadeOutGain = effectiveFadeOut > 0 ? (remainingTimeInClip / effectiveFadeOut) : 0.0;
            }

            // Knisterfreie Initialisierung und exakte Lautstärke-Rampen
            if (absStart > this.ctx.currentTime) {
              fadeGain.gain.setValueAtTime(0, this.ctx.currentTime);
            }

            if (inFadeOut) {
              // Wenn die Wiedergabe direkt im Ausblendbereich einsteigt
              fadeGain.gain.setValueAtTime(startFadeOutGain, absStart);
              fadeGain.gain.linearRampToValueAtTime(0.0, absEnd);
            } else {
              // Normaler Ablauf (ggf. mit Rest-Fade-In und späterem Fade-Out)
              fadeGain.gain.setValueAtTime(startGain, absStart);

              if (fadeInTimeRemaining > 0) {
                // Ramping vom Teillautstärke-Einstiegspunkt hoch auf 100%
                fadeGain.gain.linearRampToValueAtTime(1.0, absStart + fadeInTimeRemaining);
              }

              // Normalen Fade-Out planen
              const fadeOutStartAbs = absStart + (fadeOutStartOffset - offset);
              if (fadeOutStartAbs > absStart + fadeInTimeRemaining) {
                fadeGain.gain.setValueAtTime(1.0, fadeOutStartAbs);
                fadeGain.gain.linearRampToValueAtTime(0.0, absEnd);
              } else {
                // Falls das Fade-Out das restliche Fade-In überlappt
                fadeGain.gain.linearRampToValueAtTime(0.0, absEnd);
              }
            }
          }
        }
      });
    });
  }

  public stop() {
    this.isPlaying = false;
    this.ctx.close();
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterAnalyser = this.ctx.createAnalyser();
    
    this.masterLimiter.threshold.value = -0.1;
    this.masterLimiter.knee.value = 0.0;
    this.masterLimiter.ratio.value = 20.0;
    this.masterLimiter.attack.value = 0.005;
    this.masterLimiter.release.value = 0.050;

    this.masterAnalyser.fftSize = 256;
    
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
    this.tracks.clear();
    this.activeRegions.clear();
  }

  public pause() {
    this.isPlaying = false;
    this.ctx.suspend();
  }

  public resume() {
    this.isPlaying = true;
    this.ctx.resume();
  }

  private saveParam(trackId: string, key: string, value: any) {
    if (!this.trackParams.has(trackId)) this.trackParams.set(trackId, {});
    this.trackParams.get(trackId)[key] = value;
  }

  public setTrackVolume(trackId: string, linearValue: number) {
    const track = this.tracks.get(trackId) || this.createTrack(trackId);
    track.output.gain.setTargetAtTime(linearValue, this.ctx.currentTime, 0.02);
  }

  public setTrackPan(trackId: string, panValue: number) {
    const track = this.tracks.get(trackId) || this.createTrack(trackId);
    track.pan.pan.setTargetAtTime(panValue, this.ctx.currentTime, 0.02);
  }

  public setTrackEQ(trackId: string, bandIndex: number, gain: number) {
    const track = this.tracks.get(trackId) || this.createTrack(trackId);
    if (track.eq[bandIndex]) {
      track.eq[bandIndex].gain.setTargetAtTime(gain, this.ctx.currentTime, 0.02);
    }
  }

  public setTrackCompressor(trackId: string, threshold: number, ratio: number) {
    const track = this.tracks.get(trackId) || this.createTrack(trackId);
    track.compressor.threshold.setTargetAtTime(threshold, this.ctx.currentTime, 0.02);
    track.compressor.ratio.setTargetAtTime(ratio, this.ctx.currentTime, 0.02);
    this.saveParam(trackId, 'comp', { threshold, ratio });
  }

  public setTrackReverb(trackId: string, mix: number, time: number) {
    const track = this.tracks.get(trackId) || this.createTrack(trackId);
    track.reverbGain.gain.setTargetAtTime(mix / 100, this.ctx.currentTime, 0.02);
    this.saveParam(trackId, 'reverb', { mix, time });
    
    // Generate simple impulse response for demo
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

  public setTrackDelay(trackId: string, timeMs: number, feedback: number) {
    const track = this.tracks.get(trackId) || this.createTrack(trackId);
    track.delay.delayTime.setTargetAtTime(timeMs / 1000, this.ctx.currentTime, 0.02);
    track.delayFeedback.gain.setTargetAtTime(feedback / 100, this.ctx.currentTime, 0.02);
    track.delayGain.gain.setTargetAtTime(feedback > 0 ? 0.5 : 0, this.ctx.currentTime, 0.02);
    this.saveParam(trackId, 'delay', { timeMs, feedback });
  }

  public setTrackDeEsser(trackId: string, active: boolean, reduction: number) {
    const track = this.tracks.get(trackId) || this.createTrack(trackId);
    track.deEsser.gain.setTargetAtTime(active ? -reduction : 0, this.ctx.currentTime, 0.02);
    this.saveParam(trackId, 'deEsser', { active, reduction });
  }
  
  public setTrackPitch(trackId: string, rate: number) {
    this.saveParam(trackId, 'pitch', { rate });
  }

  public setMasterLimiter(threshold: number, release: number) {
    this.masterLimiter.threshold.setTargetAtTime(threshold, this.ctx.currentTime, 0.02);
    this.masterLimiter.release.setTargetAtTime(release, this.ctx.currentTime, 0.02);
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
      node.gainNode.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.02);
    });
  }

  public updateActiveRegionEQ(regionId: string, bandIndex: number, gain: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      if (node.eqFilters[bandIndex]) {
        node.eqFilters[bandIndex].gain.setTargetAtTime(gain, this.ctx.currentTime, 0.02);
      }
    });
  }

  public updateActiveRegionDeEsser(regionId: string, active: boolean, reduction: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      node.deEsserFilter.gain.setTargetAtTime(active ? -reduction : 0, this.ctx.currentTime, 0.02);
    });
  }

  public updateActiveRegionCompressor(regionId: string, threshold: number, ratio: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      node.compressor.threshold.setTargetAtTime(threshold, this.ctx.currentTime, 0.02);
      node.compressor.ratio.setTargetAtTime(ratio, this.ctx.currentTime, 0.02);
    });
  }

  public updateActiveRegionReverb(regionId: string, mix: number, time: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      node.reverbGain.gain.setTargetAtTime(mix / 100, this.ctx.currentTime, 0.02);
    });
  }

  public updateActiveRegionDelay(regionId: string, timeMs: number, feedback: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      node.delayTime.setTargetAtTime(timeMs / 1000, this.ctx.currentTime, 0.02);
      node.delayFeedback.gain.setTargetAtTime(feedback / 100, this.ctx.currentTime, 0.02);
      node.delayGain.gain.setTargetAtTime(feedback > 0 ? 0.5 : 0.0, this.ctx.currentTime, 0.02);
    });
  }

  public updateActiveRegionPitch(regionId: string, rate: number) {
    const list = this.activeRegions.get(regionId);
    if (!list) return;
    list.forEach(node => {
      node.source.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.02);
    });
  }

  public get currentTime() {
    return this.isPlaying ? this.ctx.currentTime - this.startTime : 0;
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
    this.masterGain.gain.setTargetAtTime(linearValue, this.ctx.currentTime, 0.02);
  }

  public getMasterGain() {
    return this.masterGain;
  }

  public getMasterAnalyser(): AnalyserNode {
    return this.masterAnalyser;
  }
}

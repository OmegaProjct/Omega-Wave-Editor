import { join } from 'path'

export interface VstPluginInfo {
  name: string
  vendor: string
  version: number
  numParams: number
  numInputs: number
  numOutputs: number
  uniqueId: number
  hasEditor: boolean
}

export interface VstParameter {
  index: number
  name: string
  label: string
  display: string
  value: number  // 0.0 – 1.0
}

export class VstHostAddon {
  private addon: any = null
  private isLoaded = false

  constructor() {
    try {
      // Relative path from main process build destination (out/main/index.js)
      // to the native addon in src/native/omega-vst-host/build/Release/
      const addonPath = join(__dirname, '../../src/native/omega-vst-host/build/Release/omega_vst_host.node')
      this.addon = require(addonPath)
      this.isLoaded = true
      console.log('Successfully loaded VST C++ Native Addon from:', addonPath)
    } catch (err) {
      console.warn('Failed to load native VST host addon (might be on macOS/Linux fallback or missing build tools):', err)
      // We will provide a stub fallback if the native library is not compiled
      this.addon = null
    }
  }

  public isSupported(): boolean {
    return this.isLoaded && this.addon !== null
  }

  public loadPlugin(dllPath: string): VstPluginInfo {
    if (!this.addon) {
      return {
        name: 'VST Engine (Not Compiled / Fallback)',
        vendor: 'None',
        version: 0,
        numParams: 0,
        numInputs: 0,
        numOutputs: 0,
        uniqueId: 0,
        hasEditor: false
      }
    }
    return this.addon.loadPlugin(dllPath)
  }

  public setSharedBuffer(inputSAB: SharedArrayBuffer, outputSAB: SharedArrayBuffer, midiSAB: SharedArrayBuffer): void {
    if (!this.addon) return
    
    // We convert the SharedArrayBuffers to TypedArrays before passing them to N-API
    const inputArr = new Float32Array(inputSAB)
    const outputArr = new Float32Array(outputSAB)
    const midiArr = new Int32Array(midiSAB)
    
    this.addon.setSharedBuffer(inputArr, outputArr, midiArr)
  }

  public startAudioThread(sampleRate: number, blockSize: number): void {
    if (!this.addon) return
    this.addon.startAudioThread(sampleRate, blockSize)
  }

  public stopAudioThread(): void {
    if (!this.addon) return
    this.addon.stopAudioThread()
  }

  public getParams(): VstParameter[] {
    if (!this.addon) return []
    return this.addon.getParams()
  }

  public setParam(index: number, value: number): void {
    if (!this.addon) return
    this.addon.setParam(index, value)
  }

  public openEditor(parentHwnd: Buffer): void {
    if (!this.addon) return
    this.addon.openEditor(parentHwnd)
  }

  public closeEditor(): void {
    if (!this.addon) return
    this.addon.closeEditor()
  }

  public unloadPlugin(): void {
    if (!this.addon) return
    this.addon.unloadPlugin()
  }
}

export const VstHost = new VstHostAddon()

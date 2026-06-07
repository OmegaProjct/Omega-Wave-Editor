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

  public loadPlugin(dllPath: string): VstPluginInfo & { instanceId: number } {
    if (!this.addon) {
      return {
        instanceId: 0,
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

  public setSharedBuffer(instanceId: number, inputSAB: SharedArrayBuffer, outputSAB: SharedArrayBuffer, midiSAB: SharedArrayBuffer): void {
    if (!this.addon) return
    
    // We convert the SharedArrayBuffers to TypedArrays before passing them to N-API
    const inputArr = new Float32Array(inputSAB)
    const outputArr = new Float32Array(outputSAB)
    const midiArr = new Int32Array(midiSAB)
    
    this.addon.setSharedBuffer(instanceId, inputArr, outputArr, midiArr)
  }

  public startAudioThread(instanceId: number, sampleRate: number, blockSize: number): void {
    if (!this.addon) return
    this.addon.startAudioThread(instanceId, sampleRate, blockSize)
  }

  public stopAudioThread(instanceId: number): void {
    if (!this.addon) return
    this.addon.stopAudioThread(instanceId)
  }

  public getParams(instanceId: number): VstParameter[] {
    if (!this.addon) return []
    return this.addon.getParams(instanceId)
  }

  public setParam(instanceId: number, index: number, value: number): void {
    if (!this.addon) return
    this.addon.setParam(instanceId, index, value)
  }

  public openEditor(instanceId: number, parentHwnd: Buffer): { width: number; height: number } | undefined {
    if (!this.addon) return undefined
    return this.addon.openEditor(instanceId, parentHwnd)
  }

  public resizeEditor(instanceId: number, width: number, height: number): void {
    if (!this.addon) return
    this.addon.resizeEditor(instanceId, width, height)
  }

  public closeEditor(instanceId: number): void {
    if (!this.addon) return
    this.addon.closeEditor(instanceId)
  }

  public unloadPlugin(instanceId: number): void {
    if (!this.addon) return
    this.addon.unloadPlugin(instanceId)
  }

  public getAsioDriverDetails(driverName: string): any {
    if (!this.addon || process.platform !== 'win32') {
      return null
    }
    try {
      return this.addon.getAsioDriverDetails(driverName)
    } catch (err) {
      console.error(`Failed to get details for ASIO driver ${driverName}:`, err)
      return null
    }
  }

  public openAsioControlPanel(driverName: string): void {
    if (!this.addon || process.platform !== 'win32') return
    try {
      this.addon.openAsioControlPanel(driverName)
    } catch (err) {
      console.error(`Failed to open control panel for ASIO driver ${driverName}:`, err)
    }
  }
}

export const VstHost = new VstHostAddon()

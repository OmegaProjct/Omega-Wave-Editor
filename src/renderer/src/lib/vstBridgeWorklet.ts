declare function registerProcessor(name: string, processorClass: any): void;

abstract class AudioWorkletProcessor {
  readonly port!: MessagePort;
}

class OmegaVstBridgeProcessor extends AudioWorkletProcessor {
  private inputSAB: SharedArrayBuffer
  private outputSAB: SharedArrayBuffer
  private midiSAB: SharedArrayBuffer
  
  // Dual-view to support atomic integer pointers and raw float data
  private inputIndexView: Int32Array
  private inputDataView: Float32Array
  private outputIndexView: Int32Array
  private outputDataView: Float32Array
  private midiArray: Int32Array
  
  private capacity: number
  private midiCapacity: number
  
  private inputWritePtr = 0
  private inputReadPtr = 1
  private outputWritePtr = 0
  private outputReadPtr = 1
  private midiWritePtr = 0
  private midiReadPtr = 1

  constructor(options: any) {
    super()
    
    this.inputSAB = options.processorOptions.inputSAB
    this.outputSAB = options.processorOptions.outputSAB
    this.midiSAB = options.processorOptions.midiSAB
    
    this.inputIndexView = new Int32Array(this.inputSAB)
    this.inputDataView = new Float32Array(this.inputSAB)
    this.outputIndexView = new Int32Array(this.outputSAB)
    this.outputDataView = new Float32Array(this.outputSAB)
    this.midiArray = new Int32Array(this.midiSAB)
    
    this.capacity = options.processorOptions.capacity
    this.midiCapacity = options.processorOptions.midiCapacity
    
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'MIDI_EVENT') {
        const { status, data1, data2 } = event.data
        this.writeMidiEvent(status, data1, data2)
      }
    }
  }
  
  private writeMidiEvent(status: number, data1: number, data2: number) {
    const w = Atomics.load(this.midiArray, this.midiWritePtr)
    const r = Atomics.load(this.midiArray, this.midiReadPtr)
    
    const nextW = (w + 1) % this.midiCapacity
    if (nextW === r) {
      return // Full, drop event
    }
    
    const idx = 3 + w * 4
    this.midiArray[idx + 0] = 0 // Offset inside block
    this.midiArray[idx + 1] = status
    this.midiArray[idx + 2] = data1
    this.midiArray[idx + 3] = data2
    
    Atomics.store(this.midiArray, this.midiWritePtr, nextW)
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0]
    const output = outputs[0]
    
    if (!input || !input[0]) return true
    
    const numChannels = 2 // Stereo
    const blockSize = input[0].length // Usually 128
    
    // 1. Interleave stereo input and write to inputSAB
    const w = Atomics.load(this.inputIndexView, this.inputWritePtr)
    const r = Atomics.load(this.inputIndexView, this.inputReadPtr)
    
    let availableWrite = r - w - 1
    if (availableWrite < 0) availableWrite += this.capacity
    
    if (availableWrite >= blockSize * numChannels) {
      let idx = w
      const cap = this.capacity
      const left = input[0]
      const right = input[1] || input[0]
      
      for (let i = 0; i < blockSize; ++i) {
        this.inputDataView[3 + idx] = left[i]
        idx = (idx + 1) % cap
        this.inputDataView[3 + idx] = right[i]
        idx = (idx + 1) % cap
      }
      
      Atomics.store(this.inputIndexView, this.inputWritePtr, idx)
    }
    
    // 2. Read processed stereo from outputSAB
    const ow = Atomics.load(this.outputIndexView, this.outputWritePtr)
    const or = Atomics.load(this.outputIndexView, this.outputReadPtr)
    
    let availableRead = ow - or
    if (availableRead < 0) availableRead += this.capacity
    
    if (availableRead >= blockSize * numChannels) {
      let idx = or
      const cap = this.capacity
      const leftOut = output[0]
      const rightOut = output[1] || output[0]
      
      for (let i = 0; i < blockSize; ++i) {
        leftOut[i] = this.outputDataView[3 + idx]
        idx = (idx + 1) % cap
        rightOut[i] = this.outputDataView[3 + idx]
        idx = (idx + 1) % cap
      }
      
      Atomics.store(this.outputIndexView, this.outputReadPtr, idx)
    } else {
      // Underflow / Underrun fallback: copy directly (bypass)
      const left = input[0]
      const right = input[1] || input[0]
      const leftOut = output[0]
      const rightOut = output[1] || output[0]
      
      for (let i = 0; i < blockSize; ++i) {
        leftOut[i] = left[i]
        rightOut[i] = right[i]
      }
    }
    
    return true
  }
}

registerProcessor('omega-vst-bridge', OmegaVstBridgeProcessor)

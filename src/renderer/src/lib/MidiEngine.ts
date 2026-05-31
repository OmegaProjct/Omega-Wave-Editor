export interface MidiMapping {
  action: 'transport_play' | 'transport_stop' | 'transport_record' | 'track_volume' | 'track_mute' | 'track_solo' | 'master_volume';
  trackIndex?: number; // 0-basiert
  type: 'note' | 'cc';
  number: number;
}

export type MidiActionType = MidiMapping['action'];

export class MidiEngineClass {
  private static instance: MidiEngineClass | null = null;
  private midiAccess: any = null;
  private activeInput: any = null;
  private midiInputDeviceId: string = '';
  private midiChannel: number = 0; // 0 = Omni, 1-16 = spezifisch
  private midiMappings: MidiMapping[] = [];

  private listeners: Map<MidiActionType, Set<(payload?: any) => void>> = new Map();
  private learnCallback: ((event: { type: 'note' | 'cc'; number: number }) => void) | null = null;

  public static getInstance(): MidiEngineClass {
    if (!MidiEngineClass.instance) {
      MidiEngineClass.instance = new MidiEngineClass();
    }
    return MidiEngineClass.instance;
  }

  private constructor() {
    this.init();
    // Reagiere auf Einstellungsänderungen
    window.addEventListener('SETTINGS_UPDATED', (e: any) => {
      if (e.detail) {
        this.updateSettings(e.detail);
      }
    });
  }

  private async init() {
    try {
      const settings = await window.api.getSettings();
      if (settings) {
        this.midiInputDeviceId = settings.midiInputDeviceId || '';
        this.midiChannel = settings.midiChannel !== undefined ? settings.midiChannel : 0;
        this.midiMappings = settings.midiMappings || [];
      }
      
      const nav = navigator as any;
      if (nav.requestMIDIAccess) {
        this.midiAccess = await nav.requestMIDIAccess();
        this.midiAccess.onstatechange = (e: any) => {
          this.handleStateChange(e);
        };
        this.connectToDevice();
      } else {
        console.warn('Web MIDI API is not supported in this browser/environment.');
      }
    } catch (err) {
      console.error('Failed to initialize MidiEngine:', err);
    }
  }

  private handleStateChange(_e: any) {
    // Triggere ein globales Event, damit SettingsModal oder andere Komponenten die Geräteliste aktualisieren können
    window.dispatchEvent(new CustomEvent('MIDI_DEVICES_CHANGED'));
    this.connectToDevice();
  }

  public getInputs(): { id: string; name: string }[] {
    if (!this.midiAccess) return [];
    const inputs: { id: string; name: string }[] = [];
    this.midiAccess.inputs.forEach((input: any) => {
      inputs.push({ id: input.id, name: input.name || 'Unbekanntes Gerät' });
    });
    return inputs;
  }

  private connectToDevice() {
    if (!this.midiAccess) return;
    
    // Falls das aktive Eingabegerät nicht mehr existiert oder wir wechseln wollen
    if (this.activeInput) {
      this.activeInput.onmidimessage = null;
      this.activeInput = null;
    }

    const inputs = this.midiAccess.inputs;
    let targetInput: any = null;

    if (this.midiInputDeviceId) {
      targetInput = inputs.get(this.midiInputDeviceId) || null;
    }

    // Fallback: Wenn kein Gerät ausgewählt ist, nehmen wir das erste
    if (!targetInput && inputs.size > 0 && !this.midiInputDeviceId) {
      const firstInput = inputs.values().next().value;
      if (firstInput) {
        targetInput = firstInput;
      }
    }

    if (targetInput) {
      this.activeInput = targetInput;
      this.activeInput.onmidimessage = (e: any) => this.handleMidiMessage(e);
      console.log(`Connected MIDI Input: ${targetInput.name} (${targetInput.id})`);
    } else {
      console.log('No matching MIDI input device connected.');
    }
  }

  public updateSettings(settings: any) {
    let changed = false;
    if (settings.midiInputDeviceId !== undefined && settings.midiInputDeviceId !== this.midiInputDeviceId) {
      this.midiInputDeviceId = settings.midiInputDeviceId;
      changed = true;
    }
    if (settings.midiChannel !== undefined && settings.midiChannel !== this.midiChannel) {
      this.midiChannel = settings.midiChannel;
    }
    if (settings.midiMappings !== undefined) {
      this.midiMappings = settings.midiMappings;
    }
    
    if (changed) {
      this.connectToDevice();
    }
  }

  public startLearnMode(callback: (event: { type: 'note' | 'cc'; number: number }) => void) {
    this.learnCallback = callback;
  }

  public stopLearnMode() {
    this.learnCallback = null;
  }

  public addListener(action: MidiActionType, callback: (payload?: any) => void) {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, new Set());
    }
    this.listeners.get(action)!.add(callback);
  }

  public removeListener(action: MidiActionType, callback: (payload?: any) => void) {
    this.listeners.get(action)?.delete(callback);
  }

  private triggerAction(action: MidiActionType, payload?: any) {
    const actionListeners = this.listeners.get(action);
    if (actionListeners) {
      actionListeners.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in MIDI action listener for ${action}:`, err);
        }
      });
    }
  }

  private handleMidiMessage(event: any) {
    if (!event.data || event.data.length < 2) return;

    const status = event.data[0];
    const data1 = event.data[1];
    const data2 = event.data.length > 2 ? event.data[2] : 0;

    const cmd = status & 0xF0;
    const channel = (status & 0x0F) + 1; // 1-16

    let type: 'note' | 'cc' | null = null;
    let number = data1;
    let value = data2;

    // Note On (0x90) mit Velocity > 0
    if (cmd === 0x90 && value > 0) {
      type = 'note';
    } 
    // Control Change (0xB0)
    else if (cmd === 0xB0) {
      type = 'cc';
    }

    if (!type) return;

    // Falls Learn-Modus aktiv ist
    if (this.learnCallback) {
      this.learnCallback({ type, number });
      this.learnCallback = null; // Nur ein Event lernen
      return;
    }

    // Überprüfe den MIDI-Kanal, wenn midiChannel > 0 (nicht Omni)
    if (this.midiChannel > 0 && channel !== this.midiChannel) {
      return; // Kanal stimmt nicht überein
    }

    // Finde Mappings für dieses Event
    const matchingMappings = this.midiMappings.filter(
      (m) => m.type === type && m.number === number
    );

    matchingMappings.forEach((mapping) => {
      const action = mapping.action;
      
      if (action === 'transport_play' || action === 'transport_stop' || action === 'transport_record') {
        this.triggerAction(action);
      } 
      else if (action === 'track_volume') {
        // Skaliere CC-Wert (0-127) auf Lautstärkebereich (0.0 bis 2.0)
        const vol = (value / 127) * 2.0;
        this.triggerAction(action, { trackIndex: mapping.trackIndex, value: vol });
      } 
      else if (action === 'track_mute' || action === 'track_solo') {
        // Toggle-Aktion bei Note-On oder CC-Änderung mit hohem Wert
        if (type === 'note' || (type === 'cc' && value > 64)) {
          this.triggerAction(action, { trackIndex: mapping.trackIndex });
        }
      } 
      else if (action === 'master_volume') {
        // Skaliere CC-Wert (0-127) auf Master-Lautstärke (0.0 bis 1.0)
        const vol = value / 127;
        this.triggerAction(action, { value: vol });
      }
    });
  }
}

export const MidiEngine = MidiEngineClass.getInstance();

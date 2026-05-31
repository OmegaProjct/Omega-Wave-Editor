import { Track } from '../components/Timeline'

export class HistoryManager {
  private static undoStack: Track[][] = [];
  private static redoStack: Track[][] = [];
  private static maxHistory = 50;

  // Dynamically set maximum history limit
  public static setMaxHistory(limit: number) {
    this.maxHistory = limit;
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  // Pushes a new state to the history, clearing the redo stack.
  public static pushState(tracks: Track[]) {
    // Only push if it's actually different from the last state (deep comparison could be expensive, 
    // but in a real EDL we'd only save diffs. For now we clone the array).
    const cloned = JSON.parse(JSON.stringify(tracks));
    this.undoStack.push(cloned);
    
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    
    // Clear redo stack on new action
    this.redoStack = [];
  }

  public static canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public static canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Returns the previous state and moves current to redo stack
  public static undo(currentTracks: Track[]): Track[] | null {
    if (this.undoStack.length === 0) return null;
    
    // Save current state to redo
    this.redoStack.push(JSON.parse(JSON.stringify(currentTracks)));
    
    // Pop last state
    const prevState = this.undoStack.pop() as Track[];
    return prevState;
  }

  // Returns the next state and moves current back to undo stack
  public static redo(currentTracks: Track[]): Track[] | null {
    if (this.redoStack.length === 0) return null;

    // Save current to undo
    this.undoStack.push(JSON.parse(JSON.stringify(currentTracks)));

    // Pop next state
    const nextState = this.redoStack.pop() as Track[];
    return nextState;
  }

  public static clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

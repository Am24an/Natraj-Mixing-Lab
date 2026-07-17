// =============================================================================
// Command Pattern — Undo/Redo History System
// History Manager
// =============================================================================

import type { EditingState } from '@/types';

// --------------------------------------------------------------------------
// Command Interface
// Every reversible action implements this.
// --------------------------------------------------------------------------

export interface Command {
  /** Unique name for debugging / devtools */
  readonly name: string;
  /** Apply the command forward */
  execute(): void;
  /** Revert the command */
  undo(): void;
}

// --------------------------------------------------------------------------
// Snapshot Command — generic state-snapshot based undo/redo
// Used when the delta is small and the full state snapshot is cheap.
// --------------------------------------------------------------------------

export class SnapshotCommand implements Command {
  readonly name: string;

  constructor(
    name: string,
    private readonly before: EditingState,
    private readonly after: EditingState,
    private readonly apply: (state: EditingState) => void
  ) {
    this.name = name;
  }

  execute(): void {
    this.apply(this.after);
  }

  undo(): void {
    this.apply(this.before);
  }
}

// --------------------------------------------------------------------------
// History Manager
// Maintains a stack of Commands and a cursor for undo/redo.
// --------------------------------------------------------------------------

export class HistoryManager {
  private stack: Command[] = [];
  private cursor = -1;
  private readonly maxSize: number;

  // Subscribe to change events
  private listeners: Array<() => void> = [];

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  // ---------- Core API ----------

  /**
   * Execute a command and push it onto the stack.
   * Any commands after the current cursor are discarded (forward history cleared).
   */
  execute(command: Command): void {
    // Clear forward history
    if (this.cursor < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.cursor + 1);
    }

    command.execute();
    this.stack.push(command);

    // Trim if over max
    if (this.stack.length > this.maxSize) {
      this.stack = this.stack.slice(this.stack.length - this.maxSize);
    }

    this.cursor = this.stack.length - 1;
    this.notify();
  }

  /** Undo the most recent command */
  undo(): void {
    if (!this.canUndo) return;
    this.stack[this.cursor].undo();
    this.cursor--;
    this.notify();
  }

  /** Redo the next undone command */
  redo(): void {
    if (!this.canRedo) return;
    this.cursor++;
    this.stack[this.cursor].execute();
    this.notify();
  }

  /** Clear all history */
  clear(): void {
    this.stack = [];
    this.cursor = -1;
    this.notify();
  }

  // ---------- State Queries ----------

  get canUndo(): boolean {
    return this.cursor >= 0;
  }

  get canRedo(): boolean {
    return this.cursor < this.stack.length - 1;
  }

  get undoCount(): number {
    return this.cursor + 1;
  }

  get redoCount(): number {
    return this.stack.length - 1 - this.cursor;
  }

  /** Label of the next undo command */
  get undoLabel(): string | null {
    return this.canUndo ? this.stack[this.cursor].name : null;
  }

  /** Label of the next redo command */
  get redoLabel(): string | null {
    return this.canRedo ? this.stack[this.cursor + 1].name : null;
  }

  // ---------- Subscription ----------

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

// Singleton instance used by the editor
export const historyManager = new HistoryManager(50);

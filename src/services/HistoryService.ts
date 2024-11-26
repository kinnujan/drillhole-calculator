import { LogEntry } from '../types';
import databaseService from './DatabaseService';

export interface Command {
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  description: string;
}

type HistoryChangeListener = () => void;

export class HistoryService {
  #undoStack: Command[] = [];
  #redoStack: Command[] = [];
  #executingCommand = false;
  #changeListeners: HistoryChangeListener[] = [];

  constructor() {
    console.log('[History] HistoryService initialized');
  }

  public addChangeListener(listener: HistoryChangeListener) {
    console.log('[History] Adding change listener, total listeners:', this.#changeListeners.length + 1);
    this.#changeListeners.push(listener);
  }

  public removeChangeListener(listener: HistoryChangeListener) {
    this.#changeListeners = this.#changeListeners.filter(l => l !== listener);
    console.log('[History] Removing change listener, remaining listeners:', this.#changeListeners.length);
  }

  private notifyListeners() {
    console.log('[History] Notifying listeners of stack changes. Undo stack:', this.#undoStack.length, 'Redo stack:', this.#redoStack.length);
    this.#changeListeners.forEach(listener => listener());
  }

  public canUndo(): boolean {
    const canUndo = this.#undoStack.length > 0;
    console.log('[History] Can undo:', canUndo, 'Stack size:', this.#undoStack.length);
    return canUndo;
  }

  public canRedo(): boolean {
    const canRedo = this.#redoStack.length > 0;
    console.log('[History] Can redo:', canRedo, 'Stack size:', this.#redoStack.length);
    return canRedo;
  }

  // Deep clone an entry to ensure we preserve all fields
  private static cloneEntry(entry: LogEntry): LogEntry {
    console.log('[History] Cloning entry:', entry);
    const clonedEntry = {
      ...entry,
      fields: { ...entry.fields },
      created: entry.created ? new Date(entry.created) : undefined,
      modified: entry.modified ? new Date(entry.modified) : undefined
    };
    console.log('[History] Cloned entry:', clonedEntry);
    return clonedEntry;
  }

  public async executeCommand(command: Command): Promise<void> {
    if (this.#executingCommand) {
      console.log('[History] Command execution already in progress, skipping');
      return;
    }

    this.#executingCommand = true;
    try {
      console.log('[History] Starting command execution:', command.description);
      await command.execute();
      this.#undoStack.push(command);
      this.#redoStack = [];
      this.notifyListeners();
      console.log('[History] Command executed successfully');
    } catch (error) {
      console.error('[History] Command execution failed:', error);
      // Don't add failed commands to the stack
      if (error instanceof Error && error.message === 'OVERLAP_DETECTED') {
        // Re-throw overlap errors to be handled by UI
        throw error;
      } else {
        // For other errors, provide more context
        throw new Error(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      this.#executingCommand = false;
    }
  }

  public async undo(): Promise<void> {
    if (!this.canUndo() || this.#executingCommand) {
      return;
    }

    this.#executingCommand = true;
    try {
      const command = this.#undoStack.pop();
      if (command) {
        console.log('[History] Undoing command:', command.description);
        await command.undo();
        this.#redoStack.push(command);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[History] Undo failed:', error);
      throw error;
    } finally {
      this.#executingCommand = false;
    }
  }

  public async redo(): Promise<void> {
    if (!this.canRedo() || this.#executingCommand) {
      return;
    }

    this.#executingCommand = true;
    try {
      const command = this.#redoStack.pop();
      if (command) {
        console.log('[History] Redoing command:', command.description);
        await command.execute();
        this.#undoStack.push(command);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[History] Redo failed:', error);
      throw error;
    } finally {
      this.#executingCommand = false;
    }
  }
}

export class DeleteEntryCommand implements Command {
  private entry: LogEntry;
  private drillholeId: string;

  constructor(entry: LogEntry, drillholeId: string) {
    console.log('[History] Creating DeleteEntryCommand with:', { entry, drillholeId });
    this.entry = HistoryService.cloneEntry(entry);
    this.drillholeId = drillholeId;
    console.log('[History] DeleteEntryCommand created with cloned entry');
  }

  public get description(): string {
    return `Delete entry ${this.entry.id} from drillhole ${this.drillholeId}`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing delete command for entry:', this.entry.id);
    await databaseService.deleteEntry(this.entry.id);
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing delete command for entry:', this.entry);
    await databaseService.addEntry(this.entry);
  }
}

export class AddEntryCommand implements Command {
  private entry: LogEntry;

  constructor(entry: LogEntry) {
    console.log('[History] Creating AddEntryCommand with:', { entry });
    this.entry = HistoryService.cloneEntry(entry);
    console.log('[History] AddEntryCommand created with cloned entry');
  }

  public get description(): string {
    return `Add entry ${this.entry.id}`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing add command for entry:', this.entry);
    await databaseService.addEntry(this.entry);
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing add command for entry:', this.entry.id);
    await databaseService.deleteEntry(this.entry.id);
  }
}

export class UpdateEntryCommand implements Command {
  private oldEntry: LogEntry;
  private newEntry: LogEntry;

  constructor(oldEntry: LogEntry, newEntry: LogEntry) {
    console.log('[History] Creating UpdateEntryCommand with:', { oldEntry, newEntry });
    this.oldEntry = HistoryService.cloneEntry(oldEntry);
    this.newEntry = HistoryService.cloneEntry(newEntry);
    console.log('[History] UpdateEntryCommand created with cloned entries');
  }

  public get description(): string {
    return `Update entry ${this.oldEntry.id}`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing update command:', this.newEntry);
    await databaseService.updateEntry(this.newEntry);
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing update command:', this.oldEntry);
    await databaseService.updateEntry(this.oldEntry);
  }
}

export class SplitEntryCommand implements Command {
  private originalEntry: LogEntry;
  private firstHalf: LogEntry;
  private secondHalf: LogEntry;

  constructor(originalEntry: LogEntry, firstHalf: LogEntry, secondHalf: LogEntry) {
    console.log('[History] Creating SplitEntryCommand with:', { originalEntry, firstHalf, secondHalf });
    this.originalEntry = HistoryService.cloneEntry(originalEntry);
    this.firstHalf = HistoryService.cloneEntry(firstHalf);
    this.secondHalf = HistoryService.cloneEntry(secondHalf);
    console.log('[History] SplitEntryCommand created with cloned entries');
  }

  public get description(): string {
    return `Split entry ${this.originalEntry.id}`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing split command');
    await databaseService.deleteEntry(this.originalEntry.id);
    await databaseService.addEntry(this.firstHalf);
    await databaseService.addEntry(this.secondHalf);
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing split command');
    await databaseService.deleteEntry(this.firstHalf.id);
    await databaseService.deleteEntry(this.secondHalf.id);
    await databaseService.addEntry(this.originalEntry);
  }
}

export class AdjustEntryCommand implements Command {
  private originalEntry: LogEntry;
  private adjustedEntry: LogEntry;
  private existingEntry: LogEntry;

  constructor(originalEntry: LogEntry, adjustedEntry: LogEntry, existingEntry: LogEntry) {
    console.log('[History] Creating AdjustEntryCommand with:', { originalEntry, adjustedEntry, existingEntry });
    this.originalEntry = HistoryService.cloneEntry(originalEntry);
    this.adjustedEntry = HistoryService.cloneEntry(adjustedEntry);
    this.existingEntry = HistoryService.cloneEntry(existingEntry);
    console.log('[History] AdjustEntryCommand created with cloned entries');
  }

  public get description(): string {
    return `Adjust entry from (${this.originalEntry.from} to ${this.originalEntry.to}) to (${this.adjustedEntry.from} to ${this.adjustedEntry.to})`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing adjust command');
    await databaseService.addEntry(this.adjustedEntry, true); // Skip overlap check
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing adjust command');
    await databaseService.deleteEntry(this.adjustedEntry.id);
    // When undoing, we need to check if we can safely restore the original entry
    const overlapResult = await databaseService.checkOverlap(this.originalEntry);
    if (!overlapResult.hasOverlap || 
        (overlapResult.overlappingEntries.length === 1 && 
         overlapResult.overlappingEntries[0].id === this.existingEntry.id)) {
      await databaseService.addEntry(this.originalEntry, true);
    } else {
      console.error('[History] Cannot safely undo adjust command - would cause new overlaps');
      throw new Error('Cannot undo: would cause new overlaps');
    }
  }
}

export class ReplaceOverlapCommand implements Command {
  private originalEntry: LogEntry;
  private newEntry: LogEntry;
  private replacedEntry: LogEntry;

  constructor(originalEntry: LogEntry, newEntry: LogEntry, replacedEntry: LogEntry) {
    console.log('[History] Creating ReplaceOverlapCommand with:', { originalEntry, newEntry, replacedEntry });
    this.originalEntry = HistoryService.cloneEntry(originalEntry);
    this.newEntry = HistoryService.cloneEntry(newEntry);
    this.replacedEntry = HistoryService.cloneEntry(replacedEntry);
    console.log('[History] ReplaceOverlapCommand created with cloned entries');
  }

  public get description(): string {
    return `Replace overlapping entry ${this.replacedEntry.id} with new entry`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing replace overlap command');
    await databaseService.deleteEntry(this.replacedEntry.id);
    await databaseService.addEntry(this.newEntry, true); // Skip overlap check
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing replace overlap command');
    await databaseService.deleteEntry(this.newEntry.id);
    await databaseService.addEntry(this.replacedEntry, true); // Skip overlap check
  }
}

export class OverlapResolutionCommand implements Command {
  private originalState: LogEntry[];
  private newState: LogEntry[];
  private drillholeId: string;

  constructor(drillholeId: string, originalState: LogEntry[], newState: LogEntry[]) {
    console.log('[History] Creating OverlapResolutionCommand with:', { 
      drillholeId,
      originalState, 
      newState 
    });
    this.drillholeId = drillholeId;
    this.originalState = originalState.map(e => HistoryService.cloneEntry(e));
    this.newState = newState.map(e => HistoryService.cloneEntry(e));
    console.log('[History] OverlapResolutionCommand created with cloned entries');
  }

  public get description(): string {
    return `Resolve overlap in drillhole ${this.drillholeId}`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing overlap resolution command');
    // Get current entries for this drillhole
    const currentEntries = await databaseService.getEntriesByHole(this.drillholeId);
    
    // Find entries to remove (in current but not in new state)
    const entriesToRemove = currentEntries.filter(current => 
      !this.newState.some(newEntry => newEntry.id === current.id)
    );

    // Find entries to add (in new state but not in current)
    const entriesToAdd = this.newState.filter(newEntry => 
      !currentEntries.some(current => current.id === newEntry.id)
    );

    // Delete entries that should be removed
    for (const entry of entriesToRemove) {
      await databaseService.deleteEntry(entry.id);
    }

    // Add new entries
    for (const entry of entriesToAdd) {
      await databaseService.addEntry(entry, true); // Skip overlap check
    }
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing overlap resolution command');
    // Get current entries for this drillhole
    const currentEntries = await databaseService.getEntriesByHole(this.drillholeId);
    
    // Find entries to remove (in current but not in original state)
    const entriesToRemove = currentEntries.filter(current => 
      !this.originalState.some(original => original.id === current.id)
    );

    // Find entries to restore (in original state but not in current)
    const entriesToRestore = this.originalState.filter(original => 
      !currentEntries.some(current => current.id === original.id)
    );

    // Delete entries that should be removed
    for (const entry of entriesToRemove) {
      await databaseService.deleteEntry(entry.id);
    }

    // Restore original entries
    for (const entry of entriesToRestore) {
      await databaseService.addEntry(entry, true); // Skip overlap check
    }
  }
}

export class DepthAdjustmentCommand implements Command {
  private originalEntries: LogEntry[];
  private updatedEntries: LogEntry[];
  private drillholeId: string;

  constructor(drillholeId: string, originalEntries: LogEntry[], updatedEntries: LogEntry[]) {
    console.log('[History] Creating DepthAdjustmentCommand:', { originalEntries, updatedEntries });
    this.drillholeId = drillholeId;
    this.originalEntries = originalEntries.map(e => HistoryService.cloneEntry(e));
    this.updatedEntries = updatedEntries.map(e => HistoryService.cloneEntry(e));
  }

  public get description(): string {
    return `Adjust depth for entries in drillhole ${this.drillholeId}`;
  }

  public async execute(): Promise<void> {
    console.log('[History] Executing depth adjustment command');
    await databaseService.updateEntries(this.updatedEntries);
  }

  public async undo(): Promise<void> {
    console.log('[History] Undoing depth adjustment command');
    await databaseService.updateEntries(this.originalEntries);
  }
}

// Create and export singleton instance
const historyService = new HistoryService();
Object.freeze(historyService);
export default historyService;

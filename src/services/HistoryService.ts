import { LogEntry } from '../types';
import databaseService from './DatabaseService';

export interface Command {
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  description: string;
}

export class HistoryService {
  #undoStack: Command[] = [];
  #redoStack: Command[] = [];
  #executingCommand = false;

  constructor() {
    console.log('[History] HistoryService initialized');
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

  public canUndo(): boolean {
    return this.#undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.#redoStack.length > 0;
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
      console.log('[History] Command executed successfully');
    } catch (error) {
      console.error('[History] Command execution failed:', error);
      throw error;
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

// Create and export singleton instance
const historyService = new HistoryService();
Object.freeze(historyService);
export default historyService;

import { LogEntry } from '../types';
import DatabaseService from './DatabaseService';

export interface Command {
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  description: string;
}

class HistoryService {
  private static instance: HistoryService;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private isExecutingCommand = false;

  private constructor() {
    console.log('[History] HistoryService initialized');
  }

  public static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
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
    if (this.isExecutingCommand) {
      console.log('[History] Command execution already in progress, skipping');
      return;
    }

    try {
      console.log('[History] Starting command execution:', command.description);
      this.isExecutingCommand = true;
      await command.execute();
      this.undoStack.push(command);
      this.redoStack = [];
      console.log('[History] Command executed successfully:', command.description);
      console.log('[History] Undo stack size:', this.undoStack.length);
      console.log('[History] Redo stack size:', this.redoStack.length);
    } catch (error) {
      console.error('[History] Error executing command:', error);
      throw error;
    } finally {
      this.isExecutingCommand = false;
    }
  }

  public async undo(): Promise<void> {
    if (this.isExecutingCommand || this.undoStack.length === 0) {
      console.log('[History] Cannot undo: ' + 
        (this.isExecutingCommand ? 'Command in progress' : 'Nothing to undo'));
      return;
    }

    try {
      this.isExecutingCommand = true;
      const command = this.undoStack.pop()!;
      console.log('[History] Undoing command:', command.description);
      await command.undo();
      this.redoStack.push(command);
      console.log('[History] Command undone successfully');
      console.log('[History] Undo stack size:', this.undoStack.length);
      console.log('[History] Redo stack size:', this.redoStack.length);
    } catch (error) {
      console.error('[History] Error undoing command:', error);
      throw error;
    } finally {
      this.isExecutingCommand = false;
    }
  }

  public async redo(): Promise<void> {
    if (this.isExecutingCommand || this.redoStack.length === 0) {
      console.log('[History] Cannot redo: ' + 
        (this.isExecutingCommand ? 'Command in progress' : 'Nothing to redo'));
      return;
    }

    try {
      this.isExecutingCommand = true;
      const command = this.redoStack.pop()!;
      console.log('[History] Redoing command:', command.description);
      await command.execute();
      this.undoStack.push(command);
      console.log('[History] Command redone successfully');
      console.log('[History] Undo stack size:', this.undoStack.length);
      console.log('[History] Redo stack size:', this.redoStack.length);
    } catch (error) {
      console.error('[History] Error redoing command:', error);
      throw error;
    } finally {
      this.isExecutingCommand = false;
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.isExecutingCommand = false;
  }
}

// Command implementations
export class DeleteEntryCommand implements Command {
  private entry: LogEntry;
  private drillholeId: string;
  private dbService: DatabaseService;

  constructor(entry: LogEntry, drillholeId: string) {
    console.log('[History] Creating DeleteEntryCommand with:', { entry, drillholeId });
    this.entry = HistoryService.cloneEntry(entry);
    this.drillholeId = drillholeId;
    this.dbService = DatabaseService.getInstance();
    console.log('[History] DeleteEntryCommand created with cloned entry');
  }

  public get description(): string {
    return `Delete entry from ${this.entry.from} to ${this.entry.to}`;
  }

  public async execute(): Promise<void> {
    try {
      console.log('[History] Executing delete command for entry:', this.entry.id);
      await this.dbService.deleteEntry(this.entry.id);
      console.log('[History] Delete command executed successfully');
    } catch (error) {
      console.error('[History] Error executing delete command:', error);
      throw error;
    }
  }

  public async undo(): Promise<void> {
    try {
      console.log('[History] Undoing delete command for entry:', this.entry.id);
      await this.dbService.addEntry(this.entry);
      console.log('[History] Delete command undone successfully');
    } catch (error) {
      console.error('[History] Error undoing delete command:', error);
      throw error;
    }
  }
}

export class AddEntryCommand implements Command {
  private entry: LogEntry;
  private dbService: DatabaseService;

  constructor(entry: LogEntry) {
    console.log('[History] Creating AddEntryCommand with:', { entry });
    this.entry = HistoryService.cloneEntry(entry);
    this.dbService = DatabaseService.getInstance();
    console.log('[History] AddEntryCommand created with cloned entry');
  }

  public get description(): string {
    return `Add entry from ${this.entry.from} to ${this.entry.to}`;
  }

  public async execute(): Promise<void> {
    try {
      console.log('[History] Executing add command for entry:', this.entry.id);
      await this.dbService.addEntry(this.entry);
      console.log('[History] Add command executed successfully');
    } catch (error) {
      console.error('[History] Error executing add command:', error);
      throw error;
    }
  }

  public async undo(): Promise<void> {
    try {
      console.log('[History] Undoing add command for entry:', this.entry.id);
      await this.dbService.deleteEntry(this.entry.id);
      console.log('[History] Add command undone successfully');
    } catch (error) {
      console.error('[History] Error undoing add command:', error);
      throw error;
    }
  }
}

export class UpdateEntryCommand implements Command {
  private oldEntry: LogEntry;
  private newEntry: LogEntry;
  private dbService: DatabaseService;

  constructor(oldEntry: LogEntry, newEntry: LogEntry) {
    console.log('[History] Creating UpdateEntryCommand with:', { oldEntry, newEntry });
    this.oldEntry = HistoryService.cloneEntry(oldEntry);
    this.newEntry = HistoryService.cloneEntry(newEntry);
    this.dbService = DatabaseService.getInstance();
    console.log('[History] UpdateEntryCommand created with cloned entries');
  }

  public get description(): string {
    return `Update entry from ${this.oldEntry.from}-${this.oldEntry.to} to ${this.newEntry.from}-${this.newEntry.to}`;
  }

  public async execute(): Promise<void> {
    try {
      console.log('[History] Executing update command for entry:', this.oldEntry.id);
      await this.dbService.updateEntry(this.newEntry);
      console.log('[History] Update command executed successfully');
    } catch (error) {
      console.error('[History] Error executing update command:', error);
      throw error;
    }
  }

  public async undo(): Promise<void> {
    try {
      console.log('[History] Undoing update command for entry:', this.oldEntry.id);
      await this.dbService.updateEntry(this.oldEntry);
      console.log('[History] Update command undone successfully');
    } catch (error) {
      console.error('[History] Error undoing update command:', error);
      throw error;
    }
  }
}

export class SplitEntryCommand implements Command {
  private originalEntry: LogEntry;
  private firstHalf: LogEntry;
  private secondHalf: LogEntry;
  private dbService: DatabaseService;

  constructor(originalEntry: LogEntry, firstHalf: LogEntry, secondHalf: LogEntry) {
    console.log('[History] Creating SplitEntryCommand with:', { originalEntry, firstHalf, secondHalf });
    this.originalEntry = HistoryService.cloneEntry(originalEntry);
    this.firstHalf = HistoryService.cloneEntry(firstHalf);
    this.secondHalf = HistoryService.cloneEntry(secondHalf);
    this.dbService = DatabaseService.getInstance();
    console.log('[History] SplitEntryCommand created with cloned entries');
  }

  public get description(): string {
    return `Split entry from ${this.originalEntry.from} to ${this.originalEntry.to}`;
  }

  public async execute(): Promise<void> {
    try {
      console.log('[History] Executing split command for entry:', this.originalEntry.id);
      await this.dbService.splitEntry(this.originalEntry, this.firstHalf, this.secondHalf);
      console.log('[History] Split command executed successfully');
    } catch (error) {
      console.error('[History] Error executing split command:', error);
      throw error;
    }
  }

  public async undo(): Promise<void> {
    try {
      console.log('[History] Undoing split command for entry:', this.originalEntry.id);
      await this.dbService.unsplitEntry(this.originalEntry, this.firstHalf.id, this.secondHalf.id);
      console.log('[History] Split command undone successfully');
    } catch (error) {
      console.error('[History] Error undoing split command:', error);
      throw error;
    }
  }
}

export default HistoryService;

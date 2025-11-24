import { Injectable } from '@angular/core';
import { ICommand } from '../../core/models/command.model';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];

  executeCommand(command: ICommand): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

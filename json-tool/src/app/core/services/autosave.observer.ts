import { Injectable } from '@angular/core';
import { IObserver } from '../models/observer.model';
import { JsonSchema } from '../models/json-schema.model';

@Injectable({
  providedIn: 'root'
})
export class AutoSaveObserver implements IObserver {
  private readonly STORAGE_KEY = 'json_schema_autosave';
  private saveTimeout?: number;

  update(data: JsonSchema): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      this.save(data);
    }, 1000);
  }

  private save(data: JsonSchema): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
}

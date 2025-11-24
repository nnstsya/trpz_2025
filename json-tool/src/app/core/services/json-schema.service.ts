import { Injectable } from '@angular/core';
import { IObserver, ISubject } from '../models/observer.model';
import { JsonSchema } from '../models/json-schema.model';

@Injectable({
  providedIn: 'root'
})
export class JsonSchemaService implements ISubject {
  private observers: IObserver[] = [];
  private schema: JsonSchema = { properties: [] };
  private readonly STORAGE_KEY = 'json_schema_autosave';

  attach(observer: IObserver): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  detach(observer: IObserver): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  notify(): void {
    for (const observer of this.observers) {
      observer.update(this.schema);
    }
  }

  getSchema(): JsonSchema {
    return JSON.parse(JSON.stringify(this.schema));
  }

  updateSchema(schema: JsonSchema): void {
    this.schema = JSON.parse(JSON.stringify(schema));
    this.notify();
  }

  loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.schema = JSON.parse(stored);
        this.notify();
      } catch (error) {
        console.error('Failed to load schema from storage');
      }
    }
  }

  saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.schema));
  }

  clearStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

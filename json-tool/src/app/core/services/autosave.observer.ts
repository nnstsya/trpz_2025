import { Injectable } from '@angular/core';
import { IObserver } from '../models/observer.model';
import { JsonSchema } from '../models/json-schema.model';
import { FirebaseService } from './firebase.service';
import { Subject } from 'rxjs';

export interface AutoSaveData {
  schema: JsonSchema;
  jsonText: string;
  schemaId: string | null;
  name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AutoSaveObserver implements IObserver {
  private readonly STORAGE_KEY = 'json_schema_autosave';
  private readonly JSON_TEXT_KEY = 'json_text_autosave';
  private saveTimeout?: number;
  private pendingData: AutoSaveData | null = null;

  public saveStatus$ = new Subject<'saving' | 'saved' | 'error'>();

  constructor(private firebaseService: FirebaseService) {}

  update(data: JsonSchema): void {
    if (this.pendingData) {
      this.pendingData.schema = data;
    }
    this.scheduleSave();
  }

  updateWithJsonText(schema: JsonSchema, jsonText: string, schemaId: string | null, name?: string): void {
    this.pendingData = { schema, jsonText, schemaId, name };
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveStatus$.next('saving');

    this.saveTimeout = window.setTimeout(() => {
      this.save();
    }, 1500);
  }

  private async save(): Promise<void> {
    const user = this.firebaseService.currentUser;

    if (user && this.pendingData?.schemaId) {
      try {
        await this.firebaseService.saveUserSchema(
          user.uid,
          this.pendingData.schemaId,
          this.pendingData.schema,
          this.pendingData.jsonText,
          this.pendingData.name
        );
        this.saveStatus$.next('saved');
      } catch (error) {
        console.error('Failed to autosave to Firebase:', error);
        this.saveStatus$.next('error');
        this.saveToLocal();
      }
    } else {
      this.saveToLocal();
    }
  }

  private saveToLocal(): void {
    if (this.pendingData) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pendingData.schema));
      localStorage.setItem(this.JSON_TEXT_KEY, this.pendingData.jsonText);
      this.saveStatus$.next('saved');
    }
  }

  loadFromLocal(): { schema: JsonSchema | null; jsonText: string | null } {
    const schemaStr = localStorage.getItem(this.STORAGE_KEY);
    const jsonText = localStorage.getItem(this.JSON_TEXT_KEY);
    return {
      schema: schemaStr ? JSON.parse(schemaStr) : null,
      jsonText
    };
  }

  clearLocal(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.JSON_TEXT_KEY);
  }
}

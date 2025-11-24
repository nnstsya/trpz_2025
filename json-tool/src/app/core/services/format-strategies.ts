import { IFormatStrategy } from '../models/format-strategy.model';

export class MinifyStrategy implements IFormatStrategy {
  format(json: string): string {
    try {
      const parsed = JSON.parse(json);
      return JSON.stringify(parsed);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
}

export class PrettifyStrategy implements IFormatStrategy {
  format(json: string): string {
    try {
      const parsed = JSON.parse(json);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
}

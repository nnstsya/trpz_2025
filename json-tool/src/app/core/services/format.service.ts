import { Injectable } from '@angular/core';
import { IFormatStrategy } from '../models/format-strategy.model';
import { MinifyStrategy, PrettifyStrategy } from './format-strategies';

@Injectable({
  providedIn: 'root'
})
export class FormatService {
  private strategy: IFormatStrategy;

  constructor() {
    this.strategy = new PrettifyStrategy();
  }

  setStrategy(strategy: IFormatStrategy): void {
    this.strategy = strategy;
  }

  format(json: string): string {
    return this.strategy.format(json);
  }

  minify(json: string): string {
    this.setStrategy(new MinifyStrategy());
    return this.format(json);
  }

  prettify(json: string): string {
    this.setStrategy(new PrettifyStrategy());
    return this.format(json);
  }
}

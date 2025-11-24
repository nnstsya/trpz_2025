import { Injectable } from '@angular/core';
import { SchemaPropertyMetadata } from '../models/flyweight.model';

@Injectable({
  providedIn: 'root'
})
export class FlyweightFactoryService {
  private metadata: Map<string, SchemaPropertyMetadata> = new Map();

  getMetadata(dataType: string, format?: string): SchemaPropertyMetadata {
    const key = `${dataType}:${format || 'default'}`;

    if (!this.metadata.has(key)) {
      this.metadata.set(key, this.createMetadata(dataType, format));
    }

    return this.metadata.get(key)!;
  }

  private createMetadata(dataType: string, format?: string): SchemaPropertyMetadata {
    const validators: string[] = [];

    switch (dataType) {
      case 'string':
        validators.push('isString');
        if (format === 'email') validators.push('isEmail');
        if (format === 'url') validators.push('isURL');
        break;
      case 'number':
        validators.push('isNumber');
        break;
      case 'boolean':
        validators.push('isBoolean');
        break;
      case 'array':
        validators.push('isArray');
        break;
      case 'object':
        validators.push('isObject');
        break;
    }

    return {
      dataType,
      format,
      validators
    };
  }

  getPoolSize(): number {
    return this.metadata.size;
  }
}

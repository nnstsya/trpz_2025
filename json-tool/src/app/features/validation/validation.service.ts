import { Injectable } from '@angular/core';
import { JsonSchema, ValidationError, ValidationResult } from '../../core/models/json-schema.model';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  validate(jsonString: string, schema: JsonSchema): ValidationResult {
    const errors: ValidationError[] = [];

    let jsonData: any;
    try {
      jsonData = JSON.parse(jsonString);
      const syntaxError = this.checkJsonSyntax(jsonString);
      if (syntaxError) {
        errors.push(syntaxError);
      }
    } catch (parseError) {
      const syntaxError = this.checkJsonSyntax(jsonString);
      if (syntaxError) {
        errors.push(syntaxError);
      } else {
        errors.push({
          path: '$',
          message: `JSON parsing error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
          type: 'syntax'
        });
      }
      return { valid: false, errors };
    }

    if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
      errors.push({
        path: '$',
        message: 'Root must be an object',
        type: 'type'
      });
      return { valid: false, errors };
    }

    for (const prop of schema.properties) {
      const value = this.getValueByPath(jsonData, prop.name);

      if (value === undefined || value === null) {
        errors.push({
          path: `$.${prop.name}`,
          message: `Property "${prop.name}" is required`,
          type: 'required'
        });
      }
    }

    const schemaPropertyNames = new Set(schema.properties.map(p => p.name));
    const allJsonPaths = this.getAllPaths(jsonData);

    for (const path of allJsonPaths) {
      if (!schemaPropertyNames.has(path)) {
        errors.push({
          path: `$.${path}`,
          message: `Property "${path}" is not defined in schema`,
          type: 'extra'
        });
      }
    }

    for (const prop of schema.properties) {
      const value = this.getValueByPath(jsonData, prop.name);

      if (value === undefined || value === null) {
        continue;
      }

      const typeErrors = this.validateType(value, prop.dataType, prop.name);
      errors.push(...typeErrors);

      if (typeErrors.length === 0 && prop.format) {
        const formatError = this.validateFormat(value, prop.format, prop.name);
        if (formatError) {
          errors.push(formatError);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private checkJsonSyntax(jsonString: string): ValidationError | null {
    const trimmed = jsonString.trim();

    const trailingCommaPattern = /,\s*([}\]])/g;
    if (trailingCommaPattern.test(jsonString)) {
      return {
        path: '$',
        message: 'Trailing comma detected - invalid JSON syntax',
        type: 'syntax'
      };
    }

    const singleQuotePattern = /:\s*'[^']*'|'\s*:/;
    if (singleQuotePattern.test(jsonString)) {
      return {
        path: '$',
        message: 'Single quotes detected - JSON requires double quotes',
        type: 'syntax'
      };
    }

    const unquotedKeyPattern = /{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/;
    if (unquotedKeyPattern.test(jsonString)) {
      return {
        path: '$',
        message: 'Unquoted property name detected - keys must be in double quotes',
        type: 'syntax'
      };
    }

    return null;
  }

  private validateType(value: any, expectedType: string, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const actualType = this.getType(value);

    if (actualType !== expectedType) {
      errors.push({
        path: `$.${path}`,
        message: `Expected type "${expectedType}" but got "${actualType}"`,
        type: 'type'
      });
      return errors;
    }

    if (expectedType === 'array') {
      if (!Array.isArray(value)) {
        errors.push({
          path: `$.${path}`,
          message: `Expected array but got ${actualType}`,
          type: 'type'
        });
      } else if (value.length === 0) {
      } else {
        const firstElementType = this.getType(value[0]);
        for (let i = 1; i < value.length; i++) {
          const elementType = this.getType(value[i]);
          if (elementType !== firstElementType) {
            errors.push({
              path: `$.${path}[${i}]`,
              message: `Array has inconsistent types: expected "${firstElementType}" but element ${i} is "${elementType}"`,
              type: 'type'
            });
          }
        }
      }
    }

    if (expectedType === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({
          path: `$.${path}`,
          message: `Expected object but got ${actualType}`,
          type: 'type'
        });
      } else if (Object.keys(value).length === 0) {
        errors.push({
          path: `$.${path}`,
          message: `Object is empty`,
          type: 'format'
        });
      }
    }

    if (expectedType === 'string' && typeof value === 'string') {
      if (value.trim().length === 0) {
        errors.push({
          path: `$.${path}`,
          message: `String value is empty or contains only whitespace`,
          type: 'format'
        });
      }
    }

    if (expectedType === 'number' && typeof value === 'number') {
      if (isNaN(value)) {
        errors.push({
          path: `$.${path}`,
          message: `Number value is NaN`,
          type: 'format'
        });
      } else if (!isFinite(value)) {
        errors.push({
          path: `$.${path}`,
          message: `Number value is Infinity`,
          type: 'format'
        });
      }
    }

    return errors;
  }

  private validateFormat(value: any, format: string, path: string): ValidationError | null {
    switch (format) {
      case 'email':
        if (!this.isValidEmail(value)) {
          return {
            path: `$.${path}`,
            message: 'Invalid email format',
            type: 'format'
          };
        }
        break;

      case 'url':
        if (!this.isValidUrl(value)) {
          return {
            path: `$.${path}`,
            message: 'Invalid URL format',
            type: 'format'
          };
        }
        break;

      case 'date':
        if (!this.isValidDate(value)) {
          return {
            path: `$.${path}`,
            message: 'Invalid date format (expected ISO 8601)',
            type: 'format'
          };
        }
        break;

      case 'uuid':
        if (!this.isValidUuid(value)) {
          return {
            path: `$.${path}`,
            message: 'Invalid UUID format',
            type: 'format'
          };
        }
        break;
    }

    return null;
  }

  private isValidEmail(email: string): boolean {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    if (typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isValidDate(date: string): boolean {
    if (typeof date !== 'string') return false;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    if (!isoDateRegex.test(date)) return false;

    const parsed = Date.parse(date);
    return !isNaN(parsed);
  }

  private isValidUuid(uuid: string): boolean {
    if (typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private getType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  private getAllPaths(obj: any, prefix: string = ''): string[] {
    const paths: string[] = [];
    
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return paths;
    }
    
    for (const key of Object.keys(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      paths.push(fullPath);
      
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        paths.push(...this.getAllPaths(value, fullPath));
      }
    }
    
    return paths;
  }
}

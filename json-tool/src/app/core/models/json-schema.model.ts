export interface JsonSchemaProperty {
  name: string;
  description: string;
  example: any;
  dataType: string;
  format?: string;
}

export interface JsonSchema {
  properties: JsonSchemaProperty[];
}

export interface ValidationError {
  path: string;
  message: string;
  type: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

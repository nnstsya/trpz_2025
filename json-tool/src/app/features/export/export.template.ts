import { JsonSchema } from '../../core/models/json-schema.model';

export abstract class ExportTemplate {
  export(schema: JsonSchema): string {
    const prepared = this.prepareData(schema);
    const content = this.formatContent(prepared);
    return this.finalizeExport(content);
  }

  protected prepareData(schema: JsonSchema): any {
    return schema.properties;
  }

  protected abstract formatContent(data: any): string;

  protected finalizeExport(content: string): string {
    return content;
  }
}

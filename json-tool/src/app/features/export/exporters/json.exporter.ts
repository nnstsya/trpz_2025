import { ExportTemplate } from '../export.template';

export class JsonExporter extends ExportTemplate {
  protected formatContent(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}

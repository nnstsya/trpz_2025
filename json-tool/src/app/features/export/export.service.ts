import { Injectable } from '@angular/core';
import { JsonSchema } from '../../core/models/json-schema.model';
import { ExportFactory, ExportFormat } from './export.factory';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  export(schema: JsonSchema, format: ExportFormat): string {
    const exporter = ExportFactory.createExporter(format);
    return exporter.export(schema);
  }

  exportMarkdown(schema: JsonSchema): string {
    return this.export(schema, 'markdown');
  }

  exportJson(schema: JsonSchema): string {
    return this.export(schema, 'json');
  }

  exportYaml(schema: JsonSchema): string {
    return this.export(schema, 'yaml');
  }

  exportCsv(schema: JsonSchema): string {
    return this.export(schema, 'csv');
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}

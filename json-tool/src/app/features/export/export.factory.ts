import { ExportTemplate } from './export.template';
import { MarkdownExporter, JsonExporter, YamlExporter, CsvExporter } from './exporters';

export type ExportFormat = 'markdown' | 'json' | 'yaml' | 'csv';

export class ExportFactory {
  static createExporter(format: ExportFormat): ExportTemplate {
    switch (format) {
      case 'markdown':
        return new MarkdownExporter();
      case 'json':
        return new JsonExporter();
      case 'yaml':
        return new YamlExporter();
      case 'csv':
        return new CsvExporter();
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

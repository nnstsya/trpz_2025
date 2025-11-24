import { ExportTemplate } from '../export.template';

export class MarkdownExporter extends ExportTemplate {
  protected formatContent(data: any): string {
    let md = '| Name | Description | Type | Format | Example |\n';
    md += '|------|-------------|------|--------|----------|\n';

    for (const prop of data) {
      md += `| ${prop.name} | ${prop.description || ''} | ${prop.dataType} | ${prop.format || '-'} | ${JSON.stringify(prop.example)} |\n`;
    }

    return md;
  }
}

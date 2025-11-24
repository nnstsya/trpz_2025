import { ExportTemplate } from '../export.template';

export class CsvExporter extends ExportTemplate {
  protected formatContent(data: any): string {
    let csv = 'Name,Description,Type,Format,Example\n';

    for (const prop of data) {
      const name = this.escapeCsv(prop.name);
      const desc = this.escapeCsv(prop.description || '');
      const type = this.escapeCsv(prop.dataType);
      const format = this.escapeCsv(prop.format || '');
      const example = this.escapeCsv(JSON.stringify(prop.example));

      csv += `${name},${desc},${type},${format},${example}\n`;
    }

    return csv;
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

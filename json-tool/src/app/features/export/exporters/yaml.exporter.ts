import { ExportTemplate } from '../export.template';

export class YamlExporter extends ExportTemplate {
  protected formatContent(data: any): string {
    let yaml = '';

    for (const prop of data) {
      yaml += `- name: ${prop.name}\n`;
      yaml += `  description: ${prop.description || ''}\n`;
      yaml += `  dataType: ${prop.dataType}\n`;
      if (prop.format) yaml += `  format: ${prop.format}\n`;
      yaml += `  example: ${JSON.stringify(prop.example)}\n`;
    }

    return yaml;
  }
}

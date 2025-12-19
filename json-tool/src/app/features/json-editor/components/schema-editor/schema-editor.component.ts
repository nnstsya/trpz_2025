import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TreeTableModule } from 'primeng/treetable';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { TreeNode } from 'primeng/api';
import { JsonSchema, JsonSchemaProperty } from '../../../../core/models/json-schema.model';

@Component({
  selector: 'app-schema-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TreeTableModule,
    InputTextModule,
    DropdownModule,
    CardModule,
    ChipModule,
    TooltipModule,
    FileUploadModule
  ],
  templateUrl: './schema-editor.component.html',
  styleUrl: './schema-editor.component.scss'
})
export class SchemaEditorComponent implements OnChanges {
  @Input() schema: JsonSchema = { properties: [] };
  @Input() viewMode: 'flat' | 'edit' = 'flat';
  @Input() treeData: TreeNode[] = [];
  @Input() selectedExportFormat: string = 'markdown';
  @Input() exportFormats: any[] = [];

  @Output() schemaChange = new EventEmitter<JsonSchema>();
  @Output() propertyAdd = new EventEmitter<void>();
  @Output() propertyRemove = new EventEmitter<JsonSchemaProperty>();
  @Output() propertyFocus = new EventEmitter<void>();
  @Output() propertyBlur = new EventEmitter<void>();
  @Output() importRequest = new EventEmitter<any>();
  @Output() exportRequest = new EventEmitter<void>();
  @Output() exportFormatChange = new EventEmitter<string>();
  @Output() expandAllRequest = new EventEmitter<void>();
  @Output() collapseAllRequest = new EventEmitter<void>();

  filteredProperties: JsonSchemaProperty[] = [];
  searchTerm: string = '';
  sortField: string = 'name';
  sortOrder: number = 1;

  dataTypes = [
    { label: 'Рядок', value: 'string' },
    { label: 'Число', value: 'number' },
    { label: 'Логічне значення', value: 'boolean' },
    { label: 'Масив', value: 'array' },
    { label: 'Об\'єкт', value: 'object' },
    { label: 'Нульове значення', value: 'null' }
  ];

  formatTypes = [
    { label: 'Немає', value: '' },
    { label: 'Електронна пошта', value: 'email' },
    { label: 'URL', value: 'url' },
    { label: 'Дата', value: 'date' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema']) {
      this.applyFilters();
    }
  }

  applyFilters(): void {
    let filtered = [...this.schema.properties];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(prop =>
        prop.name.toLowerCase().includes(term) ||
        prop.description?.toLowerCase().includes(term) ||
        prop.dataType.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const aVal = (a as any)[this.sortField] || '';
      const bVal = (b as any)[this.sortField] || '';

      if (typeof aVal === 'string') {
        return this.sortOrder * aVal.localeCompare(bVal);
      }
      return this.sortOrder * (aVal - bVal);
    });

    this.filteredProperties = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortOrder *= -1;
    } else {
      this.sortField = field;
      this.sortOrder = 1;
    }
    this.applyFilters();
  }

  addProperty(): void {
    this.propertyAdd.emit();
  }

  removeProperty(property: JsonSchemaProperty): void {
    this.propertyRemove.emit(property);
  }

  onPropertyChange(): void {
    this.schemaChange.emit(this.schema);
  }

  onPropertyFocus(): void {
    this.propertyFocus.emit();
  }

  onPropertyBlur(): void {
    this.propertyBlur.emit();
  }

  importSchema(event: any): void {
    this.importRequest.emit(event);
  }

  exportSchema(): void {
    this.exportRequest.emit();
  }

  onExportFormatChange(): void {
    this.exportFormatChange.emit(this.selectedExportFormat);
  }

  expandAll(): void {
    this.expandAllRequest.emit();
  }

  collapseAll(): void {
    this.collapseAllRequest.emit();
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { SplitterModule } from 'primeng/splitter';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { JsonTextEditorComponent } from './components/json-text-editor/json-text-editor.component';
import { SchemaEditorComponent } from './components/schema-editor/schema-editor.component';
import { JsonSchemaService } from '../../core/services/json-schema.service';
import { FormatService } from '../../core/services/format.service';
import { ValidationService } from '../validation/validation.service';
import { ExportService } from '../export/export.service';
import { HistoryService } from '../history/history.service';
import { AutoSaveObserver } from '../../core/services/autosave.observer';
import { FlyweightFactoryService } from '../../core/services/flyweight-factory.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { ActivatedRoute, Router } from '@angular/router';
import { JsonSchema, JsonSchemaProperty, ValidationResult } from '../../core/models/json-schema.model';
import { SchemaChangeCommand } from '../history/schema-change.command';
import { TreeNode } from 'primeng/api';

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ToastModule,
    ToolbarModule,
    SplitterModule,
    TooltipModule,
    ConfirmDialogModule,
    JsonTextEditorComponent,
    SchemaEditorComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './json-editor.component.html',
  styleUrl: './json-editor.component.scss'
})
export class JsonEditorComponent implements OnInit {
  jsonText: string = '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "age": 30\n}';
  schema: JsonSchema = { properties: [] };
  validationResult: ValidationResult | null = null;
  viewMode: 'flat' | 'edit' = 'flat';
  treeData: TreeNode[] = [];
  autoSaveStatus: string = 'Saved';
  charCount: number = 0;
  lineCount: number = 1;
  cursorLine: number = 1;
  cursorColumn: number = 1;
  private propertyChangeTimeout: any;
  private schemaBeforeEdit: JsonSchema | null = null;
  currentSchemaId: string | null = null;
  isAuthenticated: boolean = false;
  private jsonTextHistory: string[] = [];
  private jsonTextHistoryIndex: number = -1;
  private isUpdatingFromHistory: boolean = false;
  jsonComplete: boolean = true;
  jsonErrors: { line: number; message: string; column?: number }[] = [];

  exportFormats = [
    { label: 'Markdown', value: 'markdown' },
    { label: 'JSON', value: 'json' },
    { label: 'YAML', value: 'yaml' },
    { label: 'CSV', value: 'csv' }
  ];

  selectedExportFormat = 'markdown';

  constructor(
    private schemaService: JsonSchemaService,
    private formatService: FormatService,
    private validationService: ValidationService,
    private exportService: ExportService,
    private historyService: HistoryService,
    private autoSaveObserver: AutoSaveObserver,
    private flyweightFactory: FlyweightFactoryService,
    private firebaseService: FirebaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.firebaseService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });

    this.route.queryParams.subscribe(async params => {
      this.currentSchemaId = params['schemaId'] || null;

      if (this.currentSchemaId && this.firebaseService.currentUser) {
        await this.loadSchemaFromFirebase(this.currentSchemaId);
      } else {
        this.schemaService.attach(this.autoSaveObserver);
        this.schemaService.loadFromStorage();
        this.schema = this.schemaService.getSchema();

        if (this.schema.properties.length === 0) {
          this.initializeDefaultSchema();
        }
      }

      this.updateTreeData();
      this.updateCharCount();
      this.checkJsonComplete();
    });

    this.setupKeyboardShortcuts();

    this.jsonTextHistory.push(this.jsonText);
    this.jsonTextHistoryIndex = 0;
  }

  expandAll(): void {
    this.treeData.forEach(node => this.expandNode(node));
  }

  collapseAll(): void {
    this.treeData.forEach(node => this.collapseNode(node));
  }

  private expandNode(node: TreeNode): void {
    node.expanded = true;
    if (node.children) {
      node.children.forEach(child => this.expandNode(child));
    }
  }

  private collapseNode(node: TreeNode): void {
    node.expanded = false;
    if (node.children) {
      node.children.forEach(child => this.collapseNode(child));
    }
  }

  setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTextarea = target.tagName === 'TEXTAREA' && target.classList.contains('json-editor');

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveCurrentWork();
        return;
      }

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (isTextarea) {
          this.undoJsonText();
        } else if (this.canUndo()) {
          this.undo();
        }
      } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (isTextarea) {
          this.redoJsonText();
        } else if (this.canRedo()) {
          this.redo();
        }
      }
    });
  }

  async saveCurrentWork(): Promise<void> {
    if (this.isAuthenticated && this.firebaseService.currentUser) {
      await this.saveToFirebase();
    } else {
      this.schemaService.saveToStorage();
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Schema saved locally' });
    }
  }

  undoJsonText(): void {
    if (this.jsonTextHistoryIndex > 0) {
      this.jsonTextHistoryIndex--;
      this.isUpdatingFromHistory = true;
      this.jsonText = this.jsonTextHistory[this.jsonTextHistoryIndex];
      this.updateCharCount();
      this.isUpdatingFromHistory = false;
      this.messageService.add({ severity: 'info', summary: 'Undo', detail: 'JSON text reverted' });
    }
  }

  redoJsonText(): void {
    if (this.jsonTextHistoryIndex < this.jsonTextHistory.length - 1) {
      this.jsonTextHistoryIndex++;
      this.isUpdatingFromHistory = true;
      this.jsonText = this.jsonTextHistory[this.jsonTextHistoryIndex];
      this.updateCharCount();
      this.isUpdatingFromHistory = false;
      this.messageService.add({ severity: 'info', summary: 'Redo', detail: 'JSON text restored' });
    }
  }

  onJsonTextChange(newText: string): void {
    this.jsonText = newText;
    this.updateCharCount();
    this.autoSaveStatus = 'Saving...';

    if (!this.isUpdatingFromHistory) {
      if (this.jsonTextHistoryIndex < this.jsonTextHistory.length - 1) {
        this.jsonTextHistory = this.jsonTextHistory.slice(0, this.jsonTextHistoryIndex + 1);
      }
      this.jsonTextHistory.push(this.jsonText);
      this.jsonTextHistoryIndex = this.jsonTextHistory.length - 1;

      if (this.jsonTextHistory.length > 50) {
        this.jsonTextHistory.shift();
        this.jsonTextHistoryIndex--;
      }
    }

    setTimeout(() => {
      this.autoSaveStatus = 'Saved';
    }, 500);
  }

  updateCharCount(): void {
    this.charCount = this.jsonText.length;
    this.lineCount = this.jsonText.split('\n').length;
  }

  onCursorPositionChange(position: { line: number; column: number }): void {
    this.cursorLine = position.line;
    this.cursorColumn = position.column;
  }

  onExportFormatChange(format: string): void {
    this.selectedExportFormat = format;
  }

  checkJsonComplete(): void {
    this.jsonComplete = this.isJsonComplete(this.jsonText);
  }

  initializeDefaultSchema(): void {
    this.schema = {
      properties: [
        {
          name: 'name',
          description: 'User full name',
          example: 'John Doe',
          dataType: 'string',
          format: ''
        },
        {
          name: 'email',
          description: 'User email address',
          example: 'john@example.com',
          dataType: 'string',
          format: 'email'
        },
        {
          name: 'age',
          description: 'User age in years',
          example: 30,
          dataType: 'number',
          format: ''
        }
      ]
    };
    this.updateSchema();
  }

  addProperty(): void {
    const newProperty: JsonSchemaProperty = {
      name: 'newProperty',
      description: '',
      example: '',
      dataType: 'string',
      format: ''
    };

    const previousSchema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
    const newSchema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
    newSchema.properties.push(newProperty);

    const command = new SchemaChangeCommand(
      (schema) => {
        this.schemaService.updateSchema(schema);
        this.schema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
        this.updateTreeData();
      },
      previousSchema,
      newSchema
    );

    this.historyService.executeCommand(command);
    this.messageService.add({ severity: 'success', summary: 'Property Added', detail: 'New property added to schema' });
  }

  removeProperty(property: JsonSchemaProperty): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete property "${property.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const previousSchema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
        const newSchema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
        newSchema.properties = newSchema.properties.filter((p: JsonSchemaProperty) => p.name !== property.name);

        const command = new SchemaChangeCommand(
          (schema) => {
            this.schemaService.updateSchema(schema);
            this.schema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
            this.updateTreeData();
          },
          previousSchema,
          newSchema
        );

        this.historyService.executeCommand(command);
        this.messageService.add({ severity: 'info', summary: 'Property Removed', detail: 'Property removed from schema' });
      }
    });
  }

  updateSchema(): void {
    this.schemaService.updateSchema(this.schema);
    this.updateTreeData();
  }

  onPropertyFocus(): void {
    if (!this.schemaBeforeEdit) {
      this.schemaBeforeEdit = JSON.parse(JSON.stringify(this.schema));
    }
  }

  onPropertyChange(): void {
    clearTimeout(this.propertyChangeTimeout);
    this.propertyChangeTimeout = setTimeout(() => {
      this.updateSchema();
    }, 300);
  }

  onPropertyBlur(): void {
    if (this.schemaBeforeEdit) {
      const currentSchema = JSON.parse(JSON.stringify(this.schema));

      if (JSON.stringify(this.schemaBeforeEdit) !== JSON.stringify(currentSchema)) {
        const command = new SchemaChangeCommand(
          (schema) => {
            this.schemaService.updateSchema(schema);
            this.schema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
            this.updateTreeData();
          },
          this.schemaBeforeEdit,
          currentSchema
        );

        this.historyService.executeCommand(command);
      }
      this.schemaBeforeEdit = null;
    }
  }

  minifyJson(): void {
    try {
      this.jsonText = this.formatService.minify(this.jsonText);
      this.messageService.add({ severity: 'success', summary: 'Minified', detail: 'JSON minified successfully' });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid JSON format' });
    }
  }

  prettifyJson(): void {
    try {
      this.jsonText = this.formatService.prettify(this.jsonText);
      this.messageService.add({ severity: 'success', summary: 'Prettified', detail: 'JSON prettified successfully' });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid JSON format' });
    }
  }

  sortJsonKeys(): void {
    try {
      const parsed = JSON.parse(this.jsonText);
      const sorted = this.sortObjectKeys(parsed);
      const newJsonText = JSON.stringify(sorted, null, 2);

      if (!this.isUpdatingFromHistory) {
        if (this.jsonTextHistoryIndex < this.jsonTextHistory.length - 1) {
          this.jsonTextHistory = this.jsonTextHistory.slice(0, this.jsonTextHistoryIndex + 1);
        }
        this.jsonTextHistory.push(newJsonText);
        this.jsonTextHistoryIndex = this.jsonTextHistory.length - 1;

        if (this.jsonTextHistory.length > 50) {
          this.jsonTextHistory.shift();
          this.jsonTextHistoryIndex--;
        }
      }

      this.jsonText = newJsonText;
      this.updateCharCount();
      this.messageService.add({ severity: 'success', summary: 'Sorted', detail: 'JSON keys sorted alphabetically' });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid JSON format' });
    }
  }

  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    } else if (obj !== null && typeof obj === 'object') {
      const sorted: any = {};
      Object.keys(obj).sort().forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });
      return sorted;
    }
    return obj;
  }

  validateJson(): void {
    this.validationResult = this.validationService.validate(this.jsonText, this.schema);
    this.parseJsonErrors();

    if (this.validationResult.valid) {
      this.messageService.add({ severity: 'success', summary: 'Valid', detail: 'JSON is valid according to schema' });
      this.generateSchemaFromJson();
    } else {
      this.messageService.add({ severity: 'error', summary: 'Invalid', detail: `Found ${this.validationResult.errors.length} validation errors` });
    }
  }

  parseJsonErrors(): void {
    this.jsonErrors = [];
    try {
      JSON.parse(this.jsonText);
    } catch (error: any) {
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const textBeforeError = this.jsonText.substring(0, position);
        const line = textBeforeError.split('\n').length;
        const lines = textBeforeError.split('\n');
        const column = lines[lines.length - 1].length + 1;

        this.jsonErrors.push({
          line,
          column,
          message: error.message
        });
      }
    }

    if (this.validationResult && !this.validationResult.valid) {
      this.validationResult.errors.forEach(error => {
        const pathParts = error.path.split('.');
        const searchKey = pathParts[pathParts.length - 1];
        const lines = this.jsonText.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`"${searchKey}"`)) {
            this.jsonErrors.push({
              line: i + 1,
              message: error.message
            });
            break;
          }
        }
      });
    }
  }

  isJsonComplete(text: string): boolean {
    const stack: string[] = [];
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !inString) {
        inString = true;
        continue;
      }

      if (char === '"' && inString) {
        inString = false;
        continue;
      }

      if (inString) continue;

      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length === 0 || stack[stack.length - 1] !== '{') return false;
        stack.pop();
      } else if (char === ']') {
        if (stack.length === 0 || stack[stack.length - 1] !== '[') return false;
        stack.pop();
      }
    }

    return stack.length === 0 && !inString;
  }

  generateSchemaFromJson(): void {
    try {
      const jsonObj = JSON.parse(this.jsonText);
      const newProperties: JsonSchemaProperty[] = [];

      const inferType = (value: any): string => {
        if (Array.isArray(value)) return 'array';
        if (value === null) return 'string';
        return typeof value;
      };

      const inferFormat = (key: string, value: any): string => {
        if (typeof value === 'string') {
          if (key.toLowerCase().includes('email') || /\S+@\S+\.\S+/.test(value)) return 'email';
          if (key.toLowerCase().includes('url') || /^https?:\/\//.test(value)) return 'url';
          if (key.toLowerCase().includes('date') || !isNaN(Date.parse(value))) return 'date';
        }
        return '';
      };

      const processObject = (obj: any, prefix: string = '') => {
        Object.keys(obj).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = obj[key];
          const dataType = inferType(value);

          const existingProp = this.schema.properties.find(p => p.name === fullKey);
          if (!existingProp) {
            let exampleValue = value;
            // For objects, don't store the whole object as example, just indicate it's an object
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              exampleValue = '{}';
            } else if (typeof value === 'object' && value !== null) {
              exampleValue = JSON.stringify(value);
            }

            newProperties.push({
              name: fullKey,
              description: `Auto-generated from JSON`,
              example: exampleValue,
              dataType: dataType,
              format: inferFormat(key, value)
            });
          }

          // Recursively process nested objects to create properties for all nested fields
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            processObject(value, fullKey);
          }
        });
      };

      processObject(jsonObj);

      if (newProperties.length > 0) {
        const previousSchema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
        const newSchema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
        newSchema.properties.push(...newProperties);

        const command = new SchemaChangeCommand(
          (schema) => {
            this.schemaService.updateSchema(schema);
            this.schema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
            this.updateTreeData();
          },
          previousSchema,
          newSchema
        );

        this.historyService.executeCommand(command);
        this.messageService.add({
          severity: 'success',
          summary: 'Schema Generated',
          detail: `Added ${newProperties.length} new properties from JSON`
        });
      }
    } catch (error) {
    }
  }

  exportSchema(): void {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (this.selectedExportFormat) {
      case 'markdown':
        content = this.exportService.exportMarkdown(this.schema);
        filename = 'schema.md';
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = this.exportService.exportJson(this.schema);
        filename = 'schema.json';
        mimeType = 'application/json';
        break;
      case 'yaml':
        content = this.exportService.exportYaml(this.schema);
        filename = 'schema.yaml';
        mimeType = 'text/yaml';
        break;
      case 'csv':
        content = this.exportService.exportCsv(this.schema);
        filename = 'schema.csv';
        mimeType = 'text/csv';
        break;
    }

    this.exportService.downloadFile(content, filename, mimeType);
    this.messageService.add({ severity: 'success', summary: 'Exported', detail: `Schema exported as ${this.selectedExportFormat.toUpperCase()}` });
  }

  exportJsonText(): void {
    try {
      // Validate JSON before exporting
      JSON.parse(this.jsonText);
      this.exportService.downloadFile(this.jsonText, 'data.json', 'application/json');
      this.messageService.add({ severity: 'success', summary: 'Exported', detail: 'JSON text exported successfully' });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot export invalid JSON' });
    }
  }

  importSchema(event: any): void {
    // Handle different PrimeNG event structures
    let file = null;

    // Try different event structures
    if (event.files && event.files.length > 0) {
      file = event.files[0];
    } else if (event.currentFiles && event.currentFiles.length > 0) {
      file = event.currentFiles[0];
    } else if (event.target && event.target.files && event.target.files.length > 0) {
      file = event.target.files[0];
    }

    if (!file) {
      console.error('No file found in event:', event);
      this.messageService.add({ severity: 'warn', summary: 'No File', detail: 'Please select a file to import' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const content = e.target.result;
        const imported = JSON.parse(content);
        let newSchema: JsonSchema;

        if (Array.isArray(imported)) {
          newSchema = { properties: JSON.parse(JSON.stringify(imported)) };
        } else if (imported.properties && Array.isArray(imported.properties)) {
          newSchema = JSON.parse(JSON.stringify(imported));
        } else if (typeof imported === 'object' && imported !== null) {
          const generatedProps: JsonSchemaProperty[] = [];
          Object.keys(imported).forEach(key => {
            const value = imported[key];
            generatedProps.push({
              name: key,
              description: '',
              example: value,
              dataType: Array.isArray(value) ? 'array' : typeof value === 'object' ? 'object' : typeof value,
              format: ''
            });
          });
          newSchema = { properties: generatedProps };
        } else {
          throw new Error('Invalid schema format');
        }

        const previousSchema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
        const command = new SchemaChangeCommand(
          (schema) => {
            this.schemaService.updateSchema(schema);
            this.schema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
            this.updateTreeData();
          },
          previousSchema,
          newSchema
        );

        this.historyService.executeCommand(command);
        this.messageService.add({ severity: 'success', summary: 'Imported', detail: 'Schema imported successfully' });
      } catch (error: any) {
        console.error('Import error:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to import schema' });
      }
    };

    reader.onerror = () => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to read file' });
    };

    reader.readAsText(file);
  }

  undo(): void {
    this.historyService.undo();
    this.schema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
    this.updateTreeData();
    this.messageService.add({ severity: 'info', summary: 'Undo', detail: 'Action undone' });
  }

  redo(): void {
    this.historyService.redo();
    this.schema = JSON.parse(JSON.stringify(this.schemaService.getSchema()));
    this.updateTreeData();
    this.messageService.add({ severity: 'info', summary: 'Redo', detail: 'Action redone' });
  }

  canUndo(): boolean {
    return this.historyService.canUndo();
  }

  canRedo(): boolean {
    return this.historyService.canRedo();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'flat' ? 'edit' : 'flat';
    if (this.viewMode === 'edit') {
      this.updateTreeData();
    }
  }

  updateTreeData(): void {
    const buildTree = (properties: JsonSchemaProperty[]): TreeNode[] => {
      const root: { [key: string]: TreeNode } = {};

      properties.forEach(prop => {
        const parts = prop.name.split('.');
        let current = root;

        parts.forEach((part, index) => {
          if (!current[part]) {
            const isLeaf = index === parts.length - 1;
            current[part] = {
              data: {
                name: part,
                description: isLeaf ? prop.description : '',
                dataType: isLeaf ? prop.dataType : 'object',
                format: isLeaf ? (prop.format || '-') : '-',
                example: isLeaf ? (typeof prop.example === 'object' ? JSON.stringify(prop.example) : prop.example) : ''
              },
              children: []
            };
          }

          if (index < parts.length - 1 && current[part].children) {
            const childMap: { [key: string]: TreeNode } = {};
            current[part].children!.forEach(child => {
              childMap[child.data.name] = child;
            });
            current = childMap;
          }
        });
      });

      return Object.values(root);
    };

    this.treeData = buildTree(this.schema.properties);
  }

  getFlyweightPoolSize(): number {
    return this.flyweightFactory.getPoolSize();
  }

  async saveToFirebase(): Promise<void> {
    const user = this.firebaseService.currentUser;
    if (!user) {
      this.messageService.add({ severity: 'warn', summary: 'Not Authenticated', detail: 'Please sign in to save to cloud' });
      return;
    }

    try {
      const schemaId = this.currentSchemaId || `schema_${Date.now()}`;
      await this.firebaseService.saveUserSchema(user.uid, schemaId, this.schema);
      this.currentSchemaId = schemaId;
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Schema saved to cloud' });
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save schema' });
    }
  }

  async loadSchemaFromFirebase(schemaId: string): Promise<void> {
    const user = this.firebaseService.currentUser;
    if (!user) return;

    try {
      const data = await this.firebaseService.getUserSchema(user.uid, schemaId);
      if (data) {
        this.schema = data;
        this.schemaService.updateSchema(this.schema);
        this.updateTreeData();
        this.messageService.add({ severity: 'success', summary: 'Loaded', detail: 'Schema loaded from cloud' });
      }
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load schema' });
    }
  }

  goToCabinet(): void {
    this.router.navigate(['/cabinet']);
  }

  async signOut(): Promise<void> {
    try {
      await this.firebaseService.signOut();
      this.router.navigate(['/auth']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to sign out' });
    }
  }
}

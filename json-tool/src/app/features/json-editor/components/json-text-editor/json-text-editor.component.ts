import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextarea } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { FormatService } from '../../../../core/services/format.service';
import { ValidationResult } from '../../../../core/models/json-schema.model';

@Component({
  selector: 'app-json-text-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextarea,
    ButtonModule,
    CardModule,
    MessageModule,
    TooltipModule
  ],
  templateUrl: './json-text-editor.component.html',
  styleUrl: './json-text-editor.component.scss'
})
export class JsonTextEditorComponent implements OnInit {
  @Input() jsonText: string = '';
  @Input() validationResult: ValidationResult | null = null;
  @Input() jsonErrors: { line: number; message: string; column?: number }[] = [];
  @Input() jsonComplete: boolean = true;
  @Input() cursorLine: number = 1;
  @Input() cursorColumn: number = 1;

  @Output() jsonTextChange = new EventEmitter<string>();
  @Output() cursorPositionChange = new EventEmitter<{ line: number; column: number }>();
  @Output() minifyRequest = new EventEmitter<void>();
  @Output() prettifyRequest = new EventEmitter<void>();
  @Output() sortKeysRequest = new EventEmitter<void>();
  @Output() validateRequest = new EventEmitter<void>();
  @Output() generateSchemaRequest = new EventEmitter<void>();
  @Output() exportJsonTextRequest = new EventEmitter<void>();

  constructor(
    private formatService: FormatService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {}

  onTextChange(): void {
    this.jsonTextChange.emit(this.jsonText);
  }

  updateCursorPosition(event: any): void {
    const textarea = event.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = this.jsonText.substring(0, cursorPos);

    const line = textBeforeCursor.split('\n').length;
    const lines = textBeforeCursor.split('\n');
    const column = lines[lines.length - 1].length + 1;

    this.cursorPositionChange.emit({ line, column });
  }

  handleAutoClose(event: KeyboardEvent): void {
    const textarea = event.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const pairs: { [key: string]: string } = {
      '{': '}',
      '[': ']',
      '"': '"',
      "'": "'"
    };

    if (pairs[event.key]) {
      event.preventDefault();
      const before = this.jsonText.substring(0, start);
      const after = this.jsonText.substring(end);
      const closingChar = pairs[event.key];

      if (event.key === '"' || event.key === "'") {
        const charBefore = before[before.length - 1];
        if (charBefore === '"' || charBefore === "'") {
          return;
        }
      }

      this.jsonText = before + event.key + closingChar + after;
      this.onTextChange();
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  }

  getLineErrors(lineNumber: number): string {
    const errors = this.jsonErrors.filter(e => e.line === lineNumber);
    return errors.map(e => e.message).join('; ');
  }

  minify(): void {
    this.minifyRequest.emit();
  }

  prettify(): void {
    this.prettifyRequest.emit();
  }

  sortKeys(): void {
    this.sortKeysRequest.emit();
  }

  validate(): void {
    this.validateRequest.emit();
  }

  generateSchema(): void {
    this.generateSchemaRequest.emit();
  }

  exportJsonText(): void {
    this.exportJsonTextRequest.emit();
  }

  getHighlightedJson(): string {
    if (!this.jsonText) return '';

    let highlighted = this.jsonText;

    highlighted = highlighted.replace(
      /"([^"\\]*(\\.[^"\\]*)*)"/g,
      (match, content) => {
        return `<span class="json-string">${match}</span>`;
      }
    );

    highlighted = highlighted.replace(
      /\b(-?\d+\.?\d*([eE][+-]?\d+)?)\b/g,
      '<span class="json-number">$1</span>'
    );

    highlighted = highlighted.replace(
      /\b(true|false)\b/g,
      '<span class="json-boolean">$1</span>'
    );

    highlighted = highlighted.replace(
      /\b(null)\b/g,
      '<span class="json-null">$1</span>'
    );

    highlighted = highlighted.replace(
      /([\[\]{}])/g,
      '<span class="json-bracket">$1</span>'
    );

    highlighted = highlighted.replace(
      /([,:])/g,
      '<span class="json-punctuation">$1</span>'
    );

    return highlighted;
  }
}

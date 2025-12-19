import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { FirebaseService } from '../../core/services/firebase.service';
import { MessageService, ConfirmationService } from 'primeng/api';

interface SchemaItem {
  id: string;
  name?: string;
  properties: any[];
  jsonText?: string;
  updatedAt: string;
}

@Component({
  selector: 'app-cabinet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    ToastModule,
    ToolbarModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './cabinet.component.html',
  styleUrl: './cabinet.component.scss'
})
export class CabinetComponent implements OnInit {
  schemas: SchemaItem[] = [];
  loading: boolean = false;
  userEmail: string = '';
  showRenameDialog: boolean = false;
  renameSchemaId: string = '';
  renameValue: string = '';

  constructor(
    private firebaseService: FirebaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.firebaseService.currentUser;
    if (!user) {
      this.router.navigate(['/auth']);
      return;
    }
    this.userEmail = user.email || '';
    await this.loadSchemas();
  }

  async loadSchemas(): Promise<void> {
    const user = this.firebaseService.currentUser;
    if (!user) return;

    this.loading = true;
    try {
      this.schemas = await this.firebaseService.getUserSchemas(user.uid);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Помилка', detail: 'Помилка завантаження схем' });
    } finally {
      this.loading = false;
    }
  }

  createNewSchema(): void {
    this.router.navigate(['/editor']);
  }

  openSchema(schemaId: string): void {
    this.router.navigate(['/editor'], { queryParams: { schemaId } });
  }

  deleteSchema(schema: SchemaItem): void {
    this.confirmationService.confirm({
      message: `Ви впевнені, що хочете видалити цю схему?`,
      header: 'Підтвердити видалення',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        const user = this.firebaseService.currentUser;
        if (!user) return;

        try {
          await this.firebaseService.deleteUserSchema(user.uid, schema.id);
          this.messageService.add({ severity: 'success', summary: 'Видалено', detail: 'Схема успішно видалена' });
          await this.loadSchemas();
        } catch (error: any) {
          this.messageService.add({ severity: 'error', summary: 'Помилка', detail: 'Помилка видалення схеми' });
        }
      }
    });
  }

  async signOut(): Promise<void> {
    try {
      await this.firebaseService.signOut();
      this.router.navigate(['/auth']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Помилка', detail: 'Помилка виходу' });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  openRenameDialog(schema: SchemaItem): void {
    this.renameSchemaId = schema.id;
    this.renameValue = schema.name || schema.id;
    this.showRenameDialog = true;
  }

  cancelRename(): void {
    this.showRenameDialog = false;
    this.renameSchemaId = '';
    this.renameValue = '';
  }

  async saveRename(): Promise<void> {
    const user = this.firebaseService.currentUser;
    if (!user || !this.renameSchemaId) return;

    try {
      await this.firebaseService.updateSchemaName(user.uid, this.renameSchemaId, this.renameValue);
      this.messageService.add({ severity: 'success', summary: 'Перейменовано', detail: 'Елемент успішно перейменовано' });
      this.showRenameDialog = false;
      await this.loadSchemas();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Помилка', detail: 'Помилка перейменування' });
    }
  }

  getDisplayName(schema: SchemaItem): string {
    return schema.name || schema.id;
  }

  getJsonPreview(schema: SchemaItem): string {
    if (!schema.jsonText) return '-';
    const preview = schema.jsonText.substring(0, 50);
    return preview.length < schema.jsonText.length ? preview + '...' : preview;
  }
}

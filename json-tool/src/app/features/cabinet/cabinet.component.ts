import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FirebaseService } from '../../core/services/firebase.service';
import { MessageService, ConfirmationService } from 'primeng/api';

interface SchemaItem {
  id: string;
  name?: string;
  properties: any[];
  updatedAt: string;
}

@Component({
  selector: 'app-cabinet',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TableModule,
    ToastModule,
    ToolbarModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './cabinet.component.html',
  styleUrl: './cabinet.component.scss'
})
export class CabinetComponent implements OnInit {
  schemas: SchemaItem[] = [];
  loading: boolean = false;
  userEmail: string = '';

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
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load schemas' });
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
      message: `Are you sure you want to delete this schema?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        const user = this.firebaseService.currentUser;
        if (!user) return;

        try {
          await this.firebaseService.deleteUserSchema(user.uid, schema.id);
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Schema deleted successfully' });
          await this.loadSchemas();
        } catch (error: any) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete schema' });
        }
      }
    });
  }

  async signOut(): Promise<void> {
    try {
      await this.firebaseService.signOut();
      this.router.navigate(['/auth']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to sign out' });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}

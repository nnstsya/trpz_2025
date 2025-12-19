import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { FirebaseService } from '../../core/services/firebase.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule,
    DividerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  email: string = '';
  password: string = '';
  isSignUp: boolean = false;
  loading: boolean = false;

  constructor(
    private firebaseService: FirebaseService,
    private messageService: MessageService,
    private router: Router
  ) {}

  async signIn(): Promise<void> {
    if (!this.email || !this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Попередження', detail: 'Будь ласка, заповніть усі поля' });
      return;
    }

    this.loading = true;
    try {
      await this.firebaseService.signInWithEmail(this.email, this.password);
      this.messageService.add({ severity: 'success', summary: 'Успіх', detail: 'Успішно увійшли' });
      this.router.navigate(['/editor']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Помилка', detail: error.message || 'Помилка входу' });
    } finally {
      this.loading = false;
    }
  }

  async signUp(): Promise<void> {
    if (!this.email || !this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Попередження', detail: 'Будь ласка, заповніть усі поля' });
      return;
    }

    if (this.password.length < 6) {
      this.messageService.add({ severity: 'warn', summary: 'Попередження', detail: 'Пароль повинен складатися з мінімум 6 символів' });
      return;
    }

    this.loading = true;
    try {
      await this.firebaseService.signUpWithEmail(this.email, this.password);
      this.messageService.add({ severity: 'success', summary: 'Успіх', detail: 'Рахунок успішно створено' });
      this.router.navigate(['/editor']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Помилка', detail: error.message || 'Помилка реєстрації' });
    } finally {
      this.loading = false;
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.loading = true;
    try {
      await this.firebaseService.signInWithGoogle();
      this.messageService.add({ severity: 'success', summary: 'Успіх', detail: 'Увійшли через Google' });
      this.router.navigate(['/editor']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Помилка', detail: error.message || 'Помилка входу через Google' });
    } finally {
      this.loading = false;
    }
  }

  toggleMode(): void {
    this.isSignUp = !this.isSignUp;
  }
}

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
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all fields' });
      return;
    }

    this.loading = true;
    try {
      await this.firebaseService.signInWithEmail(this.email, this.password);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Signed in successfully' });
      this.router.navigate(['/editor']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Sign in failed' });
    } finally {
      this.loading = false;
    }
  }

  async signUp(): Promise<void> {
    if (!this.email || !this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all fields' });
      return;
    }

    if (this.password.length < 6) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Password must be at least 6 characters' });
      return;
    }

    this.loading = true;
    try {
      await this.firebaseService.signUpWithEmail(this.email, this.password);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Account created successfully' });
      this.router.navigate(['/editor']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Sign up failed' });
    } finally {
      this.loading = false;
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.loading = true;
    try {
      await this.firebaseService.signInWithGoogle();
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Signed in with Google' });
      this.router.navigate(['/editor']);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Google sign in failed' });
    } finally {
      this.loading = false;
    }
  }

  toggleMode(): void {
    this.isSignUp = !this.isSignUp;
  }
}

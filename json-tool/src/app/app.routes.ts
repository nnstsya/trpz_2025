import { Routes } from '@angular/router';
import { AuthComponent } from './features/auth/auth.component';
import { CabinetComponent } from './features/cabinet/cabinet.component';
import { JsonEditorComponent } from './features/json-editor/json-editor.component';

export const routes: Routes = [
  { path: '', redirectTo: '/cabinet', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'cabinet', component: CabinetComponent },
  { path: 'editor', component: JsonEditorComponent }
];

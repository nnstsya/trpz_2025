import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  private auth: Auth;
  private firestore: Firestore;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser$ = this.currentUserSubject.asObservable();

    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  async signUpWithEmail(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    return result.user;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async saveUserSchema(userId: string, schemaId: string, schemaData: any, jsonText?: string, name?: string): Promise<void> {
    const schemaRef = doc(this.firestore, `users/${userId}/schemas/${schemaId}`);
    await setDoc(schemaRef, {
      ...schemaData,
      jsonText: jsonText ?? '',
      name: name ?? schemaId,
      updatedAt: new Date().toISOString()
    });
  }

  async updateSchemaName(userId: string, schemaId: string, name: string): Promise<void> {
    const schemaRef = doc(this.firestore, `users/${userId}/schemas/${schemaId}`);
    const schemaDoc = await getDoc(schemaRef);
    if (schemaDoc.exists()) {
      await setDoc(schemaRef, {
        ...schemaDoc.data(),
        name,
        updatedAt: new Date().toISOString()
      });
    }
  }

  async getUserSchema(userId: string, schemaId: string): Promise<any> {
    const schemaRef = doc(this.firestore, `users/${userId}/schemas/${schemaId}`);
    const schemaDoc = await getDoc(schemaRef);
    return schemaDoc.exists() ? schemaDoc.data() : null;
  }

  async getUserSchemas(userId: string): Promise<any[]> {
    const schemasRef = collection(this.firestore, `users/${userId}/schemas`);
    const snapshot = await getDocs(schemasRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async deleteUserSchema(userId: string, schemaId: string): Promise<void> {
    const schemaRef = doc(this.firestore, `users/${userId}/schemas/${schemaId}`);
    await deleteDoc(schemaRef);
  }
}

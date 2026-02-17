import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'materials_app_logged_in';
  private readonly USERNAME = 'Sreten';
  private readonly PASSWORD = 'Stepenice.123';

  constructor(private router: Router) {}

  login(username: string, password: string): boolean {
    if (username === this.USERNAME && password === this.PASSWORD) {
      localStorage.setItem(this.STORAGE_KEY, 'true');
      return true;
    }
    return false;
  }

  isLoggedIn(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.router.navigate(['/login']);
  }
}

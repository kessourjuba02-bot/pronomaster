import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class LoginComponent implements OnInit {

    mode: 'login' | 'register' = 'login';
    email = '';
    password = '';
    confirm = '';
    loading = false;
    error = '';
    success = '';
    selectedPlan = '';

    constructor(private supabase: SupabaseService, private router: Router) { }

    ngOnInit() {
        this.supabase.session$.subscribe(session => {
            if (session) this.router.navigate(['/']);
        });
    }

    setMode(m: 'login' | 'register') {
        this.mode = m;
        this.error = '';
        this.success = '';
    }

    selectPlan(plan: string) {
        this.selectedPlan = this.selectedPlan === plan ? '' : plan;
    }

    async submit() {
        this.error = '';
        this.success = '';
        if (!this.email || !this.password) {
            this.error = 'Merci de remplir tous les champs.'; return;
        }
        if (this.mode === 'register' && this.password !== this.confirm) {
            this.error = 'Les mots de passe ne correspondent pas.'; return;
        }
        if (this.password.length < 6) {
            this.error = 'Le mot de passe doit contenir au moins 6 caractères.'; return;
        }
        this.loading = true;
        try {
            if (this.mode === 'login') {
                await this.supabase.signIn(this.email, this.password);
                this.router.navigate(['/']);
            } else {
                await this.supabase.signUp(this.email, this.password);
                const planInfo = this.selectedPlan ? ` Plan choisi : ${this.selectedPlan}.` : '';
                this.success = `Compte créé !${planInfo} Contacte l'admin pour activer ton accès.`;
                this.mode = 'login';
            }
        } catch (err: any) {
            this.error = this.translateError(err.message);
        } finally {
            this.loading = false;
        }
    }

    private translateError(msg: string): string {
        if (!msg) return 'Une erreur inconnue est survenue.';
        if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
        if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.';
        if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email.';
        if (msg.includes('Password should be')) return 'Le mot de passe doit contenir au moins 6 caractères.';
        return 'Erreur : ' + msg;
    }
}
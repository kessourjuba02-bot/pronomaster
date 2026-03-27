import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

const SUPABASE_URL = 'https://wpziubapssdsmcstzhaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g773qGbfDyyn-r6d-oqYig_7Uibxw1z';

// ⚠️ Remplace par ton email admin
const ADMIN_EMAIL = 'kessourjuba02@gmail.com';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
    private supabase!: SupabaseClient;
    private sessionSubject = new BehaviorSubject<Session | null>(null);
    private profileSubject = new BehaviorSubject<any>(null);

    session$ = this.sessionSubject.asObservable();
    profile$ = this.profileSubject.asObservable();

    constructor(
        @Inject(PLATFORM_ID) private platformId: object,
        private ngZone: NgZone
    ) {
        if (isPlatformBrowser(this.platformId)) {
            this.ngZone.runOutsideAngular(() => {
                // Configuration de Supabase avec un verrou factice pour éviter
                // le "NavigatorLockAcquireTimeoutError" causé par le Hot Reload d'Angular.
                this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
                    auth: {
                        lock: (name: any, arg2: any, arg3?: any) => (typeof arg2 === 'function' ? arg2() : arg3())
                    }
                });

                this.supabase.auth.getSession().then(({ data }) => {
                    this.ngZone.run(() => {
                        this.sessionSubject.next(data.session);
                        if (data.session) this.loadProfile(data.session.user.id);
                    });
                });

                this.supabase.auth.onAuthStateChange((_event, session) => {
                    this.ngZone.run(() => {
                        this.sessionSubject.next(session);
                        if (session) this.loadProfile(session.user.id);
                        else this.profileSubject.next(null);
                    });
                });
            });
        }
    }

    private async loadProfile(userId: string) {
        if (!isPlatformBrowser(this.platformId)) return;
        const { data } = await this.supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
        this.ngZone.run(() => {
            this.profileSubject.next(data);
        });
    }

    // ── AUTH ─────────────────────────────────────────────

    get currentUser(): User | null {
        return this.sessionSubject.value?.user ?? null;
    }

    get isAdmin(): boolean {
        return this.currentUser?.email === ADMIN_EMAIL;
    }

    get isVip(): boolean {
        const profile = this.profileSubject.value;
        return profile?.role === 'vip' || this.isAdmin;
    }

    async signUp(email: string, password: string) {
        if (!isPlatformBrowser(this.platformId)) throw new Error('Browser only');
        const { data, error } = await this.supabase.auth.signUp({ email, password });
        if (error) throw error;
        return this.ngZone.run(() => data);
    }

    async signIn(email: string, password: string) {
        if (!isPlatformBrowser(this.platformId)) throw new Error('Browser only');
        const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return this.ngZone.run(() => data);
    }

    async signOut() {
        if (!isPlatformBrowser(this.platformId)) return;
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
        this.ngZone.run(() => {
            this.sessionSubject.next(null);
            this.profileSubject.next(null);
        });
    }

    // ── PRONOS ───────────────────────────────────────────

    async getPronos(): Promise<any[]> {
        if (!isPlatformBrowser(this.platformId)) return [];
        const { data, error } = await this.supabase
            .from('pronos')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;
        return this.ngZone.run(() => data ?? []);
    }

    async addProno(prono: any): Promise<any> {
        if (!isPlatformBrowser(this.platformId)) throw new Error('Browser only');
        const { data, error } = await this.supabase
            .from('pronos')
            .insert([prono])
            .select('*')
            .single();
        if (error) throw error;
        return this.ngZone.run(() => data);
    }

    async updatePronoResult(id: number, result: 'win' | 'loss' | 'pending') {
        if (!isPlatformBrowser(this.platformId)) return;
        const { error } = await this.supabase
            .from('pronos')
            .update({ result })
            .eq('id', id);
        if (error) throw error;
    }

    async deleteProno(id: number) {
        if (!isPlatformBrowser(this.platformId)) return;
        const { error } = await this.supabase
            .from('pronos')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
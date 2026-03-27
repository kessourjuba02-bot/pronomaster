import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
    const supabase = inject(SupabaseService);
    const router = inject(Router);
    return supabase.session$.pipe(
        take(1),
        map(session => {
            if (session) return true;
            
            // Si on détecte un jeton de confirmation dans l'URL, on ne redirige pas tout de suite
            // pour laisser à Supabase le temps de valider la session.
            if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
                return true;
            }
            
            return router.parseUrl('/login');
        })
    );
};
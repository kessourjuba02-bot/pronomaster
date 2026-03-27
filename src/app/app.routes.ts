import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { LoginComponent } from './login/login';
import { PricingComponent } from './pricing/pricing.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
    { path: '', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'login', component: LoginComponent },
    { path: 'pricing', component: PricingComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
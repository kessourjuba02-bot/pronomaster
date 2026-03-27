import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit {
  isLoggedIn = false;
  isVip = false;
  requested = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  ngOnInit() {
    this.supabase.session$.subscribe(session => {
      this.isLoggedIn = !!session;
    });
    this.supabase.profile$.subscribe(() => {
      this.isVip = this.supabase.isVip;
    });
  }

  requestAccess() {
    this.requested = true;
    // Ici on pourrait ajouter une logique Supabase pour enregistrer la demande
    setTimeout(() => alert("Ta demande d'accès VIP a été envoyée à l'admin !"), 500);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
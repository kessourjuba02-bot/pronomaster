import { Component, OnInit, Inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase.service';

interface CombiLeg { match: string; comp: string; sport: string; tip: string; cote: number | null; }

interface Prono {
  id: number; sport: string; match_name: string; comp: string;
  tip: string; cote: number; result: 'win' | 'loss' | 'pending';
  tipster: string; analysis: string; vip_only?: boolean;
  is_combi?: boolean; legs?: CombiLeg[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit {

  sportIcons: Record<string, string> = { foot: '⚽', basket: '🏀', tennis: '🎾', other: '🏒' };
  view: 'pronos' | 'historique' = 'pronos';
  currentFilter = 'all';
  showToast = false;
  showForm: 'single' | 'combi' | null = null;
  userEmail = '';
  isAdmin = false;
  isVip = false;

  form = { match: '', comp: '', sport: 'foot', tip: '', cote: null as number | null, tipster: 'SAFE', analysis: '', vip_only: false };

  combiLegs: CombiLeg[] = [
    { match: '', comp: '', sport: 'foot', tip: '', cote: null },
    { match: '', comp: '', sport: 'foot', tip: '', cote: null },
  ];
  combiForm = { tipster: 'SAFE', analysis: '', vip_only: false };
  combiTotalCote = 1;

  pronos: Prono[] = [];

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) { }

  async ngOnInit() {
    this.supabase.session$.subscribe(session => {
      this.userEmail = session?.user?.email ?? '';
      this.isAdmin = this.supabase.isAdmin;
    });
    this.supabase.profile$.subscribe(() => { this.isVip = this.supabase.isVip; });
    try { this.pronos = await this.supabase.getPronos(); }
    catch (err: any) { console.error('Erreur:', err.message); }
  }

  // ── GETTERS ──
  get activePronos(): Prono[] { return this.pronos.filter(p => p.result === 'pending'); }
  get wonPronos(): Prono[] { return this.pronos.filter(p => p.result === 'win'); }
  get lostPronos(): Prono[] { return this.pronos.filter(p => p.result === 'loss'); }
  get finished(): Prono[] { return this.pronos.filter(p => p.result !== 'pending'); }
  get filteredActive(): Prono[] {
    return this.currentFilter === 'all' ? this.activePronos : this.activePronos.filter(p => p.sport === this.currentFilter);
  }
  get filteredFinished(): Prono[] {
    return this.currentFilter === 'all' ? this.finished : this.finished.filter(p => p.sport === this.currentFilter);
  }
  get winRate(): number {
    const f = this.finished;
    return f.length ? Math.round(f.filter(p => p.result === 'win').length / f.length * 100) : 0;
  }
  get units(): number { return this.wonPronos.length * 3; }
  get streak(): number {
    let s = 0;
    for (let i = this.pronos.length - 1; i >= 0; i--) {
      if (this.pronos[i].result === 'win') s++;
      else if (this.pronos[i].result !== 'pending') break;
    }
    return s;
  }

  canSeeProno(p: Prono): boolean { return !p.vip_only || this.isVip; }
  setView(v: 'pronos' | 'historique') { this.view = v; }
  setFilter(sport: string) { this.currentFilter = sport; }
  goPricing() { this.router.navigate(['/pricing']); }

  openForm(type: 'single' | 'combi') {
    this.showForm = this.showForm === type ? null : type;
  }

  // ── COMBINÉ ──
  addLeg() {
    this.combiLegs.push({ match: '', comp: '', sport: 'foot', tip: '', cote: null });
  }
  removeLeg(i: number) {
    this.combiLegs.splice(i, 1);
    this.calcCombiCote();
  }
  calcCombiCote() {
    this.combiTotalCote = this.combiLegs.reduce((acc, leg) => {
      const c = Number(leg.cote);
      return acc * (c >= 1 ? c : 1);
    }, 1);
    this.combiTotalCote = Math.round(this.combiTotalCote * 100) / 100;
  }

  async addCombi() {
    if (!this.isAdmin) return;
    const valid = this.combiLegs.every(l => l.match && l.tip && l.cote && l.cote >= 1);
    if (!valid) { alert('Merci de remplir tous les matchs du combiné.'); return; }
    this.calcCombiCote();
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const firstLeg = this.combiLegs[0];
    const newProno = {
      sport: firstLeg.sport,
      match_name: `Combiné ${this.combiLegs.length} matchs`,
      comp: today,
      tip: this.combiLegs.map(l => l.tip).join(' + '),
      cote: this.combiTotalCote,
      result: 'pending',
      tipster: this.combiForm.tipster,
      analysis: this.combiForm.analysis,
      vip_only: this.combiForm.vip_only,
      is_combi: true,
      legs: this.combiLegs
    };
    try {
      const inserted = await this.supabase.addProno(newProno);
      if (inserted) this.pronos.unshift(inserted);
      this.combiLegs = [
        { match: '', comp: '', sport: 'foot', tip: '', cote: null },
        { match: '', comp: '', sport: 'foot', tip: '', cote: null },
      ];
      this.combiForm = { tipster: 'SAFE', analysis: '', vip_only: false };
      this.combiTotalCote = 1;
      this.showForm = null;
      this.showToast = true;
      if (isPlatformBrowser(this.platformId)) setTimeout(() => this.showToast = false, 3000);
    } catch (err: any) { alert('Erreur : ' + err.message); }
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  async addProno() {
    if (!this.isAdmin) return;
    if (!this.form.match || !this.form.tip || !this.form.cote || this.form.cote < 1) {
      alert('Merci de remplir le match, le pronostic et la cote (≥ 1).'); return;
    }
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const newProno = {
      sport: this.form.sport, match_name: this.form.match,
      comp: this.form.comp || today, tip: this.form.tip, cote: this.form.cote,
      result: 'pending', tipster: this.form.tipster,
      analysis: this.form.analysis, vip_only: this.form.vip_only, is_combi: false
    };
    try {
      const inserted = await this.supabase.addProno(newProno);
      if (inserted) this.pronos.unshift(inserted);
      this.form = { match: '', comp: '', sport: 'foot', tip: '', cote: null, tipster: 'SAFE', analysis: '', vip_only: false };
      this.showForm = null;
      this.showToast = true;
      if (isPlatformBrowser(this.platformId)) setTimeout(() => this.showToast = false, 3000);
    } catch (err: any) { alert('Erreur : ' + err.message); }
  }

  async updateResult(prono: Prono, res: 'win' | 'loss' | 'pending') {
    if (!this.isAdmin) return;
    try { await this.supabase.updatePronoResult(prono.id, res); prono.result = res; }
    catch (err: any) { alert('Erreur : ' + err.message); }
  }

  async deleteProno(id: number) {
    if (!this.isAdmin) return;
    if (isPlatformBrowser(this.platformId) && !confirm('Supprimer ce pronostic ?')) return;
    try { await this.supabase.deleteProno(id); this.pronos = this.pronos.filter(p => p.id !== id); }
    catch (err: any) { alert('Erreur : ' + err.message); }
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, TenantDTO } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-4rem)]">
      <!-- Sidebar -->
      <aside class="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div class="px-5 pt-6 pb-4">
          <h2 class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Panel de Administración</h2>
        </div>
        <nav class="flex-1 px-3 space-y-1">
          <a (click)="seccionActiva = 'tenants'"
             class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
             [class]="seccionActiva === 'tenants' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'">
            🏢 Empresas
          </a>
          <a (click)="seccionActiva = 'usuarios'"
             class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
             [class]="seccionActiva === 'usuarios' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'">
            👥 Usuarios
          </a>
        </nav>
        <div class="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-sky-500/10 border border-indigo-500/10">
          <p class="text-xs font-semibold text-slate-200">Sistema BPM</p>
          <p class="text-[10px] text-slate-500 mt-0.5">v0.1.0 · Fase de Construcción</p>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-8 overflow-y-auto">
        <div class="mb-8">
          <h1 class="text-3xl font-bold tracking-tight">
            {{ seccionActiva === 'tenants' ? 'Empresas (Tenants)' : 'Gestión de Usuarios' }}
          </h1>
          <p class="text-sm text-slate-400 mt-1">
            {{ seccionActiva === 'tenants' ? 'Organizaciones registradas.' : 'Usuarios y roles del tenant activo.' }}
          </p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-4 mb-8">
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">🏢</div>
              <p class="text-xs text-slate-500 font-medium">Tenants</p>
            </div>
            <p class="text-2xl font-bold">{{ adminService.tenants().length }}</p>
          </div>
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20">👥</div>
              <p class="text-xs text-slate-500 font-medium">Usuarios</p>
            </div>
            <p class="text-2xl font-bold">{{ adminService.usuarios().length }}</p>
          </div>
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-lg shadow-lg shadow-amber-500/20">🛡️</div>
              <p class="text-xs text-slate-500 font-medium">Admins</p>
            </div>
            <p class="text-2xl font-bold">{{ contarPorRol('ADMINISTRADOR') }}</p>
          </div>
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-lg shadow-lg shadow-purple-500/20">⚡</div>
              <p class="text-xs text-slate-500 font-medium">Funcionarios</p>
            </div>
            <p class="text-2xl font-bold">{{ contarPorRol('FUNCIONARIO') }}</p>
          </div>
        </div>

        <!-- TENANTS TABLE -->
        @if (seccionActiva === 'tenants') {
          <div class="rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <h3 class="text-sm font-semibold">Empresas Registradas</h3>
            </div>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-slate-800/40 bg-slate-800/20">
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nombre</th>
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">ID</th>
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Acciones</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-800/40">
                @for (tenant of adminService.tenants(); track tenant.id) {
                  <tr class="hover:bg-indigo-500/[0.03] transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20">{{ tenant.nombre.charAt(0) }}</div>
                        <span class="font-semibold text-slate-200">{{ tenant.nombre }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4"><span class="font-mono text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-lg">{{ tenant.id | slice:0:12 }}…</span></td>
                    <td class="px-6 py-4">
                      <button (click)="seleccionarTenant(tenant)" class="px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all">Ver Usuarios</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- USUARIOS TABLE -->
        @if (seccionActiva === 'usuarios') {
          <div class="rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <h3 class="text-sm font-semibold">Usuarios @if (tenantSeleccionado) { <span class="text-slate-500"> · {{ tenantSeleccionado.nombre }}</span> }</h3>
              <button (click)="mostrarModalUsuario = true" class="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">+ Nuevo Usuario</button>
            </div>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-slate-800/40 bg-slate-800/20">
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Usuario</th>
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rol</th>
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Registrado</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-800/40">
                @for (user of adminService.usuarios(); track user.id) {
                  <tr class="hover:bg-indigo-500/[0.03] transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-offset-1 ring-offset-slate-900"
                             [class]="getAvatarClasses(user.rol)">{{ user.nombre.charAt(0) }}</div>
                        <span class="font-semibold text-slate-200">{{ user.nombre }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-slate-400">{{ user.email }}</td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset"
                            [class]="getRolClasses(user.rol)">
                        <span class="w-1.5 h-1.5 rounded-full" [class]="getRolDot(user.rol)"></span>
                        {{ getRolLabel(user.rol) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-slate-400 text-xs">{{ user.creadoEn | date:'dd MMM yyyy' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (adminService.usuarios().length > 0) {
              <div class="px-6 py-3 border-t border-slate-800/40 bg-slate-800/10">
                <span class="text-xs text-slate-500">{{ adminService.usuarios().length }} usuarios</span>
              </div>
            }
          </div>
        }

        <!-- MODAL CREAR USUARIO -->
        @if (mostrarModalUsuario) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
              <h3 class="text-lg font-bold mb-4">Crear Nuevo Usuario</h3>
              @if (errorModal) {
                <div class="mb-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{{ errorModal }}</div>
              }
              <div class="space-y-3">
                <input [(ngModel)]="nuevoUser.nombre" placeholder="Nombre completo" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                <input [(ngModel)]="nuevoUser.email" type="email" placeholder="email@empresa.com" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                <input [(ngModel)]="nuevoUser.password" type="password" placeholder="Contraseña" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                <select [(ngModel)]="nuevoUser.rol" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all">
                  <option value="FUNCIONARIO">Funcionario</option>
                  <option value="DISENADOR">Diseñador</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="CLIENTE">Cliente</option>
                </select>
              </div>
              <div class="flex justify-end gap-3 mt-6">
                <button (click)="mostrarModalUsuario = false; errorModal = ''" class="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
                <button (click)="crearUsuario()" class="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">Crear</button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  seccionActiva: 'tenants' | 'usuarios' = 'tenants';
  tenantSeleccionado: TenantDTO | null = null;
  mostrarModalUsuario = false;
  errorModal = '';
  nuevoUser = { nombre: '', email: '', password: '', rol: 'FUNCIONARIO' };

  constructor(public adminService: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    this.adminService.cargarTenants().subscribe(tenants => {
      const miTenant = tenants.find(t => t.id === this.auth.usuario()?.tenantId);
      if (miTenant) this.seleccionarTenant(miTenant);
      else if (tenants.length > 0) this.seleccionarTenant(tenants[0]);
    });
  }

  seleccionarTenant(tenant: TenantDTO): void {
    this.tenantSeleccionado = tenant;
    this.adminService.cargarUsuarios(tenant.id).subscribe();
    this.seccionActiva = 'usuarios';
  }

  crearUsuario(): void {
    if (!this.tenantSeleccionado) return;
    this.errorModal = '';
    this.adminService.crearUsuario(this.tenantSeleccionado.id, this.nuevoUser).subscribe({
      next: () => {
        this.mostrarModalUsuario = false;
        this.nuevoUser = { nombre: '', email: '', password: '', rol: 'FUNCIONARIO' };
        this.adminService.cargarUsuarios(this.tenantSeleccionado!.id).subscribe();
      },
      error: (err) => this.errorModal = err.error?.message || 'Error al crear usuario.',
    });
  }

  contarPorRol(rol: string): number {
    return this.adminService.usuarios().filter(u => u.rol === rol).length;
  }

  getAvatarClasses(rol: string): string {
    const m: Record<string, string> = {
      ADMINISTRADOR: 'bg-gradient-to-br from-red-500 to-rose-400 ring-red-500/30',
      DISENADOR: 'bg-gradient-to-br from-purple-500 to-violet-400 ring-purple-500/30',
      FUNCIONARIO: 'bg-gradient-to-br from-sky-500 to-cyan-400 ring-sky-500/30',
      CLIENTE: 'bg-gradient-to-br from-emerald-500 to-green-400 ring-emerald-500/30',
    };
    return m[rol] || m['CLIENTE'];
  }

  getRolClasses(rol: string): string {
    const m: Record<string, string> = {
      ADMINISTRADOR: 'bg-red-500/10 text-red-400 ring-red-500/20',
      DISENADOR: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
      FUNCIONARIO: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
      CLIENTE: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    };
    return m[rol] || m['CLIENTE'];
  }

  getRolDot(rol: string): string {
    const m: Record<string, string> = { ADMINISTRADOR: 'bg-red-400', DISENADOR: 'bg-purple-400', FUNCIONARIO: 'bg-sky-400', CLIENTE: 'bg-emerald-400' };
    return m[rol] || 'bg-slate-400';
  }

  getRolLabel(rol: string): string {
    const m: Record<string, string> = { ADMINISTRADOR: 'Administrador', DISENADOR: 'Diseñador', FUNCIONARIO: 'Funcionario', CLIENTE: 'Cliente' };
    return m[rol] || rol;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, TenantDTO, UsuarioListDTO } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-4rem)]">
      <aside class="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div class="px-5 pt-6 pb-4">
          <h2 class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Administración</h2>
        </div>
        <nav class="flex-1 px-3 space-y-1">
          @for (item of secciones; track item.key) {
            <a (click)="seccionActiva = item.key"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
               [class]="seccionActiva === item.key
                 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                 : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'">
              {{ item.icon }} {{ item.label }}
            </a>
          }
        </nav>
        <div class="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-sky-500/10 border border-indigo-500/10">
          <p class="text-xs font-semibold text-slate-200">{{ auth.usuario()?.tenantNombre }}</p>
          <p class="text-[10px] text-slate-500 mt-0.5">{{ auth.usuario()?.email }}</p>
        </div>
      </aside>

      <main class="flex-1 p-8 overflow-y-auto">
        <div class="mb-8">
          <h1 class="text-3xl font-bold tracking-tight">{{ getTitulo() }}</h1>
          <p class="text-sm text-slate-400 mt-1">{{ getSubtitulo() }}</p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-4 mb-8">
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">🏢</div>
              <p class="text-xs text-slate-500 font-medium">Tenants</p>
            </div><p class="text-2xl font-bold">{{ svc.tenants().length }}</p>
          </div>
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20">👥</div>
              <p class="text-xs text-slate-500 font-medium">Usuarios</p>
            </div><p class="text-2xl font-bold">{{ svc.usuarios().length }}</p>
          </div>
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20">✅</div>
              <p class="text-xs text-slate-500 font-medium">Activos</p>
            </div><p class="text-2xl font-bold">{{ svc.usuarios().filter(u => u.activo).length }}</p>
          </div>
          <div class="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center text-lg shadow-lg shadow-red-500/20">🚫</div>
              <p class="text-xs text-slate-500 font-medium">Suspendidos</p>
            </div><p class="text-2xl font-bold">{{ svc.usuarios().filter(u => !u.activo).length }}</p>
          </div>
        </div>

        <!-- USUARIOS TABLE -->
        @if (seccionActiva === 'usuarios') {
          <div class="rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <h3 class="text-sm font-semibold">Usuarios · {{ auth.usuario()?.tenantNombre }}</h3>
              <button (click)="abrirCrear()" class="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">+ Nuevo Usuario</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="border-b border-slate-800/40 bg-slate-800/20">
                  <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Usuario</th>
                  <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
                  <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Teléfono</th>
                  <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cargo</th>
                  <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rol</th>
                  <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                  <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-800/40">
                  @for (user of svc.usuarios(); track user.id) {
                    <tr class="hover:bg-indigo-500/[0.03] transition-colors" [class]="!user.activo ? 'opacity-50' : ''">
                      <td class="px-6 py-3">
                        <div class="flex items-center gap-3">
                          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-offset-1 ring-offset-slate-900" [class]="getAvatarCls(user.rol)">{{ user.nombre.charAt(0) }}</div>
                          <div><p class="font-semibold text-slate-200">{{ user.nombre }} {{ user.apellido || '' }}</p></div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-slate-400 text-xs">{{ user.email }}</td>
                      <td class="px-4 py-3 text-slate-400 text-xs">{{ user.telefono || '—' }}</td>
                      <td class="px-4 py-3 text-slate-400 text-xs">{{ user.cargo || '—' }}</td>
                      <td class="px-4 py-3">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset" [class]="getRolCls(user.rol)">
                          <span class="w-1.5 h-1.5 rounded-full" [class]="getRolDot(user.rol)"></span>
                          {{ getRolLabel(user.rol) }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              [class]="user.activo ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'">
                          {{ user.activo ? 'Activo' : 'Suspendido' }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex gap-1.5">
                          <button (click)="abrirEditar(user)" class="px-2.5 py-1 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all" title="Editar">✏️</button>
                          <button (click)="toggleActivo(user)" class="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all"
                                  [class]="user.activo ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'"
                                  [title]="user.activo ? 'Suspender' : 'Reactivar'">
                            {{ user.activo ? '🔒' : '🔓' }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- TENANTS TABLE -->
        @if (seccionActiva === 'tenants') {
          <div class="rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-800/60"><h3 class="text-sm font-semibold">Empresas Registradas</h3></div>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-slate-800/40 bg-slate-800/20">
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nombre</th>
                <th class="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">ID</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-800/40">
                @for (t of svc.tenants(); track t.id) {
                  <tr class="hover:bg-indigo-500/[0.03]">
                    <td class="px-6 py-4"><div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20">{{ t.nombre.charAt(0) }}</div>
                      <span class="font-semibold text-slate-200">{{ t.nombre }}</span>
                    </div></td>
                    <td class="px-6 py-4"><span class="font-mono text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-lg">{{ t.id | slice:0:12 }}…</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- AUDIT LOG -->
        @if (seccionActiva === 'audit') {
          <div class="rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-800/60"><h3 class="text-sm font-semibold">Registro de Auditoría</h3></div>
            <div class="divide-y divide-slate-800/40 max-h-[60vh] overflow-y-auto">
              @for (log of svc.auditLogs(); track log.id) {
                <div class="px-6 py-3 flex items-start gap-4">
                  <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs shrink-0">📝</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-slate-200"><span class="font-semibold">{{ log.usuarioNombre }}</span> · <span class="text-indigo-400">{{ log.accion }}</span></p>
                    <p class="text-xs text-slate-500 mt-0.5">{{ log.detalle }}</p>
                  </div>
                  <span class="text-[10px] text-slate-600 shrink-0">{{ log.timestamp | date:'dd/MM HH:mm' }}</span>
                </div>
              } @empty {
                <div class="px-6 py-12 text-center text-slate-500 text-sm">Sin registros de auditoría.</div>
              }
            </div>
          </div>
        }

        <!-- MODAL CREAR/EDITAR USUARIO -->
        @if (modalOpen) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
              <h3 class="text-lg font-bold mb-4">{{ modalEditUser ? 'Editar Usuario' : 'Crear Nuevo Usuario' }}</h3>
              @if (modalError) {
                <div class="mb-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{{ modalError }}</div>
              }
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre *</label>
                  <input [(ngModel)]="form.nombre" placeholder="Ej. Juan Carlos" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">Apellido</label>
                  <input [(ngModel)]="form.apellido" placeholder="Ej. Pérez López" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">Email *</label>
                  <input [(ngModel)]="form.email" type="email" placeholder="Ej. juan@empresa.com" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">Teléfono</label>
                  <input [(ngModel)]="form.telefono" placeholder="Ej. +591 70012345" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">Cargo</label>
                  <input [(ngModel)]="form.cargo" placeholder="Ej. Jefe de Área" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">Rol *</label>
                  <select [(ngModel)]="form.rol" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all">
                    <option value="FUNCIONARIO">Funcionario</option>
                    <option value="DISENADOR">Diseñador</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="CLIENTE">Cliente</option>
                  </select>
                </div>
                @if (!modalEditUser) {
                  <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Contraseña *</label>
                    <div class="relative">
                      <input [(ngModel)]="form.password" [type]="showModalPwd ? 'text' : 'password'" placeholder="Mínimo 6 caracteres"
                             class="w-full px-3 py-2.5 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                      <button type="button" (click)="showModalPwd = !showModalPwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{{ showModalPwd ? '🙈' : '👁️' }}</button>
                    </div>
                  </div>
                }
              </div>
              <div class="flex justify-end gap-3 mt-6">
                <button (click)="cerrarModal()" class="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
                <button (click)="guardarUsuario()" class="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">
                  {{ modalEditUser ? 'Guardar Cambios' : 'Crear Usuario' }}
                </button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  secciones = [
    { key: 'usuarios', icon: '👥', label: 'Usuarios' },
    { key: 'tenants', icon: '🏢', label: 'Empresas' },
    { key: 'audit', icon: '📝', label: 'Auditoría' },
  ];
  seccionActiva = 'usuarios';
  modalOpen = false;
  modalError = '';
  modalEditUser: UsuarioListDTO | null = null;
  showModalPwd = false;
  form: any = {};

  constructor(public svc: AdminService, public auth: AuthService) {}

  ngOnInit(): void {
    this.svc.cargarTenants().subscribe();
    const tid = this.auth.usuario()?.tenantId;
    if (tid) {
      this.svc.cargarUsuarios(tid).subscribe();
      this.svc.cargarAuditLog(tid).subscribe();
    }
  }

  getTitulo(): string {
    const m: Record<string, string> = { usuarios: 'Gestión de Usuarios', tenants: 'Empresas', audit: 'Auditoría del Sistema' };
    return m[this.seccionActiva] || '';
  }

  getSubtitulo(): string {
    const m: Record<string, string> = { usuarios: 'Crea, edita y administra los usuarios de tu empresa.', tenants: 'Organizaciones registradas.', audit: 'Historial de acciones del sistema.' };
    return m[this.seccionActiva] || '';
  }

  abrirCrear(): void {
    this.modalEditUser = null;
    this.form = { nombre: '', apellido: '', email: '', password: '', telefono: '', cargo: '', rol: 'FUNCIONARIO' };
    this.modalError = '';
    this.showModalPwd = false;
    this.modalOpen = true;
  }

  abrirEditar(user: UsuarioListDTO): void {
    this.modalEditUser = user;
    this.form = { nombre: user.nombre, apellido: user.apellido || '', email: user.email, telefono: user.telefono || '', cargo: user.cargo || '', rol: user.rol };
    this.modalError = '';
    this.modalOpen = true;
  }

  cerrarModal(): void { this.modalOpen = false; this.modalError = ''; }

  guardarUsuario(): void {
    this.modalError = '';
    const tid = this.auth.usuario()?.tenantId;
    if (!tid) return;

    if (this.modalEditUser) {
      this.svc.editarUsuario(this.modalEditUser.id, this.form).subscribe({
        next: () => { this.cerrarModal(); this.svc.cargarUsuarios(tid).subscribe(); this.svc.cargarAuditLog(tid).subscribe(); },
        error: (e) => this.modalError = e.error?.message || 'Error al editar.',
      });
    } else {
      if (!this.form.nombre || !this.form.email || !this.form.password) { this.modalError = 'Nombre, email y contraseña son obligatorios.'; return; }
      this.svc.crearUsuario(tid, this.form).subscribe({
        next: () => { this.cerrarModal(); this.svc.cargarUsuarios(tid).subscribe(); this.svc.cargarAuditLog(tid).subscribe(); },
        error: (e) => this.modalError = e.error?.message || 'Error al crear usuario.',
      });
    }
  }

  toggleActivo(user: UsuarioListDTO): void {
    const tid = this.auth.usuario()?.tenantId;
    this.svc.toggleActivo(user.id).subscribe(() => {
      if (tid) { this.svc.cargarUsuarios(tid).subscribe(); this.svc.cargarAuditLog(tid).subscribe(); }
    });
  }

  getAvatarCls(r: string): string { return ({ ADMINISTRADOR: 'bg-gradient-to-br from-red-500 to-rose-400 ring-red-500/30', DISENADOR: 'bg-gradient-to-br from-purple-500 to-violet-400 ring-purple-500/30', FUNCIONARIO: 'bg-gradient-to-br from-sky-500 to-cyan-400 ring-sky-500/30', CLIENTE: 'bg-gradient-to-br from-emerald-500 to-green-400 ring-emerald-500/30' } as any)[r] || ''; }
  getRolCls(r: string): string { return ({ ADMINISTRADOR: 'bg-red-500/10 text-red-400 ring-red-500/20', DISENADOR: 'bg-purple-500/10 text-purple-400 ring-purple-500/20', FUNCIONARIO: 'bg-sky-500/10 text-sky-400 ring-sky-500/20', CLIENTE: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' } as any)[r] || ''; }
  getRolDot(r: string): string { return ({ ADMINISTRADOR: 'bg-red-400', DISENADOR: 'bg-purple-400', FUNCIONARIO: 'bg-sky-400', CLIENTE: 'bg-emerald-400' } as any)[r] || ''; }
  getRolLabel(r: string): string { return ({ ADMINISTRADOR: 'Administrador', DISENADOR: 'Diseñador', FUNCIONARIO: 'Funcionario', CLIENTE: 'Cliente' } as any)[r] || r; }
}

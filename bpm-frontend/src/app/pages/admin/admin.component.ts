import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AdminService, TenantDTO, UsuarioListDTO } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { FormBuilderComponent } from './form-builder.component';
import { MonitorComponent } from './monitor.component';
import { FormularioService } from '../../services/formulario.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, FormBuilderComponent, MonitorComponent],
  template: `
    <div class="flex h-[calc(100vh-4rem)] bg-premium text-slate-100 relative overflow-hidden">
      <!-- Fondo con gradiente sutil -->
      <div class="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none"></div>

      <!-- SIDEBAR -->
      <aside class="w-64 border-r border-slate-800/60 bg-slate-900/20 backdrop-blur-xl flex flex-col z-30">
        <div class="px-6 pt-8 pb-6">
          <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Panel de Control</h2>
        </div>
        <nav class="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          @for (item of secciones; track item.key) {
            <button (click)="setSeccion(item.key)"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold tracking-wide cursor-pointer transition-all border group relative overflow-hidden"
                [class]="seccionActiva() === item.key
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'"
            >
              <div class="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110" [innerHTML]="getSafeSvg(item.svg)"></div>
              <span class="relative z-10">{{ item.label }}</span>
            </button>
          }
        </nav>
        <div class="p-4 m-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 shadow-xl ring-1 ring-white/5">
          <div class="flex items-center gap-3 mb-1">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-[10px] font-bold shadow-lg shadow-indigo-500/20">{{ auth.usuario()?.nombre?.charAt(0) }}</div>
            <div class="min-w-0">
              <p class="text-[11px] font-bold text-slate-200 truncate">{{ auth.usuario()?.tenantNombre }}</p>
              <p class="text-[9px] text-slate-500 truncate mt-0.5">{{ auth.usuario()?.email }}</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 p-10 overflow-y-auto">
        <div class="max-w-6xl mx-auto">
          <div class="mb-10 flex items-end justify-between">
            <div>
              <h1 class="text-3xl font-black tracking-tight text-white">{{ getTitulo() }}</h1>
              <p class="text-sm text-slate-500 mt-1.5 font-medium">{{ getSubtitulo() }}</p>
            </div>
            @if (seccionActiva() === 'usuarios') {
              <button (click)="abrirCrear()" class="px-6 py-3 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">+ Nuevo Usuario</button>
            }
            @if (seccionActiva() === 'cargos') {
              <button (click)="abrirCrearCargo()" class="px-6 py-3 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">+ Nuevo Cargo</button>
            }
            @if (seccionActiva() === 'departamentos') {
              <button (click)="abrirCrearDepto()" class="px-6 py-3 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">+ Nuevo Departamento</button>
            }
          </div>

          @if (seccionActiva() !== 'formularios' && seccionActiva() !== 'audit') {
            <!-- Stats Grid -->
            <div class="grid grid-cols-4 gap-6 mb-10">
              @for (stat of stats(); track stat.label) {
                <div class="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] relative overflow-hidden group">
                  <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.02] group-hover:scale-150 transition-transform duration-700"></div>
                  <div class="flex items-center gap-4 mb-4 relative">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl" [class]="stat.bg" [innerHTML]="getSafeSvg(stat.svg)"></div>
                    <div>
                      <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ stat.label }}</p>
                      <p class="text-2xl font-black text-white tabular-nums">{{ stat.value }}</p>
                    </div>
                  </div>
                  <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-1000" [class]="stat.bar" [style.width.%]="stat.percent"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- SECTION: USUARIOS -->
          @if (seccionActiva() === 'usuarios') {
            <div class="rounded-3xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-md shadow-2xl overflow-hidden ring-1 ring-white/5 animate-in fade-in duration-500">
              <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="bg-white/[0.02] border-b border-white/5">
                      <th class="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Colaborador</th>
                      <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</th>
                      <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargo</th>
                      <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Departamento</th>
                      <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Rol</th>
                      <th class="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                      <th class="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40">
                    @for (user of svc.usuarios(); track user.id) {
                      <tr class="hover:bg-indigo-500/[0.02] transition-colors group" [class.opacity-40]="!user.activo">
                        <td class="px-8 py-5">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black ring-2 ring-offset-2 ring-offset-slate-950 transition-transform group-hover:scale-105" [class]="getAvatarCls(user.rol)">
                              {{ (user.nombre || '').charAt(0) }}{{ (user.apellido || '').charAt(0) }}
                            </div>
                            <div>
                              <p class="font-bold text-slate-200">{{ user.nombre }} {{ user.apellido }}</p>
                              <p class="text-[10px] text-slate-500 mt-0.5">{{ user.telefono || 'Sin teléfono' }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-5 text-slate-400 font-mono text-[11px]">{{ user.email }}</td>
                        <td class="px-6 py-5 text-slate-300 font-medium whitespace-nowrap">{{ user.cargo || 'No asignado' }}</td>
                        <td class="px-6 py-5 whitespace-nowrap">
                          <span class="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold border border-white/5">{{ user.departamento || 'Sin área' }}</span>
                        </td>
                        <td class="px-6 py-5">
                          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ring-1 ring-inset shadow-sm" [class]="getRolCls(user.rol)">
                            <span class="w-1.5 h-1.5 rounded-full" [class]="getRolDot(user.rol)"></span>
                            {{ getRolLabel(user.rol) }}
                          </span>
                        </td>
                        <td class="px-6 py-5">
                          <div class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" [class]="user.activo ? 'bg-emerald-500' : 'bg-red-500'"></div>
                            <span class="text-[10px] font-bold uppercase tracking-widest" [class]="user.activo ? 'text-emerald-500' : 'text-red-500'">{{ user.activo ? 'Activo' : 'Suspendido' }}</span>
                          </div>
                        </td>
                        <td class="px-6 py-5 text-right">
                          <div class="flex justify-end gap-2">
                            <button (click)="abrirEditar(user)" class="w-8 h-8 rounded-xl flex items-center justify-center text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button (click)="toggleActivo(user)" class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                    [class]="user.activo ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'">
                              @if (user.activo) {
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              } @else {
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                              }
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

          <!-- SECTION: CARGOS -->
          @if (seccionActiva() === 'cargos') {
            <div class="grid grid-cols-3 gap-6 animate-in fade-in duration-500">
              @for (c of svc.cargos(); track c.id) {
                <div class="p-8 rounded-[2.5rem] glass hover:border-indigo-500/50 transition-all group relative overflow-hidden cursor-pointer shadow-xl hover:shadow-indigo-500/10" (click)="verInfo(c, 'cargo')">
                  <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-10">
                    <button (click)="$event.stopPropagation(); abrirEditarCargo(c)" class="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-white/5 shadow-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                    <button (click)="$event.stopPropagation(); eliminarCargo(c.id)" class="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div class="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 21h20"/></svg>
                  </div>
                  <h3 class="text-xl font-black text-white mb-2 tracking-tight">{{ c.nombre }}</h3>
                  <p class="text-slate-500 text-xs line-clamp-2 mb-6 font-medium leading-relaxed">{{ c.descripcion || 'Sin descripción institucional definida.' }}</p>
                  <div class="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{{ c.nivel || 'Operativo' }}</span>
                    <span class="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">Bs. {{ c.salarioBase || 0 }}</span>
                  </div>
                </div>
              } @empty {
                <div class="col-span-3 py-20 text-center rounded-[3rem] border border-dashed border-slate-800 bg-slate-900/20">
                  <p class="text-sm text-slate-500 font-bold">No hay cargos registrados para esta empresa.</p>
                </div>
              }
            </div>
          }

          <!-- SECTION: DEPARTAMENTOS -->
          @if (seccionActiva() === 'departamentos') {
            <div class="grid grid-cols-3 gap-6 animate-in fade-in duration-500">
              @for (d of svc.departamentos(); track d.id) {
                <div class="p-8 rounded-[2.5rem] glass hover:border-emerald-500/50 transition-all group relative overflow-hidden cursor-pointer shadow-xl hover:shadow-emerald-500/10" (click)="verInfo(d, 'departamento')">
                  <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-10">
                    <button (click)="$event.stopPropagation(); abrirEditarDepto(d)" class="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-white/5 shadow-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                    <button (click)="$event.stopPropagation(); eliminarDepto(d.id)" class="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div class="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7"/><path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M21 7h-6.5L12 3H5v4z"/></svg>
                  </div>
                  <h3 class="text-xl font-black text-white mb-2 tracking-tight">{{ d.nombre }}</h3>
                  <p class="text-slate-500 text-xs line-clamp-2 mb-6 font-medium leading-relaxed">{{ d.descripcion || 'Sin descripción institucional definida.' }}</p>
                  <div class="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{{ d.codigo || 'S/C' }}</span>
                    <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">{{ d.ubicacion || 'Central' }}</span>
                  </div>
                </div>
              } @empty {
                <div class="col-span-3 py-20 text-center rounded-[3rem] border border-dashed border-slate-800 bg-slate-900/20">
                  <p class="text-sm text-slate-500 font-bold">No hay departamentos registrados.</p>
                </div>
              }
            </div>
          }

          <!-- SECTION: TENANTS -->
          @if (seccionActiva() === 'tenants') {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
              <div class="md:col-span-1 space-y-6">
                <div class="p-8 rounded-[3rem] border border-slate-800/60 bg-slate-900/40 backdrop-blur-md shadow-2xl ring-1 ring-white/10 text-center">
                  <div class="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/20 mb-6 border border-white/20 overflow-hidden">
                    @if (svc.tenants()[0]?.logoUrl) {
                      <img [src]="svc.tenants()[0].logoUrl" class="w-full h-full object-cover">
                    } @else {
                      {{ svc.tenants()[0]?.nombre?.charAt(0) }}
                    }
                  </div>
                  <h2 class="text-2xl font-black text-white leading-tight">{{ svc.tenants()[0]?.nombre }}</h2>
                  <p class="text-sm text-indigo-400 font-bold mt-2">{{ svc.tenants()[0]?.industria || 'Industria General' }}</p>
                  <div class="mt-6 pt-6 border-t border-slate-800/60 flex flex-col gap-3">
                    <div class="flex items-center gap-3 text-xs text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <a [href]="svc.tenants()[0]?.sitioWeb" target="_blank" class="hover:text-indigo-400 transition-colors">{{ svc.tenants()[0]?.sitioWeb || 'No especificado' }}</a>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.21-2.21a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span>{{ svc.tenants()[0]?.telefonoInstitucional || 'No especificado' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="md:col-span-2 space-y-6">
                <div class="p-10 rounded-[3rem] border border-slate-800/60 bg-slate-900/40 backdrop-blur-md shadow-2xl ring-1 ring-white/10">
                  <h3 class="text-lg font-black text-white mb-8 flex items-center gap-3">
                    <span class="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                    Información Institucional
                  </h3>
                  <div class="grid grid-cols-2 gap-8">
                    <div class="space-y-1">
                      <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">NIT / Identificación</p>
                      <p class="text-slate-200 font-bold">{{ svc.tenants()[0]?.nit || 'No disponible' }}</p>
                    </div>
                    <div class="space-y-1">
                      <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email de Contacto</p>
                      <p class="text-slate-200 font-bold">{{ svc.tenants()[0]?.emailContacto || 'No disponible' }}</p>
                    </div>
                    <div class="col-span-2 space-y-1">
                      <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dirección Legal</p>
                      <p class="text-slate-200 font-bold leading-relaxed">{{ svc.tenants()[0]?.direccion || 'No disponible' }}</p>
                    </div>
                    <div class="col-span-2 space-y-1">
                      <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lema / Slogan</p>
                      <p class="text-slate-400 italic font-medium">"{{ svc.tenants()[0]?.lema || 'No especificado' }}"</p>
                    </div>
                  </div>
                  <div class="mt-12 pt-8 border-t border-slate-800/60">
                    <button (click)="abrirEditarTenant()" class="px-8 py-3.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all border border-slate-700/50 shadow-xl cursor-pointer">
                      Editar Perfil Institucional
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- SECTION: AUDIT -->
          @if (seccionActiva() === 'audit') {
            <div class="rounded-3xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-md shadow-2xl overflow-hidden ring-1 ring-white/5 animate-in fade-in duration-500">
              <div class="divide-y divide-slate-800/40 max-h-[60vh] overflow-y-auto custom-scrollbar">
                @for (log of svc.auditLogs(); track log.id) {
                  <div class="px-8 py-5 flex items-start gap-5 hover:bg-white/[0.02] transition-colors">
                    <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-slate-100 font-bold"><span class="text-indigo-400">{{ log.usuarioNombre }}</span> · {{ log.accion }}</p>
                      <p class="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{{ log.detalle }}</p>
                      <div class="flex items-center gap-2 mt-2">
                        <span class="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-800/40 px-2 py-0.5 rounded-md">{{ log.entidad }}</span>
                        <span class="text-[9px] text-slate-700">{{ log.timestamp | date:'dd MMM yyyy, HH:mm' }}</span>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="px-8 py-20 text-center text-slate-600 text-sm font-medium">Sin registros de actividad reciente.</div>
                }
              </div>
            </div>
          }

          <!-- SECTION: MONITOR -->
          @if (seccionActiva() === 'monitor') {
            <app-monitor></app-monitor>
          }

          <!-- SECTION: FORMULARIOS -->
          @if (seccionActiva() === 'formularios') {
            <app-form-builder></app-form-builder>
          }
        </div>

        <!-- MODAL: CREAR/EDITAR USUARIO -->
        @if (modalOpen) {
          <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 overflow-y-auto py-20">
            <div class="w-full max-w-2xl rounded-[3rem] border border-white/10 bg-slate-900 shadow-2xl p-12 ring-1 ring-white/5 animate-in fade-in zoom-in duration-300 my-auto">
              <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  </div>
                  <div>
                    <h3 class="text-xl font-black text-white leading-tight">{{ modalEditUser ? 'Editar Perfil' : 'Nuevo Usuario' }}</h3>
                    <p class="text-xs text-slate-500 mt-0.5 font-medium">Configura los accesos y cargo del colaborador.</p>
                  </div>
                </div>
                <button (click)="cerrarModal()" class="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              @if (modalError) {
                <div class="mb-6 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ modalError }}
                </div>
              }

              <div class="grid grid-cols-2 gap-5">
                <div class="space-y-4">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre *</label>
                    <input [(ngModel)]="form.nombre" placeholder="Ej. Juan" class="w-full px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email *</label>
                    <input [(ngModel)]="form.email" type="email" placeholder="juan@empresa.com" class="w-full px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Departamento *</label>
                    <select [(ngModel)]="form.departamentoId" (change)="onDeptoChange()" class="w-full px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none appearance-none">
                      <option value="">Seleccionar Departamento...</option>
                      @for (d of svc.departamentos(); track d.id) {
                        <option [value]="d.id">{{ d.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Cargo Institucional</label>
                    <select [(ngModel)]="form.cargo" class="w-full px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none appearance-none">
                      <option value="">Seleccionar Cargo...</option>
                      @for (c of svc.cargos(); track c.id) {
                        <option [value]="c.nombre">{{ c.nombre }}</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="space-y-4">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Apellido</label>
                    <input [(ngModel)]="form.apellido" placeholder="Ej. Pérez" class="w-full px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Teléfono</label>
                    <input [(ngModel)]="form.telefono" placeholder="Ej. +591 7..." class="w-full px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Rol de Sistema *</label>
                    <select [(ngModel)]="form.rol" class="w-full px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none appearance-none">
                      <option value="FUNCIONARIO">Funcionario</option>
                      <option value="DISENADOR">Diseñador</option>
                      <option value="ADMINISTRADOR">Administrador</option>
                      <option value="CLIENTE">Cliente</option>
                    </select>
                  </div>
                </div>

                @if (!modalEditUser) {
                  <div class="col-span-2 mt-2">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Contraseña de Acceso *</label>
                    <div class="relative group">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 transition-colors group-focus-within:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </div>
                      <input [(ngModel)]="form.password" [type]="showModalPwd ? 'text' : 'password'" placeholder="Mínimo 6 caracteres"
                             class="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                      <button type="button" (click)="showModalPwd = !showModalPwd" class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-indigo-400 transition-all">
                        @if (showModalPwd) {
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88 10 10a2 2 0 0 0 2.82 2.82l.12.12"/><path d="M2 2l20 20"/><path d="M10.37 4.1a10.3 10.3 0 0 1 8.26 3.23"/><path d="M22 12c-1.66 2.49-4.38 5-7 5-.56 0-1.12-.11-1.66-.31"/><path d="M15 15.11l-1.42-1.42"/><path d="M2 12c1.66-2.49 4.38-5 7-5 1.55 0 3.03.86 4.31 2.22"/><path d="M7.85 11.23a2 2 0 0 0 2.92 2.92"/></svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                }
              </div>

              <div class="flex gap-4 mt-10">
                <button (click)="cerrarModal()" class="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-100 rounded-2xl hover:bg-white/5 transition-all">Descartar</button>
                <button (click)="guardarUsuario()" class="flex-[2] py-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all active:scale-95">
                  {{ modalEditUser ? 'Confirmar Cambios' : 'Registrar Colaborador' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- MODAL: EDITAR TENANT -->
        @if (modalTenantOpen) {
          <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 overflow-y-auto py-20">
            <div class="w-full max-w-4xl rounded-[3rem] border border-white/10 bg-slate-900 shadow-2xl p-12 ring-1 ring-white/5 animate-in fade-in zoom-in duration-300 my-auto">
              <div class="flex items-center justify-between mb-10">
                <div class="flex items-center gap-5">
                  <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
                  </div>
                  <div>
                    <h3 class="text-2xl font-black text-white tracking-tight">Perfil Institucional</h3>
                    <p class="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Identidad corporativa y datos legales.</p>
                  </div>
                </div>
                <button (click)="modalTenantOpen = false" class="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-8">
                <div class="space-y-6">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre Legal de la Empresa</label>
                    <input [(ngModel)]="tenantForm.nombre" placeholder="Ej. CRE - Cooperativa Eléctrica" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">NIT / ID Fiscal</label>
                      <input [(ngModel)]="tenantForm.nit" placeholder="102030..." class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Industria</label>
                      <input [(ngModel)]="tenantForm.industria" placeholder="Ej. Servicios Públicos" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                    </div>
                  </div>
                </div>

                <div class="space-y-6">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Sitio Web</label>
                      <input [(ngModel)]="tenantForm.sitioWeb" placeholder="https://..." class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Teléfono Institucional</label>
                      <input [(ngModel)]="tenantForm.telefonoInstitucional" placeholder="+591..." class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                    </div>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email de Contacto</label>
                    <input [(ngModel)]="tenantForm.emailContacto" type="email" placeholder="contacto@empresa.com" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                  </div>
                </div>

                <div class="col-span-2">
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Logo URL</label>
                  <input [(ngModel)]="tenantForm.logoUrl" placeholder="https://logo.png" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none">
                </div>

                <div class="col-span-2">
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Lema Institucional</label>
                  <input [(ngModel)]="tenantForm.lema" placeholder="Frase que identifica a la organización..." class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none italic">
                </div>
              </div>

              <div class="flex gap-4 mt-12">
                <button (click)="modalTenantOpen = false" class="flex-1 py-5 text-sm font-bold text-slate-400 hover:text-white rounded-2xl hover:bg-white/5 transition-all">Descartar</button>
                <button (click)="guardarTenant()" class="flex-[2] py-5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all active:scale-95">
                  Actualizar Perfil Corporativo
                </button>
              </div>
            </div>
          </div>
        }

        <!-- MODAL: CREAR/EDITAR CARGO O DEPTO -->
        @if (modalMasterOpen) {
          <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 overflow-y-auto py-20">
            <div class="w-full max-w-2xl rounded-[3rem] border border-white/10 bg-slate-900 shadow-2xl p-12 ring-1 ring-white/5 animate-in fade-in zoom-in duration-300 my-auto">
              
              <div class="flex items-center justify-between mb-10">
                <div class="flex items-center gap-5">
                  <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
                    <svg *ngIf="modalMasterType === 'Cargo'" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 21h20"/></svg>
                    <svg *ngIf="modalMasterType === 'Departamento'" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7"/><path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M21 7h-6.5L12 3H5v4z"/></svg>
                  </div>
                  <div>
                    <h3 class="text-2xl font-black text-white tracking-tight">{{ modalMasterTitle }}</h3>
                    <p class="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-[0.2em]">{{ modalMasterMode === 'view' ? 'Consulta de Registro' : 'Edición de Estructura' }}</p>
                  </div>
                </div>
                <button (click)="modalMasterOpen = false" class="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-6">
                <!-- Nombre -->
                <div class="col-span-2">
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre Oficial</label>
                  <input [disabled]="modalMasterMode === 'view'" [(ngModel)]="modalMasterForm.nombre" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none disabled:opacity-80">
                </div>
                
                <!-- Código -->
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Código / Referencia</label>
                  <input [disabled]="modalMasterMode === 'view'" [(ngModel)]="modalMasterForm.codigo" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none disabled:opacity-80">
                </div>

                <!-- Específico por Tipo -->
                @if (modalMasterType === 'Cargo') {
                  <div class="col-span-1">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Salario Base (Bs.)</label>
                    <input [disabled]="modalMasterMode === 'view'" type="number" [(ngModel)]="modalMasterForm.salarioBase" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none disabled:opacity-80">
                  </div>
                  <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nivel Institucional</label>
                    <select [disabled]="modalMasterMode === 'view'" [(ngModel)]="modalMasterForm.nivel" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none disabled:opacity-80 appearance-none">
                      <option value="OPERATIVO">Operativo</option>
                      <option value="TECNICO">Técnico</option>
                      <option value="JEFATURA">Jefatura</option>
                      <option value="GERENCIA">Gerencia</option>
                      <option value="DIRECTORIO">Directorio</option>
                    </select>
                  </div>
                } @else {
                  <div class="col-span-1">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Presupuesto Anual</label>
                    <input [disabled]="modalMasterMode === 'view'" type="number" [(ngModel)]="modalMasterForm.presupuesto" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none disabled:opacity-80">
                  </div>
                  <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Ubicación / Oficina</label>
                    <input [disabled]="modalMasterMode === 'view'" [(ngModel)]="modalMasterForm.ubicacion" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none disabled:opacity-80">
                  </div>
                }

                <!-- Descripción -->
                <div class="col-span-2">
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Descripción de Funciones</label>
                  <textarea [disabled]="modalMasterMode === 'view'" [(ngModel)]="modalMasterForm.descripcion" rows="3" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500 transition-all outline-none resize-none disabled:opacity-80"></textarea>
                </div>

                <!-- Atributos Dinámicos -->
                <div class="col-span-2 pt-6 border-t border-white/5">
                  <div class="flex items-center justify-between mb-6">
                    <h4 class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Atributos Personalizados</h4>
                    @if (modalMasterMode !== 'view') {
                      <button (click)="agregarAtributoExtra()" class="text-[10px] font-black text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all">+ Añadir</button>
                    }
                  </div>
                  
                  <div class="space-y-3">
                    @for (attr of modalMasterForm.atributosExtra; track $index) {
                      <div class="grid grid-cols-12 gap-3 items-center">
                        <div class="col-span-5">
                          <input [disabled]="modalMasterMode === 'view'" [(ngModel)]="attr.nombre" placeholder="Atributo" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/5 text-[11px] text-white outline-none disabled:opacity-80">
                        </div>
                        <div class="col-span-6">
                          <input [disabled]="modalMasterMode === 'view'" [(ngModel)]="attr.valor" placeholder="Valor" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/5 text-[11px] text-white outline-none disabled:opacity-80">
                        </div>
                        <div class="col-span-1 text-right">
                          @if (modalMasterMode !== 'view') {
                            <button (click)="removerAtributoExtra($index)" class="text-slate-600 hover:text-red-400 transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                          }
                        </div>
                      </div>
                    } @empty {
                      <div class="py-6 text-center rounded-3xl bg-white/[0.01] border border-dashed border-white/5">
                        <p class="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Sin atributos adicionales</p>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div class="flex gap-4 mt-12">
                @if (modalMasterMode === 'view') {
                  <button (click)="modalMasterOpen = false" class="flex-1 py-5 text-xs font-black text-slate-400 hover:text-white rounded-2xl bg-white/5 transition-all uppercase tracking-widest">Cerrar Vista</button>
                  <button (click)="modalMasterMode = 'edit'; modalMasterTitle = 'Editar ' + modalMasterType" class="flex-[2] py-5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all uppercase tracking-widest">Modificar Registro</button>
                } @else {
                  <button (click)="modalMasterOpen = false" class="flex-1 py-5 text-xs font-black text-slate-400 hover:text-white rounded-2xl bg-white/5 transition-all uppercase tracking-widest">Cancelar</button>
                  <button (click)="guardarMaster()" class="flex-[2] py-5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all uppercase tracking-widest">
                    {{ modalMasterId ? 'Actualizar Cambios' : 'Crear Ahora' }}
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  seccionActiva = signal<'monitor' | 'tenants' | 'usuarios' | 'audit' | 'cargos' | 'departamentos' | 'formularios'>('monitor');
  
  getSafeIcon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  secciones = [
    { key: 'monitor', label: 'Monitor de Procesos', svg: 'M3 3v18h18M19 9l-5 5-4-4-3 3' },
    { key: 'formularios', label: 'Formularios', svg: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
    { key: 'usuarios', label: 'Usuarios', svg: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
    { key: 'departamentos', label: 'Departamentos', svg: 'M21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7 M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2 M21 7h-6.5L12 3H5v4z' },
    { key: 'cargos', label: 'Cargos', svg: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16 M2 21h20' },
    { key: 'tenants', label: 'Empresa', svg: 'M3 21h18M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M3 7l9 6 9-6M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7' },
    { key: 'audit', label: 'Auditoría', svg: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2' }
  ];

  modalOpen = false;
  modalEditUser: any = null;
  modalError = '';
  showModalPwd = false;
  form = { nombre: '', apellido: '', email: '', password: '', telefono: '', cargo: '', departamento: '', departamentoId: '', rol: 'FUNCIONARIO' };

  modalMasterOpen = false;
  modalMasterType: 'Cargo' | 'Departamento' = 'Cargo';
  modalMasterMode: 'create' | 'edit' | 'view' = 'create';
  modalMasterTitle = '';
  modalMasterId = '';
  modalMasterForm: any = { nombre: '', descripcion: '', codigo: '', salarioBase: 0, nivel: 'OPERATIVO', ubicacion: '', presupuesto: 0, atributosExtra: [] };

  modalTenantOpen = false;
  tenantForm: Partial<TenantDTO> = {};

  constructor(public svc: AdminService, public auth: AuthService, private fs: FormularioService) {
  }

  ngOnInit(): void {
    this.svc.cargarTenants().subscribe();
    // Delay data loading to avoid NG0100 ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.refreshData();
    }, 0);
  }

  getSafeSvg(path: string): SafeHtml {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  refreshData() {
    const user = this.auth.usuario();
    if (user?.tenantId) {
      const sa = this.seccionActiva();
      if (sa === 'usuarios') this.svc.cargarUsuarios(user.tenantId).subscribe();
      if (sa === 'cargos') this.svc.cargarCargos(user.tenantId).subscribe();
      if (sa === 'departamentos') this.svc.cargarDepartamentos(user.tenantId).subscribe();
      if (sa === 'audit') this.svc.cargarAuditLog(user.tenantId).subscribe();
      if (sa === 'tenants') this.svc.cargarTenants().subscribe();
      if (sa === 'formularios') this.fs.listarPorTenant(user.tenantId).subscribe();
    }
  }

  setSeccion(key: any) {
    this.seccionActiva.set(key);
    this.refreshData();
  }

  verInfo(data: any, type: 'cargo' | 'departamento') {
    this.abrirModalMaster('view', type === 'cargo' ? 'Cargo' : 'Departamento', data);
  }

  getTitulo(): string {
    const map: any = { 
      tenants: 'Perfil de Empresa', 
      usuarios: 'Gestión de Colaboradores', 
      audit: 'Auditoría de Sistema', 
      cargos: 'Cargos Institucionales', 
      departamentos: 'Estructura Organizacional', 
      formularios: 'Repositorio de Formularios',
      monitor: 'Monitor de Procesos'
    };
    return map[this.seccionActiva()] || 'Panel de Control';
  }

  getSubtitulo(): string {
    const map: any = { 
      tenants: 'Configura la identidad y datos legales de tu institución.', 
      usuarios: 'Administra accesos, roles y perfiles de los funcionarios.', 
      audit: 'Historial detallado de todas las acciones realizadas en el sistema.', 
      cargos: 'Define las jerarquías y puestos oficiales de la organización.', 
      departamentos: 'Gestiona las unidades operativas y áreas funcionales.', 
      formularios: 'Biblioteca de estructuras de datos para procesos de negocio.',
      monitor: 'Vista en tiempo real del estado de los trámites y cuellos de botella.'
    };
    return map[this.seccionActiva()] || 'Administración central de la plataforma.';
  }

  stats = computed(() => {
    if (this.seccionActiva() === 'usuarios') {
      const total = this.svc.usuarios().length;
      const activos = this.svc.usuarios().filter(u => u.activo).length;
      return [
        { label: 'Total Equipo', value: total, bg: 'bg-indigo-500', bar: 'bg-white', percent: 100, svg: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87' },
        { label: 'Activos', value: activos, bg: 'bg-emerald-500', bar: 'bg-white', percent: total ? (activos/total)*100 : 0, svg: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01 9 11.01' },
        { label: 'Suspendidos', value: total - activos, bg: 'bg-amber-500', bar: 'bg-white', percent: total ? ((total-activos)/total)*100 : 0, svg: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
        { label: 'Cargos', value: this.svc.cargos().length, bg: 'bg-sky-500', bar: 'bg-white', percent: 100, svg: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
      ];
    }
    return [];
  });

  // --- Usuarios ---
  abrirCrear() { this.modalEditUser = null; this.modalError = ''; this.form = { nombre: '', apellido: '', email: '', password: '', telefono: '', cargo: '', departamento: '', departamentoId: '', rol: 'FUNCIONARIO' }; this.modalOpen = true; }
  abrirEditar(u: any) { this.modalEditUser = u; this.modalError = ''; this.form = { ...u, departamentoId: u.departamentoId || '' }; this.modalOpen = true; }
  cerrarModal() { this.modalOpen = false; }

  guardarUsuario() {
    const tid = this.auth.usuario()?.tenantId;
    if (!tid) return;
    if (!this.form.nombre || !this.form.email || (!this.modalEditUser && !this.form.password)) {
      this.modalError = 'Por favor, complete los campos obligatorios.'; return;
    }
    const obs = this.modalEditUser
      ? this.svc.editarUsuario(this.modalEditUser.id, this.form)
      : this.svc.crearUsuario(tid, this.form);

    obs.subscribe({
      next: () => { this.svc.cargarUsuarios(tid).subscribe(); this.cerrarModal(); },
      error: (e) => this.modalError = e.error?.message || 'Ocurrió un error inesperado.'
    });
  }

  toggleActivo(u: any) {
    // Optimistic Update
    const originalValue = u.activo;
    u.activo = !originalValue;
    
    this.svc.toggleActivo(u.id).subscribe({
      next: () => {
        // Confirm from server if needed, but the local signal is already updated by reference in some cases
        // Better to reload to be sure
        this.svc.cargarUsuarios(u.tenantId).subscribe();
      },
      error: () => {
        u.activo = originalValue; // Rollback
        alert('Error al cambiar estado del usuario.');
      }
    });
  }

  onDeptoChange() {
    const depto = this.svc.departamentos().find(d => d.id === this.form.departamentoId);
    if (depto) this.form.departamento = depto.nombre;
  }

  // --- Master Data ---
  abrirCrearCargo() { this.abrirModalMaster('create', 'Cargo'); }
  abrirEditarCargo(c: any) { this.abrirModalMaster('edit', 'Cargo', c); }
  abrirCrearDepto() { this.abrirModalMaster('create', 'Departamento'); }
  abrirEditarDepto(d: any) { this.abrirModalMaster('edit', 'Departamento', d); }

  abrirModalMaster(mode: 'create' | 'edit' | 'view', type: 'Cargo' | 'Departamento', data?: any) {
    this.modalMasterMode = mode;
    this.modalMasterType = type;
    this.modalMasterId = data?.id || '';
    
    if (mode === 'create') {
      this.modalMasterTitle = `Crear Nuevo ${type}`;
      this.modalMasterForm = { 
        nombre: '', descripcion: '', codigo: '', 
        salarioBase: 0, nivel: 'OPERATIVO', 
        ubicacion: '', presupuesto: 0,
        atributosExtra: [] 
      };
    } else {
      this.modalMasterTitle = (mode === 'view' ? 'Detalles de ' : 'Editar ') + type;
      this.modalMasterForm = { ...data, atributosExtra: data.atributosExtra ? [...data.atributosExtra] : [] };
    }
    this.modalMasterOpen = true;
  }

  agregarAtributoExtra() {
    if (!this.modalMasterForm.atributosExtra) this.modalMasterForm.atributosExtra = [];
    this.modalMasterForm.atributosExtra.push({ nombre: '', tipo: 'texto', valor: '' });
  }

  removerAtributoExtra(index: number) {
    this.modalMasterForm.atributosExtra.splice(index, 1);
  }

  guardarMaster() {
    const tid = this.auth.usuario()?.tenantId;
    if (!tid || !this.modalMasterForm.nombre) return;

    const isCargo = this.modalMasterType === 'Cargo';
    const obs: Observable<any> = isCargo
      ? (this.modalMasterId ? this.svc.editarCargo(this.modalMasterId, this.modalMasterForm) : this.svc.crearCargo(tid, this.modalMasterForm))
      : (this.modalMasterId ? this.svc.editarDepartamento(this.modalMasterId, this.modalMasterForm) : this.svc.crearDepartamento(tid, this.modalMasterForm));

    obs.subscribe(() => {
      if (isCargo) this.svc.cargarCargos(tid).subscribe();
      else this.svc.cargarDepartamentos(tid).subscribe();
      this.modalMasterOpen = false;
    });
  }

  eliminarCargo(id: string) { if(confirm('¿Seguro?')) this.svc.eliminarCargo(id).subscribe(() => this.svc.cargarCargos(this.auth.usuario()!.tenantId).subscribe()); }
  eliminarDepto(id: string) { if(confirm('¿Seguro?')) this.svc.eliminarDepartamento(id).subscribe(() => this.svc.cargarDepartamentos(this.auth.usuario()!.tenantId).subscribe()); }

  // --- Tenant Profile ---
  abrirEditarTenant() {
    const tenant = this.svc.tenants()[0];
    if (!tenant) {
      this.svc.cargarTenants().subscribe(data => {
        if (data.length > 0) {
          this.tenantForm = { ...data[0] };
          this.modalTenantOpen = true;
        }
      });
      return;
    }
    this.tenantForm = { ...tenant };
    this.modalTenantOpen = true;
  }

  guardarTenant() {
    const tenantId = this.svc.tenants()[0]?.id;
    if (!tenantId) return;
    this.svc.actualizarTenant(tenantId, this.tenantForm).subscribe(() => {
      this.svc.cargarTenants().subscribe();
      this.modalTenantOpen = false;
    });
  }

  // --- UI Helpers ---
  getRolLabel(r: string) { const m: any = { ADMINISTRADOR: 'Admin', DISENADOR: 'Diseñador', FUNCIONARIO: 'Funcionario', CLIENTE: 'Cliente' }; return m[r] || r; }
  getRolCls(r: string) {
    const m: any = {
      ADMINISTRADOR: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
      DISENADOR: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
      FUNCIONARIO: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
      CLIENTE: 'bg-slate-500/10 text-slate-400 ring-slate-500/20'
    };
    return m[r] || 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
  }
  getRolDot(r: string) {
    const m: any = { ADMINISTRADOR: 'bg-indigo-500', DISENADOR: 'bg-emerald-500', FUNCIONARIO: 'bg-sky-500', CLIENTE: 'bg-slate-500' };
    return m[r] || 'bg-slate-500';
  }
  getAvatarCls(r: string) {
    const m: any = { ADMINISTRADOR: 'bg-indigo-600', DISENADOR: 'bg-emerald-600', FUNCIONARIO: 'bg-sky-600', CLIENTE: 'bg-slate-600' };
    return m[r] || 'bg-slate-700';
  }
}

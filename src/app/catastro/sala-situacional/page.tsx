'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  Building2, 
  MapPin, 
  Search, 
  Filter, 
  Layers, 
  RefreshCw, 
  Home, 
  Store, 
  Factory, 
  Building, 
  X, 
  CheckCircle, 
  Compass, 
  Navigation, 
  FileText, 
  ExternalLink,
  Phone,
  Maximize2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import type { PuntoCatastral } from '@/components/CatastroMapaInteractivo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CatastroMapaInteractivo = dynamic(() => import('@/components/CatastroMapaInteractivo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[620px] rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400">
      <RefreshCw className="w-7 h-7 animate-spin text-orange-500 mr-2" />
      <span>Cargando mapa satelital catastral de Tucacas...</span>
    </div>
  )
});

// Coordenadas conocidas por sector en Silva para inmuebles que aún no tengan punto satelital manual
const SECTOR_COORDS: Record<string, [number, number]> = {
  'Centro Tucacas': [10.7936, -68.3180],
  'Bomba H': [10.7885, -68.3240],
  'Centro Boca de Aroa': [10.6850, -68.2710],
  'Araguita': [10.7980, -68.3300],
  'Kilometro 3': [10.7780, -68.3190],
  'Trocal 3': [10.7710, -68.3220],
  'Barrio Verde': [10.7960, -68.3120],
  'Avenida Silva': [10.7910, -68.3200],
  'Kilometro 60': [10.6520, -68.2800],
  'Sector Morrocoy': [10.7850, -68.3150],
  'Sector Las Lapas': [10.8010, -68.3350],
  'Via las Lapas': [10.8030, -68.3380],
  'Sector Las Delicias': [10.7900, -68.3100],
  'Brisas del Mar': [10.7920, -68.3140],
  'Sector Sanare': [10.7550, -68.3680],
  'Puerto Flechado': [10.7750, -68.3120],
  'Centuca': [10.7890, -68.3210]
};

export default function SalaSituacionalCatastroPage() {
  const [loading, setLoading] = useState(true);
  const [puntos, setPuntos] = useState<PuntoCatastral[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'Residencial' | 'Comercial' | 'Industrial' | 'Condominio'>('TODOS');
  const [selectedPunto, setSelectedPunto] = useState<PuntoCatastral | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar pre-registros con coordenadas GPS capturadas en campo (Paginado para traer todos los puntos, incluso los más recientes)
      let allPreRegs: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error: chunkErr } = await supabase
          .from('pre_registros')
          .select('id, codigo, identidad, contribuyente, coordenadas, origen, tipo, actividad, direccion_exacta, domicilio_fiscal, is_condominio, cantidad_inmuebles, locales, fiscalizado')
          .not('coordenadas', 'is', null)
          .order('id', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (chunkErr) {
          console.error('Error paginando pre_registros:', chunkErr);
          break;
        }

        if (chunk && chunk.length > 0) {
          allPreRegs = allPreRegs.concat(chunk);
          if (chunk.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      // 2. Cargar inmuebles registrados del padrón
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('*');

      const puntosMap: PuntoCatastral[] = [];

      // Función de clasificación estricta de inmuebles
      const clasificarInmueble = (i: any): 'Condominio' | 'Industrial' | 'Comercial' | 'Residencial' => {
        const nom = (i.contribuyente || '').toUpperCase();
        const act = (i.actividad_principal || i.actividad || '').toUpperCase();
        const cls = (i.clasificacion || '').toUpperCase();
        const tipo = (i.tipo || '').toUpperCase();
        const cant = parseInt(i.cant_inmuebles || '1', 10);

        // 1. Condominio
        if (cant > 1 || cls.includes('CONDOMINIO') || nom.includes('CONDOMINIO') || nom.includes('CONJUNTO RESIDENCIAL') || nom.includes('RESIDENCIAS') || act.includes('CONDOMINIO') || act.includes('ÁREA COMÚN') || act.includes('AREA COMUN')) {
          return 'Condominio';
        }
        // 2. Industrial
        if (cls.includes('INDUSTRIAL') || act.includes('GALPÓN') || act.includes('GALPON') || tipo.includes('GALPÓN') || tipo.includes('GALPON')) {
          return 'Industrial';
        }
        // 3. Comercial (C.A., Comercios, Posadas, Hoteles, Locales, Oficinas, Muelles)
        if (cls.includes('COMERCIAL') || nom.includes(' C.A') || nom.includes(' S.A') || nom.includes('POSADA') || nom.includes('HOTEL') || nom.includes('BODEGON') || nom.includes('HIPERMERCADO') || nom.includes('EMBARCADERO') || nom.includes('INVERSIONES') || nom.includes('CORP') || tipo.includes('LOCAL') || tipo.includes('OFICINA') || tipo.includes('MUELLE') || (act.length > 0 && !act.includes('CASA') && !act.includes('VIVIENDA') && !act.includes('RESIDENCIAL') && !act.includes('NO APLICA'))) {
          return 'Comercial';
        }
        // 4. Residencial
        return 'Residencial';
      };

      // Función de clasificación estricta de pre_registros (Censo Catastro / Aseo)
      const clasificarPR = (r: any): 'Condominio' | 'Industrial' | 'Comercial' | 'Residencial' => {
        const isCondo = r.is_condominio === true || (r.tipo && r.tipo.toUpperCase().includes('CONDO'));
        if (isCondo) return 'Condominio';
        const t = (r.tipo || '').toUpperCase();
        const a = (r.actividad || '').toUpperCase();
        const nom = (r.contribuyente || '').toUpperCase();

        if (t.includes('INDUS') || a.includes('GALPON') || a.includes('GALPÓN')) return 'Industrial';
        if (t.includes('COMER') || t.includes('INSTITUCIONAL') || t.includes('MIXTO') || nom.includes(' C.A') || (a.length > 0 && !a.includes('CASAS') && !a.includes('APARTAMENTOS') && !a.includes('RESIDENCIAL') && !a.includes('VIVIENDA'))) {
          return 'Comercial';
        }
        return 'Residencial';
      };

      // Procesar puntos levantados con GPS en campo (Censo Catastro / Aseo)
      if (allPreRegs && allPreRegs.length > 0) {
        allPreRegs.forEach((r: any) => {
          let lat: number | null = null;
          let lng: number | null = null;

          if (r.coordenadas && typeof r.coordenadas === 'object') {
            lat = Number(r.coordenadas.lat);
            lng = Number(r.coordenadas.lng);
          }

          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            const tipoFormateado = clasificarPR(r);
            const isCondo = tipoFormateado === 'Condominio';

            puntosMap.push({
              id: `prereg-${r.id}`,
              codigo: r.codigo || `PR-${r.id}`,
              identidad: r.identidad || 'Sin ID',
              contribuyente: r.contribuyente || 'Contribuyente',
              tipo: tipoFormateado,
              clasificacion: r.tipo || tipoFormateado,
              actividad: r.actividad || r.codigo,
              direccion: r.direccion_exacta || r.domicilio_fiscal,
              is_condominio: isCondo,
              cantidad_inmuebles: r.cantidad_inmuebles || 0,
              locales: r.locales || [],
              lat,
              lng,
              estado: r.fiscalizado ? 'Fiscalizado' : 'Levantado'
            });
          }
        });
      }

      // Procesar inmuebles del padrón que tengan sector conocido para enriquecer la cobertura
      if (inms && inms.length > 0) {
        inms.forEach((inm: any, idx: number) => {
          // Si ya existe por RIF en preRegs, no duplicar el pin en el mismo sitio
          const exists = puntosMap.some(p => p.identidad && inm.identidad && p.identidad.replace(/[-.\s]/g, '') === inm.identidad.replace(/[-.\s]/g, ''));
          if (exists) return;

          const sectorName = inm.sector || 'Centro Tucacas';
          const baseCoord = SECTOR_COORDS[sectorName] || SECTOR_COORDS['Centro Tucacas'];
          
          // Generar una ligera dispersión pseudo-aleatoria consistente para no solapar los pines en el centro del sector
          const jitterLat = ((idx * 9301 + 49297) % 233280 / 233280 - 0.5) * 0.007;
          const jitterLng = ((idx * 49297 + 9301) % 233280 / 233280 - 0.5) * 0.007;

          const tipoFinal = clasificarInmueble(inm);
          const isCondo = tipoFinal === 'Condominio';

          puntosMap.push({
            id: `inm-${inm.id}`,
            codigo: inm.cod_cont || `INM-${inm.id}`,
            identidad: inm.identidad || 'Sin ID',
            contribuyente: inm.contribuyente || 'Contribuyente',
            tipo: tipoFinal,
            clasificacion: inm.clasificacion || tipoFinal,
            actividad: inm.actividad_principal || inm.clasificacion,
            direccion: inm.direccion,
            sector: inm.sector,
            is_condominio: isCondo,
            cantidad_inmuebles: Number(inm.cant_inmuebles || 1),
            locales: [],
            lat: baseCoord[0] + jitterLat,
            lng: baseCoord[1] + jitterLng,
            estado: inm.estado || 'Activo'
          });
        });
      }

      setPuntos(puntosMap);
    } catch (e) {
      console.error('Error cargando sala situacional de catastro:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPuntos = useMemo(() => {
    return puntos.filter(p => {
      // Filtro tipo
      if (filtroTipo !== 'TODOS') {
        if (filtroTipo === 'Condominio' && !p.is_condominio && p.tipo !== 'Condominio') return false;
        if (filtroTipo === 'Residencial' && (p.is_condominio || p.tipo !== 'Residencial')) return false;
        if (filtroTipo === 'Comercial' && p.tipo !== 'Comercial') return false;
        if (filtroTipo === 'Industrial' && p.tipo !== 'Industrial') return false;
      }

      // Filtro búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (p.contribuyente || '').toLowerCase().includes(q);
        const matchesId = (p.identidad || '').toLowerCase().includes(q);
        const matchesCod = (p.codigo || '').toLowerCase().includes(q);
        const matchesDir = (p.direccion || '').toLowerCase().includes(q);
        const matchesAct = (p.actividad || '').toLowerCase().includes(q);
        return matchesName || matchesId || matchesCod || matchesDir || matchesAct;
      }

      return true;
    });
  }, [puntos, filtroTipo, searchTerm]);

  // Contadores
  const stats = useMemo(() => {
    let res = 0, com = 0, ind = 0, cond = 0;
    puntos.forEach(p => {
      if (p.is_condominio || p.tipo === 'Condominio') cond++;
      else if (p.tipo === 'Comercial') com++;
      else if (p.tipo === 'Industrial') ind++;
      else res++;
    });
    return { total: puntos.length, res, com, ind, cond };
  }, [puntos]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto text-stone-100">
      {/* ── ENCABEZADO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-950 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Compass className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-orange-400 bg-orange-950/70 border border-orange-800/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Georreferenciación Predial
              </span>
              <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> En vivo
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              Sala Situacional GPS · Catastro Silva
            </h1>
            <p className="text-sm text-stone-400">
              Mapeo satelital interactivo de viviendas, comercios, industrias y condominios en Tucacas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-stone-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            Actualizar Datos
          </button>
        </div>
      </div>

      {/* ── KPI METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setFiltroTipo('TODOS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTipo === 'TODOS' ? 'bg-stone-800 border-orange-500 shadow-lg' : 'bg-stone-950 border-stone-800 hover:bg-stone-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-bold uppercase">Total Predios</span>
            <Layers className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <span className="text-[10px] text-stone-500">Puntos registrados</span>
        </div>

        <div 
          onClick={() => setFiltroTipo('Residencial')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTipo === 'Residencial' ? 'bg-stone-800 border-emerald-500 shadow-lg' : 'bg-stone-950 border-stone-800 hover:bg-stone-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-bold uppercase">Viviendas</span>
            <Home className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.res}</p>
          <span className="text-[10px] text-stone-500">Residenciales</span>
        </div>

        <div 
          onClick={() => setFiltroTipo('Comercial')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTipo === 'Comercial' ? 'bg-stone-800 border-orange-500 shadow-lg' : 'bg-stone-950 border-stone-800 hover:bg-stone-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-400 font-bold uppercase">Comercios</span>
            <Store className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-orange-400 mt-1">{stats.com}</p>
          <span className="text-[10px] text-stone-500">Locales y negocios</span>
        </div>

        <div 
          onClick={() => setFiltroTipo('Condominio')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTipo === 'Condominio' ? 'bg-stone-800 border-purple-500 shadow-lg' : 'bg-stone-950 border-stone-800 hover:bg-stone-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-400 font-bold uppercase">Condominios</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1">{stats.cond}</p>
          <span className="text-[10px] text-stone-500">Conjuntos / Edificios</span>
        </div>

        <div 
          onClick={() => setFiltroTipo('Industrial')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTipo === 'Industrial' ? 'bg-stone-800 border-rose-500 shadow-lg' : 'bg-stone-950 border-stone-800 hover:bg-stone-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-bold uppercase">Industrias</span>
            <Factory className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.ind}</p>
          <span className="text-[10px] text-stone-500">Galpones / Talleres</span>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ── */}
      <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por propietario, RIF, parcela, sector o uso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-900 text-stone-100 placeholder-stone-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-stone-700 focus:outline-none focus:border-orange-500 transition-colors"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-stone-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filtrar:
          </span>
          {(['TODOS', 'Residencial', 'Comercial', 'Condominio', 'Industrial'] as const).map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filtroTipo === tipo
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-white border border-stone-800'
              }`}
            >
              {tipo === 'TODOS' ? 'Todos los Puntos' : tipo}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAPA Y PANEL LATERAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa Interactivo Leaflet (2 Columnas en pantallas grandes) */}
        <div className="lg:col-span-2 bg-stone-950 p-2.5 rounded-2xl border border-stone-800 shadow-xl overflow-hidden min-h-[580px] h-[640px] relative">
          <CatastroMapaInteractivo
            puntos={filteredPuntos}
            focusedPoint={selectedPunto}
            onSelectPunto={(p) => setSelectedPunto(p)}
          />

          {/* Leyenda flotante en esquina del mapa */}
          <div className="absolute bottom-6 left-6 z-20 bg-stone-950/90 backdrop-blur-md border border-stone-700/80 p-3 rounded-xl shadow-2xl text-[11px] space-y-1.5 hidden sm:block">
            <span className="font-bold text-stone-300 block border-b border-stone-800 pb-1">Leyenda de Predios</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Vivienda / Residencial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Comercial / Local</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Condominio / Edificio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Industrial / Galpón</span>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Detalle del Punto Seleccionado o Listado Rápido */}
        <div className="bg-stone-950 rounded-2xl border border-stone-800 shadow-xl p-5 flex flex-col h-[640px]">
          {selectedPunto ? (
            <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1">
              {/* Header Ficha */}
              <div className="flex items-start justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg ${
                    selectedPunto.is_condominio ? 'bg-purple-600' :
                    selectedPunto.tipo === 'Comercial' ? 'bg-orange-600' :
                    selectedPunto.tipo === 'Industrial' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}>
                    {selectedPunto.is_condominio ? '🏢' : selectedPunto.tipo === 'Comercial' ? '🏪' : selectedPunto.tipo === 'Industrial' ? '🏭' : '🏠'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                      Ficha de Inmueble GPS
                    </span>
                    <h3 className="font-black text-base text-white leading-tight">
                      {selectedPunto.contribuyente}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPunto(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Badges de Estado */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-stone-900 border border-stone-800 text-stone-200">
                  {selectedPunto.tipo}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-orange-950/80 text-orange-400 border border-orange-800/80">
                  {selectedPunto.codigo || 'S/C'}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {selectedPunto.estado || 'Activo'}
                </span>
              </div>

              {/* Campos Principales */}
              <div className="space-y-3 bg-stone-900/60 p-3.5 rounded-xl border border-stone-800/80 text-xs">
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block">R.I.F. / Cédula Propietario</span>
                  <span className="text-stone-200 font-mono font-bold text-sm">{selectedPunto.identidad}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block">Uso / Actividad Económica</span>
                  <span className="text-stone-200 font-semibold">{selectedPunto.actividad || selectedPunto.clasificacion || 'No especificado'}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block">Dirección Predial Exacta</span>
                  <span className="text-stone-300 leading-relaxed block mt-0.5">
                    📍 {selectedPunto.direccion || 'Tucacas, Municipio Silva'}
                  </span>
                </div>
                {selectedPunto.sector && (
                  <div>
                    <span className="text-stone-400 font-bold uppercase text-[10px] block">Sector Geográfico</span>
                    <span className="text-stone-200">{selectedPunto.sector}</span>
                  </div>
                )}
              </div>

              {/* Coordenadas GPS */}
              <div className="bg-stone-900/90 p-3 rounded-xl border border-stone-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-orange-400" /> Coordenadas Satelitales (WGS84)
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedPunto.id.startsWith('prereg-') ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-300 border border-amber-800/60'}`}>
                    {selectedPunto.id.startsWith('prereg-') ? '📍 GPS en Campo' : '🗺️ Georref. por Sector'}
                  </span>
                </div>
                <p className="font-mono text-xs text-emerald-400 font-bold">
                  Lat: {selectedPunto.lat.toFixed(6)}, Lng: {selectedPunto.lng.toFixed(6)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${selectedPunto.lat},${selectedPunto.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-orange-400 hover:text-orange-300 underline inline-flex items-center gap-1 mt-1 font-semibold"
                >
                  Abrir en Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Si es Condominio o tiene locales */}
              {selectedPunto.is_condominio && (
                <div className="bg-purple-950/30 p-3 rounded-xl border border-purple-800/40 text-xs space-y-2">
                  <span className="text-purple-300 font-bold uppercase text-[10px] block">
                    Condominio Multiresidencial / Centro Comercial
                  </span>
                  <p className="text-stone-300">
                    Contiene un total de <strong>{selectedPunto.cantidad_inmuebles || selectedPunto.locales?.length || 1}</strong> unidades/apartamentos registrados.
                  </p>
                  {selectedPunto.locales && selectedPunto.locales.length > 0 && (
                    <div className="max-h-28 overflow-y-auto space-y-1 mt-2">
                      {selectedPunto.locales.map((loc: any, idx: number) => (
                        <div key={idx} className="bg-purple-950/60 p-1.5 rounded text-[11px] border border-purple-800/30 flex justify-between">
                          <span className="font-bold text-stone-200">{loc.identificador || `Local ${idx+1}`}</span>
                          <span className="text-stone-400">{loc.actividad || loc.tipo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Botón de Acción a la Ficha de Catastro */}
              <div className="pt-2 mt-auto">
                <a
                  href={`/catastro/fichas`}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/20"
                >
                  <FileText className="w-4 h-4" />
                  Ir a Fichas Catastrales
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="border-b border-stone-800 pb-3 mb-3">
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  Padrón Georreferenciado ({filteredPuntos.length})
                </h3>
                <p className="text-[11px] text-stone-400">
                  Selecciona un predio en el mapa o en esta lista para enfocar sus datos.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredPuntos.slice(0, 50).map((p) => {
                  const isCondo = p.is_condominio || p.tipo === 'Condominio';
                  const icon = isCondo ? '🏢' : p.tipo === 'Comercial' ? '🏪' : p.tipo === 'Industrial' ? '🏭' : '🏠';

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPunto(p)}
                      className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800/80 border border-stone-800 transition-all cursor-pointer flex items-center gap-3 text-xs"
                    >
                      <span className="text-base shrink-0">{icon}</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-stone-200 truncate">{p.contribuyente}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400">
                          <span className="font-mono text-orange-400">{p.identidad}</span>
                          <span>•</span>
                          <span className="truncate">{p.actividad || p.tipo}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono shrink-0">
                        GPS
                      </span>
                    </div>
                  );
                })}

                {filteredPuntos.length > 50 && (
                  <p className="text-[10px] text-center text-stone-500 py-2">
                    Mostrando los primeros 50 de {filteredPuntos.length} puntos. Usa el buscador para filtrar.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export interface PuntoCatastral {
  id: string | number;
  codigo?: string;
  identidad: string;
  contribuyente: string;
  tipo: 'Residencial' | 'Comercial' | 'Industrial' | 'Condominio' | string;
  clasificacion?: string;
  actividad?: string;
  direccion?: string;
  sector?: string;
  is_condominio?: boolean;
  cantidad_inmuebles?: number;
  locales?: any[];
  lat: number;
  lng: number;
  estado?: string;
}

function getMarkerColor(p: PuntoCatastral): { bg: string; border: string; icon: string; label: string } {
  if (p.is_condominio || (p.tipo && p.tipo.toUpperCase() === 'CONDOMINIO') || (p.contribuyente && p.contribuyente.toUpperCase().includes('CONDOMINIO'))) {
    return { bg: '#8b5cf6', border: '#c4b5fd', icon: '🏢', label: 'Condominio' };
  }
  const tipoUpper = (p.tipo || '').toUpperCase();
  if (tipoUpper === 'COMERCIAL' || tipoUpper.includes('COMER') || tipoUpper.includes('INSTITUCIONAL')) {
    return { bg: '#f97316', border: '#fdba74', icon: '🏪', label: 'Comercial' };
  }
  if (tipoUpper === 'INDUSTRIAL' || tipoUpper.includes('INDUS')) {
    return { bg: '#ef4444', border: '#fca5a5', icon: '🏭', label: 'Industrial' };
  }
  return { bg: '#10b981', border: '#6ee7b7', icon: '🏠', label: 'Residencial' };
}

function createCustomPin(p: PuntoCatastral, isSelected: boolean) {
  const style = getMarkerColor(p);
  const size = isSelected ? 42 : 30;
  const fontSize = isSelected ? '18px' : '14px';

  return L.divIcon({
    html: `
      <div style="
        background: ${style.bg};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
        border: ${isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.85)'};
        cursor: pointer;
        transition: transform 0.2s ease, width 0.2s ease, height 0.2s ease;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: ${fontSize};
          line-height: 1;
        ">${style.icon}</span>
      </div>
    `,
    className: 'custom-catastro-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
}

function MapAutoFlyTo({ focusedPoint }: { focusedPoint: PuntoCatastral | null }) {
  const map = useMap();
  const lastIdRef = useRef<any>(null);

  useEffect(() => {
    if (focusedPoint && focusedPoint.lat && focusedPoint.lng) {
      if (lastIdRef.current !== focusedPoint.id) {
        lastIdRef.current = focusedPoint.id;
        map.flyTo([focusedPoint.lat, focusedPoint.lng], 18, { duration: 1.2 });
      }
    }
  }, [focusedPoint, map]);

  return null;
}

interface CatastroMapaProps {
  puntos: PuntoCatastral[];
  focusedPoint: PuntoCatastral | null;
  onSelectPunto: (p: PuntoCatastral) => void;
}

export default function CatastroMapaInteractivo({
  puntos,
  focusedPoint,
  onSelectPunto
}: CatastroMapaProps) {
  // Centro por defecto: Tucacas, Falcón
  const centerLat = focusedPoint ? focusedPoint.lat : 10.7936;
  const centerLng = focusedPoint ? focusedPoint.lng : -68.318;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full rounded-2xl"
        style={{ minHeight: '520px', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapAutoFlyTo focusedPoint={focusedPoint} />

        {puntos.map((p) => {
          const isSelected = focusedPoint?.id === p.id;
          const markerIcon = createCustomPin(p, isSelected);
          const colorInfo = getMarkerColor(p);

          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => onSelectPunto(p)
              }}
            >
              <Popup className="custom-catastro-popup">
                <div className="p-1 space-y-1.5 max-w-[240px] text-stone-900 font-sans">
                  <div className="flex items-center gap-1.5 border-b border-stone-200 pb-1">
                    <span className="text-base">{colorInfo.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white" style={{ background: colorInfo.bg }}>
                      {colorInfo.label}
                    </span>
                    {p.codigo && (
                      <span className="text-[10px] font-mono text-stone-500 ml-auto">
                        {p.codigo}
                      </span>
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs leading-tight text-stone-900">
                      {p.contribuyente}
                    </h5>
                    <p className="text-[11px] font-semibold text-stone-600 font-mono">
                      {p.identidad}
                    </p>
                  </div>
                  {p.actividad && (
                    <p className="text-[11px] text-stone-700 bg-stone-100 p-1 rounded">
                      <strong>Uso:</strong> {p.actividad}
                    </p>
                  )}
                  {p.direccion && (
                    <p className="text-[10px] text-stone-500 leading-snug">
                      📍 {p.direccion}
                    </p>
                  )}
                  <button
                    onClick={() => onSelectPunto(p)}
                    className="w-full mt-1 bg-stone-900 hover:bg-orange-600 text-white text-[11px] font-bold py-1 px-2 rounded transition-colors"
                  >
                    Ver Ficha Completa
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

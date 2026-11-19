'use client';

import { useEffect, useRef, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

// Estilos de alto rendimiento para CircleMarker (Renderizado por Canvas de la GPU)
function getPointStyle(tipo: string, isCondo: boolean, isSelected: boolean) {
  if (isCondo || tipo === 'Condominio') {
    return {
      color: '#ffffff',
      fillColor: '#8b5cf6', // Violeta / Púrpura
      fillOpacity: isSelected ? 1 : 0.85,
      weight: isSelected ? 3 : 1.5,
      radius: isSelected ? 11 : 6.5
    };
  }
  if (tipo === 'Comercial') {
    return {
      color: '#ffffff',
      fillColor: '#f97316', // Naranja
      fillOpacity: isSelected ? 1 : 0.85,
      weight: isSelected ? 3 : 1.5,
      radius: isSelected ? 11 : 6
    };
  }
  // Residencial
  return {
    color: '#ffffff',
    fillColor: '#10b981', // Verde esmeralda
    fillOpacity: isSelected ? 1 : 0.85,
    weight: isSelected ? 3 : 1.5,
    radius: isSelected ? 10 : 5.5
  };
}

function MapAutoFlyTo({ focusedPoint }: { focusedPoint: PuntoCatastral | null }) {
  const map = useMap();
  const lastIdRef = useRef<any>(null);

  useEffect(() => {
    if (focusedPoint && focusedPoint.lat && focusedPoint.lng) {
      if (lastIdRef.current !== focusedPoint.id) {
        lastIdRef.current = focusedPoint.id;
        map.flyTo([focusedPoint.lat, focusedPoint.lng], 18, { duration: 0.8 });
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

function CatastroMapaBase({
  puntos,
  focusedPoint,
  onSelectPunto
}: CatastroMapaProps) {
  // Centro inicial: Tucacas, Falcón
  const centerLat = focusedPoint ? focusedPoint.lat : 10.7936;
  const centerLng = focusedPoint ? focusedPoint.lng : -68.318;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={15}
        preferCanvas={true} // ACELERACIÓN POR HARDWARE / CANVAS: renderiza miles de puntos a 60 FPS
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

        {/* Renderizado ultraligero por Canvas: Cero lag y máxima fluidez */}
        {puntos.map((p) => {
          const isSelected = focusedPoint?.id === p.id;
          const style = getPointStyle(p.tipo, !!p.is_condominio, isSelected);

          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={style.radius}
              pathOptions={{
                color: style.color,
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
                weight: style.weight
              }}
              eventHandlers={{
                click: () => onSelectPunto(p)
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

export default memo(CatastroMapaBase);

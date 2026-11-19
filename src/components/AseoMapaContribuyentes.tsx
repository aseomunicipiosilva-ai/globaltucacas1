'use client';

import { useEffect, useRef, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface PuntoAseo {
  id: string | number;
  codigo?: string;
  identidad: string;
  contribuyente: string;
  tipo: 'Residencial' | 'Comercial' | 'Condominio' | string;
  clasificacion?: string;
  actividad?: string;
  direccion?: string;
  sector?: string;
  is_condominio?: boolean;
  cantidad_inmuebles?: number;
  deuda_total: number;
  facturas_pendientes: number;
  solvente: boolean;
  tarifa_mensual?: number;
  lat: number;
  lng: number;
}

// Estilos de alto rendimiento para CircleMarker según Solvencia en Aseo
function getPointStyle(solvente: boolean, deuda: number, isSelected: boolean) {
  if (solvente) {
    return {
      color: '#ffffff',
      fillColor: '#10b981', // Verde esmeralda (Solvente)
      fillOpacity: isSelected ? 1 : 0.85,
      weight: isSelected ? 3 : 1.5,
      radius: isSelected ? 11 : 6
    };
  }
  // Moroso / Con Deuda
  return {
    color: '#ffffff',
    fillColor: '#ef4444', // Rojo (Con Deuda)
    fillOpacity: isSelected ? 1 : 0.85,
    weight: isSelected ? 3 : 1.5,
    radius: isSelected ? 11 : (deuda > 1000 ? 7 : 6)
  };
}

function MapAutoFlyTo({ focusedPoint }: { focusedPoint: PuntoAseo | null }) {
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

interface AseoMapaProps {
  puntos: PuntoAseo[];
  focusedPoint: PuntoAseo | null;
  onSelectPunto: (p: PuntoAseo) => void;
}

function AseoMapaBase({
  puntos,
  focusedPoint,
  onSelectPunto
}: AseoMapaProps) {
  const centerLat = focusedPoint ? focusedPoint.lat : 10.7936;
  const centerLng = focusedPoint ? focusedPoint.lng : -68.318;

  return (
    <div className="w-full h-full relative z-10">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={15}
        preferCanvas={true} // Aceleración por GPU
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
          const style = getPointStyle(p.solvente, p.deuda_total, isSelected);

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

export default memo(AseoMapaBase);

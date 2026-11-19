'use client';

import { useEffect, useRef, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  // Campos de escaneo QR por operadores
  escaneado?: boolean;
  operador?: string;
  inicial_operador?: string;
  escaneado_at?: string;
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

// Icono morado con la letra inicial del operador adentro para puntos escaneados
function createOperatorDivIcon(inicial: string, isSelected: boolean) {
  const size = isSelected ? 32 : 26;
  const fontSize = isSelected ? 13 : 11;
  const border = isSelected ? 'border: 3px solid #ffffff;' : 'border: 2px solid #ffffff;';
  const shadow = isSelected 
    ? 'box-shadow: 0 0 15px rgba(139, 92, 246, 0.9), 0 4px 6px rgba(0,0,0,0.3);' 
    : 'box-shadow: 0 0 10px rgba(139, 92, 246, 0.7), 0 2px 4px rgba(0,0,0,0.25);';

  return L.divIcon({
    className: 'custom-qr-operator-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        color: #ffffff;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 900;
        font-size: ${fontSize}px;
        line-height: 1;
        ${border}
        ${shadow}
        transform: translate(-50%, -50%);
        transition: transform 0.2s ease;
      ">
        ${inicial || 'O'}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
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

          // Si fue escaneado con QR, se renderiza con color MORADO y la letra del operador adentro
          if (p.escaneado) {
            const inicial = (p.inicial_operador || (p.operador ? p.operador[0] : 'O')).toUpperCase();
            return (
              <Marker
                key={p.id}
                position={[p.lat, p.lng]}
                icon={createOperatorDivIcon(inicial, isSelected)}
                eventHandlers={{
                  click: () => onSelectPunto(p)
                }}
              />
            );
          }

          // Puntos normales: Verde si solvente, Rojo si moroso
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

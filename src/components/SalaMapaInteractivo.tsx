'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Icono personalizado para camión / unidad
const truckIcon = L.divIcon({
  html: `
    <div style="
      background: #059669;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.7);
      border: 3px solid #ffffff;
      font-size: 18px;
      color: white;
    ">
      🚛
    </div>
  `,
  className: 'custom-truck-pin',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -22]
});

// Componente para re-centrar el mapa automáticamente si cambian las unidades
function MapAutoRecenter({ units }: { units: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (units.length > 0 && units[0]?.lat && units[0]?.lng) {
      if (units.length === 1) {
        map.setView([units[0].lat, units[0].lng], 15, { animate: true });
      } else {
        const bounds = L.latLngBounds(units.map(u => [u.lat, u.lng]));
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [units, map]);
  return null;
}

interface SalaMapaProps {
  units: any[];
}

export default function SalaMapaInteractivo({ units }: SalaMapaProps) {
  // Centro por defecto: Tucacas, Falcón
  const defaultPos: [number, number] = [10.795, -68.318];
  const centerPos: [number, number] = units.length > 0 && units[0]?.lat && units[0]?.lng 
    ? [units[0].lat, units[0].lng] 
    : defaultPos;

  return (
    <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative z-0">
      <MapContainer
        center={centerPos}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoRecenter units={units} />

        {units.map((u, i) => {
          if (!u.lat || !u.lng) return null;
          return (
            <Marker key={i} position={[u.lat, u.lng]} icon={truckIcon}>
              <Popup>
                <div style={{ minWidth: '180px', padding: '4px' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', textTransform: 'uppercase' }}>
                    {u.unidad}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    <strong>Supervisor:</strong> {u.supervisor || 'N/A'}<br />
                    <strong>Chofer:</strong> {u.chofer || 'Sin chofer'}<br />
                    <strong>Ruta:</strong> {u.ruta || 'Sin ruta'}<br />
                    <strong>Coordenadas:</strong> {Number(u.lat).toFixed(5)}, {Number(u.lng).toFixed(5)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px', fontWeight: 700 }}>
                    ● En transmisión satelital
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Paleta de colores para trazados de múltiples camiones
const TRAIL_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ef4444'  // red
];

// Helper para crear icono con color y emoji según selección
function createTruckIcon(selected: boolean, color: string = '#10b981') {
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: ${selected ? '44px' : '36px'};
        height: ${selected ? '44px' : '36px'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 ${selected ? '22px' : '12px'} ${color};
        border: 3px solid #ffffff;
        font-size: ${selected ? '20px' : '16px'};
        color: white;
        transition: all 0.3s ease;
      ">
        🚛
      </div>
    `,
    className: 'custom-truck-pin',
    iconSize: selected ? [44, 44] : [36, 36],
    iconAnchor: selected ? [22, 22] : [18, 18],
    popupAnchor: [0, -22]
  });
}

// Auto recentrado inteligente
function MapAutoRecenter({ 
  units, 
  focusedUnit 
}: { 
  units: any[]; 
  focusedUnit: any | null;
}) {
  const map = useMap();
  const prevFocusedRef = useRef<string | null>(null);

  useEffect(() => {
    // Si hay una unidad enfocada individualmente
    if (focusedUnit && focusedUnit.lat && focusedUnit.lng) {
      map.setView([focusedUnit.lat, focusedUnit.lng], 16, { animate: true });
      prevFocusedRef.current = focusedUnit.unidad;
      return;
    }

    // Si cambió a ver todas las unidades seleccionadas
    if (units.length > 0) {
      const validPoints = units
        .filter(u => u.lat && u.lng)
        .map(u => [u.lat, u.lng] as [number, number]);

      if (validPoints.length === 1) {
        map.setView(validPoints[0], 15, { animate: true });
      } else if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [units, focusedUnit, map]);

  return null;
}

interface SalaMapaProps {
  units: any[];
  selectedUnitNames: string[];
  focusedUnit: any | null;
  onSelectUnit?: (unit: any) => void;
}

export default function SalaMapaInteractivo({ 
  units, 
  selectedUnitNames, 
  focusedUnit,
  onSelectUnit 
}: SalaMapaProps) {
  // Filtrar unidades que están seleccionadas para mostrar en el mapa
  const visibleUnits = units.filter(u => 
    selectedUnitNames.length === 0 || selectedUnitNames.includes(u.unidad)
  );

  // Centro por defecto: Tucacas, Falcón
  const defaultPos: [number, number] = [10.795, -68.318];
  const centerPos: [number, number] = visibleUnits.length > 0 && visibleUnits[0]?.lat && visibleUnits[0]?.lng 
    ? [visibleUnits[0].lat, visibleUnits[0].lng] 
    : defaultPos;

  return (
    <div className="w-full h-[580px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative z-0">
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

        <MapAutoRecenter units={visibleUnits} focusedUnit={focusedUnit} />

        {visibleUnits.map((u, i) => {
          if (!u.lat || !u.lng) return null;
          const isFocused = focusedUnit?.unidad === u.unidad;
          const color = TRAIL_COLORS[i % TRAIL_COLORS.length];
          const icon = createTruckIcon(isFocused, color);

          // Puntos del trazado / recorrido histórico
          const trailPoints: [number, number][] = Array.isArray(u.trail) && u.trail.length > 0
            ? u.trail.map((pt: any) => [pt.lat, pt.lng] as [number, number])
            : [[u.lat, u.lng]];

          return (
            <div key={u.config_id || u.unidad || i}>
              {/* Trazado del camino recorrido en tiempo real */}
              {trailPoints.length > 1 && (
                <Polyline
                  positions={trailPoints}
                  pathOptions={{
                    color,
                    weight: isFocused ? 5 : 4,
                    opacity: 0.85,
                    dashArray: '4, 8'
                  }}
                />
              )}

              {/* Pin del Camión en su posición actual */}
              <Marker 
                position={[u.lat, u.lng]} 
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (onSelectUnit) onSelectUnit(u);
                  }
                }}
              >
                <Popup>
                  <div style={{ minWidth: '190px', padding: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                      <span style={{ fontWeight: 900, fontSize: '13px', color: '#0f172a', textTransform: 'uppercase' }}>
                        {u.unidad}
                      </span>
                      <span style={{ fontSize: '10px', background: `${color}20`, color, fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        GPS En Vivo
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px', lineHeight: '1.5' }}>
                      <div><strong>Supervisor:</strong> {u.supervisor || 'N/A'}</div>
                      <div><strong>Chofer:</strong> {u.chofer || 'Sin chofer'}</div>
                      <div><strong>Ruta:</strong> {u.ruta || 'Sin ruta asignada'}</div>
                      <div><strong>Coordenadas:</strong> {Number(u.lat).toFixed(5)}, {Number(u.lng).toFixed(5)}</div>
                      {trailPoints.length > 1 && (
                        <div style={{ color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                          🛣️ Trazado: {trailPoints.length} puntos registrados
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

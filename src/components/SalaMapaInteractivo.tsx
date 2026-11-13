'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const TRAIL_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ef4444'  // red
];

function createTruckIcon(selected: boolean, color: string = '#10b981') {
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: ${selected ? '46px' : '38px'};
        height: ${selected ? '46px' : '38px'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 ${selected ? '25px' : '12px'} ${color};
        border: 3px solid #ffffff;
        font-size: ${selected ? '22px' : '18px'};
        color: white;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        🚛
      </div>
    `,
    className: 'custom-truck-pin',
    iconSize: selected ? [46, 46] : [38, 38],
    iconAnchor: selected ? [23, 23] : [19, 19],
    popupAnchor: [0, -24]
  });
}

function MapAutoRecenter({ focusedUnit }: { focusedUnit: any | null }) {
  const map = useMap();
  const lastFocusedRef = useRef<string | null>(null);

  useEffect(() => {
    if (focusedUnit && focusedUnit.lat && focusedUnit.lng) {
      if (lastFocusedRef.current !== focusedUnit.unidad) {
        lastFocusedRef.current = focusedUnit.unidad;
        map.flyTo([focusedUnit.lat, focusedUnit.lng], 17, { duration: 1.2 });
      }
    } else {
      lastFocusedRef.current = null;
    }
  }, [focusedUnit, map]);

  return null;
}

interface SalaMapaProps {
  units: any[];
  selectedUnitNames: string[];
  focusedUnit: any | null;
  showTracePoints?: boolean;
  onSelectUnit?: (unit: any) => void;
  onForcePointAdded?: () => void;
}

export default function SalaMapaInteractivo({ 
  units, 
  selectedUnitNames, 
  focusedUnit,
  showTracePoints = true,
  onSelectUnit,
  onForcePointAdded
}: SalaMapaProps) {
  const [savingPointUnit, setSavingPointUnit] = useState<string | null>(null);
  const [pointSuccessMsg, setPointSuccessMsg] = useState<string | null>(null);

  const visibleUnits = units.filter(u => 
    selectedUnitNames.length === 0 || selectedUnitNames.includes(u.unidad)
  );

  const defaultPos: [number, number] = [10.795, -68.318];
  const centerPos: [number, number] = visibleUnits.length > 0 && visibleUnits[0]?.lat && visibleUnits[0]?.lng 
    ? [visibleUnits[0].lat, visibleUnits[0].lng] 
    : defaultPos;

  // Función para forzar guardar punto de ubicación al tocar el camión
  const handleGuardarPuntoManual = async (u: any) => {
    setSavingPointUnit(u.unidad);
    setPointSuccessMsg(null);
    try {
      const res = await fetch('/api/supervisor-rutas/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidad: u.unidad,
          supervisor: u.supervisor || 'Supervisor',
          ruta: u.ruta || '',
          chofer: u.chofer || '',
          lat: u.lat,
          lng: u.lng,
          force_point: true
        })
      });

      if (res.ok) {
        setPointSuccessMsg(`¡Punto guardado en bitácora!`);
        if (onForcePointAdded) onForcePointAdded();
        setTimeout(() => setPointSuccessMsg(null), 3500);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setSavingPointUnit(null);
    }
  };

  return (
    <div className="w-full h-[580px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative z-0">
      <MapContainer
        center={centerPos}
        zoom={14}
        maxZoom={19}
        minZoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapAutoRecenter focusedUnit={focusedUnit} />

        {visibleUnits.map((u, i) => {
          if (!u.lat || !u.lng) return null;
          const isFocused = focusedUnit?.unidad === u.unidad;
          const color = TRAIL_COLORS[i % TRAIL_COLORS.length];
          const icon = createTruckIcon(isFocused, color);

          const rawTrail = Array.isArray(u.trail) && u.trail.length > 0
            ? u.trail
            : [{ lat: u.lat, lng: u.lng, time: u.updated_at }];

          const trailCoords: [number, number][] = rawTrail.map((pt: any) => [pt.lat, pt.lng]);
          const bitacoraPoints = Array.isArray(u.bitacora) ? u.bitacora : [];

          return (
            <div key={u.config_id || u.unidad || i}>
              {/* LÍNEA DE TRAZABILIDAD CONTINUA */}
              {trailCoords.length > 1 && (
                <Polyline
                  positions={trailCoords}
                  pathOptions={{
                    color,
                    weight: isFocused ? 6 : 4,
                    opacity: 0.85,
                    dashArray: '5, 8'
                  }}
                />
              )}

              {/* PUNTOS DE TRAZABILIDAD CRONOLÓGICA */}
              {showTracePoints && bitacoraPoints.map((bPt: any, bIdx: number) => {
                const horaPunto = bPt.hora || (bPt.time ? new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(bPt.time)) : 'N/A');
                return (
                  <CircleMarker
                    key={`b-${bIdx}`}
                    center={[bPt.lat, bPt.lng]}
                    radius={isFocused ? 6 : 5}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: color,
                      fillOpacity: 0.95,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '160px', padding: '3px' }}>
                        <div style={{ fontWeight: 800, fontSize: '11px', color: '#0f172a' }}>
                          📍 Hito #{bIdx + 1} de Trazabilidad
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', lineHeight: '1.4' }}>
                          <strong>Unidad:</strong> {u.unidad}<br />
                          <strong>Hora (Venezuela):</strong> {horaPunto}<br />
                          <strong>Ruta:</strong> {bPt.ruta || 'En ruta'}<br />
                          <strong>Coord:</strong> {Number(bPt.lat).toFixed(5)}, {Number(bPt.lng).toFixed(5)}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* PIN ACTUAL DEL CAMIÓN EN VIVO */}
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
                  <div style={{ minWidth: '210px', padding: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                      <span style={{ fontWeight: 900, fontSize: '13px', color: '#0f172a', textTransform: 'uppercase' }}>
                        {u.unidad}
                      </span>
                      <span style={{ fontSize: '10px', background: `${color}20`, color, fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        En Vivo
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px', lineHeight: '1.5' }}>
                      <div><strong>Supervisor:</strong> {u.supervisor || 'N/A'}</div>
                      <div><strong>Chofer:</strong> {u.chofer || 'Sin chofer'}</div>
                      <div><strong>Ruta:</strong> {u.ruta || 'Sin ruta asignada'}</div>
                      <div><strong>Posición:</strong> {Number(u.lat).toFixed(5)}, {Number(u.lng).toFixed(5)}</div>
                      <div style={{ color: '#059669', fontWeight: 700, marginTop: '3px' }}>
                        🛣️ {trailCoords.length} posiciones en trazado
                      </div>
                      <div style={{ color: '#3b82f6', fontWeight: 700 }}>
                        📍 {bitacoraPoints.length} hitos registrados
                      </div>
                    </div>

                    {/* BOTÓN AL TOCAR EL CAMIÓN: GUARDAR HITO MANUALMENTE */}
                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        type="button"
                        onClick={() => handleGuardarPuntoManual(u)}
                        disabled={savingPointUnit === u.unidad}
                        style={{
                          width: '100%',
                          background: '#059669',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        {savingPointUnit === u.unidad ? 'Guardando...' : '📍 Guardar Punto de Ubicación Ahora'}
                      </button>

                      {pointSuccessMsg && (
                        <div style={{ color: '#059669', fontSize: '10px', fontWeight: 800, textAlign: 'center', marginTop: '4px' }}>
                          ✓ {pointSuccessMsg}
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

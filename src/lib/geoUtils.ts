/**
 * Helper para construir una dirección precisa y georreferenciada en Tucacas
 */
export function formatDireccionPrecisa(data: any, loc: { lat: number; lng: number }): string {
  if (!data) {
    return `Coordenadas GPS: [${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}], Municipio Silva`;
  }

  const addr = data.address || {};
  const via = addr.road || addr.pedestrian || addr.highway || addr.footway || '';
  const barrioOSector = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || addr.village || '';
  const ciudad = addr.city || addr.town || 'Tucacas';
  const municipio = addr.county || 'Municipio Silva';
  const coordsLabel = `(GPS: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`;

  const partes = [];
  if (via) partes.push(via);
  if (barrioOSector && barrioOSector !== via) partes.push(`Sector ${barrioOSector}`);
  partes.push(ciudad);
  partes.push(municipio);
  partes.push(coordsLabel);

  return partes.join(', ');
}

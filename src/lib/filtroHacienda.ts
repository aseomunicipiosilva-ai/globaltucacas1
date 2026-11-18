/**
 * Utilidades para filtrado y deduplicación de contribuyentes de Hacienda Municipal.
 * En Hacienda (ISAE, Patentes y Tasas Comerciales/Industriales) NO aplican
 * los condominios residenciales ni edificios residenciales comunes.
 */

export function normalizarIdentidad(identidad?: string | null): string {
  if (!identidad) return '';
  return identidad.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function esCondominioResidencial(item: any): boolean {
  if (!item) return false;
  const nombre = (item.contribuyente || item.propietario || '').toLowerCase();
  const act = (item.actividad_principal || item.actividad || '').toLowerCase();
  const tipo = (item.tipo || '').toLowerCase();
  const cls = (item.clasificacion || '').toUpperCase();

  // 1. Actividad explícita de área común o condominio residencial
  if (act.includes('condominio residencial') || act.includes('área común') || act.includes('area comun')) {
    return true;
  }

  // 2. Tipo inmueble apartamento
  if (tipo === 'apartamento') {
    return true;
  }

  // 3. Nombres que indican conjunto o edificio residencial (a menos que sea posada/hotel)
  const esNombreResidencial = (
    nombre.includes('condominio') || 
    nombre.includes('conjunto residencial') || 
    nombre.includes('residencias ') || 
    nombre.includes('residencia ') ||
    nombre.includes('resd ') ||
    nombre.includes('edificio ')
  );

  const esComercialTuristico = (
    nombre.includes('posada') || 
    nombre.includes('hotel') || 
    nombre.includes('comercial') || 
    act.includes('posada') || 
    act.includes('hotel') ||
    act.includes('comercio') ||
    tipo === 'local / oficina'
  );

  if (esNombreResidencial && !esComercialTuristico) {
    return true;
  }

  // 4. Tipo C que sea estrictamente residencial
  if (cls === 'TIPO C' && !esComercialTuristico) {
    return true;
  }

  // 5. Tipo A o Residencial
  if (cls.includes('RESIDENCIAL') || cls.includes('TIPO A')) {
    return true;
  }

  return false;
}

export function esContribuyenteHacienda(item: any): boolean {
  if (!item) return false;
  if (esCondominioResidencial(item)) return false;

  const cls = (item.clasificacion || '').toUpperCase();
  const act = (item.actividad_principal || item.actividad || '').toUpperCase();
  const nom = (item.contribuyente || '').toUpperCase();

  // Si tiene patente asignada es sujeto de hacienda
  if (item.patente && item.patente !== 'SN' && item.patente !== 'S/N') return true;

  // Clasificaciones comerciales o industriales
  if (cls.includes('COMERCIAL') || cls.includes('INDUSTRIAL') || cls.includes('TIPO D') || cls.includes('TIPO B')) {
    return true;
  }

  // Si su actividad económica es comercial o industrial
  if (act && act !== 'NO APLICA' && !act.includes('CONDOMINIO') && !act.includes('RESIDENCIAL')) {
    return true;
  }

  return false;
}

/**
 * Deduplica una lista de contribuyentes por RIF/Cédula normalizado.
 * Si hay repetidos, conserva el registro más completo (el que tenga patente, o mayor ID).
 */
export function deduplicarContribuyentes<T extends { id?: any; identidad?: string | null; patente?: string | null }>(lista: T[]): T[] {
  const mapa = new Map<string, T>();

  for (const item of lista) {
    const clave = normalizarIdentidad(item.identidad);
    if (!clave) continue;

    if (!mapa.has(clave)) {
      mapa.set(clave, item);
    } else {
      const existente = mapa.get(clave)!;
      // Preferir el que tenga patente válida sobre el que no tenga
      const tienePatente = item.patente && item.patente !== 'SN' && item.patente !== 'S/N';
      const existenteTienePatente = existente.patente && existente.patente !== 'SN' && existente.patente !== 'S/N';

      if (tienePatente && !existenteTienePatente) {
        mapa.set(clave, item);
      } else if (!existenteTienePatente && (item.id || 0) > (existente.id || 0)) {
        mapa.set(clave, item);
      }
    }
  }

  return Array.from(mapa.values());
}

// Plantillas Oficiales de Correo para el ISMA y Alcaldía de Silva

export interface EmailTemplate {
  id: string;
  nombre: string;
  categoria: 'decreto' | 'deuda' | 'solvente' | 'institucional';
  audienciaSugerida: 'NO_SOLVENTES' | 'SOLVENTES' | 'TODOS';
  asuntoDefault: string;
  descripcion: string;
  generarHtml: (params?: { nombre?: string; deudaBs?: number; periodo?: string }) => string;
}

const HEADER_LOGOS_HTML = `
  <tr>
    <td style="padding:10px 0 28px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" align="left" style="vertical-align:middle;">
            <img src="cid:logo_isma" alt="ISMA" width="145" style="display:block;max-width:145px;width:100%;height:auto;" />
          </td>
          <td width="34%" align="center" style="vertical-align:middle;">
            <img src="cid:logo_basura_cero" alt="Basura Cero" width="90" style="display:block;max-width:90px;width:100%;height:auto;margin:0 auto;" />
          </td>
          <td width="33%" align="right" style="vertical-align:middle;">
            <img src="cid:logo_global_green" alt="Global Green" width="160" style="display:block;max-width:160px;width:100%;height:auto;margin-left:auto;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
`;

const FOOTER_HTML = `
  <tr>
    <td style="padding:28px 0 10px 0;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;line-height:1.6;font-family:Arial,Helvetica,sans-serif;text-align:center;">
      <p style="margin:0 0 6px 0;font-weight:bold;color:#334155;">
        INSTITUTO DE SERVICIOS MUNICIPALES DE ASEO URBANO (ISMA) - SILVA
      </p>
      <p style="margin:0 0 8px 0;">
        Alcaldía del Municipio Autónomo Silva • Tucacas, Estado Falcón, Venezuela
      </p>
      <p style="margin:0;font-size:10px;color:#94a3b8;">
        Para soporte o confirmación de transferencias: 
        <a href="mailto:atencion.aseourbanoms@globalgreenca.com" style="color:#059669;text-decoration:none;">atencion.aseourbanoms@globalgreenca.com</a>
        • WhatsApp Oficial: +58 424-4045186
      </p>
    </td>
  </tr>
`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'borra_tu_deuda',
    nombre: 'Plan Especial "Borra tu Deuda" (Decretos Nº 010 y 011)',
    categoria: 'decreto',
    audienciaSugerida: 'NO_SOLVENTES',
    asuntoDefault: 'Mantengamos nuestro municipio limpio, regulariza tu estatus en el ISMA - Decretos Nº 010 y 011',
    descripcion: 'Informa sobre la exoneración del 50% en capital, 100% en multas e intereses moratorios, y convenios de pago en cuotas.',
    generarHtml: (params) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mantengamos nuestro municipio limpio, regulariza tu estatus en el ISMA</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 10px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);padding:24px;text-align:left;">
          ${HEADER_LOGOS_HTML}
          <tr>
            <td style="font-size:14px;color:#1e293b;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">
                Estimado contribuyente ${params?.nombre ? `<strong>${params.nombre}</strong>` : ''},
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;text-align:justify;">
                Por medio de la presente, la <strong>Alcaldía del Municipio Silva</strong> y el <strong>Instituto Autónomo de Aseo Urbano (ISMA)</strong> le extienden un cordial saludo y le notifican que actualmente cuenta con facturación y servicio de aseo urbano pendiente de regularización.
              </p>
              
              <!-- BANNER DE BENEFICIO DECRETO -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:2px solid #a7f3d0;border-radius:12px;margin:20px 0;padding:16px 20px;">
                <tr>
                  <td>
                    <h3 style="margin:0 0 8px 0;color:#065f46;font-size:16px;font-weight:bold;text-align:center;">
                      ⚡ PLAN ESPECIAL "BORRA TU DEUDA" - DECRETOS Nº 010 Y 011
                    </h3>
                    <p style="margin:0 0 10px 0;font-size:13px;color:#047857;text-align:center;">
                      Aproveche de regularizar su situación con incentivos excepcionales aprobados por el ciudadano Alcalde:
                    </p>
                    <ul style="margin:0;padding-left:24px;font-size:13px;color:#065f46;line-height:1.6;">
                      <li><strong>50% de Descuento directo</strong> sobre la deuda acumulada de capital.</li>
                      <li><strong>100% de Condonación total</strong> de intereses de mora, multas y recargos.</li>
                      <li><strong>Convenios de Financiamiento</strong> flexibles fraccionados en cómodas cuotas.</li>
                      <li>Obtención inmediata de su <strong>Constancia de Solvencia</strong> al suscribir el acuerdo.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;text-align:justify;">
                Le invitamos a ingresar al <strong>Portal de Autogestión del Contribuyente</strong> o acercarse a nuestras oficinas de recaudación para formalizar su decreto antes de la fecha límite establecida.
              </p>

              <!-- CUADRO DE DATOS BANCARIOS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;padding:14px 18px;margin:18px 0;font-size:12px;color:#334155;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:13px;">
                      DATOS BANCARIOS OFICIALES PARA TRANSFERENCIA Y PAGO MÓVIL:
                    </p>
                    <p style="margin:0 0 3px 0;"><strong>Banco:</strong> BANCARIBE</p>
                    <p style="margin:0 0 3px 0;"><strong>Cuenta Corriente:</strong> 0114-0158-19-1580047466</p>
                    <p style="margin:0 0 3px 0;"><strong>A Nombre de:</strong> GLOBAL GREEN C.A.</p>
                    <p style="margin:0;"><strong>RIF:</strong> J-503461280 • <strong>Pago Móvil:</strong> 0424-4045186</p>
                  </td>
                </tr>
              </table>

              <!-- BOTON DE ACCION -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="https://globalgreenca.com" style="background:#059669;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;box-shadow:0 3px 6px rgba(5,150,105,0.3);">
                      Ingresar al Portal del Contribuyente →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${FOOTER_HTML}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    id: 'notificacion_deuda',
    nombre: 'Aviso de Cobro y Estado de Cuenta Actualizado',
    categoria: 'deuda',
    audienciaSugerida: 'NO_SOLVENTES',
    asuntoDefault: 'Notificación de Estado de Cuenta y Saldo Pendiente - ISMA Municipio Silva',
    descripcion: 'Notificación formal de facturación pendiente y saldo vencido, recordando canales de pago bancario.',
    generarHtml: (params) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notificación de Estado de Cuenta y Saldo Pendiente</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 10px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);padding:24px;text-align:left;">
          ${HEADER_LOGOS_HTML}
          <tr>
            <td style="font-size:14px;color:#1e293b;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">
                Estimado(a) contribuyente ${params?.nombre ? `<strong>${params.nombre}</strong>` : ''},
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;text-align:justify;">
                Le informamos que el sistema municipal del <strong>ISMA</strong> registra facturas de aseo urbano pendientes de pago en su cuenta. La recaudación del aseo urbano es indispensable para asegurar las rutas de recolección y mantener las playas y calles de nuestro municipio limpias y salubres.
              </p>

              <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 6px 0;font-weight:bold;color:#b45309;font-size:14px;">
                  ⚠️ ESTATUS TRIBUTARIO: SALDO EN REVISIÓN / MORA
                </p>
                <p style="margin:0;font-size:13px;color:#92400e;">
                  Le exhortamos a efectuar su pago y reportar la transferencia a través del Portal Web Oficial o en las oficinas del ISMA en la Alcaldía para evitar recargos administrativos.
                </p>
              </div>

              <!-- DATOS BANCARIOS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;padding:14px 18px;margin:18px 0;font-size:12px;color:#334155;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:13px;">
                      CUENTAS DE RECAUDACIÓN AUTORIZADAS:
                    </p>
                    <p style="margin:0 0 3px 0;"><strong>Banco:</strong> BANCARIBE (Cta. Corriente)</p>
                    <p style="margin:0 0 3px 0;"><strong>Número:</strong> 0114-0158-19-1580047466</p>
                    <p style="margin:0 0 3px 0;"><strong>Titular:</strong> GLOBAL GREEN C.A. • <strong>RIF:</strong> J-503461280</p>
                    <p style="margin:0;"><strong>Pago Móvil:</strong> 0424-4045186 (Bancaribe / J-503461280)</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="https://globalgreenca.com" style="background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;box-shadow:0 3px 6px rgba(37,99,235,0.3);">
                      Ver Facturas y Declarar Pago →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${FOOTER_HTML}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    id: 'reconocimiento_solvente',
    nombre: 'Reconocimiento y Agradecimiento a Contribuyente Solvente',
    categoria: 'solvente',
    audienciaSugerida: 'SOLVENTES',
    asuntoDefault: '¡Gracias por mantener a Silva Limpio! - Reconocimiento a Contribuyente Solvente',
    descripcion: 'Mensaje de felicitación y agradecimiento a contribuyentes que se encuentran 100% solventes y al día.',
    generarHtml: (params) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reconocimiento a Contribuyente Solvente</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 10px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);padding:24px;text-align:left;">
          ${HEADER_LOGOS_HTML}
          <tr>
            <td style="font-size:14px;color:#1e293b;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">
                Apreciado(a) contribuyente ${params?.nombre ? `<strong>${params.nombre}</strong>` : ''},
              </p>
              
              <div style="background:#ecfdf5;border:2px solid #6ee7b7;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
                <span style="font-size:40px;display:block;margin-bottom:8px;">🌟</span>
                <h2 style="margin:0 0 8px 0;color:#065f46;font-size:18px;font-weight:bold;">
                  ¡GRACIAS POR TU COMPROMISO CIUDADANO CON SILVA!
                </h2>
                <p style="margin:0;font-size:14px;color:#047857;font-weight:600;">
                  Constatamos que su cuenta se encuentra actualmente 100% SOLVENTE y al día.
                </p>
              </div>

              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;text-align:justify;">
                Su puntualidad y responsabilidad cívica hacen posible mantener activa la flota de camiones compactadores, la recolección en los condominios y comercios, y la preservación ambiental de Tucacas y el Parque Nacional Morrocoy.
              </p>

              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;text-align:justify;">
                Le recordamos que puede descargar su <strong>Certificado Oficial de Solvencia Municipal</strong> de forma 100% digital y gratuita en nuestro portal, válido para trámites ante la Dirección de Hacienda y Rentas Municipales.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="https://globalgreenca.com" style="background:#059669;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;box-shadow:0 3px 6px rgba(5,150,105,0.3);">
                      Descargar mi Solvencia Municipal →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${FOOTER_HTML}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    id: 'comunicado_general',
    nombre: 'Comunicado Oficial General (ISMA / Alcaldía)',
    categoria: 'institucional',
    audienciaSugerida: 'TODOS',
    asuntoDefault: 'Comunicado Oficial de la Dirección del ISMA y Alcaldía del Municipio Silva',
    descripcion: 'Comunicado general de interés público, cronograma de recolección y operativos especiales.',
    generarHtml: (params) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comunicado Oficial - Alcaldía de Silva e ISMA</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 10px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);padding:24px;text-align:left;">
          ${HEADER_LOGOS_HTML}
          <tr>
            <td style="font-size:14px;color:#1e293b;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
              <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:18px;font-weight:bold;text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:12px;">
                COMUNICADO OFICIAL INSTITUCIONAL
              </h3>
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">
                Estimados contribuyentes y ciudadanos del Municipio Silva:
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;text-align:justify;">
                La Dirección General del <strong>Instituto Autónomo de Aseo Urbano (ISMA)</strong>, conjuntamente con la <strong>Alcaldía del Municipio Silva</strong>, informa a toda la colectividad comercial y residencial las directrices activas para la optimización de los servicios públicos y disposición final de desechos sólidos.
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;text-align:justify;">
                Instamos a toda la comunidad a respetar los horarios de disposición, clasificar los desechos reciclables y mantener el ornato y la limpieza de los frentes de sus inmuebles y establecimientos.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="https://globalgreenca.com" style="background:#0f172a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;">
                      Ir al Portal Institucional →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${FOOTER_HTML}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
];

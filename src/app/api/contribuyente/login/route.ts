import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { identidad, clave } = await request.json();

    if (!identidad || identidad.length < 2) {
      return NextResponse.json({ error: "Identidad requerida" }, { status: 400 });
    }

    // Normalizar: quitar guiones, uppercase -> "V12345678"
    const idNorm = identidad.replace(/-/g, "").toUpperCase().trim();
    // Con guion: "V-12345678"
    const idFormateado = `${idNorm.charAt(0)}-${idNorm.slice(1)}`;

    // Buscar SOLO por las variantes exactas (con y sin guion, mismo prefijo tipo)
    // NO buscar solo numeros para evitar V/J/E/G falsos positivos
    const { data: records, error } = await supabase
      .from("inmuebles")
      .select("contribuyente, cod_cont, clave_portal, identidad")
      .or(`identidad.eq.${idFormateado},identidad.eq.${idNorm}`)
      .limit(1);

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: "Usuario no registrado. Verifique el tipo y numero de cedula ingresado." },
        { status: 404 }
      );
    }

    const user = records[0];

    // Si no tiene clave_portal asignada, requiere setup inicial
    if (!user.clave_portal) {
      return NextResponse.json({
        status: "setup_required",
        nombre: user.contribuyente,
        codigo: user.cod_cont
      });
    }

    // Verificar contrasena
    if (user.clave_portal === clave) {
      return NextResponse.json({
        status: "success",
        nombre: user.contribuyente,
        codigo: user.cod_cont
      });
    } else {
      return NextResponse.json({ error: "Contrasena incorrecta" }, { status: 401 });
    }

  } catch {
    return NextResponse.json({ error: "Error en servidor" }, { status: 500 });
  }
}
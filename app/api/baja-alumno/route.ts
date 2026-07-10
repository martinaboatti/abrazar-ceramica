// API de baja de alumnos (/api/baja-alumno)
// Se ejecuta en el servidor - usa service_role para eliminar cuentas de autenticación
// Complementa la gestión de alumnos de la docente

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Cliente con service_role - necesario para admin.deleteUser
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { alumnoId } = await request.json()

  if (!alumnoId) {
    return NextResponse.json(
      { error: 'ID del alumno es obligatorio.' },
      { status: 400 }
    )
  }

  // Paso 1: eliminar la cuenta de autenticación (tabla interna auth.users)
  // Solo se puede hacer con service_role (admin.deleteUser)
  const { error } = await supabase.auth.admin.deleteUser(alumnoId)

  if (error) {
    return NextResponse.json(
      { error: 'Error al dar de baja al alumno.' },
      { status: 500 }
    )
  }

  // Paso 2: eliminar el perfil de nuestra tabla usuarios
  // Las inscripciones, asistencias y piezas asociadas se borran automáticamente
  // gracias al "on delete cascade" definido en las claves foráneas de la base de datos
  await supabase.from('usuarios').delete().eq('id', alumnoId)

  return NextResponse.json({ ok: true })
}
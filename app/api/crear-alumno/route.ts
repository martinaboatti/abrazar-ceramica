// API de creación de alumnos (/api/crear-alumno)
// Se ejecuta en el servidor - usa service_role para crear cuentas de otros usuarios
// Cumple HU-007: la docente registra nuevos alumnos en el taller

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Cliente con service_role (llave maestra) - necesario para admin.createUser
  // Esta clave nunca llega al navegador, solo existe en el servidor
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { nombre, apellido, email, password, horarioId } = await request.json()

  // Validación de campos obligatorios (HU-007 criterio 4)
  if (!nombre || !apellido || !email || !password) {
    return NextResponse.json(
      { error: 'Todos los campos son obligatorios.' },
      { status: 400 }
    )
  }

  // Paso 1: crear cuenta de autenticación con admin.createUser
  // A diferencia de signUp, esto no afecta la sesión de la docente
  // email_confirm: true marca la cuenta como verificada automáticamente
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  // Si el email ya existe, Supabase devuelve un error con "already" (HU-007 criterio 3)
  if (authError) {
    return NextResponse.json(
      { error: authError.message.includes('already') ? 'Este email ya está registrado.' : 'Error al crear la cuenta.' },
      { status: 400 }
    )
  }

  // Paso 2: crear perfil en nuestra tabla usuarios con el mismo ID
  // El rol siempre es "alumno" - la docente se crea directamente en Supabase
  const { error: insertError } = await supabase
    .from('usuarios')
    .insert({
      id: authData.user.id,
      email,
      nombre,
      apellido,
      rol: 'alumno',
    })

  if (insertError) {
    return NextResponse.json(
      { error: 'Error al guardar los datos del alumno.' },
      { status: 500 }
    )
  }

  // Paso 3 (opcional): si la docente seleccionó un horario, crea la inscripción
  // El horario es opcional porque puede asignarse después desde "Editar horario"
  if (horarioId) {
    await supabase
      .from('inscripciones')
      .insert({
        usuario_id: authData.user.id,
        horario_id: horarioId,
      })
  }

  return NextResponse.json({ ok: true })
}
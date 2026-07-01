import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { nombre, apellido, email, password, horarioId } = await request.json()

  if (!nombre || !apellido || !email || !password) {
    return NextResponse.json(
      { error: 'Todos los campos son obligatorios.' },
      { status: 400 }
    )
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json(
      { error: authError.message.includes('already') ? 'Este email ya está registrado.' : 'Error al crear la cuenta.' },
      { status: 400 }
    )
  }

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
    console.log('Error insert:', insertError)
    return NextResponse.json(
      { error: 'Error al guardar los datos del alumno: ' + insertError.message },
      { status: 500 }
    )
  }

  if (horarioId) {
    const { error: inscError } = await supabase
      .from('inscripciones')
      .insert({
        usuario_id: authData.user.id,
        horario_id: horarioId,
      })

    if (inscError) {
      console.log('Error inscripción:', inscError)
    }
  }

  return NextResponse.json({ ok: true })
}
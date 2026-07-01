import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

  const { error } = await supabase.auth.admin.deleteUser(alumnoId)

  if (error) {
    return NextResponse.json(
      { error: 'Error al dar de baja al alumno.' },
      { status: 500 }
    )
  }

  await supabase.from('usuarios').delete().eq('id', alumnoId)

  return NextResponse.json({ ok: true })
}
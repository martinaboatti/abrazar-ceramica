import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { alumnoId, piezaNombre, estadoNombre } = await request.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: alumno } = await supabase
    .from('usuarios')
    .select('nombre, telegram_chat_id')
    .eq('id', alumnoId)
    .single()

  if (!alumno?.telegram_chat_id) {
    return NextResponse.json({ ok: true, notificado: false })
  }

  const mensaje = `🏺 *Actualización de pieza*\n\nTu pieza *${piezaNombre}* avanzó a la etapa: *${estadoNombre}*`

  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: alumno.telegram_chat_id,
        text: mensaje,
        parse_mode: 'Markdown',
      }),
    })
    return NextResponse.json({ ok: true, notificado: true })
  } catch (error) {
    console.log('Error enviando notificación:', error)
    return NextResponse.json({ ok: true, notificado: false })
  }
}
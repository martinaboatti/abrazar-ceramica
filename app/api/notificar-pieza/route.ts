// API de notificación por Telegram (/api/notificar-pieza)
// Cumple HU-020: envía notificación automática al alumno cuando cambia el estado de una pieza
// Se llama desde vista-docente.tsx sin await (en segundo plano) para no bloquear la interfaz

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Recibe los datos de la pieza que avanzó de estado
  const { alumnoId, piezaNombre, estadoNombre, esFinal } = await request.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Busca al alumno y su chatId de Telegram
  const { data: alumno } = await supabase
    .from('usuarios')
    .select('nombre, telegram_chat_id')
    .eq('id', alumnoId)
    .single()

  // Si el alumno no tiene Telegram vinculado, no intenta enviar (HU-020 criterio 2)
  if (!alumno?.telegram_chat_id) {
    return NextResponse.json({ ok: true, notificado: false })
  }

  // Arma el mensaje según si la pieza finalizó o avanzó a una etapa intermedia
  let mensaje: string

  if (esFinal) {
    mensaje = `🏺 *¡Tu pieza está lista!*\n\nTu pieza *${piezaNombre}* completó todas las etapas del proceso. ¡Ya podés coordinar para retirarla por el taller!`
  } else {
    mensaje = `🏺 *Actualización de pieza*\n\nTu pieza *${piezaNombre}* avanzó a la etapa: *${estadoNombre}*`
  }

  // Envía el mensaje a través de la API de Telegram Bot
  // parse_mode: 'Markdown' permite usar *negrita* en el mensaje
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
    // Si el envío falla, lo registra en el log pero no interrumpe el flujo (HU-020 criterio 3)
    console.log('Error enviando notificación:', error)
    return NextResponse.json({ ok: true, notificado: false })
  }
}
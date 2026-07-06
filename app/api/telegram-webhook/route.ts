import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const message = body?.message

  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ ok: true })
  }

  const texto = message.text.trim()
  const chatId = String(message.chat.id)

  // El alumno manda /vincular su@email.com
  if (texto.startsWith('/vincular')) {
    const partes = texto.split(' ')
    if (partes.length < 2) {
      await enviarMensaje(chatId, '❌ Usá el formato: /vincular tu@email.com')
      return NextResponse.json({ ok: true })
    }

    const email = partes[1].toLowerCase()

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('email', email)
      .single()

    if (!usuario) {
      await enviarMensaje(chatId, '❌ No se encontró una cuenta con ese email.')
      return NextResponse.json({ ok: true })
    }

    await supabase
      .from('usuarios')
      .update({ telegram_chat_id: chatId })
      .eq('id', usuario.id)

    await enviarMensaje(chatId, `✅ ¡Hola ${usuario.nombre}! Tu cuenta fue vinculada correctamente. Vas a recibir notificaciones cuando el estado de tus piezas cambie.`)

    return NextResponse.json({ ok: true })
  }

  if (texto === '/desvincular') {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('telegram_chat_id', chatId)
      .single()

    if (!usuario) {
      await enviarMensaje(chatId, '❌ No hay ninguna cuenta vinculada a este chat.')
      return NextResponse.json({ ok: true })
    }

    await supabase
      .from('usuarios')
      .update({ telegram_chat_id: null })
      .eq('id', usuario.id)

    await enviarMensaje(chatId, '✅ Tu cuenta fue desvinculada. Ya no recibirás notificaciones.')
    return NextResponse.json({ ok: true })
  }

  if (texto === '/start') {
    await enviarMensaje(chatId, '🏺 ¡Bienvenido al bot de Abrazar Cerámica!\n\nPara vincular tu cuenta escribí:\n/vincular tu@email.com\n\nPara desvincular:\n/desvincular')
    return NextResponse.json({ ok: true })
  }

  await enviarMensaje(chatId, '🏺 Bot de Abrazar Cerámica\n\nComandos disponibles:\n/vincular tu@email.com\n/desvincular')
  return NextResponse.json({ ok: true })
}

async function enviarMensaje(chatId: string, texto: string) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    })
  } catch (error) {
    console.log('Error enviando mensaje de Telegram:', error)
  }
}
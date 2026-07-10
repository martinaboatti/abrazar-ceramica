// Webhook de Telegram (/api/telegram-webhook)
// Recibe los mensajes que los usuarios envían al bot de Telegram
// Cumple HU-006: permite vincular y desvincular la cuenta con Telegram
// Telegram reenvía cada mensaje del bot a esta URL (configurada con setWebhook)

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Telegram envía el mensaje en formato JSON con la estructura { message: { text, chat: { id } } }
  const body = await request.json()
  const message = body?.message

  // Si el mensaje no tiene texto o chat id, lo ignora (puede ser un evento no relevante)
  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ ok: true })
  }

  const texto = message.text.trim()
  const chatId = String(message.chat.id) // Identificador único del chat en Telegram

  // Comando /vincular: asocia el chatId de Telegram con un usuario del sistema
  if (texto.startsWith('/vincular')) {
    const partes = texto.split(' ')
    if (partes.length < 2) {
      await enviarMensaje(chatId, '❌ Usá el formato: /vincular tu@email.com')
      return NextResponse.json({ ok: true })
    }

    const email = partes[1].toLowerCase()

    // Busca al usuario en nuestra tabla por email
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('email', email)
      .single()

    if (!usuario) {
      await enviarMensaje(chatId, '❌ No se encontró una cuenta con ese email.')
      return NextResponse.json({ ok: true })
    }

    // Guarda el chatId en la tabla usuarios - a partir de ahora recibe notificaciones
    // HU-006 criterio 2: registra el identificador de chat y activa las notificaciones
    await supabase
      .from('usuarios')
      .update({ telegram_chat_id: chatId })
      .eq('id', usuario.id)

    await enviarMensaje(chatId, `✅ ¡Hola ${usuario.nombre}! Tu cuenta fue vinculada correctamente. Vas a recibir notificaciones cuando el estado de tus piezas cambie.`)

    return NextResponse.json({ ok: true })
  }

  // Comando /desvincular: elimina el chatId y desactiva las notificaciones
  // HU-006 criterio 4: el usuario puede desconectar su cuenta
  if (texto === '/desvincular') {
    // Busca al usuario por su chatId (no por email, porque ya está vinculado)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('telegram_chat_id', chatId)
      .single()

    if (!usuario) {
      await enviarMensaje(chatId, '❌ No hay ninguna cuenta vinculada a este chat.')
      return NextResponse.json({ ok: true })
    }

    // Pone telegram_chat_id en null - deja de recibir notificaciones
    await supabase
      .from('usuarios')
      .update({ telegram_chat_id: null })
      .eq('id', usuario.id)

    await enviarMensaje(chatId, '✅ Tu cuenta fue desvinculada. Ya no recibirás notificaciones.')
    return NextResponse.json({ ok: true })
  }

  // Comando /start: mensaje de bienvenida con instrucciones
  if (texto === '/start') {
    await enviarMensaje(chatId, '🏺 ¡Bienvenido al bot de Abrazar Cerámica!\n\nPara vincular tu cuenta escribí:\n/vincular tu@email.com\n\nPara desvincular:\n/desvincular')
    return NextResponse.json({ ok: true })
  }

  // Cualquier otro mensaje: muestra los comandos disponibles
  await enviarMensaje(chatId, '🏺 Bot de Abrazar Cerámica\n\nComandos disponibles:\n/vincular tu@email.com\n/desvincular')
  return NextResponse.json({ ok: true })
}

// Función auxiliar para enviar mensajes a través de la API de Telegram
// Usa el token del bot guardado en las variables de entorno
async function enviarMensaje(chatId: string, texto: string) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    })
  } catch (error) {
    // Si falla el envío, lo registra pero no interrumpe el flujo
    console.log('Error enviando mensaje de Telegram:', error)
  }
}
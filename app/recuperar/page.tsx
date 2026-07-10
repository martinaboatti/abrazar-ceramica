// Página de recuperación de contraseña (/recuperar)
// Cumple HU-003: permite a usuarios registrados recuperar el acceso a su cuenta
// Envía un enlace de restablecimiento al email del usuario

'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false) // Controla si ya se envió el email
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleRecuperar() {
    setError('')
    setLoading(true)

    if (!email) {
      setError('Ingresá tu email.')
      setLoading(false)
      return
    }

    // Solicita a Supabase que envíe un email con enlace de recuperación
    // redirectTo indica a qué página llega el usuario al hacer clic en el enlace
    // window.location.origin se adapta automáticamente al entorno (localhost o producción)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/nueva-password',
    })

    if (error) {
      setError('No se pudo enviar el enlace. Verificá el email.')
      setLoading(false)
      return
    }

    // Email enviado exitosamente → cambia la vista al mensaje de confirmación
    setEnviado(true)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Abrazar Cerámica</h1>
          <p className="text-gray-400 text-sm mt-1">Recuperá tu contraseña</p>
        </div>
        {/* Renderizado condicional: muestra el formulario o el mensaje de éxito */}
        {enviado ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Te enviamos un enlace de recuperación a <strong>{email}</strong>. Revisá tu bandeja de entrada.</p>
            <a href="/login" className="text-sm text-naranja-500 hover:underline">Volver al inicio de sesión</a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Email</label>
              <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={handleRecuperar} disabled={loading} className="w-full bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
            <a href="/login" className="text-center text-sm text-naranja-500 hover:underline">Volver al inicio de sesión</a>
          </div>
        )}
      </div>
    </main>
  )
}
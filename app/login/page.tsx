// Página de inicio de sesión (/login)
// Cumple HU-002: permite a usuarios registrados acceder al sistema según su rol

'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  // Estados del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')       // Mensaje de error visible al usuario
  const [loading, setLoading] = useState(false) // Controla el estado del botón mientras procesa
  const router = useRouter()
  const supabase = createClient()

  // Función que se ejecuta al hacer clic en "Ingresar" o presionar Enter
  async function handleLogin() {
    setError('')
    setLoading(true)

    // Envía las credenciales a Supabase para verificación
    // Supabase compara contra su tabla interna de autenticación (contraseñas hasheadas con bcrypt)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Si las credenciales son incorrectas, muestra error genérico (no especifica cuál dato falló, por seguridad)
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    // Credenciales correctas → redirige al dashboard (el layout del dashboard determina qué menú mostrar según el rol)
    router.push('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            Abrazar Cerámica
          </h1>
          <p className="text-gray-400 text-sm mt-1">¡Hola de vuelta!</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Contraseña</label>
            <input
              type="password"
              placeholder="Ingresá tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300"
            />
          </div>
          {/* Mensaje de error condicional */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          {/* Botón con estado de carga - se desactiva mientras procesa */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          {/* Link a recuperación de contraseña (HU-003) */}
          <a
            href="/recuperar"
            className="text-center text-sm text-naranja-500 hover:underline"
          >
            ¿Olvidaste tu contraseña o es tu primera vez acá?
          </a>
        </div>
      </div>
    </main>
  )
}
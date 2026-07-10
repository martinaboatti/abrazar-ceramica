// Página de registro (/registro)
// Cumple HU-001: permite a usuarios nuevos crear una cuenta en la plataforma
// Nota: según HU-007, la docente es quien registra alumnos desde el dashboard.
// Esta página queda como registro público alternativo con rol "alumno" por defecto.

'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function RegistroPage() {
  // Estados del formulario - uno por cada campo
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegistro() {
    setError('')
    setLoading(true)

    // Validación de campos obligatorios (criterio de aceptación 3 de HU-001)
    if (!nombre || !apellido || !email || !password) {
      setError('Todos los campos son obligatorios.')
      setLoading(false)
      return
    }

    // Validación de longitud mínima de contraseña (criterio de aceptación 2 de HU-001)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    // Paso 1: crear cuenta de autenticación en Supabase (tabla interna auth.users)
    // Supabase encripta la contraseña con bcrypt automáticamente
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      // Si el email ya existe, muestra mensaje específico (criterio de aceptación 1 de HU-001)
      setError(signUpError.message.includes('already') ? 'Este email ya está registrado.' : 'No se pudo crear la cuenta. Verificá los datos.')
      setLoading(false)
      return
    }

    // Paso 2: crear perfil en nuestra tabla "usuarios" con el mismo ID
    // El rol se asigna siempre como "alumno" por seguridad
    if (data.user) {
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id: data.user.id,  // Mismo ID que generó Supabase en auth.users
          email,
          nombre,
          apellido,
          rol: 'alumno',     // Siempre alumno - la docente se crea desde Supabase directamente
        })

      if (insertError) {
        setError('Error al guardar los datos del perfil.')
        setLoading(false)
        return
      }
    }

    // Registro exitoso → redirige al login para que inicie sesión
    router.push('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Abrazar Cerámica</h1>
          <p className="text-gray-400 text-sm mt-1">Creá tu cuenta</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nombre</label>
            <input type="text" placeholder="Ingresá tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Apellido</label>
            <input type="text" placeholder="Ingresá tu apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Email</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Contraseña</label>
            {/* onKeyDown permite enviar el formulario con Enter desde el último campo */}
            <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRegistro()} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleRegistro} disabled={loading} className="w-full bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <a href="/login" className="text-center text-sm text-naranja-500 hover:underline">¿Ya tenés cuenta? Iniciá sesión</a>
        </div>
      </div>
    </main>
  )
}
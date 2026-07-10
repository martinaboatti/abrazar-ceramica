// Página raíz (/) - Redirige automáticamente según el estado de autenticación
// Si el usuario está logueado lo manda al dashboard, si no al login

'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  // useEffect se ejecuta una sola vez al cargar la página
  useEffect(() => {
    async function verificar() {
      // Consulta a Supabase si hay una sesión activa
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')  // Logueado → dashboard
      } else {
        router.push('/login')      // No logueado → login
      }
    }
    verificar()
  }, [])

  // Pantalla temporal mientras se verifica la sesión
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </main>
  )
}
// Página principal del dashboard (/dashboard)
// Muestra el saludo de bienvenida personalizado con el nombre del usuario
// El subtítulo cambia según el rol (docente ve "Panel de gestión", alumno ve "Tus piezas activas")

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function cargarUsuario() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Trae solo nombre y rol, que es lo que necesitamos para el saludo
      const { data } = await supabase
        .from('usuarios')
        .select('nombre, rol')
        .eq('id', user.id)
        .single()

      if (data) setUsuario(data)
    }
    cargarUsuario()
  }, [])

  // No muestra nada mientras carga (el layout ya muestra la estructura del menú)
  if (!usuario) return null

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800">
        Bienvenida de vuelta, {usuario.nombre}
      </h1>
      {/* Subtítulo diferenciado por rol */}
      <p className="text-gray-400 text-sm mt-1">
        {usuario.rol === 'docente'
          ? 'Panel de gestión del taller'
          : 'Estas son tus piezas activas'}
      </p>
    </div>
  )
}
// Página de piezas (/dashboard/piezas)
// Selector de vista por rol: muestra la vista de docente o de alumno
// La lógica y la interfaz de cada rol están separadas en archivos independientes
// para mantener el código organizado y facilitar el mantenimiento

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import VistaDocente from './vista-docente'  // Gestión completa: crear, avanzar, editar, eliminar piezas y flujos
import VistaAlumno from './vista-alumno'    // Consulta: tarjetas de piezas con progreso y detalle con historial

export default function PiezasPage() {
  const [rol, setRol] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function cargarRol() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Solo necesitamos el rol para decidir qué vista mostrar
      const { data } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (data) setRol(data.rol)
    }
    cargarRol()
  }, [])

  // Mientras carga el rol, muestra texto de carga (el layout ya muestra el menú)
  if (!rol) return <p className="text-gray-500">Cargando...</p>

  // Renderiza el componente correspondiente al rol del usuario
  return rol === 'docente' ? <VistaDocente /> : <VistaAlumno />
}
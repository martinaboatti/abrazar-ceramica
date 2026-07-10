// Página de horarios (/dashboard/horarios)
// Selector de vista por rol: muestra la vista de docente o de alumno
// Docente: gestión de horarios, cupos y registro de asistencia
// Alumno: próximas clases, cancelación y reserva de recuperación

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import VistaDocenteHorarios from './vista-docente'  // Horarios con panel de asistencia
import VistaAlumnoHorarios from './vista-alumno'    // Clases del mes con cancelación y recuperación

export default function HorariosPage() {
  const [rol, setRol] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function cargarRol() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (data) setRol(data.rol)
    }
    cargarRol()
  }, [])

  if (!rol) return <p className="text-gray-500">Cargando...</p>

  return rol === 'docente' ? <VistaDocenteHorarios /> : <VistaAlumnoHorarios />
}
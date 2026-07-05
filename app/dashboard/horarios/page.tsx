'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import VistaDocenteHorarios from './vista-docente'
import VistaAlumnoHorarios from './vista-alumno'

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
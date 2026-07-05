'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import VistaDocente from './vista-docente'
import VistaAlumno from './vista-alumno'

export default function PiezasPage() {
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

  return rol === 'docente' ? <VistaDocente /> : <VistaAlumno />
}
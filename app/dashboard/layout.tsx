'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function cargarUsuario() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('usuarios')
        .select('nombre, apellido, rol')
        .eq('id', user.id)
        .single()

      if (!data) { router.push('/login'); return }
      setUsuario(data)
      setCargando(false)
    }
    cargarUsuario()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </main>
    )
  }

  const menuDocente = [
    { nombre: 'Gestión de piezas', ruta: '/dashboard/piezas', icono: '🎨' },
    { nombre: 'Gestión de alumnos', ruta: '/dashboard/alumnos', icono: '👥' },
    { nombre: 'Horarios y asistencia', ruta: '/dashboard/horarios', icono: '📅' },
    { nombre: 'Avisos', ruta: '/dashboard/avisos', icono: '📢' },
    { nombre: 'Base de conocimiento', ruta: '/dashboard/conocimiento', icono: '📚' },
  ]

  const menuAlumno = [
    { nombre: 'Mis piezas', ruta: '/dashboard/piezas', icono: '🎨' },
    { nombre: 'Mi horario', ruta: '/dashboard/horarios', icono: '📅' },
    { nombre: 'Avisos', ruta: '/dashboard/avisos', icono: '📢' },
    { nombre: 'Base de conocimiento', ruta: '/dashboard/conocimiento', icono: '📚' },
  ]

  const menu = usuario.rol === 'docente' ? menuDocente : menuAlumno

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-orange-600">Abrazar</h1>
          <h1 className="text-xl font-semibold text-orange-600">Cerámica</h1>
        </div>
        <nav className="flex-1 px-4">
          {menu.map((item) => (
            <button key={item.ruta} onClick={() => router.push(item.ruta)} className={`w-full text-left px-4 py-3 rounded-lg text-sm mb-1 flex items-center gap-3 transition-colors ${pathname === item.ruta ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>{item.icono}</span>
              {item.nombre}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-3 transition-colors">
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
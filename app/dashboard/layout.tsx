// Layout del dashboard - envuelve todas las páginas dentro de /dashboard/
// Implementa el menú lateral diferenciado por rol (docente vs alumno)
// Responsive: en mobile se convierte en menú desplegable

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { Palette, Users, CalendarDays, Megaphone, BookOpen, LogOut, UserCircle, Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [menuMobileAbierto, setMenuMobileAbierto] = useState(false)
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

  // Cierra el menú mobile cuando se navega a otra página
  useEffect(() => {
    setMenuMobileAbierto(false)
  }, [pathname])

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
    { nombre: 'Gestión de piezas', ruta: '/dashboard/piezas', icono: Palette },
    { nombre: 'Gestión de alumnos', ruta: '/dashboard/alumnos', icono: Users },
    { nombre: 'Horarios y asistencia', ruta: '/dashboard/horarios', icono: CalendarDays },
    { nombre: 'Avisos', ruta: '/dashboard/avisos', icono: Megaphone },
    { nombre: 'Base de conocimiento', ruta: '/dashboard/conocimiento', icono: BookOpen },
    { nombre: 'Mi perfil', ruta: '/dashboard/perfil', icono: UserCircle },
  ]

  const menuAlumno = [
    { nombre: 'Mis piezas', ruta: '/dashboard/piezas', icono: Palette },
    { nombre: 'Mi horario', ruta: '/dashboard/horarios', icono: CalendarDays },
    { nombre: 'Avisos', ruta: '/dashboard/avisos', icono: Megaphone },
    { nombre: 'Base de conocimiento', ruta: '/dashboard/conocimiento', icono: BookOpen },
    { nombre: 'Mi perfil', ruta: '/dashboard/perfil', icono: UserCircle },
  ]

  const menu = usuario.rol === 'docente' ? menuDocente : menuAlumno

  // Contenido del menú reutilizado en desktop y mobile
  const menuContent = (
    <>
      <nav className="flex-1 px-4">
        {menu.map((item) => (
          <button key={item.ruta} onClick={() => router.push(item.ruta)} className={`w-full text-left px-4 py-3 rounded-lg text-sm mb-1 flex items-center gap-3 transition-colors ${pathname === item.ruta ? 'bg-naranja-50 text-naranja-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
            <item.icono size={18} />
            {item.nombre}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-3 transition-colors">
          <LogOut size={18} /> Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar desktop: visible solo en pantallas grandes */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-naranja-600">Abrazar</h1>
          <h1 className="text-xl font-semibold text-naranja-600">Cerámica</h1>
        </div>
        {menuContent}
      </aside>

      {/* Header mobile: visible solo en pantallas chicas */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-naranja-600">Abrazar Cerámica</h1>
        <button onClick={() => setMenuMobileAbierto(!menuMobileAbierto)} className="p-2 rounded-lg hover:bg-gray-50">
          {menuMobileAbierto ? <X size={24} className="text-gray-600" /> : <Menu size={24} className="text-gray-600" />}
        </button>
      </div>

      {/* Menu mobile desplegable */}
      {menuMobileAbierto && (
        <div className="md:hidden fixed inset-0 top-14 bg-white z-30 flex flex-col">
          <div className="pt-2">
            {menuContent}
          </div>
        </div>
      )}

      {/* Área de contenido principal */}
      <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        {children}
      </main>
    </div>
  )
}
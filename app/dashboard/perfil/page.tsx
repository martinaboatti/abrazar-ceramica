// Página de perfil (/dashboard/perfil)
// Cumple HU-004 (visualización de perfil) y HU-005 (edición de datos personales)
// Incluye instrucciones para vincular/desvincular Telegram solo para alumnos (HU-006)

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { User } from 'lucide-react'

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  const nombreBot = 'abrazarceramica_bot'

  async function cargarPerfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setUsuario(data)
      setNombre(data.nombre)
      setApellido(data.apellido)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarPerfil()
  }, [])

  async function handleGuardar() {
    setError('')
    setExito('')
    setGuardando(true)

    if (!nombre || !apellido) {
      setError('El nombre y apellido son obligatorios.')
      setGuardando(false)
      return
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ nombre, apellido })
      .eq('id', usuario.id)

    if (updateError) {
      setError('Error al actualizar el perfil.')
      setGuardando(false)
      return
    }

    setExito('Perfil actualizado correctamente.')
    setEditando(false)
    setGuardando(false)
    cargarPerfil()
  }

  async function handleDesvincularTelegram() {
    if (!confirm('¿Estás seguro de que querés desvincular tu cuenta de Telegram?')) return

    await supabase
      .from('usuarios')
      .update({ telegram_chat_id: null })
      .eq('id', usuario.id)

    cargarPerfil()
  }

  if (cargando) return <p className="text-gray-500">Cargando perfil...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Mi perfil</h1>
        <p className="text-gray-400 text-sm mt-1">Visualizá y editá tus datos personales</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-naranja-50 flex items-center justify-center">
            <span className="text-naranja-600 text-xl font-semibold">{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{usuario?.nombre} {usuario?.apellido}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${usuario?.rol === 'docente' ? 'bg-naranja-50 text-naranja-700' : 'bg-blue-50 text-blue-700'}`}>{usuario?.rol === 'docente' ? 'Docente' : 'Alumno'}</span>
          </div>
        </div>

        {editando ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Nombre</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Apellido</label>
              <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Email</label>
              <input type="email" value={usuario?.email} disabled className="w-full border border-gray-200 text-gray-400 rounded-lg px-4 py-2.5 text-sm bg-gray-50" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={() => { setEditando(false); setNombre(usuario.nombre); setApellido(usuario.apellido); setError('') }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-gray-400">Nombre</p>
              <p className="text-sm text-gray-800">{usuario?.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Apellido</p>
              <p className="text-sm text-gray-800">{usuario?.apellido}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm text-gray-800">{usuario?.email}</p>
            </div>
            {/* Sección Telegram: solo visible para alumnos */}
            {usuario?.rol === 'alumno' && (
              <div>
                <p className="text-xs text-gray-400">Telegram</p>
                {usuario?.telegram_chat_id ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-green-600">Vinculado ✓</p>
                    <button onClick={handleDesvincularTelegram} className="text-xs text-red-400 hover:text-red-600">Desvincular</button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <p className="text-sm text-gray-500 mb-2">No vinculado</p>
                    <div className="bg-naranja-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-800 mb-2">¿Cómo vincular?</p>
                      <ol className="text-xs text-gray-600 flex flex-col gap-1">
                        <li>1. Abrí Telegram y buscá el bot <strong>@{nombreBot}</strong></li>
                        <li>2. Escribile <strong>/start</strong></li>
                        <li>3. Después escribí <strong>/vincular {usuario?.email}</strong></li>
                      </ol>
                      <p className="text-xs text-gray-400 mt-2">Una vez vinculado, vas a recibir notificaciones cuando el estado de tus piezas cambie.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {exito && <p className="text-green-600 text-sm">{exito}</p>}
            <button onClick={() => { setEditando(true); setExito('') }} className="self-start bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">Editar perfil</button>
          </div>
        )}
      </div>
    </div>
  )
}
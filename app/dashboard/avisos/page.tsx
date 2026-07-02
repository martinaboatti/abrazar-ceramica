'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { Bell } from 'lucide-react'

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<any[]>([])
  const [usuario, setUsuario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  async function cargarDatos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('id', user.id)
      .single()

    if (usuarioData) setUsuario(usuarioData)

    const { data: avisosData } = await supabase
      .from('avisos')
      .select('*, usuarios(nombre, apellido)')
      .order('created_at', { ascending: false })

    if (avisosData) setAvisos(avisosData)
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  async function handleGuardar() {
    setError('')
    setGuardando(true)

    if (!titulo || !contenido) {
      setError('El título y el contenido son obligatorios.')
      setGuardando(false)
      return
    }

    if (editando) {
      const { error: updateError } = await supabase
        .from('avisos')
        .update({ titulo, contenido })
        .eq('id', editando.id)

      if (updateError) {
        setError('Error al actualizar el aviso.')
        setGuardando(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('avisos')
        .insert({
          titulo,
          contenido,
          usuario_id: usuario.id,
        })

      if (insertError) {
        setError('Error al publicar el aviso.')
        setGuardando(false)
        return
      }
    }

    setTitulo('')
    setContenido('')
    setEditando(null)
    setMostrarFormulario(false)
    setGuardando(false)
    cargarDatos()
  }

  async function handleEliminar(avisoId: string) {
    if (!confirm('¿Estás segura de que querés eliminar este aviso?')) return
    await supabase.from('avisos').delete().eq('id', avisoId)
    cargarDatos()
  }

  function handleEditar(aviso: any) {
    setTitulo(aviso.titulo)
    setContenido(aviso.contenido)
    setEditando(aviso)
    setMostrarFormulario(true)
  }

  if (cargando) {
    return <p className="text-gray-500">Cargando avisos...</p>
  }

  const esDocente = usuario?.rol === 'docente'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Avisos del taller</h1>
          <p className="text-gray-400 text-sm mt-1">{avisos.length > 0 ? `Tenés ${avisos.length} avisos publicados` : 'Aún no hay avisos'}</p>
        </div>
        {esDocente && (
          <button onClick={() => { setMostrarFormulario(true); setEditando(null); setTitulo(''); setContenido('') }} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Nuevo aviso</button>
        )}
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{editando ? 'Editar aviso' : 'Nuevo aviso'}</h2>
              <button onClick={() => { setMostrarFormulario(false); setError(''); setEditando(null) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Título</label>
                <input type="text" placeholder="Ej: Horario especial por feriado" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Contenido</label>
                <textarea placeholder="Escribí el contenido del aviso..." value={contenido} onChange={(e) => setContenido(e.target.value)} rows={4} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button onClick={() => { setMostrarFormulario(false); setError(''); setEditando(null) }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleGuardar} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar aviso'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {avisos.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no hay avisos publicados.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {avisos.map((aviso) => (
            <div key={aviso.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full bg-naranja-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={16} className="text-naranja-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{aviso.titulo}</h3>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{aviso.contenido}</p>
                    <p className="text-xs text-gray-400 mt-3">Publicado el {new Date(aviso.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {esDocente && (
                  <div className="flex gap-2">
                    <button onClick={() => handleEditar(aviso)} className="text-xs text-gray-400 hover:text-gray-600">Editar</button>
                    <button onClick={() => handleEliminar(aviso.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
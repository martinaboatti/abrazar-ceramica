'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { Search, ChevronDown, ChevronUp, Plus } from 'lucide-react'

export default function ConocimientoPage() {
  const [entradas, setEntradas] = useState<any[]>([])
  const [usuario, setUsuario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('Esmaltes')
  const [descripcion, setDescripcion] = useState('')
  const [materiales, setMateriales] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  const categorias = ['Esmaltes', 'Horneado', 'Técnicas', 'Materiales']

  async function cargarDatos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('id', user.id)
      .single()

    if (usuarioData) setUsuario(usuarioData)

    const { data: entradasData } = await supabase
      .from('entradas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false })

    if (entradasData) setEntradas(entradasData)
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  async function handleGuardar() {
    setError('')
    setGuardando(true)

    if (!titulo || !descripcion) {
      setError('El título y la descripción son obligatorios.')
      setGuardando(false)
      return
    }

    if (editando) {
      const { error: updateError } = await supabase
        .from('entradas_tecnicas')
        .update({ titulo, categoria, descripcion, materiales })
        .eq('id', editando.id)

      if (updateError) {
        setError('Error al actualizar la entrada.')
        setGuardando(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('entradas_tecnicas')
        .insert({
          titulo,
          categoria,
          descripcion,
          materiales,
          usuario_id: usuario.id,
        })

      if (insertError) {
        setError('Error al crear la entrada.')
        setGuardando(false)
        return
      }
    }

    setTitulo('')
    setCategoria('Esmaltes')
    setDescripcion('')
    setMateriales('')
    setEditando(null)
    setMostrarFormulario(false)
    setGuardando(false)
    cargarDatos()
  }

  async function handleEliminar(entradaId: string) {
    if (!confirm('¿Estás segura de que querés eliminar esta entrada?')) return
    await supabase.from('entradas_tecnicas').delete().eq('id', entradaId)
    cargarDatos()
  }

  function handleEditar(entrada: any) {
    setTitulo(entrada.titulo)
    setCategoria(entrada.categoria)
    setDescripcion(entrada.descripcion)
    setMateriales(entrada.materiales || '')
    setEditando(entrada)
    setMostrarFormulario(true)
  }

  const entradasFiltradas = entradas.filter(e => {
    if (filtroCategoria !== 'Todas' && e.categoria !== filtroCategoria) return false
    if (busqueda && !e.titulo.toLowerCase().includes(busqueda.toLowerCase()) && !e.descripcion.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  if (cargando) {
    return <p className="text-gray-500">Cargando base de conocimiento...</p>
  }

  const esDocente = usuario?.rol === 'docente'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Base de conocimiento</h1>
          <p className="text-gray-400 text-sm mt-1">Fórmulas y protocolos del taller</p>
        </div>
        {esDocente && (
          <button onClick={() => { setMostrarFormulario(true); setEditando(null); setTitulo(''); setCategoria('Esmaltes'); setDescripcion(''); setMateriales('') }} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1"><Plus size={16} /> Nueva entrada</button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscá por palabra clave..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
        </div>
        <div className="flex gap-2">
          {['Todas', ...categorias].map((cat) => (
            <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`px-3 py-1.5 text-sm rounded-full transition-colors ${filtroCategoria === cat ? 'bg-naranja-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{editando ? 'Editar entrada' : 'Nueva entrada técnica'}</h2>
              <button onClick={() => { setMostrarFormulario(false); setError(''); setEditando(null) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Título</label>
                <input type="text" placeholder="Ej: Esmalte cerúleo mate" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Categoría</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Descripción</label>
                <textarea placeholder="Describí el procedimiento o fórmula..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300 resize-none" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Materiales (opcional)</label>
                <textarea placeholder="Listá los materiales necesarios..." value={materiales} onChange={(e) => setMateriales(e.target.value)} rows={2} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button onClick={() => { setMostrarFormulario(false); setError(''); setEditando(null) }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleGuardar} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar entrada'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {entradasFiltradas.length === 0 ? (
        <p className="text-gray-400 text-sm mt-4">No hay entradas que coincidan con tu búsqueda.</p>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {entradasFiltradas.map((entrada) => (
            <div key={entrada.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandido(expandido === entrada.id ? null : entrada.id)} className="w-full flex justify-between items-center p-5 text-left">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{entrada.titulo}</span>
                  <span className="text-xs bg-naranja-50 text-naranja-700 px-2 py-0.5 rounded-full">{entrada.categoria}</span>
                </div>
                <div className="flex items-center gap-3">
                  {esDocente && (
                    <div className="flex gap-2">
                      <span onClick={(e) => { e.stopPropagation(); handleEditar(entrada) }} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Editar</span>
                      <span onClick={(e) => { e.stopPropagation(); handleEliminar(entrada.id) }} className="text-xs text-red-400 hover:text-red-600 cursor-pointer">Eliminar</span>
                    </div>
                  )}
                  {expandido === entrada.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>
              {expandido === entrada.id && (
                <div className="px-5 pb-5 border-t border-gray-50 pt-3">
                  <p className="text-sm text-gray-600 whitespace-pre-line">{entrada.descripcion}</p>
                  {entrada.materiales && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Materiales:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{entrada.materiales}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-3">Última actualización: {new Date(entrada.created_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
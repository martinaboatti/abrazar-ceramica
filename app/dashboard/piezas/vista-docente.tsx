'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { MoreVertical } from 'lucide-react'

export default function VistaDocente() {
  const [piezas, setPiezas] = useState<any[]>([])
  const [flujos, setFlujos] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState<'piezas' | 'flujos'>('piezas')
  const [mostrarFormPieza, setMostrarFormPieza] = useState(false)
  const [mostrarFormFlujo, setMostrarFormFlujo] = useState(false)
  const [editandoPieza, setEditandoPieza] = useState<any>(null)
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null)
  const [piezaAvanzar, setPiezaAvanzar] = useState<any>(null)
  const [nombrePieza, setNombrePieza] = useState('')
  const [tecnicaPieza, setTecnicaPieza] = useState('')
  const [alumnoId, setAlumnoId] = useState('')
  const [flujoId, setFlujoId] = useState('')
  const [nombreFlujo, setNombreFlujo] = useState('')
  const [descripcionFlujo, setDescripcionFlujo] = useState('')
  const [etapas, setEtapas] = useState<string[]>([''])
  const [filtroAlumno, setFiltroAlumno] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  async function cargarDatos() {
    const { data: piezasData } = await supabase
      .from('piezas')
      .select('*, usuarios!piezas_alumno_id_fkey(nombre, apellido), estados!piezas_estado_actual_id_fkey(nombre, orden), flujos(nombre, id)')
      .order('created_at', { ascending: false })

    if (piezasData) setPiezas(piezasData)

    const { data: flujosData } = await supabase
      .from('flujos')
      .select('*, estados(id, nombre, orden)')
      .order('nombre')

    if (flujosData) {
      flujosData.forEach((f: any) => {
        if (f.estados) f.estados.sort((a: any, b: any) => a.orden - b.orden)
      })
      setFlujos(flujosData)
    }

    const { data: alumnosData } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('rol', 'alumno')
      .order('apellido')

    if (alumnosData) setAlumnos(alumnosData)
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  async function handleCrearFlujo() {
    setError('')
    setGuardando(true)
    const etapasLimpias = etapas.filter(e => e.trim() !== '')
    if (!nombreFlujo || etapasLimpias.length < 2) {
      setError('Ingresá un nombre y al menos 2 etapas.')
      setGuardando(false)
      return
    }
    const { data: flujoData, error: flujoError } = await supabase
      .from('flujos')
      .insert({ nombre: nombreFlujo, descripcion: descripcionFlujo })
      .select()
      .single()
    if (flujoError || !flujoData) {
      setError('Error al crear el flujo.')
      setGuardando(false)
      return
    }
    const estadosInsert = etapasLimpias.map((nombre, index) => ({
      flujo_id: flujoData.id,
      nombre,
      orden: index + 1,
    }))
    const { error: estadosError } = await supabase.from('estados').insert(estadosInsert)
    if (estadosError) {
      setError('Error al crear las etapas.')
      setGuardando(false)
      return
    }
    setNombreFlujo('')
    setDescripcionFlujo('')
    setEtapas([''])
    setMostrarFormFlujo(false)
    setGuardando(false)
    cargarDatos()
  }

  async function handleCrearPieza() {
    setError('')
    setGuardando(true)
    if (!nombrePieza || !tecnicaPieza || !alumnoId || !flujoId) {
      setError('Todos los campos son obligatorios.')
      setGuardando(false)
      return
    }
    const flujoSeleccionado = flujos.find(f => f.id === flujoId)
    const primerEstado = flujoSeleccionado?.estados?.[0]
    if (!primerEstado) {
      setError('El flujo seleccionado no tiene etapas configuradas.')
      setGuardando(false)
      return
    }
    const { data: piezaData, error: piezaError } = await supabase
      .from('piezas')
      .insert({
        nombre: nombrePieza,
        tecnica: tecnicaPieza,
        alumno_id: alumnoId,
        flujo_id: flujoId,
        estado_actual_id: primerEstado.id,
        finalizada: false,
      })
      .select()
      .single()
    if (piezaError) {
      setError('Error al registrar la pieza.')
      setGuardando(false)
      return
    }
    await supabase.from('historial_estados').insert({
      pieza_id: piezaData.id,
      estado_id: primerEstado.id,
      usuario_id: (await supabase.auth.getUser()).data.user?.id,
    })
    setNombrePieza('')
    setTecnicaPieza('')
    setAlumnoId('')
    setFlujoId('')
    setMostrarFormPieza(false)
    setGuardando(false)
    cargarDatos()
  }

  async function handleEditarPieza() {
    setError('')
    setGuardando(true)
    if (!nombrePieza || !tecnicaPieza) {
      setError('El nombre y la técnica son obligatorios.')
      setGuardando(false)
      return
    }
    await supabase.from('piezas').update({ nombre: nombrePieza, tecnica: tecnicaPieza }).eq('id', editandoPieza.id)
    setNombrePieza('')
    setTecnicaPieza('')
    setEditandoPieza(null)
    setMostrarFormPieza(false)
    setGuardando(false)
    cargarDatos()
  }

  async function handleEliminarPieza(piezaId: string) {
    if (!confirm('¿Estás segura de que querés eliminar esta pieza?')) return
    await supabase.from('historial_estados').delete().eq('pieza_id', piezaId)
    await supabase.from('piezas').delete().eq('id', piezaId)
    cargarDatos()
  }

  async function handleAvanzarEstado(pieza: any) {
    const flujo = flujos.find(f => f.id === pieza.flujo_id)
    if (!flujo) return
    const estadoActualIndex = flujo.estados.findIndex((e: any) => e.id === pieza.estado_actual_id)
    const siguienteEstado = flujo.estados[estadoActualIndex + 1]
    if (!siguienteEstado) return
    const esFinal = estadoActualIndex + 1 === flujo.estados.length - 1
    await supabase.from('piezas').update({ estado_actual_id: siguienteEstado.id, finalizada: esFinal }).eq('id', pieza.id)
    await supabase.from('historial_estados').insert({
      pieza_id: pieza.id,
      estado_id: siguienteEstado.id,
      usuario_id: (await supabase.auth.getUser()).data.user?.id,
    })

    // Enviar notificación por Telegram
    fetch('/api/notificar-pieza', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumnoId: pieza.alumno_id,
        piezaNombre: pieza.nombre,
        estadoNombre: siguienteEstado.nombre,
      }),
    }).catch(() => {})

    cargarDatos()
  }

  function agregarEtapa() { setEtapas([...etapas, '']) }
  function actualizarEtapa(index: number, valor: string) { const nuevas = [...etapas]; nuevas[index] = valor; setEtapas(nuevas) }
  function eliminarEtapa(index: number) { if (etapas.length <= 1) return; setEtapas(etapas.filter((_, i) => i !== index)) }

  const piezasFiltradas = piezas.filter(p => {
    if (filtroAlumno && p.alumno_id !== filtroAlumno) return false
    if (filtroEtapa && p.estados?.nombre !== filtroEtapa) return false
    return true
  })

  const etapasUnicas = [...new Set(piezas.map(p => p.estados?.nombre).filter(Boolean))]

  if (cargando) return <p className="text-gray-500">Cargando piezas...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Gestión de piezas</h1>
          <p className="text-gray-400 text-sm mt-1">Seguimiento y actualización de piezas</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('piezas')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vista === 'piezas' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Piezas</button>
            <button onClick={() => setVista('flujos')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vista === 'flujos' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Flujos</button>
          </div>
          {vista === 'piezas' ? (
            <button onClick={() => { setMostrarFormPieza(true); setEditandoPieza(null); setNombrePieza(''); setTecnicaPieza(''); setAlumnoId(''); setFlujoId('') }} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Nueva pieza</button>
          ) : (
            <button onClick={() => { setMostrarFormFlujo(true); setNombreFlujo(''); setDescripcionFlujo(''); setEtapas(['']) }} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Nuevo flujo</button>
          )}
        </div>
      </div>

      {mostrarFormFlujo && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Nuevo flujo de producción</h2>
              <button onClick={() => { setMostrarFormFlujo(false); setError('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nombre del flujo</label>
                <input type="text" placeholder="Ej: Flujo cerámico estándar" value={nombreFlujo} onChange={(e) => setNombreFlujo(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Descripción (opcional)</label>
                <input type="text" placeholder="Breve descripción del proceso" value={descripcionFlujo} onChange={(e) => setDescripcionFlujo(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Etapas (en orden)</label>
                {etapas.map((etapa, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <span className="text-sm text-gray-400 py-2.5 w-6">{index + 1}.</span>
                    <input type="text" placeholder={`Etapa ${index + 1}`} value={etapa} onChange={(e) => actualizarEtapa(index, e.target.value)} className="flex-1 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
                    {etapas.length > 1 && (
                      <button onClick={() => eliminarEtapa(index)} className="text-red-400 hover:text-red-600 text-sm px-2">×</button>
                    )}
                  </div>
                ))}
                <button onClick={agregarEtapa} className="text-sm text-naranja-500 hover:text-naranja-600 mt-1">+ Agregar etapa</button>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button onClick={() => { setMostrarFormFlujo(false); setError('') }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleCrearFlujo} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : 'Crear flujo'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarFormPieza && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{editandoPieza ? 'Editar pieza' : 'Registrar nueva pieza'}</h2>
              <button onClick={() => { setMostrarFormPieza(false); setError(''); setEditandoPieza(null) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nombre de la pieza</label>
                <input type="text" placeholder="Ej: Bowl de terracota" value={nombrePieza} onChange={(e) => setNombrePieza(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Técnica</label>
                <input type="text" placeholder="Ej: Torno" value={tecnicaPieza} onChange={(e) => setTecnicaPieza(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              {!editandoPieza && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Alumno</label>
                    <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
                      <option value="">Seleccioná un alumno</option>
                      {alumnos.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Flujo de producción</label>
                    <select value={flujoId} onChange={(e) => setFlujoId(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
                      <option value="">Seleccioná un flujo</option>
                      {flujos.map((f) => (
                        <option key={f.id} value={f.id}>{f.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button onClick={() => { setMostrarFormPieza(false); setError(''); setEditandoPieza(null) }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={editandoPieza ? handleEditarPieza : handleCrearPieza} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : editandoPieza ? 'Guardar cambios' : 'Registrar pieza'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {piezaAvanzar && (() => {
        const flujo = flujos.find(f => f.id === piezaAvanzar.flujo_id)
        const estadoActualIndex = flujo?.estados?.findIndex((e: any) => e.id === piezaAvanzar.estado_actual_id)
        const estadoActual = flujo?.estados?.[estadoActualIndex]
        const siguienteEstado = flujo?.estados?.[estadoActualIndex + 1]
        return (
          <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Avanzar pieza</h2>
                <button onClick={() => setPiezaAvanzar(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400">Pieza</p>
                <p className="text-sm font-semibold text-gray-800">{piezaAvanzar.nombre}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Etapa actual</p>
                  <p className="text-sm font-medium text-gray-800">{estadoActual?.nombre}</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Siguiente etapa</p>
                  <p className="text-sm font-medium text-gray-800">{siguienteEstado?.nombre}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPiezaAvanzar(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={() => { handleAvanzarEstado(piezaAvanzar); setPiezaAvanzar(null) }} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Avanzar etapa</button>
              </div>
            </div>
          </div>
        )
      })()}

      {vista === 'flujos' ? (
        <div>
          {flujos.length === 0 ? (
            <p className="text-gray-400 text-sm">Aún no hay flujos creados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flujos.map((flujo) => (
                <div key={flujo.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800">{flujo.nombre}</h3>
                  {flujo.descripcion && <p className="text-sm text-gray-400 mt-1">{flujo.descripcion}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {flujo.estados?.map((estado: any, i: number) => (
                      <div key={estado.id} className="flex items-center gap-1">
                        <span className="text-xs bg-naranja-50 text-naranja-700 px-2 py-1 rounded-full">{estado.nombre}</span>
                        {i < flujo.estados.length - 1 && <span className="text-gray-300">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex gap-3 mb-4">
            <select value={filtroAlumno} onChange={(e) => setFiltroAlumno(e.target.value)} className="border border-gray-200 text-gray-900 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
              <option value="">Filtrar por alumno...</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
              ))}
            </select>
            <select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)} className="border border-gray-200 text-gray-900 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
              <option value="">Todas las etapas</option>
              {etapasUnicas.map((etapa) => (
                <option key={etapa} value={etapa}>{etapa}</option>
              ))}
            </select>
          </div>
          {piezasFiltradas.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay piezas registradas.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/5">Nombre de la pieza</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/5">Alumno</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/5">Etapa actual</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/5">Última actualización</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/5">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {piezasFiltradas.map((pieza) => {
                    const flujo = flujos.find(f => f.id === pieza.flujo_id)
                    const estadoActualIndex = flujo?.estados?.findIndex((e: any) => e.id === pieza.estado_actual_id)
                    const siguienteEstado = flujo?.estados?.[estadoActualIndex + 1]
                    return (
                      <tr key={pieza.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-800 w-1/5">{pieza.nombre}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 w-1/5">{pieza.usuarios?.nombre} {pieza.usuarios?.apellido}</td>
                        <td className="px-6 py-4 w-1/5"><span className={`text-sm px-2 py-1 rounded-full ${pieza.finalizada ? 'bg-green-50 text-green-700' : 'bg-naranja-50 text-naranja-700'}`}>{pieza.estados?.nombre || '-'}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-400 w-1/5">{new Date(pieza.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 w-1/5">
                          <div className="flex gap-2 items-center">
                            {!pieza.finalizada && siguienteEstado && (
                              <button onClick={() => setPiezaAvanzar(pieza)} className="text-sm bg-naranja-50 text-naranja-600 hover:bg-naranja-100 px-3 py-1.5 rounded-lg font-medium transition-colors">Avanzar</button>
                            )}
                            {pieza.finalizada && <span className="text-sm text-green-600">Finalizada</span>}
                            <div className="relative">
                              <button onClick={() => setMenuAbierto(menuAbierto === pieza.id ? null : pieza.id)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>
                              {menuAbierto === pieza.id && (
                                <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 w-36">
                                  <button onClick={() => { setEditandoPieza(pieza); setNombrePieza(pieza.nombre); setTecnicaPieza(pieza.tecnica); setMostrarFormPieza(true); setMenuAbierto(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Editar pieza</button>
                                  <button onClick={() => { handleEliminarPieza(pieza.id); setMenuAbierto(null) }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">Eliminar pieza</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
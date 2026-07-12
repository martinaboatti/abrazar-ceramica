// Vista de piezas para la docente (/dashboard/piezas/vista-docente.tsx)
// Núcleo del motor de trazabilidad - la funcionalidad más innovadora del TFG
// Cumple HU-015 (registro de piezas), HU-016 (configuración de flujos),
// HU-017 (avance de estado), HU-020 (notificación automática por Telegram)

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { MoreVertical } from 'lucide-react'

export default function VistaDocente() {
  // === ESTADOS DE DATOS ===
  const [piezas, setPiezas] = useState<any[]>([])       // Todas las piezas del taller
  const [flujos, setFlujos] = useState<any[]>([])       // Flujos de producción con sus etapas
  const [alumnos, setAlumnos] = useState<any[]>([])     // Lista de alumnos para asignar piezas
  const [cargando, setCargando] = useState(true)

  // === ESTADOS DE INTERFAZ ===
  const [vista, setVista] = useState<'piezas' | 'flujos'>('piezas')  // Toggle entre vistas
  const [mostrarFormPieza, setMostrarFormPieza] = useState(false)     // Modal de nueva/editar pieza
  const [mostrarFormFlujo, setMostrarFormFlujo] = useState(false)     // Modal de nuevo flujo
  const [editandoPieza, setEditandoPieza] = useState<any>(null)       // Pieza en modo edición
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null) // Menú de tres puntos
  const [piezaAvanzar, setPiezaAvanzar] = useState<any>(null)         // Modal de confirmación de avance
  const [piezaEliminar, setPiezaEliminar] = useState<any>(null)

  // === ESTADOS DE FORMULARIO DE PIEZA ===
  const [nombrePieza, setNombrePieza] = useState('')
  const [tecnicaPieza, setTecnicaPieza] = useState('')
  const [alumnoId, setAlumnoId] = useState('')
  const [flujoId, setFlujoId] = useState('')

  // === ESTADOS DE FORMULARIO DE FLUJO ===
  const [nombreFlujo, setNombreFlujo] = useState('')
  const [descripcionFlujo, setDescripcionFlujo] = useState('')
  const [etapas, setEtapas] = useState<string[]>([''])  // Array dinámico de etapas

  // === ESTADOS DE FILTROS ===
  const [filtroAlumno, setFiltroAlumno] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')

  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  // Carga piezas con relaciones (alumno, estado actual, flujo), flujos con etapas ordenadas y alumnos
  async function cargarDatos() {
    // Consulta con relaciones anidadas usando los nombres de las foreign keys
    // piezas_alumno_id_fkey y piezas_estado_actual_id_fkey son los nombres que Supabase genera automáticamente
    const { data: piezasData } = await supabase
      .from('piezas')
      .select('*, usuarios!piezas_alumno_id_fkey(nombre, apellido), estados!piezas_estado_actual_id_fkey(nombre, orden), flujos(nombre, id)')
      .order('created_at', { ascending: false })

    if (piezasData) setPiezas(piezasData)

    // Trae flujos con sus estados y los ordena por el campo "orden"
    const { data: flujosData } = await supabase
      .from('flujos')
      .select('*, estados(id, nombre, orden)')
      .order('nombre')

    if (flujosData) {
      // Ordena las etapas de cada flujo por su campo "orden" (1, 2, 3...)
      flujosData.forEach((f: any) => {
        if (f.estados) f.estados.sort((a: any, b: any) => a.orden - b.orden)
      })
      setFlujos(flujosData)
    }

    // Trae alumnos para el dropdown de asignación de piezas
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

  // === CREAR FLUJO (HU-016) ===
  // Crea un flujo de producción con etapas dinámicas definidas por la docente
  async function handleCrearFlujo() {
    setError('')
    setGuardando(true)
    // Filtra etapas vacías
    const etapasLimpias = etapas.filter(e => e.trim() !== '')
    if (!nombreFlujo || etapasLimpias.length < 2) {
      setError('Ingresá un nombre y al menos 2 etapas.')
      setGuardando(false)
      return
    }
    // Paso 1: crear el flujo
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
    // Paso 2: crear los estados con el orden definido por la posición en el array
    const estadosInsert = etapasLimpias.map((nombre, index) => ({
      flujo_id: flujoData.id,
      nombre,
      orden: index + 1,  // La posición determina el orden del proceso productivo
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

  // === CREAR PIEZA (HU-015) ===
  // Registra una nueva pieza asignándola a un alumno y un flujo
  async function handleCrearPieza() {
    setError('')
    setGuardando(true)
    if (!nombrePieza || !tecnicaPieza || !alumnoId || !flujoId) {
      setError('Todos los campos son obligatorios.')
      setGuardando(false)
      return
    }
    // Obtiene el primer estado del flujo seleccionado para iniciar la pieza ahí
    const flujoSeleccionado = flujos.find(f => f.id === flujoId)
    const primerEstado = flujoSeleccionado?.estados?.[0]
    if (!primerEstado) {
      setError('El flujo seleccionado no tiene etapas configuradas.')
      setGuardando(false)
      return
    }
    // Crea la pieza con el estado inicial del flujo (HU-015 criterio 1)
    const { data: piezaData, error: piezaError } = await supabase
      .from('piezas')
      .insert({
        nombre: nombrePieza,
        tecnica: tecnicaPieza,
        alumno_id: alumnoId,
        flujo_id: flujoId,
        estado_actual_id: primerEstado.id,  // Inicia en el primer estado automáticamente
        finalizada: false,
      })
      .select()
      .single()
    if (piezaError) {
      setError('Error al registrar la pieza.')
      setGuardando(false)
      return
    }
    // Registra el estado inicial en el historial para trazabilidad completa
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

  // === EDITAR PIEZA ===
  // Permite modificar nombre y técnica de una pieza existente
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

  // === ELIMINAR PIEZA ===
  // Borra primero el historial y después la pieza
  async function handleEliminarPieza(piezaId: string) {
    await supabase.from('historial_estados').delete().eq('pieza_id', piezaId)
    await supabase.from('piezas').delete().eq('id', piezaId)
    setPiezaEliminar(null)
    cargarDatos()
  }

  // === AVANZAR ESTADO (HU-017) ===
  // Mueve la pieza al siguiente estado del flujo y dispara notificación por Telegram
  async function handleAvanzarEstado(pieza: any) {
    const flujo = flujos.find(f => f.id === pieza.flujo_id)
    if (!flujo) return
    // Busca la posición actual en la secuencia de estados
    const estadoActualIndex = flujo.estados.findIndex((e: any) => e.id === pieza.estado_actual_id)
    const siguienteEstado = flujo.estados[estadoActualIndex + 1]
    if (!siguienteEstado) return
    // Verifica si el siguiente estado es el último (pieza finalizada) (HU-017 criterio 2)
    const esFinal = estadoActualIndex + 1 === flujo.estados.length - 1
    // Actualiza el estado actual de la pieza
    await supabase.from('piezas').update({ estado_actual_id: siguienteEstado.id, finalizada: esFinal }).eq('id', pieza.id)
    // Registra el cambio en el historial con fecha, hora y usuario (trazabilidad)
    await supabase.from('historial_estados').insert({
      pieza_id: pieza.id,
      estado_id: siguienteEstado.id,
      usuario_id: (await supabase.auth.getUser()).data.user?.id,
    })

    // Envía notificación por Telegram sin await (en segundo plano)
    // Si falla, .catch absorbe el error sin interrumpir el flujo de la docente (HU-020 criterio 3)
    fetch('/api/notificar-pieza', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumnoId: pieza.alumno_id,
        piezaNombre: pieza.nombre,
        estadoNombre: siguienteEstado.nombre,
        esFinal,
      }),
    }).catch(() => {})

    cargarDatos()
  }

  // === FUNCIONES AUXILIARES PARA ETAPAS DINÁMICAS ===
  function agregarEtapa() { setEtapas([...etapas, '']) }
  function actualizarEtapa(index: number, valor: string) { const nuevas = [...etapas]; nuevas[index] = valor; setEtapas(nuevas) }
  function eliminarEtapa(index: number) { if (etapas.length <= 1) return; setEtapas(etapas.filter((_, i) => i !== index)) }

  // === FILTRADO DE PIEZAS ===
  // Filtra la tabla por alumno y/o por etapa simultáneamente
  const piezasFiltradas = piezas.filter(p => {
    if (filtroAlumno && p.alumno_id !== filtroAlumno) return false
    if (filtroEtapa && p.estados?.nombre !== filtroEtapa) return false
    return true
  })

  // Extrae las etapas únicas de las piezas existentes para el dropdown de filtro
  const etapasUnicas = [...new Set(piezas.map(p => p.estados?.nombre).filter(Boolean))]

  if (cargando) return <p className="text-gray-500">Cargando piezas...</p>

  return (
    <div>
      {/* === ENCABEZADO CON TOGGLE DE VISTA Y BOTÓN DE ACCIÓN === */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Gestión de piezas</h1>
          <p className="text-gray-400 text-sm mt-1">Seguimiento y actualización de piezas</p>
        </div>
        <div className="flex gap-2">
          {/* Toggle entre vista de piezas y vista de flujos */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('piezas')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vista === 'piezas' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Piezas</button>
            <button onClick={() => setVista('flujos')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vista === 'flujos' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Flujos</button>
          </div>
          {/* El botón cambia según la vista activa */}
          {vista === 'piezas' ? (
            <button onClick={() => { setMostrarFormPieza(true); setEditandoPieza(null); setNombrePieza(''); setTecnicaPieza(''); setAlumnoId(''); setFlujoId('') }} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Nueva pieza</button>
          ) : (
            <button onClick={() => { setMostrarFormFlujo(true); setNombreFlujo(''); setDescripcionFlujo(''); setEtapas(['']) }} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Nuevo flujo</button>
          )}
        </div>
      </div>

      {/* === MODAL: NUEVO FLUJO DE PRODUCCIÓN (HU-016) === */}
      {/* Permite definir etapas dinámicamente con agregar/quitar */}
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
              {/* Lista dinámica de etapas - la docente define las etapas del proceso */}
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

      {/* === MODAL: NUEVA PIEZA / EDITAR PIEZA (HU-015) === */}
      {/* El mismo modal sirve para crear y editar - diferencia los campos según editandoPieza */}
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
              {/* Alumno y flujo solo se muestran al crear, no al editar */}
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
                {/* El botón llama a handleEditarPieza o handleCrearPieza según corresponda */}
                <button onClick={editandoPieza ? handleEditarPieza : handleCrearPieza} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : editandoPieza ? 'Guardar cambios' : 'Registrar pieza'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: ELIMINAR PIEZA === */}      
      {piezaEliminar && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Eliminar pieza</h2>
              <button onClick={() => setPiezaEliminar(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">¿Estás segura de que querés eliminar <strong>{piezaEliminar.nombre}</strong>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setPiezaEliminar(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={() => handleEliminarPieza(piezaEliminar.id)} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: AVANZAR PIEZA (HU-017) === */}
      {/* Muestra etapa actual → siguiente etapa con confirmación */}
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
              {/* Indicador visual de la transición de estado */}
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

      {/* === CONTENIDO PRINCIPAL: VISTA DE FLUJOS O VISTA DE PIEZAS === */}
      {vista === 'flujos' ? (
        // VISTA DE FLUJOS: tarjetas con las etapas conectadas por flechas
        <div>
          {flujos.length === 0 ? (
            <p className="text-gray-400 text-sm">Aún no hay flujos creados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flujos.map((flujo) => (
                <div key={flujo.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800">{flujo.nombre}</h3>
                  {flujo.descripcion && <p className="text-sm text-gray-400 mt-1">{flujo.descripcion}</p>}
                  {/* Muestra las etapas en orden con flechas: Modelado → Secado → ... */}
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
        // VISTA DE PIEZAS: tabla con filtros y acciones
        <div>
          {/* Filtros por alumno y por etapa */}
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
                        {/* Badge de estado: naranja si está en proceso, verde si finalizó */}
                        <td className="px-6 py-4 w-1/5"><span className={`text-sm px-2 py-1 rounded-full ${pieza.finalizada ? 'bg-green-50 text-green-700' : 'bg-naranja-50 text-naranja-700'}`}>{pieza.estados?.nombre || '-'}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-400 w-1/5">{new Date(pieza.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 w-1/5">
                          <div className="flex gap-2 items-center">
                            {/* Botón Avanzar: solo aparece si la pieza no finalizó y hay siguiente estado */}
                            {!pieza.finalizada && siguienteEstado && (
                              <button onClick={() => setPiezaAvanzar(pieza)} className="text-sm bg-naranja-50 text-naranja-600 hover:bg-naranja-100 px-3 py-1.5 rounded-lg font-medium transition-colors">Avanzar</button>
                            )}
                            {pieza.finalizada && <span className="text-sm text-green-600">Finalizada</span>}
                            {/* Menú de tres puntos con editar y eliminar */}
                            <div className="relative">
                              <button onClick={() => setMenuAbierto(menuAbierto === pieza.id ? null : pieza.id)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>
                              {menuAbierto === pieza.id && (
                                <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 w-36">
                                  <button onClick={() => { setEditandoPieza(pieza); setNombrePieza(pieza.nombre); setTecnicaPieza(pieza.tecnica); setMostrarFormPieza(true); setMenuAbierto(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Editar pieza</button>
                                  <button onClick={() => { setPiezaEliminar(pieza); setMenuAbierto(null) }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">Eliminar pieza</button>
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
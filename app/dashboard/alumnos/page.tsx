// Página de gestión de alumnos (/dashboard/alumnos)
// Solo accesible por la docente (no aparece en el menú del alumno)
// Cumple HU-007 (registro de alumnos), HU-008 (visualización), HU-010 (asignación de horarios)

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { MoreVertical } from 'lucide-react'

export default function AlumnosPage() {
  // Estados de datos
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [horarios, setHorarios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  // Estados del formulario de agregar alumno
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [horarioId, setHorarioId] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Estados de modales secundarios
  const [editandoHorario, setEditandoHorario] = useState<any>(null)    // Modal de editar horario
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null)  // Menú de tres puntos
  const [perfilAlumno, setPerfilAlumno] = useState<any>(null)          // Modal de ver perfil
  const [alumnoEliminar, setAlumnoEliminar] = useState<any>(null)
  const [nuevoHorarioId, setNuevoHorarioId] = useState('')

  const supabase = createClient()

  // Carga alumnos con sus inscripciones y horarios disponibles
  async function cargarDatos() {
    // Consulta con relaciones anidadas: usuarios → inscripciones → horarios
    // Trae los datos del alumno y el horario al que está inscripto en una sola consulta
    const { data: alumnosData } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, created_at, inscripciones(horario_id, horarios(nombre, dia, hora))')
      .eq('rol', 'alumno')
      .order('apellido')

    if (alumnosData) setAlumnos(alumnosData)

    // Trae horarios con conteo de inscriptos para mostrar cupos disponibles
    const { data: horariosData } = await supabase
      .from('horarios')
      .select('*, inscripciones(count)')
      .order('dia')

    if (horariosData) setHorarios(horariosData)
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Arma el texto del horario asignado para mostrar en la tabla (ej: "Lunes 10:00")
  function getHorarioTexto(alumno: any) {
    if (!alumno.inscripciones || alumno.inscripciones.length === 0) return '-'
    return alumno.inscripciones.map((i: any) => {
      const h = i.horarios
      if (!h) return ''
      return `${h.dia} ${h.hora?.slice(0, 5)}`
    }).filter(Boolean).join(', ')
  }

  // Calcula cuántos cupos libres tiene un horario
  function getCuposDisponibles(horario: any) {
    const inscriptos = horario.inscripciones?.[0]?.count || 0
    return horario.cupo_maximo - inscriptos
  }

  // Crea un nuevo alumno llamando a la API del servidor
  // Usa la API porque necesita service_role para crear cuentas de autenticación de otros usuarios
  async function handleAgregar() {
    setError('')
    setGuardando(true)

    if (!nombre || !apellido || !email) {
      setError('Todos los campos son obligatorios.')
      setGuardando(false)
      return
    }

    // Genera contraseña temporal aleatoria - el alumno puede cambiarla después con recuperar contraseña
    const password = Math.random().toString(36).slice(-8) + 'A1!'

    // Llama a la API del servidor que usa service_role para crear la cuenta
    const res = await fetch('/api/crear-alumno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, apellido, email, password, horarioId }),
    })

    const resultado = await res.json()

    if (!res.ok) {
      setError(resultado.error || 'Error al crear el alumno.')
      setGuardando(false)
      return
    }

    // Limpia el formulario y recarga la lista
    setNombre('')
    setApellido('')
    setEmail('')
    setHorarioId('')
    setMostrarFormulario(false)
    setGuardando(false)
    cargarDatos()
  }

  // Da de baja a un alumno: borra inscripciones y elimina la cuenta
  async function handleDarDeBaja(alumnoId: string) {
    
    // Primero borra las inscripciones del alumno
    await supabase.from('inscripciones').delete().eq('usuario_id', alumnoId)

    // Después llama a la API para eliminar la cuenta de autenticación (requiere service_role)
    const res = await fetch('/api/baja-alumno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnoId }),
    })

    setAlumnoEliminar(null)
    if (res.ok) cargarDatos()
  }

  // Cambia el horario de un alumno: borra la inscripción anterior y crea una nueva
  async function handleCambiarHorario() {
    if (!editandoHorario || !nuevoHorarioId) return

    await supabase
      .from('inscripciones')
      .delete()
      .eq('usuario_id', editandoHorario.id)

    await supabase
      .from('inscripciones')
      .insert({
        usuario_id: editandoHorario.id,
        horario_id: nuevoHorarioId,
      })

    setEditandoHorario(null)
    setNuevoHorarioId('')
    cargarDatos()
  }

  if (cargando) {
    return <p className="text-gray-500">Cargando alumnos...</p>
  }

  return (
    <div>
      {/* Encabezado con título y botón de agregar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Gestión de alumnos</h1>
          <p className="text-gray-400 text-sm mt-1">Administrá los alumnos del taller</p>
        </div>
        <button onClick={() => setMostrarFormulario(true)} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Agregar alumno</button>
      </div>

      {/* Modal: Agregar nuevo alumno (HU-007) */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Agregar nuevo alumno</h2>
              <button onClick={() => { setMostrarFormulario(false); setError('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nombre</label>
                <input type="text" placeholder="Ingresá el nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Apellido</label>
                <input type="text" placeholder="Ingresá el apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Email</label>
                <input type="email" placeholder="alumno@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              {/* Dropdown de horarios con cupos disponibles - deshabilita los que están llenos */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Horario disponible</label>
                <select value={horarioId} onChange={(e) => setHorarioId(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
                  <option value="">Seleccioná un horario</option>
                  {horarios.map((h) => {
                    const cupos = getCuposDisponibles(h)
                    return (
                      <option key={h.id} value={h.id} disabled={cupos <= 0}>
                        {h.dia} {h.hora?.slice(0, 5)} - {cupos > 0 ? `${cupos} cupos disponibles` : '0 cupos disponibles'}
                      </option>
                    )
                  })}
                </select>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button onClick={() => { setMostrarFormulario(false); setError('') }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleAgregar} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : 'Agregar alumno'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver perfil del alumno (HU-004 desde perspectiva docente) */}
      {perfilAlumno && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Perfil del alumno</h2>
              <button onClick={() => setPerfilAlumno(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {/* Avatar con iniciales del alumno */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-naranja-50 flex items-center justify-center">
                <span className="text-naranja-600 text-lg font-semibold">{perfilAlumno.nombre?.[0]}{perfilAlumno.apellido?.[0]}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{perfilAlumno.nombre} {perfilAlumno.apellido}</p>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Activo</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm text-gray-800">{perfilAlumno.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Horario asignado</p>
                <p className="text-sm text-gray-800">{getHorarioTexto(perfilAlumno)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Fecha de inscripción</p>
                <p className="text-sm text-gray-800">{new Date(perfilAlumno.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <button onClick={() => setPerfilAlumno(null)} className="w-full mt-4 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal: Eliminar horario del alumno */}
      {alumnoEliminar && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Dar de baja al alumno</h2>
              <button onClick={() => setAlumnoEliminar(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">¿Estás segura de que querés dar de baja a <strong>{alumnoEliminar.nombre} {alumnoEliminar.apellido}</strong>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setAlumnoEliminar(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={() => handleDarDeBaja(alumnoEliminar.id)} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Sí, dar de baja</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar horario del alumno (HU-010) */}
      {editandoHorario && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Editar horario</h2>
              <button onClick={() => setEditandoHorario(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Alumno: <strong>{editandoHorario.nombre} {editandoHorario.apellido}</strong></p>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Nuevo horario</label>
              <select value={nuevoHorarioId} onChange={(e) => setNuevoHorarioId(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
                <option value="">Seleccioná un horario</option>
                {horarios.map((h) => {
                  const cupos = getCuposDisponibles(h)
                  return (
                    <option key={h.id} value={h.id} disabled={cupos <= 0}>
                      {h.nombre} - {h.dia} {h.hora?.slice(0, 5)} - {cupos > 0 ? `${cupos} cupos disponibles` : '0 cupos disponibles'}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditandoHorario(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleCambiarHorario} disabled={!nuevoHorarioId} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de alumnos o mensaje vacío (HU-008) */}
      {alumnos.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no hay alumnos registrados.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Nombre completo</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Horario asignado</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((alumno) => (
                <tr key={alumno.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-800">{alumno.nombre} {alumno.apellido}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{alumno.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getHorarioTexto(alumno)}</td>
                  <td className="px-6 py-4"><span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Activo</span></td>
                  {/* Menú de tres puntos con acciones contextuales */}
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button onClick={() => setMenuAbierto(menuAbierto === alumno.id ? null : alumno.id)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreVertical size={16} className="text-gray-400" />
                      </button>
                      {menuAbierto === alumno.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 w-40">
                          <button onClick={() => { setPerfilAlumno(alumno); setMenuAbierto(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Ver perfil</button>
                          <button onClick={() => { setEditandoHorario(alumno); setNuevoHorarioId(''); setMenuAbierto(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Editar horario</button>
                          <button onClick={() => { setAlumnoEliminar(alumno); setMenuAbierto(null) }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">Dar de baja</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
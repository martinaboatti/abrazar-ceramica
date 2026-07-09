'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { CalendarDays, List, X } from 'lucide-react'

export default function VistaDocenteHorarios() {
  const [horarios, setHorarios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nombre, setNombre] = useState('')
  const [dia, setDia] = useState('Lunes')
  const [hora, setHora] = useState('10:00')
  const [cupoMaximo, setCupoMaximo] = useState('10')
  const [horasCancelacion, setHorasCancelacion] = useState('24')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario')
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<any>(null)
  const [alumnosDelHorario, setAlumnosDelHorario] = useState<any[]>([])
  const [asistenciasSeleccionadas, setAsistenciasSeleccionadas] = useState<string[]>([])
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false)
  const [fechaAsistencia, setFechaAsistencia] = useState('')
  const [exitoAsistencia, setExitoAsistencia] = useState(false)
  const [asistenciaGuardada, setAsistenciaGuardada] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const supabase = createClient()

  async function cargarHorarios() {
    const { data } = await supabase
      .from('horarios')
      .select('*, inscripciones(count)')
      .order('dia')

    if (data) setHorarios(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarHorarios()
  }, [])

  async function handleCrear() {
    setError('')
    setGuardando(true)
    if (!nombre || !dia || !hora || !cupoMaximo) {
      setError('Todos los campos son obligatorios.')
      setGuardando(false)
      return
    }
    const { error: insertError } = await supabase
      .from('horarios')
      .insert({
        nombre,
        dia,
        hora,
        cupo_maximo: parseInt(cupoMaximo),
        horas_cancelacion: parseInt(horasCancelacion),
      })
    if (insertError) {
      setError('Error al crear el horario.')
      setGuardando(false)
      return
    }
    setNombre('')
    setDia('Lunes')
    setHora('10:00')
    setCupoMaximo('10')
    setHorasCancelacion('24')
    setMostrarFormulario(false)
    setGuardando(false)
    cargarHorarios()
  }

  async function handleSeleccionarHorario(horario: any) {
    setHorarioSeleccionado(horario)
    setAsistenciaGuardada(false)
    setModoEdicion(false)
    setExitoAsistencia(false)

    const hoy = new Date()
    const año = hoy.getFullYear()
    const mes = String(hoy.getMonth() + 1).padStart(2, '0')
    const diaHoy = String(hoy.getDate()).padStart(2, '0')
    const fechaHoy = `${año}-${mes}-${diaHoy}`
    setFechaAsistencia(fechaHoy)

    const { data: inscripciones } = await supabase
      .from('inscripciones')
      .select('usuario_id, usuarios(id, nombre, apellido)')
      .eq('horario_id', horario.id)

    if (inscripciones) {
      setAlumnosDelHorario(inscripciones.map((i: any) => i.usuarios))
    }

    await cargarAsistenciaPorFecha(horario.id, fechaHoy)
  }

  async function cargarAsistenciaPorFecha(horarioId: string, fecha: string) {
    const { data: claseExistente } = await supabase
      .from('clases')
      .select('id')
      .eq('horario_id', horarioId)
      .eq('fecha', fecha)
      .maybeSingle()

    if (claseExistente) {
      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('usuario_id')
        .eq('clase_id', claseExistente.id)
        .eq('tipo_id', 'regular')
        .eq('estado_id', 'confirmada')

      if (asistencias && asistencias.length > 0) {
        setAsistenciasSeleccionadas(asistencias.map((a: any) => a.usuario_id))
        setAsistenciaGuardada(true)
        setModoEdicion(false)
      } else {
        setAsistenciasSeleccionadas([])
        setAsistenciaGuardada(false)
        setModoEdicion(false)
      }
    } else {
      setAsistenciasSeleccionadas([])
      setAsistenciaGuardada(false)
      setModoEdicion(false)
    }
  }

  function puedeMarcarAsistencia(): boolean {
    if (!horarioSeleccionado) return false
    const ahora = new Date()
    const partes = fechaAsistencia.split('-')
    const fechaSeleccionada = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]))
    const horaClase = horarioSeleccionado?.hora?.slice(0, 5)

    if (!horaClase) return false

    const [h, m] = horaClase.split(':').map(Number)
    const inicioClase = new Date(fechaSeleccionada)
    inicioClase.setHours(h, m, 0, 0)

    const finDia = new Date(fechaSeleccionada)
    finDia.setHours(23, 59, 59, 999)

    return ahora >= inicioClase && ahora <= finDia
  }

  function toggleAsistencia(alumnoId: string) {
    setAsistenciasSeleccionadas(prev =>
      prev.includes(alumnoId)
        ? prev.filter(id => id !== alumnoId)
        : [...prev, alumnoId]
    )
  }

  async function handleGuardarAsistencia() {
    setGuardandoAsistencia(true)

    let claseId: string

    const { data: claseExistente } = await supabase
      .from('clases')
      .select('id')
      .eq('horario_id', horarioSeleccionado.id)
      .eq('fecha', fechaAsistencia)
      .maybeSingle()

    if (claseExistente) {
      claseId = claseExistente.id
      await supabase
        .from('asistencias')
        .delete()
        .eq('clase_id', claseId)
        .eq('tipo_id', 'regular')
    } else {
      const { data: nuevaClase } = await supabase
        .from('clases')
        .insert({ horario_id: horarioSeleccionado.id, fecha: fechaAsistencia })
        .select()
        .single()

      if (!nuevaClase) {
        setGuardandoAsistencia(false)
        return
      }
      claseId = nuevaClase.id
    }

    if (asistenciasSeleccionadas.length > 0) {
      const asistenciasInsert = asistenciasSeleccionadas.map(alumnoId => ({
        clase_id: claseId,
        usuario_id: alumnoId,
        tipo_id: 'regular',
        estado_id: 'confirmada',
      }))

      await supabase.from('asistencias').insert(asistenciasInsert)
    }

    setGuardandoAsistencia(false)
    setAsistenciaGuardada(true)
    setModoEdicion(false)
    setExitoAsistencia(true)
    setTimeout(() => setExitoAsistencia(false), 3000)
  }

  function getInscriptos(horario: any) {
    return horario.inscripciones?.[0]?.count || 0
  }

  if (cargando) return <p className="text-gray-500">Cargando horarios...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Horarios y asistencia</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de horarios y seguimiento de asistencia</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('calendario')} className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${vista === 'calendario' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><CalendarDays size={16} /> Calendario</button>
            <button onClick={() => setVista('lista')} className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${vista === 'lista' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><List size={16} /> Lista</button>
          </div>
          <button onClick={() => setMostrarFormulario(true)} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Nuevo horario</button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Nuevo horario</h2>
              <button onClick={() => { setMostrarFormulario(false); setError('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nombre de la clase</label>
                <input type="text" placeholder="Ej: Torno básico" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Día</label>
                <select value={dia} onChange={(e) => setDia(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300">
                  <option>Lunes</option>
                  <option>Martes</option>
                  <option>Miércoles</option>
                  <option>Jueves</option>
                  <option>Viernes</option>
                  <option>Sábado</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Hora</label>
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Cupo máximo</label>
                <input type="number" value={cupoMaximo} onChange={(e) => setCupoMaximo(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Anticipación mínima para cancelar (horas)</label>
                <input type="number" value={horasCancelacion} onChange={(e) => setHorasCancelacion(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button onClick={() => { setMostrarFormulario(false); setError('') }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleCrear} disabled={guardando} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : 'Crear horario'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {horarioSeleccionado && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-100 shadow-lg z-50 flex flex-col">
          <div className="p-5 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-gray-800">{horarioSeleccionado.nombre}</h2>
                <p className="text-sm text-gray-500">{horarioSeleccionado.dia} • {horarioSeleccionado.hora?.slice(0, 5)}</p>
              </div>
              <button onClick={() => { setHorarioSeleccionado(null); setAlumnosDelHorario([]); setAsistenciasSeleccionadas([]); setModoEdicion(false); setAsistenciaGuardada(false) }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-500">Alumnos inscriptos</p>
              <p className="text-lg font-semibold text-gray-800">{alumnosDelHorario.length} / {horarioSeleccionado.cupo_maximo}</p>
            </div>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-600">Asistencia</h3>
              <input type="date" value={fechaAsistencia} onChange={(e) => { setFechaAsistencia(e.target.value); cargarAsistenciaPorFecha(horarioSeleccionado.id, e.target.value) }} className="border border-gray-200 text-gray-900 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-naranja-300" />
            </div>
            {alumnosDelHorario.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay alumnos inscriptos en este horario.</p>
            ) : asistenciaGuardada && !modoEdicion ? (
              <div>
                <div className="flex flex-col gap-2 mb-4">
                  {alumnosDelHorario.map((alumno: any) => (
                    <div key={alumno.id} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-xs ${asistenciasSeleccionadas.includes(alumno.id) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {asistenciasSeleccionadas.includes(alumno.id) ? '✓' : '✗'}
                      </div>
                      <span className={`text-sm ${asistenciasSeleccionadas.includes(alumno.id) ? 'text-gray-800' : 'text-gray-400'}`}>{alumno.nombre} {alumno.apellido}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mb-3">Asistencia registrada: {asistenciasSeleccionadas.length}/{alumnosDelHorario.length} presentes</p>
                {puedeMarcarAsistencia() && (
                  <button onClick={() => setModoEdicion(true)} className="w-full border border-naranja-300 text-naranja-600 rounded-lg py-2.5 text-sm font-medium hover:bg-naranja-50 transition-colors">Editar asistencia</button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {!puedeMarcarAsistencia() && !asistenciaGuardada && (
                  <p className="text-xs text-gray-400 mb-2">La asistencia solo se puede marcar desde el horario de la clase hasta el final del día.</p>
                )}
                {puedeMarcarAsistencia() ? (
                  alumnosDelHorario.map((alumno: any) => (
                    <label key={alumno.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={asistenciasSeleccionadas.includes(alumno.id)}
                        onChange={() => toggleAsistencia(alumno.id)}
                        className="w-4 h-4 rounded border-gray-300 text-naranja-500 focus:ring-naranja-300"
                      />
                      <span className="text-sm text-gray-800">{alumno.nombre} {alumno.apellido}</span>
                    </label>
                  ))
                ) : (
                  alumnosDelHorario.map((alumno: any) => (
                    <div key={alumno.id} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="w-4 h-4 rounded border border-gray-200 bg-gray-50"></div>
                      <span className="text-sm text-gray-400">{alumno.nombre} {alumno.apellido}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="p-5 border-t border-gray-100">
            {exitoAsistencia && <p className="text-green-600 text-sm text-center mb-2">✓ Asistencia guardada correctamente</p>}
            {puedeMarcarAsistencia() && (!asistenciaGuardada || modoEdicion) && (
              <button onClick={handleGuardarAsistencia} disabled={guardandoAsistencia} className="w-full bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
                {guardandoAsistencia ? 'Guardando...' : 'Guardar asistencia'}
              </button>
            )}
          </div>
        </div>
      )}

      {horarios.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no hay horarios creados.</p>
      ) : vista === 'calendario' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {horarios.map((horario) => (
            <div key={horario.id} onClick={() => handleSeleccionarHorario(horario)} className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-800">{horario.nombre}</h3>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">{horario.dia}</span>
                <span className="text-sm text-gray-500">{horario.hora?.slice(0, 5)}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Inscriptos</span>
                  <span className="text-gray-800 font-medium">{getInscriptos(horario)}/{horario.cupo_maximo}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-naranja-400 h-2 rounded-full" style={{ width: `${(getInscriptos(horario) / horario.cupo_maximo) * 100}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {horarios.map((horario) => (
            <div key={horario.id} onClick={() => handleSeleccionarHorario(horario)} className="flex justify-between items-center px-6 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
              <div>
                <p className="font-semibold text-gray-800">{horario.nombre}</p>
                <p className="text-sm text-gray-500">{horario.dia} • {horario.hora?.slice(0, 5)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-800">{getInscriptos(horario)}/{horario.cupo_maximo}</p>
                <p className="text-xs text-gray-400">alumnos</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
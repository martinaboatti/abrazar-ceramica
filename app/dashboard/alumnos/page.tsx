'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [horarios, setHorarios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [horarioId, setHorarioId] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  async function cargarDatos() {
    const { data: alumnosData } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, created_at, inscripciones(horario_id, horarios(nombre, dia, hora))')
      .eq('rol', 'alumno')
      .order('apellido')

    if (alumnosData) setAlumnos(alumnosData)

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

  function getHorarioTexto(alumno: any) {
    if (!alumno.inscripciones || alumno.inscripciones.length === 0) return '-'
    return alumno.inscripciones.map((i: any) => {
      const h = i.horarios
      if (!h) return ''
      return `${h.dia} ${h.hora?.slice(0, 5)}`
    }).filter(Boolean).join(', ')
  }

  function getCuposDisponibles(horario: any) {
    const inscriptos = horario.inscripciones?.[0]?.count || 0
    return horario.cupo_maximo - inscriptos
  }

  async function handleAgregar() {
    setError('')
    setGuardando(true)

    if (!nombre || !apellido || !email) {
      setError('Todos los campos son obligatorios.')
      setGuardando(false)
      return
    }

    const password = Math.random().toString(36).slice(-8) + 'A1!'

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

    setNombre('')
    setApellido('')
    setEmail('')
    setHorarioId('')
    setMostrarFormulario(false)
    setGuardando(false)
    cargarDatos()
  }

  async function handleDarDeBaja(alumnoId: string) {
    if (!confirm('¿Estás segura de que querés dar de baja a este alumno?')) return

    await supabase.from('inscripciones').delete().eq('usuario_id', alumnoId)

    const res = await fetch('/api/baja-alumno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnoId }),
    })

    if (res.ok) cargarDatos()
  }

  if (cargando) {
    return <p className="text-gray-500">Cargando alumnos...</p>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Gestión de alumnos</h1>
          <p className="text-gray-400 text-sm mt-1">Administrá los alumnos del taller</p>
        </div>
        <button onClick={() => setMostrarFormulario(true)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Agregar alumno</button>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Agregar nuevo alumno</h2>
              <button onClick={() => { setMostrarFormulario(false); setError('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nombre</label>
                <input type="text" placeholder="Ingresá el nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Apellido</label>
                <input type="text" placeholder="Ingresá el apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Email</label>
                <input type="email" placeholder="alumno@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Horario disponible</label>
                <select value={horarioId} onChange={(e) => setHorarioId(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
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
                <button onClick={handleAgregar} disabled={guardando} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : 'Agregar alumno'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {alumnos.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no hay alumnos registrados.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                  <td className="px-6 py-4">
                    <button onClick={() => handleDarDeBaja(alumno.id)} className="text-xs text-red-500 hover:text-red-700">Dar de baja</button>
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
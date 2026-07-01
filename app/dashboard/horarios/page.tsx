'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function HorariosPage() {
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

  function getInscriptos(horario: any) {
    return horario.inscripciones?.[0]?.count || 0
  }

  if (cargando) {
    return <p className="text-gray-500">Cargando horarios...</p>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Horarios y asistencia</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de horarios y seguimiento de asistencia</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('calendario')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vista === 'calendario' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>📅 Calendario</button>
            <button onClick={() => setVista('lista')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vista === 'lista' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>📋 Lista</button>
          </div>
          <button onClick={() => setMostrarFormulario(true)} className="bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">+ Nuevo horario</button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
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

      {horarios.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no hay horarios creados.</p>
      ) : vista === 'calendario' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {horarios.map((horario) => (
            <div key={horario.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800">{horario.nombre}</h3>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">{horario.dia}</span>
                <span className="text-sm text-gray-500">{horario.hora?.slice(0, 5)}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Enrollment</span>
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
            <div key={horario.id} className="flex justify-between items-center px-6 py-4 border-b border-gray-50 hover:bg-gray-50">
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
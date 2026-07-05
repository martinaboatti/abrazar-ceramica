'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { Clock } from 'lucide-react'

export default function VistaAlumnoHorarios() {
  const [proximasClases, setProximasClases] = useState<any[]>([])
  const [horariosRecuperacion, setHorariosRecuperacion] = useState<any[]>([])
  const [tieneCancelacionesPendientes, setTieneCancelacionesPendientes] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState<any>(null)
  const [confirmandoReservar, setConfirmandoReservar] = useState<any>(null)
  const supabase = createClient()

  async function cargarDatos() {
    setCargando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Traer inscripciones del alumno con datos del horario
    const { data: inscripciones } = await supabase
      .from('inscripciones')
      .select('*, horarios(*)')
      .eq('usuario_id', user.id)

    // 2. Traer todas las asistencias del alumno
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('*, clases(fecha, horario_id)')
      .eq('usuario_id', user.id)

    // 3. Armar lista de próximas clases regulares
    const clasesRegulares: any[] = []

    if (inscripciones) {
      inscripciones.forEach((insc: any) => {
        const h = insc.horarios
        const hoy = new Date()
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

        // Generar todas las fechas de este horario en el mes actual
        let fecha = getProximaFecha(h.dia)

        // Si la primera fecha calculada es del mes siguiente, retroceder 7 días
        if (fecha.getMonth() !== hoy.getMonth()) {
          fecha.setDate(fecha.getDate() - 7)
        }

        // Si esa fecha ya pasó, avanzar al próximo
        if (fecha < hoy) {
          fecha.setDate(fecha.getDate() + 7)
        }

        while (fecha <= ultimoDiaMes) {
          const fechaStr = fechaAString(fecha)
          const fechaCopia = new Date(fecha)

          const cancelada = asistencias?.find((a: any) =>
            a.clases?.horario_id === h.id &&
            a.clases?.fecha === fechaStr &&
            a.tipo_id === 'cancelacion'
          )

          if (!cancelada) {
            clasesRegulares.push({
              id: `${insc.id}-${fechaStr}`,
              tipo: 'regular',
              horario: h,
              proximaFecha: fechaCopia,
              puedeCancelar: puedeCancelar(fechaCopia, h.horas_cancelacion),
            })
          }

          fecha.setDate(fecha.getDate() + 7)
        }
      })
    }

    // 4. Traer clases de recuperación reservadas
    const clasesRecuperacion: any[] = []

    if (asistencias) {
      const recuperaciones = asistencias.filter((a: any) => a.tipo_id === 'recuperacion')
      for (const rec of recuperaciones) {
        const partes = rec.clases?.fecha.split('-')
        const fechaClase = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]))
        if (fechaClase >= new Date(fechaAString(new Date()))) {
          const { data: horario } = await supabase
            .from('horarios')
            .select('*')
            .eq('id', rec.clases?.horario_id)
            .single()

          if (horario) {
            clasesRecuperacion.push({
              id: rec.id,
              tipo: 'recuperacion',
              horario,
              proximaFecha: fechaClase,
              puedeCancelar: false,
            })
          }
        }
      }
    }

    setProximasClases([...clasesRegulares, ...clasesRecuperacion].sort((a, b) =>
      a.proximaFecha.getTime() - b.proximaFecha.getTime()
    ))

    // 5. Calcular si tiene cancelaciones pendientes de recuperar
    const totalCancelaciones = asistencias?.filter((a: any) => a.tipo_id === 'cancelacion').length || 0
    const totalRecuperaciones = asistencias?.filter((a: any) => a.tipo_id === 'recuperacion').length || 0
    const pendientes = totalCancelaciones - totalRecuperaciones
    setTieneCancelacionesPendientes(pendientes > 0)

    // 6. Traer horarios disponibles para recuperación
    if (pendientes > 0) {
      const { data: todosHorarios } = await supabase
        .from('horarios')
        .select('*, inscripciones(count)')
        .order('dia')

      if (todosHorarios) {
        // Contar recuperaciones ya reservadas por horario para la próxima fecha
        const disponibles = todosHorarios.filter((h: any) => {
          const inscriptos = h.inscripciones?.[0]?.count || 0
          const fechaProxima = fechaAString(getProximaFecha(h.dia))

          // Contar recuperaciones para esta fecha
          const recuperacionesEnFecha = asistencias?.filter((a: any) =>
            a.tipo_id === 'recuperacion' &&
            a.clases?.horario_id === h.id &&
            a.clases?.fecha === fechaProxima
          ).length || 0

          return (inscriptos + recuperacionesEnFecha) < h.cupo_maximo
        })

        // Excluir horarios donde el alumno ya está inscripto o ya reservó
        const misHorarioIds = inscripciones?.map((i: any) => i.horario_id) || []
        const yaReservadoIds = asistencias
          ?.filter((a: any) => a.tipo_id === 'recuperacion')
          .map((a: any) => a.clases?.horario_id) || []

        setHorariosRecuperacion(disponibles.filter((h: any) =>
          !misHorarioIds.includes(h.id) && !yaReservadoIds.includes(h.id)
        ))
      }
    } else {
      setHorariosRecuperacion([])
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  function getProximaFecha(dia: string): Date {
    const dias: any = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 0 }
    const hoy = new Date()
    const diaTarget = dias[dia]
    const diaActual = hoy.getDay()
    let diff = diaTarget - diaActual
    if (diff <= 0) diff += 7
    const proxima = new Date(hoy)
    proxima.setDate(hoy.getDate() + diff)
    return proxima
  }

  function puedeCancelar(fecha: Date, horasAnticipacion: number): boolean {
    const ahora = new Date()
    const diff = fecha.getTime() - ahora.getTime()
    const horasRestantes = diff / (1000 * 60 * 60)
    return horasRestantes >= horasAnticipacion
  }

  function fechaAString(fecha: Date): string {
    const año = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }

  async function handleCancelar(item: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fechaStr = fechaAString(item.proximaFecha)

    // Buscar o crear la clase
    let claseId: string
    const { data: claseExistente } = await supabase
      .from('clases')
      .select('id')
      .eq('horario_id', item.horario.id)
      .eq('fecha', fechaStr)
      .maybeSingle()

    if (claseExistente) {
      claseId = claseExistente.id
    } else {
      const { data: nuevaClase } = await supabase
        .from('clases')
        .insert({ horario_id: item.horario.id, fecha: fechaStr })
        .select()
        .single()
      if (!nuevaClase) return
      claseId = nuevaClase.id
    }

    // Verificar si ya existe asistencia para esta clase
    const { data: asistenciaExistente } = await supabase
      .from('asistencias')
      .select('id')
      .eq('clase_id', claseId)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (asistenciaExistente) {
      await supabase
        .from('asistencias')
        .update({ tipo_id: 'cancelacion', estado_id: 'cancelada' })
        .eq('id', asistenciaExistente.id)
    } else {
      await supabase.from('asistencias').insert({
        clase_id: claseId,
        usuario_id: user.id,
        tipo_id: 'cancelacion',
        estado_id: 'cancelada',
      })
    }

    setConfirmandoCancelar(null)
    cargarDatos()
  }

  async function handleReservar(horario: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fechaClase = getProximaFecha(horario.dia)
    const fechaStr = fechaAString(fechaClase)

    // Buscar o crear la clase
    let claseId: string
    const { data: claseExistente } = await supabase
      .from('clases')
      .select('id')
      .eq('horario_id', horario.id)
      .eq('fecha', fechaStr)
      .maybeSingle()

    if (claseExistente) {
      claseId = claseExistente.id
    } else {
      const { data: nuevaClase } = await supabase
        .from('clases')
        .insert({ horario_id: horario.id, fecha: fechaStr })
        .select()
        .single()
      if (!nuevaClase) return
      claseId = nuevaClase.id
    }

    await supabase.from('asistencias').insert({
      clase_id: claseId,
      usuario_id: user.id,
      tipo_id: 'recuperacion',
      estado_id: 'confirmada',
    })

    setConfirmandoReservar(null)
    cargarDatos()
  }

  if (cargando) return <p className="text-gray-500">Cargando horarios...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Mi horario</h1>
        <p className="text-gray-400 text-sm mt-1">Clases de {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-3">Próximas clases</h2>

      {proximasClases.length === 0 ? (
        <p className="text-gray-400 text-sm mb-8">No tenés clases próximas.</p>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {proximasClases.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-5 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800">{item.horario.nombre}</h3>
                  {item.tipo === 'recuperacion' && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Recuperación</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{item.proximaFecha.toLocaleDateString()} • {item.horario.hora?.slice(0, 5)}</p>
                {item.tipo === 'regular' && !item.puedeCancelar && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-400">Plazo vencido para cancelar</p>
                  </div>
                )}
              </div>
              {item.tipo === 'regular' && (
                <button
                  onClick={() => setConfirmandoCancelar(item)}
                  disabled={!item.puedeCancelar}
                  className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${item.puedeCancelar ? 'bg-naranja-50 text-naranja-600 hover:bg-naranja-100' : 'text-gray-300 cursor-not-allowed'}`}
                >
                  Cancelar asistencia
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmandoCancelar && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Cancelar asistencia</h2>
              <button onClick={() => setConfirmandoCancelar(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">¿Estás seguro de que querés cancelar tu asistencia a <strong>{confirmandoCancelar.horario.nombre}</strong> del {confirmandoCancelar.proximaFecha.toLocaleDateString()}?</p>
            <p className="text-xs text-gray-400 mb-4">Tu lugar será liberado y podrás reservar una clase de recuperación.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmandoCancelar(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Volver</button>
              <button onClick={() => handleCancelar(confirmandoCancelar)} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}

      {confirmandoReservar && (
        <div className="fixed inset-0 bg-gray-400/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Reservar recuperación</h2>
              <button onClick={() => setConfirmandoReservar(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">¿Querés reservar una clase de recuperación en <strong>{confirmandoReservar.nombre}</strong> el {getProximaFecha(confirmandoReservar.dia).toLocaleDateString()}?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmandoReservar(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Volver</button>
              <button onClick={() => handleReservar(confirmandoReservar)} className="flex-1 bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Sí, reservar</button>
            </div>
          </div>
        </div>
      )}

      {tieneCancelacionesPendientes && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Reservar clase de recuperación</h2>
          <p className="text-sm text-naranja-600 bg-naranja-50 rounded-lg p-3 mb-3">⚠️ Una vez reservada, la clase de recuperación no puede cancelarse.</p>
          {horariosRecuperacion.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay horarios con cupo disponible para recuperar.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {horariosRecuperacion.map((h) => {
                const inscriptos = h.inscripciones?.[0]?.count || 0
                const cuposLibres = h.cupo_maximo - inscriptos
                return (
                  <div key={h.id} className="bg-white rounded-xl border border-gray-100 p-5 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{h.nombre}</h3>
                      <p className="text-sm text-gray-500">{getProximaFecha(h.dia).toLocaleDateString()} • {h.hora?.slice(0, 5)} <span className="text-naranja-500 ml-2">{cuposLibres} cupos restantes</span></p>
                    </div>
                    <button onClick={() => setConfirmandoReservar(h)} className="text-sm bg-naranja-500 hover:bg-naranja-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">Reservar</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {!tieneCancelacionesPendientes && proximasClases.length > 0 && (
        <p className="text-gray-400 text-sm">No tenés clases pendientes de recuperar.</p>
      )}
    </div>
  )
}
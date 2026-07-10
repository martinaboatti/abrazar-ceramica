// Vista de horarios para el alumno (/dashboard/horarios/vista-alumno.tsx)
// Cumple HU-013 (cancelación de asistencia con anticipación mínima),
// HU-014 (reserva de clase de recuperación con verificación de cupo)
// Muestra las clases del mes actual, permite cancelar y reservar recuperaciones

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { Clock } from 'lucide-react'

export default function VistaAlumnoHorarios() {
  // === ESTADOS DE DATOS ===
  const [proximasClases, setProximasClases] = useState<any[]>([])           // Clases regulares + recuperaciones
  const [horariosRecuperacion, setHorariosRecuperacion] = useState<any[]>([]) // Horarios disponibles para recuperar
  const [tieneCancelacionesPendientes, setTieneCancelacionesPendientes] = useState(false)
  const [cargando, setCargando] = useState(true)

  // === ESTADOS DE MODALES DE CONFIRMACIÓN ===
  const [confirmandoCancelar, setConfirmandoCancelar] = useState<any>(null)   // Modal de cancelar clase
  const [confirmandoReservar, setConfirmandoReservar] = useState<any>(null)   // Modal de reservar recuperación

  const supabase = createClient()

  async function cargarDatos() {
    setCargando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Traer inscripciones del alumno (horarios fijos)
    const { data: inscripciones } = await supabase
      .from('inscripciones')
      .select('*, horarios(*)')
      .eq('usuario_id', user.id)

    // 2. Traer todas las asistencias del alumno (cancelaciones y recuperaciones)
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('*, clases(fecha, horario_id)')
      .eq('usuario_id', user.id)

    // 3. Armar lista de próximas clases regulares del mes actual
    // Por cada inscripción genera todas las fechas de ese día de la semana hasta fin de mes
    // y excluye las que fueron canceladas
    const clasesRegulares: any[] = []

    if (inscripciones) {
      inscripciones.forEach((insc: any) => {
        const h = insc.horarios
        const hoy = new Date()
        const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

        // Genera todas las fechas de este horario en el mes actual
        let fecha = getProximaFecha(h.dia)

        // Si la primera fecha calculada es del mes siguiente, retroceder una semana
        if (fecha.getMonth() !== hoy.getMonth()) {
          fecha.setDate(fecha.getDate() - 7)
        }

        // Si esa fecha ya pasó, avanzar a la próxima
        if (fecha < hoy) {
          fecha.setDate(fecha.getDate() + 7)
        }

        // Itera semana a semana hasta el fin del mes
        while (fecha <= ultimoDiaMes) {
          const fechaStr = fechaAString(fecha)
          const fechaCopia = new Date(fecha)

          // Verifica si esta clase específica fue cancelada
          const cancelada = asistencias?.find((a: any) =>
            a.clases?.horario_id === h.id &&
            a.clases?.fecha === fechaStr &&
            a.tipo_id === 'cancelacion'
          )

          // Solo agrega a la lista si no fue cancelada
          if (!cancelada) {
            clasesRegulares.push({
              id: `${insc.id}-${fechaStr}`,
              tipo: 'regular',
              horario: h,
              proximaFecha: fechaCopia,
              puedeCancelar: puedeCancelar(fechaCopia, h.horas_cancelacion),
            })
          }

          fecha.setDate(fecha.getDate() + 7) // Avanza una semana
        }
      })
    }

    // 4. Traer clases de recuperación reservadas (solo futuras)
    const clasesRecuperacion: any[] = []

    if (asistencias) {
      const recuperaciones = asistencias.filter((a: any) => a.tipo_id === 'recuperacion')
      for (const rec of recuperaciones) {
        // Parseo manual de fecha para evitar problemas de zona horaria UTC-3
        const partes = rec.clases?.fecha.split('-')
        const fechaClase = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]))
        if (fechaClase >= new Date(new Date().toISOString().split('T')[0])) {
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
              puedeCancelar: false, // Las recuperaciones no se pueden cancelar
            })
          }
        }
      }
    }

    // Combina regulares + recuperaciones ordenadas cronológicamente
    setProximasClases([...clasesRegulares, ...clasesRecuperacion].sort((a, b) =>
      a.proximaFecha.getTime() - b.proximaFecha.getTime()
    ))

    // 5. Calcular si tiene cancelaciones pendientes de recuperar (HU-014)
    // Si canceló 2 y recuperó 1, tiene 1 pendiente y puede reservar otra
    const totalCancelaciones = asistencias?.filter((a: any) => a.tipo_id === 'cancelacion').length || 0
    const totalRecuperaciones = asistencias?.filter((a: any) => a.tipo_id === 'recuperacion').length || 0
    const pendientes = totalCancelaciones - totalRecuperaciones
    setTieneCancelacionesPendientes(pendientes > 0)

    // 6. Traer horarios disponibles para recuperación (solo si tiene pendientes)
    if (pendientes > 0) {
      const { data: todosHorarios } = await supabase
        .from('horarios')
        .select('*, inscripciones(count)')
        .order('dia')

      if (todosHorarios) {
        // Filtra horarios que tienen cupo disponible considerando inscriptos + recuperaciones
        const disponibles = todosHorarios.filter((h: any) => {
          const inscriptos = h.inscripciones?.[0]?.count || 0
          const fechaProxima = fechaAString(getProximaFecha(h.dia))

          // Cuenta recuperaciones ya reservadas para esta fecha específica
          const recuperacionesEnFecha = asistencias?.filter((a: any) =>
            a.tipo_id === 'recuperacion' &&
            a.clases?.horario_id === h.id &&
            a.clases?.fecha === fechaProxima
          ).length || 0

          return (inscriptos + recuperacionesEnFecha) < h.cupo_maximo
        })

        // Excluye horarios donde el alumno ya está inscripto o ya reservó
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

  // Calcula la próxima fecha para un día de la semana (ej: próximo "Lunes")
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

  // Verifica si el alumno puede cancelar según la anticipación mínima configurada (HU-013)
  function puedeCancelar(fecha: Date, horasAnticipacion: number): boolean {
    const ahora = new Date()
    const diff = fecha.getTime() - ahora.getTime()
    const horasRestantes = diff / (1000 * 60 * 60)
    return horasRestantes >= horasAnticipacion
  }

  // Convierte una fecha a string YYYY-MM-DD sin problemas de zona horaria
  // Necesario porque toISOString() convierte a UTC y en Argentina (UTC-3) puede cambiar el día
  function fechaAString(fecha: Date): string {
    const año = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }

  // === CANCELAR CLASE (HU-013) ===
  // Crea o busca la clase y registra una asistencia de tipo cancelación
  async function handleCancelar(item: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fechaStr = fechaAString(item.proximaFecha)

    // Busca si ya existe una clase para ese horario y fecha
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
      // Si no existe, la crea
      const { data: nuevaClase } = await supabase
        .from('clases')
        .insert({ horario_id: item.horario.id, fecha: fechaStr })
        .select()
        .single()
      if (!nuevaClase) return
      claseId = nuevaClase.id
    }

    // Verifica si ya existe un registro de asistencia para evitar duplicados
    const { data: asistenciaExistente } = await supabase
      .from('asistencias')
      .select('id')
      .eq('clase_id', claseId)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (asistenciaExistente) {
      // Si ya existe, actualiza a cancelación
      await supabase
        .from('asistencias')
        .update({ tipo_id: 'cancelacion', estado_id: 'cancelada' })
        .eq('id', asistenciaExistente.id)
    } else {
      // Si no existe, crea nueva
      await supabase.from('asistencias').insert({
        clase_id: claseId,
        usuario_id: user.id,
        tipo_id: 'cancelacion',
        estado_id: 'cancelada',
      })
    }

    setConfirmandoCancelar(null)
    cargarDatos() // Recarga para reflejar los cambios
  }

  // === RESERVAR RECUPERACIÓN (HU-014) ===
  // Similar a cancelar pero crea una asistencia de tipo recuperación
  async function handleReservar(horario: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fechaClase = getProximaFecha(horario.dia)
    const fechaStr = fechaAString(fechaClase)

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
        {/* Muestra el mes actual en español */}
        <p className="text-gray-400 text-sm mt-1">Clases de {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* === PRÓXIMAS CLASES (regulares + recuperaciones ordenadas por fecha) === */}
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
                  {/* Badge "Recuperación" para diferenciar de las regulares */}
                  {item.tipo === 'recuperacion' && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Recuperación</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{item.proximaFecha.toLocaleDateString()} • {item.horario.hora?.slice(0, 5)}</p>
                {/* Aviso cuando el plazo de cancelación ya venció (HU-013 criterio 2) */}
                {item.tipo === 'regular' && !item.puedeCancelar && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-400">Plazo vencido para cancelar</p>
                  </div>
                )}
              </div>
              {/* Solo las clases regulares se pueden cancelar (las recuperaciones no) */}
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

      {/* === MODAL: CONFIRMAR CANCELACIÓN === */}
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

      {/* === MODAL: CONFIRMAR RESERVA DE RECUPERACIÓN === */}
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

      {/* === SECCIÓN DE RECUPERACIÓN (solo visible si tiene cancelaciones pendientes) === */}
      {tieneCancelacionesPendientes && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Reservar clase de recuperación</h2>
          {/* Advertencia: las recuperaciones no se pueden cancelar después */}
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

      {/* Mensaje cuando no hay nada pendiente de recuperar */}
      {!tieneCancelacionesPendientes && proximasClases.length > 0 && (
        <p className="text-gray-400 text-sm">No tenés clases pendientes de recuperar.</p>
      )}
    </div>
  )
}
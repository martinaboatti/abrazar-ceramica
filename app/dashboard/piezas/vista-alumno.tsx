'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function VistaAlumno() {
  const [piezas, setPiezas] = useState<any[]>([])
  const [flujos, setFlujos] = useState<any[]>([])
  const [usuario, setUsuario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [piezaDetalle, setPiezaDetalle] = useState<any>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const supabase = createClient()

  async function cargarDatos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, rol')
      .eq('id', user.id)
      .single()

    if (usuarioData) setUsuario(usuarioData)

    const { data: piezasData } = await supabase
      .from('piezas')
      .select('*, usuarios!piezas_alumno_id_fkey(nombre, apellido), estados!piezas_estado_actual_id_fkey(nombre, orden), flujos(nombre, id)')
      .eq('alumno_id', user.id)
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

    setCargando(false)
  }

  async function cargarHistorial(piezaId: string) {
    const { data } = await supabase
      .from('historial_estados')
      .select('*, estados(nombre), usuarios(nombre, apellido, rol)')
      .eq('pieza_id', piezaId)
      .order('fecha', { ascending: false })

    if (data) setHistorial(data)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  function getProgreso(pieza: any) {
    const flujo = flujos.find(f => f.id === pieza.flujo_id)
    if (!flujo || !flujo.estados) return 0
    const estadoActualIndex = flujo.estados.findIndex((e: any) => e.id === pieza.estado_actual_id)
    if (estadoActualIndex === -1) return 0
    return Math.round(((estadoActualIndex + 1) / flujo.estados.length) * 100)
  }

  if (cargando) return <p className="text-gray-500">Cargando piezas...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Bienvenida de vuelta, {usuario?.nombre}</h1>
        <p className="text-gray-400 text-sm mt-1">Estas son tus piezas activas</p>
      </div>

      {piezas.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no tenés piezas registradas.</p>
      ) : piezaDetalle ? (
        <div>
          <button onClick={() => { setPiezaDetalle(null); setHistorial([]) }} className="text-sm text-naranja-500 hover:text-naranja-600 mb-4 flex items-center gap-1">← Volver a mis piezas</button>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-800">{piezaDetalle.nombre}</h2>
            <p className="text-sm text-gray-400 mt-1">{piezaDetalle.tecnica} • {piezaDetalle.flujos?.nombre}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Etapas de producción</h3>
                {(() => {
                  const flujo = flujos.find(f => f.id === piezaDetalle.flujo_id)
                  return flujo?.estados?.map((estado: any) => {
                    const estadoActualIndex = flujo.estados.findIndex((e: any) => e.id === piezaDetalle.estado_actual_id)
                    const estadoIndex = flujo.estados.findIndex((e: any) => e.id === estado.id)
                    const completado = estadoIndex < estadoActualIndex
                    const actual = estado.id === piezaDetalle.estado_actual_id
                    return (
                      <div key={estado.id} className="flex items-center gap-3 py-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${completado ? 'bg-green-500 text-white' : actual ? 'bg-naranja-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {completado ? '✓' : estadoIndex + 1}
                        </div>
                        <span className={`text-sm ${completado ? 'text-gray-400 line-through' : actual ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{estado.nombre}</span>
                      </div>
                    )
                  })
                })()}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Historial</h3>
                {historial.length === 0 ? (
                  <p className="text-gray-400 text-sm">Sin historial registrado.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {historial.map((h) => (
                      <div key={h.id} className="flex justify-between items-start border-b border-gray-50 pb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{h.estados?.nombre}</p>
                          <p className="text-xs text-gray-400">Actualizado por {h.usuarios?.rol === 'docente' ? 'Prof. ' : ''}{h.usuarios?.nombre} {h.usuarios?.apellido}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{new Date(h.fecha).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">{new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {piezas.map((pieza) => {
            const progreso = getProgreso(pieza)
            return (
              <div key={pieza.id} onClick={() => { setPiezaDetalle(pieza); cargarHistorial(pieza.id) }} className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800">{pieza.nombre}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pieza.finalizada ? 'bg-green-50 text-green-700' : 'bg-naranja-50 text-naranja-700'}`}>{pieza.finalizada ? 'Finalizada' : 'En proceso'}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{pieza.tecnica}</p>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-gray-500">Etapa actual</span>
                  <span className="font-medium text-gray-800">{pieza.estados?.nombre}</span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-naranja-400 h-1.5 rounded-full" style={{ width: `${progreso}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{progreso}% completado</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
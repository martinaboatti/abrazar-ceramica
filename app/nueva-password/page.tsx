// Página de nueva contraseña (/nueva-password)
// Cumple HU-003 (criterios 3 y 4): permite establecer una nueva contraseña
// Implementa la política de contraseñas descripta en la sección de Seguridad del TFG:
// mínimo 8 caracteres, mayúscula, minúscula, número, carácter especial,
// y rechazo de secuencias evidentes (12345678, abcdefgh, etc.)
//
// Flujo en dos pasos para evitar que los escáneres de seguridad de los
// clientes de mail (Gmail, Outlook) invaliden el enlace antes de que el
// usuario lo abra: el link del mail apunta a esta página con un
// "token_hash" en la URL, pero ese token NO se canjea automáticamente.
// Recién se canjea cuando el usuario hace clic en el botón "Confirmar".
//
// NOTA TÉCNICA: useSearchParams() obliga a envolver el componente en
// <Suspense>, si no Next.js falla al generar la página estática en el
// build ("useSearchParams() should be wrapped in a suspense boundary").
// Por eso separamos la lógica en NuevaPasswordForm y la envolvemos abajo.

'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function NuevaPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [sesionInicializada, setSesionInicializada] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createClient())

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Paso 1: el usuario confirma con un clic real. Esto es lo que evita
  // que un escáner automático de un cliente de mail gaste el token solo
  // por "visitar" la URL, porque un escáner no hace clic en botones.
  async function handleConfirmar() {
    setError('')
    setVerificando(true)

    if (!tokenHash || type !== 'recovery') {
      setError('El enlace para recuperar la contraseña no es válido.')
      setVerificando(false)
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })

    if (error) {
      console.log('Error verifyOtp:', error)
      setError('El enlace para recuperar la contraseña no es válido o ya expiró. Pedí uno nuevo.')
      setVerificando(false)
      return
    }

    setSesionInicializada(true)
    setVerificando(false)
  }

  // Valida la política de contraseñas del TFG y devuelve un mensaje con TODOS los requisitos faltantes, o null si es válida
  function validarPassword(pass: string): string | null {
    const requisitos: string[] = []

    if (pass.length < 8) requisitos.push('mínimo 8 caracteres')
    if (!/[A-Z]/.test(pass)) requisitos.push('una letra mayúscula')
    if (!/[a-z]/.test(pass)) requisitos.push('una letra minúscula')
    if (!/[0-9]/.test(pass)) requisitos.push('un número')
    if (!/[$@#!%*?]/.test(pass)) requisitos.push('un carácter especial ($, @, #, !, %, *, ?)')

    const secuenciaNumerica = /(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/
    if (secuenciaNumerica.test(pass)) requisitos.push('no debe contener secuencias numéricas evidentes')

    const letras = 'abcdefghijklmnopqrstuvwxyz'
    const passLower = pass.toLowerCase()
    for (let i = 0; i <= letras.length - 4; i++) {
      const tramo = letras.slice(i, i + 4)
      const tramoInvertido = tramo.split('').reverse().join('')
      if (passLower.includes(tramo) || passLower.includes(tramoInvertido)) {
        requisitos.push('no debe contener secuencias de letras evidentes')
        break
      }
    }

    if (/(.)\1{3,}/.test(pass)) requisitos.push('no debe repetir el mismo carácter varias veces seguidas')

    if (requisitos.length === 0) return null

    return `La contraseña no cumple con los siguientes requisitos: ${requisitos.join(', ')}.`
  }

  async function handleCambiar() {
    setError('')
    setLoading(true)

    if (!password || !confirmar) {
      setError('Completá ambos campos.')
      setLoading(false)
      return
    }

    const errorValidacion = validarPassword(password)
    if (errorValidacion) {
      setError(errorValidacion)
      setLoading(false)
      return
    }

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      console.log('Error updateUser:', error)
      setError('No se pudo actualizar la contraseña: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Abrazar Cerámica</h1>
          <p className="text-gray-400 text-sm mt-1">
            {sesionInicializada ? 'Creá tu nueva contraseña' : 'Recuperar contraseña'}
          </p>
        </div>

        {!sesionInicializada ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center">
              Hacé clic en el botón para confirmar que querés restablecer tu contraseña.
            </p>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleConfirmar}
              disabled={verificando}
              className="w-full bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {verificando ? 'Confirmando...' : 'Confirmar y continuar'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Nueva contraseña</label>
              <input type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Confirmar contraseña</label>
              <input type="password" placeholder="Repetí la contraseña" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Requisitos de la contraseña</p>
              <ul className="text-xs text-gray-500 flex flex-col gap-1">
                <li>• Mínimo 8 caracteres</li>
                <li>• Al menos una letra mayúscula</li>
                <li>• Al menos una letra minúscula</li>
                <li>• Al menos un número</li>
                <li>• Al menos un carácter especial ($, @, #, !, %, *, ?)</li>
                <li>• Sin secuencias evidentes (ej: 1234, abcd)</li>
              </ul>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={handleCambiar} disabled={loading} className="w-full bg-naranja-500 hover:bg-naranja-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function NuevaPasswordPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </main>
    }>
      <NuevaPasswordForm />
    </Suspense>
  )
}
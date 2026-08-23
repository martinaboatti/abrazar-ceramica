// Página de nueva contraseña (/nueva-password)
// Cumple HU-003 (criterios 3 y 4): permite establecer una nueva contraseña
// Implementa la política de contraseñas descripta en la sección de Seguridad del TFG:
// mínimo 8 caracteres, mayúscula, minúscula, número, carácter especial,
// y rechazo de secuencias evidentes (12345678, abcdefgh, etc.)

'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function NuevaPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Valida la política de contraseñas del TFG y devuelve un mensaje de error o null si es válida
  function validarPassword(pass: string): string | null {
    if (pass.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.'
    }
    if (!/[A-Z]/.test(pass)) {
      return 'La contraseña debe incluir al menos una letra mayúscula.'
    }
    if (!/[a-z]/.test(pass)) {
      return 'La contraseña debe incluir al menos una letra minúscula.'
    }
    if (!/[0-9]/.test(pass)) {
      return 'La contraseña debe incluir al menos un número.'
    }
    if (!/[$@#!%*?]/.test(pass)) {
      return 'La contraseña debe incluir al menos un carácter especial ($, @, #, !, %, *, ?).'
    }

    // Detecta secuencias numéricas ascendentes o descendentes de 4+ dígitos (ej: 1234, 9876)
    const secuenciaNumerica = /(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/
    if (secuenciaNumerica.test(pass)) {
      return 'La contraseña no puede contener secuencias numéricas evidentes (ej: 1234).'
    }

    // Detecta secuencias alfabéticas ascendentes o descendentes de 4+ letras (ej: abcd, wxyz)
    const letras = 'abcdefghijklmnopqrstuvwxyz'
    const passLower = pass.toLowerCase()
    for (let i = 0; i <= letras.length - 4; i++) {
      const tramo = letras.slice(i, i + 4)
      const tramoInvertido = tramo.split('').reverse().join('')
      if (passLower.includes(tramo) || passLower.includes(tramoInvertido)) {
        return 'La contraseña no puede contener secuencias de letras evidentes (ej: abcd).'
      }
    }

    // Detecta el mismo carácter repetido 4 o más veces seguidas (ej: aaaa, 1111)
    if (/(.)\1{3,}/.test(pass)) {
      return 'La contraseña no puede contener el mismo carácter repetido varias veces seguidas.'
    }

    return null
  }

  async function handleCambiar() {
    setError('')
    setLoading(true)

    if (!password || !confirmar) {
      setError('Completá ambos campos.')
      setLoading(false)
      return
    }

    // Valida toda la política de seguridad de contraseñas
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
      setError('No se pudo actualizar la contraseña.')
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
          <p className="text-gray-400 text-sm mt-1">Creá tu nueva contraseña</p>
        </div>
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
      </div>
    </main>
  )
}
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

  async function handleCambiar() {
    setError('')
    setLoading(true)

    if (!password || !confirmar) {
      setError('Completá ambos campos.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
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
            <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Confirmar contraseña</label>
            <input type="password" placeholder="Repetí la contraseña" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-naranja-300 placeholder:text-gray-300" />
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
'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
    verificar()
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </main>
  )
}
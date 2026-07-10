// Cliente de Supabase para el navegador (client-side)
// Se usa en todos los componentes que tienen 'use client'
// Lee las claves de conexión desde las variables de entorno (.env.local)

import { createBrowserClient } from '@supabase/ssr'

// Función reutilizable que crea y devuelve una conexión a Supabase
// Se importa en cualquier página o componente que necesite hablar con la base de datos
// Ejemplo de uso: const supabase = createClient()
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,     // URL del proyecto en Supabase
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Clave pública (publishable key)
  )
}
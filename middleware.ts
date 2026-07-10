// Middleware de protección de rutas
// Se ejecuta antes de cada navegación y decide si el usuario puede acceder
// Funciona como un guardia de seguridad en la puerta de cada página

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Crea un cliente de Supabase que lee las cookies de la petición
  // para determinar si hay una sesión activa
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Verifica si hay un usuario logueado
  const { data: { user } } = await supabase.auth.getUser()

  // Páginas que se pueden ver sin estar logueado
  const rutasPublicas = ['/login', '/registro', '/recuperar', '/nueva-password']
  const esRutaPublica = rutasPublicas.includes(request.nextUrl.pathname)

  // Regla 1: si NO hay usuario y la ruta es privada → redirige al login
  if (!user && !esRutaPublica) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Regla 2: si hay usuario y la ruta es pública → redirige al dashboard
  // (no tiene sentido ver el login si ya estás logueado)
  if (user && esRutaPublica) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Configuración del matcher: define en qué rutas se ejecuta el middleware
// Excluye archivos estáticos de Next.js (_next/static, _next/image, favicon)
// y todas las rutas de API (api/) para que los webhooks y endpoints funcionen sin autenticación
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
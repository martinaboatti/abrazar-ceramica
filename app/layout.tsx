// Layout raíz de la aplicación - envuelve todas las páginas
// Este archivo define la estructura HTML base, los metadatos SEO,
// la configuración PWA y el registro del Service Worker

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Tipografías del sistema proporcionadas por Google Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadatos de la aplicación: título, descripción e íconos
// Next.js los inyecta automáticamente en el <head> de cada página
export const metadata: Metadata = {
  title: 'Abrazar Cerámica',
  description: 'Ecosistema de gestión para talleres de cerámica artesanal',
  icons: {
    icon: '/icon-192.png',        // Ícono estándar (Android/escritorio)
    apple: '/apple-touch-icon.png', // Ícono para dispositivos Apple
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Manifest PWA: define nombre, colores e íconos para la instalación */}
        <link rel="manifest" href="/manifest.json" />
        {/* Color de la barra de estado del navegador móvil */}
        <meta name="theme-color" content="#c4704b" />
        {/* Configuración PWA para dispositivos Apple */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Abrazar Cerámica" />
        {/* Registro del Service Worker para caché offline y comportamiento PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                })
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* children es el contenido de cada página que se renderiza dentro de este layout */}
        {children}
      </body>
    </html>
  );
}

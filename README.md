# Abrazar Cerámica

Ecosistema de Transformación Digital para Talleres de Producción Artesanal.

Trabajo Final de Grado — Seminario Final de Ingeniería en Software — Universidad Siglo 21.

Sistema de información que centraliza la gestión administrativa, garantiza la trazabilidad técnica de piezas en tiempo real y fomenta la creación de comunidades de aprendizaje en talleres de cerámica artesanal, tomando como caso de estudio el taller *Abrazar Cerámica* (Villa Allende, Córdoba).

**Alumna:** Boatti, Martina — Legajo SOF02818

## Acceso a la demo

La aplicación está desplegada y accesible públicamente en:

**https://abrazar-ceramica.vercel.app**

### Usuarios de prueba

Para evaluar el sistema desde ambos roles, se pueden utilizar las siguientes credenciales:

| Rol | Email | Contraseña |
|---|---|---|
| Docente | docente.demo@abrazarceramica.com | Demo2026! |
| Alumno | alumno.demo@abrazarceramica.com | Demo2026! |

> Nota: al iniciar sesión como docente se accede al panel completo de gestión (alumnos, horarios, piezas, avisos, base de conocimiento). Al iniciar sesión como alumno se accede a la vista de autogestión (consulta de piezas propias, horario, avisos y conocimiento técnico).

La aplicación es una PWA: puede agregarse a la pantalla de inicio del celular desde el navegador para una experiencia similar a una app nativa.

## Acceso al vídeo de demostración del prototipo

(https://youtu.be/j8hfIANb3js)

## Tecnologías utilizadas

- **Frontend:** React, Next.js 16, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Notificaciones automáticas:** Telegram Bot API
- **Hosting:** Vercel (arquitectura serverless)
- **PWA:** Service Worker, Web App Manifest

## Código fuente

El código completo del proyecto se encuentra en este repositorio, dentro de la carpeta `app/`. La estructura general es:

```
app/
├── api/                    → Endpoints del servidor (crear alumno, notificaciones, webhook de Telegram)
├── dashboard/              → Panel principal, con vistas separadas para docente y alumno
│   ├── piezas/             → Motor de trazabilidad (flujos, estados, historial)
│   ├── alumnos/            → Gestión de alumnos (solo docente)
│   ├── horarios/           → Horarios, cupos y registro de asistencia
│   ├── avisos/             → Tablón de avisos
│   ├── conocimiento/       → Repositorio de fórmulas y protocolos técnicos
│   └── perfil/             → Perfil de usuario y vinculación con Telegram
├── login/                  → Inicio de sesión
├── recuperar/              → Recuperación de contraseña
└── nueva-password/         → Restablecimiento de contraseña

utils/supabase.ts           → Cliente de conexión a Supabase
middleware.ts               → Protección de rutas según sesión activa
```

## Instructivo de puesta en marcha (instalación local)

Esta sección es para quien desee ejecutar el proyecto en su propio entorno, más allá de la demo pública.

### Requisitos previos

- [Node.js](https://nodejs.org) (versión 18 o superior)
- [Git](https://git-scm.com)
- Cuenta en [Supabase](https://supabase.com) (plan gratuito)
- Bot de [Telegram](https://telegram.org) creado con [@BotFather](https://t.me/botfather) (opcional, solo para notificaciones)

### Pasos

1. **Clonar el repositorio**
```bash
   git clone https://github.com/martinaboatti/abrazar-ceramica.git
   cd abrazar-ceramica
```

2. **Instalar dependencias**
```bash
   npm install
```

3. **Configurar variables de entorno**

   Crear un archivo `.env.local` en la raíz del proyecto:

    NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_publishable_key
    
    SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

    TELEGRAM_BOT_TOKEN=tu_token_del_bot

Estos valores se obtienen desde el panel de Supabase (**Settings → API**) y desde BotFather.

4. **Configurar la base de datos**

   En Supabase, ir a **SQL Editor** y crear las tablas: `usuarios`, `horarios`, `inscripciones`, `clases`, `asistencias`, `flujos`, `estados`, `piezas`, `historial_estados`, `entradas_tecnicas`, `avisos` (el detalle completo del modelo de datos, incluyendo el Diagrama de Entidad-Relación, se encuentra en el documento del TFG). Habilitar Row Level Security en todas las tablas y otorgar permisos a los roles `anon`, `authenticated` y `service_role`.

5. **Ejecutar en modo desarrollo**
```bash
   npm run dev
```
   La aplicación queda disponible en `http://localhost:3000`.

6. **Crear la cuenta de la docente**

   Por diseño de seguridad, no existe un registro público con rol docente. La cuenta debe crearse manualmente desde **Authentication → Users** en Supabase, e insertarse el perfil correspondiente en la tabla `usuarios` con `rol = 'docente'`.

7. **Configurar el webhook de Telegram** *(opcional)*

   Con la aplicación desplegada en una URL pública:

    https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://<tu-dominio>/api/telegram-webhook

8. **Despliegue en producción**

   El proyecto está preparado para desplegarse en Vercel conectando este repositorio y configurando las mismas variables de entorno. Cada `git push` a `main` actualiza automáticamente la versión pública.

## Roles del sistema

- **Docente:** gestión integral del taller — alumnos, horarios y cupos, registro de asistencia, motor de trazabilidad de piezas, avisos generales y base de conocimiento técnico.
- **Alumno:** autogestión — consulta del estado de sus piezas, gestión de su asistencia (cancelación y recuperación), consulta de avisos y del repositorio técnico.
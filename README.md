# Organizador personal inteligente · v4.0

Versión preparada para GitHub Pages y PWA con **sincronización multidispositivo en tiempo real** entre iPhone y Windows mediante Supabase.

## Novedad principal

La app conserva su enfoque local-first y añade una capa de nube opcional:

```text
PWA iPhone ─┐
            ├─ localStorage → Supabase → Realtime
PWA Windows ┘
```

Cada acción responde primero en el dispositivo. La nube se actualiza después, sin bloquear la interfaz. Los cambios recibidos desde el otro dispositivo se aplican automáticamente.

### Se sincroniza

- tareas y recordatorios;
- estados completado/archivado;
- aplazamientos, subtareas y recurrencias;
- categoría, prioridad, energía, duración, fechas y horas;
- ajustes personales básicos;
- eventos externos importados/guardados como contexto.

La interfaz temporal del dispositivo (pantalla actual, animaciones, ayudas ya vistas, etc.) sigue siendo local.

## Antes de publicar

La app funciona sin Supabase, pero la sincronización no se activa hasta configurarlo.

Lee **`CONFIGURACION-SINCRONIZACION.md`** y sigue los pasos. En resumen:

1. crear un proyecto de Supabase;
2. ejecutar `supabase-setup.sql`;
3. configurar el email OTP con `{{ .Token }}`;
4. añadir Project URL + Publishable key a `config.js`;
5. subir estos archivos a GitHub Pages;
6. iniciar sesión primero en el dispositivo que ya contiene tus datos.

## Archivos principales

- `index.html` — interfaz.
- `styles.css` — diseño responsive/PWA.
- `app.js` — lógica local, sincronización y Realtime.
- `config.js` — configuración pública de Google Calendar y Supabase.
- `supabase-setup.sql` — tabla, RLS y Realtime.
- `CONFIGURACION-SINCRONIZACION.md` — guía paso a paso.
- `manifest.webmanifest` — instalación PWA.
- `sw.js` — caché/offline del shell local.

## Arquitectura de sincronización

La v4.0 utiliza una fila `opi_workspaces` por usuario. El contenido de la app se almacena como JSONB y la tabla incluye:

- `user_id`: propietario autenticado;
- `payload`: estado sincronizado;
- `device_id`: dispositivo que realizó el último guardado;
- `revision`: contador gestionado por PostgreSQL;
- `updated_at`: fecha de modificación del servidor.

RLS impide que un usuario acceda a la fila de otro usuario.

## Funcionamiento offline

Si Supabase o Internet no están disponibles, la app sigue usando los datos locales. Los cambios quedan marcados como pendientes y se reintentan cuando vuelve la conexión.

En iOS, el sistema puede suspender conexiones WebSocket cuando la PWA pasa a segundo plano. Al volver a abrirla se realiza un pull silencioso para ponerse al día.

## Pruebas realizadas para v4.0

Antes de empaquetar esta versión se han comprobado:

- sintaxis de `app.js` y `sw.js`;
- apertura/cierre de las capas modales personalizadas;
- flujo de login OTP con cliente Supabase simulado;
- creación de la primera copia cloud;
- envío automático de cambios locales;
- recepción de un cambio Realtime simulado sin recargar;
- persistencia local tras recibir cambios remotos;
- integridad de manifest y referencias de caché.

## Nota sobre conflictos

La v4.0 usa sincronización de espacio de trabajo completo para mantener el producto muy ligero. En el caso poco habitual de editar offline en dos dispositivos al mismo tiempo, el último guardado recibido por el servidor puede prevalecer. Para uso personal normal es suficiente; una versión futura puede evolucionar a sincronización por tarea si hace falta colaboración o concurrencia intensa.

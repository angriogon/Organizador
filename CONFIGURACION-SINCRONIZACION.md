# Configuración de sincronización · Organizador v4.0

La v4.0 puede mantener **las mismas tareas, recordatorios, ajustes y eventos importados** en la PWA de Windows y en la web app añadida a la pantalla de inicio de iPhone.

La app sigue siendo **local-first**: cada cambio se guarda primero en el dispositivo y después se sincroniza con Supabase. Si no hay conexión, puedes seguir usando la app; al volver Internet, intenta enviar los cambios pendientes.

## 1. Crear el proyecto de Supabase

1. Entra en Supabase y crea un proyecto nuevo.
2. Espera a que termine la creación de la base de datos.
3. Guarda estos dos datos del proyecto:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_...` o la clave pública equivalente de tu proyecto)

> La Publishable key está pensada para usarse desde el navegador. **No uses nunca la `service_role` key en GitHub ni en `config.js`.** La seguridad de los datos se realiza con Row Level Security (RLS).

## 2. Crear la tabla y las reglas de seguridad

1. Abre **SQL Editor** en Supabase.
2. Abre el archivo `supabase-setup.sql` incluido en esta versión.
3. Copia todo su contenido, pégalo en el SQL Editor y ejecútalo.

Ese script crea:

- `public.opi_workspaces`: una única fila de datos por usuario.
- RLS: cada usuario solo puede leer y modificar su propia fila.
- Un contador `revision` y `updated_at` gestionados por PostgreSQL.
- La publicación Realtime necesaria para recibir cambios sin recargar.

Puedes volver a ejecutar el SQL si lo necesitas; está preparado para ser idempotente.

## 3. Configurar el acceso por código de email

La app usa un **código OTP** para evitar depender de enlaces mágicos que pueden abrir Safari en vez de la PWA instalada.

1. En Supabase, abre **Authentication → Email Templates**.
2. Edita la plantilla de **Magic Link / OTP**.
3. Haz que el cuerpo incluya `{{ .Token }}`. Un ejemplo sencillo:

```html
<h2>Tu código para Organizador</h2>
<p>Introduce este código en la aplicación:</p>
<p style="font-size:28px;font-weight:700">{{ .Token }}</p>
```

4. Guarda la plantilla.
5. Comprueba que el proveedor **Email** está habilitado en Authentication.

La app acepta códigos de hasta 8 dígitos para ser compatible con la configuración actual del proyecto.

## 4. Añadir las claves públicas a `config.js`

Edita este archivo antes de subirlo a GitHub:

```js
window.OPI_CONFIG = {
  googleClientId: '',
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabasePublishableKey: 'sb_publishable_TU_CLAVE_PUBLICA'
};
```

No necesitas un backend propio ni GitHub Secrets para esas dos variables públicas. **No añadas una service role key.**

## 5. Subir la v4.0 a GitHub Pages

Sube a tu repositorio todo el contenido del ZIP de la v4.0, con `index.html` directamente en la raíz. Mantén también:

- `app.js`
- `styles.css`
- `config.js`
- `manifest.webmanifest`
- `sw.js`
- `supabase-setup.sql`
- los iconos y demás recursos

Espera a que GitHub Pages termine de publicar.

## 6. Primera sincronización: orden recomendado

Este paso es importante para no sustituir accidentalmente los datos que ya tienes.

1. **Empieza en el dispositivo que contiene tus datos reales actuales** (por ejemplo, el iPhone).
2. Abre **Ajustes → Sincronización**.
3. Escribe tu email y pulsa **Enviar código**.
4. Copia el código recibido y pulsa **Entrar**.
5. Si todavía no existe una copia en Supabase, este dispositivo se convierte en la copia inicial de la nube.
6. Después abre la PWA de Windows, entra con **el mismo email** y el mismo procedimiento.
7. Windows descargará la copia existente de la nube.

Cuando un dispositivo se une por primera vez a una nube que ya contiene datos, la app guarda antes una copia local de seguridad en el almacenamiento del navegador y después carga la nube como fuente principal.

## 7. Qué ocurre a partir de ese momento

- Crear, editar, completar, aplazar, archivar o eliminar una tarea guarda el cambio localmente de inmediato.
- Aproximadamente unos cientos de milisegundos después se envía a Supabase.
- El otro dispositivo conectado recibe el cambio mediante Realtime y actualiza su interfaz sin necesidad de recargar.
- Si el iPhone queda suspendido en segundo plano, iOS puede pausar la conexión WebSocket. Al volver a abrir la app, la v4.0 hace una comprobación de la nube para recuperar los cambios que hayan ocurrido mientras estaba suspendida.
- Si pierdes Internet, la app sigue funcionando localmente y vuelve a intentar sincronizar al recuperar conexión.

## 8. Indicadores de estado

En **Ajustes → Sincronización** verás un punto de estado:

- Verde: tiempo real activo y datos sincronizados.
- Ámbar: guardando o comprobando la nube.
- Marrón: sin conexión; cambios pendientes en local.
- Rojo: hubo un error de sincronización.

También tienes el botón **Sincronizar ahora** para forzar una comprobación manual.

## 9. Regla de conflictos de esta versión

La v4.0 utiliza una copia única del espacio de trabajo por usuario y un número de revisión de servidor. Para un uso personal normal funciona muy bien y mantiene la aplicación ligera.

Si **dos dispositivos editan cosas distintas exactamente al mismo tiempo**, el último guardado que llegue al servidor puede convertirse en la copia vigente. Por eso, cuando estés completamente offline en dos dispositivos a la vez, evita hacer cambios extensos en ambos antes de que vuelvan a conectarse.

Una futura evolución puede pasar a sincronización por tarea/registro si se necesita edición simultánea avanzada.

## 10. Si algo no sincroniza

Comprueba, en este orden:

1. `config.js` contiene la URL y la Publishable key correctas.
2. Has ejecutado `supabase-setup.sql` sin errores.
3. Has iniciado sesión con el **mismo email** en iPhone y Windows.
4. Realtime está habilitado en el proyecto y `opi_workspaces` está en la publicación `supabase_realtime` (el SQL intenta hacerlo automáticamente).
5. La plantilla de email contiene `{{ .Token }}` y no solo `{{ .ConfirmationURL }}`.
6. En la app, pulsa **Sincronizar ahora** y observa el mensaje de estado.

## Seguridad

- Los datos no son públicos.
- La tabla tiene RLS activado.
- Las políticas comparan `auth.uid()` con `user_id`.
- Los visitantes sin sesión (`anon`) no tienen permisos sobre la tabla.
- La Publishable key puede estar en el frontend; la `service_role` key no.

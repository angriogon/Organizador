# Organizador personal inteligente · v3.1.2

Revisión de estabilidad para iOS/PWA. Corrige el bloqueo tras pulsaciones largas y versiona físicamente los iconos para que Safari vuelva a leer el Apple Touch Icon.

## Cambios 3.1.2
- La supresión del click sintético de iOS ahora expira automáticamente; ya no puede quedarse activada indefinidamente.
- `pointercancel`, `touchcancel`, pérdida de foco y cierre de sheets liberan el estado táctil.
- Los controles dentro de los menús flotantes permanecen interactivos incluso durante la corta ventana de supresión del click sintético.
- Nuevo `apple-touch-icon-v311.png` de 180x180 y nuevos iconos PWA versionados para evitar la caché agresiva de iOS.
- Service Worker actualizado a una nueva caché `v3.1.2`.


## Novedades 3.1

- Nuevo icono de aplicación integrado en los tamaños PWA 192×192, 512×512 y Apple Touch Icon.
- Inicio móvil bloqueado a una sola pantalla y compactado de forma adaptativa; en iPhone no necesita desplazamiento vertical para las funciones esenciales.
- En pantallas de poca altura se ocultan primero los bloques secundarios (miniagenda y huecos) para conservar carga diaria, Mis 3 y la acción principal.
- Las tareas se pueden **Eliminar** desde su menú de acciones sin completarlas. La eliminación es inmediata pero ofrece **Deshacer** durante unos segundos, igual que el resto de acciones rápidas.
- Se conserva el bloqueo del menú contextual de iOS durante pulsaciones largas, el bloqueo de zoom y el centrado de bottom sheets de 3.0.1.
- Caché PWA renovada a `opi-v3.1-shell-1` para forzar la actualización de los archivos al publicar en GitHub Pages.


Versión 3.0 de la web app: más compacta, más táctil y preparada como PWA real para iPhone y Windows, manteniendo la lógica principal en JavaScript local y sin framework.

## Lo nuevo en 3.0

### Inicio mucho más compacto

- Estado visual del día: `😌 Ligero · 🙂 Equilibrado · 😅 Cargado · 🫠 Sobrecargado`.
- Porcentaje animado y anillo fino de carga, con una barra mínima de apoyo.
- Colores muy suaves que cambian según la carga, sin teñir toda la interfaz.
- **Mis 3 de hoy** como centro de la pantalla: número, tarea, duración y solo señales excepcionales.
- Progreso discreto con tres puntos; al terminar los tres hay una microcelebración breve.
- Una sola recomendación inteligente visible cada vez.
- Inicio adaptable a la hora: arranque por la mañana, progreso a mediodía y cierre al final del día.
- Botón **Empezar** que abre el modo **Ahora** con la siguiente mejor acción.
- Miniagenda con los próximos compromisos realmente relevantes.
- Huecos disponibles calculados a partir de reuniones y tareas con hora.
- Detección previa de un mañana imposible si su carga supera el 110 %.

### Experiencia móvil de una mano

- Navegación inferior fija: **Inicio · Trabajo · Personal · Estudios**.
- Calendario y ajustes quedan como acciones secundarias en la cabecera.
- Botón flotante `+` en la zona natural del pulgar.
- Toque en `+`: nueva tarea.
- Pulsación larga en `+`: **Nueva tarea · Recordatorio · Entrada rápida**.
- Todos los flujos secundarios usan **bottom sheets**: aplazar, dividir, mover, prioridad, energía, ajustes, etc.
- Pulsación larga sobre una tarea: abre sus acciones avanzadas.
- Deslizar a la derecha: completar. Un gesto corto solo revela la acción; uno largo la ejecuta.
- Deslizar a la izquierda: aplazar, con el mismo sistema seguro.
- La ayuda de gestos desaparece automáticamente después de tres usos.

### Seguridad frente a errores

- Completar, aplazar, archivar, mover, crear, editar, dividir y reorganizar pueden deshacerse durante unos segundos.
- Se evita llenar la interfaz de confirmaciones de “¿Seguro?”.
- Las acciones son locales y responden inmediatamente, sin spinners.

### Mi día más inteligente

- **Mis 3 de hoy** se fijan para el día y conservan el progreso aunque completes una de ellas.
- La puntuación combina prioridad, fecha límite, fecha planificada, duración, aplazamientos, hora y contexto del calendario.
- **Siguiente mejor acción** favorece lo urgente y lo que cabe en el hueco real que tienes ahora.
- **Estoy cansada** es un modo temporal de sesión: prioriza tareas cortas y de baja energía y se desactiva al salir de Inicio.
- **Hazme hueco** muestra visualmente `Hoy 112 % → 82 %` y las tareas propuestas para mover, sin modificar sus fechas límite.
- El aplazamiento inteligente ofrece **Mañana · Próximo hueco · Elegir fecha**.
- Cuando una tarea acumula cuatro o más aplazamientos aparece una señal discreta al abrirla, con opciones para dividirla, bajar prioridad, programarla o archivarla.
- **Dividir tarea** guarda entre 2 y 4 pasos dentro de la tarea y muestra el progreso `2/4` solo cuando aporta información.
- **Cierre del día** mantiene el resumen corto: completadas, pendientes y carga de mañana.

### Tareas visualmente limpias

Una tarea normal muestra casi solo su nombre y duración. Solo aparecen metadatos cuando aportan valor:

- punto discreto si la prioridad es alta;
- fecha si está vencida o vence hoy;
- contador si se ha aplazado cuatro o más veces;
- progreso si tiene subtareas;
- hora si es un recordatorio.

La iconografía es un sprite SVG local, consistente y sin dependencias externas. Los emojis se reservan para estados humanos del día.

### Calendario

- Escritorio: calendario mensual por colores.
- Móvil: se prioriza una **agenda del día** con tira semanal; no se comprime una cuadrícula mensual en una pantalla pequeña.
- Colores diferenciados para Trabajo, Vida personal/vivienda, Estudios y eventos externos.
- Miniagenda en Inicio.
- Cálculo de huecos entre las 08:00 y las 21:00 usando eventos con hora y tareas temporizadas.
- Los eventos externos descuentan tiempo de la capacidad real del día.

### Entrada rápida y recordatorios

Mantén pulsado `+` para abrir:

- **Nueva tarea**: formulario completo pero compacto.
- **Entrada rápida**: por ejemplo `Llamar a Laura mañana 18:00 personal prioridad alta 20m`.
- **Recordatorio**: título, fecha, hora y área en un formulario mínimo.

Los recordatorios avisan dentro de la app cuando llega su hora mientras la aplicación está abierta. Una web/PWA estática no puede garantizar notificaciones locales programadas en segundo plano en iOS y Windows sin añadir una infraestructura de push/backend.

## PWA real

La carpeta incluye:

- `manifest.webmanifest`;
- `sw.js` con caché del shell de la aplicación;
- iconos 192×192, 512×512 y Apple Touch Icon;
- `display: standalone`;
- soporte offline para la app principal;
- metadatos específicos para instalación desde iPhone.

### iPhone

En Safari: **Compartir → Añadir a pantalla de inicio**. Apple no permite que una web abra programáticamente ese cuadro con un único clic, por lo que el botón “Instalar Organizador” muestra esas instrucciones cuando detecta iOS.

### Windows

Chrome y Edge pueden mostrar el prompt PWA directamente. Si el navegador expone `beforeinstallprompt`, el botón **Instalar Organizador** lo abre. La aplicación se ejecuta después en modo independiente.

## Bloqueo de zoom

Por requisito de esta versión se bloquea el zoom de la interfaz mediante:

- `minimum-scale=1`, `maximum-scale=1` y `user-scalable=no`;
- prevención de pinch/gesture en iOS;
- prevención de `Ctrl + rueda` dentro de la página;
- prevención de los atajos `Ctrl/Cmd + +`, `-` y `0` cuando el navegador permite interceptarlos;
- prevención del doble toque de zoom.

El navegador o el sistema operativo siempre conservan ciertos controles de accesibilidad propios que una web no puede anular por completo.

## Calendarios externos

### Google Calendar

La integración de la v2 se conserva. Para activarla:

1. Crea un proyecto en Google Cloud.
2. Habilita **Google Calendar API**.
3. Configura la pantalla de consentimiento OAuth.
4. Crea un OAuth 2.0 Client ID de tipo **Web application**.
5. Añade la URL de GitHub Pages como *Authorized JavaScript origin*.
6. Copia únicamente el Client ID en `config.js`.

```js
window.OPI_CONFIG = {
  googleClientId: 'TU_CLIENT_ID.apps.googleusercontent.com'
};
```

No incluyas un `client secret` en GitHub. La librería de Google solo se carga cuando se pulsa sincronizar.

### Apple Calendar / otros

Se mantiene la exportación de tareas en `.ics` y la importación de calendarios `.ics`. Una sincronización bidireccional automática con iCloud requeriría servidor/CalDAV y autenticación, por lo que no forma parte de esta PWA estática.

## Rendimiento

La app mantiene la filosofía ligera:

- HTML + CSS + JavaScript puro;
- cero framework;
- iconos SVG locales;
- microanimaciones basadas principalmente en `transform` y `opacity`;
- `prefers-reduced-motion` desactiva las animaciones no esenciales;
- cálculo de prioridades, huecos, carga, aplazamientos y recomendaciones en local;
- `localStorage` para persistencia;
- Google Identity se carga solo cuando se necesita.

## Persistencia y migración

La 3.0 conserva las claves de almacenamiento de la 2.0 para no perder las tareas ya creadas. Los nuevos datos de interfaz —Mis 3 del día, aprendizaje de gestos y recordatorios mostrados— se guardan aparte en `opi_ui_v3`.

## Probar en local

No hay dependencias que instalar:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`.

> El service worker y la instalación PWA requieren un origen seguro. `localhost` se considera seguro para desarrollo; GitHub Pages usa HTTPS.

## Publicar en GitHub Pages

Sube a la raíz del repositorio:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `manifest.webmanifest`
- `sw.js`
- carpeta `icons/`

Después activa **Settings → Pages → Deploy from a branch → main → /(root)**.

## Archivos

```text
organizador-personal-inteligente-v3/
├── index.html
├── styles.css
├── app.js
├── config.js
├── manifest.webmanifest
├── sw.js
├── README.md
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```


## Corrección 3.0.1 para iOS / PWA

- Bottom sheets centrados con márgenes laterales simétricos y respeto de las safe areas de iPhone.
- Se elimina el menú contextual nativo de copiar/pegar al mantener pulsado sobre la interfaz.
- Los campos de formulario conservan foco, teclado y edición normal.
- Caché PWA incrementada para forzar la actualización de estilos y JavaScript al desplegar esta revisión.


## Corrección 3.1.2 — cierre de paneles en iOS

- El cierre de bottom sheets ya no depende del listener delegado global.
- Los botones X, Cancelar, Cerrar, No mover y equivalentes responden mediante `pointerup` directo dentro del panel.
- Los controles de un modal abierto quedan excluidos de la supresión global del clic usada por swipe/long-press.
- Abrir un sheet libera cualquier supresión residual en lugar de iniciar una nueva.
- Se libera el estado táctil también al cancelar un `<dialog>` desde el sistema.

### Validación de la corrección

Antes de empaquetar 3.1.2 se ejecutaron comprobaciones específicas del cierre de paneles: X/Cancelar/Cerrar sobre tarea, entrada rápida, recordatorio, ajustes y hoja dinámica de acciones, incluyendo el escenario en el que la supresión del clic de un gesto permanece activa. Todos los casos liberan el estado táctil y cierran el panel. También se validaron la sintaxis de `app.js`, el manifest y la versión de caché del Service Worker.

# Organizador personal inteligente · v5.0.2

La v5.0.2 mantiene la filosofía de la aplicación sin romper la sincronización existente:

- **Web / escritorio = Planning Studio** para pensar, equilibrar y revisar la semana.
- **PWA / móvil = Capturar y hacer** con una interfaz más silenciosa, uso con una mano y acceso directo a la siguiente acción.
- **Firebase sigue siendo la fuente compartida** de tareas y estado entre iPhone y Windows.
- La inteligencia principal continúa siendo **local-first**: scoring, estimaciones, agrupación, riesgo y recomendaciones no requieren una API de IA para responder.


## Correcciones v5.0.2

- La pulsación larga del botón `+` mantiene los tres accesos y ahora **Entrada rápida, Recordatorio y Nueva tarea responden de forma directa a eventos táctiles** en iOS/PWA, con `click` como respaldo.
- Se añade un botón **Novedades** en la cabecera, junto a Calendario y Ajustes, con un resumen compacto de los cambios recientes.

## Captura ultrarrápida

La ventana de nueva tarea se ha reducido a lo imprescindible: título, área, duración, fecha y prioridad. El resto queda bajo **Más opciones** y se abre automáticamente al editar una tarea existente.

También se mantiene la entrada natural, por ejemplo:

`comprar bombillas mañana 20m personal baja`

La app puede reconocer fecha, duración, área y prioridad sin una llamada externa. En navegadores compatibles, el botón de micrófono permite dictar la captura; si el navegador no ofrece reconocimiento de voz, la interfaz continúa funcionando con teclado.

## Inteligencia premium integrada

La v5.0 consolida las funciones inteligentes en varios motores ligeros:

- planificación resiliente y reequilibrio semanal;
- capacidad real con margen personal y carga mental;
- duración prevista basada en histórico real;
- riesgo de retraso y tareas bloqueadas por dependencias;
- reducción de cambios de contexto y agrupación de tareas similares;
- Mis 3 y Siguiente acción sensibles a duración, energía, prioridad, hora y carga;
- recurrencias flexibles y perfiles de día;
- detección de tareas antiguas, procrastinación y primera acción pequeña;
- inbox rápido y clasificación sugerida por hábitos previos;
- proyectos/resultados mínimos, sin jerarquías pesadas;
- Planning Studio de siete días, smart lists, riesgo y mapa de capacidad;
- historial de tarea, papelera, backups JSON/CSV y restauración segura;
- conflictos multidispositivo con opción de combinar cambios;
- aprendizaje local de ritmos y estimaciones;
- modo privacidad y bloqueo local; WebAuthn se usa solo cuando el dispositivo/navegador lo permite.

La regla de producto sigue siendo: **como máximo una recomendación importante visible a la vez**.

## PWA 5.0

La experiencia instalada prioriza una mano y ejecución rápida:

- Inicio más compacto;
- isla inferior contextual;
- Modo Ahora;
- swipe, pulsación larga y deshacer;
- atajos del manifest para Nueva tarea, Ahora y Buscar;
- Share Target donde el sistema lo soporte;
- recuperación del contexto al volver;
- safe areas y orientación;
- funcionamiento offline para acciones principales, con sincronización posterior de Firestore.

En Windows se mantienen los atajos de teclado: `N`, `/`, `A`, `T` y `Ctrl+K`.

## Firebase

La configuración existente se conserva. Esta versión usa el mismo proyecto configurado en `config.js` y no requiere crear otro proyecto ni borrar Firestore.

La estructura de datos incorpora **schemaVersion 5** y migración no destructiva. Actualizar los archivos de GitHub no elimina las tareas guardadas en Firestore.

Para una primera instalación nueva, consulta `CONFIGURACION-FIREBASE.md` y publica las reglas incluidas en `firestore.rules`.

## Actualizar desde v4.x

1. Conserva tu proyecto Firebase actual.
2. Sustituye en GitHub el contenido de la versión anterior por el contenido de este ZIP.
3. Comprueba que `index.html` queda en la raíz del repositorio.
4. Espera a que GitHub Pages publique la nueva versión.
5. Cierra y vuelve a abrir la PWA. El Service Worker usa una caché nueva de v5.0.2.

Los datos sincronizados no se borran. Las preferencias puramente locales del dispositivo pueden evolucionar de forma independiente.

## Compatibilidad progresiva

Algunas capacidades dependen del navegador o sistema operativo, por ejemplo reconocimiento de voz, WebAuthn, Share Target, vibración o determinados comportamientos de instalación PWA. En esos casos la v5.0 aplica **degradación elegante**: la función opcional se oculta o usa una alternativa, pero nunca bloquea la gestión de tareas.

## Archivos principales

- `index.html` — interfaz.
- `styles.css` — diseño responsive/PWA.
- `app.js` — lógica, inteligencia local y sincronización.
- `config.js` — configuración Firebase existente.
- `sw.js` — Service Worker/offline.
- `manifest.webmanifest` — instalación PWA y accesos rápidos.
- `firestore.rules` — reglas de seguridad de Firestore.

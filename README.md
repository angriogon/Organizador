# Organizador personal inteligente · v6.0

La v6.0 mantiene la filosofía de la aplicación sin romper la sincronización existente:

- **Web / escritorio = Planning Studio** para pensar, equilibrar y revisar la semana.
- **PWA / móvil = Capturar y hacer** con una interfaz más silenciosa, uso con una mano y acceso directo a la siguiente acción.
- **Firebase sigue siendo la fuente compartida** de tareas y estado entre iPhone y Windows.
- La inteligencia principal continúa siendo **local-first**: scoring, estimaciones, agrupación, riesgo y recomendaciones no requieren una API de IA para responder.


## Novedades v6.0

- Duración realmente opcional en Trabajo, Personal y Estudios; internamente se guarda como `null` cuando no se estima.
- Al completar una tarea sin estimación, la app pregunta de forma no bloqueante el tiempo real empleado, con presets rápidos y opción de omitir.
- Las tareas divididas avanzan paso a paso; el último toque completa la tarea y el progreso queda visible.
- Undo temporal de 5 segundos, con pausa al interactuar y stack limitado.
- Sistema de overlays unificado con estados opening/open/closing/closed, bloqueo de scroll, restauración de foco, Escape consistente y protección anti ghost-click.
- Protección anti doble ejecución en guardado, entrada rápida, recordatorios y acciones sensibles.
- Búsqueda con debounce e índice local cacheado; orden más determinista.
- Sincronización incremental endurecida con sanitización central, limpieza de listeners y reintentos con backoff.
- Registro local de errores, botón Copiar diagnóstico y versión/esquema visibles.
- Mejoras de accesibilidad y PWA: hitboxes mínimas, focus visible, reduced motion, visualViewport, safe areas, feature detection y flujo de actualización del Service Worker.
- `schemaVersion 6`, con normalización compatible de tareas existentes y sin cambios destructivos en Firebase.

## Base funcional v6.0

- **Novedades premium**: el historial de cambios se presenta ahora con una tarjeta principal, tres mejoras destacadas y un historial compacto de versiones anteriores.
- **Planificación de fin de semana en Windows PWA**: los sábados y domingos aparece `Dejar planificada la semana próxima` en Planning Studio. Permite escoger el día de la semana siguiente, crear tareas directamente agendadas y distribuir pendientes sin fecha según la carga. Mientras la sesión está activa, las nuevas tareas quedan planificadas para el día seleccionado salvo que indiques expresamente otra fecha.
- **Enfoque Trabajo en Windows PWA**: desde el área Trabajo se puede definir un horario local (por defecto 09:00–17:00). De lunes a viernes, durante esa franja la PWA se restringe automáticamente a Trabajo y recupera la interfaz normal al terminar. El horario es local al dispositivo y puede pausarse por el resto del día.
- Firebase, Firestore y `schemaVersion 6` se mantienen sin cambios destructivos.

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
5. Cierra y vuelve a abrir la PWA. El Service Worker usa una caché nueva de v6.0.

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


## 6.0 · Stability & Polish

Versión centrada en robustez: duración opcional y tiempo real al completar, tareas por pasos, overlays unificados, protección de gestos/doble ejecución, Undo temporal, toasts en cola, sincronización incremental más resistente, diagnóstico local, accesibilidad, dark mode y auditoría PWA.

## Consolidación técnica 6.0

La 6.0 separa el núcleo determinista (`core.js`) y la detección de plataforma (`platform.js`) del coordinador principal. El esquema de datos continúa en 6 y la configuración/rutas Firebase no cambian. Se añade `ARCHITECTURE.md` y una regresión local reproducible en `tests/core-regression.js`.

Para ejecutar la regresión del núcleo con Node.js:

    node tests/core-regression.js

La modularización es deliberadamente progresiva: no se ha reescrito sincronización, tareas o Planning Studio de una sola vez para evitar introducir pérdida de datos o regresiones de interacción.


## 6.0 · correcciones de la auditoría física
- Check de completar: hitbox accesible de 44 px con círculo visual de 20 px.
- Toast de actualización iOS: corregido el conflicto `top` + `bottom` que podía estirarlo verticalmente.
- Añadir desde Trabajo/Personal/Estudios fija el destino y oculta Área; el `+` general mantiene la elección libre.
- Diagnóstico: copia robusta con fallback para Safari/iOS y navegadores con Clipboard API restringida.
- Menú de pulsación larga del `+`: se cierra en `pointerdown` fuera del menú.
- Planning Studio: semana anterior/siguiente/actual y cargas históricas con tareas completadas.
- Ajustes: agrupación visual en tarjetas y jerarquía más consistente.


### 6.0 · Daily-use foundation
- ADE Core: unified DayState, dynamic capacity, elapsed-time awareness, temporal priority, decomposed risk, robust duration prediction, confidence and formal task states.
- Inclusive labels: “Estoy cansado/a” and “Hoy voy justo/a”.
- Completion control redesigned with a compact rounded-square mark and independent 44px hit target.
- Full reset strengthened: clears tasks, history, learning, UI memory, drafts, local app diagnostics and synced task data while preserving the login account.


## 6.0.1 · ADE Adaptation
- Señales diarias persistentes para cansancio, día ajustado, ausencia y cierre del día.
- Replanificación del sistema separada de los aplazamientos voluntarios.
- La carga ejecutada se atribuye al día real de ejecución, aunque la tarea estuviera prevista para otro día.
- Aprendizaje de capacidad con días históricos limpios; los días anómalos no contaminan las predicciones.
- Inicio disponible durante Work Focus, tareas de escritorio más compactas, Undo/toasts reajustados y Ajustes en acordeón.
- Protección reforzada frente a click-through al cerrar hojas en iOS.


## 6.0.5 · Visual calm
- Ajustes convertidos en índice compacto.
- Cabecera PWA iOS opaca y nítida.
- Calendario táctil reforzado.
- Captura rápida centrada y compacta hasta abrir Más opciones.
- Filas de tareas más densas en iOS y Windows.
- Pulsar Inicio cuando ya está activo no fuerza un render visible.

## 6.0.5 · iOS interaction polish

- Cabecera PWA iOS totalmente opaca y aislada de capas con blur/composición.
- Cierre de overlays con cuarentena de puntero para impedir click-through sobre controles inferiores.
- Captura rápida ajustada al contenido; el formulario solo crece al abrir Más opciones.
- Ajustes rediseñado como índice silencioso con controles compactos y una única sección abierta.

## 6.0.5 · Ajustes de mínima intervención
- Sustituye el acordeón de Ajustes por una portada tipo iOS con seis destinos: Tu día, Apariencia, Sincronización, Privacidad y seguridad, Datos y copias y Aplicación.
- Cada destino abre una vista de detalle enfocada y conserva los controles, IDs y persistencia existentes.
- La portada muestra resúmenes breves (capacidad/perfil, apariencia y estado de sincronización) sin exponer formularios completos.

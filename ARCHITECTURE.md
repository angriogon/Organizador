# Arquitectura OPI · v6.0

La rama 6.0 fija la dirección definitiva de Organizador: **capturar → planificar → hacer → adaptar**. Esta RC conserva el esquema de datos 6 y las rutas Firebase para que la actualización desde 5.x sea no destructiva.

## Capas actuales
- `core.js`: fechas, duración, recurrencias, normalización y contrato de datos determinista.
- `platform.js`: capacidades y diferencias iOS / PWA Windows.
- `app.js`: coordinador funcional legado que se irá reduciendo por extracción segura.
- `sw.js`: shell offline versionado y actualización de la PWA.

## Reglas 6.0
1. Ninguna migración borra la fuente anterior en el primer arranque.
2. Cada bug reproducido debe generar una prueba de regresión.
3. Los controles mantienen hitbox ≥44 px, aunque su representación visual pueda ser menor.
4. Los overlays, gestos, foco, toasts y Undo convergerán en gestores únicos.
5. La UI no debe escribir directamente en Firebase en la arquitectura final; Repository y Sync Engine serán la frontera.
6. iOS es Action Companion; Windows/Web es Planning Studio. Los datos son los mismos, la densidad de interfaz no tiene por qué serlo.

## Siguiente consolidación segura
Extraer por etapas `tasks/`, `sync/`, `ui/overlays`, `ui/gestures` y `planning/`, acompañando cada extracción de tests. La migración de datos locales a IndexedDB se hará mediante copia + validación + fallback, nunca borrando `localStorage` automáticamente en la primera migración.


## Adaptive Day Engine · 6.0
6.0 consolidates the first unified deterministic ADE core: `getDayState()`, dynamic remaining capacity, robust median-based duration prediction, temporal priority, decomposed risk, confidence and formal task states. Existing screens progressively consume this shared core; no remote AI is required.

## ADE Adaptation (6.0.1)
Las señales de cansancio, capacidad reducida, ausencia y cierre alimentan el DayState. Las replanificaciones automáticas no incrementan el contador de aplazamientos. El aprendizaje histórico ignora días marcados como anómalos y la carga realizada se contabiliza por fecha real de ejecución.

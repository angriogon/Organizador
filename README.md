# Organizador personal inteligente · v2

Web app estática, rápida y minimalista para organizar trabajo, vida personal/vivienda y estudios. Está pensada para funcionar directamente en GitHub Pages, sin framework ni backend obligatorio.

## Qué incluye esta versión

- **Inicio compacto** con saludo, porcentaje de carga, estado humano y emoji: Día ligero, Equilibrado, Cargado o Sobrecargado.
- **Mis 3 de hoy** automáticos mediante una puntuación local que combina prioridad, fecha límite, fecha planificada, duración y número de aplazamientos.
- **Mi día inteligente**: cuando hay sobrecarga aparece **Hazme hueco**, que propone qué tareas mover y a qué día para volver a una carga razonable.
- **Aplazamiento inteligente**: Mañana, Próximo hueco o Elegir fecha. La fecha límite no se modifica al aplazar.
- **Tengo 15 min / 30 min / 1 h** para encontrar tareas que encajan en un hueco real.
- **Energía necesaria** por tarea: baja, normal o alta; con filtro rápido “Estoy cansada”.
- **Detector de aplazamientos**: al llegar a 4 aplazamientos propone dividir, bajar prioridad, programar o archivar.
- **Dividir tarea** en 2–4 pasos sin IA y sin peticiones externas.
- **Cierre del día** en segundos: completadas, pendientes, carga de mañana y acciones para mover, buscar hueco o archivar.
- **Entrada rápida en lenguaje natural**, por ejemplo: `Llamar a Laura mañana 18:00 personal alta 20m`.
- **Calendario mensual** con tareas por colores y eventos externos en un cuarto color neutro.
- **Calendario como contexto**: los eventos importados/sincronizados restan tiempo de la capacidad diaria disponible.
- **Google Calendar opcional** mediante OAuth desde el navegador.
- **Apple Calendar / iOS** mediante exportación `.ics` e importación de calendarios `.ics`.
- Persistencia local con `localStorage` y migración básica de los datos de la v1.
- Cero dependencias para las funciones principales. La librería de Google solo se carga cuando se pulsa sincronizar.

## Capacidad diaria

La capacidad base por defecto es **7 h 30 min (450 min)** y puede cambiarse en Ajustes. Si el calendario tiene, por ejemplo, 5 h de reuniones, quedan 2 h 30 min disponibles para tareas. La carga se calcula con las duraciones de las tareas agendadas ese día.

Estados orientativos:

- hasta 35 % → 😌 Día ligero
- 36–70 % → 🙂 Equilibrado
- 71–100 % → 😅 Cargado
- más de 100 % → 🫠 Sobrecargado

## Google Calendar: configuración única

Una web en GitHub Pages no puede acceder a Google Calendar sin autorización OAuth del usuario. Para activar el botón:

1. Crea un proyecto en Google Cloud.
2. Habilita **Google Calendar API**.
3. Configura la pantalla de consentimiento OAuth.
4. Crea un **OAuth 2.0 Client ID** de tipo **Web application**.
5. Añade como *Authorized JavaScript origin* la URL de tu GitHub Pages.
6. Copia el Client ID en `config.js`:

```js
window.OPI_CONFIG = {
  googleClientId: 'TU_CLIENT_ID.apps.googleusercontent.com'
};
```

No pongas un `client secret` en el repositorio. La app usa solo el scope de lectura `calendar.events.readonly` y carga los eventos como contexto para la capacidad diaria.

## Apple Calendar / iOS

Los navegadores no tienen permiso para leer o sincronizar automáticamente el calendario privado del sistema iOS. Por eso esta versión ofrece el mecanismo web seguro: **exportar las tareas en `.ics`** para abrirlas en Apple Calendar, e **importar `.ics`** para usar eventos externos como contexto.

Una sincronización bidireccional automática con iCloud requeriría una arquitectura distinta (servidor/CalDAV y autenticación), por lo que no se incluye en esta versión estática.

## Probar en local

No hay instalación de paquetes.

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`.

## Publicar en GitHub Pages

Sube estos archivos a la raíz del repositorio:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`

Después: **Settings → Pages → Deploy from a branch → main → /(root)**.

## Rendimiento

Toda la lógica de tareas, puntuación, carga, recomendaciones, parser, filtros, cierre del día y calendario interno se ejecuta en JavaScript local. No hay framework, base de datos ni IA generativa en el camino crítico. Google Identity solo se descarga si el usuario decide conectar Google Calendar.

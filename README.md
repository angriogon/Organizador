# Organizador personal inteligente

MVP de una web app minimalista para organizar tareas personales, laborales y de estudios.

## Funciones incluidas

- Tres menús flotantes para filtrar por Personal, Trabajo y Estudios.
- Prioridad baja, media o alta.
- Fechas límite.
- Recordatorios/tareas recurrentes: diario, semanal o mensual.
- Vista **Hoy** que prioriza vencidas, tareas de hoy y tareas de alta prioridad sin fecha.
- Botón **Aplazar +1 día** sin abrir el editor.
- Indicador de carga diaria con capacidad orientativa de 8 puntos.
- Persistencia local mediante `localStorage`.
- Diseño responsive, claro, redondeado y minimalista.

## Cómo probarlo

No necesita instalación ni dependencias.

1. Descarga o clona el repositorio.
2. Abre `index.html` en el navegador.

Para evitar restricciones de algunos navegadores al abrir archivos locales, también puedes usar un servidor local sencillo:

```bash
python -m http.server 8000
```

Después abre `http://localhost:8000`.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube `index.html`, `styles.css` y `app.js` a la rama `main`.
3. En el repositorio entra en **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Elige `main` y la carpeta `/ (root)`.
6. Guarda los cambios.

GitHub generará la URL pública de la app.

## Siguiente evolución recomendada

- Edición de tareas.
- Vista calendario.
- Etiquetas personalizadas.
- Notificaciones reales del navegador.
- Sincronización con una base de datos / login.
- PWA para instalarla en móvil.
- Arrastrar y soltar tareas entre días.

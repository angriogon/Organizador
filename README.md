# Organizador personal inteligente · v4.1

Versión preparada para GitHub Pages y PWA con **sincronización en tiempo real entre iPhone y Windows mediante Firebase Authentication + Cloud Firestore**.

## Qué cambia en v4.1

- Se elimina la dependencia de Supabase, SMTP y códigos OTP.
- Acceso simple mediante **email + contraseña**.
- Sin dominio propio: GitHub Pages sigue alojando la PWA.
- Cada tarea se sincroniza como un documento independiente en Firestore.
- `onSnapshot` actualiza los otros dispositivos en tiempo real mientras están activos.
- Persistencia local de Firestore para trabajar sin conexión y reenviar cambios cuando vuelva Internet.
- Los datos existentes del primer dispositivo pueden convertirse en la copia inicial de Firebase.
- Reglas de seguridad incluidas en `firestore.rules`.

## Configuración

Lee **`CONFIGURACION-FIREBASE.md`**. La guía explica pantalla por pantalla:

1. crear el proyecto Firebase;
2. registrar la Web App;
3. copiar `firebaseConfig` a `config.js`;
4. activar Email/Password;
5. autorizar el dominio `github.io`;
6. crear Cloud Firestore Standard;
7. publicar `firestore.rules`;
8. hacer la primera migración desde iPhone o Windows;
9. conectar el segundo dispositivo.

## Archivos principales

- `index.html` — interfaz.
- `styles.css` — diseño responsive/PWA.
- `app.js` — lógica local, tareas, gestos, Firebase y calendarios.
- `config.js` — configuración pública de Firebase y Google Calendar opcional.
- `firestore.rules` — reglas de seguridad para aislar los datos de cada cuenta.
- `manifest.webmanifest` — PWA.
- `sw.js` — shell offline y actualización de la aplicación.
- `icons/` — iconos PWA/iOS/Windows.

## Arquitectura de sincronización

```text
iPhone PWA                           Windows PWA
    │                                    │
    ├─ estado local                      ├─ estado local
    │                                    │
    └────────── Cloud Firestore ─────────┘
                  │
             onSnapshot
                  │
          Firebase Authentication
```

Los documentos se guardan bajo el UID autenticado:

```text
users/{uid}/tasks/{taskId}
users/{uid}/meta/main
```

Las reglas impiden que una cuenta acceda al UID de otra.

## Primera migración

Inicia sesión o crea la cuenta **primero en el dispositivo que ya contiene tus datos correctos**. Si la nube todavía está vacía, v4.1 sube esa copia local. El segundo dispositivo descarga la nube al iniciar sesión con la misma cuenta.

Antes de reemplazar una copia local por una nube ya existente, la app guarda una copia de seguridad interna en `localStorage`.

## Conflictos

Cada tarea es independiente. Si editas tareas distintas simultáneamente, ambos cambios pueden convivir. Si dos dispositivos modifican exactamente la misma tarea antes de recibir el cambio del otro, Firestore aplica la última escritura recibida para ese documento.

## Firebase SDK

La app carga Firebase solo cuando `config.js` contiene una configuración válida. La versión usada por v4.1 es Firebase JS SDK **12.18.0** mediante los paquetes compat oficiales de `gstatic`, para conservar la arquitectura JavaScript actual sin añadir un bundler.

## GitHub Pages

Sube el contenido del ZIP directamente a la raíz del repositorio y comprueba que `index.html` quede en la raíz. No necesitas Firebase Hosting.

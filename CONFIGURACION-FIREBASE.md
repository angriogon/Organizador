# Configuración exacta de Firebase · Organizador v4.1

Esta versión usa **Firebase Authentication + Cloud Firestore** para que la web app añadida a la pantalla de inicio del iPhone y la PWA de Windows compartan las mismas tareas en tiempo real.

No necesitas comprar un dominio, configurar SMTP, DKIM ni Resend. GitHub Pages sigue alojando la aplicación.

---

## Antes de empezar

Ten a mano:

- tu cuenta de Google;
- el nombre de tu repositorio de GitHub;
- la URL de GitHub Pages de la app, por ejemplo `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.

La configuración de Firebase que se copia a `config.js` es la configuración pública de una **Web App**. No copies nunca una service account ni claves privadas a GitHub.

---

# PANTALLA 1 · Crear el proyecto Firebase

1. Abre **Firebase Console**: `https://console.firebase.google.com/`.
2. Pulsa **Create a project / Crear un proyecto**.
3. Pon un nombre. Ejemplo: `organizador-personal-inteligente`.
4. Si te pregunta por Google Analytics, para esta app puedes dejarlo **desactivado**. No es necesario para sincronizar.
5. Pulsa **Create project / Crear proyecto** y espera a que termine.
6. Entra en el proyecto.

---

# PANTALLA 2 · Registrar la Web App

1. En la página principal del proyecto, pulsa el icono **Web `</>`**. Si no aparece, abre **Project settings / Configuración del proyecto → General** y baja hasta **Your apps / Tus apps**.
2. En **App nickname / Alias de la app**, pon por ejemplo: `Organizador Web PWA`.
3. **NO marques Firebase Hosting**, porque la app se seguirá publicando en GitHub Pages.
4. Pulsa **Register app / Registrar app**.
5. Firebase mostrará un bloque llamado **firebaseConfig** parecido a este:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "organizador-xxxxx.firebaseapp.com",
  projectId: "organizador-xxxxx",
  storageBucket: "organizador-xxxxx.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

6. **Copia esos seis valores**. No necesitas `measurementId` aunque Firebase lo muestre.

No cierres esta información hasta haber rellenado `config.js`.

---

# PANTALLA 3 · Rellenar `config.js`

En el ZIP v4.1 abre el archivo `config.js` con un editor de texto.

Verás:

```js
window.OPI_CONFIG = {
  googleClientId: '',
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
```

Copia cada valor de Firebase en su campo correspondiente. Ejemplo:

```js
window.OPI_CONFIG = {
  googleClientId: '',
  firebase: {
    apiKey: 'AIzaSyXXXXXXXX',
    authDomain: 'organizador-xxxxx.firebaseapp.com',
    projectId: 'organizador-xxxxx',
    storageBucket: 'organizador-xxxxx.firebasestorage.app',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abcdef123456'
  }
};
```

Guarda `config.js`.

**No añadas** una service account, `private_key`, contraseña ni secreto de servidor.

---

# PANTALLA 4 · Activar Authentication con email y contraseña

1. En Firebase Console abre el menú izquierdo.
2. Ve a **Security → Authentication**.
3. Pulsa **Get started / Comenzar** si aparece.
4. Abre la pestaña **Sign-in method / Método de acceso**.
5. Pulsa **Email/Password / Correo electrónico y contraseña**.
6. Activa **Email/Password**.
7. Deja **Email link (passwordless sign-in)** desactivado. No lo necesitamos.
8. Pulsa **Save / Guardar**.

La app utiliza una contraseña normal, así que no necesitas SMTP ni códigos OTP.

### Política de contraseña

En **Authentication → Settings / Configuración → Password policy / Política de contraseña** puedes dejar la política predeterminada. Firebase admite un mínimo predeterminado de 6 caracteres y la app v4.1 también exige al menos 6.

---

# PANTALLA 5 · Añadir el dominio de GitHub Pages a Authentication

1. Sigue en **Security → Authentication**.
2. Abre **Settings / Configuración**.
3. Busca **Authorized domains / Dominios autorizados**.
4. Pulsa **Add domain / Añadir dominio**.
5. Añade **solo el host**, sin `https://`, sin rutas y sin `/` final.

Ejemplo, si tu app es:

`https://angel123.github.io/organizador/`

el dominio a añadir es:

`angel123.github.io`

6. Guarda.

No necesitas un dominio propio. `github.io` es suficiente para esta app.

---

# PANTALLA 6 · Crear Cloud Firestore

1. En el menú izquierdo abre **Databases & Storage → Firestore**.
2. Pulsa **Create database / Crear base de datos**.
3. Si te deja elegir edición, selecciona **Standard edition / Edición Standard**.
4. Usa la base de datos predeterminada `(default)` si te pregunta el ID.
5. Selecciona una ubicación. Para uso desde España, elige una ubicación europea cercana. **La ubicación no se puede cambiar fácilmente después**, así que elígela con calma.
6. Cuando pregunte por las reglas iniciales, selecciona **Production mode / Modo de producción**. Inicialmente bloqueará el acceso y en el siguiente paso pondremos nuestras reglas correctas.
7. Pulsa **Create / Crear**.

---

# PANTALLA 7 · Pegar las reglas de seguridad

El ZIP incluye `firestore.rules`.

1. En Firebase Console abre **Databases & Storage → Firestore**.
2. Entra en la pestaña **Rules / Reglas**.
3. Borra el contenido actual.
4. Copia TODO el contenido de `firestore.rules`:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Pulsa **Publish / Publicar**.

Estas reglas son esenciales: cada cuenta solo puede leer y modificar los documentos que están dentro de su propio UID.

---

# PANTALLA 8 · No tienes que crear colecciones manualmente

No crees `users`, `tasks` ni documentos a mano en Firestore.

Cuando inicies sesión desde la app por primera vez, v4.1 creará automáticamente una estructura similar a:

```text
users
└── UID_DE_TU_CUENTA
    ├── tasks
    │   ├── ID_TAREA_1
    │   ├── ID_TAREA_2
    │   └── ...
    └── meta
        └── main
```

Cada tarea es un documento independiente. Esto permite que completar una tarea en el iPhone no reescriba todo el organizador de Windows.

---

# PANTALLA 9 · Subir v4.1 a GitHub

1. Descomprime `organizador-personal-inteligente-v4.1-github.zip`.
2. Edita `config.js` con tus datos de Firebase **antes** de subirlo.
3. En tu repositorio GitHub elimina los archivos antiguos de la versión anterior o sustitúyelos todos por los del ZIP.
4. Sube **el contenido del ZIP**, dejando `index.html` directamente en la raíz.
5. Comprueba que estén al menos:

```text
index.html
app.js
styles.css
config.js
sw.js
manifest.webmanifest
firestore.rules
icons/
```

6. Haz commit.
7. Si todavía no tienes Pages activado: **Repository → Settings → Pages → Deploy from a branch → main / root**.
8. Espera a que GitHub Pages publique la actualización.

---

# PANTALLA 10 · Primera conexión: hazla en el dispositivo que tiene tus datos buenos

Este paso es importante para migrar tus tareas actuales.

Si tus tareas reales están ahora mismo en el iPhone:

1. Publica v4.1 en GitHub Pages.
2. Abre primero la app en el **iPhone**.
3. Entra en **Ajustes → Sincronización**.
4. Escribe tu email.
5. Escribe una contraseña de al menos 6 caracteres.
6. Pulsa **Crear cuenta**.
7. Espera a que el estado cambie a **Todo sincronizado / Sincronización en tiempo real activa**.

Como Firebase estará vacío, ese primer dispositivo subirá automáticamente las tareas que ya tenía guardadas localmente.

---

# PANTALLA 11 · Conectar Windows

1. Abre la PWA de Windows actualizada a v4.1.
2. Ve a **Ajustes → Sincronización**.
3. Escribe **el mismo email**.
4. Escribe **la misma contraseña**.
5. Pulsa **Entrar**.

La app detectará que Firebase ya contiene datos y descargará las tareas del iPhone.

A partir de ese momento:

- crear una tarea en Windows aparece en iPhone;
- completar una tarea en iPhone se refleja en Windows;
- aplazar, editar, dividir, archivar o eliminar también se sincroniza;
- los ajustes y los eventos externos del organizador se comparten mediante el documento `meta/main`.

Si iOS ha suspendido completamente la PWA en segundo plano, no puede mantener JavaScript activo permanentemente. Al volver a abrirla, Firestore recupera las novedades y continúa la sincronización.

---

# PANTALLA 12 · Verificar que funciona

Haz esta prueba con ambos dispositivos abiertos:

1. En Windows crea una tarea llamada `Prueba sincronización`.
2. Espera unos instantes.
3. Comprueba que aparece en el iPhone sin recargar.
4. Márcala como completada desde el iPhone.
5. Comprueba que Windows se actualiza.
6. Crea otra tarea con el iPhone sin conexión, vuelve a activar Internet y comprueba que termina apareciendo en Windows.

En Firebase Console también puedes abrir **Firestore → Data / Datos** y comprobar que aparecen documentos dentro de `users/{tu-uid}/tasks`.

---

# Qué significan los estados de sincronización de la app

- **Verde**: conectada y escuchando cambios de Firestore.
- **Ámbar**: está guardando o comprobando cambios.
- **Marrón**: el dispositivo está sin conexión; los cambios quedan en caché para sincronizarse después.
- **Rojo**: hay un error de configuración, autenticación o reglas.

El botón **Sincronizar ahora** fuerza una comprobación contra el servidor cuando hay conexión.

---

# Si aparece un error

## “Este dominio no está autorizado”

Ve a **Authentication → Settings → Authorized domains** y comprueba que has añadido `TU-USUARIO.github.io` sin `https://` y sin la ruta del repositorio.

## “Firestore ha rechazado el acceso” / permission-denied

Ve a **Firestore → Rules**, vuelve a pegar `firestore.rules` y pulsa **Publish**.

## “Firebase no está configurado”

Revisa `config.js`. Los campos `apiKey`, `authDomain`, `projectId` y `appId` no pueden estar vacíos.

## La otra PWA no cambia instantáneamente

Comprueba:

1. que ambas usan el mismo email;
2. que ambas están online;
3. que la versión publicada es v4.1;
4. que Firestore Rules están publicadas;
5. cierra y vuelve a abrir la PWA para que el Service Worker cargue la nueva versión si venías de v4.0/v3.x.

## He instalado la PWA antes de actualizar

En iPhone cierra completamente la web app y vuelve a abrirla. Si siguiera anclada a archivos antiguos, elimina el acceso de pantalla de inicio y añádelo de nuevo una vez. En Windows, cierra completamente la PWA y vuelve a abrirla; si fuera necesario, reinstálala.

---

# Archivos que NO debes subir nunca a GitHub

Esta v4.1 no necesita ninguno de estos archivos, pero si algún día Firebase te los ofrece para un servidor, no los publiques:

- service-account JSON;
- claves privadas;
- `private_key`;
- contraseñas;
- secretos OAuth de servidor.

El objeto `firebaseConfig` de una Web App sí se coloca en el cliente. La protección de los datos depende de Authentication y de `firestore.rules`.

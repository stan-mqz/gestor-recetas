# 🍳 Gestor de Recetas

Aplicación web para guardar y organizar recetas de cocina. Está hecha con TypeScript siguiendo el patrón MVC y guarda los datos en el `localStorage` del navegador.

## Funcionalidades

- Registrar recetas con nombre, ingredientes y tiempo de preparación.
- Buscar por nombre o ingrediente.
- Marcar recetas como favoritas.
- Editar y eliminar recetas.
- Filtrar por tiempo de preparación.
- Los datos se conservan al cerrar o recargar la página.

## Cómo correr el proyecto

### Opción 1: solo abrirlo

El proyecto ya incluye la versión compilada en `dist/app.js`, así que no hace falta instalar nada. Abre `index.html` con doble clic o desde la terminal:

```bash
xdg-open index.html      # Linux
open index.html          # macOS
start index.html         # Windows
```

### Opción 2: compilarlo desde el código fuente

Necesitas [Node.js](https://nodejs.org) 18 o superior.

1. Instala las dependencias (solo la primera vez):

   ```bash
   npm install
   ```

2. Compila el proyecto:

   ```bash
   npm run build
   ```

3. Abre `index.html` en el navegador.

## Cómo modificarlo

El código fuente está en `src/`. El navegador no lee esos archivos directamente: carga `dist/app.js`, que se genera a partir de ellos. Por eso, después de cambiar algo en `src/` hay que recompilar y recargar la página.

| Comando | Qué hace |
|---|---|
| `npm run build` | Revisa los tipos y genera `dist/app.js`. |
| `npm run dev` | Regenera `dist/app.js` cada vez que guardas un archivo. No revisa tipos. |
| `npm run typecheck` | Solo revisa los tipos, sin generar nada. |

Los cambios en `index.html` y `css/styles.css` no necesitan compilación; basta con recargar la página.

## Cómo usarlo

1. **Registrar:** llena el formulario y pulsa "Registrar receta". Los ingredientes se separan con comas o saltos de línea, y el tiempo va en minutos.
2. **Buscar:** escribe en el buscador; busca en el nombre y en los ingredientes, sin distinguir tildes ni mayúsculas.
3. **Filtrar:** elige un rango de tiempo en el selector o marca "Solo favoritas".
4. **Favorita:** haz clic en la estrella de una tarjeta. Las favoritas aparecen primero.
5. **Editar:** pulsa "Editar", cambia los datos en el formulario y pulsa "Guardar cambios".
6. **Eliminar:** pulsa "Eliminar" y confirma.

Mientras no haya recetas registradas, la lista muestra el mensaje "Aún no tienes recetas".

## Estructura del proyecto

```
gestor-recetas/
├── index.html                      Página principal
├── css/styles.css                  Estilos
├── src/
│   ├── app.ts                      Punto de entrada: conecta las piezas
│   ├── models/Receta.ts            Modelo: datos y validación de una receta
│   ├── views/RecetaView.ts         Vista: tarjetas, formulario y mensajes
│   ├── controllers/RecetaController.ts   Controlador: CRUD y filtros
│   └── services/StorageService.ts  Persistencia en localStorage
├── dist/app.js                     Código compilado que carga el navegador
├── package.json                    Dependencias y comandos
└── tsconfig.json                   Configuración de TypeScript
```

El modelo no conoce el HTML y la vista no conoce `localStorage`; el controlador es quien recibe las acciones del usuario, actualiza los datos y le indica a la vista qué mostrar.

## Dónde se guardan los datos

Las recetas se guardan en el `localStorage` del navegador bajo la clave `gestor-recetas`. Eso significa que:

- Los datos son propios de cada navegador y de cada equipo.
- Se pierden si borras los datos de navegación.

Para empezar de cero, abre las herramientas de desarrollador (F12), ve a Application → Local Storage (en Firefox, Storage → Local Storage), borra la clave `gestor-recetas` y recarga la página. La lista quedará vacía.

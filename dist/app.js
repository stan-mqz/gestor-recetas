"use strict";
(() => {
  // src/models/Receta.ts
  var Receta = class _Receta {
    id;
    nombre;
    ingredientes;
    tiempo;
    // minutos
    favorita;
    constructor({ id, nombre, ingredientes, tiempo, favorita = false }) {
      this.id = id ?? _Receta.generarId();
      this.nombre = String(nombre).trim();
      this.ingredientes = _Receta.normalizarIngredientes(ingredientes);
      this.tiempo = Number(tiempo);
      this.favorita = Boolean(favorita);
    }
    static generarId() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    // Acepta un arreglo o un texto separado por comas / saltos de línea.
    static normalizarIngredientes(ingredientes) {
      const lista = Array.isArray(ingredientes) ? ingredientes : String(ingredientes ?? "").split(/[,\n]/);
      return lista.map((i) => String(i).trim()).filter((i) => i !== "");
    }
    // Quita tildes y mayúsculas para que "Limón" coincida con "limon".
    static normalizarTexto(texto) {
      return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    }
    // Devuelve un arreglo de mensajes de error (vacío si los datos son válidos).
    static validar({ nombre, ingredientes, tiempo }) {
      const errores = [];
      const tiempoNumero = Number(tiempo);
      if (String(nombre ?? "").trim().length < 2) {
        errores.push("El nombre debe tener al menos 2 caracteres.");
      }
      if (_Receta.normalizarIngredientes(ingredientes).length === 0) {
        errores.push("Agrega al menos un ingrediente.");
      }
      if (!Number.isInteger(tiempoNumero) || tiempoNumero <= 0) {
        errores.push("El tiempo debe ser un n\xFAmero entero de minutos mayor a 0.");
      }
      return errores;
    }
    alternarFavorita() {
      this.favorita = !this.favorita;
    }
    actualizar({ nombre, ingredientes, tiempo }) {
      this.nombre = String(nombre).trim();
      this.ingredientes = _Receta.normalizarIngredientes(ingredientes);
      this.tiempo = Number(tiempo);
    }
    // Busca el texto en el nombre o en cualquiera de los ingredientes.
    coincideCon(texto) {
      const busqueda = _Receta.normalizarTexto(texto);
      if (busqueda === "") return true;
      return _Receta.normalizarTexto(this.nombre).includes(busqueda) || this.ingredientes.some((i) => _Receta.normalizarTexto(i).includes(busqueda));
    }
    get tiempoFormateado() {
      if (this.tiempo < 60) return `${this.tiempo} min`;
      const horas = Math.floor(this.tiempo / 60);
      const minutos = this.tiempo % 60;
      return minutos === 0 ? `${horas} h` : `${horas} h ${minutos} min`;
    }
    toJSON() {
      return {
        id: this.id,
        nombre: this.nombre,
        ingredientes: this.ingredientes,
        tiempo: this.tiempo,
        favorita: this.favorita
      };
    }
  };

  // src/controllers/RecetaController.ts
  var RecetaController = class _RecetaController {
    constructor(view, storage) {
      this.view = view;
      this.storage = storage;
    }
    // Opciones del filtro por tiempo de preparación (en minutos).
    static FILTROS_TIEMPO = {
      todas: () => true,
      "hasta-15": (r) => r.tiempo <= 15,
      "hasta-30": (r) => r.tiempo <= 30,
      "hasta-60": (r) => r.tiempo <= 60,
      "mas-60": (r) => r.tiempo > 60
    };
    recetas = [];
    idEnEdicion = null;
    filtros = { texto: "", tiempo: "todas", soloFavoritas: false };
    iniciar() {
      this.recetas = this.storage.obtenerRecetas();
      this.view.alGuardar((datos) => this.guardar(datos));
      this.view.alCancelarEdicion(() => this.cancelarEdicion());
      this.view.alEditar((id) => this.iniciarEdicion(id));
      this.view.alEliminar((id) => this.eliminar(id));
      this.view.alAlternarFavorita((id) => this.alternarFavorita(id));
      this.view.alCambiarFiltros((filtros) => this.aplicarFiltros(filtros));
      this.refrescar();
    }
    // ---------- CRUD ----------
    // Crea una receta nueva o actualiza la que está en edición.
    guardar(datos) {
      const errores = Receta.validar(datos);
      if (errores.length > 0) {
        this.view.mostrarMensaje(errores.join(" "), "error");
        return;
      }
      const duplicada = this.recetas.some(
        (r) => r.id !== this.idEnEdicion && Receta.normalizarTexto(r.nombre) === Receta.normalizarTexto(datos.nombre)
      );
      if (duplicada) {
        this.view.mostrarMensaje("Ya existe una receta con ese nombre.", "error");
        return;
      }
      const enEdicion = this.buscarPorId(this.idEnEdicion);
      if (enEdicion) {
        enEdicion.actualizar(datos);
      } else {
        this.recetas.push(new Receta(datos));
      }
      if (!this.persistir()) return;
      this.view.mostrarMensaje(
        enEdicion ? "Receta actualizada." : "Receta registrada.",
        "exito"
      );
      this.idEnEdicion = null;
      this.view.limpiarFormulario();
      this.refrescar();
    }
    iniciarEdicion(id) {
      const receta = this.buscarPorId(id);
      if (!receta) return;
      this.idEnEdicion = id;
      this.view.llenarFormulario(receta);
    }
    cancelarEdicion() {
      this.idEnEdicion = null;
      this.view.limpiarFormulario();
    }
    eliminar(id) {
      const receta = this.buscarPorId(id);
      if (!receta) return;
      if (!this.view.confirmar(`\xBFEliminar la receta "${receta.nombre}"?`)) return;
      this.recetas = this.recetas.filter((r) => r.id !== id);
      if (this.idEnEdicion === id) this.cancelarEdicion();
      if (!this.persistir()) return;
      this.view.mostrarMensaje("Receta eliminada.", "exito");
      this.refrescar();
    }
    alternarFavorita(id) {
      const receta = this.buscarPorId(id);
      if (!receta) return;
      receta.alternarFavorita();
      this.persistir();
      this.refrescar();
    }
    // ---------- Filtros ----------
    aplicarFiltros(filtros) {
      this.filtros = { ...this.filtros, ...filtros };
      this.refrescar();
    }
    obtenerRecetasFiltradas() {
      const { texto, tiempo, soloFavoritas } = this.filtros;
      const cumpleTiempo = _RecetaController.FILTROS_TIEMPO[tiempo] ?? _RecetaController.FILTROS_TIEMPO.todas;
      return this.recetas.filter((r) => r.coincideCon(texto)).filter(cumpleTiempo).filter((r) => !soloFavoritas || r.favorita).sort(
        (a, b) => Number(b.favorita) - Number(a.favorita) || a.nombre.localeCompare(b.nombre, "es")
      );
    }
    // ---------- Auxiliares ----------
    buscarPorId(id) {
      return this.recetas.find((r) => r.id === id);
    }
    persistir() {
      const guardado = this.storage.guardarRecetas(this.recetas);
      if (!guardado) {
        this.view.mostrarMensaje("No se pudieron guardar los cambios en el navegador.", "error");
      }
      return guardado;
    }
    refrescar() {
      this.view.mostrarRecetas(this.obtenerRecetasFiltradas(), this.recetas.length);
    }
  };

  // src/services/StorageService.ts
  var StorageService = class {
    constructor(clave = "gestor-recetas") {
      this.clave = clave;
    }
    obtenerRecetas() {
      try {
        const datos = JSON.parse(localStorage.getItem(this.clave) ?? "null");
        return Array.isArray(datos) ? datos.map((d) => new Receta(d)) : [];
      } catch (error) {
        console.error("No se pudieron leer las recetas guardadas:", error);
        return [];
      }
    }
    // Devuelve false si el navegador no permitió guardar (p. ej. sin espacio).
    guardarRecetas(recetas) {
      try {
        localStorage.setItem(this.clave, JSON.stringify(recetas));
        return true;
      } catch (error) {
        console.error("No se pudieron guardar las recetas:", error);
        return false;
      }
    }
  };

  // src/views/RecetaView.ts
  var RecetaView = class {
    formulario = this.obtener("form-receta");
    tituloFormulario = this.obtener("titulo-formulario");
    campoNombre = this.obtener("nombre");
    campoIngredientes = this.obtener("ingredientes");
    campoTiempo = this.obtener("tiempo");
    botonGuardar = this.obtener("btn-guardar");
    botonCancelar = this.obtener("btn-cancelar");
    campoBusqueda = this.obtener("busqueda");
    selectorTiempo = this.obtener("filtro-tiempo");
    casillaFavoritas = this.obtener("filtro-favoritas");
    contador = this.obtener("contador");
    lista = this.obtener("lista-recetas");
    mensaje = this.obtener("mensaje");
    temporizadorMensaje;
    obtener(id) {
      const elemento = document.getElementById(id);
      if (!elemento) throw new Error(`Falta el elemento #${id} en index.html`);
      return elemento;
    }
    // ---------- Eventos (el controlador se suscribe aquí) ----------
    alGuardar(manejador) {
      this.formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        manejador({
          nombre: this.campoNombre.value,
          ingredientes: this.campoIngredientes.value,
          tiempo: this.campoTiempo.value
        });
      });
    }
    alCancelarEdicion(manejador) {
      this.botonCancelar.addEventListener("click", manejador);
    }
    alEditar(manejador) {
      this.escucharAccion("editar", manejador);
    }
    alEliminar(manejador) {
      this.escucharAccion("eliminar", manejador);
    }
    alAlternarFavorita(manejador) {
      this.escucharAccion("favorita", manejador);
    }
    alCambiarFiltros(manejador) {
      const notificar = () => manejador({
        texto: this.campoBusqueda.value,
        tiempo: this.selectorTiempo.value,
        soloFavoritas: this.casillaFavoritas.checked
      });
      this.campoBusqueda.addEventListener("input", notificar);
      this.selectorTiempo.addEventListener("change", notificar);
      this.casillaFavoritas.addEventListener("change", notificar);
    }
    // Un solo listener en la lista atiende los botones de todas las tarjetas.
    escucharAccion(accion, manejador) {
      this.lista.addEventListener("click", (evento) => {
        const boton = evento.target.closest(`button[data-accion="${accion}"]`);
        const id = boton?.closest(".tarjeta")?.dataset.id;
        if (id) manejador(id);
      });
    }
    // ---------- Tarjetas ----------
    mostrarRecetas(recetas, total) {
      this.contador.textContent = recetas.length === total ? `${total} receta${total === 1 ? "" : "s"}` : `Mostrando ${recetas.length} de ${total} recetas`;
      this.lista.replaceChildren();
      if (recetas.length === 0) {
        const vacio = this.crearElemento("p", "lista-vacia");
        vacio.textContent = total === 0 ? "A\xFAn no tienes recetas" : "Ninguna receta coincide con la b\xFAsqueda o los filtros.";
        this.lista.append(vacio);
        return;
      }
      this.lista.append(...recetas.map((receta) => this.crearTarjeta(receta)));
    }
    // Se usa textContent (no innerHTML) para que el texto del usuario nunca se interprete como HTML.
    crearTarjeta(receta) {
      const tarjeta = this.crearElemento("article", "tarjeta");
      tarjeta.dataset.id = receta.id;
      if (receta.favorita) tarjeta.classList.add("tarjeta--favorita");
      const cabecera = this.crearElemento("header", "tarjeta__cabecera");
      const nombre = this.crearElemento("h3", "tarjeta__nombre");
      nombre.textContent = receta.nombre;
      const favorita = this.crearBoton(receta.favorita ? "\u2605" : "\u2606", "favorita", "btn-favorita");
      favorita.setAttribute("aria-pressed", String(receta.favorita));
      favorita.title = receta.favorita ? "Quitar de favoritas" : "Marcar como favorita";
      favorita.setAttribute("aria-label", favorita.title);
      cabecera.append(nombre, favorita);
      const tiempo = this.crearElemento("p", "tarjeta__tiempo");
      tiempo.textContent = `\u23F1 ${receta.tiempoFormateado}`;
      const ingredientes = this.crearElemento("ul", "tarjeta__ingredientes");
      receta.ingredientes.forEach((ingrediente) => {
        const item = document.createElement("li");
        item.textContent = ingrediente;
        ingredientes.append(item);
      });
      const acciones = this.crearElemento("footer", "tarjeta__acciones");
      acciones.append(
        this.crearBoton("Editar", "editar", "btn btn--secundario"),
        this.crearBoton("Eliminar", "eliminar", "btn btn--peligro")
      );
      tarjeta.append(cabecera, tiempo, ingredientes, acciones);
      return tarjeta;
    }
    crearElemento(etiqueta, clase) {
      const elemento = document.createElement(etiqueta);
      elemento.className = clase;
      return elemento;
    }
    crearBoton(texto, accion, clase) {
      const boton = this.crearElemento("button", clase);
      boton.type = "button";
      boton.textContent = texto;
      boton.dataset.accion = accion;
      return boton;
    }
    // ---------- Formulario ----------
    llenarFormulario(receta) {
      this.campoNombre.value = receta.nombre;
      this.campoIngredientes.value = receta.ingredientes.join(", ");
      this.campoTiempo.value = String(receta.tiempo);
      this.tituloFormulario.textContent = "Editar receta";
      this.botonGuardar.textContent = "Guardar cambios";
      this.botonCancelar.hidden = false;
      this.formulario.scrollIntoView({ behavior: "smooth", block: "start" });
      this.campoNombre.focus();
    }
    limpiarFormulario() {
      this.formulario.reset();
      this.tituloFormulario.textContent = "Nueva receta";
      this.botonGuardar.textContent = "Registrar receta";
      this.botonCancelar.hidden = true;
    }
    // ---------- Mensajes ----------
    mostrarMensaje(texto, tipo = "exito") {
      this.mensaje.textContent = texto;
      this.mensaje.className = `mensaje mensaje--${tipo}`;
      this.mensaje.hidden = false;
      window.clearTimeout(this.temporizadorMensaje);
      this.temporizadorMensaje = window.setTimeout(() => {
        this.mensaje.hidden = true;
      }, 4e3);
    }
    confirmar(texto) {
      return window.confirm(texto);
    }
  };

  // src/app.ts
  document.addEventListener("DOMContentLoaded", () => {
    const controlador = new RecetaController(new RecetaView(), new StorageService());
    controlador.iniciar();
  });
})();
//# sourceMappingURL=app.js.map

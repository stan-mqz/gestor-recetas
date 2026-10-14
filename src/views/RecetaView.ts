import type { Filtros, FiltroTiempo } from "../controllers/RecetaController";
import type { DatosFormulario, Receta } from "../models/Receta";

export type TipoMensaje = "exito" | "error";
type AccionTarjeta = "editar" | "eliminar" | "favorita";

// Vista: dibuja las tarjetas y los mensajes, y avisa al controlador de las acciones del usuario.
export class RecetaView {
  private readonly formulario = this.obtener<HTMLFormElement>("form-receta");
  private readonly tituloFormulario = this.obtener<HTMLHeadingElement>("titulo-formulario");
  private readonly campoNombre = this.obtener<HTMLInputElement>("nombre");
  private readonly campoIngredientes = this.obtener<HTMLTextAreaElement>("ingredientes");
  private readonly campoTiempo = this.obtener<HTMLInputElement>("tiempo");
  private readonly botonGuardar = this.obtener<HTMLButtonElement>("btn-guardar");
  private readonly botonCancelar = this.obtener<HTMLButtonElement>("btn-cancelar");

  private readonly campoBusqueda = this.obtener<HTMLInputElement>("busqueda");
  private readonly selectorTiempo = this.obtener<HTMLSelectElement>("filtro-tiempo");
  private readonly casillaFavoritas = this.obtener<HTMLInputElement>("filtro-favoritas");

  private readonly contador = this.obtener<HTMLParagraphElement>("contador");
  private readonly lista = this.obtener<HTMLDivElement>("lista-recetas");
  private readonly mensaje = this.obtener<HTMLParagraphElement>("mensaje");
  private temporizadorMensaje: number | undefined;

  private obtener<T extends HTMLElement>(id: string): T {
    const elemento = document.getElementById(id);
    if (!elemento) throw new Error(`Falta el elemento #${id} en index.html`);
    return elemento as T;
  }

  // ---------- Eventos (el controlador se suscribe aquí) ----------

  public alGuardar(manejador: (datos: DatosFormulario) => void): void {
    this.formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      manejador({
        nombre: this.campoNombre.value,
        ingredientes: this.campoIngredientes.value,
        tiempo: this.campoTiempo.value,
      });
    });
  }

  public alCancelarEdicion(manejador: () => void): void {
    this.botonCancelar.addEventListener("click", manejador);
  }

  public alEditar(manejador: (id: string) => void): void {
    this.escucharAccion("editar", manejador);
  }

  public alEliminar(manejador: (id: string) => void): void {
    this.escucharAccion("eliminar", manejador);
  }

  public alAlternarFavorita(manejador: (id: string) => void): void {
    this.escucharAccion("favorita", manejador);
  }

  public alCambiarFiltros(manejador: (filtros: Filtros) => void): void {
    const notificar = (): void =>
      manejador({
        texto: this.campoBusqueda.value,
        tiempo: this.selectorTiempo.value as FiltroTiempo,
        soloFavoritas: this.casillaFavoritas.checked,
      });

    this.campoBusqueda.addEventListener("input", notificar);
    this.selectorTiempo.addEventListener("change", notificar);
    this.casillaFavoritas.addEventListener("change", notificar);
  }

  // Un solo listener en la lista atiende los botones de todas las tarjetas.
  private escucharAccion(accion: AccionTarjeta, manejador: (id: string) => void): void {
    this.lista.addEventListener("click", (evento) => {
      const boton = (evento.target as HTMLElement).closest(`button[data-accion="${accion}"]`);
      const id = boton?.closest<HTMLElement>(".tarjeta")?.dataset.id;
      if (id) manejador(id);
    });
  }

  // ---------- Tarjetas ----------

  public mostrarRecetas(recetas: Receta[], total: number): void {
    this.contador.textContent =
      recetas.length === total
        ? `${total} receta${total === 1 ? "" : "s"}`
        : `Mostrando ${recetas.length} de ${total} recetas`;

    this.lista.replaceChildren();

    if (recetas.length === 0) {
      const vacio = this.crearElemento("p", "lista-vacia");
      vacio.textContent =
        total === 0
          ? "Aún no tienes recetas"
          : "Ninguna receta coincide con la búsqueda o los filtros.";
      this.lista.append(vacio);
      return;
    }

    this.lista.append(...recetas.map((receta) => this.crearTarjeta(receta)));
  }

  // Se usa textContent (no innerHTML) para que el texto del usuario nunca se interprete como HTML.
  private crearTarjeta(receta: Receta): HTMLElement {
    const tarjeta = this.crearElemento("article", "tarjeta");
    tarjeta.dataset.id = receta.id;
    if (receta.favorita) tarjeta.classList.add("tarjeta--favorita");

    const cabecera = this.crearElemento("header", "tarjeta__cabecera");
    const nombre = this.crearElemento("h3", "tarjeta__nombre");
    nombre.textContent = receta.nombre;

    const favorita = this.crearBoton(receta.favorita ? "★" : "☆", "favorita", "btn-favorita");
    favorita.setAttribute("aria-pressed", String(receta.favorita));
    favorita.title = receta.favorita ? "Quitar de favoritas" : "Marcar como favorita";
    favorita.setAttribute("aria-label", favorita.title);
    cabecera.append(nombre, favorita);

    const tiempo = this.crearElemento("p", "tarjeta__tiempo");
    tiempo.textContent = `⏱ ${receta.tiempoFormateado}`;

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

  private crearElemento<K extends keyof HTMLElementTagNameMap>(
    etiqueta: K,
    clase: string
  ): HTMLElementTagNameMap[K] {
    const elemento = document.createElement(etiqueta);
    elemento.className = clase;
    return elemento;
  }

  private crearBoton(texto: string, accion: AccionTarjeta, clase: string): HTMLButtonElement {
    const boton = this.crearElemento("button", clase);
    boton.type = "button";
    boton.textContent = texto;
    boton.dataset.accion = accion;
    return boton;
  }

  // ---------- Formulario ----------

  public llenarFormulario(receta: Receta): void {
    this.campoNombre.value = receta.nombre;
    this.campoIngredientes.value = receta.ingredientes.join(", ");
    this.campoTiempo.value = String(receta.tiempo);

    this.tituloFormulario.textContent = "Editar receta";
    this.botonGuardar.textContent = "Guardar cambios";
    this.botonCancelar.hidden = false;

    this.formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    this.campoNombre.focus();
  }

  public limpiarFormulario(): void {
    this.formulario.reset();
    this.tituloFormulario.textContent = "Nueva receta";
    this.botonGuardar.textContent = "Registrar receta";
    this.botonCancelar.hidden = true;
  }

  // ---------- Mensajes ----------

  public mostrarMensaje(texto: string, tipo: TipoMensaje = "exito"): void {
    this.mensaje.textContent = texto;
    this.mensaje.className = `mensaje mensaje--${tipo}`;
    this.mensaje.hidden = false;

    window.clearTimeout(this.temporizadorMensaje);
    this.temporizadorMensaje = window.setTimeout(() => {
      this.mensaje.hidden = true;
    }, 4000);
  }

  public confirmar(texto: string): boolean {
    return window.confirm(texto);
  }
}

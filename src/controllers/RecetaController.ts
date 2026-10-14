import { Receta, type DatosFormulario } from "../models/Receta";
import type { StorageService } from "../services/StorageService";
import type { RecetaView } from "../views/RecetaView";

export type FiltroTiempo = "todas" | "hasta-15" | "hasta-30" | "hasta-60" | "mas-60";

export interface Filtros {
  texto: string;
  tiempo: FiltroTiempo;
  soloFavoritas: boolean;
}

// Controlador: coordina el modelo, la vista y el almacenamiento (CRUD y filtros).
export class RecetaController {
  // Opciones del filtro por tiempo de preparación (en minutos).
  private static readonly FILTROS_TIEMPO: Record<FiltroTiempo, (r: Receta) => boolean> = {
    todas: () => true,
    "hasta-15": (r) => r.tiempo <= 15,
    "hasta-30": (r) => r.tiempo <= 30,
    "hasta-60": (r) => r.tiempo <= 60,
    "mas-60": (r) => r.tiempo > 60,
  };

  private recetas: Receta[] = [];
  private idEnEdicion: string | null = null;
  private filtros: Filtros = { texto: "", tiempo: "todas", soloFavoritas: false };

  constructor(
    private readonly view: RecetaView,
    private readonly storage: StorageService
  ) {}

  public iniciar(): void {
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
  public guardar(datos: DatosFormulario): void {
    const errores = Receta.validar(datos);
    if (errores.length > 0) {
      this.view.mostrarMensaje(errores.join(" "), "error");
      return;
    }

    const duplicada = this.recetas.some(
      (r) =>
        r.id !== this.idEnEdicion &&
        Receta.normalizarTexto(r.nombre) === Receta.normalizarTexto(datos.nombre)
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

  public iniciarEdicion(id: string): void {
    const receta = this.buscarPorId(id);
    if (!receta) return;

    this.idEnEdicion = id;
    this.view.llenarFormulario(receta);
  }

  public cancelarEdicion(): void {
    this.idEnEdicion = null;
    this.view.limpiarFormulario();
  }

  public eliminar(id: string): void {
    const receta = this.buscarPorId(id);
    if (!receta) return;
    if (!this.view.confirmar(`¿Eliminar la receta "${receta.nombre}"?`)) return;

    this.recetas = this.recetas.filter((r) => r.id !== id);
    if (this.idEnEdicion === id) this.cancelarEdicion();

    if (!this.persistir()) return;
    this.view.mostrarMensaje("Receta eliminada.", "exito");
    this.refrescar();
  }

  public alternarFavorita(id: string): void {
    const receta = this.buscarPorId(id);
    if (!receta) return;

    receta.alternarFavorita();
    this.persistir();
    this.refrescar();
  }

  // ---------- Filtros ----------

  public aplicarFiltros(filtros: Partial<Filtros>): void {
    this.filtros = { ...this.filtros, ...filtros };
    this.refrescar();
  }

  public obtenerRecetasFiltradas(): Receta[] {
    const { texto, tiempo, soloFavoritas } = this.filtros;
    const cumpleTiempo =
      RecetaController.FILTROS_TIEMPO[tiempo] ?? RecetaController.FILTROS_TIEMPO.todas;

    return this.recetas
      .filter((r) => r.coincideCon(texto))
      .filter(cumpleTiempo)
      .filter((r) => !soloFavoritas || r.favorita)
      .sort(
        (a, b) =>
          Number(b.favorita) - Number(a.favorita) ||
          a.nombre.localeCompare(b.nombre, "es")
      );
  }

  // ---------- Auxiliares ----------

  private buscarPorId(id: string | null): Receta | undefined {
    return this.recetas.find((r) => r.id === id);
  }

  private persistir(): boolean {
    const guardado = this.storage.guardarRecetas(this.recetas);
    if (!guardado) {
      this.view.mostrarMensaje("No se pudieron guardar los cambios en el navegador.", "error");
    }
    return guardado;
  }

  private refrescar(): void {
    this.view.mostrarRecetas(this.obtenerRecetasFiltradas(), this.recetas.length);
  }
}

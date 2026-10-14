// Datos que llegan del formulario: los ingredientes pueden venir como texto y el tiempo como cadena.
export interface DatosFormulario {
  nombre: string;
  ingredientes: string | string[];
  tiempo: string | number;
}

// Datos para construir una receta (del formulario o de localStorage).
export interface DatosReceta extends DatosFormulario {
  id?: string;
  favorita?: boolean;
}

// Forma en que una receta se guarda en localStorage.
export interface RecetaJSON {
  id: string;
  nombre: string;
  ingredientes: string[];
  tiempo: number;
  favorita: boolean;
}

// Modelo: representa una receta y contiene sus reglas de negocio.
export class Receta {
  public readonly id: string;
  public nombre: string;
  public ingredientes: string[];
  public tiempo: number; // minutos
  public favorita: boolean;

  constructor({ id, nombre, ingredientes, tiempo, favorita = false }: DatosReceta) {
    this.id = id ?? Receta.generarId();
    this.nombre = String(nombre).trim();
    this.ingredientes = Receta.normalizarIngredientes(ingredientes);
    this.tiempo = Number(tiempo);
    this.favorita = Boolean(favorita);
  }

  private static generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Acepta un arreglo o un texto separado por comas / saltos de línea.
  public static normalizarIngredientes(ingredientes: string | string[]): string[] {
    const lista = Array.isArray(ingredientes)
      ? ingredientes
      : String(ingredientes ?? "").split(/[,\n]/);

    return lista.map((i) => String(i).trim()).filter((i) => i !== "");
  }

  // Quita tildes y mayúsculas para que "Limón" coincida con "limon".
  public static normalizarTexto(texto: string): string {
    return String(texto)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  // Devuelve un arreglo de mensajes de error (vacío si los datos son válidos).
  public static validar({ nombre, ingredientes, tiempo }: DatosFormulario): string[] {
    const errores: string[] = [];
    const tiempoNumero = Number(tiempo);

    if (String(nombre ?? "").trim().length < 2) {
      errores.push("El nombre debe tener al menos 2 caracteres.");
    }
    if (Receta.normalizarIngredientes(ingredientes).length === 0) {
      errores.push("Agrega al menos un ingrediente.");
    }
    if (!Number.isInteger(tiempoNumero) || tiempoNumero <= 0) {
      errores.push("El tiempo debe ser un número entero de minutos mayor a 0.");
    }

    return errores;
  }

  public alternarFavorita(): void {
    this.favorita = !this.favorita;
  }

  public actualizar({ nombre, ingredientes, tiempo }: DatosFormulario): void {
    this.nombre = String(nombre).trim();
    this.ingredientes = Receta.normalizarIngredientes(ingredientes);
    this.tiempo = Number(tiempo);
  }

  // Busca el texto en el nombre o en cualquiera de los ingredientes.
  public coincideCon(texto: string): boolean {
    const busqueda = Receta.normalizarTexto(texto);
    if (busqueda === "") return true;

    return (
      Receta.normalizarTexto(this.nombre).includes(busqueda) ||
      this.ingredientes.some((i) => Receta.normalizarTexto(i).includes(busqueda))
    );
  }

  public get tiempoFormateado(): string {
    if (this.tiempo < 60) return `${this.tiempo} min`;

    const horas = Math.floor(this.tiempo / 60);
    const minutos = this.tiempo % 60;
    return minutos === 0 ? `${horas} h` : `${horas} h ${minutos} min`;
  }

  public toJSON(): RecetaJSON {
    return {
      id: this.id,
      nombre: this.nombre,
      ingredientes: this.ingredientes,
      tiempo: this.tiempo,
      favorita: this.favorita,
    };
  }
}

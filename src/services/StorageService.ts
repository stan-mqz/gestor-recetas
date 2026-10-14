import { Receta, type RecetaJSON } from "../models/Receta";

// Servicio de persistencia: único lugar que conoce localStorage.
export class StorageService {
  constructor(private readonly clave: string = "gestor-recetas") {}

  public obtenerRecetas(): Receta[] {
    try {
      const datos: unknown = JSON.parse(localStorage.getItem(this.clave) ?? "null");
      return Array.isArray(datos) ? datos.map((d: RecetaJSON) => new Receta(d)) : [];
    } catch (error) {
      console.error("No se pudieron leer las recetas guardadas:", error);
      return [];
    }
  }

  // Devuelve false si el navegador no permitió guardar (p. ej. sin espacio).
  public guardarRecetas(recetas: Receta[]): boolean {
    try {
      localStorage.setItem(this.clave, JSON.stringify(recetas));
      return true;
    } catch (error) {
      console.error("No se pudieron guardar las recetas:", error);
      return false;
    }
  }
}

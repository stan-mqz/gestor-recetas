import { RecetaController } from "./controllers/RecetaController";
import { StorageService } from "./services/StorageService";
import { RecetaView } from "./views/RecetaView";

// Punto de entrada: crea las piezas y arranca la aplicación.
document.addEventListener("DOMContentLoaded", () => {
  const controlador = new RecetaController(new RecetaView(), new StorageService());
  controlador.iniciar();
});

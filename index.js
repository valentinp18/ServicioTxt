import express from "express";
import multer from "multer";
import fs from "fs";
import readline from "readline";
const app = express();
const upload = multer({ dest: "ArchivosSubidos/" });

app.post("/ServicioTxt", upload.single("file"), (req, res) => {
  try {
    const gruposSolicitados = parseInt(req.body.grupos, 10);
    if (isNaN(gruposSolicitados) || gruposSolicitados <= 0) {
      throw new Error(
        'El parámetro "grupos" es obligatorio y debe ser un número positivo.',
      );
    }
    if (!req.file) {
      throw new Error("El archivo es obligatorio.");
    }
    procesarArchivo(req.file.path, gruposSolicitados, res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function procesarArchivo(filePath, gruposSolicitados, res) {
  const MAX_LINEAS = gruposSolicitados * 4;
  let lineasProcesadas = 0;
  let resultado = [];

  const lector = readline.createInterface({
    input: fs.createReadStream(filePath),
  });

  lector.on("line", (linea) => {
    if (lineasProcesadas < MAX_LINEAS) {
      const grupoIndex = Math.floor(lineasProcesadas / 4);
      try {
        if (lineasProcesadas % 4 === 0) {
          resultado[grupoIndex] = {
            TipoRegistro: linea.substring(0, 1),
            CodigoEmpresa: linea.substring(1, 13).trim(),
            FechaEnvioArchivo: linea.substring(13, 21).trim(),
          };
        } else if (lineasProcesadas % 4 === 1) {
          resultado[grupoIndex].Nombres = linea.substring(174, 224).trim();
          resultado[grupoIndex].NumeroDocumentoIdentidad = linea
            .substring(62, 74)
            .trim();
          resultado[grupoIndex].FechaVencimientoPago = linea
            .substring(548, 556)
            .trim();
          let montopago = parseFloat(linea.substring(525, 539));
          if (isNaN(montopago)) {
            throw new Error("Monto de pago no es un número válido.");
          }
          let montoFormateado = montopago / 100;
          resultado[grupoIndex].MontoPago =
            `${montoFormateado.toFixed(2)} soles`;
        }
        //Errores
      } catch (error) {
        lector.close();
        throw new Error(
          `Error procesando la línea ${lineasProcesadas + 1}: ${error.message}`,
        );
      }
      lineasProcesadas++;
    } else {
      lector.close();
    }
  });
  lector.on("close", () => {
    res.json(resultado);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error al eliminar el archivo:", err);
      }
    });
  });

  lector.on("error", (err) => {
    res.status(500).json({ error: "Error al leer el archivo." });
  });
}
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "Error al subir el archivo." });
  }
  next(err);
}
app.use(multerErrorHandler);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Ocurrió un error interno en el servidor." });
});
app.listen(3000, () => {
  console.log("Servidor Express inicializado");
});

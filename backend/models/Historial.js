const mongoose = require('mongoose');

const historialSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  tipo: {
    type: String,
    required: true,
    enum: ['creacion', 'edicion', 'entrega', 'cambio', 'devolucion', 'eliminacion']
  },
  descripcion: { type: String, required: true },
  cambios: [{
    campo: String,
    valorAnterior: String,
    valorNuevo: String
  }],
  usuario: { type: String }, // email del usuario que hizo el cambio
  fecha: { type: Date, default: Date.now }
});

historialSchema.index({ assetId: 1, fecha: -1 });

module.exports = mongoose.model('Historial', historialSchema);
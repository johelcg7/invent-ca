const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, uppercase: true },
  tipoEquipo: {
    type: String,
    required: true,
    enum: ['Laptop', 'Mouse', 'Teclado', 'Monitor', 'Impresora', 'Router', 'Chip', 'Audífono', 'Celular', 'PC', 'Otro']
  },
  marca: { type: String, trim: true },
  modelo: { type: String, trim: true },
  numeroSerie: { type: String, trim: true },
  estado: {
    type: String,
    required: true,
    enum: ['Asignado', 'En oficina', 'En almacén', 'En reparación', 'Baja'],
    default: 'En almacén'
  },
  ubicacion: {
    type: String,
    enum: ['Casa (Remoto)', 'Oficina', 'Almacén', ''],
    default: ''
  },
  usuarioAsignado: { type: String, trim: true },
  colaboradorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Colaborador' },
  area: { type: String, trim: true },
  fechaEntrega: { type: Date },
  // Links a constancias (Google Drive, Dropbox, etc.)
  constanciaEntrega: { type: String, trim: true },   // URL
  constanciaCambio: { type: String, trim: true },    // URL
  constanciaDevolucion: { type: String, trim: true }, // URL
  observaciones: { type: String, trim: true },
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
assetSchema.index({ estado: 1 });
assetSchema.index({ ubicacion: 1 });
assetSchema.index({ area: 1 });
assetSchema.index({ usuarioAsignado: 1 });
assetSchema.index({ tipoEquipo: 1 });

module.exports = mongoose.model('Asset', assetSchema);
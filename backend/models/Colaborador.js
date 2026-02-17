const mongoose = require('mongoose');

const colaboradorSchema = new mongoose.Schema({
  idEmpleado: { type: String, required: true, unique: true, trim: true },
  nombreCompleto: { type: String, required: true, trim: true, uppercase: true },
  email: { type: String, trim: true, lowercase: true },
  telefono: { type: String, trim: true },
  area: {
    type: String,
    enum: [
      'Administración y Finanzas',
      'Gerencia',
      'Talento y Cultura',
      'Mystery Shopping',
      'Driver Panel',
      'Market Research',
      'Bid Ask',
      'Comunicaciones',
      'Comercial',
      'Otro'
    ]
  },
  modalidad: {
    type: String,
    enum: ['Remoto', 'Presencial', 'Híbrido']
  },
  estado: {
    type: String,
    enum: ['Activo', 'Inactivo','Cesado'],
    default: 'Activo'
  },
  observaciones: { type: String, trim: true }
}, {
  timestamps: true
});

colaboradorSchema.index({ area: 1 });
colaboradorSchema.index({ estado: 1 });
colaboradorSchema.index({ nombreCompleto: 'text' });

module.exports = mongoose.model('Colaborador', colaboradorSchema);
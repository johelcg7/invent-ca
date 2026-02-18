const express = require('express');
const router = express.Router();
const Colaborador = require('../models/Colaborador');
const Asset = require('../models/Asset');
const { ensureAuthenticated, requireAdmin } = require('../middleware/auth');

const buildSafeRegex = (term = '') => {
  const normalized = String(term).trim().slice(0, 80);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
};

// Require authentication for all collaborators endpoints
router.use(ensureAuthenticated);

// GET /api/colaboradores
router.get('/', async (req, res) => {
  try {
    const { area, estado, search } = req.query;
    const filter = {};
    if (area) filter.area = area;
    if (estado) filter.estado = estado;
    if (search) {
      const safeSearchRegex = buildSafeRegex(search);
      filter.$or = [
        { nombreCompleto: safeSearchRegex },
        { email: safeSearchRegex },
        { idEmpleado: safeSearchRegex }
      ];
    }
    const colaboradores = await Colaborador.find(filter).sort({ nombreCompleto: 1 });
    res.json(colaboradores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/colaboradores/:id
router.get('/:id', async (req, res) => {
  try {
    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) return res.status(404).json({ error: 'Colaborador no encontrado' });
    const equipos = await Asset.find({ usuarioAsignado: colaborador.nombreCompleto });
    res.json({ ...colaborador.toObject(), equipos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/colaboradores
router.post('/', requireAdmin, async (req, res) => {
  try {
    const col = new Colaborador(req.body);
    await col.save();
    res.status(201).json(col);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'El ID de empleado ya existe' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/colaboradores/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const col = await Colaborador.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!col) return res.status(404).json({ error: 'Colaborador no encontrado' });
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/colaboradores/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const col = await Colaborador.findByIdAndDelete(req.params.id);
    if (!col) return res.status(404).json({ error: 'Colaborador no encontrado' });
    res.json({ message: 'Colaborador eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

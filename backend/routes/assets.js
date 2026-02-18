const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Historial = require('../models/Historial');
const { ensureAuthenticated, requireAdmin } = require('../middleware/auth');

const buildSafeRegex = (term = '') => {
  const normalized = String(term).trim().slice(0, 80);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
};

// Todas las rutas requieren usuario autenticado
router.use(ensureAuthenticated);

router.get('/', async (req, res) => {
  try {
    const { estado, ubicacion, area, tipoEquipo, search } = req.query;
    const filter = {};
    if (estado) filter.estado = estado;
    if (ubicacion) filter.ubicacion = ubicacion;
    if (area) filter.area = area;
    if (tipoEquipo) filter.tipoEquipo = tipoEquipo;
    if (search) {
      const safeSearchRegex = buildSafeRegex(search);
      filter.$or = [
        { id: safeSearchRegex },
        { marca: safeSearchRegex },
        { modelo: safeSearchRegex },
        { usuarioAsignado: safeSearchRegex },
        { numeroSerie: safeSearchRegex }
      ];
    }
    const [assets, total] = await Promise.all([
      Asset.find(filter).sort({ id: 1 }),
      Asset.countDocuments(filter)
    ]);
    res.json({ assets, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [byEstado, byTipo, byArea, byUbicacion, total] = await Promise.all([
      Asset.aggregate([{ $group: { _id: '$estado', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $group: { _id: '$tipoEquipo', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $group: { _id: '$area', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $group: { _id: '$ubicacion', count: { $sum: 1 } } }]),
      Asset.countDocuments()
    ]);
    res.json({ byEstado, byTipo, byArea, byUbicacion, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/historial', async (req, res) => {
  try {
    const historial = await Historial.find({ assetId: req.params.id.toUpperCase() }).sort({ fecha: -1 }).limit(50);
    res.json(historial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const asset = await Asset.findOne({ id: req.params.id.toUpperCase() });
    if (!asset) return res.status(404).json({ error: 'Activo no encontrado' });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    await Historial.create({
      assetId: asset.id,
      tipo: 'creacion',
      descripcion: `Activo ${asset.id} creado`,
      usuario: req.user?.email || 'sistema'
    });
    res.status(201).json(asset);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: `El ID ${req.body.id} ya existe` });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const anterior = await Asset.findOne({ id: req.params.id.toUpperCase() });
    if (!anterior) return res.status(404).json({ error: 'Activo no encontrado' });
    const campos = ['estado', 'ubicacion', 'usuarioAsignado', 'area', 'marca', 'modelo', 'constanciaEntrega', 'constanciaCambio', 'constanciaDevolucion'];
    const cambios = [];
    for (const campo of campos) {
      const vAnterior = String(anterior[campo] || '');
      const vNuevo = String(req.body[campo] || '');
      if (vAnterior !== vNuevo) cambios.push({ campo, valorAnterior: vAnterior, valorNuevo: vNuevo });
    }
    const asset = await Asset.findOneAndUpdate(
      { id: req.params.id.toUpperCase() },
      req.body,
      { new: true, runValidators: true }
    );
    if (cambios.length > 0) {
      await Historial.create({
        assetId: asset.id,
        tipo: 'edicion',
        descripcion: `Modificado: ${cambios.map(c => c.campo).join(', ')}`,
        cambios,
        usuario: req.user?.email || 'sistema'
      });
    }
    res.json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ id: req.params.id.toUpperCase() });
    if (!asset) return res.status(404).json({ error: 'Activo no encontrado' });
    await Historial.create({
      assetId: asset.id,
      tipo: 'eliminacion',
      descripcion: `Activo ${asset.id} eliminado`,
      usuario: req.user?.email || 'sistema'
    });
    res.json({ message: 'Activo eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

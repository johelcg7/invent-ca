require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const Asset = require('./models/Asset');
const Colaborador = require('./models/Colaborador');

const FILE = process.argv[2];
if (!FILE) { console.error('❌ Indica la ruta del Excel: node seed.js "ruta.xlsx"'); process.exit(1); }

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventario_ti');
  console.log('✅ MongoDB conectado');

  const wb = xlsx.readFile(path.resolve(FILE));

  // ── Colaboradores ──
  const colData = xlsx.utils.sheet_to_json(wb.Sheets['Colaboradores'], { defval: null });
  await Colaborador.deleteMany({});
  let colCount = 0;
  for (const row of colData) {
    try {
      const idEmp = String(row['ID Empleado'] || '').trim();
      if (!idEmp) continue;
      await Colaborador.create({
        idEmpleado: idEmp,
        nombreCompleto: String(row['Nombre Completo'] || '').trim().toUpperCase(),
        email: String(row['Email '] || row['Email'] || '').trim().toLowerCase(),
        telefono: String(row['Teléfono'] || '').trim(),
        area: row['Área'] || null,
        modalidad: row['Modalidad'] || null,
        estado: row['Estado'] || 'Activo',
        observaciones: row['Observaciones'] || null
      });
      colCount++;
    } catch (e) { console.warn('  ⚠ Colaborador skip:', e.message); }
  }
  console.log(`✅ ${colCount} colaboradores importados`);

  // ── Assets ──
  const invData = xlsx.utils.sheet_to_json(wb.Sheets['Inventario'], { defval: null });
  await Asset.deleteMany({});
  let assetCount = 0;
  for (const row of invData) {
    try {
      const id = String(row['ID'] || '').trim().toUpperCase();
      if (!id) continue;
      let fechaEntrega = null;
      const rawDate = row['Fecha de Entrega'];
      if (rawDate) {
        if (typeof rawDate === 'number') {
          const d = xlsx.SSF.parse_date_code(rawDate);
          fechaEntrega = new Date(d.y, d.m - 1, d.d);
        } else {
          fechaEntrega = new Date(rawDate);
        }
        if (isNaN(fechaEntrega)) fechaEntrega = null;
      }
      await Asset.create({
        id,
        tipoEquipo: row['Tipo de Equipo'] || 'Otro',
        marca: row['Marca'] || null,
        modelo: row['Modelo'] || null,
        numeroSerie: row['Número de Serie | Nro Teléfono'] ? String(row['Número de Serie | Nro Teléfono']).trim() : null,
        estado: row['Estado'] || 'En almacén',
        ubicacion: row['Ubicación'] || '',
        usuarioAsignado: row['Usuario Asignado'] || null,
        area: row['Área'] || null,
        fechaEntrega,
        constanciaEntrega: row['Constancia Entrega'] || null,
        constanciaCambio: row['Constancia Cambio'] || null,
        constanciaDevolucion: row['Constancia Devolución'] || null,
        observaciones: row['Observaciones'] || null
      });
      assetCount++;
    } catch (e) { console.warn('  ⚠ Asset skip:', row['ID'], '-', e.message); }
  }
  console.log(`✅ ${assetCount} activos importados`);
  await mongoose.disconnect();
  console.log('��� Seed completado');
}

seed().catch(e => { console.error(e); process.exit(1); });

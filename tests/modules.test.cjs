const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../server/controllers/clinicSettingsController');
const Settings = require('../server/models/ClinicSettings');
const { getMaster } = require('../server/data/memoryStore');

test('every combination gates each module independently', async () => {
  const { MODULES, isPageEnabled } = await import('../src/constants/modules.mjs');
  for (let mask = 0; mask < 8; mask++) {
    const modules = { opd: !!(mask & 1), ipd: !!(mask & 2), pharmacy: !!(mask & 4) };
    for (const module of MODULES) for (const page of module.pages)
      assert.equal(isPageEnabled(page, modules), modules[module.key]);
    assert.equal(isPageEnabled('Module Settings', modules), true);
    assert.equal(isPageEnabled('Dashboard', modules), true);
  }
  assert.equal(isPageEnabled('OPD Visits'), true);
});

test('module settings persist, reject invalid values and survive clinic edits', async () => {
  let result;
  let error;
  const res = { json: (data) => { result = data; } };
  const modules = { opd: false, ipd: true, pharmacy: false };
  await controller.updateModules({ body: { modules } }, res, (err) => { error = err; });
  assert.equal(error, undefined);
  assert.deepEqual((await getMaster(Settings, 'clinicSettings')).modules, modules);
  await controller.updateSettings({ body: { phone: '123', modules: { opd: true } } }, res, (err) => { error = err; });
  assert.deepEqual(result.modules, modules);
  for (const invalid of [{ opd: 'false', ipd: true, pharmacy: true }, {}, { ...modules, extra: true }]) {
    error = undefined;
    await controller.updateModules({ body: { modules: invalid } }, res, (err) => { error = err; });
    assert.equal(error.statusCode, 400);
    assert.deepEqual((await getMaster(Settings, 'clinicSettings')).modules, modules);
  }
});

(function (root) {
  'use strict';

  // Pure transformation only. Native hosts own discovery, conflict detection,
  // backups and the final atomic file replacement.
  const G = typeof module !== 'undefined' && module.exports ? require('./game-import.js') : root.BDOGameImport;
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.BDOEngine;
  const own = (record, key) => Object.prototype.hasOwnProperty.call(record, key);
  const numericText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function numeric(value) {
    return typeof value === 'string' && numericText.test(value.trim()) ? Number(value) : NaN;
  }

  function normalizeState(state) {
    const validation = E.validateState(state);
    if (!validation.valid) fail('INVALID_LAYOUT', `Cannot apply this library: ${validation.errors[0]}`);
    const next = E.clone(state);
    for (const id of next.active) {
      const profile = next.profiles[id];
      const size = 40 * profile.uiScale / 100;
      for (const slot of profile.slots) {
        slot.x = Math.min(Math.floor(profile.width - size), Math.max(0, Math.round(slot.x)));
        slot.y = Math.min(Math.floor(profile.height - size), Math.max(0, Math.round(slot.y)));
      }
    }
    return next;
  }

  function quantizationUnit(literal) {
    const [mantissa, exponent = '0'] = literal.trim().toLowerCase().split('e');
    const decimals = (mantissa.split('.')[1] || '').length;
    const unit = 10 ** (Number(exponent) - decimals);
    if (!Number.isFinite(unit) || unit <= 0) fail('UNSUPPORTED_RELATIVE_POSITION', 'A saved relative coordinate has unsupported numeric precision.');
    return unit;
  }

  // BDO stores a second coordinate representation with a family-specific
  // center offset. Infer it from each saved preset instead of assuming the
  // reported resolution is its normalizer (observed Y can be Height + 1).
  // Source literals have rounding uncertainty: all intervals for the unknown
  // center offset must intersect, in both families, for one unique candidate.
  function calibrate(source, axis, dimension) {
    const relativeKey = axis === 'x' ? 'RelativePosX' : 'RelativePosY';
    const originalKey = axis === 'x' ? 'originalX' : 'originalY';
    for (const detail of source.slots) {
      for (const key of ['RelativePosX', 'RelativePosY']) {
        if (!Number.isFinite(numeric(detail.attributes[key]))) {
          fail('UNSUPPORTED_RELATIVE_POSITION', `${source.name}, panel ${detail.panelIndex}, has no usable ${key}. Reload a preset saved by BDO before applying position changes.`);
        }
      }
    }
    const groups = ['cd', 'quick'].map(family => ({ family, slots: source.slots.filter(detail => detail.family === family) }));
    const hasSpread = groups.some(group => new Set(group.slots.map(detail => detail[originalKey])).size > 1);
    if (!hasSpread) fail('UNCALIBRATED_RELATIVE_POSITION', `${source.name} has no position spread to verify the ${axis.toUpperCase()} coordinate mapping. Arrange a few slots along that axis in BDO, save its preset, and reload.`);
    const candidates = [];
    for (const denominator of [dimension - 1, dimension, dimension + 1]) {
      const offsets = {};
      let valid = denominator > 0;
      for (const group of groups) {
        let low = -Infinity;
        let high = Infinity;
        for (const detail of group.slots) {
          const relative = numeric(detail.attributes[relativeKey]);
          const offset = relative * denominator - detail[originalKey];
          const tolerance = denominator * quantizationUnit(detail.attributes[relativeKey]) / 2 + 1e-7;
          low = Math.max(low, offset - tolerance);
          high = Math.min(high, offset + tolerance);
        }
        if (low > high || !Number.isFinite(low) || !Number.isFinite(high)) { valid = false; break; }
        offsets[group.family] = (low + high) / 2;
      }
      if (valid) candidates.push({ denominator, offsets });
    }
    if (candidates.length !== 1) {
      fail('UNCALIBRATED_RELATIVE_POSITION', `${source.name}'s ${axis.toUpperCase()} coordinate mapping ${candidates.length ? 'is ambiguous' : 'does not match a supported saved display'}. Reload presets saved at BDO's current resolution before applying. Your local library can still be saved.`);
    }
    return candidates[0];
  }

  function plan(xml, state, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      fail('INVALID_OPTIONS', 'Write options must be an object.');
    }
    const requested = state;
    state = normalizeState(state);

    // The existing reader establishes supported versions, direct-child panel
    // identity, explicit LeftTop anchors, display values and complete presets.
    const original = G.parse(xml, { gameOptionsText: options.gameOptionsText });
    const display = original.report.display;
    if (original.report.clampedSlotCount) {
      fail('UNSUPPORTED_OFFSCREEN_POSITION', 'The BDO file contains offscreen slots that were fitted to the preview. Save those presets inside BDO, then reload before applying changes. Your local library can still be saved.');
    }
    for (let index = 0; index < 3; index += 1) {
      const profile = state.profiles[state.active[index]];
      if (profile.width !== display.width || profile.height !== display.height || profile.uiScale !== display.uiScale) {
        fail('DISPLAY_MISMATCH', `Preset ${index + 1} (${profile.name}) uses ${profile.width} × ${profile.height} at ${profile.uiScale}%. BDO is saved at ${display.width} × ${display.height} and ${display.uiScale}%. Match the preset's display settings to BDO before applying. Your local library can still be saved.`);
      }
    }

    const document = G.inspectDocument(xml);
    const section = document.children.find(node => node.name === 'UISettingPreset');
    const edits = [];
    const report = { changed: false, changedSlots: 0, changedAttributes: 0, roundedSlots: 0,
      scope: 'cooldown-and-quickslot-positions', presets: [], warnings: [] };
    const expected = [];

    for (let index = 0; index < 3; index += 1) {
      const source = original.report.presets[index];
      const profile = state.profiles[state.active[index]];
      const assignment = { number: index + 1, profileId: profile.id, name: profile.name, changedSlots: 0, changedAttributes: 0, calibration: {} };
      report.presets.push(assignment);
      const desiredSlots = new Map(profile.slots.map(slot => [slot.id, slot]));
      const requestedSlots = new Map(requested.profiles[profile.id].slots.map(slot => [slot.id, slot]));
      for (const slot of profile.slots) {
        const before = requestedSlots.get(slot.id);
        if (slot.x !== before.x || slot.y !== before.y) report.roundedSlots += 1;
      }
      for (const axis of ['x', 'y']) {
        const originalKey = axis === 'x' ? 'originalX' : 'originalY';
        if (source.slots.some(detail => desiredSlots.get(detail.id)[axis] !== detail[originalKey])) {
          assignment.calibration[axis] = calibrate(source, axis, axis === 'x' ? display.width : display.height);
        }
      }
      for (const detail of source.slots) {
        const slot = desiredSlots.get(detail.id);
        const element = section.children.find(node => node.name === source.sourceTag && numeric(node.attributes.Index) === detail.panelIndex);
        if (!slot || !element) fail('AMBIGUOUS_FORMAT', 'The requested slot could not be matched to one saved BDO panel.');
        const size = 40 * profile.uiScale / 100;
        if (slot.x < 0 || slot.y < 0 || slot.x + size > display.width || slot.y + size > display.height) {
          fail('INVALID_POSITION', `Preset ${index + 1}, ${detail.id}, is outside the saved BDO display.`);
        }
        expected.push({ preset: index, id: slot.id, x: slot.x, y: slot.y });
        let changedSlot = false;
        for (const [attribute, value, before, axis] of [['PosX', slot.x, detail.originalX, 'x'], ['PosY', slot.y, detail.originalY, 'y']]) {
          if (value === before) continue;
          const range = element.attributeRanges[attribute];
          if (!range || !own(element.attributes, attribute)) fail('AMBIGUOUS_FORMAT', `Cannot locate ${attribute} for ${source.name}, panel ${detail.panelIndex}.`);
          edits.push({ start: range.start, end: range.end, value: String(value) });
          const relativeAttribute = axis === 'x' ? 'RelativePosX' : 'RelativePosY';
          const relativeRange = element.attributeRanges[relativeAttribute];
          if (!relativeRange) fail('UNSUPPORTED_RELATIVE_POSITION', `Cannot locate ${relativeAttribute} for ${source.name}, panel ${detail.panelIndex}.`);
          const model = assignment.calibration[axis];
          // Use the common calibrated offset rather than carrying each old
          // rounded literal's error into a new, more precise literal. This
          // makes subsequent saves verifiable without accumulated drift.
          const relativeValue = (value + model.offsets[detail.family]) / model.denominator;
          edits.push({ start: relativeRange.start, end: relativeRange.end, value: relativeValue.toFixed(10) });
          assignment.changedAttributes += 2;
          changedSlot = true;
        }
        if (changedSlot) assignment.changedSlots += 1;
      }
      report.changedSlots += assignment.changedSlots;
      report.changedAttributes += assignment.changedAttributes;
    }

    // Descending replacements retain every byte outside the known values,
    // including quoting, whitespace, comments, unknown panels and nested chat.
    edits.sort((left, right) => right.start - left.start);
    let output = xml;
    let nextStart = xml.length;
    for (const edit of edits) {
      if (edit.start < 0 || edit.end > nextStart || edit.end <= edit.start) fail('AMBIGUOUS_FORMAT', 'The BDO attribute replacement ranges overlap.');
      output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
      nextStart = edit.start;
    }
    report.changed = edits.length > 0;

    // A second independent semantic read verifies all 120 desired positions
    // before the host receives any text suitable for writing.
    const verified = G.parse(output, { gameOptionsText: options.gameOptionsText });
    for (const desired of expected) {
      const found = verified.state.profiles[verified.state.active[desired.preset]].slots.find(slot => slot.id === desired.id);
      if (!found || found.x !== desired.x || found.y !== desired.y) fail('WRITE_VERIFICATION_FAILED', 'The generated BDO positions did not match the requested presets. Nothing was applied.');
    }
    // The written relative positions must remain calibratable on the next
    // save and yield the same denominator as the source.
    for (let index = 0; index < 3; index += 1) {
      for (const axis of Object.keys(report.presets[index].calibration)) {
        const model = calibrate(verified.report.presets[index], axis, axis === 'x' ? display.width : display.height);
        if (model.denominator !== report.presets[index].calibration[axis].denominator) fail('WRITE_VERIFICATION_FAILED', 'The generated relative coordinate mapping did not match the source. Nothing was applied.');
      }
    }
    return { xml: output, report, appliedState: state };
  }

  root.BDOGameWrite = Object.freeze({ plan, normalizeState });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BDOGameWrite;
})(typeof window !== 'undefined' ? window : globalThis);

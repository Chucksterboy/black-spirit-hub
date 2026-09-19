(function (root) {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const MAX_PROFILES = 100;
  const POSITION_EPSILON = 1e-6;
  const unsafeIds = new Set(['__proto__', 'prototype', 'constructor']);
  const validText = value => typeof value === 'string' && value.length > 0
    && value.length <= 60 && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
  const validId = value => validText(value) && !unsafeIds.has(value);

  // Imported state is plain, serializable data. Reject accessors and extra
  // fields before reading them so validation and JSON cloning agree.
  function dataRecord(value, requiredKeys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(value);
    if (requiredKeys && (keys.length !== requiredKeys.length || requiredKeys.some(key => !own(value, key)))) return false;
    return keys.every(key => {
      if (typeof key !== 'string') return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return own(descriptor, 'value') && descriptor.enumerable;
    });
  }

  function dataArray(value, maxLength) {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maxLength) return false;
    if (Reflect.ownKeys(value).length !== value.length + 1) return false;
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) return false;
    }
    return true;
  }

  function fallbackSlots() {
    const slots = [];
    for (let n = 1; n <= 20; n += 1) {
      slots.push({ id: `cd-${n}`, family: 'cd', number: n,
        x: 1530 + ((n - 1) % 5) * 64, y: 540 + Math.floor((n - 1) / 5) * 74 });
      slots.push({ id: `q-${n}`, family: 'quick', number: n,
        x: 430 + ((n - 1) % 5) * 64, y: 670 + Math.floor((n - 1) / 5) * 74 });
    }
    return slots;
  }

  function createState(seedSlots) {
    const seed = clone(seedSlots && seedSlots.length ? seedSlots : fallbackSlots());
    const profiles = {};
    const samples = [
      ['kunoichi', 'Kunoichi', 0, 0],
      ['shai', 'Shai', -75, 36],
      ['maegu', 'Maegu', 45, -40],
      ['sage', 'Sage', 90, 15]
    ];
    samples.forEach(([id, name, dx, dy]) => {
      const shifted = translateGroup(seed, seed.map(s => s.id), dx, dy,
        { width: 2560, height: 1440, size: 40, snap: false });
      profiles[id] = { id, name, slots: shifted.slots, width: 2560, height: 1440, uiScale: 100 };
    });
    const state = { profiles, active: ['kunoichi', 'shai', 'maegu'], library: ['sage'], editing: 'kunoichi' };
    const validation = validateState(state);
    if (!validation.valid) throw new Error(`Invalid starting layout: ${validation.errors.join('; ')}`);
    return state;
  }

  function requireLoc(state, loc) {
    if (!loc || !['active', 'library'].includes(loc.area) || !Number.isInteger(loc.index)
      || loc.index < 0 || loc.index >= state[loc.area].length) {
      throw new Error('Choose an existing preset or saved layout.');
    }
  }

  function swap(state, sourceLoc, targetLoc) {
    const validation = validateState(state);
    if (!validation.valid) throw new Error(validation.errors[0]);
    requireLoc(state, sourceLoc);
    requireLoc(state, targetLoc);
    const next = clone(state);
    const source = next[sourceLoc.area][sourceLoc.index];
    next[sourceLoc.area][sourceLoc.index] = next[targetLoc.area][targetLoc.index];
    next[targetLoc.area][targetLoc.index] = source;
    return next;
  }

  function saveAs(state, name) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!validText(cleanName)) throw new Error('Give this layout a name of 1–60 characters, without line breaks.');
    const validation = validateState(state);
    if (!validation.valid) throw new Error(validation.errors[0]);
    if (Object.keys(state.profiles).length >= MAX_PROFILES) throw new Error(`This library supports up to ${MAX_PROFILES} layouts.`);
    const next = clone(state);
    let base = cleanName.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'layout';
    if (unsafeIds.has(base)) base = `layout-${base}`;
    base = base.slice(0, 60);
    let id = base;
    let suffix = 2;
    while (own(next.profiles, id)) {
      const ending = `-${suffix++}`;
      id = `${base.slice(0, 60 - ending.length)}${ending}`;
    }
    Object.defineProperty(next.profiles, id, { enumerable: true, configurable: true, writable: true,
      value: { ...clone(next.profiles[next.editing]), id, name: cleanName } });
    next.library.push(id);
    next.editing = id;
    return next;
  }

  /** Change only the display name; saved identities and slot assignments stay stable. */
  function rename(state, id, name) {
    const validation = validateState(state);
    if (!validation.valid) throw new Error(validation.errors[0]);
    if (!validId(id) || !own(state.profiles, id)) throw new Error('Choose an existing preset or saved layout.');
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!validText(cleanName) || cleanName.length > 40) {
      throw new Error('Give this preset a name of 1–40 characters, without line breaks.');
    }
    if (Object.values(state.profiles).some(profile => profile.id !== id
      && profile.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error('That name is already in your library.');
    }
    const next = clone(state);
    next.profiles[id].name = cleanName;
    return next;
  }

  /** Remove a saved layout while keeping all three assigned preset slots intact. */
  function deletePreset(state, id) {
    const validation = validateState(state);
    if (!validation.valid) throw new Error(validation.errors[0]);
    if (!validId(id) || !own(state.profiles, id)) throw new Error('Choose an existing preset or saved layout.');
    if (state.active.includes(id)) throw new Error('Replace the assigned preset slot before deleting this layout.');
    const next = clone(state);
    next.library = next.library.filter(savedId => savedId !== id);
    delete next.profiles[id];
    if (next.editing === id) next.editing = next.active[0];
    return next;
  }

  /** Move all selected boxes by one common delta. The first selected slot is the
   * snap anchor unless options.anchorId is given. Guides are game-coordinate
   * numbers. Inputs are never modified. size and tolerance use game units.
   * movementAxis restricts movement and snap corrections to 'x' or 'y'.
   * Optional guideTargets are absolute anchor top-left positions. Their latch
   * uses raw bounded movement, with separate capture and release distances. */
  function translateGroup(slots, selectedIds, dx, dy, options = {}) {
    const selected = new Set(selectedIds || []);
    const group = slots.filter(slot => selected.has(slot.id));
    const next = slots.map(slot => ({ ...slot }));
    const guideLatch = options.guideTargets !== undefined ? { x: null, y: null } : null;
    if (!group.length) return { slots: next, dx: 0, dy: 0, guides: { x: [], y: [] }, ...(guideLatch ? { guideLatch } : {}) };
    const width = finite(options.width) && options.width > 0 ? options.width : 2560;
    const height = finite(options.height) && options.height > 0 ? options.height : 1440;
    const size = finite(options.size) && options.size > 0 ? options.size : 40;
    const tolerance = finite(options.tolerance) && options.tolerance >= 0 ? options.tolerance : 12;
    const minX = Math.min(...group.map(s => s.x));
    const maxX = Math.max(...group.map(s => s.x + size));
    const minY = Math.min(...group.map(s => s.y));
    const maxY = Math.max(...group.map(s => s.y + size));
    const lowX = -minX;
    const highX = width - maxX;
    const lowY = -minY;
    const highY = height - maxY;
    // Oversized groups cannot fit without changing their spacing; leave that
    // axis stationary instead of distorting the arrangement.
    const boundedX = value => lowX <= highX ? clamp(value, lowX, highX) : 0;
    const boundedY = value => lowY <= highY ? clamp(value, lowY, highY) : 0;
    const allowX = options.movementAxis !== 'y';
    const allowY = options.movementAxis !== 'x';
    let actualX = allowX ? boundedX(finite(dx) ? dx : 0) : 0;
    let actualY = allowY ? boundedY(finite(dy) ? dy : 0) : 0;
    const guides = { x: [], y: [] };

    if (options.snap) {
      const anchor = group.find(slot => slot.id === options.anchorId) || group[0];
      const ax = anchor.x + actualX;
      const ay = anchor.y + actualY;
      let bestX = null;
      let bestY = null;
      if (guideLatch) {
        const capture = finite(options.guideTolerance) && options.guideTolerance >= 0 ? options.guideTolerance : tolerance;
        const release = Math.max(capture, finite(options.guideReleaseTolerance) && options.guideReleaseTolerance >= 0
          ? options.guideReleaseTolerance : capture * 1.75);
        const heldTarget = (axis, position, origin, bounded) => {
          const targets = Array.isArray(options.guideTargets?.[axis]) ? options.guideTargets[axis].filter(finite) : [];
          const reachable = target => Math.abs(bounded(target - origin) - (target - origin)) <= 0.00001;
          const latched = options.guideLatch?.[axis];
          if (finite(latched) && targets.includes(latched) && reachable(latched) && Math.abs(position - latched) <= release) return latched;
          let best = null;
          for (const target of targets) {
            const distance = Math.abs(position - target);
            if (distance <= capture && reachable(target) && (best === null || distance < Math.abs(position - best))) best = target;
          }
          return best;
        };
        if (allowX) guideLatch.x = heldTarget('x', ax, anchor.x, boundedX);
        if (allowY) guideLatch.y = heldTarget('y', ay, anchor.y, boundedY);
      }
      const candidate = (current, correction, line, bounded, currentDelta) => {
        if (Math.abs(correction) > tolerance || Math.abs(bounded(currentDelta + correction) - (currentDelta + correction)) > 0.00001) return current;
        if (!current || Math.abs(correction) < Math.abs(current.correction)) return { correction, line };
        return current;
      };
      slots.forEach(other => {
        if (selected.has(other.id)) return;
        const verticalGap = Math.max(other.y - (ay + size), ay - (other.y + size), 0);
        const horizontalGap = Math.max(other.x - (ax + size), ax - (other.x + size), 0);
        if (allowX && guideLatch?.x == null && verticalGap <= tolerance) {
          // Neighboring outer edges, then equal left/right edges.
          [[other.x - size, other.x], [other.x + size, other.x + size], [other.x, other.x]]
            .forEach(([target, line]) => { bestX = candidate(bestX, target - ax, line, boundedX, actualX); });
        }
        if (allowY && guideLatch?.y == null && horizontalGap <= tolerance) {
          [[other.y - size, other.y], [other.y + size, other.y + size], [other.y, other.y]]
            .forEach(([target, line]) => { bestY = candidate(bestY, target - ay, line, boundedY, actualY); });
        }
      });
      if (bestX) { actualX += bestX.correction; guides.x.push(bestX.line); }
      if (bestY) { actualY += bestY.correction; guides.y.push(bestY.line); }
      if (guideLatch?.x != null) actualX = guideLatch.x - anchor.x;
      if (guideLatch?.y != null) actualY = guideLatch.y - anchor.y;
    }
    next.forEach(slot => {
      if (selected.has(slot.id)) { slot.x += actualX; slot.y += actualY; }
    });
    return { slots: next, dx: actualX, dy: actualY, guides, ...(guideLatch ? { guideLatch } : {}) };
  }

  /** Choose an initial axis from segment displacement, then detect deliberate
   * turns from recent pointer deltas. Distances use game units; scale converts
   * them to CSS pixels. A switch carries only the accumulated new-axis motion. */
  function updateAxisIntent(intent, dx, dy, scale = 1) {
    const axis = intent?.axis === 'x' || intent?.axis === 'y' ? intent.axis : null;
    const x = finite(dx) ? dx : 0;
    const y = finite(dy) ? dy : 0;
    const zoom = finite(scale) && scale > 0 ? scale : 1;
    if (axis === null) {
      return { axis: Math.hypot(x, y) * zoom >= 4 ? (Math.abs(x) >= Math.abs(y) ? 'x' : 'y') : null,
        turn: 0, switched: false, carry: 0 };
    }
    const parallel = axis === 'x' ? x : y;
    const perpendicular = axis === 'x' ? y : x;
    if (Math.abs(perpendicular) <= Math.abs(parallel) * 1.5) {
      return { axis, turn: 0, switched: false, carry: 0 };
    }
    const previous = finite(intent.turn) ? intent.turn : 0;
    const turn = Math.sign(previous) === Math.sign(perpendicular) ? previous + perpendicular : perpendicular;
    if (Math.abs(turn) * zoom >= 8) {
      return { axis: axis === 'x' ? 'y' : 'x', turn: 0, switched: true, carry: turn };
    }
    return { axis, turn, switched: false, carry: 0 };
  }

  function selectRect(slots, rect, size = 40) {
    const x1 = finite(rect.x1) ? rect.x1 : rect.x;
    const y1 = finite(rect.y1) ? rect.y1 : rect.y;
    const x2 = finite(rect.x2) ? rect.x2 : x1 + rect.width;
    const y2 = finite(rect.y2) ? rect.y2 : y1 + rect.height;
    if (![x1, y1, x2, y2].every(finite)) return [];
    const left = Math.min(x1, x2), right = Math.max(x1, x2);
    const top = Math.min(y1, y2), bottom = Math.max(y1, y2);
    return slots.filter(slot => slot.x <= right && slot.x + size >= left
      && slot.y <= bottom && slot.y + size >= top).map(slot => slot.id);
  }

  function inspectState(state) {
    const errors = [];
    if (!dataRecord(state, ['profiles', 'active', 'library', 'editing']) || !dataRecord(state.profiles)) {
      return { valid: false, errors: ['Missing profile data.'] };
    }
    const profileIds = Object.keys(state.profiles);
    if (profileIds.length < 3 || profileIds.length > MAX_PROFILES) {
      return { valid: false, errors: [`There must be between 3 and ${MAX_PROFILES} layouts.`] };
    }
    if (profileIds.some(id => !validId(id))) return { valid: false, errors: ['Invalid or reserved layout identity.'] };
    if (!dataArray(state.active, 3) || state.active.length !== 3) errors.push('There must be three active preset slots.');
    if (!dataArray(state.library, MAX_PROFILES - 3)) errors.push('Invalid saved layout library.');
    if (errors.length) return { valid: false, errors };
    const assigned = [...state.active, ...state.library];
    if (new Set(assigned).size !== assigned.length) errors.push('A layout may occupy only one location.');
    if (assigned.some(id => !validId(id) || !own(state.profiles, id))) errors.push('Unknown assigned layout.');
    if (!validId(state.editing) || !own(state.profiles, state.editing)) errors.push('Unknown editing layout.');
    const assignmentSet = new Set(assigned);
    Object.entries(state.profiles).forEach(([id, profile]) => {
      if (!dataRecord(profile, ['id', 'name', 'slots', 'width', 'height', 'uiScale'])) { errors.push(`Invalid profile: ${id}.`); return; }
      if (profile.id !== id || !validText(profile.name)) errors.push(`Invalid profile identity: ${id}.`);
      if (!assignmentSet.has(id)) errors.push(`Unassigned profile: ${id}.`);
      const validDisplay = Number.isInteger(profile.width) && profile.width >= 800 && profile.width <= 7680
        && Number.isInteger(profile.height) && profile.height >= 600 && profile.height <= 4320
        && finite(profile.uiScale) && profile.uiScale >= 50 && profile.uiScale <= 150;
      if (!validDisplay) errors.push(`Invalid display settings: ${id}.`);
      if (!dataArray(profile.slots, 40) || profile.slots.length !== 40) { errors.push(`${id} must have 40 slots.`); return; }
      const slotIds = new Set();
      const size = 40 * profile.uiScale / 100;
      profile.slots.forEach(slot => {
        if (!dataRecord(slot, ['id', 'family', 'number', 'x', 'y'])) { errors.push(`Invalid slot: ${id}.`); return; }
        const canonical = (slot.family === 'cd' || slot.family === 'quick')
          && Number.isInteger(slot.number) && slot.number >= 1 && slot.number <= 20
          && slot.id === `${slot.family === 'cd' ? 'cd' : 'q'}-${slot.number}`;
        if (!canonical || slotIds.has(slot.id)) errors.push(`Invalid or duplicate slot identity in ${id}.`);
        slotIds.add(slot.id);
        if (!finite(slot.x) || !finite(slot.y) || slot.x < -POSITION_EPSILON || slot.y < -POSITION_EPSILON
          || (validDisplay && (slot.x + size > profile.width + POSITION_EPSILON
            || slot.y + size > profile.height + POSITION_EPSILON))) errors.push(`Slot position outside ${id}'s viewport.`);
      });
    });
    return { valid: errors.length === 0, errors };
  }

  function validateState(state) {
    try { return inspectState(state); }
    catch (_) { return { valid: false, errors: ['Layout data must be plain, serializable records.'] }; }
  }

  root.BDOEngine = Object.freeze({ createState, swap, saveAs, rename, deletePreset, translateGroup, updateAxisIntent, selectRect, validateState, clone });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BDOEngine;
})(typeof window !== 'undefined' ? window : globalThis);

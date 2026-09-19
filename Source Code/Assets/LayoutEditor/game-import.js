(function (root) {
  'use strict';

  // This module reads a BDO XML fragment. It never reads or writes files itself.
  const COOLDOWN_INDICES = Object.freeze([...Array.from({ length: 10 }, (_, i) => 128 + i),
    ...Array.from({ length: 10 }, (_, i) => 148 + i)]);
  const QUICK_INDICES = Object.freeze(Array.from({ length: 20 }, (_, i) => 91 + i));
  const MAX_XML_LENGTH = 32 * 1024 * 1024;
  const own = (record, key) => Object.prototype.hasOwnProperty.call(record, key);

  function fail(code, message, report) {
    const error = new Error(message);
    error.code = code;
    if (report) error.report = report;
    throw error;
  }

  function xmlError(message, offset) {
    fail('INVALID_XML', `Cannot read gamevariable.xml: ${message} at character ${offset}.`);
  }

  function validXmlCodePoint(code) {
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 0xd7ff)
      || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff);
  }

  function decodeXml(value, offset) {
    for (const char of value) {
      if (!validXmlCodePoint(char.codePointAt(0))) xmlError('invalid XML character', offset);
    }
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    // A single pass prevents double decoding &amp;lt; into markup.
    return value.replace(/&([^;]*);|&/g, (match, entity) => {
      if (entity && own(named, entity)) return named[entity];
      const numeric = entity && /^(?:#[0-9]+|#x[0-9a-fA-F]+)$/.test(entity);
      if (numeric) {
        const hex = entity.startsWith('#x');
        const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        if (validXmlCodePoint(code)) return String.fromCodePoint(code);
      }
      xmlError('unknown or malformed entity reference', offset);
    });
  }

  /** Small non-validating XML-fragment reader. Comments, CDATA and processing
   * instructions are inert; declarations/DTDs are rejected, so no entities can
   * read local files or issue network requests. Only direct child relationships
   * are queried below, preventing nested or commented lookalikes from matching. */
  function readFragment(input) {
    if (typeof input !== 'string' || !input.trim()) fail('INVALID_XML', 'Choose a nonempty gamevariable.xml file.');
    if (input.length > MAX_XML_LENGTH) fail('INVALID_XML', 'gamevariable.xml exceeds the 32 MiB import limit.');
    // Offsets always refer to the original string, including an optional BOM.
    // The writer uses these ranges to replace only known attribute values.
    const xml = input;
    const document = { name: '#fragment', attributes: Object.create(null), children: [], start: 0, end: xml.length };
    const stack = [document];
    let cursor = input.charCodeAt(0) === 0xfeff ? 1 : 0;
    let nodes = 0;
    const whitespace = () => { while (/[\t\r\n ]/.test(xml[cursor] || '\0')) cursor += 1; };
    const name = () => {
      const match = /^[A-Za-z_:][A-Za-z0-9_.:-]*/.exec(xml.slice(cursor));
      if (!match) xmlError('expected an element or attribute name', cursor);
      cursor += match[0].length;
      return match[0];
    };

    while (cursor < xml.length) {
      if (xml[cursor] !== '<') {
        const end = xml.indexOf('<', cursor);
        const next = end === -1 ? xml.length : end;
        const content = xml.slice(cursor, next);
        if (content.includes(']]>')) xmlError('unexpected CDATA terminator', cursor);
        const decoded = decodeXml(content, cursor);
        if (stack.length === 1 && decoded.trim()) xmlError('text outside an element', cursor);
        cursor = next;
        continue;
      }
      if (xml.startsWith('<!--', cursor)) {
        const end = xml.indexOf('-->', cursor + 4);
        if (end === -1 || xml.slice(cursor + 4, end).includes('--')) xmlError('malformed comment', cursor);
        cursor = end + 3;
        continue;
      }
      if (xml.startsWith('<![CDATA[', cursor)) {
        const end = xml.indexOf(']]>', cursor + 9);
        if (end === -1 || stack.length === 1) xmlError('malformed CDATA section', cursor);
        cursor = end + 3;
        continue;
      }
      if (xml.startsWith('<?', cursor)) {
        const end = xml.indexOf('?>', cursor + 2);
        if (end === -1) xmlError('unterminated processing instruction', cursor);
        cursor = end + 2;
        continue;
      }
      if (xml.startsWith('<!', cursor)) xmlError('DTD and entity declarations are unsupported', cursor);
      if (xml.startsWith('</', cursor)) {
        cursor += 2;
        const closingName = name();
        whitespace();
        if (xml[cursor] !== '>' || stack.length === 1 || stack[stack.length - 1].name !== closingName) {
          xmlError('mismatched closing element', cursor);
        }
        cursor += 1;
        stack.pop().end = cursor;
        continue;
      }
      const start = cursor;
      cursor += 1;
      const element = { name: name(), attributes: Object.create(null), attributeRanges: Object.create(null), children: [], start };
      nodes += 1;
      if (nodes > 200000 || stack.length > 128) xmlError('XML structure is too large or deeply nested', cursor);
      let selfClosing = false;
      while (true) {
        const before = cursor;
        whitespace();
        if (xml.startsWith('/>', cursor)) { cursor += 2; selfClosing = true; break; }
        if (xml[cursor] === '>') { cursor += 1; break; }
        if (cursor === before) xmlError('expected whitespace before an attribute', cursor);
        const key = name();
        if (own(element.attributes, key)) xmlError(`duplicate attribute ${key}`, cursor);
        whitespace();
        if (xml[cursor] !== '=') xmlError('expected attribute equals sign', cursor);
        cursor += 1;
        whitespace();
        const quote = xml[cursor];
        if (quote !== '"' && quote !== "'") xmlError('attribute values must be quoted', cursor);
        cursor += 1;
        const end = xml.indexOf(quote, cursor);
        if (end === -1 || xml.slice(cursor, end).includes('<')) xmlError('malformed attribute value', cursor);
        element.attributes[key] = decodeXml(xml.slice(cursor, end), cursor);
        element.attributeRanges[key] = { start: cursor, end, quote };
        cursor = end + 1;
      }
      element.startTagEnd = cursor;
      if (selfClosing) element.end = cursor;
      stack[stack.length - 1].children.push(element);
      if (!selfClosing) stack.push(element);
    }
    if (stack.length !== 1) xmlError('unclosed element', cursor);
    return document;
  }

  function children(parent, name) { return parent.children.filter(child => child.name === name); }
  function one(parent, name) {
    const matches = children(parent, name);
    if (matches.length > 1) fail('AMBIGUOUS_FORMAT', `gamevariable.xml contains more than one ${name} section.`);
    return matches[0];
  }
  function numeric(value) {
    if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return NaN;
    const result = Number(value);
    return Number.isFinite(result) ? result : NaN;
  }
  function gameOptions(text) {
    const result = Object.create(null);
    if (text === undefined || text === null || text === '') return result;
    if (typeof text !== 'string' || text.length > 1024 * 1024) fail('INVALID_DISPLAY', 'GameOption.txt is invalid or exceeds 1 MiB.');
    for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const match = /^\s*(width|height|uiScale)\s*=\s*(.*?)\s*$/i.exec(line);
      if (!match) continue;
      const key = match[1].toLowerCase();
      if (own(result, key)) fail('INVALID_DISPLAY', `GameOption.txt contains duplicate ${match[1]} settings.`);
      result[key] = match[2];
    }
    return result;
  }

  function readDisplay(document, fallbackText) {
    const global = one(document, 'GameOptionGlobal');
    const resolution = global && one(global, 'Resolution');
    const scale = global && one(global, 'UiScale');
    // Read the fallback only when a setting is absent. A stale or malformed
    // GameOption.txt must not override valid settings in GameOptionGlobal.
    const fallback = !resolution || !scale ? gameOptions(fallbackText) : Object.create(null);
    const width = numeric(resolution ? resolution.attributes.Width : fallback.width);
    const height = numeric(resolution ? resolution.attributes.Height : fallback.height);
    const rawScale = numeric(scale ? scale.attributes.Value : fallback.uiscale);
    const uiScale = rawScale >= 0.5 && rawScale <= 1.5 ? Math.round(rawScale * 100 * 1e8) / 1e8 : rawScale;
    if (!Number.isInteger(width) || width < 800 || width > 7680 || !Number.isInteger(height) || height < 600 || height > 4320) {
      fail('INVALID_DISPLAY', 'The saved game resolution is missing or unsupported. Expected 800–7680 × 600–4320 in GameOptionGlobal/Resolution or GameOption.txt.');
    }
    if (!Number.isFinite(uiScale) || uiScale < 50 || uiScale > 150) {
      fail('INVALID_DISPLAY', 'The saved UI scale is missing or unsupported. Expected 50–150% in GameOptionGlobal/UiScale or GameOption.txt.');
    }
    return { width, height, uiScale,
      resolutionSource: resolution ? 'GameOptionGlobal/Resolution' : 'GameOption.txt',
      uiScaleSource: scale ? 'GameOptionGlobal/UiScale' : 'GameOption.txt' };
  }

  function parse(xml, options = {}) {
    if (!options || typeof options !== 'object') fail('INVALID_OPTIONS', 'Import options must be an object.');
    const document = readFragment(xml);
    const section = one(document, 'UISettingPreset');
    if (!section) fail('MISSING_PRESET', 'No UISettingPreset section was found. Choose the account gamevariable.xml under Documents/Black Desert/UserCache.');
    if (section.attributes.Version !== '1') fail('UNSUPPORTED_GAME_FORMAT', `UISettingPreset version ${section.attributes.Version || '(missing)'} is not supported.`);
    const display = readDisplay(document, options.gameOptionsText);
    const report = {
      sourceLabel: typeof options.sourceLabel === 'string' && options.sourceLabel.trim() ? options.sourceLabel : 'gamevariable.xml',
      display,
      mapping: {
        cooldown: { panelIndices: [...COOLDOWN_INDICES], numbering: 'Sequential editor labels CD 1–20.' },
        quickslot: { panelIndices: [...QUICK_INDICES], numbering: 'Sequential editor labels QS 1–20; in-game key/slot numbering is not yet verified.' }
      },
      presets: [], warnings: [], hiddenSlotCount: 0, clampedSlotCount: 0
    };
    const state = { profiles: {}, active: [], library: [], editing: 'bdo-preset-1' };
    const mappings = [
      ...COOLDOWN_INDICES.map((panelIndex, i) => ({ panelIndex, id: `cd-${i + 1}`, family: 'cd', number: i + 1 })),
      ...QUICK_INDICES.map((panelIndex, i) => ({ panelIndex, id: `q-${i + 1}`, family: 'quick', number: i + 1 }))
    ];
    for (let preset = 0; preset < 3; preset += 1) {
      const sourceTag = `UISettingPreset${preset}`;
      const entries = children(section, sourceTag);
      if (!entries.length) fail('MISSING_PRESET', `BDO Preset ${preset + 1} is not saved in this file. Save all three presets in BDO's Edit UI, then reload Documents.`, report);
      const id = `bdo-preset-${preset + 1}`;
      const name = `BDO Preset ${preset + 1}`;
      const profile = { id, name, width: display.width, height: display.height, uiScale: display.uiScale, slots: [] };
      const detail = { id, number: preset + 1, name, sourceTag, slots: [], hiddenSlots: [], clampedSlots: [] };
      report.presets.push(detail);
      for (const mapping of mappings) {
        const panels = entries.filter(entry => numeric(entry.attributes.Index) === mapping.panelIndex);
        if (panels.length !== 1) {
          fail(panels.length ? 'DUPLICATE_PANEL' : 'MISSING_PANEL', `${name} ${panels.length ? 'has duplicate' : 'is missing'} panel ${mapping.panelIndex}. Save this preset again in BDO's Edit UI before importing.`, report);
        }
        const attributes = panels[0].attributes;
        const originalX = numeric(attributes.PosX);
        const originalY = numeric(attributes.PosY);
        if (!Number.isFinite(originalX) || !Number.isFinite(originalY)) {
          fail('MISSING_POSITION', `${name}, panel ${mapping.panelIndex}, has no usable PosX/PosY. This importer does not guess positions from another preset or relative coordinates.`, report);
        }
        const anchor = attributes.PendingType || null;
        if (anchor !== 'LeftTop') fail('UNSUPPORTED_ANCHOR', `${name}, panel ${mapping.panelIndex}, uses ${anchor || 'an unspecified'} anchor. Only explicit LeftTop positions are supported.`, report);
        const visibility = attributes.IsShow;
        if (visibility !== 'true' && visibility !== 'false') fail('UNSUPPORTED_GAME_FORMAT', `${name}, panel ${mapping.panelIndex}, has no supported IsShow value.`, report);
        const hidden = visibility === 'false';
        const size = 40 * display.uiScale / 100;
        const editorX = Math.min(display.width - size, Math.max(0, originalX));
        const editorY = Math.min(display.height - size, Math.max(0, originalY));
        const clamped = editorX !== originalX || editorY !== originalY;
        profile.slots.push({ id: mapping.id, family: mapping.family, number: mapping.number, x: editorX, y: editorY });
        detail.slots.push({ ...mapping, attributes: { ...attributes }, originalX, originalY, editorX, editorY, hidden, anchor, clamped });
        if (hidden) detail.hiddenSlots.push(mapping.id);
        if (clamped) detail.clampedSlots.push(mapping.id);
      }
      state.profiles[id] = profile;
      state.active.push(id);
      report.hiddenSlotCount += detail.hiddenSlots.length;
      report.clampedSlotCount += detail.clampedSlots.length;
      if (detail.hiddenSlots.length) report.warnings.push(`${name}: ${detail.hiddenSlots.length} slot(s) hidden in BDO are shown in the editor so all 40 can be arranged.`);
      if (detail.clampedSlots.length) report.warnings.push(`${name}: ${detail.clampedSlots.length} offscreen slot(s) were moved to the nearest canvas edge; original positions are preserved in the import report.`);
    }
    // Relative coordinates and DynamicPanelScale are retained only in source
    // data; their precedence and per-panel transform have not been verified.
    return { state, report };
  }

  // A structural inspection API for the surgical writer. It neither accepts
  // filesystem paths nor changes the input; consumers must also call parse()
  // to establish that the BDO preset schema is supported.
  root.BDOGameImport = Object.freeze({ parse, inspectDocument: readFragment });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BDOGameImport;
})(typeof window !== 'undefined' ? window : globalThis);

(() => {
  "use strict";
  const legacyPrefix = ["bdo", "Multi", "Tool"].join("") + ".";
  const isOwnedKey = key => key.startsWith("blackSpiritHub.") || key.startsWith(legacyPrefix) || key === "bdoFontFavorites" || key === "bdoTradeCalculatorAppearance" || key === "bsh.uiRefresh.navigation.v1";
  globalThis.BshStoreMigration = Object.freeze({
    collect() {
      const preferences = {};
      try {
        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index);
          if (!key || !isOwnedKey(key)) continue;
          const value = localStorage.getItem(key);
          if (value !== null) preferences[key] = value;
        }
      } catch (_) { }
      return preferences;
    }
  });
})();

# Reversible UI refresh

Introduced as a reversible local trial on version 0.9.62 and included in the
version 0.9.63 release. The refresh remains optional through Settings.

## Try the changes

- Open the title-bar Settings cog. **Refreshed interface** switches the trial on
  or off without resetting progress, themes, inventory, or existing preferences.
- In **Appearance**, choose Standard, Large, or Extra Large text separately from
  spacing. **Calmer content panels** softens decoration without replacing themes.
- Settings are grouped into General, Appearance, Notifications, and Data & Updates.
  Search works across all groups. Boss sound/voice settings and weekly reminders
  link to their existing controls rather than duplicating notification state.
- Navigation has All tools, Favorites, and Customize. Search remains available
  through **Ctrl+K**, without a navigation button. Reordering
  and favorites are optional; every original tool remains available.
- The grind-zone picker supports favorites, recent zones, region/party/gear
  filters, and searches by drop name. Select a drop for its larger icon, exact
  available price and provenance. Market tracking requires an explicit version
  selection and confirmation.
- Market charts can expand, share a date cursor, and support left/right keyboard
  inspection. Missing history and failed requests have distinct messages.
- Weeklies can show only remaining tasks and sort by nearest reset. **Undo All
  done** lasts 60 seconds and preserves resets, earlier completions, and later
  individual changes.
- Recipe Book keeps its detailed view by default. Compact results, ingredient
  drawers, favorites, and recent searches are available. Planning does not consume
  inventory.

The master switch restores the previous navigation order and presentation. It
does not undo deliberate actions such as marking a weekly complete, changing an
existing setting, or adding market tracking. New UI-only preferences are kept so
they can be reused when the trial is enabled again.

## Exact rollback

A verified pre-change backup contains the installed application, its installer,
the full user profile, and a source snapshot including uncommitted work. Use the
backup's `RESTORE-README.md` for its exact location and restoration guidance.
Restoring only the old application preserves newer progress. Restoring the old
profile would roll that progress back and requires a separate explicit choice.

## Verification

`scripts/verify.ps1` includes four dedicated non-visual UI regression suites plus
the existing application checks. They cover Settings control identity and restore,
keyboard navigation and modal conflicts, exact search routing, safe market actions,
linked charts and asynchronous errors, weekly reset/undo behavior, and recipe
planning/persistence. Visual review is intentionally left to the user.

# Dehkia Fuel icons

This folder contains the factual item artwork used by the Dehkia Fuel view. Every committed icon is a native 44 x 44 transparent PNG and is pinned by SHA-256 in `manifest.json`. The UI must render these files at 44 x 44 or smaller; enlarging them recreates the pixelation this asset set is designed to prevent.

## Catalog coverage

The manifest covers the 26 accessories exposed by the BDO Alerts Dehkia endpoint at PRI (I), DUO (II), and TRI (III), plus Magical Lightstone Crystal for the explanatory header.

- Low-yield accessories (25 / 75 / 210 Light at PRI / DUO / TRI): Forest Ronaros Ring (12042), Serap's Necklace (11628), Sicil's Necklace (11625), Centaurus Belt (12229), Orkinrad's Belt (12251), Ring of Cadry Guardian (12032), Narc Ear Accessory (11834), Basilisk's Belt (12230), Eye of the Ruins Ring (12060), Ring of Crescent Guardian (12031), and Valtarra Eclipsed Belt (12236).
- High-yield accessories (165 / 450 / 1275 Light at PRI / DUO / TRI): Tungrad Earring (11828), Laytenn's Power Stone (11630), Ogre Ring (11607), Ethereal Earring (11856), Tungrad Necklace (11629), Tungrad Belt (12237), Tungrad Ring (12061), Revived River Necklace (11662), Revived Lunar Necklace (11663), Black Distortion Earring (11853), Turo's Belt (12257), Ominous Ring (12068), Dawn Earring (11855), Vaha's Dawn (11875), and Taebaek's Belt (12282).

The gameplay list and yields are documented by Pearl Abyss in the [Dehkia's Lantern guide](https://blackdesert.pearlabyss.com/Console/en-us/Game/Wiki?_masterWikiNo=567). Ocean Haze Ring is deliberately not included: BDO Codex currently mentions it, but the BDO Alerts catalog and the current Pearl Abyss guide do not include it in either yield group.

## Provenance and native resolution

- All 26 accessory files and Magical Lightstone Crystal (766108) are lossless PNG decodes of their exact `new_icon` WebP artwork hosted by BDO Codex. Every URL was extracted from the matching BDO Codex item page and is recorded per item in `manifest.json` together with both the remote-source and local-output SHA-256 hashes.
- The audited BDO Codex WebPs, Garmoth `new_icon` files, and Pearl Abyss NA/EU Central Market PNGs are all natively 44 x 44. No verified larger original exists on those services. These replacements therefore retain the original 44 x 44 pixels instead of enlarging a 44 x 44 source to a nominal 72 x 72 file.
- Magical Lightstone Crystal is pinned from `https://bdocodex.com/items/new_icon/03_etc/00766108.webp`. Its audited source SHA-256 is `10105B109A7C639245B74AFA959A83E8FCC80F98CAC5B1FDEF0621D1CE9D9AC6`; the native transparent PNG output SHA-256 is `48ED785C2773FF57D24B8B01FA07B8CAA13ACBA821EF92590D3BB9D6D968FD41`.

Black Desert item names and artwork belong to Pearl Abyss. BDO Codex is recorded as the retrieval host for the mirrored game artwork; the app must not imply that BDO Codex or Pearl Abyss endorses Black Spirit Hub.

## Magical Lightstone Crystal value semantics

Each Dehkia heating recipe consumes ten Magical Lightstone Crystals. Item 766108 is bound, so the app must not present a fabricated Central Market price for it. If the UI offers an optional opportunity-cost estimate, document that it is derived from the user's chosen exchange input. The simplest official baseline uses Imperfect Lightstone of Fire/Earth/Wind/Flora (IDs 766104, 766105, 766106, and 766107), each of which yields six Magical Lightstone Crystals through Dalishain; it is not a listing price for item 766108. Pearl Abyss documents the exchange quantities in the [Artifacts & Lightstones guide](https://blackdesert.pearlabyss.com/Console/en-US/Game/Wiki?_masterWikiNo=511).

## Verification and controlled refresh

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-dehkia-fuel-icons.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-dehkia-fuel-icons.ps1
```

The updater stages all 27 pinned native sources and validates their source hashes and 44 x 44 dimensions. The verifier independently checks every committed PNG's output hash, dimensions, transparency, and catalog coverage. Both fail closed if a remote source or local output changes; review the changed artwork and update the manifest intentionally rather than bypassing those checks.

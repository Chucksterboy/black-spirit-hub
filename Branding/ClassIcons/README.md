# Black Desert class symbols

The 31 class PNGs in `Source Code/Assets/GrindTracker/classes` are local 256x256 transparent renders of Pearl Abyss's official vector class-symbol sprite.

- Official class list: <https://www.naeu.playblackdesert.com/en-US/GameInfo/Class>
- Official sprite: <https://s1.pearlcdn.com/NAEU/contents/img/common/character/icn_class_symbol_spr.svg>
- Validated source SHA-256: `2ACBD72923F32801D1D454F97EC661B65100D84D05733518D1AA360E1987E642`
- Retrieved and validated: 2026-08-10

The source sprite is three 80 px columns by 31 rows. The app uses its white middle column. Rows map, in order, to:

1. Warrior
2. Ranger
3. Sorceress
4. Berserker
5. Tamer
6. Ninja
7. Kunoichi
8. Witch
9. Wizard
10. Maehwa
11. Valkyrie
12. Musa
13. Dark Knight
14. Striker
15. Mystic
16. Lahn
17. Archer
18. Shai
19. Guardian
20. Hashashin
21. Nova
22. Sage
23. Corsair
24. Drakania
25. Woosa
26. Maegu
27. Scholar
28. Dosa
29. Deadeye
30. Wukong
31. Seraph

Run `scripts/update-class-icons.ps1` to reproduce the PNGs. The script downloads the official source, verifies its hash and layout, renders it locally with Microsoft Edge, validates transparency and bounds, and only then replaces the app assets.

The class symbols remain copyrighted by Pearl Abyss. They are included locally for identification in this unofficial fan utility; their inclusion does not imply endorsement. The application never hotlinks the Pearl Abyss CDN at runtime. Any redistribution remains subject to Pearl Abyss's terms and intellectual-property policies.

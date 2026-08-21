const NODES = [{"name": "Velia", "x": 10069.5, "y": 74166.3, "type": "City"}, {"name": "Western Guard Camp", "x": -59267.3, "y": 39882.5, "type": "Town"}, {"name": "Cron Castle", "x": 21308.4, "y": 129829.0, "type": "Dangerous"}, {"name": "Western Gateway", "x": -81151.1, "y": 51561.5, "type": "Gateway"}, {"name": "Bandit's Den Byway", "x": -66134.5, "y": -3042.74, "type": "Gateway"}, {"name": "Heidel Pass", "x": 42741.6, "y": 28601.4, "type": "Gateway"}, {"name": "Bartali Farm", "x": 11539.6, "y": 56002.8, "type": "Trading Post"}, {"name": "Finto Farm", "x": 38597.7, "y": 79789.8, "type": "Trading Post"}, {"name": "Goblin Cave", "x": 59168.7, "y": 40867.6, "type": "Dangerous"}, {"name": "Ancient Stone Chamber", "x": -45893.4, "y": 3428.7, "type": "Connection"}, {"name": "Imp Cave", "x": -33969.7, "y": 58889.8, "type": "Connection"}, {"name": "Loggia Farm", "x": -12868.5, "y": 75713.5, "type": "Trading Post"}, {"name": "Marino Farm", "x": -2374.41, "y": 47285.8, "type": "Trading Post"}, {"name": "Cron Castle Site", "x": 33925.1, "y": 116931.0, "type": "Connection"}, {"name": "Ehwaz Hill", "x": 60108.4, "y": 91693.1, "type": "Connection"}, {"name": "Forest of Plunder", "x": 41447.0, "y": 62739.1, "type": "Connection"}, {"name": "Balenos Forest", "x": 30804.1, "y": 46707.9, "type": "Trading Post"}, {"name": "Toscani Farm", "x": -29592.9, "y": 26244.2, "type": "Trading Post"}, {"name": "Coastal Cave", "x": -14406.0, "y": 89483.3, "type": "Connection"}, {"name": "Altar of Agris", "x": -58885.7, "y": 67316.1, "type": "Connection"}, {"name": "Forest of Seclusion", "x": -48426.3, "y": 21206.2, "type": "Dangerous"}, {"name": "Coastal Cliff", "x": -59269.4, "y": 90509.9, "type": "Connection"}, {"name": "Olvia", "x": -142268.0, "y": 126063.0, "type": "Town"}, {"name": "Florin Gateway", "x": -199352.0, "y": 133207.0, "type": "Connection"}, {"name": "Elder's Bridge", "x": -264092.0, "y": 111295.0, "type": "Connection"}, {"name": "Casta Farm", "x": -123315.0, "y": 117438.0, "type": "Connection"}, {"name": "Wale Farm", "x": -154855.0, "y": 134961.0, "type": "Connection"}, {"name": "Wolf Hills", "x": -114132.0, "y": 89069.4, "type": "Connection"}, {"name": "Balenos River Mouth", "x": -85264.9, "y": 106768.0, "type": "Connection"}, {"name": "Terrmian Cliff", "x": -182714.0, "y": 140064.0, "type": "Connection"}, {"name": "Foot of Terrmian Mountain", "x": -271541.0, "y": 138525.0, "type": "Connection"}, {"name": "Olvia Coast", "x": -94187.7, "y": 139122.0, "type": "Connection"}, {"name": "Epheria Ridge", "x": -338001.0, "y": 77097.1, "type": "Connection"}, {"name": "Mask Owl's Forest", "x": -199797.0, "y": 96972.0, "type": "Connection"}, {"name": "Santo Manzi Investment Bank", "x": 12596.6, "y": 74355.4, "type": ""}, {"name": "Bahar Investment Bank", "x": 21945.1, "y": 76335.0, "type": ""}, {"name": "Specialties", "x": 15570.6, "y": 55581.5, "type": ""}, {"name": "Specialties", "x": 40237.5, "y": 79874.7, "type": ""}, {"name": "Specialties", "x": 1591.4, "y": 47420.8, "type": ""}, {"name": "Specialties", "x": -29480.7, "y": 29403.7, "type": ""}, {"name": "Specialties", "x": -122533.0, "y": 115138.0, "type": ""}, {"name": "Specialties", "x": -143154.0, "y": 140347.0, "type": ""}, {"name": "Specialties", "x": 158123.0, "y": 293411.0, "type": ""}, {"name": "Potato Farming", "x": 12081.1, "y": 61492.8, "type": ""}, {"name": "Chicken Meat Production", "x": 14966.6, "y": 56009.4, "type": ""}, {"name": "Ossuary", "x": 11975.2, "y": 57181.8, "type": ""}, {"name": "Ossuary", "x": 12040.6, "y": 56698.5, "type": ""}, {"name": "Potato Farming", "x": 35830.6, "y": 83866.7, "type": ""}, {"name": "Chicken Meat Production", "x": 34555.1, "y": 79284.3, "type": ""}, {"name": "Mining", "x": 58794.3, "y": 46326.4, "type": ""}, {"name": "Lumbering", "x": 59190.9, "y": 45424.3, "type": ""}, {"name": "Excavation", "x": -40091.3, "y": 3157.71, "type": ""}, {"name": "Mining", "x": -34761.2, "y": 63438.7, "type": ""}, {"name": "Mining", "x": -34365.5, "y": 63534.9, "type": ""}, {"name": "Potato Farming", "x": -9097.01, "y": 71905.9, "type": ""}, {"name": "Specialties", "x": -8413.7, "y": 73556.2, "type": ""}, {"name": "Gathering", "x": 31076.8, "y": 119793.0, "type": ""}, {"name": "Mining", "x": 30958.4, "y": 119621.0, "type": ""}, {"name": "Gathering", "x": 57329.2, "y": 90883.0, "type": ""}, {"name": "Lumbering", "x": 57916.7, "y": 91132.5, "type": ""}, {"name": "Gathering", "x": 42482.6, "y": 62665.1, "type": ""}, {"name": "Lumbering", "x": 29177.4, "y": 42041.6, "type": ""}, {"name": "Gathering", "x": 29975.1, "y": 43421.2, "type": ""}, {"name": "Corn Farming", "x": -33780.4, "y": 29837.0, "type": ""}, {"name": "Corn Farming", "x": -33752.9, "y": 31141.8, "type": ""}, {"name": "Mining", "x": -32743.3, "y": 88236.2, "type": ""}, {"name": "Mining", "x": -33302.7, "y": 87924.3, "type": ""}, {"name": "Gathering", "x": -53262.1, "y": 83058.2, "type": ""}, {"name": "Lumbering", "x": -48651.7, "y": 23488.6, "type": ""}, {"name": "Mining", "x": -48934.7, "y": 23120.6, "type": ""}, {"name": "Gathering", "x": -58589.6, "y": 98236.1, "type": ""}, {"name": "Mining", "x": -56646.2, "y": 98159.5, "type": ""}, {"name": "Lumbering", "x": -126109.0, "y": 103013.0, "type": ""}, {"name": "Mining", "x": -169985.0, "y": 163784.0, "type": ""}, {"name": "Grapes", "x": -128664.0, "y": 115623.0, "type": ""}, {"name": "Olives", "x": -159371.0, "y": 137663.0, "type": ""}, {"name": "Specialties", "x": -138210.0, "y": 125827.0, "type": ""}, {"name": "Heidel", "x": 35842.0, "y": -35802.3, "type": "City"}, {"name": "Glish", "x": -17080.0, "y": -120955.0, "type": "Town"}, {"name": "Northern Guard Camp", "x": 38842.6, "y": -12015.8, "type": "Gateway"}, {"name": "Central Guard Camp", "x": 21646.5, "y": -90455.8, "type": "Gateway"}, {"name": "Southern Guard Camp", "x": 38193.2, "y": -136414.0, "type": "Gateway"}, {"name": "Northwestern Gateway", "x": -37861.2, "y": -79541.4, "type": "Gateway"}, {"name": "Southwestern Gateway", "x": -43930.7, "y": -130665.0, "type": "Gateway"}, {"name": "Eastern Border", "x": 100047.0, "y": -40753.6, "type": "Gateway"}, {"name": "Eastern Gateway", "x": 68123.9, "y": -85541.9, "type": "Gateway"}, {"name": "Alejandro Farm", "x": 9633.72, "y": -14916.7, "type": "Trading Post"}, {"name": "Costa Farm", "x": 9275.84, "y": -56067.4, "type": "Trading Post"}, {"name": "Moretti Plantation", "x": 73723.8, "y": -70902.8, "type": "Trading Post"}, {"name": "Castle Ruins", "x": 89949.0, "y": -100270.0, "type": "Dangerous"}, {"name": "Bloody Monastery", "x": -11394.5, "y": -172515.0, "type": "Dangerous"}, {"name": "Northern Heidel Quarry", "x": 36542.3, "y": -9346.36, "type": "Connection"}, {"name": "Serendia Shrine", "x": 22805.1, "y": -167375.0, "type": "Dangerous"}, {"name": "Lynch Ranch", "x": -42010.6, "y": -6764.91, "type": "Trading Post"}, {"name": "Northern Plain of Serendia", "x": -53939.5, "y": -43625.8, "type": "Connection"}, {"name": "Valencia Castle", "x": -24447.9, "y": -84013.4, "type": "Gateway"}, {"name": "Glish Swamp", "x": -34801.3, "y": -108074.0, "type": "Connection"}, {"name": "Southern Swamp", "x": 11557.2, "y": -134191.0, "type": "Connection"}, {"name": "Glish Ruins", "x": 37478.7, "y": -107868.0, "type": "Connection"}, {"name": "Northern Swamp", "x": 46353.8, "y": -70889.2, "type": "Connection"}, {"name": "Lynch Farm Ruins", "x": -17993.4, "y": -38133.4, "type": "Connection"}, {"name": "Biraghi Den", "x": -93594.6, "y": -27371.4, "type": "Dangerous"}, {"name": "Bradie Fortress", "x": -94348.0, "y": -70887.4, "type": "Dangerous"}, {"name": "Southern Neutral Zone", "x": -82512.8, "y": -142702.0, "type": "Dangerous"}, {"name": "Orc Camp", "x": -83330.8, "y": -98390.9, "type": "Connection"}, {"name": "Delphe Knights Castle", "x": -135824.0, "y": -51319.8, "type": "Gateway"}, {"name": "Watchtower", "x": -66903.9, "y": -106952.0, "type": "Connection"}, {"name": "Luciano Pietro Investment Bank", "x": 41632.6, "y": -49307.7, "type": ""}, {"name": "Siuta Investment Bank", "x": 39092.6, "y": -29184.7, "type": ""}, {"name": "Freharau Investment Bank", "x": -16699.5, "y": -120442.0, "type": ""}, {"name": "Larc Investment Bank", "x": -21722.6, "y": -120918.0, "type": ""}, {"name": "Specialties", "x": 7278.26, "y": -17968.5, "type": ""}, {"name": "Specialties", "x": -2974.05, "y": -129123.0, "type": ""}, {"name": "Specialties", "x": 37900.0, "y": -63445.2, "type": ""}, {"name": "Specialties", "x": 74262.8, "y": -72521.7, "type": ""}, {"name": "Pumpkin Farming", "x": 10181.4, "y": -14475.6, "type": ""}, {"name": "Honey Production", "x": 10606.4, "y": -14207.8, "type": ""}, {"name": "Wheat Farming", "x": 17481.0, "y": -55567.8, "type": ""}, {"name": "Pumpkin Farming", "x": 11484.6, "y": -55444.2, "type": ""}, {"name": "Specialties", "x": 10033.3, "y": -55486.8, "type": ""}, {"name": "Flax Farming", "x": 15094.6, "y": -56423.9, "type": ""}, {"name": "Wheat Farming", "x": 69729.6, "y": -67668.6, "type": ""}, {"name": "Flax Farming", "x": 71541.8, "y": -75542.9, "type": ""}, {"name": "Moretti Safe Zone", "x": 75120.1, "y": -70166.1, "type": "Connection"}, {"name": "Lumbering", "x": 88935.0, "y": -100208.0, "type": ""}, {"name": "Mining", "x": 34033.1, "y": 8039.14, "type": ""}, {"name": "Mining", "x": 33642.3, "y": 7985.83, "type": ""}, {"name": "Lumbering", "x": 35789.1, "y": -161535.0, "type": ""}, {"name": "Fleece Production", "x": -41945.0, "y": -6871.09, "type": ""}, {"name": "Gathering", "x": -53785.8, "y": -44130.8, "type": ""}, {"name": "Lumbering", "x": -54866.1, "y": -44270.6, "type": ""}, {"name": "NOT_A_NODE", "x": -18730.6, "y": -83345.1, "type": ""}, {"name": "NOT_A_NODE", "x": -19125.8, "y": -83574.6, "type": ""}, {"name": "NOT_A_NODE", "x": -18336.3, "y": -83586.3, "type": ""}, {"name": "NOT_A_NODE", "x": -18244.6, "y": -84101.7, "type": ""}, {"name": "Gathering", "x": -33091.4, "y": -108752.0, "type": ""}, {"name": "Mining", "x": -33068.0, "y": -109096.0, "type": ""}, {"name": "Specialties", "x": -16430.5, "y": -111168.0, "type": ""}, {"name": "Gathering", "x": 11632.4, "y": -133152.0, "type": ""}, {"name": "Mining", "x": 12009.4, "y": -132752.0, "type": ""}, {"name": "Gathering", "x": 37257.2, "y": -109693.0, "type": ""}, {"name": "Excavation", "x": 37442.1, "y": -108959.0, "type": ""}, {"name": "Gathering", "x": 45045.1, "y": -72349.7, "type": ""}, {"name": "Mining", "x": 43403.6, "y": -72912.0, "type": ""}, {"name": "Gathering", "x": -25336.6, "y": -35864.1, "type": ""}, {"name": "Excavation", "x": -24555.4, "y": -35690.0, "type": ""}, {"name": "Calpheon", "x": -249688.0, "y": -53111.5, "type": "City"}, {"name": "Keplan", "x": -152284.0, "y": -146923.0, "type": "Town"}, {"name": "Florin", "x": -166912.0, "y": 52937.7, "type": "Town"}, {"name": "Port Epheria", "x": -351453.0, "y": 41756.0, "type": "Town"}, {"name": "Enrique Encarotia Investment Bank", "x": -235997.0, "y": -80897.1, "type": ""}, {"name": "Lehard Mertenan Investment Bank", "x": -264318.0, "y": -65791.6, "type": ""}, {"name": "Luolo Grebe Investment Bank", "x": -262303.0, "y": -40374.9, "type": ""}, {"name": "Trent", "x": -378010.0, "y": -229988.0, "type": "Town"}, {"name": "Behr", "x": -286407.0, "y": -239541.0, "type": "Town"}, {"name": "Basquean Ljurik Investment Bank", "x": -242309.0, "y": -44340.5, "type": ""}, {"name": "Norma Leight Investment Bank", "x": -211720.0, "y": -7894.47, "type": ""}, {"name": "Valentine Investment Bank", "x": -167448.0, "y": 52189.7, "type": ""}, {"name": "Specialties", "x": -200686.0, "y": -64347.7, "type": ""}, {"name": "Specialties", "x": -348216.0, "y": -248779.0, "type": ""}, {"name": "Specialties", "x": -213837.0, "y": -30988.5, "type": ""}, {"name": "Specialties", "x": -291796.0, "y": -70967.2, "type": ""}, {"name": "Specialties", "x": -249487.0, "y": -137326.0, "type": ""}, {"name": "Specialties", "x": -118806.0, "y": -176983.0, "type": ""}, {"name": "Specialties", "x": -136745.0, "y": -53330.8, "type": ""}, {"name": "Abandoned Land", "x": -276109.0, "y": -28524.3, "type": "Connection"}, {"name": "Quint Hill", "x": -297268.0, "y": 31545.5, "type": "Connection"}, {"name": "Anti-Troll Fortification", "x": -260018.0, "y": 8127.2, "type": "Gateway"}, {"name": "Bree Tree Ruins", "x": -220965.0, "y": 52395.8, "type": "Dangerous"}, {"name": "Khuruto Cave", "x": -170427.0, "y": 2724.17, "type": "Dangerous"}, {"name": "Delphe Outpost", "x": -124345.0, "y": 5352.93, "type": "Gateway"}, {"name": "Karanda Ridge", "x": -125680.0, "y": 34039.1, "type": "Dangerous"}, {"name": "Northern Wheat Plantation", "x": -214474.0, "y": -5728.0, "type": "Town"}, {"name": "Old Dandelion", "x": -169784.0, "y": -9806.7, "type": "Dangerous"}, {"name": "Contaminated Farm", "x": -243516.0, "y": -23043.6, "type": "Trading Post"}, {"name": "Caphras Cave", "x": -184677.0, "y": 49966.9, "type": "Dangerous"}, {"name": "Isolated Sentry Post", "x": -287721.0, "y": -1425.13, "type": "Gateway"}, {"name": "Dias Farm", "x": -212294.0, "y": -33106.2, "type": "Trading Post"}, {"name": "Epheria Sentry Post", "x": -370114.0, "y": 28670.7, "type": "Gateway"}, {"name": "Epheria Valley", "x": -347953.0, "y": 2700.7, "type": "Connection"}, {"name": "Cohen Farm", "x": -315126.0, "y": -42696.3, "type": "Trading Post"}, {"name": "Elder's Bridge Post", "x": -261807.0, "y": 59893.5, "type": "Gateway"}, {"name": "Bernianto Farm", "x": -229908.0, "y": 11573.8, "type": "Trading Post"}, {"name": "Marni Cave Path", "x": -195164.0, "y": -110884.0, "type": "Gateway"}, {"name": "Oze Pass", "x": -133846.0, "y": -76098.7, "type": "Dangerous"}, {"name": "Marni Farm Ruins", "x": -165392.0, "y": -83109.9, "type": "Connection"}, {"name": "Keplan Hill", "x": -149597.0, "y": -167071.0, "type": "Connection"}, {"name": "Saunil Camp", "x": -212642.0, "y": -188637.0, "type": "Dangerous"}, {"name": "Primal Giant Post", "x": -125677.0, "y": -235919.0, "type": "Dangerous"}, {"name": "Saunil Battlefield", "x": -252379.0, "y": -188019.0, "type": "Dangerous"}, {"name": "Trina Fort", "x": -222470.0, "y": -157556.0, "type": "Gateway"}, {"name": "Trina Beacon Towers", "x": -227703.0, "y": -141850.0, "type": "Gateway"}, {"name": "Marni's Lab", "x": -187999.0, "y": -125444.0, "type": "Dangerous"}, {"name": "Falres Dirt Farm", "x": -199177.0, "y": -61438.5, "type": "Trading Post"}, {"name": "Hexe Stone Wall", "x": -173761.0, "y": -245348.0, "type": "Connection"}, {"name": "Bain Farmland", "x": -247841.0, "y": -137715.0, "type": "Trading Post"}, {"name": "North Abandoned Quarry", "x": -151263.0, "y": -122612.0, "type": "Dangerous"}, {"name": "Oberen Farm", "x": -230592.0, "y": -112313.0, "type": "Trading Post"}, {"name": "Beacon Entrance Post", "x": -214647.0, "y": -131541.0, "type": "Trading Post"}, {"name": "Abandoned Quarry", "x": -158265.0, "y": -184606.0, "type": "Trading Post"}, {"name": "Gehaku Plain", "x": -135294.0, "y": -206059.0, "type": "Connection"}, {"name": "Keplan Vicinity", "x": -121835.0, "y": -138057.0, "type": "Connection"}, {"name": "Gianin Farm", "x": -120011.0, "y": -177863.0, "type": "Trading Post"}, {"name": "Serendia Western Gateway", "x": -96472.8, "y": -176601.0, "type": "Gateway"}, {"name": "Glutoni Cave", "x": -175384.0, "y": -145388.0, "type": "Dangerous"}, {"name": "Quarry Byway", "x": -122979.0, "y": -111354.0, "type": "Trading Post"}, {"name": "Keplan Quarry", "x": -155252.0, "y": -132316.0, "type": "Connection"}, {"name": "Oze's House", "x": -148184.0, "y": -105679.0, "type": "Dangerous"}, {"name": "Dane Canyon", "x": -189717.0, "y": -202735.0, "type": "Trading Post"}, {"name": "Tarte Rock Fork", "x": -190545.0, "y": -162334.0, "type": "Connection"}, {"name": "Calpheon Castle Site", "x": -329706.0, "y": -76644.5, "type": "Connection"}, {"name": "Calpheon Castle", "x": -348603.0, "y": -53398.3, "type": "Gateway"}, {"name": "Treant Forest", "x": -407100.0, "y": -173996.0, "type": "Dangerous"}, {"name": "North Kaia Pier", "x": -318272.0, "y": -86543.3, "type": "Gateway"}, {"name": "Behr Riverhead", "x": -305267.0, "y": -186073.0, "type": "Connection"}, {"name": "Rhutum Outstation", "x": -342572.0, "y": -159821.0, "type": "Dangerous"}, {"name": "Rhutum Sentry Post", "x": -328998.0, "y": -132014.0, "type": "Trading Post"}, {"name": "Abandoned Monastery", "x": -368945.0, "y": -174832.0, "type": "Gateway"}, {"name": "Crioville", "x": -322795.0, "y": -253951.0, "type": "Trading Post"}, {"name": "Rhua Tree Stub", "x": -251690.0, "y": -208681.0, "type": "Connection"}, {"name": "South Kaia Pier", "x": -325066.0, "y": -104406.0, "type": "Gateway"}, {"name": "Gabino Farm", "x": -291135.0, "y": -68128.4, "type": "Trading Post"}, {"name": "Catfishman Camp", "x": -351826.0, "y": -95172.6, "type": "Dangerous"}, {"name": "Calpheon Castle Western Forest", "x": -384183.0, "y": -95148.4, "type": "Dangerous"}, {"name": "Mansha Forest", "x": -376017.0, "y": -123338.0, "type": "Trading Post"}, {"name": "Marie Cave", "x": -188309.0, "y": -248867.0, "type": "Connection"}, {"name": "Tobare's Cabin", "x": -381232.0, "y": -147982.0, "type": "Connection"}, {"name": "Lumberjack's Rest Area", "x": -390565.0, "y": -208654.0, "type": "Connection"}, {"name": "Longleaf Tree Sentry Post", "x": -347632.0, "y": -255743.0, "type": "Trading Post"}, {"name": "Longleaf Tree Forest", "x": -306195.0, "y": -262508.0, "type": "Dangerous"}, {"name": "Witch's Chapel", "x": -199813.0, "y": -276024.0, "type": "Dangerous"}, {"name": "Phoniel's Cabin", "x": -305538.0, "y": -146365.0, "type": "Connection"}, {"name": "Behr Downstream", "x": -273114.0, "y": -200792.0, "type": "Connection"}, {"name": "Hexe Sanctuary", "x": -231169.0, "y": -251607.0, "type": "Dangerous"}, {"name": "Phoniel's Cabin Entrance", "x": -275403.0, "y": -169823.0, "type": "Connection"}, {"name": "North Kaia Mountaintop", "x": -278722.0, "y": -105913.0, "type": "Dangerous"}, {"name": "Lake Kaia", "x": -341680.0, "y": -106931.0, "type": "Dangerous"}, {"name": "Calpheon Trade Exchange", "x": -246510.0, "y": -52626.4, "type": ""}, {"name": "Specialties", "x": -170904.0, "y": 55126.5, "type": ""}, {"name": "Florin_2", "x": -171013.0, "y": 54532.0, "type": ""}, {"name": "Florin_3", "x": -170625.0, "y": 55241.4, "type": ""}, {"name": "Marco Faust Investment Bank", "x": -151177.0, "y": -147547.0, "type": ""}, {"name": "Christine Cessory Investment Bank", "x": -159343.0, "y": -155806.0, "type": ""}, {"name": "Gathering", "x": -347437.0, "y": 3463.5, "type": ""}, {"name": "Specialties", "x": -362184.0, "y": 28908.8, "type": ""}, {"name": "Lumbering", "x": -300689.0, "y": 21119.1, "type": ""}, {"name": "Mining", "x": -300919.0, "y": 20562.9, "type": ""}, {"name": "Lumbering", "x": -221400.0, "y": 52330.6, "type": ""}, {"name": "Gathering", "x": -220867.0, "y": 52705.6, "type": ""}, {"name": "Excavation", "x": -221487.0, "y": 52714.3, "type": ""}, {"name": "Mining", "x": -172650.0, "y": 2504.37, "type": ""}, {"name": "Khuruto Cave", "x": -172514.0, "y": 1690.45, "type": "Dangerous"}, {"name": "NOT_A_NODE", "x": -123089.0, "y": 4453.42, "type": ""}, {"name": "NOT_A_NODE", "x": -123397.0, "y": 4010.95, "type": ""}, {"name": "NOT_A_NODE", "x": -122660.0, "y": 4044.19, "type": ""}, {"name": "Gathering", "x": -123305.0, "y": 33466.8, "type": ""}, {"name": "Karanda Ridge", "x": -122836.0, "y": 33487.4, "type": "Dangerous"}, {"name": "NOT_A_NODE", "x": -123276.0, "y": 33184.9, "type": ""}, {"name": "Wheat Farming", "x": -216898.0, "y": -15404.6, "type": ""}, {"name": "Barley Farming", "x": -220742.0, "y": 755.84, "type": ""}, {"name": "Paprika Farming", "x": -207216.0, "y": -8922.43, "type": ""}, {"name": "Lumbering", "x": -165424.0, "y": -18687.2, "type": ""}, {"name": "Old Dandelion", "x": -165935.0, "y": -16606.7, "type": "Dangerous"}, {"name": "Specialties", "x": -216883.0, "y": -8860.02, "type": ""}, {"name": "Northern Wheat Plantation Safe Zone", "x": -213847.0, "y": -7910.94, "type": ""}, {"name": "Lumbering", "x": -374671.0, "y": -124516.0, "type": ""}, {"name": "Excavation", "x": -381385.0, "y": -134281.0, "type": ""}, {"name": "Lumbering", "x": -305105.0, "y": -144985.0, "type": ""}, {"name": "Gathering", "x": -252993.0, "y": -212563.0, "type": ""}, {"name": "Lumbering", "x": -386595.0, "y": -202049.0, "type": ""}, {"name": "Gathering", "x": -344292.0, "y": -250009.0, "type": ""}, {"name": "Lumbering", "x": -309478.0, "y": -273222.0, "type": ""}, {"name": "Lumbering", "x": -404833.0, "y": -189831.0, "type": ""}, {"name": "Abandoned Monastery", "x": -363568.0, "y": -182896.0, "type": "Gateway"}, {"name": "Lumbering", "x": -196272.0, "y": -250386.0, "type": ""}, {"name": "Gathering", "x": -186584.0, "y": -253496.0, "type": ""}, {"name": "Excavation", "x": -252250.0, "y": -209316.0, "type": ""}, {"name": "Mining", "x": -333785.0, "y": -149402.0, "type": ""}, {"name": "Mining", "x": -302442.0, "y": -184848.0, "type": ""}, {"name": "Specialties", "x": -388294.0, "y": -230449.0, "type": ""}, {"name": "Mining", "x": -139248.0, "y": -193752.0, "type": ""}, {"name": "Mining", "x": -160121.0, "y": -124762.0, "type": ""}, {"name": "Lumbering", "x": -145573.0, "y": -76623.7, "type": ""}, {"name": "Oze Pass", "x": -133084.0, "y": -65716.7, "type": "Dangerous"}, {"name": "North Abandoned Quarry", "x": -144613.0, "y": -116678.0, "type": "Dangerous"}, {"name": "Abandoned Quarry", "x": -148118.0, "y": -193181.0, "type": "Trading Post"}, {"name": "Keplan Hill", "x": -153495.0, "y": -166590.0, "type": "Connection"}, {"name": "Gathering", "x": -184718.0, "y": -156402.0, "type": ""}, {"name": "Mining", "x": -177440.0, "y": -139851.0, "type": ""}, {"name": "Mining", "x": -173783.0, "y": -249124.0, "type": ""}, {"name": "Hexe Stone Wall", "x": -160098.0, "y": -241783.0, "type": "Connection"}, {"name": "Calpheon City Trade Zone", "x": -255070.0, "y": -31575.6, "type": ""}, {"name": "Calpheon Market Trade Zone", "x": -233823.0, "y": -48111.7, "type": ""}, {"name": "Calpheon Holy College Trade Zone", "x": -248857.0, "y": -76152.4, "type": ""}, {"name": "Specialties", "x": -286704.0, "y": -234095.0, "type": ""}, {"name": "Lema Island", "x": -56616.4, "y": 392036.0, "type": "Town"}, {"name": "Iliya Island", "x": 152406.0, "y": 297512.0, "type": "Town"}, {"name": "Pilava Island", "x": 249398.0, "y": 197916.0, "type": "Trading Post"}, {"name": "Delinghart Island", "x": 203901.0, "y": 201296.0, "type": "Connection"}, {"name": "Pujara Island", "x": 252417.0, "y": 298317.0, "type": "Connection"}, {"name": "Ajir Island", "x": 81332.4, "y": 330939.0, "type": "Connection"}, {"name": "Al-Naha Island", "x": 41573.8, "y": 367598.0, "type": "Connection"}, {"name": "Racid Island", "x": 73417.5, "y": 415322.0, "type": "Trading Post"}, {"name": "Baremi Island", "x": 15740.2, "y": 288923.0, "type": "Trading Post"}, {"name": "Weita Island", "x": 38211.1, "y": 256196.0, "type": "Connection"}, {"name": "Beiruwa Island", "x": 83757.4, "y": 169872.0, "type": "Trading Post"}, {"name": "Taramura Island", "x": 131585.0, "y": 196309.0, "type": "Connection"}, {"name": "Ostra Island", "x": 145306.0, "y": 215740.0, "type": "Connection"}, {"name": "Arakil Island", "x": 95475.3, "y": 221552.0, "type": "Connection"}, {"name": "Kanvera Island", "x": 80342.2, "y": 244027.0, "type": "Connection"}, {"name": "Orffs Island", "x": -61956.1, "y": 325836.0, "type": "Connection"}, {"name": "Tulu Island", "x": -90726.2, "y": 325649.0, "type": "Connection"}, {"name": "Luivano Island", "x": -43687.9, "y": 183465.0, "type": "Trading Post"}, {"name": "Duch Island", "x": -94535.6, "y": 213574.0, "type": "Trading Post"}, {"name": "Mariveno Island", "x": -26967.4, "y": 228829.0, "type": "Connection"}, {"name": "Paratama Island", "x": 39877.7, "y": 209785.0, "type": "Connection"}, {"name": "Eveto Island", "x": -80628.6, "y": 226097.0, "type": "Connection"}, {"name": "Balvege Island", "x": -97908.4, "y": 270167.0, "type": "Connection"}, {"name": "Marlene Island", "x": -67182.9, "y": 268006.0, "type": "Connection"}, {"name": "Invernen Island", "x": -119375.0, "y": 312046.0, "type": "Connection"}, {"name": "Angie Island", "x": -122017.0, "y": 241576.0, "type": "Connection"}, {"name": "Tashu Island", "x": -126823.0, "y": 429685.0, "type": "Connection"}, {"name": "Fish Drying Yard 1", "x": 262503.0, "y": 339004.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": 260260.0, "y": 269058.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": 255868.0, "y": 212160.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": 275166.0, "y": 195249.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": 172975.0, "y": 198866.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": 206737.0, "y": 231599.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": 156613.0, "y": 172796.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": 118813.0, "y": 162317.0, "type": ""}, {"name": "Fish Drying Yard", "x": 70031.9, "y": 168649.0, "type": ""}, {"name": "Fish Drying Yard", "x": 66144.1, "y": 201408.0, "type": ""}, {"name": "Ephde Rune Island", "x": 6006.37, "y": 164907.0, "type": "Connection"}, {"name": "Fish Drying Yard", "x": -5889.18, "y": 193624.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -24974.6, "y": 267599.0, "type": ""}, {"name": "Fish Drying Yard", "x": -75361.4, "y": 165862.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -156579.0, "y": 214979.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -131495.0, "y": 207846.0, "type": ""}, {"name": "Fish Drying Yard 3", "x": -136137.0, "y": 272064.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -66876.1, "y": 309941.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -38636.0, "y": 313501.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -167666.0, "y": 309069.0, "type": ""}, {"name": "Fish Drying Yard", "x": -50214.5, "y": 376047.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -127052.0, "y": 357942.0, "type": ""}, {"name": "Marka Island", "x": -183679.0, "y": 243410.0, "type": "Connection"}, {"name": "Louruve Island", "x": -220383.0, "y": 234862.0, "type": "Trading Post"}, {"name": "Staren Island", "x": -251206.0, "y": 199565.0, "type": "Connection"}, {"name": "Lisz Island", "x": -222301.0, "y": 270105.0, "type": "Connection"}, {"name": "Narvo Island", "x": -184673.0, "y": 288729.0, "type": "Connection"}, {"name": "Albresser Island", "x": -322728.0, "y": 167626.0, "type": "Trading Post"}, {"name": "Eberdeen Island", "x": -364103.0, "y": 182612.0, "type": "Connection"}, {"name": "Oben Island", "x": -373508.0, "y": 227486.0, "type": "Connection"}, {"name": "Daton Island", "x": -431128.0, "y": 212277.0, "type": "Trading Post"}, {"name": "Dunde Island", "x": -377734.0, "y": 176892.0, "type": "Connection"}, {"name": "Barater Island", "x": -329238.0, "y": 145277.0, "type": "Connection"}, {"name": "Randis Island", "x": -388275.0, "y": 107027.0, "type": "Trading Post"}, {"name": "Serca Island", "x": -384785.0, "y": 92913.3, "type": "Connection"}, {"name": "Baeza Island", "x": -442054.0, "y": 80094.4, "type": "Connection"}, {"name": "Modric Island", "x": -462908.0, "y": 97955.1, "type": "Connection"}, {"name": "Theonil Island", "x": -491057.0, "y": 99239.1, "type": "Trading Post"}, {"name": "Teyamal Island", "x": -528128.0, "y": 78345.1, "type": "Connection"}, {"name": "Rameda Island", "x": -509122.0, "y": 158345.0, "type": "Connection"}, {"name": "Ginburrey Island", "x": -458410.0, "y": 151382.0, "type": "Connection"}, {"name": "Netnume Island", "x": -419407.0, "y": 197906.0, "type": "Connection"}, {"name": "Fish Drying Yard", "x": -396870.0, "y": 78284.9, "type": ""}, {"name": "Fish Drying Yard", "x": -449338.0, "y": 73026.1, "type": ""}, {"name": "Fish Drying Yard", "x": -475699.0, "y": 84585.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -526577.0, "y": 52494.7, "type": ""}, {"name": "Fish Drying Yard 2", "x": -509523.0, "y": 59222.9, "type": ""}, {"name": "Fish Drying Yard 1", "x": -399841.0, "y": 105982.0, "type": ""}, {"name": "Fish Drying Yard", "x": -468213.0, "y": 212065.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -391879.0, "y": 131364.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -396569.0, "y": 244060.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -358074.0, "y": 227851.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -343762.0, "y": 150812.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -309097.0, "y": 155690.0, "type": ""}, {"name": "Fish Drying Yard", "x": -329608.0, "y": 193108.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -251010.0, "y": 186827.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -270529.0, "y": 214114.0, "type": ""}, {"name": "Fish Drying Yard 1", "x": -247826.0, "y": 245640.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -263936.0, "y": 271953.0, "type": ""}, {"name": "Fish Drying Yard", "x": -208095.0, "y": 218413.0, "type": ""}, {"name": "Fish Drying Yard", "x": 44494.3, "y": 265664.0, "type": ""}, {"name": "Fish Drying Yard 2", "x": -15597.3, "y": 228148.0, "type": ""}, {"name": "Kuit Islands", "x": -348128.0, "y": 373379.0, "type": "Connection"}, {"name": "Almai Island", "x": -402676.0, "y": 335255.0, "type": "Connection"}, {"name": "Padix Island", "x": -350554.0, "y": 311588.0, "type": "Connection"}, {"name": "Teste Island", "x": -428798.0, "y": 317013.0, "type": "Connection"}, {"name": "Arita Island", "x": -227874.0, "y": 319177.0, "type": "Connection"}, {"name": "Shasha Island", "x": 255821.0, "y": 395946.0, "type": "Connection"}, {"name": "Rosevan Island", "x": 304928.0, "y": 408105.0, "type": "Connection"}, {"name": "Portanen Island", "x": 294017.0, "y": 458735.0, "type": "Connection"}, {"name": "Tinberra Island", "x": 228865.0, "y": 531195.0, "type": "Connection"}, {"name": "Lerao Island", "x": 273917.0, "y": 543923.0, "type": "Connection"}, {"name": "Altinova", "x": 367322.0, "y": -69079.4, "type": "City"}, {"name": "Mediah Northern Gateway", "x": 100712.0, "y": 115314.0, "type": "Gateway"}, {"name": "Sausan Garrison", "x": 224473.0, "y": 127019.0, "type": "Dangerous"}, {"name": "Stonetail Wasteland", "x": 209220.0, "y": 80233.9, "type": "Connection"}, {"name": "Mediah Northern Highlands", "x": 161901.0, "y": 121784.0, "type": "Connection"}, {"name": "Rumbling Land", "x": 119758.0, "y": -21369.2, "type": "Connection"}, {"name": "Kamasylve Temple", "x": 147349.0, "y": -32153.8, "type": "Connection"}, {"name": "Manes Hideout", "x": 189412.0, "y": -33886.2, "type": "Dangerous"}, {"name": "Asula Highlands", "x": 239854.0, "y": -48902.5, "type": "Connection"}, {"name": "Wandering Rogue Den", "x": 259590.0, "y": -101327.0, "type": "Dangerous"}, {"name": "Altinova Entrance", "x": 324113.0, "y": -72443.9, "type": "Connection"}, {"name": "Tarif", "x": 226814.0, "y": -73831.4, "type": "Town"}, {"name": "Alumn Rock Valley", "x": 303722.0, "y": -161376.0, "type": "Connection"}, {"name": "Abandoned Iron Mine", "x": 299741.0, "y": -135331.0, "type": "Dangerous"}, {"name": "Abun", "x": 384252.0, "y": -141575.0, "type": "Town"}, {"name": "Marni's 2nd Lab", "x": 388138.0, "y": -166789.0, "type": "Dangerous"}, {"name": "Stonebeak Shore", "x": 305927.0, "y": -37179.1, "type": "Connection"}, {"name": "Soldiers' Cemetery", "x": 179504.0, "y": -78294.3, "type": "Dangerous"}, {"name": "Omar Lava Cave", "x": 248680.0, "y": -13665.1, "type": "Trading Post"}, {"name": "The Mausoleum", "x": 128193.0, "y": 123316.0, "type": "Connection"}, {"name": "Sarma Outpost", "x": 246235.0, "y": 85100.2, "type": "Gateway"}, {"name": "Mediah Castle", "x": 308326.0, "y": 59308.4, "type": "Gateway"}, {"name": "Kusha", "x": 229641.0, "y": 68121.2, "type": "Town"}, {"name": "Canyon of Corruption", "x": 190819.0, "y": 36547.5, "type": "Dangerous"}, {"name": "Elric Shrine", "x": 178308.0, "y": 67981.7, "type": "Dangerous"}, {"name": "Ancient Ruins Excavation Site", "x": 170846.0, "y": 3233.09, "type": "Connection"}, {"name": "Helms Post", "x": 123457.0, "y": 58059.8, "type": "Dangerous"}, {"name": "Stonetail Horse Ranch", "x": 221268.0, "y": -1184.55, "type": "Trading Post"}, {"name": "Ahto Farm", "x": 205023.0, "y": -19649.3, "type": "Connection"}, {"name": "Shuri Farm", "x": 196019.0, "y": 24346.1, "type": "Trading Post"}, {"name": "Kasula Farm", "x": 244468.0, "y": -77103.9, "type": "Trading Post"}, {"name": "Ancient Fissure", "x": 130821.0, "y": 25608.3, "type": "Connection"}, {"name": "Mediah Shore", "x": 253241.0, "y": 37112.4, "type": "Connection"}, {"name": "Highland Junction", "x": 270055.0, "y": -78059.9, "type": "Connection"}, {"name": "Splashing Point", "x": 310603.0, "y": -172900.0, "type": "Trading Post"}, {"name": "Sausan Garrison Wharf", "x": 246298.0, "y": 140074.0, "type": "Connection"}, {"name": "Abandoned Iron Mine Rhutum District", "x": 358051.0, "y": -128020.0, "type": "Dangerous"}, {"name": "Abandoned Iron Mine Saunil District", "x": 347325.0, "y": -163288.0, "type": "Dangerous"}, {"name": "Abandoned Iron Mine Entrance", "x": 285389.0, "y": -111385.0, "type": "Connection"}, {"name": "Awakening Bell", "x": 293349.0, "y": -24943.3, "type": "Connection"}, {"name": "Tungrad Forest", "x": 165486.0, "y": -89749.2, "type": "Dangerous"}, {"name": "Hasrah Cliff", "x": 196305.0, "y": -156100.0, "type": "Connection"}, {"name": "Zigmund Investment Bank", "x": 370701.0, "y": -48956.8, "type": ""}, {"name": "Gulabi Investment Bank", "x": 343397.0, "y": -30315.7, "type": ""}, {"name": "Quina Investment Bank", "x": 365169.0, "y": -72295.2, "type": ""}, {"name": "Neruda Shen Investment Bank", "x": 362724.0, "y": -62025.1, "type": ""}, {"name": "Specialties", "x": 225249.0, "y": -80765.3, "type": ""}, {"name": "Specialties", "x": 245810.0, "y": -79498.8, "type": ""}, {"name": "Specialties", "x": 206973.0, "y": -17378.3, "type": ""}, {"name": "Specialties", "x": 196331.0, "y": 18377.4, "type": ""}, {"name": "Specialties", "x": 224887.0, "y": 76363.6, "type": ""}, {"name": "Specialties", "x": 221201.0, "y": 4795.3, "type": ""}, {"name": "Specialties", "x": 382420.0, "y": -142844.0, "type": ""}, {"name": "Specialties", "x": 309753.0, "y": -173716.0, "type": ""}, {"name": "Cotton Farming", "x": 208412.0, "y": -18042.8, "type": ""}, {"name": "Aloe Farming", "x": 201539.0, "y": -15057.7, "type": ""}, {"name": "Mining", "x": 256170.0, "y": -17905.8, "type": ""}, {"name": "Mining", "x": 256275.0, "y": -13662.9, "type": ""}, {"name": "Sweet Potato Farming", "x": 197362.0, "y": 18772.4, "type": ""}, {"name": "Cotton Farming", "x": 245325.0, "y": -74068.9, "type": ""}, {"name": "Cinnamon Farming", "x": 245070.0, "y": -80181.6, "type": ""}, {"name": "Mining", "x": 347468.0, "y": -136729.0, "type": ""}, {"name": "Mining", "x": 346438.0, "y": -134875.0, "type": ""}, {"name": "Gathering", "x": 181588.0, "y": 75581.1, "type": ""}, {"name": "Gathering", "x": 148082.0, "y": -30237.3, "type": ""}, {"name": "Lumbering", "x": 153896.0, "y": 121666.0, "type": ""}, {"name": "Mining", "x": 133209.0, "y": 25792.4, "type": ""}, {"name": "Gathering", "x": 385687.0, "y": -159425.0, "type": ""}, {"name": "Lumbering", "x": 185529.0, "y": 74950.7, "type": ""}, {"name": "Lumbering", "x": 153903.0, "y": 121000.0, "type": ""}, {"name": "Gathering", "x": 129779.0, "y": 25383.2, "type": ""}, {"name": "Mining", "x": 255497.0, "y": 36372.3, "type": ""}, {"name": "Lumbering", "x": 207525.0, "y": 81047.1, "type": ""}, {"name": "Excavation", "x": 168795.0, "y": 6925.89, "type": ""}, {"name": "Flax Farming", "x": 149062.0, "y": -32744.3, "type": ""}, {"name": "Valencia City", "x": 1026110.0, "y": 199132.0, "type": "City"}, {"name": "Altinova Gateway", "x": 382721.0, "y": -8650.74, "type": "Connection"}, {"name": "Rock Post", "x": 424615.0, "y": 10328.2, "type": "Gateway"}, {"name": "Gorgo Rock Belt", "x": 393805.0, "y": 39058.8, "type": "Connection"}, {"name": "Veteran's Canyon", "x": 422278.0, "y": 47373.0, "type": "Connection"}, {"name": "Cadry Ruins", "x": 436068.0, "y": 82597.9, "type": "Dangerous"}, {"name": "Kunid's Vacation Spot", "x": 403646.0, "y": 97768.1, "type": "Connection"}, {"name": "Leical Falls", "x": 382129.0, "y": 111543.0, "type": "Connection"}, {"name": "Pujiya Canyon", "x": 467184.0, "y": -15486.9, "type": "Connection"}, {"name": "Bashim Base", "x": 478608.0, "y": -83247.7, "type": "Dangerous"}, {"name": "Waragon Nest", "x": 573278.0, "y": -84465.1, "type": "Dangerous"}, {"name": "Deserted City of Runn", "x": 472077.0, "y": 165750.0, "type": "Trading Post"}, {"name": "Runn Gateway Intersection", "x": 485261.0, "y": 197883.0, "type": "Gateway"}, {"name": "Shakatu", "x": 579545.0, "y": 274679.0, "type": "Town"}, {"name": "Taphtar Plain", "x": 486449.0, "y": 28271.5, "type": "Dangerous"}, {"name": "Basilisk Den", "x": 380222.0, "y": 30348.3, "type": "Dangerous"}, {"name": "Barhan Gateway", "x": 522973.0, "y": 30237.3, "type": "Gateway"}, {"name": "Capotia", "x": 551976.0, "y": 38607.3, "type": "Connection"}, {"name": "Sand Grain Bazaar", "x": 590881.0, "y": 48856.9, "type": "Town"}, {"name": "NOT_A_NODE", "x": 570348.0, "y": 258741.0, "type": ""}, {"name": "Yalt Canyon", "x": 619716.0, "y": 307049.0, "type": "Connection"}, {"name": "Desert Naga Temple", "x": 544414.0, "y": 105746.0, "type": "Dangerous"}, {"name": "NOT_A_NODE", "x": 536376.0, "y": 185583.0, "type": ""}, {"name": "Pila Fe", "x": 461690.0, "y": 74836.4, "type": "Connection"}, {"name": "Pilgrim's Haven", "x": 679352.0, "y": 104564.0, "type": "Connection"}, {"name": "Hope Pier", "x": 541368.0, "y": 298828.0, "type": "Connection"}, {"name": "Gahaz Bandits' Lair", "x": 646653.0, "y": 335010.0, "type": "Dangerous"}, {"name": "Bambu Valley", "x": 715113.0, "y": 369438.0, "type": "Connection"}, {"name": "Iris Canyon", "x": 763431.0, "y": 406686.0, "type": "Connection"}, {"name": "Kmach Canyon", "x": 769587.0, "y": 391936.0, "type": "Connection"}, {"name": "Ibellab Oasis", "x": 734898.0, "y": 196590.0, "type": "Trading Post"}, {"name": "Pilgrim's Sanctum: Obedience", "x": 814773.0, "y": 278026.0, "type": "Connection"}, {"name": "Pilgrim's Sanctum: Abstinence", "x": 743190.0, "y": 144611.0, "type": "Connection"}, {"name": "Pilgrim's Sanctum: Sharing", "x": 891785.0, "y": 61744.8, "type": "Connection"}, {"name": "Pilgrim's Sanctum: Sincerity", "x": 821479.0, "y": -19086.4, "type": "Connection"}, {"name": "Pilgrim's Sanctum: Humility", "x": 892725.0, "y": -61532.3, "type": "Connection"}, {"name": "Pilgrim's Sanctum: Purity", "x": 971153.0, "y": 325.74, "type": "Connection"}, {"name": "Pilgrim's Sanctum: Fast", "x": 947765.0, "y": 160635.0, "type": "Connection"}, {"name": "Rakshan Observatory", "x": 948121.0, "y": 253076.0, "type": "Connection"}, {"name": "Scarlet Sand Chamber", "x": 524582.0, "y": 144240.0, "type": "Dangerous"}, {"name": "Valencia Castle", "x": 1150470.0, "y": 293950.0, "type": "Gateway"}, {"name": "Ancado Inner Harbor", "x": 976980.0, "y": 340744.0, "type": "Town"}, {"name": "Aakman", "x": 813638.0, "y": -110341.0, "type": "Trading Post"}, {"name": "Crescent Shrine", "x": 730906.0, "y": -201213.0, "type": "Dangerous"}, {"name": "Crescent Mountains", "x": 762533.0, "y": -162562.0, "type": "Connection"}, {"name": "Titium Valley", "x": 983393.0, "y": -164540.0, "type": "Dangerous"}, {"name": "NOT_A_NODE", "x": 632460.0, "y": 71023.7, "type": ""}, {"name": "NOT_A_NODE", "x": 773542.0, "y": 88379.6, "type": ""}, {"name": "Valencia Western Highlands", "x": 603168.0, "y": -12740.3, "type": "Connection"}, {"name": "Bazaar Farmland", "x": 577886.0, "y": 26613.0, "type": "Connection"}, {"name": "Shakatu Farmland", "x": 567974.0, "y": 285316.0, "type": "Connection"}, {"name": "Altas Farmland", "x": 997846.0, "y": 333242.0, "type": "Connection"}, {"name": "Erdal Farm", "x": 995260.0, "y": 224866.0, "type": "Connection"}, {"name": "Valencia Plantation", "x": 990646.0, "y": 197386.0, "type": "Connection"}, {"name": "Fohalam Farm", "x": 985941.0, "y": 176471.0, "type": "Connection"}, {"name": "Sokota Island", "x": 338207.0, "y": 139124.0, "type": "Connection"}, {"name": "Riyed Island", "x": 384653.0, "y": 180159.0, "type": "Connection"}, {"name": "Esfah Island", "x": 418037.0, "y": 243233.0, "type": "Connection"}, {"name": "Tigris Island", "x": 412178.0, "y": 257633.0, "type": "Connection"}, {"name": "Shirna Island", "x": 448990.0, "y": 262620.0, "type": "Connection"}, {"name": "Halmad Island", "x": 564386.0, "y": 331846.0, "type": "Connection"}, {"name": "Kashuma Island", "x": 574681.0, "y": 366749.0, "type": "Connection"}, {"name": "Orisha Island", "x": 423766.0, "y": 313649.0, "type": "Trading Post"}, {"name": "Boa Island", "x": 420347.0, "y": 367649.0, "type": "Connection"}, {"name": "Kisleev Crag", "x": 373040.0, "y": 103310.0, "type": "Connection"}, {"name": "Valencia Castle Site", "x": 1109330.0, "y": 229319.0, "type": "Connection"}, {"name": "Ancado Coast", "x": 895018.0, "y": 349452.0, "type": "Connection"}, {"name": "Derko Island", "x": 843205.0, "y": 415735.0, "type": "Connection"}, {"name": "Shakatu Abandoned Pier", "x": 504922.0, "y": 264149.0, "type": "Connection"}, {"name": "Areha Palm Forest", "x": 1232340.0, "y": 213470.0, "type": "Connection"}, {"name": "Arehaza", "x": 1267170.0, "y": 177948.0, "type": "City"}, {"name": "Muiquun", "x": 1092940.0, "y": -135983.0, "type": "Town"}, {"name": "Central Cantusa", "x": 1244310.0, "y": 77137.1, "type": "Connection"}, {"name": "Cantusa Desert", "x": 1163710.0, "y": -154498.0, "type": "Connection"}, {"name": "Pila Ku Jail", "x": 1144130.0, "y": -80992.9, "type": "Dangerous"}, {"name": "Northern Sand Dune", "x": 1259350.0, "y": 283280.0, "type": "Connection"}, {"name": "Gavinya Volcano Zone", "x": 1146720.0, "y": 454797.0, "type": "Connection"}, {"name": "Gavinya Great Crater", "x": 1093380.0, "y": 488275.0, "type": "Connection"}, {"name": "Gavinya Coastal Cliff", "x": 1163610.0, "y": 514146.0, "type": "Connection"}, {"name": "Roud Sulfur Works", "x": 1084880.0, "y": 418194.0, "type": "Dangerous"}, {"name": "Ivory Wasteland", "x": 988609.0, "y": 487834.0, "type": "Connection"}, {"name": "Ivero Cliff", "x": 928558.0, "y": 468371.0, "type": "Connection"}, {"name": "Dona Rocky Mountain", "x": 1173590.0, "y": 11589.3, "type": "Connection"}, {"name": "Hakoven Island", "x": 1241700.0, "y": 560845.0, "type": "Connection"}, {"name": "Ross Sea (1400)", "x": -652686.0, "y": 12522.8, "type": "Connection"}, {"name": "Ross Sea (1401)", "x": -627849.0, "y": 255638.0, "type": "Connection"}, {"name": "Ross Sea (1402)", "x": -576597.0, "y": 447833.0, "type": "Connection"}, {"name": "Ross Sea (1403)", "x": -410018.0, "y": 562615.0, "type": "Connection"}, {"name": "Ross Sea (1404)", "x": -192808.0, "y": 601192.0, "type": "Connection"}, {"name": "Ross Sea (1405)", "x": 63082.1, "y": 677838.0, "type": "Connection"}, {"name": "Ross Sea (1406)", "x": 332283.0, "y": 652615.0, "type": "Connection"}, {"name": "Margoria (1407)", "x": 295404.0, "y": 908709.0, "type": "Connection"}, {"name": "Margoria (1408)", "x": -12662.5, "y": 844692.0, "type": "Connection"}, {"name": "Margoria (1409)", "x": -295147.0, "y": 793638.0, "type": "Connection"}, {"name": "Margoria (1410)", "x": -525285.0, "y": 716006.0, "type": "Connection"}, {"name": "Margoria (1411)", "x": -720275.0, "y": 572522.0, "type": "Connection"}, {"name": "Margoria (1412)", "x": -819997.0, "y": 307282.0, "type": "Connection"}, {"name": "Margoria (1413)", "x": -883878.0, "y": 76558.3, "type": "Connection"}, {"name": "Margoria (1414)", "x": -1127050.0, "y": 229996.0, "type": "Connection"}, {"name": "Margoria (1415)", "x": -997896.0, "y": 460630.0, "type": "Connection"}, {"name": "Margoria (1416)", "x": -845204.0, "y": 691411.0, "type": "Connection"}, {"name": "Margoria (1417)", "x": -629032.0, "y": 858190.0, "type": "Connection"}, {"name": "Margoria (1418)", "x": -395624.0, "y": 947335.0, "type": "Connection"}, {"name": "Margoria (1419)", "x": -115741.0, "y": 1048790.0, "type": "Connection"}, {"name": "Margoria (1420)", "x": 165828.0, "y": 1190830.0, "type": "Connection"}, {"name": "Margoria (1421)", "x": -175.99, "y": 1394370.0, "type": "Connection"}, {"name": "Margoria (1422)", "x": -255960.0, "y": 1241030.0, "type": "Connection"}, {"name": "Margoria (1423)", "x": -532112.0, "y": 1101390.0, "type": "Connection"}, {"name": "Margoria (1424)", "x": -760568.0, "y": 968993.0, "type": "Connection"}, {"name": "Margoria (1425)", "x": -959850.0, "y": 831335.0, "type": "Connection"}, {"name": "Margoria (1426)", "x": -1127470.0, "y": 627277.0, "type": "Connection"}, {"name": "Margoria (1427)", "x": -1293620.0, "y": 435047.0, "type": "Connection"}, {"name": "Margoria (1428)", "x": -1407920.0, "y": 651404.0, "type": "Connection"}, {"name": "Margoria (1429)", "x": -1249760.0, "y": 798736.0, "type": "Connection"}, {"name": "Margoria (1430)", "x": -1025060.0, "y": 897476.0, "type": "Connection"}, {"name": "Margoria (1431)", "x": -866210.0, "y": 1044800.0, "type": "Connection"}, {"name": "Margoria (1432)", "x": -678605.0, "y": 1228070.0, "type": "Connection"}, {"name": "Margoria (1433)", "x": -448463.0, "y": 1394330.0, "type": "Connection"}, {"name": "Margoria (1434)", "x": -256179.0, "y": 1534820.0, "type": "Connection"}, {"name": "Juur Sea (1435)", "x": -485456.0, "y": 1625770.0, "type": "Connection"}, {"name": "Juur Sea (1436)", "x": -628104.0, "y": 1510620.0, "type": "Connection"}, {"name": "Juur Sea (1437)", "x": -797279.0, "y": 1317240.0, "type": "Connection"}, {"name": "Juur Sea (1438)", "x": -944380.0, "y": 1117870.0, "type": "Connection"}, {"name": "Juur Sea (1439)", "x": -1172390.0, "y": 967917.0, "type": "Connection"}, {"name": "Juur Sea (1440)", "x": -1273330.0, "y": 933392.0, "type": "Connection"}, {"name": "Juur Sea (1441)", "x": -1474840.0, "y": 871418.0, "type": "Connection"}, {"name": "Vadabin (1442)", "x": -1524540.0, "y": 1020710.0, "type": "Connection"}, {"name": "Vadabin (1443)", "x": -1458810.0, "y": 1013400.0, "type": "Connection"}, {"name": "Vadabin (1444)", "x": -914792.0, "y": 1429670.0, "type": "Connection"}, {"name": "Vadabin (1445)", "x": -917473.0, "y": 1521750.0, "type": "Connection"}, {"name": "Vadabin (1446)", "x": -758248.0, "y": 1564030.0, "type": "Connection"}, {"name": "Vadabin (1447)", "x": -673038.0, "y": 1651290.0, "type": "Connection"}, {"name": "Vadabin (1448)", "x": -582609.0, "y": 1696590.0, "type": "Connection"}, {"name": "Vadabin (1449)", "x": -1056870.0, "y": 1506020.0, "type": "Connection"}, {"name": "Margoria (Vell's Realm)", "x": -89590.8, "y": 946651.0, "type": "Connection"}, {"name": "Gathering", "x": 391618.0, "y": 43352.2, "type": ""}, {"name": "Lumbering", "x": 388909.0, "y": 59607.3, "type": ""}, {"name": "Mining", "x": 377857.0, "y": 29520.4, "type": ""}, {"name": "Lumbering", "x": 422121.0, "y": 53201.7, "type": ""}, {"name": "Gathering", "x": 402775.0, "y": 98005.3, "type": ""}, {"name": "Gathering", "x": 382450.0, "y": 112101.0, "type": ""}, {"name": "Mining", "x": 466787.0, "y": -15901.2, "type": ""}, {"name": "Mining", "x": 476003.0, "y": -79763.4, "type": ""}, {"name": "Gathering", "x": 551291.0, "y": 39013.1, "type": ""}, {"name": "Mining", "x": 555551.0, "y": 39741.1, "type": ""}, {"name": "NOT_A_NODE", "x": 535007.0, "y": 185547.0, "type": ""}, {"name": "Lumbering", "x": 682860.0, "y": 109292.0, "type": ""}, {"name": "Mining", "x": 674969.0, "y": 109279.0, "type": ""}, {"name": "Gathering", "x": 713106.0, "y": 368971.0, "type": ""}, {"name": "Gathering", "x": 762895.0, "y": 404945.0, "type": ""}, {"name": "Lumbering", "x": 763276.0, "y": 407455.0, "type": ""}, {"name": "Mining", "x": 769160.0, "y": 391130.0, "type": ""}, {"name": "Gathering", "x": 769078.0, "y": 391721.0, "type": ""}, {"name": "Gathering", "x": 831126.0, "y": -114888.0, "type": ""}, {"name": "Gathering", "x": 723373.0, "y": -199362.0, "type": ""}, {"name": "Mining", "x": 734679.0, "y": -203390.0, "type": ""}, {"name": "Mining", "x": 763119.0, "y": -161980.0, "type": ""}, {"name": "Mining", "x": 761743.0, "y": -163236.0, "type": ""}, {"name": "Gathering", "x": 987091.0, "y": -161613.0, "type": ""}, {"name": "Gathering", "x": 979806.0, "y": -171684.0, "type": ""}, {"name": "Lumbering", "x": 982755.0, "y": -157160.0, "type": ""}, {"name": "Nutmeg", "x": 573573.0, "y": 28577.5, "type": ""}, {"name": "Teff", "x": 573824.0, "y": 26605.3, "type": ""}, {"name": "Fig", "x": 571046.0, "y": 286301.0, "type": ""}, {"name": "Fig", "x": 565279.0, "y": 280271.0, "type": ""}, {"name": "Star Anise", "x": 565997.0, "y": 278040.0, "type": ""}, {"name": "Teff", "x": 1000270.0, "y": 334191.0, "type": ""}, {"name": "Teff", "x": 1000490.0, "y": 330263.0, "type": ""}, {"name": "Pistachio", "x": 992162.0, "y": 224206.0, "type": ""}, {"name": "Date Palm", "x": 994845.0, "y": 217973.0, "type": ""}, {"name": "Pistachio", "x": 989330.0, "y": 196851.0, "type": ""}, {"name": "Date Palm", "x": 991134.0, "y": 197034.0, "type": ""}, {"name": "Freekeh", "x": 991117.0, "y": 192661.0, "type": ""}, {"name": "Teff", "x": 993123.0, "y": 181912.0, "type": ""}, {"name": "Teff", "x": 985749.0, "y": 180897.0, "type": ""}, {"name": "Specialties", "x": 585112.0, "y": 22439.1, "type": ""}, {"name": "Specialties", "x": 568152.0, "y": 278340.0, "type": ""}, {"name": "Specialties", "x": 1004750.0, "y": 336542.0, "type": ""}, {"name": "Specialties", "x": 995880.0, "y": 224290.0, "type": ""}, {"name": "Specialties", "x": 991052.0, "y": 198385.0, "type": ""}, {"name": "Specialties", "x": 988365.0, "y": 172896.0, "type": ""}, {"name": "Atui Balacs Investment Bank", "x": 594170.0, "y": 49872.0, "type": ""}, {"name": "Godul Lateman Investment Bank", "x": 582870.0, "y": 38485.1, "type": ""}, {"name": "Taphtar Investment Bank", "x": 580279.0, "y": 282088.0, "type": ""}, {"name": "Valgon Investment Bank", "x": 582923.0, "y": 285743.0, "type": ""}, {"name": "Yis Kunjamin Investment Bank", "x": 1040870.0, "y": 222435.0, "type": ""}, {"name": "Zahad Investment Bank", "x": 1033380.0, "y": 198240.0, "type": ""}, {"name": "Excavation", "x": 888472.0, "y": -62350.0, "type": ""}, {"name": "Lumbering", "x": 1224640.0, "y": 211907.0, "type": ""}, {"name": "Lumbering", "x": 1236760.0, "y": 204997.0, "type": ""}, {"name": "Mining", "x": 1162520.0, "y": 517492.0, "type": ""}, {"name": "Gathering", "x": 1171440.0, "y": 508922.0, "type": ""}, {"name": "Mining", "x": 1091340.0, "y": 490771.0, "type": ""}, {"name": "Gathering", "x": 926953.0, "y": 469324.0, "type": ""}, {"name": "Gathering", "x": 1258540.0, "y": 282906.0, "type": ""}, {"name": "Mining", "x": 1148030.0, "y": 466038.0, "type": ""}, {"name": "Mining", "x": 1156640.0, "y": 460848.0, "type": ""}, {"name": "Specialties", "x": 1269750.0, "y": 175632.0, "type": ""}, {"name": "Specialties", "x": 1096060.0, "y": -133410.0, "type": ""}, {"name": "Silk Culture", "x": 997044.0, "y": 222054.0, "type": ""}, {"name": "Excavation", "x": 1087770.0, "y": 410879.0, "type": ""}, {"name": "Kamasylvia Vicinity", "x": -251721.0, "y": -306699.0, "type": "Dangerous"}, {"name": "Lemoria Guard Post", "x": -261640.0, "y": -339667.0, "type": "Gateway"}, {"name": "Atanis Pond", "x": -282919.0, "y": -362501.0, "type": "Connection"}, {"name": "Caduil Forest", "x": -307401.0, "y": -378909.0, "type": "Connection"}, {"name": "Old Wisdom Tree", "x": -363066.0, "y": -443196.0, "type": "Town"}, {"name": "Shady Tree Forest", "x": -387619.0, "y": -471699.0, "type": "Connection"}, {"name": "Navarn Steppe", "x": -412310.0, "y": -434504.0, "type": "Dangerous"}, {"name": "Central Lemoria Camp", "x": -438678.0, "y": -378107.0, "type": "Gateway"}, {"name": "Manshaum Forest", "x": -376867.0, "y": -359396.0, "type": "Dangerous"}, {"name": "Holo Forest", "x": -448067.0, "y": -352759.0, "type": "Connection"}, {"name": "Viv Foretta Hamlet", "x": -315901.0, "y": -310967.0, "type": "Trading Post"}, {"name": "Valtarra Mountains", "x": -344205.0, "y": -304449.0, "type": "Connection"}, {"name": "Valtarra - Altar of Training", "x": -379536.0, "y": -302465.0, "type": "Dangerous"}, {"name": "Mirumok Ruins", "x": -442851.0, "y": -318815.0, "type": "Dangerous"}, {"name": "Lemoria Beacon Towers", "x": -448692.0, "y": -473357.0, "type": "Gateway"}, {"name": "Southeast Kamasylvia", "x": -552073.0, "y": -510788.0, "type": "Connection"}, {"name": "Western Valtarra Mountains", "x": -458750.0, "y": -244894.0, "type": "Connection"}, {"name": "Acher Guard Post", "x": -513260.0, "y": -222685.0, "type": "Gateway"}, {"name": "Loopy Tree Forest", "x": -539099.0, "y": -211090.0, "type": "Dangerous"}, {"name": "Tooth Fairy Forest", "x": -586038.0, "y": -315386.0, "type": "Dangerous"}, {"name": "Tooth Fairy Cabin", "x": -540580.0, "y": -336204.0, "type": "Town"}, {"name": "White Wood Forest", "x": -499265.0, "y": -364348.0, "type": "Connection"}, {"name": "Lake Flondor", "x": -501768.0, "y": -409491.0, "type": "Trading Post"}, {"name": "Grána", "x": -513575.0, "y": -458652.0, "type": "City"}, {"name": "Polly's Forest", "x": -558679.0, "y": -421027.0, "type": "Connection"}, {"name": "Southern Kamasylvia", "x": -493490.0, "y": -498036.0, "type": "Connection"}, {"name": "Gyfin Rhasia Temple", "x": -527622.0, "y": -513314.0, "type": "Dangerous"}, {"name": "Krogdalo's Trace", "x": -585674.0, "y": -407890.0, "type": "Connection"}, {"name": "Looney Cabin", "x": -576184.0, "y": -438959.0, "type": "Connection"}, {"name": "Weenie Cabin", "x": -584660.0, "y": -375443.0, "type": "Connection"}, {"name": "Ash Forest", "x": -507197.0, "y": -162523.0, "type": "Dangerous"}, {"name": "Yianaros's Field", "x": -470357.0, "y": -259848.0, "type": "Connection"}, {"name": "Okiara River", "x": -478474.0, "y": -478203.0, "type": "Connection"}, {"name": "Farming", "x": -314149.0, "y": -310542.0, "type": ""}, {"name": "Specialty(?)", "x": -283077.0, "y": -362875.0, "type": "Specialty"}, {"name": "Lumbering", "x": -387039.0, "y": -470991.0, "type": ""}, {"name": "Mining", "x": -444599.0, "y": -347418.0, "type": ""}, {"name": "Excavation", "x": -582461.0, "y": -309341.0, "type": ""}, {"name": "Lumbering", "x": -541823.0, "y": -214535.0, "type": ""}, {"name": "Gathering", "x": -561654.0, "y": -419091.0, "type": ""}, {"name": "Grow Mushroom", "x": -588298.0, "y": -376774.0, "type": ""}, {"name": "Grow Mushroom", "x": -577230.0, "y": -433172.0, "type": ""}, {"name": "Mining", "x": -501370.0, "y": -410700.0, "type": ""}, {"name": "Investment Bank", "x": -492405.0, "y": -466199.0, "type": ""}, {"name": "Investment Bank", "x": -503910.0, "y": -431959.0, "type": ""}, {"name": "Mining", "x": -490156.0, "y": -500471.0, "type": ""}, {"name": "Acher Western Camp", "x": -604782.0, "y": -289683.0, "type": "Gateway"}, {"name": "Acher Southern Camp", "x": -506567.0, "y": -491998.0, "type": "Gateway"}, {"name": "Roud Sulfur Mine", "x": 1105760.0, "y": 440291.0, "type": "Connection"}, {"name": "Duvencrune", "x": -48357.4, "y": -404589.0, "type": "City"}, {"name": "Duvencrune Farmland", "x": -73674.8, "y": -418209.0, "type": "Connection"}, {"name": "UnKnown", "x": -16600.6, "y": -427630.0, "type": "City"}, {"name": "Ahib Conflict Zone", "x": -244569.0, "y": -402057.0, "type": "Gateway"}, {"name": "Akum Rocky Mountain", "x": -234036.0, "y": -382428.0, "type": "Dangerous"}, {"name": "Khalk Canyon", "x": -212470.0, "y": -424151.0, "type": "Connection"}, {"name": "Sherekhan Necropolis", "x": -156851.0, "y": -365116.0, "type": "Connection"}, {"name": "Garmoth's Nest", "x": -21964.1, "y": -329086.0, "type": "Dangerous"}, {"name": "Harak's Shelter", "x": -109449.0, "y": -387071.0, "type": "Connection"}, {"name": "Morning Fog Post", "x": -83794.0, "y": -364436.0, "type": "Connection"}, {"name": "Night Crow Post", "x": 20434.7, "y": -333830.0, "type": "Gateway"}, {"name": "Windy Peak", "x": -87344.3, "y": -331648.0, "type": "Connection"}, {"name": "Marcha Outpost", "x": -173259.0, "y": -447720.0, "type": "Gateway"}, {"name": "Gayak Altar", "x": -128428.0, "y": -443059.0, "type": "Connection"}, {"name": "Fountain of Origin", "x": -152817.0, "y": -315614.0, "type": "Connection"}, {"name": "Gervish Mountains", "x": 13771.6, "y": -285228.0, "type": "Connection"}, {"name": "Dormann Lumber Camp", "x": -35312.8, "y": -226421.0, "type": "Connection"}, {"name": "Khimut Lumber Camp", "x": 109532.0, "y": -209077.0, "type": "Connection"}, {"name": "Forgotten Gateway", "x": 127665.0, "y": -260158.0, "type": "Gateway"}, {"name": "Tshira Ruins", "x": 104760.0, "y": -273497.0, "type": "Connection"}, {"name": "Blood Wolf Settlement", "x": 68241.7, "y": -345612.0, "type": "Dangerous"}, {"name": "Marak Farm", "x": 2193.15, "y": -397162.0, "type": "Connection"}, {"name": "Farming", "x": -79019.3, "y": -421166.0, "type": ""}, {"name": "Farming", "x": -73583.8, "y": -429092.0, "type": ""}, {"name": "Farming", "x": 2660.57, "y": -400004.0, "type": ""}, {"name": "Farming", "x": -2349.13, "y": -395311.0, "type": ""}, {"name": "Gathering", "x": 30481.1, "y": -279990.0, "type": ""}, {"name": "Gathering", "x": 13926.9, "y": -281193.0, "type": ""}, {"name": "Gathering", "x": 110155.0, "y": -276132.0, "type": ""}, {"name": "Gathering", "x": 104424.0, "y": -278819.0, "type": ""}, {"name": "Mining", "x": -231580.0, "y": -379636.0, "type": ""}, {"name": "Mining", "x": -229705.0, "y": -392450.0, "type": ""}, {"name": "Mining", "x": -207233.0, "y": -423615.0, "type": ""}, {"name": "Mining", "x": -212604.0, "y": -418018.0, "type": ""}, {"name": "Lumbering", "x": -33772.0, "y": -222245.0, "type": ""}, {"name": "Lumbering", "x": -36854.3, "y": -224821.0, "type": ""}, {"name": "Lumbering", "x": 108080.0, "y": -211543.0, "type": ""}, {"name": "Lumbering", "x": 108973.0, "y": -206176.0, "type": ""}, {"name": "Excavation", "x": -149829.0, "y": -360678.0, "type": ""}, {"name": "Excavation", "x": -154723.0, "y": -301268.0, "type": ""}, {"name": "Investment Bank", "x": -47058.1, "y": -404705.0, "type": ""}, {"name": "Investment Bank", "x": -55153.1, "y": -416013.0, "type": ""}, {"name": "O'draxxia", "x": -156718.0, "y": -598990.0, "type": "City"}, {"name": "O'dyllita Castle", "x": -228034.0, "y": -636031.0, "type": "Connection"}, {"name": "Thornwood Forest", "x": -287499.0, "y": -497683.0, "type": "Connection"}, {"name": "Crypt of Resting Thoughts", "x": -234142.0, "y": -521656.0, "type": "Connection"}, {"name": "Narcion", "x": -261485.0, "y": -594713.0, "type": "Connection"}, {"name": "Talibahr's Rope", "x": -360344.0, "y": -568945.0, "type": "Connection"}, {"name": "La O'delle", "x": -308707.0, "y": -601945.0, "type": "Connection"}, {"name": "Starry Midnight Port", "x": -321451.0, "y": -598642.0, "type": "Connection"}, {"name": "O'dyllita Castle Vicinity", "x": -304406.0, "y": -626525.0, "type": "Connection"}, {"name": "Tunkuta", "x": -316716.0, "y": -518102.0, "type": "Connection"}, {"name": "Salun's Border", "x": -316109.0, "y": -486654.0, "type": "Connection"}, {"name": "Bahit Sanctum", "x": -210134.0, "y": -481296.0, "type": "Connection"}, {"name": "Olun's Valley", "x": -155956.0, "y": -523272.0, "type": "Connection"}, {"name": "Star's End", "x": -498873.0, "y": -67266.2, "type": "Dangerous"}, {"name": "Calpheon Northwestern Outpost", "x": -443854.0, "y": 1307.62, "type": "Gateway"}, {"name": "UnKnown", "x": -122686.0, "y": -657172.0, "type": ""}, {"name": "Grape Farming", "x": -184287.0, "y": -572593.0, "type": ""}, {"name": "Potato Farming", "x": -184591.0, "y": -561201.0, "type": ""}, {"name": "Excavation", "x": -231647.0, "y": -520579.0, "type": ""}, {"name": "Mining", "x": -167812.0, "y": -515349.0, "type": ""}, {"name": "Mining", "x": -162101.0, "y": -529460.0, "type": ""}, {"name": "Lumbering", "x": -292744.0, "y": -520328.0, "type": ""}, {"name": "Chicken Meat Production", "x": -268688.0, "y": -597347.0, "type": ""}, {"name": "Fish Drying Yard", "x": -320454.0, "y": -609989.0, "type": ""}, {"name": "Lumbering", "x": -206628.0, "y": -602447.0, "type": ""}, {"name": "Excavation", "x": -212683.0, "y": -458669.0, "type": ""}, {"name": "Mining", "x": -501215.0, "y": -71997.2, "type": ""}, {"name": "Brellin Farm", "x": -409482.0, "y": 19615.4, "type": "Connection"}, {"name": "Outpost Supply Port", "x": -448729.0, "y": 27309.0, "type": "Connection"}, {"name": "Excavation", "x": -498240.0, "y": -65607.5, "type": ""}, {"name": "NOT_A_NODE", "x": -1018380.0, "y": 1043240.0, "type": ""}, {"name": "NOT_A_NODE", "x": -709930.0, "y": 1231870.0, "type": ""}, {"name": "NOT_A_NODE", "x": -632996.0, "y": 1132940.0, "type": ""}, {"name": "NOT_A_NODE", "x": -337874.0, "y": 1158330.0, "type": ""}, {"name": "NOT_A_NODE", "x": -517383.0, "y": 862095.0, "type": ""}, {"name": "NOT_A_NODE", "x": -816088.0, "y": 669021.0, "type": ""}, {"name": "Oquilla's Eye", "x": -87328.4, "y": 626901.0, "type": "City"}, {"name": "NOT_A_NODE", "x": -748316.0, "y": 505615.0, "type": ""}, {"name": "NOT_A_NODE", "x": -940162.0, "y": 556455.0, "type": ""}, {"name": "NOT_A_NODE", "x": -864896.0, "y": 1081480.0, "type": ""}, {"name": "NOT_A_NODE", "x": -660737.0, "y": 799925.0, "type": ""}, {"name": "NOT_A_NODE", "x": -850719.0, "y": 890429.0, "type": ""}, {"name": "NOT_A_NODE", "x": -543161.0, "y": 1030450.0, "type": ""}, {"name": "Chiro's Cannon Workshop", "x": 38344.9, "y": 379244.0, "type": ""}, {"name": "Chiro's Sail Workshop", "x": 65814.8, "y": 408081.0, "type": ""}, {"name": "Chiro's Figurehead Workshop", "x": 222464.0, "y": 552340.0, "type": ""}, {"name": "Chiro's Black Plating Workshop", "x": 266513.0, "y": 539703.0, "type": ""}, {"name": "Grándiha", "x": -559743.0, "y": -476904.0, "type": "Trading Post"}, {"name": "Papua Crinea", "x": -677907.0, "y": -185590.0, "type": "Trading Post"}, {"name": "Forgotten Mountain", "x": -151295.0, "y": -542246.0, "type": "Connection"}, {"name": "Salanar Pond", "x": -211823.0, "y": -570860.0, "type": "Connection"}, {"name": "Delmira Plantation", "x": -182573.0, "y": -566774.0, "type": "Connection"}, {"name": "Mountain of Division", "x": -223470.0, "y": -450712.0, "type": "Connection"}, {"name": "Shiv Valley Road", "x": -190238.0, "y": -611333.0, "type": "Connection"}, {"name": "UnKnown", "x": 261650.0, "y": 611895.0, "type": ""}, {"name": "Crow's Nest", "x": 237202.0, "y": 696234.0, "type": "Connection"}, {"name": "Awina's Tail", "x": 177723.0, "y": -291551.0, "type": "Connection"}, {"name": "Wind Nol's Perch", "x": 166645.0, "y": -344640.0, "type": "Connection"}, {"name": "Erethea's Belt", "x": 132159.0, "y": -375514.0, "type": "Connection"}, {"name": "Eilton", "x": 170079.0, "y": -398472.0, "type": "City"}, {"name": "Maslan's Yulas Citron Orchard", "x": 210846.0, "y": -392860.0, "type": "Connection"}, {"name": "Snowstorm Guard Post", "x": 202795.0, "y": -426423.0, "type": "Connection"}, {"name": "Mountain of Eternal Winter", "x": 190969.0, "y": -497196.0, "type": "Connection"}, {"name": "Bronte's Bolt", "x": 160616.0, "y": -455732.0, "type": "Connection"}, {"name": "Jade Starlight Forest", "x": 151137.0, "y": -494401.0, "type": "Connection"}, {"name": "Mountain Top Guard Post", "x": 126765.0, "y": -470721.0, "type": "Connection"}, {"name": "Tori Woods", "x": 108526.0, "y": -506441.0, "type": "Connection"}, {"name": "Sherekhan Iron Mine", "x": 46503.2, "y": -503673.0, "type": "Connection"}, {"name": "Derelict Trade Post", "x": 27641.7, "y": -480908.0, "type": "Connection"}, {"name": "Shrine of Silent Prayers", "x": 7380.07, "y": -478244.0, "type": "Connection"}, {"name": "Zvier Highlands", "x": 112707.0, "y": -441773.0, "type": "Connection"}, {"name": "Camp Balacs", "x": 88542.3, "y": -434930.0, "type": "Connection"}, {"name": "Charbonneau Villa", "x": 94034.1, "y": -403331.0, "type": "Connection"}, {"name": "Pilgrim's End", "x": -51157.5, "y": -524862.0, "type": "Connection"}, {"name": "Mining", "x": 184885.0, "y": -506317.0, "type": ""}, {"name": "Gathering", "x": 212423.0, "y": -393968.0, "type": ""}, {"name": "Mining", "x": 47789.2, "y": -498102.0, "type": ""}, {"name": "Excavation", "x": 44316.4, "y": -495428.0, "type": ""}, {"name": "Lumbering", "x": 148872.0, "y": -487235.0, "type": ""}, {"name": "Mining", "x": 155524.0, "y": -494690.0, "type": ""}, {"name": "Gathering", "x": -57294.4, "y": -526564.0, "type": ""}, {"name": "Gathering", "x": -42912.7, "y": -527360.0, "type": ""}, {"name": "Excavation", "x": 89848.0, "y": -439017.0, "type": ""}, {"name": "Gathering", "x": 105974.0, "y": -509365.0, "type": ""}, {"name": "Lumbering", "x": 132240.0, "y": -466935.0, "type": ""}, {"name": "Excavation", "x": 108687.0, "y": -445969.0, "type": ""}, {"name": "Honey Production", "x": 109134.0, "y": -437934.0, "type": ""}, {"name": "Lumbering", "x": 169259.0, "y": -347071.0, "type": ""}, {"name": "Dalbeol Village", "x": -1130090.0, "y": 1271810.0, "type": "City"}, {"name": "Hanji County", "x": -1324610.0, "y": 1242840.0, "type": "Connection"}, {"name": "Shimnidae Forest", "x": -1296750.0, "y": 1176650.0, "type": "Connection"}, {"name": "Nampo Gate", "x": -1346900.0, "y": 1165660.0, "type": "Connection"}, {"name": "Nampo's Moodle Village", "x": -1312270.0, "y": 1136060.0, "type": "City"}, {"name": "Solgaji Forest", "x": -1253520.0, "y": 1183370.0, "type": "Connection"}, {"name": "Cheongsan Institute", "x": -1208110.0, "y": 1148140.0, "type": "Connection"}, {"name": "Dokkebi Forest", "x": -1215750.0, "y": 1258110.0, "type": "Connection"}, {"name": "Golden Pig Cave", "x": -1146310.0, "y": 1153160.0, "type": "Connection"}, {"name": "Gowun Plateau", "x": -1162420.0, "y": 1191470.0, "type": "Connection"}, {"name": "Drybranch Village", "x": -1119640.0, "y": 1138390.0, "type": "Connection"}, {"name": "Bomnae County", "x": -1069940.0, "y": 1122840.0, "type": "Connection"}, {"name": "Honglim Base", "x": -1084170.0, "y": 1198440.0, "type": "Connection"}, {"name": "Yeowoo Pass", "x": -1079590.0, "y": 1239720.0, "type": "Connection"}, {"name": "Nopsae's Byeot County", "x": -1031140.0, "y": 1298580.0, "type": "City"}, {"name": "Bari Forest", "x": -1105830.0, "y": 1421990.0, "type": "Connection"}, {"name": "Beombawi Valley", "x": -1199430.0, "y": 1387610.0, "type": "Connection"}, {"name": "Beombawi Gate", "x": -1214200.0, "y": 1439970.0, "type": "Connection"}, {"name": "Haemo Island", "x": -1384770.0, "y": 1006880.0, "type": "Connection"}, {"name": "Byukgye Island", "x": -1229970.0, "y": 1073860.0, "type": "Connection"}, {"name": "UnKnown", "x": -1301640.0, "y": 1179810.0, "type": ""}, {"name": "UnKnown", "x": -1293990.0, "y": 1180730.0, "type": ""}, {"name": "UnKnown", "x": -1249610.0, "y": 1177640.0, "type": ""}, {"name": "UnKnown", "x": -1217180.0, "y": 1260100.0, "type": ""}, {"name": "UnKnown", "x": -1212290.0, "y": 1255330.0, "type": ""}, {"name": "UnKnown", "x": -1144570.0, "y": 1152520.0, "type": ""}, {"name": "UnKnown", "x": -1164240.0, "y": 1193780.0, "type": ""}, {"name": "UnKnown", "x": -1160130.0, "y": 1190220.0, "type": ""}, {"name": "UnKnown", "x": -1070030.0, "y": 1125080.0, "type": ""}, {"name": "UnKnown", "x": -1065190.0, "y": 1122260.0, "type": ""}, {"name": "UnKnown", "x": -1085110.0, "y": 1201270.0, "type": ""}, {"name": "UnKnown", "x": -1082560.0, "y": 1195180.0, "type": ""}, {"name": "UnKnown", "x": -1084960.0, "y": 1239460.0, "type": ""}, {"name": "UnKnown", "x": -1075410.0, "y": 1237370.0, "type": ""}, {"name": "UnKnown", "x": -1109500.0, "y": 1427000.0, "type": ""}, {"name": "UnKnown", "x": -1102560.0, "y": 1418170.0, "type": ""}, {"name": "UnKnown", "x": -1202700.0, "y": 1385620.0, "type": ""}, {"name": "UnKnown", "x": -1194070.0, "y": 1383800.0, "type": ""}, {"name": "UnKnown", "x": -1388680.0, "y": 1007400.0, "type": ""}, {"name": "UnKnown", "x": -1317030.0, "y": 1247080.0, "type": ""}, {"name": "UnKnown", "x": -1325270.0, "y": 1239910.0, "type": ""}, {"name": "UnKnown", "x": -1020120.0, "y": 1285580.0, "type": ""}, {"name": "UnKnown", "x": -1022980.0, "y": 1300010.0, "type": ""}, {"name": "UnKnown", "x": -1020000.0, "y": 1301300.0, "type": ""}, {"name": "UnKnown", "x": -1006000.0, "y": 1294740.0, "type": ""}, {"name": "UnKnown", "x": -1195760.0, "y": 1391440.0, "type": ""}, {"name": "UnKnown", "x": -1195760.0, "y": 1391440.0, "type": ""}, {"name": "Dallae Pier", "x": -994463.0, "y": 1341100.0, "type": "Connection"}, {"name": "Dallaer Pier Quarry", "x": -1002650.0, "y": 1340760.0, "type": ""}, {"name": "Asparkan", "x": 278339.0, "y": -196126.0, "type": "City"}, {"name": "Atessahra", "x": 333786.0, "y": -223634.0, "type": "Connection"}, {"name": "Sezec Mercenary Camp", "x": 354493.0, "y": -263311.0, "type": "Connection"}, {"name": "City of the Dead", "x": 281446.0, "y": -286492.0, "type": "Connection"}, {"name": "Tungrad Ruins", "x": 443466.0, "y": -256073.0, "type": "Connection"}, {"name": "UnKnown", "x": 40373.9, "y": 83345.7, "type": ""}, {"name": "Neruda Plain", "x": 286823.0, "y": -224897.0, "type": "Connection"}, {"name": "Tremorin Hill", "x": 329799.0, "y": -277248.0, "type": "Connection"}, {"name": "Kermelun Wilds", "x": 402192.0, "y": -212027.0, "type": "Connection"}, {"name": "Muzgar", "x": 360002.0, "y": -317810.0, "type": "Town"}, {"name": "Aakshrad Mountains", "x": 301723.0, "y": -352575.0, "type": "Connection"}, {"name": "Yzrahid Highlands", "x": 301014.0, "y": -399669.0, "type": "Connection"}, {"name": "Darkseekers' Retreat", "x": 391831.0, "y": -284476.0, "type": "Connection"}, {"name": "Karasi Canyon", "x": 447929.0, "y": -315341.0, "type": "Connection"}, {"name": "Barhan Camp", "x": 500343.0, "y": -307967.0, "type": "Connection"}, {"name": "Shakhtar Wilds", "x": 411694.0, "y": -371751.0, "type": "Connection"}, {"name": "Velandir", "x": 386345.0, "y": -391883.0, "type": "Town"}, {"name": "Stofbir", "x": 483897.0, "y": -391364.0, "type": "Connection"}, {"name": "Seoul", "x": -1419520.0, "y": 1333790.0, "type": "City"}, {"name": "Yukjo Street", "x": -1472040.0, "y": 1337990.0, "type": "Town"}, {"name": "Unjongga Street", "x": -1411430.0, "y": 1266690.0, "type": "Connection"}, {"name": "Yuunru", "x": -1464560.0, "y": 1301360.0, "type": "Connection"}, {"name": "Chowon", "x": -1446800.0, "y": 1267550.0, "type": "Connection"}, {"name": "Godu Village", "x": -1419150.0, "y": 1239190.0, "type": "Town"}, {"name": "Bukpo", "x": -1342900.0, "y": 1509910.0, "type": "Town"}, {"name": "Won Jingung", "x": -1496200.0, "y": 1290800.0, "type": "Connection"}, {"name": "Myeonggyunjeon", "x": -1386780.0, "y": 1393900.0, "type": "Connection"}, {"name": "Milbon", "x": -1366160.0, "y": 1303670.0, "type": "Connection"}, {"name": "Taehak", "x": -1390910.0, "y": 1203740.0, "type": "Connection"}, {"name": "Dangsup", "x": -1519790.0, "y": 1245610.0, "type": "Connection"}, {"name": "Geogugoegul", "x": -1481220.0, "y": 1226490.0, "type": "Connection"}, {"name": "Holbon", "x": -1519330.0, "y": 1126250.0, "type": "Connection"}, {"name": "Guleumnalu", "x": -1520090.0, "y": 1099110.0, "type": "Connection"}, {"name": "Hwaseongok", "x": -1460000.0, "y": 1152100.0, "type": "Connection"}, {"name": "Dumegol", "x": -1437540.0, "y": 1140380.0, "type": "Connection"}, {"name": "Mongryong's Exile", "x": -1457070.0, "y": 1106210.0, "type": "Connection"}, {"name": "Asisan", "x": -1344890.0, "y": 1436350.0, "type": "Connection"}, {"name": "Cheonjedan", "x": -1319890.0, "y": 1445670.0, "type": "Connection"}, {"name": "Musinje", "x": -1270170.0, "y": 1508030.0, "type": "Connection"}, {"name": "Seryeondang", "x": -1351910.0, "y": 1476820.0, "type": "Connection"}, {"name": "Byeolli Forest", "x": -1425470.0, "y": 1456950.0, "type": "Connection"}, {"name": "Motgol Village", "x": -1389700.0, "y": 1459890.0, "type": "Connection"}, {"name": "Jamhwa Swamp", "x": -1460010.0, "y": 1419360.0, "type": "Connection"}, {"name": "Dongmakgol", "x": -1511210.0, "y": 1375730.0, "type": "Connection"}, {"name": "Deungryong Cave", "x": -1505690.0, "y": 1357350.0, "type": "Connection"}, {"name": "UnKnown", "x": -1428600.0, "y": 1231620.0, "type": ""}, {"name": "UnKnown", "x": -1427190.0, "y": 1239000.0, "type": "Connection"}, {"name": "UnKnown", "x": -1434560.0, "y": 1234670.0, "type": "Connection"}, {"name": "UnKnown", "x": -1429670.0, "y": 1244740.0, "type": "Connection"}, {"name": "UnKnown", "x": -1502520.0, "y": 1283440.0, "type": "Connection"}, {"name": "UnKnown", "x": -1382540.0, "y": 1400410.0, "type": "Connection"}, {"name": "UnKnown", "x": -1354360.0, "y": 1303620.0, "type": "Connection"}, {"name": "UnKnown", "x": -1419000.0, "y": 1265230.0, "type": "Connection"}, {"name": "UnKnown", "x": -1467410.0, "y": 1231830.0, "type": "Connection"}, {"name": "UnKnown", "x": -1470270.0, "y": 1228870.0, "type": "Connection"}, {"name": "UnKnown", "x": -1432640.0, "y": 1143490.0, "type": "Connection"}, {"name": "UnKnown", "x": -1352780.0, "y": 1439840.0, "type": "Connection"}, {"name": "UnKnown", "x": -1433740.0, "y": 1456300.0, "type": "Connection"}, {"name": "UnKnown", "x": -1429190.0, "y": 1463290.0, "type": "Connection"}, {"name": "UnKnown", "x": -1382920.0, "y": 1461770.0, "type": "Connection"}, {"name": "UnKnown", "x": -1507050.0, "y": 1371290.0, "type": "Connection"}, {"name": "UnKnown", "x": -1501130.0, "y": 1351870.0, "type": "Connection"}, {"name": "UnKnown", "x": -1504620.0, "y": 1351700.0, "type": "Connection"}, {"name": "UnKnown", "x": -1522290.0, "y": 1233090.0, "type": "Connection"}, {"name": "Hakinza Sanctuary", "x": 537251.0, "y": 477184.0, "type": "City"}, {"name": "Aetherion Castle", "x": 559135.0, "y": 582598.0, "type": "Castle"}, {"name": "Orbita Castle", "x": 671762.0, "y": 486041.0, "type": "Castle"}, {"name": "Zephyros Castle", "x": 723838.0, "y": 620540.0, "type": "Castle"}, {"name": "Tenebraum Castle", "x": 661604.0, "y": 688745.0, "type": "Castle"}, {"name": "Nymphamaré Castle", "x": 529002.0, "y": 726282.0, "type": "Castle"}, {"name": "Escar Mountains", "x": 530620.0, "y": 405888.0, "type": "Connection"}, {"name": "Shore of Ruins", "x": 514502.0, "y": 426607.0, "type": "Connection"}, {"name": "Neftak Outpost", "x": 539132.0, "y": 505851.0, "type": "Connection"}, {"name": "Faith's Resting Place", "x": 631103.0, "y": 532538.0, "type": "Connection"}, {"name": "Great White Spot", "x": 590001.0, "y": 485581.0, "type": "Connection"}, {"name": "Sanctified Mercy", "x": 674483.0, "y": 471061.0, "type": "Connection"}, {"name": "Litovan Mountains", "x": 720240.0, "y": 510445.0, "type": "Connection"}, {"name": "Azure Battlefield", "x": 583383.0, "y": 622398.0, "type": "Connection"}, {"name": "Saterna Mountains", "x": 618669.0, "y": 556623.0, "type": "Connection"}, {"name": "Urnas Mountains", "x": 488923.0, "y": 577358.0, "type": "Connection"}, {"name": "Aal's Revelation", "x": 485929.0, "y": 548987.0, "type": "Connection"}, {"name": "Cliff of Despair", "x": 515719.0, "y": 608881.0, "type": "Connection"}, {"name": "Euphetar Mountains", "x": 630105.0, "y": 567492.0, "type": "Connection"}, {"name": "The Canted Ring", "x": 540931.0, "y": 643414.0, "type": "Connection"}, {"name": "Stillcoral Grove", "x": 516093.0, "y": 679670.0, "type": "Connection"}, {"name": "Great Dark Spot", "x": 506975.0, "y": 723093.0, "type": "Connection"}, {"name": "Tideworn Gorge", "x": 511263.0, "y": 776961.0, "type": "Connection"}, {"name": "Mount Rumanaré", "x": 578142.0, "y": 722566.0, "type": "Connection"}, {"name": "Whispering Hills", "x": 556843.0, "y": 680902.0, "type": "Connection"}, {"name": "Wailing Altar", "x": 627938.0, "y": 683775.0, "type": "Connection"}, {"name": "Garden of Immortality", "x": 685615.0, "y": 660572.0, "type": "Connection"}, {"name": "Veiled Archives", "x": 656722.0, "y": 651331.0, "type": "Connection"}, {"name": "Crossroads of Defiance", "x": 646483.0, "y": 611560.0, "type": "Connection"}, {"name": "Ancient Ruins", "x": 693631.0, "y": 578965.0, "type": "Connection"}, {"name": "Scorched Land of Prophecy", "x": 693749.0, "y": 534820.0, "type": "Connection"}, {"name": "Great Red Spot", "x": 670139.0, "y": 547956.0, "type": "Connection"}, {"name": "Doomstill Pond", "x": 735589.0, "y": 564719.0, "type": "Connection"}, {"name": "Ebony Opening", "x": 612647.0, "y": 643326.0, "type": "Connection"}, {"name": "Platerra Mountains", "x": 609412.0, "y": 699216.0, "type": "Connection"}, {"name": "Sanctuary Coastal Outpost", "x": 516022.0, "y": 460246.0, "type": "Connection"}];
const TRADE_MANAGERS = [{"node": "Velia", "npc": "Bahar"}, {"node": "Bartali Farm", "npc": "Emma Bartali"}, {"node": "Western Guard Camp", "npc": "Luke"}, {"node": "Finto Farm", "npc": "Martina Finto"}, {"node": "Balenos Forest", "npc": "Daphne DelLucci"}, {"node": "Loggia Farm", "npc": "Severo Loggia"}, {"node": "Toscani Farm", "npc": "Ovidio Toscani"}, {"node": "Marino Farm", "npc": "Rovant Marino"}, {"node": "Olvia", "npc": "Lolly"}, {"node": "Heidel", "npc": "Siuta"}, {"node": "Glish", "npc": "Larc"}, {"node": "Central Guard Camp", "npc": "Trade Manager Xenians"}, {"node": "Southern Guard Camp", "npc": "Trade Manager Anti"}, {"node": "Moretti Plantation", "npc": "Mercianne Moretti"}, {"node": "Alejandro Farm", "npc": "Amadeo Alejandro"}, {"node": "Elda Farm", "npc": "Coco Elda"}, {"node": "Northwestern Gateway", "npc": "Trade Manager Ginta"}, {"node": "Southwestern Gateway", "npc": "Trade Manager Theonil"}, {"node": "Eastern Gateway", "npc": "Breman"}, {"node": "Costa Farm", "npc": "Mael Costa"}, {"node": "Lynch Ranch", "npc": "Murana Lynch"}, {"node": "Keplan", "npc": "Hamir"}, {"node": "Heidel Pass", "npc": "Trade Manager Kirklas"}, {"node": "Calpheon Slum Trade Zone", "npc": "Harden"}, {"node": "Calpheon Market Trade Zone", "npc": "Lindsiyana Herba"}, {"node": "Calpheon Holy College Trade Zone", "npc": "Wolfgang"}, {"node": "Florin", "npc": "Trade Manager Loria"}, {"node": "Port Epheria", "npc": "Trade Manager Olivino Grolin"}, {"node": "Trent", "npc": "Rikta"}, {"node": "Behr", "npc": "Triee"}, {"node": "Crioville", "npc": "Herio"}, {"node": "Longleaf Tree Sentry Post", "npc": "Trade Manager Koirin"}, {"node": "Contaminated Farm", "npc": "Libero"}, {"node": "Dias Farm", "npc": "Enzo"}, {"node": "Cohen Farm", "npc": "Jacob"}, {"node": "Bernianto Farm", "npc": "Griffian Bernianto"}, {"node": "Marni Cave Path", "npc": "Henge Bato"}, {"node": "Falres Dirt Farm", "npc": "Jame Falres"}, {"node": "Bain Farmland", "npc": "Ann"}, {"node": "Oberen Farm", "npc": "Matheo Oberen"}, {"node": "Beacon Entrance Post", "npc": "Lonebaer"}, {"node": "Abandoned Quarry", "npc": "Abandoned Quarry Scout Theo"}, {"node": "Gianin Farm", "npc": "Goolie Gianin"}, {"node": "Serendia Western Gateway", "npc": "Batuetta"}, {"node": "Oze Pass", "npc": "Rock Investigator Enruka"}, {"node": "Hill Path", "npc": "Stranded Soldier John"}, {"node": "Eberdeen Island", "npc": "Merio"}, {"node": "Rhutum Sentry Post", "npc": "Elinke Visamin"}, {"node": "Abandoned Monastery", "npc": "Trade Manager Bacho Ladericcio"}, {"node": "South Kaia Pier", "npc": "Bavao"}, {"node": "Gabino Farm", "npc": "Bob Anderson"}, {"node": "Mansha Forest", "npc": "Mansha"}, {"node": "Tobare's Cabin", "npc": "Tobare"}, {"node": "Mediah Northern Gateway", "npc": "Suna Lise"}, {"node": "Omar Lava Cave", "npc": "Hakan Derk"}, {"node": "Stonetail Horse Ranch", "npc": "Asran"}, {"node": "Shuri Farm", "npc": "Anna Marre"}, {"node": "Kasula Farm", "npc": "Zaramas Kasula"}, {"node": "Delphe Knights Castle", "npc": "Granbill"}, {"node": "Anti-Troll Fortification", "npc": "Andre Vidal"}, {"node": "Phoniel's Cabin", "npc": "Villa Owner Phoniel"}, {"node": "Northern Wheat Plantation", "npc": "Norma Leight"}, {"node": "Delphe Outpost", "npc": "Trade Manager Raibo"}, {"node": "Iliya Island", "npc": "Trade Manager Maonil"}, {"node": "Altinova", "npc": "Quina"}, {"node": "Tarif", "npc": "Brorum"}, {"node": "Abun", "npc": "Trade Manager Kesir Baum"}, {"node": "Kusha", "npc": "Chakra"}, {"node": "Splashing Point", "npc": "Trade Manager Tacho"}, {"node": "Pilava Island", "npc": "Gerold"}, {"node": "Racid Island", "npc": "Kunka"}, {"node": "Baremi Island", "npc": "Sidimin"}, {"node": "Beiruwa Island", "npc": "Isaria"}, {"node": "Luivano Island", "npc": "Izaak"}, {"node": "Duch Island", "npc": "Andes"}, {"node": "Louruve Island", "npc": "Bilao"}, {"node": "Albresser Island", "npc": "Ninehart"}, {"node": "Daton Island", "npc": "Sion"}, {"node": "Randis Island", "npc": "Sagotts"}, {"node": "Theonil Island", "npc": "Riotina"}, {"node": "Deserted City of Runn", "npc": "Tony Vangertz"}, {"node": "Ancado Inner Harbor", "npc": "Inaha"}, {"node": "Orisha Island", "npc": "Seltin"}, {"node": "Valencia City", "npc": "Yis Kunjamin"}, {"node": "Valencia City", "npc": "Burita Allon"}, {"node": "Sand Grain Bazaar", "npc": "Atui Balacs"}, {"node": "Shakatu", "npc": "Taphtar"}, {"node": "Rock Post", "npc": "Trade Manager Siamak"}, {"node": "Ibellab Oasis", "npc": "Trade Manager Shuriar"}, {"node": "Arehaza", "npc": "Surondula"}, {"node": "Muiquun", "npc": "Trade Manager Sophia"}, {"node": "Lemoria Guard Post", "npc": "Trade Manager Leminei Lain"}, {"node": "Old Wisdom Tree", "npc": "Obi Bellen"}, {"node": "Viv Foretta Hamlet", "npc": "Trade Manager Norn Federers"}, {"node": "Grána", "npc": "Okiara"}, {"node": "Lake Flondor", "npc": "Trade Manager Maina"}, {"node": "Acher Guard Post", "npc": "Munanslyn"}, {"node": "Tooth Fairy Cabin", "npc": "Trade Manager Bronn"}, {"node": "Ash Forest", "npc": "Ashlynn"}, {"node": "Altinova", "npc": "Nyabee"}, {"node": "Duvencrune Farmland", "npc": "Dostter"}, {"node": "Sherekhan Necropolis", "npc": "Camira"}, {"node": "Ahib Conflict Zone", "npc": "Selena Aer"}, {"node": "Marcha Outpost", "npc": "Ladar"}, {"node": "Khimut Lumber Camp", "npc": "Karl Verdun"}, {"node": "Dormann Lumber Camp", "npc": "Dormann"}, {"node": "Duvencrune Farmland", "npc": "Tikara"}, {"node": "Grándiha", "npc": "Titu"}, {"node": "Papua Crinea", "npc": "Benns Lamute"}, {"node": "Eilton", "npc": "Bollona"}, {"node": "Camp Balacs", "npc": "Jorg"}, {"node": "Awina's Tail", "npc": "Huan"}, {"node": "Pilgrim's End", "npc": "Lisae"}, {"node": "Nampo's Moodle Village", "npc": "Gapsam"}, {"node": "Dalbeol Village", "npc": "Youngim"}, {"node": "Nopsae's Byeot County", "npc": "Old Lady Bokdeok"}, {"node": "Asparkan", "npc": "Ametullah"}, {"node": "Muzgar", "npc": "Sunnak"}, {"node": "Unjongga Street", "npc": "Gyeonghwan"}, {"node": "Seoul", "npc": "Taesok (Yukjo NPC, Seoul Origin)"}, {"node": "Bukpo", "npc": "Chunsu"}, {"node": "Velandir", "npc": "Bahzam"}, {"node": "Oquilla's Eye", "npc": "Kario"}, {"node": "Hakinza Sanctuary", "npc": "Roig Mills"}];
// Edania launched with the 36 nodes already present above. Frozen Halo was
// added on 2026-03-26; its coordinates use the same BDO world-map basis.
const EDANIA_NODE_NAMES = new Set([
  "Hakinza Sanctuary",
  "Aetherion Castle",
  "Orbita Castle",
  "Zephyros Castle",
  "Tenebraum Castle",
  "Nymphamaré Castle",
  "Escar Mountains",
  "Shore of Ruins",
  "Neftak Outpost",
  "Faith's Resting Place",
  "Great White Spot",
  "Frozen Halo",
  "Sanctified Mercy",
  "Litovan Mountains",
  "Azure Battlefield",
  "Saterna Mountains",
  "Urnas Mountains",
  "Aal's Revelation",
  "Cliff of Despair",
  "Euphetar Mountains",
  "The Canted Ring",
  "Stillcoral Grove",
  "Great Dark Spot",
  "Tideworn Gorge",
  "Mount Rumanaré",
  "Whispering Hills",
  "Wailing Altar",
  "Garden of Immortality",
  "Veiled Archives",
  "Crossroads of Defiance",
  "Ancient Ruins",
  "Scorched Land of Prophecy",
  "Great Red Spot",
  "Doomstill Pond",
  "Ebony Opening",
  "Platerra Mountains",
  "Sanctuary Coastal Outpost",
]);
if(!NODES.some(node => node.name === "Frozen Halo")) {
  NODES.push({name:"Frozen Halo", x:617526.0, y:456027.0, type:"Connection"});
}
for(const node of NODES) {
  if(EDANIA_NODE_NAMES.has(node.name)) node.region = "Edania";
}

const SCALE = 1470588;

const DIST_CAP = 150;      // distance bonus cap (%)
const TRADER_BONUS = 30;   // always-on trader bonus (%)

// Continuous "total level" mapping (Master 1-30, Guru 1-50)
const RANK_OFFSETS = {
  "Beginner": 0,
  "Apprentice": 10,
  "Skilled": 20,
  "Professional": 30,
  "Artisan": 40,
  "Master": 50,
  "Guru": 80
};
const RANK_MAX = {
  "Beginner": 10,
  "Apprentice": 10,
  "Skilled": 10,
  "Professional": 10,
  "Artisan": 10,
  "Master": 30,
  "Guru": 50
};

const el = {
  originSearch: document.getElementById("originSearch"),
  originSelect: document.getElementById("originSelect"),
  fishPrice: document.getElementById("fishPrice"),
  tradeRank: document.getElementById("tradeRank"),
  tradeLevel: document.getElementById("tradeLevel"),
  applyBargain: document.getElementById("applyBargain"),
  bargainOut: document.getElementById("bargainOut"),
  bestOut: document.getElementById("bestOut"),
  bestDetails: document.getElementById("bestDetails"),
  saleOut: document.getElementById("saleOut"),
  saleDetails: document.getElementById("saleDetails"),
  rowsBody: document.getElementById("rowsBody"),
};

const THEME_OPTIONS = [
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "sunset", label: "Sunset" },
  { id: "lavender", label: "Lavender" },
  { id: "slate", label: "Slate" },
  { id: "crimson", label: "Crimson" },
  { id: "gold", label: "Golden Hour" },
  { id: "midnight", label: "Midnight" },
];

const INTERFACE_PRESETS = {
  fantasy:   { mode:"dark", themeId:"gold",     strength:88, density:"comfortable", corners:"round", background:"embers" },
  cyber:     { mode:"dark", themeId:"lavender", strength:92, density:"compact",     corners:"sharp", background:"aurora" },
  cinematic: { mode:"dark", themeId:"slate",    strength:58, density:"comfortable", corners:"soft",  background:"stars" },
  crystal:   { mode:"dark", themeId:"ocean",    strength:86, density:"comfortable", corners:"round", background:"geometry" },
  tactical:  { mode:"dark", themeId:"forest",   strength:68, density:"compact",     corners:"sharp", background:"none" },
  retro:     { mode:"dark", themeId:"midnight", strength:82, density:"compact",     corners:"sharp", background:"geometry" },
  abyssal:   { mode:"dark", themeId:"ocean",    strength:88, density:"compact",     corners:"soft",  background:"ocean" },
  royal:     { mode:"dark", themeId:"crimson",  strength:80, density:"comfortable", corners:"round", background:"embers" },
  paper:     { mode:"light",themeId:"gold",     strength:48, density:"comfortable", corners:"soft",  background:"none" },
  foundry:   { mode:"dark", themeId:"sunset",   strength:86, density:"compact",     corners:"sharp", background:"embers" },
  void:      { mode:"dark", themeId:"lavender", strength:72, density:"compact",     corners:"sharp", background:"geometry" },
  caravan:   { mode:"light",themeId:"gold",     strength:58, density:"comfortable", corners:"round", background:"none" },
};

const appearanceEl = {
  modeToggle: document.getElementById("themeModeToggle"),
  modeLabel: document.getElementById("modeLabel"),
  themeChoices: [...document.querySelectorAll("[data-theme-choice]")],
  backgroundChoices: [...document.querySelectorAll("[data-background-choice]")],
  interfacePreviews: [...document.querySelectorAll("[data-interface-preview]")],
  interfaceStyle: document.getElementById("interfaceStyle"),
  backgroundStrength: document.getElementById("backgroundStrength"),
  strengthValue: document.getElementById("strengthValue"),
  density: document.getElementById("interfaceDensity"),
  corners: document.getElementById("cornerStyle"),
  reduceMotion: document.getElementById("reduceMotion"),
  toastEnabled: document.getElementById("toastNotificationsEnabled"),
  toastDuration: document.getElementById("toastDuration"),
  minimizeToTray: document.getElementById("minimizeToTrayEnabled"),
};

function loadAppearance() {
  try {
    const currentKey = "blackSpiritHub.appearance";
    const previousKey = "bdoTradeCalculatorAppearance";
    const stored = localStorage.getItem(currentKey) || localStorage.getItem(previousKey) || "{}";
    if (localStorage.getItem(currentKey) === null && stored !== "{}") {
      localStorage.setItem(currentKey, stored);
      localStorage.removeItem(previousKey);
    }
    return JSON.parse(stored);
  } catch (_) {
    return {};
  }
}

function saveAppearance(settings) {
  try {
    localStorage.setItem("blackSpiritHub.appearance", JSON.stringify(settings));
    localStorage.removeItem("bdoTradeCalculatorAppearance");
  } catch (_) {}
}

const settingNamespace = "blackSpiritHub";
const previousSettingNamespace = ["bdo", "Multi", "Tool"].join("");
function migratePreviousSettingNamespace() {
  try {
    const prefix = `${previousSettingNamespace}.`;
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter(key => key?.startsWith(prefix));
    keys.forEach(previousKey => {
      const currentKey = `${settingNamespace}.${previousKey.slice(prefix.length)}`;
      if (localStorage.getItem(currentKey) === null) {
        const value = localStorage.getItem(previousKey);
        if (value !== null) localStorage.setItem(currentKey, value);
      }
      localStorage.removeItem(previousKey);
    });
  } catch (_) {}
}
migratePreviousSettingNamespace();

const settingMemory = new Map();
const settingWriteTimers = new Map();
function readSetting(key, fallback) {
  if(settingMemory.has(key)) return settingMemory.get(key);
  try {
    const value = localStorage.getItem(`${settingNamespace}.${key}`);
    const parsed = value ? JSON.parse(value) : fallback;
    settingMemory.set(key, parsed);
    return parsed;
  } catch (_) {
    settingMemory.set(key, fallback);
    return fallback;
  }
}

function flushSetting(key) {
  if(!settingMemory.has(key)) return;
  try { localStorage.setItem(`${settingNamespace}.${key}`, JSON.stringify(settingMemory.get(key))); } catch (_) {}
  clearTimeout(settingWriteTimers.get(key));
  settingWriteTimers.delete(key);
}

function persistSetting(key, value) {
  settingMemory.set(key, value);
  clearTimeout(settingWriteTimers.get(key));
  settingWriteTimers.set(key, setTimeout(() => flushSetting(key), 180));
}

window.addEventListener("pagehide", () => [...settingWriteTimers.keys()].forEach(flushSetting));

const NotificationService=(()=>{const host=document.getElementById("toastHost"),icons={success:"OK",error:"!",warning:"!",info:"i"},titles={success:"Success",error:"Error",warning:"Warning",info:"Info"};let enabled=true,duration=5000,lastKey="",lastShown=0;function configure(s={}){enabled=s.toastEnabled!==false;duration=Math.max(3000,Math.min(12000,Number(s.toastDuration||5)*1000))}function dismiss(t){if(!t||t.classList.contains("leaving"))return;t.classList.add("leaving");setTimeout(()=>t.remove(),190)}function show(type,message,title=titles[type]){if(!enabled||!host||!message)return null;const key=`${type}|${title}|${message}`,now=Date.now();if(key===lastKey&&now-lastShown<1200)return null;lastKey=key;lastShown=now;const t=document.createElement("div");t.className=`uiToast ${type}`;t.innerHTML=`<span class="toastIcon">${icons[type]}</span><span class="toastCopy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span><small>${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></span><button class="toastClose" type="button" aria-label="Close notification">&times;</button>`;t.querySelector(".toastClose").addEventListener("click",()=>dismiss(t));host.appendChild(t);setTimeout(()=>dismiss(t),type==="error"?Math.max(duration,8000):duration);return t}return{configure,ShowSuccess:(m,t)=>show("success",m,t),ShowError:(m,t)=>show("error",m,t),ShowWarning:(m,t)=>show("warning",m,t),ShowInfo:(m,t)=>show("info",m,t)}})();

function applyAppearance(settings = {}) {
  if(settings.interfaceStyle === "celestial") settings = { ...settings, interfaceStyle:"fantasy" };
  const interfaceStyle = settings.interfaceStyle === "custom" || Object.hasOwn(INTERFACE_PRESETS, settings.interfaceStyle)
    ? settings.interfaceStyle : "fantasy";
  const customMode = interfaceStyle === "custom";
  const preset = customMode ? null : INTERFACE_PRESETS[interfaceStyle];
  const legacyIndex = Math.max(0, Math.min(THEME_OPTIONS.length - 1, Number(settings.themeIndex ?? 0)));
  const theme = customMode
    ? (THEME_OPTIONS.find(option => option.id === settings.themeId) || THEME_OPTIONS[legacyIndex])
    : THEME_OPTIONS.find(option => option.id === preset.themeId);
  const mode = customMode ? (settings.mode === "light" ? "light" : "dark") : preset.mode;
  const strength = customMode ? Math.max(20, Math.min(100, Number(settings.strength ?? 72))) : preset.strength;
  const density = customMode ? (settings.density === "compact" ? "compact" : "comfortable") : preset.density;
  const corners = customMode && ["soft","round","sharp"].includes(settings.corners) ? settings.corners : (customMode ? "soft" : preset.corners);
  const reducedMotion = settings.reducedMotion === true || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const toastEnabled=settings.toastEnabled!==false;
  const toastDuration=[3,5,8,12].includes(Number(settings.toastDuration))?Number(settings.toastDuration):5;
  const background = customMode && ["none","aurora","stars","matrix","embers","ocean","geometry"].includes(settings.background)
    ? settings.background : (customMode ? "aurora" : preset.background);

  document.body.dataset.mode = mode;
  document.body.dataset.theme = theme.id;
  document.body.dataset.density = density;
  document.body.dataset.corners = corners;
  document.body.dataset.motion = reducedMotion ? "reduced" : "full";
  document.body.dataset.background = background;
  document.body.dataset.style = interfaceStyle;
  document.documentElement.style.setProperty("--bg-strength", String(strength / 100));

  if(appearanceEl.modeToggle) appearanceEl.modeToggle.checked = mode === "dark";
  if(appearanceEl.modeLabel) appearanceEl.modeLabel.textContent = mode === "dark" ? "Dark mode" : "Light mode";
  appearanceEl.themeChoices.forEach(button => button.classList.toggle("active", button.dataset.themeChoice === theme.id));
  appearanceEl.backgroundChoices.forEach(button => button.classList.toggle("active", button.dataset.backgroundChoice === background));
  appearanceEl.interfacePreviews.forEach(button => button.classList.toggle("active", button.dataset.interfacePreview === interfaceStyle));
  if(appearanceEl.backgroundStrength) appearanceEl.backgroundStrength.value = String(strength);
  if(appearanceEl.strengthValue) appearanceEl.strengthValue.textContent = `${strength}%`;
  if(appearanceEl.density) appearanceEl.density.value = density;
  if(appearanceEl.interfaceStyle) appearanceEl.interfaceStyle.value = interfaceStyle;
  if(appearanceEl.corners) appearanceEl.corners.value = corners;
  if(appearanceEl.reduceMotion) appearanceEl.reduceMotion.checked = reducedMotion;
  if(appearanceEl.toastEnabled) appearanceEl.toastEnabled.checked=toastEnabled;
  if(appearanceEl.toastDuration) appearanceEl.toastDuration.value=String(toastDuration);
  if(appearanceEl.modeToggle) appearanceEl.modeToggle.disabled = !customMode;
  if(appearanceEl.density) appearanceEl.density.disabled = !customMode;
  if(appearanceEl.corners) appearanceEl.corners.disabled = !customMode;
  if(appearanceEl.backgroundStrength) appearanceEl.backgroundStrength.disabled = !customMode;
  appearanceEl.themeChoices.forEach(button => button.disabled = !customMode);
  appearanceEl.backgroundChoices.forEach(button => button.disabled = !customMode);

  NotificationService.configure({toastEnabled,toastDuration});
  saveAppearance({ mode, themeId:theme.id, strength, density, corners, reducedMotion, background, interfaceStyle, toastEnabled, toastDuration });
  scheduleFixedChromeOffsetSync();
}

const savedAppearance = loadAppearance();
applyAppearance({
  ...savedAppearance,
  reducedMotion: savedAppearance.reducedMotion === true,
  interfaceStyle: savedAppearance.interfaceStyle || "fantasy",
});

appearanceEl.modeToggle?.addEventListener("change", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, mode: appearanceEl.modeToggle.checked ? "dark" : "light" });
});

appearanceEl.themeChoices.forEach(button => button.addEventListener("click", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, themeId:button.dataset.themeChoice });
  NotificationService.ShowInfo(`${button.querySelector("strong")?.textContent||"Theme"} colors applied.`,"Theme changed");
}));

appearanceEl.backgroundChoices.forEach(button => button.addEventListener("click", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, background:button.dataset.backgroundChoice });
  NotificationService.ShowInfo(`${button.querySelector("strong")?.textContent||"Background"} applied.`,"Theme changed");
}));

appearanceEl.interfaceStyle?.addEventListener("change", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, interfaceStyle:appearanceEl.interfaceStyle.value });
  NotificationService.ShowInfo(`Interface changed to ${appearanceEl.interfaceStyle.selectedOptions[0].textContent}.`,"Theme changed");
});

appearanceEl.interfacePreviews.forEach(button => button.addEventListener("click", () => {
  const current = loadAppearance();
  const style = button.dataset.interfacePreview;
  applyAppearance({ ...current, interfaceStyle:style });
  NotificationService.ShowInfo(`${button.querySelector("strong")?.textContent||"Interface"} preview applied.`,"Theme changed");
}));

appearanceEl.density?.addEventListener("change", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, density:appearanceEl.density.value });
});

appearanceEl.corners?.addEventListener("change", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, corners:appearanceEl.corners.value });
});

appearanceEl.reduceMotion?.addEventListener("change", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, reducedMotion:appearanceEl.reduceMotion.checked });
});
appearanceEl.toastEnabled?.addEventListener("change",()=>{const current=loadAppearance();applyAppearance({...current,toastEnabled:appearanceEl.toastEnabled.checked});if(appearanceEl.toastEnabled.checked)NotificationService.ShowInfo("Toast notifications are enabled.")});
appearanceEl.toastDuration?.addEventListener("change",()=>{const current=loadAppearance();applyAppearance({...current,toastDuration:Number(appearanceEl.toastDuration.value)});NotificationService.ShowInfo(`Toast duration set to ${appearanceEl.toastDuration.value} seconds.`)});
let appBehaviorSettingsLoaded=false;
let appBehaviorSavedValue=null;
let appBehaviorLoadPromise=null;
let appBehaviorSaveInFlight=false;
let appBehaviorShowLoadError=false;
function requireAppBehaviorSettings(value){
  if(typeof value?.minimizeToTray!=="boolean")throw new Error("The application returned an invalid close-button setting.");
  return value;
}
function initializeAppBehaviorSettings({showError=false}={}){
  const toggle=appearanceEl.minimizeToTray;
  if(!toggle)return Promise.resolve(false);
  if(showError)appBehaviorShowLoadError=true;
  if(appBehaviorLoadPromise)return appBehaviorLoadPromise;
  toggle.disabled=true;
  toggle.closest(".switch")?.setAttribute("title","Loading close-button behavior");
  appBehaviorLoadPromise=(async()=>{
    try{
      const settings=requireAppBehaviorSettings(await bridgeCall("getAppBehaviorSettings"));
      appBehaviorSavedValue=settings.minimizeToTray;
      toggle.checked=settings.minimizeToTray;
      appBehaviorSettingsLoaded=true;
      toggle.closest(".switch")?.setAttribute("title","Minimize to system tray");
      return true;
    }catch(error){
      appBehaviorSettingsLoaded=false;
      toggle.closest(".switch")?.setAttribute("title","Close-button behavior is unavailable until the app reconnects");
      console.warn("[AppBehavior] Could not load close-button behavior.",error);
      if(appBehaviorShowLoadError)NotificationService.ShowError(error.message||"Could not load app behavior.","App behavior");
      return false;
    }finally{
      toggle.disabled=!appBehaviorSettingsLoaded||appBehaviorSaveInFlight;
    }
  })().finally(()=>{appBehaviorLoadPromise=null;appBehaviorShowLoadError=false;});
  return appBehaviorLoadPromise;
}
appearanceEl.minimizeToTray?.addEventListener("change",async()=>{
  const toggle=appearanceEl.minimizeToTray;
  if(!toggle||appBehaviorSaveInFlight)return;
  const requestedValue=toggle.checked;
  const previousValue=appBehaviorSavedValue;
  appBehaviorSaveInFlight=true;
  toggle.disabled=true;
  toggle.closest(".switch")?.setAttribute("title","Saving close-button behavior");
  try{
    const settings=requireAppBehaviorSettings(await bridgeCall("saveAppBehaviorSettings",{minimizeToTray:requestedValue}));
    appBehaviorSavedValue=settings.minimizeToTray;
    toggle.checked=settings.minimizeToTray;
    appBehaviorSettingsLoaded=true;
    toggle.closest(".switch")?.setAttribute("title","Minimize to system tray");
    NotificationService.ShowInfo(`Close button will ${settings.minimizeToTray?"minimize to tray":"close the app"}.`,"App behavior saved");
  }catch(error){
    console.warn("[AppBehavior] Could not save close-button behavior.",error);
    const restored=await initializeAppBehaviorSettings();
    if(!restored&&typeof previousValue==="boolean"){
      appBehaviorSavedValue=previousValue;
      toggle.checked=previousValue;
    }
    NotificationService.ShowError(error.message||"Could not save app behavior.","App behavior");
  }finally{
    appBehaviorSaveInFlight=false;
    toggle.disabled=!appBehaviorSettingsLoaded;
  }
});

appearanceEl.backgroundStrength?.addEventListener("input", () => {
  const current = loadAppearance();
  applyAppearance({ ...current, strength: Number(appearanceEl.backgroundStrength.value) });
});


function norm(s) {
  return (s||"").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}
function escapeHtml(s) {
  return (s??"").toString().replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fmt(n, digits=2) {
  if(!Number.isFinite(n)) return "&mdash;";
  return n.toLocaleString(undefined, {maximumFractionDigits:digits, minimumFractionDigits:digits});
}
function fmtInt(n) {
  if(!Number.isFinite(n)) return "&mdash;";
  return Math.round(n).toLocaleString();
}

const nodesByName = new Map();
const ORIGIN_NODES = [];
const originNames = new Set();
for(const node of NODES) {
  const name = String(node.name || "").trim();
  const normalizedName = norm(name);
  if(name && !nodesByName.has(name)) nodesByName.set(name, node);
  if(!name || !node.type || normalizedName === "not_a_node" || normalizedName === "unknown" || originNames.has(normalizedName)) continue;
  originNames.add(normalizedName);
  ORIGIN_NODES.push(node);
}
const nodeSearchIndex = ORIGIN_NODES.map(node => ({node, search:norm(`${node.name} ${node.type||""} ${node.region||""}`)}));

const tmNpcByNode = new Map();
for(const t of TRADE_MANAGERS) {
  if(!tmNpcByNode.has(t.node)) tmNpcByNode.set(t.node, []);
  tmNpcByNode.get(t.node).push(t.npc);
}
const tmTargets = TRADE_MANAGERS.map(t => nodesByName.get(t.node)).filter(Boolean);
const seen = new Set();
const SELL_TARGETS = [];
for(const n of tmTargets) {
  if(seen.has(n.name)) continue;
  seen.add(n.name);
  SELL_TARGETS.push(n);
}

function clampLevel(rank, level) {
  const maxL = RANK_MAX[rank] ?? 10;
  let l = Number(level);
  if(!Number.isFinite(l) || l < 1) l = 1;
  if(l > maxL) l = maxL;
  return l;
}
function totalTradingLevel(rank, level) {
  const off = RANK_OFFSETS[rank] ?? 0;
  const l = clampLevel(rank, level);
  return off + l;
}
function bargainBonusPct(rank, level) {
  // Bonus% = 5 + 0.5 * totalLevel (per common bargain formula)
  return 5 + 0.5 * totalTradingLevel(rank, level);
}

function mapDistance(a,b) {
  return Math.hypot(a.x-b.x, a.y-b.y);
}
function distanceBonusPct(dist) {
  const pct = (dist / SCALE) * 100.0;
  return Math.max(0, Math.min(DIST_CAP, pct));
}

function refreshOriginMatches() {
  const q = norm(el.originSearch.value);
  const list = q
    ? nodeSearchIndex.filter(entry => entry.search.includes(q)).map(entry => entry.node).slice(0, 300)
    : ORIGIN_NODES;

  el.originSelect.innerHTML = "";
  for(const n of list) {
    const opt = document.createElement("option");
    opt.value = n.name;
    opt.textContent = n.type ? `${n.name} - ${n.type}` : n.name;
    el.originSelect.appendChild(opt);
  }
  if(el.originSelect.options.length) el.originSelect.selectedIndex = 0;
}

function multiplier(distBonus, bargain) {
  const mDist = 1 + distBonus/100;
  const mBarg = 1 + bargain/100;
  const mTrader = 1 + TRADER_BONUS/100;
  return mDist * mBarg * mTrader;
}

function render() {
  // keep level within valid range for selected rank
  const r = el.tradeRank.value;
  const lvl = clampLevel(r, el.tradeLevel.value);
  if(String(lvl) !== String(el.tradeLevel.value)) el.tradeLevel.value = String(lvl);

  const bPct = el.applyBargain.checked ? bargainBonusPct(r, lvl) : 0;
  el.bargainOut.innerHTML =
    `Bargain bonus: <span class="mono">${fmt(bPct,2)}%</span>` +
    ` <span class="muted">(rank: ${escapeHtml(r)} ${lvl})</span>`;

  const origin = nodesByName.get(el.originSelect.value);
  if(!origin) {
    el.bestOut.textContent = "-";
    el.bestDetails.textContent = "Pick an origin.";
    el.saleOut.textContent = "-";
    el.saleDetails.textContent = "-";
    el.rowsBody.innerHTML = `<tr><td colspan="4" class="small">Pick an origin.</td></tr>`;
    return;
  }

  const basePrice = Number(el.fishPrice.value || 0);

  const rows = [];
  for(const d of SELL_TARGETS) {
    if(d.name === origin.name) continue;
    const dist = mapDistance(origin, d);
    const distPct = distanceBonusPct(dist);
    const npcs = tmNpcByNode.get(d.name) || [];
    const m = multiplier(distPct, bPct);
    const est = basePrice > 0 ? basePrice * m : NaN;
    rows.push({dest:d.name, npc:npcs.join(", "), distPct, dist, est});
  }
  rows.sort((a,b)=> b.distPct - a.distPct || b.dist - a.dist);

  const best = rows[0];
  const bestPct = best ? best.distPct : 0;
  const ties = rows.filter(r => Math.abs(r.distPct - bestPct) < 0.01).slice(0, 8);

  el.bestOut.textContent = ties.map(t=>t.dest).join(", ");
  el.bestDetails.innerHTML =
    `Origin: <span class="mono">${escapeHtml(origin.name)}</span> &rarr; Distance bonus: <span class="mono">${fmt(bestPct,2)}%</span>`;

  if(basePrice > 0 && best) {
    const m = multiplier(bestPct, bPct);
    el.saleOut.textContent = fmtInt(basePrice * m);
    el.saleDetails.innerHTML =
      `Multiplier: <span class="mono">${fmt(m,4)}&times;</span> &bull; Trader: <span class="mono">+30%</span>` +
      (bPct ? ` &bull; Bargain: <span class="mono">+${fmt(bPct,2)}%</span>` : "");
  } else {
    el.saleOut.textContent = "-";
    el.saleDetails.textContent = "Enter fish price to estimate.";
  }

  const out = [];
  for(const row of rows.slice(0, 50)) {
    out.push(`<tr>
      <td>${escapeHtml(row.dest)}</td>
      <td>${escapeHtml(row.npc)}</td>
      <td class="right mono">${fmt(row.distPct,2)}%</td>
      <td class="right mono">${basePrice > 0 ? fmtInt(row.est) : "-"}</td>
    </tr>`);
  }
  el.rowsBody.innerHTML = out.join("") || `<tr><td colspan="4" class="small">No results.</td></tr>`;
}

let tradeToastTimer=null,tradeSearchTimer=null,tradeRenderFrame=0;
function notifyTradeRoute(){clearTimeout(tradeToastTimer);tradeToastTimer=setTimeout(()=>{const origin=el.originSelect.value;if(origin)NotificationService.ShowInfo(`Route results updated from ${origin}.`,"Trade route recalculated")},420)}
function scheduleTradeRender(){
  if(tradeRenderFrame)return;
  tradeRenderFrame=requestAnimationFrame(()=>{tradeRenderFrame=0;render()});
}
el.originSearch.addEventListener("input", () => {
  clearTimeout(tradeSearchTimer);
  tradeSearchTimer=setTimeout(()=>{refreshOriginMatches();render()},120);
});
el.originSelect.addEventListener("change",()=>{render();if(el.originSelect.value)NotificationService.ShowInfo(`${el.originSelect.value} selected.`,"Origin selected");notifyTradeRoute()});
el.fishPrice.addEventListener("input",()=>{scheduleTradeRender();if(el.fishPrice.value!==""&&Number(el.fishPrice.value)<=0)NotificationService.ShowError("Enter a fish price greater than zero.","Invalid fish price");else notifyTradeRoute()});
el.tradeRank.addEventListener("change",()=>{render();notifyTradeRoute()});
el.tradeLevel.addEventListener("input",()=>{scheduleTradeRender();notifyTradeRoute()});
el.applyBargain.addEventListener("change",()=>{render();notifyTradeRoute()});

refreshOriginMatches();
render();

const marketState = {
  initialized: false,
  items: [],
  selected: null,
  analytics: null,
  outfits: null,
  requestNumber: 0,
  outfitRequestNumber: 0,
  pending: new Map(),
};

const portraitState = {
  initialized:false,
  faceTextureFolder:"",
  oldImage:null,
  newImage:null,
  previewTimer:null,
};

const fontState = {
  initialized:false,
  bdoFolder:"",
  customFont:null,
  presets:[],favorites:new Set((()=>{try{return JSON.parse(localStorage.getItem("bdoFontFavorites")||"[]")}catch{return[]}})()),
};

const marketEl = {
  provider: document.getElementById("marketProvider"),
  status: document.getElementById("marketStatus"),
  search: document.getElementById("marketSearch"),
  searchResults: document.getElementById("marketSearchResults"),
  regionButtons: [...document.querySelectorAll("[data-market-region]")],
  export: document.getElementById("marketExport"),
  trackedFilter: document.getElementById("trackedFilter"),
  trackedSort: document.getElementById("trackedSort"),
  trackedCount: document.getElementById("trackedCount"),
  trackedItems: document.getElementById("trackedItems"),
  empty: document.getElementById("marketEmpty"),
  detail: document.getElementById("marketDetail"),
  detailName: document.getElementById("detailName"),
  detailMeta: document.getElementById("detailMeta"),
  range: document.getElementById("historyRange"),
  remove: document.getElementById("removeTracked"),
  current: document.getElementById("metricCurrent"),
  min: document.getElementById("metricMin"),
  max: document.getElementById("metricMax"),
  average: document.getElementById("metricAverage"),
  trend: document.getElementById("metricTrend"),
  salesGrid: document.getElementById("salesGrid"),
  priceChart: document.getElementById("priceChart"),
  salesChart: document.getElementById("salesChart"),
  topOutfitCards: document.getElementById("topOutfitCards"),
  outfitCoverage: document.getElementById("outfitCoverage"),
  outfitFilter: document.getElementById("outfitFilter"),
  outfitRows: document.getElementById("outfitRows"),
};

const BRIDGE_TIMEOUTS={downloadAndInstallUpdate:600000,refreshEvents:105000,initializeEvents:105000,searchBdoPlayersGuilds:40000,getBdoGuildProfile:40000,getBdoPlayerProfile:75000,getDehkiaFuelData:100000,analyzeRecipeBookScreenshot:120000,healthCheck:6000};
function bridgeCall(command, payload = {}, options = {}) {
  if(!window.chrome?.webview) return Promise.reject(new Error("The Windows application bridge is unavailable."));
  const signal=options?.signal;
  if(signal?.aborted){const error=new Error("The operation was cancelled.");error.name="AbortError";return Promise.reject(error)}
  const id = `market-${++marketState.requestNumber}`;
  return new Promise((resolve, reject) => {
    const cancelNative=()=>{try{window.chrome.webview.postMessage({id:`cancel-${++marketState.requestNumber}`,command:"cancelRequest",payload:{requestId:id}})}catch{}};
    const cleanup=()=>signal?.removeEventListener("abort",onAbort);
    const onAbort=()=>{
      if(!marketState.pending.delete(id))return;
      clearTimeout(timeout);
      cleanup();
      cancelNative();
      const error=new Error("The operation was cancelled.");
      error.name="AbortError";
      reject(error);
    };
    const timeout=setTimeout(()=>{
      if(!marketState.pending.delete(id))return;
      cleanup();
      cancelNative();
      reject(new Error("The operation timed out. The controls are ready; please try again."));
    },BRIDGE_TIMEOUTS[command]||45000);
    marketState.pending.set(id, {resolve, reject, timeout, cleanup});
    signal?.addEventListener("abort",onAbort,{once:true});
    try{window.chrome.webview.postMessage({id, command, payload})}catch(error){clearTimeout(timeout);marketState.pending.delete(id);cleanup();reject(error)}
  });
}

window.addEventListener("pagehide",()=>{marketState.pending.forEach((pending,id)=>{clearTimeout(pending.timeout);pending.cleanup?.();try{window.chrome?.webview?.postMessage({id:`cancel-${++marketState.requestNumber}`,command:"cancelRequest",payload:{requestId:id}})}catch{}pending.reject(new Error("The application page closed."))});marketState.pending.clear()});

/* Persistent application health monitor. Kept as pure functions plus one small lifecycle controller for focused regression testing. */
const HEALTH_CHECK_INTERVAL_MS=15*60_000;
const HEALTH_PHASE_CLASSES=["checking","healthy","degraded","error"].map(phase=>`bsh-status-health--${phase}`);
function healthStateFromPayload(payload){
  if(payload?.databaseReadable!==true)return{phase:"error",label:"Hub database unavailable",detail:"Black Spirit Hub could not verify its local database."};
  if(payload?.contentIndexReadable!==true||!(Number(payload?.contentCount)>0))return{phase:"error",label:"Content index unavailable",detail:"Black Spirit Hub could not verify its packaged content index."};
  if(String(payload?.lastRefreshStatus||"").toLowerCase()==="failed")return{phase:"degraded",label:"Latest refresh needs attention",detail:payload?.lastRefreshError||"The latest market refresh did not finish. The app will retry automatically."};
  if(payload?.stale===true)return{phase:"degraded",label:"Catalogue refresh overdue",detail:"Local market data is older than expected. Black Spirit Hub will retry automatically."};
  const reasons=Array.isArray(payload?.degradedReasons)?payload.degradedReasons.filter(value=>typeof value==="string"&&value.trim()).slice(0,4):[];
  if(reasons.length)return{phase:"degraded",label:"Hub needs attention",detail:reasons.join(" ")};
  const count=Number(payload?.contentCount)||0;
  return{phase:"healthy",label:"All systems functional",detail:`${count.toLocaleString()} local content items, the hub database, and local saves are responding normally.`};
}
function healthApplyState(button,state){
  if(!button)return;
  button.classList.remove(...HEALTH_PHASE_CLASSES);
  button.classList.add(`bsh-status-health--${state.phase}`);
  const copy=button.querySelector(".bsh-status-health-copy strong");
  if(copy)copy.textContent=state.label;
  button.title=state.detail;
  button.setAttribute("aria-busy",state.phase==="checking"?"true":"false");
}
function healthTestLocalStorage(){
  const key=`black-spirit-hub-health-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try{localStorage.setItem(key,"ok");if(localStorage.getItem(key)!=="ok")throw new Error("Local storage did not round-trip.");localStorage.removeItem(key);return true}
  catch(error){try{localStorage.removeItem(key)}catch{}console.warn("[Health] local save probe failed",error);return false}
}
function initializeHealthMonitor(){
  const button=document.getElementById("appHealthMonitor");
  if(!button||button.dataset.healthInitialized==="true")return;
  button.dataset.healthInitialized="true";
  let running=false,disposed=false;
  const checking={phase:"checking",label:"Checking core systems...",detail:"Testing local saves and Black Spirit Hub services."};
  async function runHealthCheck(){
    if(running||disposed)return;
    running=true;healthApplyState(button,checking);
    try{
      if(!healthTestLocalStorage()){healthApplyState(button,{phase:"error",label:"Local saves unavailable",detail:"Black Spirit Hub could not verify its WebView storage."});return}
      if(!window.chrome?.webview){healthApplyState(button,{phase:"degraded",label:"Browser preview active",detail:"The WebView host is unavailable in browser preview; local storage passed."});return}
      const payload=await bridgeCall("healthCheck",{});
      if(!disposed)healthApplyState(button,healthStateFromPayload(payload));
    }catch(error){console.warn("[Health] native probe failed",error);if(!disposed)healthApplyState(button,{phase:"error",label:"Hub service unavailable",detail:"The native Black Spirit Hub service did not answer the health check. Click to retry."})}
    finally{running=false}
  }
  const interval=setInterval(()=>{if(document.visibilityState==="visible")runHealthCheck()},HEALTH_CHECK_INTERVAL_MS);
  const onVisibility=()=>{if(document.visibilityState==="visible")runHealthCheck()};
  const onPageHide=()=>{disposed=true;clearInterval(interval);document.removeEventListener("visibilitychange",onVisibility)};
  button.addEventListener("click",runHealthCheck);
  document.addEventListener("visibilitychange",onVisibility);
  window.addEventListener("pagehide",onPageHide,{once:true});
  runHealthCheck();
}

const portraitEl = {
  folderPath:document.getElementById("portraitFolderPath"),
  selectFolder:document.getElementById("portraitSelectFolder"),
  selectOld:document.getElementById("portraitSelectOld"),
  selectNew:document.getElementById("portraitSelectNew"),
  oldPreview:document.getElementById("portraitOldPreview"),
  oldPlaceholder:document.getElementById("portraitOldPlaceholder"),
  oldMeta:document.getElementById("portraitOldMeta"),
  newPreview:document.getElementById("portraitNewPreview"),
  newPlaceholder:document.getElementById("portraitNewPlaceholder"),
  newMeta:document.getElementById("portraitNewMeta"),
  finalPreview:document.getElementById("portraitFinalPreview"),
  finalPlaceholder:document.getElementById("portraitFinalPlaceholder"),
  finalMeta:document.getElementById("portraitFinalMeta"),
  cropModes:[...document.querySelectorAll('input[name="portraitCropMode"]')],
  cropEditor:document.getElementById("portraitCropEditor"),
  cropX:document.getElementById("portraitCropX"),
  cropY:document.getElementById("portraitCropY"),
  zoom:document.getElementById("portraitZoom"),
  zoomOut:document.getElementById("portraitZoomOut"),
  zoomIn:document.getElementById("portraitZoomIn"),
  cropXValue:document.getElementById("portraitCropXValue"),
  cropYValue:document.getElementById("portraitCropYValue"),
  zoomValue:document.getElementById("portraitZoomValue"),
  resetCrop:document.getElementById("portraitResetCrop"),
  status:document.getElementById("portraitStatus"),
  openBackups:document.getElementById("portraitOpenBackups"),
  restore:document.getElementById("portraitRestore"),
  replace:document.getElementById("portraitReplace"),
};

const fontEl = {
  bdoFolder:document.getElementById("fontBdoFolder"),
  selectBdoFolder:document.getElementById("fontSelectBdoFolder"),
  presetGallery:document.getElementById("fontPresetGallery"),
  chooseCustom:document.getElementById("fontChooseCustom"),
  customEmpty:document.getElementById("fontCustomEmpty"),
  customLoaded:document.getElementById("fontCustomLoaded"),
  customName:document.getElementById("fontCustomName"),
  customFile:document.getElementById("fontCustomFile"),
  customPreview:document.getElementById("fontCustomPreview"),
  applyCustom:document.getElementById("fontApplyCustom"),
  openFolder:document.getElementById("fontOpenFolder"),
  restoreBackup:document.getElementById("fontRestoreBackup"),
  removeCustom:document.getElementById("fontRemoveCustom"),
  status:document.getElementById("fontStatus"),
};

function setFontStatus(message, kind="") {
  fontEl.status.textContent = message;
  fontEl.status.classList.toggle("negative", kind === "error");
  fontEl.status.classList.toggle("positive", kind === "success");
  if(kind==="error")NotificationService.ShowError(message);if(kind==="success")NotificationService.ShowSuccess(message);
}

function requireBdoFolder() {
  if(!fontState.bdoFolder) {
    setFontStatus("Select the main Black Desert Online folder first.", "error");
    return false;
  }
  return true;
}

function renderFontPresets(presets) {
  fontState.presets=presets||fontState.presets;const visible=fontState.presets;
  if(!visible.length) {
    fontEl.presetGallery.innerHTML = `
      <div class="fontPresetCard">
        No bundled fonts are available.
      </div>`;
    return;
  }
  fontEl.presetGallery.innerHTML = visible.map(preset => `
    <article class="fontPresetCard">
      <button class="fontFavorite ${fontState.favorites.has(preset.id)?"active":""}" data-favorite-font="${escapeHtml(preset.id)}" title="Favorite font">&#9733;</button>
      <div class="fontPresetTop">
        <div>
          <strong>${escapeHtml(preset.name)}</strong>
          <span>${escapeHtml(preset.description)}</span>
        </div>
        <button class="marketButton primary" data-apply-font-preset="${escapeHtml(preset.id)}">Apply</button>
      </div>
      <div class="fontPreview">
        <img src="${preset.previewDataUrl}" alt="${escapeHtml(preset.name)} preview" />
      </div>
    </article>
  `).join("");
}

async function initializeFontChanger() {
  if(fontState.initialized) return;
  fontState.initialized = true;
  try {
    const [settings, gallery] = await Promise.all([
      bridgeCall("getFontChangerSettings"),
      bridgeCall("getFontPresets")
    ]);
    fontState.bdoFolder = settings.bdoFolder || "";
    fontEl.bdoFolder.textContent = fontState.bdoFolder || "No BDO folder selected";
    renderFontPresets(gallery.presets || []);
    setFontStatus(fontState.bdoFolder
      ? "BDO folder loaded. Choose a preset or a custom TrueType font."
      : "Select your Black Desert Online folder to begin.");
  } catch(error) {
    setFontStatus(error.message, "error");
  }
}

fontEl.selectBdoFolder.addEventListener("click", async () => {
  try {
    const result = await bridgeCall("selectBdoFolder", {
      currentPath:fontState.bdoFolder
    });
    if(result.cancelled) return;
    fontState.bdoFolder = result.bdoFolder || "";
    fontEl.bdoFolder.textContent = fontState.bdoFolder;
    setFontStatus("BDO folder saved. Choose a font to apply.");
  } catch(error) {
    setFontStatus(error.message, "error");
  }
});

fontEl.presetGallery.addEventListener("click", async event => {
  const favorite=event.target.closest("[data-favorite-font]");if(favorite){const id=favorite.dataset.favoriteFont;fontState.favorites.has(id)?fontState.favorites.delete(id):fontState.favorites.add(id);localStorage.setItem("bdoFontFavorites",JSON.stringify([...fontState.favorites]));renderFontPresets(fontState.presets);return}
  const button = event.target.closest("[data-apply-font-preset]");
  if(!button || !requireBdoFolder()) return;
  try {
    button.disabled = true;
    setFontStatus("Validating and installing the selected font...");
    const result = await bridgeCall("applyPresetFont", {
      bdoFolder:fontState.bdoFolder,
      presetId:button.dataset.applyFontPreset
    });
    setFontStatus(result.message, "success");
    NotificationService.ShowSuccess("Original pearl.ttf backed up.");
    NotificationService.ShowWarning("Restart BDO for font changes to appear.");
  } catch(error) {
    setFontStatus(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

fontEl.chooseCustom.addEventListener("click", async () => {
  try {
    const result = await bridgeCall("selectCustomFont", {
      currentPath:fontState.customFont?.path || ""
    });
    if(result.cancelled) return;
    fontState.customFont = result.font;
    fontEl.customName.textContent = result.font.familyName;
    fontEl.customFile.textContent = result.font.fileName;
    fontEl.customPreview.src = result.font.previewDataUrl;
    fontEl.customEmpty.hidden = true;
    fontEl.customLoaded.hidden = false;
    setFontStatus("Custom font validated. Review the preview, then apply it.");
    NotificationService.ShowInfo(`${result.font.fileName} selected.`,"Custom font ready");
  } catch(error) {
    setFontStatus(error.message, "error");
  }
});

fontEl.applyCustom.addEventListener("click", async () => {
  if(!requireBdoFolder()) return;
  if(!fontState.customFont?.path) {
    setFontStatus("Choose a custom .ttf font first.", "error");
    return;
  }
  try {
    fontEl.applyCustom.disabled = true;
    setFontStatus("Backing up the current font and installing your custom font...");
    const result = await bridgeCall("applyCustomFont", {
      bdoFolder:fontState.bdoFolder,
      fontPath:fontState.customFont.path
    });
    setFontStatus(result.message, "success");
    NotificationService.ShowSuccess("Original pearl.ttf backed up.");
    NotificationService.ShowSuccess("Custom font installed.");
    NotificationService.ShowWarning("Restart BDO for font changes to appear.");
  } catch(error) {
    setFontStatus(error.message, "error");
  } finally {
    fontEl.applyCustom.disabled = false;
  }
});

fontEl.openFolder.addEventListener("click", async () => {
  if(!requireBdoFolder()) return;
  try {
    const result = await bridgeCall("openBdoFontFolder", {
      bdoFolder:fontState.bdoFolder
    });
    setFontStatus(`Font folder opened: ${result.path}`);
  } catch(error) {
    setFontStatus(error.message, "error");
  }
});

fontEl.restoreBackup.addEventListener("click", async () => {
  if(!requireBdoFolder()) return;
  try {
    fontEl.restoreBackup.disabled = true;
    setFontStatus("Restoring the latest pearl.ttf backup...");
    const result = await bridgeCall("restoreLastFontBackup", {
      bdoFolder:fontState.bdoFolder
    });
    setFontStatus(result.message, "success");
  } catch(error) {
    setFontStatus(error.message, "error");
  } finally {
    fontEl.restoreBackup.disabled = false;
  }
});

fontEl.removeCustom.addEventListener("click", async () => {
  if(!requireBdoFolder()) return;
  try {
    fontEl.removeCustom.disabled = true;
    setFontStatus("Backing up and removing pearl.ttf...");
    const result = await bridgeCall("removeCustomFont", {
      bdoFolder:fontState.bdoFolder
    });
    setFontStatus(result.message, result.removed ? "success" : "");
  } catch(error) {
    setFontStatus(error.message, "error");
  } finally {
    fontEl.removeCustom.disabled = false;
  }
});

function portraitCropMode() {
  return portraitEl.cropModes.find(input => input.checked)?.value || "crop";
}

function portraitCropValueLabel(value, low, high) {
  const number = Number(value);
  if(number <= 5) return low;
  if(number >= 95) return high;
  if(Math.abs(number - 50) <= 4) return "Center";
  return `${number}%`;
}

function updatePortraitCropLabels() {
  portraitEl.cropXValue.textContent =
    portraitCropValueLabel(portraitEl.cropX.value, "Far left", "Far right");
  portraitEl.cropYValue.textContent =
    portraitCropValueLabel(portraitEl.cropY.value, "Top", "Bottom");
  portraitEl.zoomValue.textContent = `${portraitEl.zoom.value}%`;
  const awaitingImage = !portraitState.newImage?.path;
  const disabled = awaitingImage || portraitCropMode() === "stretch";
  portraitEl.cropEditor.classList.toggle("disabled", disabled);
  portraitEl.cropEditor.classList.toggle("awaiting-image", awaitingImage);
  portraitEl.cropModes.forEach(input => input.disabled = awaitingImage);
  portraitEl.cropX.disabled = disabled;
  portraitEl.cropY.disabled = disabled;
  portraitEl.zoom.disabled = disabled;
  portraitEl.zoomOut.disabled = disabled;
  portraitEl.zoomIn.disabled = disabled;
  portraitEl.resetCrop.disabled = disabled;
}

function setPortraitStatus(message, kind="") {
  portraitEl.status.textContent = message;
  portraitEl.status.classList.toggle("negative", kind === "error");
  portraitEl.status.classList.toggle("positive", kind === "success");
  if(kind==="error")NotificationService.ShowError(message);if(kind==="success")NotificationService.ShowSuccess(message);
}

function showPortraitImage(imageElement, placeholderElement, dataUrl) {
  const hasImage = Boolean(dataUrl);
  imageElement.hidden = !hasImage;
  placeholderElement.hidden = hasImage;
  if(!hasImage) {
    imageElement.removeAttribute("src");
    return;
  }
  imageElement.onerror = () => {
    imageElement.hidden = true;
    imageElement.removeAttribute("src");
    placeholderElement.hidden = false;
  };
  imageElement.src = dataUrl;
}

function clearPortraitFinalPreview() {
  showPortraitImage(portraitEl.finalPreview, portraitEl.finalPlaceholder, "");
  portraitEl.finalMeta.textContent = portraitCropMode() === "stretch"
    ? "Stretch fills 624 &times; 804 but may distort the image."
    : "Move the crop sliders below to choose the exact framing.";
}

function schedulePortraitPreview() {
  clearTimeout(portraitState.previewTimer);
  updatePortraitCropLabels();
  if(!portraitState.newImage?.path) {
    clearPortraitFinalPreview();
    return;
  }
  portraitState.previewTimer = setTimeout(refreshPortraitPreview, 90);
}

async function refreshPortraitPreview() {
  if(!portraitState.newImage?.path) return;
  try {
    const result = await bridgeCall("previewPortrait", {
      newImagePath:portraitState.newImage.path,
      cropMode:portraitCropMode(),
      cropX:Number(portraitEl.cropX.value),
      cropY:Number(portraitEl.cropY.value),
      zoom:Number(portraitEl.zoom.value) / 100,
    });
    showPortraitImage(
      portraitEl.finalPreview,
      portraitEl.finalPlaceholder,
      result.previewDataUrl);
    portraitEl.finalMeta.textContent =
      `Final output: 624 &times; 804 BMP &bull; ${portraitCropMode() === "stretch" ? "Stretched" : `Manual crop &bull; ${portraitEl.zoom.value}% zoom`}`;
  } catch(error) {
    clearPortraitFinalPreview();
    setPortraitStatus(error.message, "error");
  }
}

async function initializePortraitReplacer() {
  if(portraitState.initialized) return;
  portraitState.initialized = true;
  updatePortraitCropLabels();
  try {
    const settings = await bridgeCall("getPortraitSettings");
    portraitState.faceTextureFolder = settings.faceTextureFolder || "";
    portraitEl.folderPath.textContent =
      portraitState.faceTextureFolder || "No folder selected";
    setPortraitStatus(portraitState.faceTextureFolder
      ? "FaceTexture folder loaded. Select the portrait you want to replace."
      : "Select your FaceTexture folder to begin.");
  } catch(error) {
    setPortraitStatus(error.message, "error");
  }
}

portraitEl.selectFolder.addEventListener("click", async () => {
  try {
    const result = await bridgeCall("selectFaceTextureFolder", {
      currentPath:portraitState.faceTextureFolder
    });
    if(result.cancelled) return;
    portraitState.faceTextureFolder = result.faceTextureFolder || "";
    portraitState.oldImage = null;
    portraitEl.folderPath.textContent = portraitState.faceTextureFolder;
    showPortraitImage(portraitEl.oldPreview, portraitEl.oldPlaceholder, "");
    portraitEl.oldMeta.textContent = "No old portrait selected";
    setPortraitStatus("FaceTexture folder saved. Select the existing .bmp portrait.");
  } catch(error) {
    setPortraitStatus(error.message, "error");
  }
});

portraitEl.selectOld.addEventListener("click", async () => {
  try {
    const result = await bridgeCall("selectOldPortrait", {
      faceTextureFolder:portraitState.faceTextureFolder
    });
    if(result.cancelled) return;
    portraitState.oldImage = result.image;
    showPortraitImage(
      portraitEl.oldPreview,
      portraitEl.oldPlaceholder,
      result.image.previewDataUrl);
    portraitEl.oldMeta.textContent =
      `${result.image.fileName} &bull; ${result.image.width} &times; ${result.image.height}`;
    setPortraitStatus(`Ready to replace ${result.image.fileName}. Select the new image.`);
    NotificationService.ShowInfo(`${result.image.fileName} selected.`,"Existing portrait selected");
  } catch(error) {
    setPortraitStatus(error.message, "error");
  }
});

portraitEl.selectNew.addEventListener("click", async () => {
  try {
    const result = await bridgeCall("selectNewPortrait", {
      currentPath:portraitState.newImage?.path || ""
    });
    if(result.cancelled) return;
    portraitState.newImage = result.image;
    showPortraitImage(
      portraitEl.newPreview,
      portraitEl.newPlaceholder,
      result.image.previewDataUrl);
    portraitEl.newMeta.textContent =
      `${result.image.fileName} &bull; ${result.image.width} &times; ${result.image.height}`;
    setPortraitStatus("New image loaded. Adjust the crop, then review the final preview.");
    NotificationService.ShowInfo(`${result.image.fileName} selected.`,"New image selected");
    updatePortraitCropLabels();
    schedulePortraitPreview();
  } catch(error) {
    setPortraitStatus(error.message, "error");
  }
});

portraitEl.cropModes.forEach(input =>
  input.addEventListener("change", schedulePortraitPreview));
portraitEl.cropX.addEventListener("input", schedulePortraitPreview);
portraitEl.cropY.addEventListener("input", schedulePortraitPreview);
portraitEl.zoom.addEventListener("input", schedulePortraitPreview);
portraitEl.zoomOut.addEventListener("click", () => {
  portraitEl.zoom.value = Math.max(100, Number(portraitEl.zoom.value) - 10);
  schedulePortraitPreview();
});
portraitEl.zoomIn.addEventListener("click", () => {
  portraitEl.zoom.value = Math.min(300, Number(portraitEl.zoom.value) + 10);
  schedulePortraitPreview();
});
portraitEl.resetCrop.addEventListener("click", () => {
  portraitEl.cropX.value = "50";
  portraitEl.cropY.value = "50";
  portraitEl.zoom.value = "100";
  schedulePortraitPreview();
});

portraitEl.replace.addEventListener("click", async () => {
  if(!portraitState.faceTextureFolder || !portraitState.oldImage?.path || !portraitState.newImage?.path) {
    setPortraitStatus("Select the FaceTexture folder, old portrait, and new image first.", "error");
    return;
  }
  try {
    portraitEl.replace.disabled = true;
    setPortraitStatus("Converting the image and creating a safety backup...");
    const result = await bridgeCall("replacePortrait", {
      faceTextureFolder:portraitState.faceTextureFolder,
      oldImagePath:portraitState.oldImage.path,
      newImagePath:portraitState.newImage.path,
      cropMode:portraitCropMode(),
      cropX:Number(portraitEl.cropX.value),
      cropY:Number(portraitEl.cropY.value),
      zoom:Number(portraitEl.zoom.value) / 100,
    });
    portraitState.oldImage.previewDataUrl = result.previewDataUrl;
    showPortraitImage(
      portraitEl.oldPreview,
      portraitEl.oldPlaceholder,
      result.previewDataUrl);
    setPortraitStatus(
      `${result.fileName} was backed up and replaced successfully. Restart BDO to see the new portrait.`,
      "success");
    NotificationService.ShowSuccess("Backup saved successfully.");NotificationService.ShowSuccess("Portrait converted to 624 &times; 804 BMP.");NotificationService.ShowSuccess("Replacement complete.");NotificationService.ShowWarning("Restart BDO for portrait changes to appear.");
  } catch(error) {
    setPortraitStatus(error.message, "error");
  } finally {
    portraitEl.replace.disabled = false;
  }
});

portraitEl.openBackups.addEventListener("click", async () => {
  try {
    const result = await bridgeCall("openPortraitBackupFolder", {
      faceTextureFolder:portraitState.faceTextureFolder
    });
    setPortraitStatus(`Backup folder opened: ${result.backupFolder}`);
  } catch(error) {
    setPortraitStatus(error.message, "error");
  }
});

portraitEl.restore.addEventListener("click", async () => {
  if(!portraitState.oldImage?.path) {
    setPortraitStatus("Select the portrait file you want to restore first.", "error");
    return;
  }
  try {
    portraitEl.restore.disabled = true;
    setPortraitStatus("Restoring the most recent backup...");
    const result = await bridgeCall("restoreLastPortraitBackup", {
      faceTextureFolder:portraitState.faceTextureFolder,
      oldImagePath:portraitState.oldImage.path
    });
    showPortraitImage(
      portraitEl.oldPreview,
      portraitEl.oldPlaceholder,
      result.previewDataUrl);
    setPortraitStatus(
      `${result.fileName} was restored from the latest backup.`,
      "success");
  } catch(error) {
    setPortraitStatus(error.message, "error");
  } finally {
    portraitEl.restore.disabled = false;
  }
});

window.chrome?.webview?.addEventListener("message", event => {
  const message = event.data || {};
  if(message.id && marketState.pending.has(message.id)) {
    const pending = marketState.pending.get(message.id);
    marketState.pending.delete(message.id);
    clearTimeout(pending.timeout);
    pending.cleanup?.();
    if(message.ok) pending.resolve(message.data);
    else pending.reject(new Error(message.error || "The operation failed."));
    return;
  }
  if(message.eventName === "status" && message.data?.message) {
    setMarketStatus(message.data.message);
  }
  if(message.eventName === "dataChanged" && marketState.initialized) {
    refreshMarketState();
  }
  if(message.eventName === "updateCheckRequested") {
    initializeUpdateChecker();
  }
});
initializeAppBehaviorSettings();
initializeHealthMonitor();

function setMarketStatus(message, isError = false) {
  marketEl.status.textContent = message;
  marketEl.status.classList.toggle("negative", isError);
}

function getMarketRegion() {
  return "eu";
}

function setMarketRegion() {
  const normalized = "eu";
  marketEl.regionButtons.forEach(button => {
    const active = button.dataset.marketRegion === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function marketRegionPanels() {
  return [document.getElementById("trackerPanel"), document.getElementById("outfitPanel")].filter(Boolean);
}

function waitForMarketFade() {
  return new Promise(resolve => setTimeout(resolve, 140));
}

async function initializeMarket() {
  if(marketState.initialized) return;
  try {
    setMarketStatus("Loading local market history...");
    const state = await bridgeCall("initialize");
    marketState.initialized = true;
    marketEl.provider.textContent = `${state.provider} + local SQLite history`;
    setMarketRegion(state.settings?.region || "eu");
    await loadMarketRegionState(getMarketRegion(), false);
    renderTrackedItems();
    setMarketStatus("Ready");
  } catch(error) {
    setMarketStatus(error.message, true);
  }
}

async function refreshMarketState() {
  try {
    await loadMarketRegionState(getMarketRegion(), false);
    renderTrackedItems();
    if(marketState.selected) {
      const stillTracked = marketState.items.find(item =>
        item.itemId === marketState.selected.itemId && item.enhancement === marketState.selected.enhancement);
      if(stillTracked) {
        marketState.selected = stillTracked;
        await loadAnalytics();
      } else {
        clearMarketDetail();
      }
    }
  } catch(error) {
    setMarketStatus(error.message, true);
  }
}

const storedCouponKnownCodes=readSetting("couponKnownCodes",[]);
const couponState={initialized:false,coupons:[],activeTab:"available",selectedCode:"",expandedRewardsCode:"",page:0,pageSize:8,timer:null,autoTimer:null,autoRefreshing:false,lastKnownCodes:new Set((Array.isArray(storedCouponKnownCodes)?storedCouponKnownCodes:[]).map(couponCodeKey).filter(Boolean))};
const COUPON_AUTO_REFRESH_INTERVAL_MS=2*60*60*1000;
const couponEl={search:document.getElementById("couponSearch"),status:document.getElementById("couponStatusFilter"),showExpired:document.getElementById("couponShowExpired"),refresh:document.getElementById("couponRefresh"),source:document.getElementById("couponSourceBadge"),region:document.getElementById("couponRegionBadge"),updated:document.getElementById("couponLastUpdated"),message:document.getElementById("couponMessage"),rows:document.getElementById("couponRows"),available:document.getElementById("couponAvailableCount"),availableTab:document.getElementById("couponAvailableTabCount"),expired:document.getElementById("couponExpiredCount"),expiredTab:document.getElementById("couponExpiredTabCount"),redeemed:document.getElementById("couponRedeemedCount"),total:document.getElementById("couponTotalCount"),sort:document.getElementById("couponSort"),detail:document.getElementById("couponDetail"),lastCheck:document.getElementById("couponLastCheck"),sync:document.getElementById("couponSyncText"),statusAlert:document.getElementById("couponStatusAlert"),pagePrevious:document.getElementById("couponPagePrevious"),pageNext:document.getElementById("couponPageNext"),pageStatus:document.getElementById("couponPageStatus")};
const updateState={info:null,installing:false};
const updateEl={alert:document.getElementById("updateStatusAlert")};
const appVersionEl=document.getElementById("appVersionLabel");
function applyAppVersion(value){if(!appVersionEl)return;const version=String(value||"").trim();appVersionEl.textContent=version||"v...";appVersionEl.title=version?`Black Spirit Hub ${version}`:"Application version";}
async function initializeAppVersion(){try{const info=await bridgeCall("getAppVersion");applyAppVersion(info?.version);}catch(error){console.warn("[App] version unavailable",error);}}
function applyUpdateStatus(info){updateState.info=info||null;updateState.installing=false;const show=Boolean(info?.updateAvailable);if(!updateEl.alert)return;updateEl.alert.classList.remove("busy");updateEl.alert.textContent=show?`Update now ${info.latestVersion||""}`:"";updateEl.alert.title=show?"Download, verify, and launch the latest Black Spirit Hub installer":"";updateEl.alert.classList.toggle("show",show);}
async function installUpdateFromAlert(){const info=updateState.info;if(!info?.updateAvailable||updateState.installing)return;updateState.installing=true;const previous=updateEl.alert?.textContent||"";if(updateEl.alert){updateEl.alert.textContent="Downloading & verifying...";updateEl.alert.classList.add("busy");}try{const result=await bridgeCall("downloadAndInstallUpdate",{latestVersion:info.latestVersion||""});NotificationService.ShowSuccess(`Starting installer ${result.latestVersion||info.latestVersion||""}.`,"Update ready");if(updateEl.alert)updateEl.alert.textContent="Launching installer...";}catch(error){if(updateEl.alert){updateEl.alert.textContent=previous;updateEl.alert.classList.remove("busy");}NotificationService.ShowError(error.message||"Could not download the update installer.");try{await bridgeCall("openExternalUrl",{url:info.url||info.repositoryUrl});}catch{}updateState.installing=false;}}
async function initializeUpdateChecker(){try{const info=await bridgeCall("checkForUpdates");applyUpdateStatus(info);}catch(error){console.warn("[Updates] check failed",error);applyUpdateStatus(null);}}
updateEl.alert?.addEventListener("click",installUpdateFromAlert);
updateEl.alert?.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();installUpdateFromAlert();}});
function couponEscape(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function couponCodeKey(code){return String(code||"").normalize("NFKC").toUpperCase().replace(/[^\p{L}\p{N}]/gu,"")}
function couponRedeemedMap(){const saved=readSetting("couponRedeemed",{}),normalized={};if(saved&&typeof saved==="object")Object.entries(saved).forEach(([code,redeemed])=>{const key=couponCodeKey(code);if(key&&redeemed===true)normalized[key]=true});return normalized}
function couponIsRedeemed(code){return couponRedeemedMap()[couponCodeKey(code)]===true}
function couponUnreadNewCodes(){return readSetting("couponNewCodes",[]).map(couponCodeKey).filter(Boolean)}
function couponNewMessage(count){return count?`${count} new coupon${count===1?" is":"s are"} available`:""}
function couponSetTaskbarBadge(count){bridgeCall("setCouponBadgeCount",{count:Math.max(0,Number(count)||0)}).catch(()=>{});}
function couponSetUnreadNewCodes(codes){const unique=[...new Set((codes||[]).map(couponCodeKey).filter(Boolean))],active=new Set(couponState.coupons.filter(c=>!c.isExpired).map(c=>couponCodeKey(c.code)));const unread=unique.filter(code=>active.has(code)&&!couponIsRedeemed(code));persistSetting("couponNewCodes",unread);couponSetStatusAlert(couponNewMessage(unread.length));couponSetTaskbarBadge(unread.length);return unread.length}
function couponPruneNewCouponAlert(){return couponSetUnreadNewCodes(couponUnreadNewCodes())}
function couponClearNewCode(code){const key=couponCodeKey(code);if(!key)return;couponSetUnreadNewCodes(couponUnreadNewCodes().filter(x=>x!==key))}
function setCouponRedeemed(code,redeemed){const map=couponRedeemedMap(),key=couponCodeKey(code);if(!key)return;if(redeemed){map[key]=true;couponClearNewCode(key)}else delete map[key];persistSetting("couponRedeemed",map)}
function couponRedeemButton(c){const redeemed=couponIsRedeemed(c.code);return `<button class="couponRedeemToggle ${redeemed?"redeemed":""}" data-redeem-coupon="${couponEscape(c.code)}" aria-pressed="${redeemed}" title="Mark this coupon as ${redeemed?"not redeemed":"redeemed"}">${redeemed?"Redeemed":"Redeem"}</button>`}
function couponVisibleAvailable(){return couponState.coupons.filter(c=>!c.isExpired&&!couponIsRedeemed(c.code))}
function couponVisibleRedeemed(){return couponState.coupons.filter(c=>couponIsRedeemed(c.code))}
function couponSetStatusAlert(message){if(!couponEl.statusAlert)return;couponEl.statusAlert.textContent=message||"";couponEl.statusAlert.classList.toggle("show",Boolean(message));}
function couponRememberCodes(coupons){const codes=(coupons||[]).map(c=>couponCodeKey(c.code)).filter(Boolean);couponState.lastKnownCodes=new Set(codes);persistSetting("couponKnownCodes",codes)}
function couponNotifyNewCodes(coupons,{silent=false}={}){const active=(coupons||[]).filter(c=>!c.isExpired).map(c=>couponCodeKey(c.code)).filter(Boolean);if(!couponState.lastKnownCodes.size){couponRememberCodes(coupons);couponPruneNewCouponAlert();return 0;}const fresh=active.filter(code=>!couponState.lastKnownCodes.has(code)&&!couponIsRedeemed(code));couponRememberCodes(coupons);if(!fresh.length){couponPruneNewCouponAlert();return 0;}const count=couponSetUnreadNewCodes([...couponUnreadNewCodes(),...fresh]);const message=couponNewMessage(count);if(!silent&&message)NotificationService.ShowSuccess(message,"Coupons");return fresh.length}
function couponRows(){const search=couponEl.search.value.trim().toLowerCase(),status=couponEl.status.value;return couponState.coupons.filter(c=>{const redeemed=couponIsRedeemed(c.code);if(couponState.activeTab==="available"&&(c.isExpired||redeemed))return false;if(couponState.activeTab==="redeemed"&&!redeemed)return false;if(couponState.activeTab==="expired"&&!c.isExpired)return false;if(status==="available"&&c.isExpired)return false;if(status==="expired"&&!c.isExpired)return false;return !search||`${c.code} ${(c.rewards||[]).map(r=>r.itemName).join(" ")}`.toLowerCase().includes(search);});}
function couponRewards(rewards){const list=Array.isArray(rewards)?rewards:[],shown=list.slice(0,7),compact=list.length>2;if(!list.length)return'<span class="couponRewardMore">Reward details unavailable</span>';return`<div class="couponRewards">${shown.map((r,i)=>`<span class="couponReward" title="${couponEscape(`${r.quantity}x ${r.itemName}`)}"><img class="couponRewardIcon" src="${couponEscape(r.icon)}" alt="">${!compact||i===0?`<span class="couponRewardText">${couponEscape(r.quantity)}x ${couponEscape(r.itemName)}</span>`:""}</span>`).join("")}${compact?`<span class="couponRewardMore">+${Math.max(0,list.length-1)} items</span>`:""}</div>`;}
function couponRewardListHtml(rewards){const list=Array.isArray(rewards)?rewards:[];if(!list.length)return'<div class="couponRewardListEmpty">Reward details unavailable.</div>';return list.map(r=>`<div class="couponRewardListItem"><img src="${couponEscape(r.icon)}" alt=""><span class="couponRewardListName">${couponEscape(r.itemName)}</span><strong class="couponRewardListQuantity">${couponEscape(r.quantity)}x</strong></div>`).join("")}
function couponExpiryText(value,expired,fallback){const date=new Date(value);if(!value||Number.isNaN(date.getTime()))return fallback||"No expiry listed";const diff=date.getTime()-Date.now();const days=Math.ceil(Math.abs(diff)/86400000);if(diff<=0)return`Expired ${Math.max(1,days)} day${days===1?"":"s"} ago`;return diff<86400000?"Expires today":`${Math.max(1,days)} days`;}
function couponCacheAgeText(minutes){const value=Number(minutes);if(!Number.isFinite(value)||value<=0)return"";if(value<60)return`${Math.max(1,Math.round(value))}m`;const hours=Math.round(value/60);if(hours<48)return`${hours}h`;return`${Math.round(hours/24)}d`}
function applyCouponDashboard(data,{checkNew=false,silent=false}={}){couponState.coupons=Array.isArray(data.coupons)?data.coupons:[];couponEl.search.value="";couponEl.status.value="all";couponEl.sort.value="newest";couponEl.showExpired.checked=true;const available=couponVisibleAvailable(),redeemed=couponVisibleRedeemed();couponEl.available.textContent=available.length;if(couponEl.availableTab)couponEl.availableTab.textContent=available.length;couponEl.expired.textContent=data.expiredCount??couponState.coupons.filter(x=>x.isExpired).length;if(couponEl.redeemed)couponEl.redeemed.textContent=redeemed.length;couponEl.total.textContent=data.totalCount??couponState.coupons.length;const status=String(data.status||"CACHED").toUpperCase(),cacheAge=couponCacheAgeText(data.cacheAgeMinutes);couponEl.source.textContent=status==="LIVE"?"LIVE DATA":status==="ERROR"?"ERROR":"CACHED DATA";couponEl.source.className=status==="ERROR"?"couponSourceBadge error":"";if(couponEl.region)couponEl.region.textContent=`${String(data.regionScope||"NA / EU").toUpperCase()} ONLY`;couponEl.sync.textContent=status==="LIVE"?"Synced":data.isStale?`Stored locally${cacheAge?` - ${cacheAge} old`:""}`:"Stored locally";const date=new Date(data.lastAttempt||data.lastRefreshed);couponEl.lastCheck.textContent=Number.isNaN(date.getTime())?"-":date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});couponEl.updated.textContent=`Last Attempt: ${Number.isNaN(date.getTime())?"-":date.toLocaleString()}`;couponEl.message.textContent=data.message||((status!=="LIVE"&&data.isStale)?"Showing stored coupon data from the last successful refresh.":"");if(checkNew)couponNotifyNewCodes(couponState.coupons,{silent});else{if(!couponState.lastKnownCodes.size)couponRememberCodes(couponState.coupons);couponPruneNewCouponAlert();}if(!couponState.selectedCode||!couponState.coupons.some(c=>c.code===couponState.selectedCode))couponState.selectedCode=(couponState.activeTab==="redeemed"?redeemed[0]?.code:available[0]?.code)||couponState.coupons[0]?.code||"";renderCoupons();}
function renderCoupons(){
  const rows=couponRows(),sort=couponEl.sort?.value||"newest";
  if(sort==="code")rows.sort((a,b)=>a.code.localeCompare(b.code));
  else if(sort==="oldest")rows.reverse();
  const available=couponVisibleAvailable(),redeemed=couponVisibleRedeemed(),expired=couponState.coupons.filter(c=>c.isExpired);
  couponEl.available.textContent=available.length;
  if(couponEl.availableTab)couponEl.availableTab.textContent=available.length;
  if(couponEl.redeemed)couponEl.redeemed.textContent=redeemed.length;
  if(couponEl.expiredTab)couponEl.expiredTab.textContent=expired.length;

  const pageCount=Math.max(1,Math.ceil(rows.length/couponState.pageSize));
  couponState.page=Math.min(Math.max(0,couponState.page),pageCount-1);
  const pageRows=rows.slice(couponState.page*couponState.pageSize,(couponState.page+1)*couponState.pageSize);
  if(couponEl.pageStatus)couponEl.pageStatus.textContent=`Page ${couponState.page+1} of ${pageCount}`;
  if(couponEl.pagePrevious)couponEl.pagePrevious.disabled=couponState.page===0;
  if(couponEl.pageNext)couponEl.pageNext.disabled=couponState.page>=pageCount-1;
  if(!rows.length){
    couponEl.rows.innerHTML='<div class="couponDetailEmpty">No coupons match the current filters.</div>';
    couponEl.detail.innerHTML='<div class="couponDetailEmpty">No coupon details are available.</div>';
    return;
  }
  if(!couponState.selectedCode||!pageRows.some(c=>c.code===couponState.selectedCode))couponState.selectedCode=pageRows[0].code;
  couponEl.rows.innerHTML=pageRows.map(c=>{
    const rewards=c.rewards||[],first=rewards[0];
    return`<article class="couponRowV2 ${c.code===couponState.selectedCode?"selected":""}" data-coupon-code="${couponEscape(c.code)}"><div class="couponRowCode"><span class="couponTicket">&#9670;</span><span>${couponEscape(c.code)}</span></div><div class="couponRedeemCell">${couponRedeemButton(c)}</div><div class="couponStatusV2"><span>${c.isExpired?"Expired":"Available"}</span></div><div class="couponRewardSummary">${first?`<img src="${couponEscape(first.icon)}" alt=""><span>${couponEscape(first.quantity)}x ${couponEscape(first.itemName)}${rewards.length>1?`<br>+${rewards.length-1} items`:""}</span>`:"Rewards unavailable"}</div><div class="couponChevron">&rsaquo;</div></article>`;
  }).join("");
  renderCouponDetail(pageRows.find(c=>c.code===couponState.selectedCode)||pageRows[0]);
}
function renderCouponDetail(c){const rewards=c.rewards||[],first=rewards[0],redeemed=couponIsRedeemed(c.code),rewardKey=couponCodeKey(c.code),expanded=couponState.expandedRewardsCode===rewardKey,rewardListId=`couponRewardList-${rewardKey||"selected"}`,codexMatched=rewards.some(r=>r.iconSource==="BDO Codex");couponEl.detail.innerHTML=`<button class="couponDetailClose">&times;</button><span class="couponDetailBadge">${c.isExpired?"EXPIRED":"AVAILABLE"} <i></i></span><h2>${couponEscape(c.code)} <button class="couponInlineCopy" data-copy-coupon="${couponEscape(c.code)}">&#9633;</button></h2><div class="couponDetailLead">Redeem this code in-game to claim your rewards.</div><div class="couponDetailStats"><div class="couponDetailStat"><span class="couponDetailStatIcon">${redeemed?"&#10003;":"&#9633;"}</span><div><label>REDEMPTION STATUS</label><strong class="${redeemed?"green":"muted"}">${redeemed?"Redeemed":"Not redeemed"}</strong><small>${redeemed?"You marked this coupon as used.":"Mark it redeemed after using it in-game."}</small></div></div><div class="couponDetailStat"><span class="couponDetailStatIcon">&#10003;</span><div><label>COUPON STATUS</label><strong class="green">${c.isExpired?"Expired":"Available"}</strong><small>${couponEscape(couponExpiryText(c.expiryUtc,c.isExpired,c.expiryText))}</small></div></div></div><section class="couponRewardPreview"><button class="couponRewardDisclosure" type="button" data-coupon-rewards-toggle="${couponEscape(c.code)}" aria-expanded="${expanded}" aria-controls="${couponEscape(rewardListId)}"><span class="couponRewardDisclosureMain"><small>REWARDS PREVIEW</small>${first?`<span class="couponRewardDisclosureReward"><img src="${couponEscape(first.icon)}" alt=""><span>${couponEscape(first.quantity)}x ${couponEscape(first.itemName)}</span></span>`:"<span>Reward details unavailable.</span>"}</span><strong class="couponRewardCount">${rewards.length} ${rewards.length===1?"item":"items"}</strong><span class="couponRewardDisclosureChevron" aria-hidden="true">&#8964;</span></button><div class="couponRewardList" id="${couponEscape(rewardListId)}" ${expanded?"":"hidden"}>${couponRewardListHtml(rewards)}${codexMatched?'<button class="couponIconAttribution" type="button" data-open-url="https://bdocodex.com/">Item icons: BDO Codex &nearr;</button>':""}</div></section><button class="couponCopyLarge" data-copy-coupon="${couponEscape(c.code)}">Copy Code</button><button class="couponRedeemOnline" data-open-url="https://payment.naeu.playblackdesert.com/en-us/Shop/Coupon/">Redeem Online &nbsp; &nearr;</button>`;}
async function initializeCoupons(){if(couponState.initialized)return;couponState.initialized=true;try{applyCouponDashboard(await bridgeCall("initializeCoupons"));startCouponAutoRefresh();setTimeout(()=>refreshCoupons({auto:true,silent:false}),1800);}catch(error){couponEl.source.textContent="ERROR";couponEl.source.className="couponSourceBadge error";couponEl.message.textContent=error.message;}}
clearInterval(window.__bdoCouponRelativeTimer);window.__bdoCouponRelativeTimer=setInterval(()=>{if(couponState.initialized&&document.getElementById("couponsView")?.classList.contains("active"))renderCoupons();},60000);
function startCouponAutoRefresh(){clearInterval(couponState.autoTimer);couponState.autoTimer=setInterval(()=>refreshCoupons({auto:true,silent:false}),COUPON_AUTO_REFRESH_INTERVAL_MS);}
async function refreshCoupons(options={}){const auto=options.auto===true,silent=options.silent===true;if(couponState.autoRefreshing)return;if(!auto&&couponEl.refresh.disabled)return;const attemptStarted=new Date();console.info("[Coupons] refresh started");couponState.autoRefreshing=true;if(!auto){couponEl.refresh.disabled=true;couponEl.refresh.textContent="Refreshing...";}couponEl.updated.textContent=`Last Attempt: ${attemptStarted.toLocaleString()}`;couponEl.message.textContent=auto?"Auto-checking live coupon sources...":"Trying live coupon source...";try{const data=await bridgeCall("refreshCoupons");const debug=data.refreshDebug||{};console.info("[Coupons] source URL:",debug.sourceUrl||data.sourceUrl||"unknown");console.info("[Coupons] HTTP status:",debug.httpStatus??"unavailable");if((debug.rawResponseLength??0)>0)console.info("[Coupons] raw response length:",debug.rawResponseLength);console.info("[Coupons] parsing succeeded:",debug.parsingSucceeded===true);console.info("[Coupons] coupons parsed:",debug.couponsParsed??0);console.info("[Coupons] cache updated:",debug.cacheUpdated===true?"yes":"no");applyCouponDashboard(data,{checkNew:true,silent});console.info("[Coupons] UI updated: yes");if(!auto&&String(data.status).toUpperCase()==="LIVE"&&debug.parsingSucceeded&&debug.cacheUpdated)NotificationService.ShowSuccess("Coupons refreshed successfully.");else if(!auto){const reason=data.message||debug.failureReason||"Could not refresh coupons. Showing cached data.";console.warn("[Coupons] refresh failed reason:",reason);NotificationService.ShowWarning(reason);}}catch(error){console.error("[Coupons] cache updated: no");console.error("[Coupons] UI updated: no");console.error("[Coupons] refresh failed reason:",error.message);couponEl.source.textContent="ERROR";couponEl.source.className="couponSourceBadge error";couponEl.message.textContent=error.message;if(!auto)NotificationService.ShowError(error.message);}finally{couponState.autoRefreshing=false;if(!auto){couponEl.refresh.disabled=false;couponEl.refresh.textContent="Refresh Coupons";}}}
function saveCouponSettings(){clearTimeout(couponState.timer);couponState.timer=setTimeout(()=>bridgeCall("saveCouponSettings",{showAvailableOnly:couponState.activeTab==="available",showExpired:true,search:"",status:"all"}).catch(()=>{}),300);}
couponEl.sort?.addEventListener("change",()=>{couponState.page=0;renderCoupons();});
couponEl.rows?.addEventListener("click",event=>{const redeem=event.target.closest("[data-redeem-coupon]");if(redeem){const code=redeem.dataset.redeemCoupon;couponState.selectedCode=code;const next=!couponIsRedeemed(code);setCouponRedeemed(code,next);renderCoupons();NotificationService.ShowSuccess(`${code} marked as ${next?"redeemed":"not redeemed"}.`);return;}if(event.target.closest("[data-copy-coupon]"))return;const row=event.target.closest("[data-coupon-code]");if(row){const code=row.dataset.couponCode;if(couponState.selectedCode!==code)couponState.expandedRewardsCode="";couponState.selectedCode=code;renderCoupons();}});
couponEl.detail?.addEventListener("click",async event=>{if(event.target.closest(".couponDetailClose")){couponEl.detail.innerHTML='<div class="couponDetailEmpty">Select a coupon to see its details.</div>';return;}const rewardsToggle=event.target.closest("[data-coupon-rewards-toggle]");if(rewardsToggle){const key=couponCodeKey(rewardsToggle.dataset.couponRewardsToggle);couponState.expandedRewardsCode=couponState.expandedRewardsCode===key?"":key;const selected=couponState.coupons.find(c=>couponCodeKey(c.code)===key);if(selected)renderCouponDetail(selected);return;}const external=event.target.closest("[data-open-url]");if(external){try{await bridgeCall("openExternalUrl",{url:external.dataset.openUrl});}catch(error){NotificationService.ShowError(error.message||"Could not open link.");}return;}const button=event.target.closest("[data-copy-coupon]");if(!button)return;const code=button.dataset.copyCoupon;try{await navigator.clipboard.writeText(code);}catch{}NotificationService.ShowSuccess(`Copied ${code}`);});
couponEl.search?.addEventListener("input",()=>{couponState.page=0;renderCoupons();saveCouponSettings();});
couponEl.status?.addEventListener("change",()=>{couponState.page=0;renderCoupons();saveCouponSettings();});
couponEl.showExpired?.addEventListener("change",()=>{if(!couponEl.showExpired.checked&&couponState.activeTab==="expired"){couponState.activeTab="available";document.querySelectorAll("[data-coupon-tab]").forEach(b=>b.classList.toggle("active",b.dataset.couponTab==="available"));}couponState.page=0;renderCoupons();saveCouponSettings();});
couponEl.pagePrevious?.addEventListener("click",()=>{couponState.page=Math.max(0,couponState.page-1);renderCoupons();});
couponEl.pageNext?.addEventListener("click",()=>{couponState.page+=1;renderCoupons();});
couponEl.refresh?.addEventListener("click",()=>refreshCoupons());
document.querySelectorAll("[data-coupon-tab]").forEach(button=>button.addEventListener("click",()=>{couponState.activeTab=button.dataset.couponTab||"available";couponState.page=0;document.querySelectorAll("[data-coupon-tab]").forEach(x=>x.classList.toggle("active",x===button));renderCoupons();saveCouponSettings();}));
couponEl.rows?.addEventListener("click",async event=>{const button=event.target.closest("[data-copy-coupon]");if(!button)return;const code=button.dataset.copyCoupon;try{await navigator.clipboard.writeText(code);}catch{const input=document.createElement("textarea");input.value=code;document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();}NotificationService.ShowSuccess(`Copied ${code}`);});

const AP_LOWER_BRACKETS=[[100,139,5],[140,169,10],[170,183,15],[184,208,20],[209,234,30],[235,244,40],[245,248,48],[249,252,57],[253,256,69],[257,260,83],[261,264,101],[265,268,122],[269,272,137],[273,276,142],[277,280,148],[281,284,154],[285,288,160],[289,292,167],[293,296,174],[297,300,181],[301,304,188],[305,308,196],[309,315,200],[316,320,203],[321,327,205],[328,331,208],[332,336,211],[337,341,214],[342,346,217],[347,351,220],[352,357,223],[358,363,225],[364,368,227],[369,374,230],[375,380,233],[381,385,236],[386,391,239],[392,396,242]];
const DP_BRACKETS=[[203,210,1],[211,217,2],[218,225,3],[226,232,4],[233,240,5],[241,247,6],[248,255,7],[256,262,8],[263,270,9],[271,277,10],[278,285,11],[286,292,12],[293,300,13],[301,307,14],[308,314,15],[315,321,16],[322,328,17],[329,334,18],[335,340,19],[341,346,20],[347,352,21],[353,358,22],[359,364,23],[365,370,24],[371,376,25],[377,382,26],[383,388,27],[389,394,28],[395,400,29],[401,999,30]];
const DR_LOWER_BRACKETS=[[253,255,2],[256,258,4],[259,261,6],[262,264,8],[265,269,10],[270,274,12],[275,278,14],[279,282,16],[283,286,18],[287,289,20],[290,292,22],[293,295,24],[296,298,26],[299,301,28],[302,304,31],[305,307,35],[308,310,37],[311,313,40],[314,316,43],[317,320,46],[321,323,50],[324,325,51],[326,327,52],[328,329,53],[330,331,54],[332,333,55],[334,335,56],[336,337,57],[338,339,58],[340,341,59],[342,344,60],[345,347,61],[348,350,63],[351,356,64],[357,359,65],[360,362,66],[363,365,67],[366,368,68],[369,370,69],[371,373,70],[374,376,71],[377,379,72],[380,382,73],[383,386,74],[387,389,75],[390,391,76],[392,394,77],[395,399,78],[400,404,81],[405,409,82],[410,414,83],[415,419,84],[420,425,85],[426,439,86],[440,454,87],[455,475,88],[476,480,90]];
function bracketInteger(value){const parsed=Number(value);return Number.isFinite(parsed)?Math.floor(parsed):0}
function bracketLookup(data,value){const v=bracketInteger(value);if(v<=data[0][0])return data[0];if(v>=data[data.length-1][1])return data[data.length-1];return data.find(row=>v>=row[0]&&v<=row[1])||data[data.length-1]}
function bracketApBonus(value){const v=bracketInteger(value);return v>=397?245+(Math.floor((v-397)/2)*2):bracketLookup(AP_LOWER_BRACKETS,v)[2]}
function bracketMonsterAdditionalAp(value){const v=bracketInteger(value);if(v<310)return 0;if(v<=400)return(v-309)*8;return 728+((v-400)*16)}
function bracketDrBonus(value){const v=bracketInteger(value);return v>=481?91+Math.floor((v-481)/5):bracketLookup(DR_LOWER_BRACKETS,v)[2]}
const AP_HIGH_BRACKETS=Array.from({length:27},(_,index)=>{const start=397+(index*2);return[start,Math.min(start+1,450),bracketApBonus(start)]});
const DR_HIGH_BRACKETS=Array.from({length:11},(_,index)=>{const start=481+(index*5);return[start,Math.min(start+4,531),bracketDrBonus(start)]});
const AP_BRACKETS=[...AP_LOWER_BRACKETS,...AP_HIGH_BRACKETS],DR_BRACKETS=[...DR_LOWER_BRACKETS,...DR_HIGH_BRACKETS];
const bracketState={ready:false,type:"ap"},bracketEl={title:document.getElementById("bracketTitle"),current:document.getElementById("bracketCurrent"),goal:document.getElementById("bracketGoal"),currentLabel:document.getElementById("bracketCurrentLabel"),nextHint:document.getElementById("bracketNextHint"),requiredLabel:document.getElementById("bracketRequiredLabel"),required:document.getElementById("bracketRequired"),gainLabel:document.getElementById("bracketGainLabel"),gain:document.getElementById("bracketGain"),head:document.getElementById("bracketHead"),rows:document.getElementById("bracketRows")};
function bracketData(){return bracketState.type==="ap"?AP_BRACKETS:bracketState.type==="dp"?DP_BRACKETS:DR_BRACKETS}
function bracketUnit(){return bracketState.type==="ap"?"AP":"DP"}
function bracketFormulaRow(type,value){const v=bracketInteger(value);if(type==="ap"&&v>=397){const start=397+(Math.floor((v-397)/2)*2);return[start,start+1,bracketApBonus(v)]}if(type==="dr"&&v>=481){const start=481+(Math.floor((v-481)/5)*5);return[start,start+4,bracketDrBonus(v)]}return null}
function findBracket(value){
  const data=bracketData(),v=bracketInteger(value),formulaRow=bracketFormulaRow(bracketState.type,v);
  if(formulaRow)return formulaRow;
  if(v<=data[0][0])return data[0];
  if(v>=data[data.length-1][1])return data[data.length-1];
  return data.find(row=>v>=row[0]&&v<=row[1])||data[data.length-1];
}
function nextBracket(value){const v=bracketInteger(value),formulaRow=bracketFormulaRow(bracketState.type,v);return formulaRow?bracketFormulaRow(bracketState.type,formulaRow[1]+1):bracketData().find(row=>row[0]>v)}
function bracketMonsterRange(start,end){const first=bracketMonsterAdditionalAp(start),last=bracketMonsterAdditionalAp(end);return first===last?String(first):`${first}&ndash;${last}`}
function renderBrackets(){
  if(!bracketEl.rows)return;
  const type=bracketState.type,cur=bracketInteger(bracketEl.current.value),goal=bracketInteger(bracketEl.goal.value),data=bracketData(),curRow=findBracket(cur),goalRow=findBracket(goal),next=nextBracket(cur),unit=bracketUnit();
  bracketEl.title.textContent=`${type.toUpperCase()} Brackets`;
  bracketEl.currentLabel.textContent=type==="ap"?"Your AP":"Your DP";
  bracketEl.requiredLabel.textContent=`${unit} Required`;
  bracketEl.gainLabel.textContent=type==="ap"?"AP & Monster gain":"DP Gain";
  bracketEl.nextHint.textContent=next?`${unit} for next bracket: ${Math.max(0,next[0]-cur)} ${unit}`:"Highest bracket reached";
  bracketEl.required.textContent=`${Math.max(0,goal-cur)} ${unit}`;
  bracketEl.gain.textContent=type==="ap"?`${Math.max(0,bracketApBonus(goal)-bracketApBonus(cur))} AP & ${Math.max(0,bracketMonsterAdditionalAp(goal)-bracketMonsterAdditionalAp(cur))} Monster AP`:type==="dp"?`${Math.max(0,goal-cur)} DP & ${Math.max(0,goalRow[2]-curRow[2])}% dr`:`${Math.max(0,goal-cur)} DP & ${Math.max(0,bracketDrBonus(goal)-bracketDrBonus(cur))} dr`;
  bracketEl.head.innerHTML=type==="ap"?"<tr><th>AP</th><th>AP</th><th>Bonus AP</th><th>Bonus Diff.</th><th>Monster Additional AP</th><th>Total Attack AP</th></tr>":type==="dp"?"<tr><th>DP</th><th>DP</th><th>Bonus % DR</th><th>Difference</th></tr>":"<tr><th>DP</th><th>DP</th><th>Damage Reduction</th></tr>";
  bracketEl.rows.innerHTML=data.map((r,i)=>{const active=cur>=r[0]&&cur<=r[1],prev=i?data[i-1][2]:0,diff=r[2]-prev,range=Math.min(12,Math.max(1,r[1]-r[0]+1));return type==="ap"?`<tr class="${active?"active":""}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="bracketBar" style="width:${Math.min(130,Math.max(28,diff*6))}px">${diff}</span></td><td>${bracketMonsterRange(r[0],r[1])}</td><td><span class="bracketBar blue" style="width:${Math.min(150,Math.max(34,(r[1]+r[2])/5))}px">${r[1]+r[2]}</span></td></tr>`:type==="dp"?`<tr class="${active?"active":""}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]} %</td><td><span class="bracketBar" style="width:${Math.max(28,range*13)}px">${r[1]-r[0]+1}</span></td></tr>`:`<tr class="${active?"active":""}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`}).join("");
}
function initializeBrackets(){if(bracketState.ready)return;bracketState.ready=true;document.querySelectorAll("[data-bracket-tab]").forEach(b=>b.addEventListener("click",()=>{bracketState.type=b.dataset.bracketTab;document.querySelectorAll("[data-bracket-tab]").forEach(x=>x.classList.toggle("active",x===b));if(bracketState.type==="ap"){bracketEl.current.value=378;bracketEl.goal.value=381}else{bracketEl.current.value=300;bracketEl.goal.value=320}renderBrackets()}));document.querySelectorAll("[data-bracket-step]").forEach(b=>b.addEventListener("click",()=>{const [id,delta]=b.dataset.bracketStep.split(":");const input=id==="current"?bracketEl.current:bracketEl.goal;input.value=Number(input.value||0)+Number(delta);renderBrackets()}));[bracketEl.current,bracketEl.goal].forEach(x=>x?.addEventListener("input",renderBrackets));renderBrackets()}

const MASTERY_LEVELS=[...Array.from({length:41},(_,i)=>i*50),...Array.from({length:20},(_,i)=>2050+i*50)];
const masteryState={ready:false,skill:"gathering",transition:null,current:Number(readSetting("masteryCalcCurrent",1000)),goal:Number(readSetting("masteryCalcGoal",1250))};
const masteryEl={tabs:document.getElementById("masterySkillTabs"),stage:document.getElementById("masteryTableStage"),head:document.getElementById("masteryHead"),rows:document.getElementById("masteryRows"),info:document.getElementById("masteryInfo"),extra:document.getElementById("masteryExtra"),rarity:document.getElementById("masteryRarityStrip"),current:document.getElementById("masteryCurrentInput"),goal:document.getElementById("masteryGoalInput"),currentBracket:document.getElementById("masteryCurrentBracket"),nextBracket:document.getElementById("masteryNextBracket"),needed:document.getElementById("masteryNeeded"),bonusPreview:document.getElementById("masteryBonusPreview")};
const pct=(n,plus=false)=>`${plus&&n>0?"+":""}${Number(n).toFixed(2)}%`;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function masteryCurve(m,max,exp=1.45){return m<=2000?max*.8*Math.pow(m/2000,exp):max*.8+(max*.2*((m-2000)/1000))}
const processingRows=[[2,10],[20,11],[40,12],[60,13],[80,14],[100,15],[120,16],[140,17],[160,18],[180,19],[200,20],[220,21],[240,22],[260,23],[280,24],[300,25],[320,26],[340,27],[360,28],[380,29],[400,30],[420,31],[440,32],[460,33],[480,34],[500,35],[520,36],[540,37],[560,38],[580,39],[600,40],[620,41],[640,42],[660,43],[680,45],[700,47],[720,49],[740,51],[760,53],[780,57],[810,60],[840,64],[870,68],[900,72],[930,76],[960,80],[990,85],[1020,90],[1060,96],[1100,112],[1140,118],[1180,124],[1220,130],[1260,137],[1300,144],[1350,154],[1400,162],[1450,170],[1500,178],[1550,186],[1600,194],[1650,203],[1700,212],[1800,222],[1900,235],[2000,250],[2100,260],[2200,270],[2300,280],[2400,285],[2500,290],[2600,295],[2700,300],[2800,305],[2900,310],[3000,315]];
const MASTERY_CONFIG={
  gathering:{name:"Gathering",note:"Gathering mastery affects gathering item chances and amount increases.",columns:["Chance to get common item","Drop Amount Increase","Chance to get special items","Drop Amount Increase","Chance to get rare items","Drop Amount Increase","Chance to get very rare items","Drop Amount Increase"],rows:()=>MASTERY_LEVELS.map(m=>{const drop=masteryCurve(m,500,1.42),common=m<100?0:80;return [m,pct(common),pct(drop),pct(drop*.25),pct(drop*.125),pct(drop*.31),pct(drop*.104),pct(drop*.17),pct(drop*.064)]})},
  fishing:{name:"Fishing",note:"Fishing mastery affects prize catch rate and harpoon levels.",columns:["Prize Catch Fish Rate","Prize Catch Harpoon Level"],rows:()=>MASTERY_LEVELS.map(m=>[m,`+${pct(m<=2000?m/400:m/400+((m-2000)/1000)*1.25,false)}`,`+${Math.min(3,Math.floor((m+200)/500))}`])},
  hunting:{name:"Hunting",note:"Hunting mastery affects item grade chances and drop amount increases.",columns:["Chance to get common item","Drop Amount Increase","Chance to get special items","Drop Amount Increase","Chance to get rare items","Drop Amount Increase","Chance to get very rare items","Drop Amount Increase"],rows:()=>MASTERY_LEVELS.map(m=>{const drop=masteryCurve(m,400,1.36),common=m<100?0:80;return [m,pct(common),pct(drop),pct(drop*.5),pct(drop*.5),pct(drop*.62),pct(drop*.333),pct(drop*.36),pct(drop*.16)]})},
  alchemy:{name:"Alchemy",note:"Alchemy mastery affects production bonuses, mass production, and Imperial silver bonus.",columns:["Product Increase Amount","Chance to get common item","Chance to get special items","Chance to get rare items","Imperial Silver Bonus"],rows:()=>MASTERY_LEVELS.map(m=>[m,pct(masteryCurve(m,62.5,1.35)),pct(clamp(.25+masteryCurve(m,3.58,1.3),.25,3.83)),pct(clamp(.04+masteryCurve(m,2.94,1.4),.04,2.98)),pct(clamp(.01+masteryCurve(m,.35,1.5),.01,.36)),pct(imperialBonus(m))])},
  processing:{name:"Processing",note:"Processing mastery affects the material count used by mass processing.",columns:["Material Count"],rows:()=>processingRows},
  cooking:{name:"Cooking",note:"Cooking mastery affects production bonuses, mass cooking chance, and Imperial silver bonus.",columns:["Product Increase Amount","By Product Amount Increase","Rare Product Amount Increase","Mass Product Chance","Imperial Silver Bonus"],rows:()=>MASTERY_LEVELS.map(m=>[m,pct(masteryCurve(m,76.45,1.42)),pct(masteryCurve(m,76.45,1.42)),pct(masteryCurve(m,24.2,1.38)),pct(clamp(10+masteryCurve(m,90,1.22),0,100)),pct(imperialBonus(m))])},
  sailing:{name:"Sailing",note:"Sailing mastery affects ship control stats.",columns:["Accel.","Brake","Turn","Speed"],rows:()=>MASTERY_LEVELS.map(m=>{const v=m<=2000?m/100:m/200+10;return [m,pct(v),pct(v),pct(v),pct(v)]})},
  training:{name:"Training",note:"Training mastery affects capture rate, mount EXP, and breeding chance.",columns:["Capture Horse Rate","Mount Exp Gain","Breeding Chance"],rows:()=>MASTERY_LEVELS.map(m=>[m,pct(masteryCurve(m,43.75,1.45)),pct(masteryCurve(m,93.75,1.55)),pct(Math.floor(m/200)*1+(m>=50?1:0))])}
};
function imperialBonus(m){return m===0?0:m<=1250?clamp(1.85+Math.pow(m/1250,1.45)*94,0,95.84):clamp(95.84+((m-1250)/1750)*85.41,0,181.25)}
function masteryNumber(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?clamp(Math.round(parsed),0,3000):fallback}
function masteryRowsFor(config){return config.rows().map(row=>[Number(row[0]),...row.slice(1)]).filter(row=>Number.isFinite(row[0])).sort((a,b)=>a[0]-b[0])}
function masteryRowAt(rows,value){let match=rows[0]||null;for(const row of rows){if(row[0]<=value)match=row;else break;}return match}
function masteryNextRow(rows,value){return rows.find(row=>row[0]>value)||null}
function renderMasteryCalculator(){const config=MASTERY_CONFIG[masteryState.skill]||MASTERY_CONFIG.gathering;if(!masteryEl.current||!masteryEl.goal)return;const current=masteryNumber(masteryEl.current.value,masteryState.current),goal=masteryNumber(masteryEl.goal.value,masteryState.goal);masteryState.current=current;masteryState.goal=goal;if(String(current)!==masteryEl.current.value)masteryEl.current.value=String(current);if(String(goal)!==masteryEl.goal.value)masteryEl.goal.value=String(goal);persistSetting("masteryCalcCurrent",current);persistSetting("masteryCalcGoal",goal);const rows=masteryRowsFor(config),currentRow=masteryRowAt(rows,current),goalRow=masteryRowAt(rows,goal),next=masteryNextRow(rows,current);if(masteryEl.currentBracket)masteryEl.currentBracket.textContent=currentRow?`${currentRow[0]} ${config.name}`:"-";if(masteryEl.nextBracket)masteryEl.nextBracket.textContent=next?`${next[0]} (${next[0]-current} away)`:"Max reached";if(masteryEl.needed)masteryEl.needed.textContent=goal>current?`${goal-current} mastery`:"Goal reached";if(masteryEl.bonusPreview){const preview=goalRow||currentRow;const summary=config.columns.slice(0,Math.min(4,config.columns.length)).map((label,index)=>`<span><b>${escapeHtml(label)}</b>${escapeHtml(preview?.[index+1]??"-")}</span>`).join("");masteryEl.bonusPreview.innerHTML=`<strong>${escapeHtml(config.name)} goal preview</strong><div>${summary}</div>`}}
function renderMasteryBrackets(){const config=MASTERY_CONFIG[masteryState.skill]||MASTERY_CONFIG.gathering;if(!masteryEl.rows)return;masteryEl.info.textContent=config.note;masteryEl.info.classList.toggle("active",masteryEl.info.dataset.open==="true");masteryEl.rarity?.classList.toggle("active",masteryState.skill==="gathering");const dataColWidth=(92.8/config.columns.length).toFixed(4);masteryEl.head.innerHTML=`<colgroup><col class="masteryFirstCol">${config.columns.map(()=>`<col style="width:${dataColWidth}%">`).join("")}</colgroup><tr><th>Mastery</th>${config.columns.map(c=>`<th>${c}</th>`).join("")}</tr>`;masteryEl.rows.innerHTML=config.rows().map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join("")}</tr>`).join("");renderMasteryCalculator()}
function switchMasterySkill(skill){if(!MASTERY_CONFIG[skill]||skill===masteryState.skill)return;masteryState.skill=skill;document.querySelectorAll("[data-mastery-skill]").forEach(b=>b.classList.toggle("active",b.dataset.masterySkill===skill));clearTimeout(masteryState.transition);masteryEl.stage?.classList.add("fading");masteryState.transition=setTimeout(()=>{renderMasteryBrackets();masteryEl.stage?.classList.remove("fading");},220)}
function initializeMasteryBrackets(){if(masteryState.ready)return;masteryState.ready=true;if(masteryEl.current)masteryEl.current.value=String(masteryNumber(masteryState.current,1000));if(masteryEl.goal)masteryEl.goal.value=String(masteryNumber(masteryState.goal,1250));masteryEl.tabs?.addEventListener("click",event=>{const button=event.target.closest("[data-mastery-skill]");if(button)switchMasterySkill(button.dataset.masterySkill)});[masteryEl.current,masteryEl.goal].forEach(input=>input?.addEventListener("input",renderMasteryCalculator));masteryEl.extra?.addEventListener("click",()=>{masteryEl.info.dataset.open=masteryEl.info.dataset.open==="true"?"false":"true";renderMasteryBrackets()});renderMasteryBrackets()}

const LIGHTSTONE_SETS=[{"type":"combat","category":"Accuracy","name":"Focused","effects":["All Accuracy +12"],"lightstones":["Fire: Marked","Fire: Marked","Fire: Marked","Fire: Marked"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Accuracy","name":"Silent Rage","effects":["All Accuracy +9"],"lightstones":["Fire: Marked","Fire: Marked","Fire: Marked","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"AP","name":"I\u0027m Mad!","effects":["All AP +6"],"lightstones":["Fire: Rage","Fire: Rage","Fire: Rage","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"AP","name":"Savage","effects":["All AP +9"],"lightstones":["Fire: Rage","Fire: Rage","Fire: Rage","Fire: Rage"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"AP","name":"The Wild","effects":["Extra AP Against Monsters +9"],"lightstones":["Fire: Predation","Fire: Predation","Fire: Predation","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"AP","name":"The Wild: Demihumans","effects":["Extra Damage to Demihumans +15"],"lightstones":["Fire: Roar","Fire: Roar","Fire: Roar","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"AP","name":"The Wild: Edania","effects":["Extra AP Against Edanian Monsters +15"],"lightstones":["Fire: Twisted","Fire: Twisted","Fire: Twisted","Iridescent Lightstone"],"source":"Official NA/EU Edania patch note"},{"type":"combat","category":"AP","name":"The Wild: Humans","effects":["Extra AP Against Humans: +12","Extra AP Against Adventurers +12"],"lightstones":["Fire: Blight","Fire: Blight","Fire: Blight","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"AP","name":"The Wild: Kamasylvia","effects":["Extra Damage to Kamasylvian Monsters +15"],"lightstones":["Fire: Fallen","Fire: Fallen","Fire: Fallen","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Damage","name":"Crocodile\u0027s Tooth","effects":["Extra AP Against Monsters +7","Down Attack Damage +5%","Critical Hit Damage +2%"],"lightstones":["Fire: Predation","Fire: Predation","Fire: Ground","Fire: Strike"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Damage","name":"Deathblow","effects":["Extra AP Against Monsters +10","Critical Hit Rate +10%"],"lightstones":["Fire: Predation","Fire: Predation","Fire: Blade","Fire: Blade"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Damage","name":"Exceed","effects":["Self-obtainable Black Spirit\u0027s Rage +20%"],"lightstones":["Fire: Earthquake","Fire: Frenzy","Wind: Mind","Iridescent Lightstone"],"source":"Official Asia Adventurer\u0027s Guide"},{"type":"combat","category":"Damage","name":"Fast \u0026 Ragious","effects":["Black Spirit\u0027s Rage Recovery +1% every 10 sec"],"lightstones":["Earth: Mountain","Earth: Mountain","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Damage","name":"Vicious Shadows","effects":["Extra AP Against Monsters +7","Back Attack Damage +5%","Critical Hit Damage +2%"],"lightstones":["Fire: Predation","Fire: Predation","Fire: Shadows","Fire: Strike"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"All-Out-Attack","effects":["All Damage Reduction -15","All Evasion -25","All AP +20","Critical Hit Damage +3%"],"lightstones":["Fire: Rage","Fire: Rage","Fire: Strike","Fire: Strike"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Blurr","effects":["All Resistance -80%","All Damage Reduction +20","All Evasion +40"],"lightstones":["Earth: Iron Wall","Earth: Waves","Wind: Mind","Iridescent Lightstone"],"source":"Official Asia Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Boulder","effects":["Monster Damage Reduction +10","Debuff Resistance Against Monsters +50%"],"lightstones":["Earth: Fitted","Earth: Fitted","Earth: Mountain","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Centaurus","effects":["All Evasion +24"],"lightstones":["Earth: Waves","Earth: Waves","Earth: Waves","Earth: Waves"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Expose Weakness","effects":["All Damage Reduction -15","All Evasion -25","All Accuracy +30","Back Attack Damage +3%"],"lightstones":["Fire: Marked","Fire: Marked","Fire: Shadows","Fire: Shadows"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Fasting","effects":["Max HP -200","All Damage Reduction +5","Max MP/WP/SP +850"],"lightstones":["Earth: Iron Wall","Earth: Iron Wall","Wind: Mind","Wind: Mind"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Flying Marksmen","effects":["All Damage Reduction -15","All Evasion -25","All Accuracy +30","Air Attack Damage +3%"],"lightstones":["Fire: Marked","Fire: Marked","Fire: Aerial","Fire: Aerial"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Impregnable Fortress","effects":["Monster Damage Reduction +20","Damage from Monsters -3%"],"lightstones":["Earth: Veil","Earth: Veil","Earth: Veil","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Last Gatekeeper","effects":["All Damage Reduction +15","All Evasion +27","Max HP +150","Knockback/Floating Resistance +8%"],"lightstones":["Earth: Iron Wall","Earth: Waves","Wind: Heart","Earth: Roots"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Light-Footed","effects":["All Evasion +18"],"lightstones":["Earth: Waves","Earth: Waves","Earth: Waves","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Maiming","effects":["All Damage Reduction -15","All Evasion -25","All Accuracy +30","Critical Hit Damage +3%"],"lightstones":["Fire: Marked","Fire: Marked","Fire: Strike","Fire: Strike"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Merciless","effects":["All Damage Reduction -15","All Evasion -25","All AP +20","Down Attack Damage +3%"],"lightstones":["Fire: Rage","Fire: Rage","Fire: Ground","Fire: Ground"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Mind Focus","effects":["All Damage Reduction +15","All Evasion +30","Max MP/WP/SP +700","All Resistance +3%"],"lightstones":["Wind: Mind","Wind: Mind","Wind: Mind","Wind: Mind"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Olun\u0027s Descendant","effects":["All Damage Reduction +15","All Evasion +27","Max HP +150","All Resistance +3%"],"lightstones":["Earth: Iron Wall","Earth: Waves","Wind: Heart","Earth: Mountain"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Predation","effects":["All Damage Reduction +15","All Evasion +27","Max HP +150","Grapple Resistance +8%"],"lightstones":["Earth: Iron Wall","Earth: Waves","Wind: Heart","Earth: Sand"],"source":"Official Asia Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Protection","effects":["All Damage Reduction -50","Siege Weapon Damage Resistance +30%"],"lightstones":["Earth: Roots","Earth: Boulder","Earth: Swamp","Wind: Mind"],"source":"Official Asia Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Raised from the Dead","effects":["All Damage Reduction -15","All Evasion -25","All AP +20","Air Attack Damage +3%"],"lightstones":["Fire: Rage","Fire: Rage","Fire: Aerial","Fire: Aerial"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Reinforcing the Vanguard","effects":["Max HP +100","Monster Damage Reduction +15","Damage from Monsters -2%"],"lightstones":["Wind: Heart","Wind: Heart","Earth: Veil","Earth: Veil"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Rigid Shield","effects":["All Damage Reduction +18"],"lightstones":["Earth: Iron Wall","Earth: Iron Wall","Earth: Iron Wall","Earth: Iron Wall"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Self-Defense","effects":["All Damage Reduction +6","All Evasion +9","Max HP +50"],"lightstones":["Earth: Iron Wall","Earth: Waves","Wind: Heart","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Shell","effects":["All Damage Reduction +12"],"lightstones":["Earth: Iron Wall","Earth: Iron Wall","Earth: Iron Wall","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Steel Heart","effects":["Max HP +250"],"lightstones":["Wind: Heart","Wind: Heart","Wind: Heart","Wind: Heart"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Steel Shield","effects":["All Damage Reduction +12","All Evasion +18"],"lightstones":["Earth: Iron Wall","Earth: Iron Wall","Earth: Waves","Earth: Waves"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Sweep","effects":["All Damage Reduction -15","All Evasion -25","All Accuracy +30","Down Attack Damage +3%"],"lightstones":["Fire: Marked","Fire: Marked","Fire: Ground","Fire: Ground"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Veteran","effects":["All Damage Reduction +15","All Evasion +27","Max HP +150","Stun/Stiffness/Freezing Resistance +8%"],"lightstones":["Earth: Iron Wall","Earth: Waves","Wind: Heart","Earth: Swamp"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Warrior Bloodline","effects":["All Damage Reduction +15","All Evasion +27","Max HP +150","Knockdown/Bound Resistance +8%"],"lightstones":["Earth: Iron Wall","Earth: Waves","Wind: Heart","Earth: Boulder"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Watch Your Back","effects":["All Damage Reduction -15","All Evasion -25","All AP +20","Back Attack Damage +3%"],"lightstones":["Fire: Rage","Fire: Rage","Fire: Shadows","Fire: Shadows"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Defense","name":"Water of Life","effects":["Max HP +150"],"lightstones":["Wind: Heart","Wind: Heart","Wind: Heart","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Annihilating Shadows","effects":["Combat EXP +100%","Skill EXP +20%","Extra AP Against Humans: +9","Extra AP Against Adventurers +9"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Blight","Fire: Blight"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Battle Aid","effects":["Combat EXP +50%","Skill EXP +10%","Monster Damage Reduction +10"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Earth: Fitted","Earth: Fitted"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Building the Vanguard","effects":["Combat EXP +50%","Skill EXP +10%","Monster Damage Reduction +5"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Earth: Fitted","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Clearing Ranks","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +5","Extra Damage to Demihumans +4"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Predation","Fire: Roar"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Clearing Shadows","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +5","Extra AP Against Humans: +3","Extra AP Against Adventurers +3"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Predation","Fire: Blight"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Dedication","effects":["Combat EXP +300%"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Combat)","Wind: Alert (Combat)","Wind: Alert (Combat)"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Drills: Blight-Fallen","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra AP Against Humans: +3","Extra AP Against Adventurers +3","Extra Damage to Kamasylvian Monsters +4"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Blight","Fire: Fallen"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Drills: Blight-Roar","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra AP Against Humans: +3","Extra AP Against Adventurers +3","Extra Damage to Demihumans +4"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Blight","Fire: Roar"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Drills: Fallen-Roar","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra Damage to Kamasylvian Monsters +4","Extra Damage to Demihumans +4"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Roar","Fire: Fallen"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Establishing Order","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra Damage to Demihumans +4"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Roar","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Goddess\u0027 Aide","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +5","Extra Damage to Kamasylvian Monsters +4"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Predation","Fire: Fallen"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Goddess\u0027 Blessing","effects":["Combat EXP +100%","Skill EXP +20%","Extra Damage to Kamasylvian Monsters +11"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Fallen","Fire: Fallen"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Goddess\u0027 Song","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra Damage to Kamasylvian Monsters +4"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Fallen","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Hunting Beasts","effects":["Combat EXP +100%","Skill EXP +20%","Extra Damage to Demihumans +11"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Roar","Fire: Roar"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Inner Peace","effects":["Combat EXP +100%","Skill EXP +20%","Monster Damage Reduction +15","Damage from Monsters -2%"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Earth: Veil","Earth: Veil"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Judging Evil","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra AP Against Humans: +3","Extra AP Against Adventurers +3"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Blight","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Organizing Ranks","effects":["Combat EXP +50%","Skill EXP +10%","Monster Damage Reduction +10","Damage from Monsters -1%"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Earth: Fitted","Earth: Veil"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Prayer for Victory","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +1"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Predation","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Progress","effects":["Combat EXP +175%","Skill EXP +30%"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Combat)","Wind: Alert (Skill)","Wind: Alert (Skill)"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Training","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +1","Monster Damage Reduction +5"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Predation","Earth: Fitted"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Training: Demihumans","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra Damage to Demihumans +4","Monster Damage Reduction +5"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Roar","Earth: Fitted"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Training: Humans","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra AP Against Adventurers +3","Monster Damage Reduction +5"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Blight","Earth: Fitted"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Training: Kamasylvia","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +3","Extra Damage to Kamasylvian Monsters +4","Monster Damage Reduction +5"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Fallen","Earth: Fitted"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Way of the Fighter","effects":["Skill EXP +50%"],"lightstones":["Wind: Alert (Skill)","Wind: Alert (Skill)","Wind: Alert (Skill)","Wind: Alert (Skill)"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Well-prepared","effects":["Combat EXP +50%","Skill EXP +10%","Extra AP Against Monsters +2"],"lightstones":["Wind: Alert (Combat)","Wind: Alert (Skill)","Fire: Predation","Fire: Predation"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Leveling","name":"Wondrous Journey","effects":["Combat EXP +150%","Skill EXP +30%","Max Stamina +100","Chance to Gain Knowledge +20%","Weight Limit +70LT"],"lightstones":["Wind: Lungs","Wind: Lungs","Wind: Alert (Combat)","Wind: Alert (Skill)"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Behind the Shadow","effects":["All AP +8","All Accuracy +12","Max Stamina +75","Back Attack Damage +5%"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Fire: Shadows"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Blacksmith\u0027s Blessing","effects":["Extra AP Against Monsters +5","Monster Damage Reduction +5","Gear Durability Reduction Resistance +30%"],"lightstones":["Fire: Predation","Earth: Fitted","Wind: Feather","Wind: Fortune"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Choice \u0026 Focus","effects":["All AP -150","Item Drop Rate +30%","Movement Speed +2%"],"lightstones":["Fire: Rush","Wind: Feather","Wind: Fortune","Wind: Fortune"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Emergency Landing","effects":["Fall Damage -50%","Movement Speed +2%"],"lightstones":["Fire: Rush","Fire: Rush","Wind: Feather","Wind: Fortune"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Enhanced Focus","effects":["All AP +5","All Accuracy +16","Max Stamina +50"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Fire: Marked"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Flying Kick","effects":["All AP +8","All Accuracy +12","Max Stamina +75","Air Attack Damage +5%"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Fire: Aerial"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Golden Hand","effects":["Item Drop Rate +15%","Weight Limit +25LT"],"lightstones":["Wind: Feather","Wind: Feather","Wind: Fortune","Wind: Fortune"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Improved Breathing","effects":["All AP +5","All Accuracy +8","Max Stamina +100"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Wind: Lungs"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Know-It-All","effects":["Chance to Gain Knowledge +30%","Chance to Gain Higher-grade Knowledge +5%"],"lightstones":["Fire: Zeal","Fire: Claws","Wind: Feather","Wind: Fortune"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Lost Angel Wings","effects":["Karma Recovery +50%","Movement Speed +2%"],"lightstones":["Fire: Zeal","Fire: Claws","Fire: Rush","Wind: Fortune"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Marathon","effects":["Max Stamina +150"],"lightstones":["Wind: Lungs","Wind: Lungs","Wind: Lungs","Wind: Lungs"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Panting","effects":["Max HP -500","All Evasion +5","Max Stamina +250"],"lightstones":["Wind: Lungs","Wind: Lungs","Earth: Waves","Wind: Mind"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Skill Master","effects":["All AP +8","All Accuracy +12","Max Stamina +75","Extra All Special Attack Damage +2%"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Fire: Frenzy"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Sprint","effects":["Max Stamina +100"],"lightstones":["Wind: Lungs","Wind: Lungs","Wind: Lungs","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Stomping","effects":["All AP +8","All Accuracy +12","Max Stamina +75","Down Attack Damage +5%"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Fire: Ground"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Take Off!","effects":["Jump Height +50","Movement Speed +2%"],"lightstones":["Fire: Rush","Fire: Rush","Wind: Feather","Wind: Feather"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Target Openings","effects":["All AP +8","All Accuracy +12","Max Stamina +75","Critical Hit Damage +5%"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Fire: Strike"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Trained","effects":["Weight Limit +70LT"],"lightstones":["Wind: Feather","Wind: Feather","Wind: Feather","Wind: Feather"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Trained Fists","effects":["All AP +10","All Accuracy +8","Max Stamina +50"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","Fire: Rage"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"combat","category":"Utility","name":"Trainee","effects":["All AP +3","All Accuracy +5","Max Stamina +30"],"lightstones":["Fire: Rage","Fire: Marked","Wind: Lungs","-"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"A Fragment of a Star, a Spoonful of the Moon","effects":["Alchemy Time -2 sec","Alchemy EXP +10%","Alchemy Mastery +20","Weight Limit +30LT"],"lightstones":["Flora: Time","Flora: Malleable","Wind: Feather","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"Ancient\u0027s Alchemy","effects":["Alchemy EXP +5%"],"lightstones":["Flora: Time","Flora: Time","Flora: Time"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"Choice \u0026 Focus: Alchemy","effects":["Alchemy Mastery -500","Alchemy EXP +35%"],"lightstones":["Flora: Time","Flora: Time","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"Collector of Shattered Stars","effects":["Alchemy EXP +8%"],"lightstones":["Flora: Time","Flora: Time","Flora: Time","Flora: Time"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"Dreamer","effects":["Alchemy Mastery +15"],"lightstones":["Flora: Malleable","Flora: Malleable","Flora: Malleable","Flora: Malleable"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"Imperial Alchemist","effects":["Alchemy Mastery +30"],"lightstones":["Flora: Malleable","Flora: Malleable","Flora: Malleable","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"Mysterious Alchemist","effects":["Alchemy EXP +16%"],"lightstones":["Flora: Time","Flora: Time","Flora: Time","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Alchemy","name":"New Reagent","effects":["Alchemy Mastery +8"],"lightstones":["Flora: Malleable","Flora: Malleable","Flora: Malleable"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Barter","name":"Barter Scholar","effects":["Barter EXP +8%"],"lightstones":["Flora: Haggler","Flora: Haggler","Flora: Haggler","Flora: Haggler"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Barter","name":"Master Negotiator","effects":["Barter EXP +16%"],"lightstones":["Flora: Haggler","Flora: Haggler","Flora: Haggler","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Barter","name":"Scale Owner","effects":["Barter EXP +5%"],"lightstones":["Flora: Haggler","Flora: Haggler","Flora: Haggler"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Best Cooking-ever","effects":["Cooking Mastery +15"],"lightstones":["Flora: Stir","Flora: Stir","Flora: Stir","Flora: Stir"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Choice \u0026 Focus: Cooking","effects":["Cooking Mastery -500","Cooking EXP +35%"],"lightstones":["Flora: Secret","Flora: Secret","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Excellent Chef","effects":["Cooking EXP +16%"],"lightstones":["Flora: Secret","Flora: Secret","Flora: Secret","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Feast of Flavors","effects":["Cooking Mastery +8"],"lightstones":["Flora: Stir","Flora: Stir","Flora: Stir"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Fundamentals of Cooking","effects":["Cooking Time -2 sec","Cooking EXP +10%","Cooking Mastery +20","Weight Limit +30LT"],"lightstones":["Flora: Secret","Flora: Stir","Wind: Feather","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Great Chef","effects":["Cooking EXP +8%"],"lightstones":["Flora: Secret","Flora: Secret","Flora: Secret","Flora: Secret"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Imperial Chef","effects":["Cooking Mastery +30"],"lightstones":["Flora: Stir","Flora: Stir","Flora: Stir","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Cooking","name":"Witch\u0027s Cauldron","effects":["Cooking EXP +5%"],"lightstones":["Flora: Secret","Flora: Secret","Flora: Secret"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Farming","name":"Cultivation","effects":["Farming EXP +8%"],"lightstones":["Flora: Harvest","Flora: Harvest","Flora: Harvest","Flora: Harvest"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Farming","name":"Fruit of Waiting","effects":["Farming EXP +5%"],"lightstones":["Flora: Harvest","Flora: Harvest","Flora: Harvest"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Farming","name":"Magical Soil","effects":["Farming EXP +16%"],"lightstones":["Flora: Harvest","Flora: Harvest","Flora: Harvest","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Best Stance","effects":["Fishing EXP +5%"],"lightstones":["Flora: Bite","Flora: Bite","Flora: Bite"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Big Catch","effects":["Fishing EXP +8%"],"lightstones":["Flora: Bite","Flora: Bite","Flora: Bite","Flora: Bite"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Choice \u0026 Focus: Fishing","effects":["Fishing Mastery -500","Fishing EXP +35%"],"lightstones":["Flora: Bite","Flora: Bite","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Dancing Fish","effects":["Fishing Mastery +15"],"lightstones":["Flora: Patience","Flora: Patience","Flora: Patience","Flora: Patience"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Fisher\u0027s Secrets","effects":["Fishing Mastery +30"],"lightstones":["Flora: Patience","Flora: Patience","Flora: Patience","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Nibbles","effects":["Auto-fishing Time -15%","Fishing EXP +10%","Fishing Mastery +20","Fishing +1"],"lightstones":["Flora: Bite","Flora: Patience","Wind: Lungs","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Reflexes","effects":["Fishing Mastery +8"],"lightstones":["Flora: Patience","Flora: Patience","Flora: Patience"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Seasoned Fisher","effects":["Fishing EXP +16%"],"lightstones":["Flora: Bite","Flora: Bite","Flora: Bite","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Sharp-eyed Seagull","effects":["Chance to Catch Rare Fish +5% Fishing EXP +10%","Fishing Mastery +20","Fishing +1"],"lightstones":["Flora: Bite","Flora: Patience","Wind: Fortune","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Fishing","name":"Whaling","effects":["Chance to Catch High-Quality Fish +6%","Fishing EXP +10%","Fishing Mastery +20","Fishing +1"],"lightstones":["Flora: Bite","Flora: Patience","Wind: Feather","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Choice \u0026 Focus: Gathering","effects":["Gathering Mastery -500","Gathering EXP +35%"],"lightstones":["Flora: Plains","Flora: Plains","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Curious","effects":["Gathering EXP +5%"],"lightstones":["Flora: Plains","Flora: Plains","Flora: Plains"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Four-leaf Clover","effects":["Gathering Mastery +8"],"lightstones":["Flora: Forest","Flora: Forest","Flora: Forest"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Friend of Fairies","effects":["Gathering EXP +8%"],"lightstones":["Flora: Plains","Flora: Plains","Flora: Plains","Flora: Plains"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Nature-lover","effects":["Gathering Mastery +30"],"lightstones":["Flora: Forest","Flora: Forest","Flora: Forest","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Pluck","effects":["Gathering EXP +16%"],"lightstones":["Flora: Plains","Flora: Plains","Flora: Plains","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Scurrying Weasel","effects":["Gathering Item Drop Rate +5%","Gathering EXP +10%","Gathering Mastery +20","Movement Speed +3%","Gathering +1"],"lightstones":["Flora: Plains","Flora: Forest","Fire: Rush","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Spirit\u0027s Echo","effects":["Gathering Mastery +15"],"lightstones":["Flora: Forest","Flora: Forest","Flora: Forest","Flora: Forest"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Gathering","name":"Yawning Hedgehog","effects":["Gathering Item Drop Rate +10%","Gathering EXP +10%","Gathering Mastery +20","Gathering +1","Energy Recovery +1"],"lightstones":["Flora: Plains","Flora: Forest","Wind: Fortune","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Blink of an Eye","effects":["Matchlock Reload Speed +10% Hunting EXP +10%","Hunting Mastery +20","Attack Speed +1","Critical Hit +2"],"lightstones":["Flora: Trap","Flora: Track","Fire: Zeal","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Canine Tooth","effects":["Critical Hit Rate +8%","Hunting EXP +10%","Hunting Mastery +20","Attack Speed +2","Critical Hit +1"],"lightstones":["Flora: Trap","Flora: Track","Fire: Claws","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Choice \u0026 Focus: Hunting","effects":["Hunting Mastery -500","Hunting EXP +35%"],"lightstones":["Flora: Trap","Flora: Trap","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Closed Snare","effects":["Hunting Mastery +15"],"lightstones":["Flora: Track","Flora: Track","Flora: Track","Flora: Track"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Crouching Predator","effects":["Hunting EXP +7%","Hunting Mastery +15","Attack Speed +1","Critical Hit +1"],"lightstones":["Flora: Trap","Flora: Track","Fire: Zeal","Fire: Claws"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Eye of a Hawk","effects":["Hunting EXP +8%"],"lightstones":["Flora: Trap","Flora: Trap","Flora: Trap","Flora: Trap"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"First Shot of Dawn","effects":["Hunting Mastery +8"],"lightstones":["Flora: Track","Flora: Track","Flora: Track"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Hunter\u0027s Instinct","effects":["Hunting EXP +16%"],"lightstones":["Flora: Trap","Flora: Trap","Flora: Trap","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Legendary Marksman","effects":["Hunting Mastery +30"],"lightstones":["Flora: Track","Flora: Track","Flora: Track","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Hunting","name":"Sculpture","effects":["Hunting EXP +5%"],"lightstones":["Flora: Trap","Flora: Trap","Flora: Trap"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Life EXP","name":"Delotia","effects":["Life EXP +17%"],"lightstones":["Flora: Wildlife","Flora: Wildlife","Wind: Fortune","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Life Mastery","name":"Fortress of Nature","effects":["Life EXP +12%","Life Skill Mastery +20"],"lightstones":["Flora: Wildlife","Flora: Paradise","Wind: Fortune","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Life Mastery","name":"Hand of Manos","effects":["Life Skill Mastery +30"],"lightstones":["Flora: Paradise","Flora: Paradise","Wind: Fortune","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Lifeskill","name":"Horses Over Flowers","effects":["Mount EXP +25%"],"lightstones":["Flora: Gallop","Flora: Steed","Flora: Steed","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Lifeskill","name":"Refreshing Dream","effects":["Energy Recovery +2"],"lightstones":["Flora: Plains","Flora: Trap","Flora: Harvest","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Choice \u0026 Focus: Processing","effects":["Processing Mastery -500","Processing EXP +35%"],"lightstones":["Flora: Tool","Flora: Tool","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Clang! Clang!","effects":["Processing Success Rate +20%","Processing EXP +10%","Processing Mastery +20","Weight Limit +30LT"],"lightstones":["Flora: Tool","Flora: Deft","Wind: Feather","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Deep Footprints","effects":["Processing Mastery +15"],"lightstones":["Flora: Deft","Flora: Deft","Flora: Deft","Flora: Deft"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Humming in the Workshop","effects":["Processing Mastery +8"],"lightstones":["Flora: Deft","Flora: Deft","Flora: Deft"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Multi-purpose","effects":["Processing Mastery +30"],"lightstones":["Flora: Deft","Flora: Deft","Flora: Deft","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Processed Hand","effects":["Processing EXP +16%"],"lightstones":["Flora: Tool","Flora: Tool","Flora: Tool","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Raising Power","effects":["Processing EXP +8%"],"lightstones":["Flora: Tool","Flora: Tool","Flora: Tool","Flora: Tool"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Processing","name":"Skillful Hands","effects":["Processing EXP +5%"],"lightstones":["Flora: Tool","Flora: Tool","Flora: Tool"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"Chasing the Sunset","effects":["Sailing EXP +16%"],"lightstones":["Flora: Uncharted","Flora: Uncharted","Flora: Uncharted","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"Choice \u0026 Focus: Sailing","effects":["Sailing Mastery -500","Sailing EXP +35%"],"lightstones":["Flora: Uncharted","Flora: Uncharted","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"Ocean\u0027s Embrace","effects":["Mermaid\u0027s Wish III","Sailing EXP +10%","Barter EXP +10%","Sailing Mastery +45"],"lightstones":["Flora: Uncharted","Flora: Haggler","Flora: Blue","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"Over the Horizon","effects":["Sailing EXP +8%"],"lightstones":["Flora: Uncharted","Flora: Uncharted","Flora: Uncharted","Flora: Uncharted"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"Rusty Anchor","effects":["Sailing Mastery +15"],"lightstones":["Flora: Blue","Flora: Blue","Flora: Blue","Flora: Blue"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"Sailor\u0027s Muscle","effects":["Sailing Mastery +8"],"lightstones":["Flora: Blue","Flora: Blue","Flora: Blue"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"Swaying Helmsman","effects":["Sailing EXP +5%"],"lightstones":["Flora: Uncharted","Flora: Uncharted","Flora: Uncharted"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Sailing","name":"The Great Tide","effects":["Sailing Mastery +30"],"lightstones":["Flora: Blue","Flora: Blue","Flora: Blue","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Trading","name":"Quick-witted","effects":["Trading EXP +8%"],"lightstones":["Flora: Wagon","Flora: Wagon","Flora: Wagon","Flora: Wagon"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Trading","name":"The Cycle","effects":["Trading EXP +16%"],"lightstones":["Flora: Wagon","Flora: Wagon","Flora: Wagon","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Trading","name":"Trader","effects":["Trading EXP +5%"],"lightstones":["Flora: Wagon","Flora: Wagon","Flora: Wagon"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Choice \u0026 Focus: Training","effects":["Training Mastery -500","Training EXP +35%"],"lightstones":["Flora: Gallop","Flora: Gallop","Wind: Mind","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Commune","effects":["Training EXP +5%"],"lightstones":["Flora: Gallop","Flora: Gallop","Flora: Gallop"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Golden Mane","effects":["Training Mastery +15"],"lightstones":["Flora: Steed","Flora: Steed","Flora: Steed","Flora: Steed"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Gone with the Wind","effects":["Mount EXP +5%","Training EXP +5%","Training Mastery +10"],"lightstones":["Flora: Gallop","Flora: Gallop","Flora: Steed","Flora: Steed"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Grand Prix Glory","effects":["Training Mastery +30"],"lightstones":["Flora: Steed","Flora: Steed","Flora: Steed","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Into the Sunset","effects":["Mount EXP +15%","Training EXP +10%","Training Mastery +20"],"lightstones":["Flora: Gallop","Flora: Gallop","Flora: Steed","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Light Trot","effects":["Training EXP +8%"],"lightstones":["Flora: Gallop","Flora: Gallop","Flora: Gallop","Flora: Gallop"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Lucky Crop","effects":["Training EXP +16%"],"lightstones":["Flora: Gallop","Flora: Gallop","Flora: Gallop","Iridescent Lightstone"],"source":"Official NA/EU Adventurer\u0027s Guide"},{"type":"lifeskill","category":"Training","name":"Rising Trainer","effects":["Training Mastery +8"],"lightstones":["Flora: Steed","Flora: Steed","Flora: Steed"],"source":"Official NA/EU Adventurer\u0027s Guide"}];
const lightstoneState={ready:false,type:null,transition:null,search:"",category:"",amplified:false};
const lightstoneEl={chooser:document.getElementById("lightstoneChooser"),stage:document.getElementById("lightstoneStage"),title:document.getElementById("lightstoneStageTitle"),subtitle:document.getElementById("lightstoneStageSubtitle"),grid:document.getElementById("lightstoneSetGrid"),pill:document.getElementById("lightstoneModePill"),search:document.getElementById("lightstoneSearch"),category:document.getElementById("lightstoneCategoryFilter"),summary:document.getElementById("lightstoneSummary"),amplified:document.getElementById("lightstoneAmplifiedToggle")};
const lightstoneSetsByType=new Map(["combat","lifeskill"].map(type=>[type,LIGHTSTONE_SETS.filter(set=>set.type===type).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name))]));
const lightstoneSearchIndex=new WeakMap();
const AMPLIFIED_LIGHTSTONE_EFFECTS={"Fire: Rage":"All AP +4","Fire: Marked":"All Accuracy +8","Fire: Predation":"Extra AP Against Monsters +5","Fire: Blight":"Extra AP Against Adventurers +6, Extra AP Against Humans +6","Fire: Roar":"Extra AP Against Demihumans +7","Fire: Fallen":"Extra AP Against Kamasylvian Monsters +7","Fire: Frenzy":"All Special Attack Extra Damage +1%","Fire: Ground":"Down Attack Damage +1.5%","Fire: Aerial":"Air Attack Damage +1.5%","Fire: Shadows":"Back Attack Damage +1.5%","Fire: Strike":"Critical Hit Damage +1.5%","Fire: Zeal":"Attack/Casting Speed +2","Fire: Rush":"Movement Speed +2","Fire: Claws":"Critical Hit +2","Fire: Blade":"Critical Hit Rate +3%","Fire: Twisted":"Extra AP Against Edanian Monsters +7","Earth: Iron Wall":"All Damage Reduction +5","Earth: Waves":"All Evasion +10","Earth: Fitted":"Monster Damage Reduction +7","Earth: Veil":"Monster Damage Reduction Rate +1.5%","Earth: Mountain":"All Resistance +2%","Earth: Swamp":"Stun/Stiffness/Freezing Resistance +4%","Earth: Boulder":"Knockdown/Bound Resistance +4%","Earth: Roots":"Knockback/Floating Resistance +4%","Wind: Heart":"Max HP +100","Wind: Mind":"Max MP/WP/SP +100","Wind: Lungs":"Max Stamina +50","Wind: Alert (Combat)":"Combat EXP +50%","Wind: Alert (Skill)":"Skill EXP +25%","Wind: Feather":"Weight Limit +30LT","Wind: Fortune":"Luck +2"};
const LIGHTSTONE_COLOR_PALETTE=["#ff5f6d","#ffa94d","#ffd166","#7bd88f","#4dd4ac","#4cc9f0","#73a7ff","#b987ff","#ff7ad9","#f4a261","#a3e635","#38bdf8"];
function normalizeLightstoneName(stone){return String(stone||"").replace(/^Amplified\s+Lightstone of\s+/i,"").replace(/^Lightstone of\s+/i,"").replace(/\s*:\s*/g,": ").trim()}
function amplifiedLightstoneFor(stone){const key=normalizeLightstoneName(stone);const effect=AMPLIFIED_LIGHTSTONE_EFFECTS[key];return effect?{name:`Amplified Lightstone of ${key}`,effect}:null}
function lightstoneSetTags(set){return set.lightstones.some(stone=>amplifiedLightstoneFor(stone))?["Amplified"]:[]}
function lightstoneCategorySort(a,b){if(a==="Amplified")return -1;if(b==="Amplified")return 1;return a.localeCompare(b)}
function lightstoneColorForStone(stone){const key=normalizeLightstoneName(stone);if(!key||key==="-")return "#778391";let hash=0;for(let i=0;i<key.length;i++)hash=(hash*31+key.charCodeAt(i))>>>0;return LIGHTSTONE_COLOR_PALETTE[hash%LIGHTSTONE_COLOR_PALETTE.length]}
function renderLightstoneStone(stone){const amp=amplifiedLightstoneFor(stone),useAmp=lightstoneState.amplified&&amp,color=lightstoneColorForStone(stone),name=useAmp?amp.name:stone,ampLine=useAmp?`<span class="lightstoneAmpLine">${escapeHtml(amp.effect)}</span>`:"";return `<li class="lightstoneStone" style="--stone-color:${color}"><span class="lightstoneStoneName">${escapeHtml(name)}</span>${ampLine}</li>`}
function lightstoneTypeLabel(type){return type==="lifeskill"?"Lifeskill":"Combat"}
function getLightstoneSets(type){return lightstoneSetsByType.get(type)||[]}
function lightstoneMatches(set,query){if(!query)return true;let hay=lightstoneSearchIndex.get(set);if(!hay){const ampTerms=set.lightstones.flatMap(stone=>{const amp=amplifiedLightstoneFor(stone);return amp?["Amplified",amp.name,amp.effect]:[]});hay=[set.name,set.category,set.source,...lightstoneSetTags(set),...set.effects,...set.lightstones,...ampTerms].join(" ").toLowerCase();lightstoneSearchIndex.set(set,hay)}return hay.includes(query.toLowerCase())}
function renderLightstoneCategoryOptions(type){if(!lightstoneEl.category)return;const categories=[...new Set(getLightstoneSets(type).flatMap(set=>[set.category,...lightstoneSetTags(set)]))].sort(lightstoneCategorySort);const current=categories.includes(lightstoneState.category)?lightstoneState.category:"";lightstoneState.category=current;lightstoneEl.category.innerHTML='<option value="">All categories</option>'+categories.map(category=>`<option value="${escapeHtml(category)}" ${category===current?"selected":""}>${escapeHtml(category)}</option>`).join("")}
function renderLightstoneCard(set){const effects=set.effects.map(effect=>`<li>${escapeHtml(effect)}</li>`).join("");const stones=set.lightstones.map(renderLightstoneStone).join("");const tags=[set.category,...lightstoneSetTags(set)].map(tag=>`<span class="lightstoneTag ${tag==="Amplified"?"lightstoneAmpTag":""}">${escapeHtml(tag)}</span>`).join("");return `<article class="lightstoneSetCard"><div class="lightstoneSetTop"><h3>${escapeHtml(set.name)}</h3><div class="lightstoneTagRow">${tags}</div></div><div class="lightstoneBlock"><strong>Set effect</strong><ul class="lightstoneLines">${effects}</ul></div><div class="lightstoneBlock"><strong>${lightstoneState.amplified?"Required lightstones - amplified where available":"Required lightstones"}</strong><ul class="lightstoneLines">${stones}</ul></div></article>`}
function renderLightstoneSets(){if(!lightstoneEl.stage||!lightstoneEl.grid)return;const type=lightstoneState.type;document.querySelectorAll("[data-lightstone-choice]").forEach(button=>button.classList.toggle("active",button.dataset.lightstoneChoice===type));lightstoneEl.chooser?.classList.toggle("hidden",Boolean(type));lightstoneEl.stage.classList.toggle("active",Boolean(type));lightstoneEl.pill.textContent=type?`${lightstoneTypeLabel(type)} selected`:"Select a category";if(lightstoneEl.amplified)lightstoneEl.amplified.checked=lightstoneState.amplified;if(!type){lightstoneEl.grid.innerHTML="";if(lightstoneEl.summary)lightstoneEl.summary.textContent="";return;}renderLightstoneCategoryOptions(type);const label=lightstoneTypeLabel(type);const sets=getLightstoneSets(type);const filtered=sets.filter(set=>(!lightstoneState.category||set.category===lightstoneState.category||lightstoneSetTags(set).includes(lightstoneState.category))&&lightstoneMatches(set,lightstoneState.search));lightstoneEl.title.textContent=`${label} Lightstone Sets`;lightstoneEl.subtitle.textContent="";if(lightstoneEl.summary){const categoryText=lightstoneState.category?` in ${lightstoneState.category}`:"";const ampText=lightstoneState.amplified?`<span>Amplified mode on</span>`:"";lightstoneEl.summary.innerHTML=`<span>Showing ${filtered.length} of ${sets.length} ${label.toLowerCase()} sets${categoryText}</span>${ampText}${lightstoneState.search?`<span>Search: ${escapeHtml(lightstoneState.search)}</span>`:""}`}lightstoneEl.grid.innerHTML=filtered.length?filtered.map(renderLightstoneCard).join(""):`<div class="lightstoneEmpty">No lightstone sets match the current filters.</div>`}
function selectLightstoneCategory(type){if(!["lifeskill","combat"].includes(type))return;lightstoneState.type=type;lightstoneState.search="";lightstoneState.category="";if(lightstoneEl.search)lightstoneEl.search.value="";clearTimeout(lightstoneState.transition);lightstoneEl.stage?.classList.add("fading");lightstoneState.transition=setTimeout(()=>{renderLightstoneSets();requestAnimationFrame(()=>lightstoneEl.stage?.classList.remove("fading"));},120)}
function initializeLightstoneSets(){if(lightstoneState.ready)return;lightstoneState.ready=true;let searchTimer=null;document.querySelectorAll("[data-lightstone-choice]").forEach(button=>button.addEventListener("click",()=>selectLightstoneCategory(button.dataset.lightstoneChoice)));lightstoneEl.search?.addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{lightstoneState.search=lightstoneEl.search.value.trim();renderLightstoneSets()},100)});lightstoneEl.category?.addEventListener("change",()=>{lightstoneState.category=lightstoneEl.category.value;renderLightstoneSets()});lightstoneEl.amplified?.addEventListener("change",()=>{lightstoneState.amplified=lightstoneEl.amplified.checked;renderLightstoneSets()});renderLightstoneSets()}
// Home dashboard schedule/timer config. Europe/Berlin follows the live CET/CEST offset.
const HOME_SERVER_TIME_ZONE = "Europe/Berlin";
const HOME_SERVER_TIME_ZONE_LABEL = "CET/CEST";
function serverTimeZoneLabel(date=new Date()){
  const part=new Intl.DateTimeFormat("en-US",{timeZone:HOME_SERVER_TIME_ZONE,timeZoneName:"short"}).formatToParts(date).find(item=>item.type==="timeZoneName");
  return part?.value||"EU";
}
const HOME_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const HOME_DAY_LABELS = {Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu",Friday:"Fri",Saturday:"Sat",Sunday:"Sun"};
const HOME_DAY_INDEX = {Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
const BUNDLED_HOME_BOSS_TIMES = ["00:15","02:00","12:00","14:00","16:00","19:00","19:15","22:15","23:15"];
const BUNDLED_HOME_BOSS_SCHEDULE = {
  Monday:{"00:15":["Uturi","Kutum"],"02:00":["Sangoon","Karanda"],"12:00":["Sangoon","Nouver"],"14:00":["Garmoth"],"16:00":["Uturi","Kutum"],"19:00":["Golden Pig King","Nouver"],"19:15":[],"22:15":["Bulgasal","Kzarka"],"23:15":["Garmoth"]},
  Tuesday:{"00:15":["Sangoon","Karanda"],"02:00":[],"12:00":["Bulgasal","Kutum"],"14:00":["Garmoth"],"16:00":["Golden Pig King","Nouver"],"19:00":["Uturi","Kzarka"],"19:15":[],"22:15":["Quint","Muraka"],"23:15":["Garmoth"]},
  Wednesday:{"00:15":["Golden Pig King","Kzarka"],"02:00":[],"12:00":["Sangoon","Karanda"],"14:00":["Garmoth"],"16:00":["Bulgasal","Offin"],"19:00":["Vell"],"19:15":[],"22:15":["Uturi","Nouver"],"23:15":["Garmoth"]},
  Thursday:{"00:15":["Uturi","Nouver"],"02:00":["Golden Pig King","Kzarka"],"12:00":[],"14:00":["Garmoth"],"16:00":["Sangoon","Karanda"],"19:00":["Bulgasal","Kutum"],"19:15":[],"22:15":["Quint","Muraka"],"23:15":["Garmoth"]},
  Friday:{"00:15":["Golden Pig King","Karanda"],"02:00":["Bulgasal","Nouver"],"12:00":["Uturi","Kutum"],"14:00":["Garmoth"],"16:00":["Bulgasal","Kzarka"],"19:00":["Sangoon","Offin"],"19:15":[],"22:15":["Golden Pig King","Kutum"],"23:15":["Garmoth"]},
  Saturday:{"00:15":["Bulgasal","Kzarka"],"02:00":["Uturi","Offin"],"12:00":["Golden Pig King","Nouver"],"14:00":["Garmoth"],"16:00":["Black Shadow"],"19:00":["Sangoon","Karanda"],"19:15":[],"22:15":[],"23:15":[]},
  Sunday:{"00:15":["Bulgasal","Nouver"],"02:00":["Golden Pig King","Kutum"],"12:00":["Uturi","Kzarka"],"14:00":["Garmoth"],"16:00":["Vell"],"19:00":[],"19:15":["Garmoth"],"22:15":["Sangoon","Karanda"],"23:15":["Garmoth"]}
};
const BUNDLED_HOME_BOSSES = ["Garmoth","Vell","Quint","Muraka","Kutum","Karanda","Kzarka","Nouver","Offin","Sangoon","Uturi","Golden Pig King","Bulgasal","Black Shadow"];
const HOME_EVENT_BOSS_COLORS = Object.freeze([
  "#ff6bcb","#55d6ff","#ffb454","#78e06f",
  "#b18cff","#ff6f7d","#45dfc3","#ffd95a",
  "#6fa8ff","#e879f9","#74e07d","#ff8a5c",
  "#48c9e8","#c4a1ff","#f4a261","#5eead4"
]);
let homeBossScheduleState={
  times:[...BUNDLED_HOME_BOSS_TIMES],
  schedule:BUNDLED_HOME_BOSS_SCHEDULE,
  bosses:[...BUNDLED_HOME_BOSSES],
  source:"Bundled",
  status:"BUNDLED",
  fetchedAtUtc:null,
  contentHash:"bundled",
  message:null
};
const bossScheduleSyncState={initialized:false,refreshing:false};
const HOME_TIMER_CONFIG = {
  dayNight:{ cycleMinutes:240, nightMinutes:40, nightStartUtcIso:"2026-07-20T11:40:00Z" },
  imperial:{ label:"Imperial delivery", resetHours:[0,3,6,9,12,15,18,21] },
  barter:{ label:"Barter refresh", resetHours:[0,4,8,12,16,20] },
  region:"EU"
};
const RESET_TIMER_CONFIG = [
  { id:"daily", label:"Daily Reset", kind:"daily", hour:2, minute:0, detail:"Daily quests, login checks, and most account-wide daily content" },
  { id:"imperial", label:"Imperial Reset", kind:"hours", hours:[2,5,8,11,14,17,20,23], detail:"Imperial delivery and related delivery windows" },
  { id:"bsa", label:"BSA Reset", kind:"daily", hour:7, minute:0, detail:"Black Spirit's Adventure daily reset" },
  { id:"agris", label:"Agris Reset", kind:"daily", hour:8, minute:0, detail:"Agris Fever recovery reset" },
  { id:"barter", label:"Barter Reset", kind:"daily", hour:8, minute:0, detail:"Barter refresh window" },
  { id:"trading", label:"Trading Reset", kind:"hours", hours:[2,5,8,11,14,17,20,23], detail:"Trading market reset window" }
];
const RESET_TIMER_ICON_SVGS = Object.freeze({
  daily:'<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"></path><path d="M21 3v5h-5"></path></svg>',
  imperial:'<svg viewBox="0 0 24 24"><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path></svg>',
  bsa:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle class="iconFill" cx="8" cy="8" r="1.25"></circle><circle class="iconFill" cx="16" cy="8" r="1.25"></circle><circle class="iconFill" cx="12" cy="12" r="1.25"></circle><circle class="iconFill" cx="8" cy="16" r="1.25"></circle><circle class="iconFill" cx="16" cy="16" r="1.25"></circle></svg>',
  agris:'<svg viewBox="0 0 24 24"><path d="M12 22c4.42 0 8-3.13 8-7 0-2.74-1.56-5.1-4.08-7.1.15 2.46-1.38 3.58-1.38 3.58.38-3.45-1.8-6.88-5.42-9.48.45 2.85-1.06 4.78-2.7 6.57C4.68 10.46 4 12.37 4 15c0 3.87 3.58 7 8 7Z"></path><path d="M9.5 18.5c0-2 1-3.5 2.5-5 1.5 1.5 2.5 3 2.5 5"></path></svg>',
  barter:'<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"></circle><path d="M12 8v13"></path><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path><path d="m5 9-3 3 3 3"></path><path d="m19 9 3 3-3 3"></path></svg>',
  trading:'<svg viewBox="0 0 24 24"><path d="m8 3-4 4 4 4"></path><path d="M4 7h16"></path><path d="m16 21 4-4-4-4"></path><path d="M20 17H4"></path></svg>'
});
const resetTimerEl={grid:document.getElementById("resetTimersGrid"),status:document.getElementById("resetTimersStatus"),localTime:document.getElementById("resetLocalTime")};
const homeEl={
  head:document.getElementById("bossScheduleHead"),body:document.getElementById("bossScheduleBody"),nextBossTitle:document.getElementById("homeNextBossTitle"),nextBossTime:document.getElementById("homeNextBossTime"),nextBossSub:document.getElementById("homeNextBossSub"),dayNightCard:document.getElementById("homeDayNightCard"),dayNightValue:document.getElementById("homeDayNightValue"),dayNightSub:document.getElementById("homeDayNightSub"),dayNightProgress:document.getElementById("homeDayNightProgress"),guildBossValue:document.getElementById("homeGuildBossValue"),guildBossSub:document.getElementById("homeGuildBossSub"),guildBossDay:document.getElementById("homeGuildBossDay"),guildBossTime:document.getElementById("homeGuildBossTime"),guildBossSetSub:document.getElementById("homeGuildBossSetSub"),nextBossLine:document.getElementById("homeBossNextLine"),time12:document.getElementById("homeTime12"),time24:document.getElementById("homeTime24"),localTime:document.getElementById("homeLocalTime"),master:document.getElementById("bossMasterNotifications"),lead:document.getElementById("bossLeadTime"),sound:document.getElementById("bossSoundEnabled"),tts:document.getElementById("bossTtsEnabled"),guildNotify:document.getElementById("guildBossNotifications"),testTts:document.getElementById("bossTestTts"),testAlarm:document.getElementById("bossTestAlarm"),toggles:document.getElementById("bossToggleList"),footer:document.getElementById("bossNotifyFooter"),status:document.getElementById("homeScheduleStatus")
};
function bossClass(name){const text=String(name||""),slug=text.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48);let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return `boss-${slug||`event-${(hash>>>0).toString(16)}`}`}
function bossEventColor(name){const className=bossClass(name);if(BUNDLED_HOME_BOSSES.some(boss=>bossClass(boss)===className))return null;const text=String(name||"Event Boss").normalize("NFKC").trim().toLowerCase();let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return HOME_EVENT_BOSS_COLORS[(hash>>>0)%HOME_EVENT_BOSS_COLORS.length]}
function renderBossName(name){const color=bossEventColor(name),eventClass=color?" boss-event":"";return `<span class="bossName ${bossClass(name)}${eventClass}" title="${escapeHtml(name)}"${color?` style="--boss-event-color:${color}"`:""}>${escapeHtml(name)}</span>`}
function defaultBossSelection(){return homeBossScheduleState.bosses.reduce((acc,b)=>{acc[b]=true;return acc},{})}
function normalizedHomeSettings(){const saved=readSetting("homeSettings",{});return {timeFormat:saved.timeFormat==="24"?"24":"12",showLocalTime:saved.showLocalTime===true,masterNotifications:saved.masterNotifications!==false,leadMinutes:[0,5,10,15,30].includes(Number(saved.leadMinutes))?Number(saved.leadMinutes):15,soundEnabled:saved.soundEnabled!==false,ttsEnabled:saved.ttsEnabled===true,guildBossNotifications:saved.guildBossNotifications===true,bosses:{...defaultBossSelection(),...(saved.bosses||{})},notified:saved.notified&&typeof saved.notified==="object"?saved.notified:{}}}
function saveHomeSettings(settings){persistSetting("homeSettings",settings)}
function commitHomeSettings(settings){saveHomeSettings(settings);applyHomeSettings(settings)}
function fmtCountdown(ms){ms=Math.max(0,Math.floor(ms/1000));const h=Math.floor(ms/3600),m=Math.floor(ms%3600/60),s=ms%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function fmtBossTime(time,format){const [h,m]=time.split(":").map(Number);if(format==="24")return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;const suffix=h>=12?"PM":"AM",hour=((h+11)%12)+1;return `${String(hour).padStart(2,"0")}:${String(m).padStart(2,"0")} ${suffix}`}
function fmtLocalTime(date,format){return date.toLocaleTimeString([],format==="24"?{hour:"2-digit",minute:"2-digit",hour12:false}:{hour:"2-digit",minute:"2-digit",hour12:true})}
function zonedParts(date=new Date(),timeZone=HOME_SERVER_TIME_ZONE){const parts=new Intl.DateTimeFormat("en-US",{timeZone,weekday:"short",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);const map={};for(const part of parts){if(part.type!=="literal")map[part.type]=part.value}return {weekday:map.weekday,year:Number(map.year),month:Number(map.month),day:Number(map.day),hour:Number(map.hour),minute:Number(map.minute),second:Number(map.second)}}
function zonedOffsetMs(date,timeZone){const p=zonedParts(date,timeZone);const asUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);return asUtc-date.getTime()}
function zonedTimeToDate(timeZone,year,month,day,hour,minute){const utc=Date.UTC(year,month-1,day,hour,minute,0);let offset=zonedOffsetMs(new Date(utc),timeZone);let result=new Date(utc-offset);const nextOffset=zonedOffsetMs(result,timeZone);if(nextOffset!==offset)result=new Date(utc-nextOffset);return result}
function serverWeekMondayUtc(now=new Date()){const p=zonedParts(now,HOME_SERVER_TIME_ZONE);return Date.UTC(p.year,p.month-1,p.day)-HOME_DAY_INDEX[p.weekday]*86400000}
function serverDateFor(mondayUtc,dayIndex,weekOffset=0){const d=new Date(mondayUtc+(dayIndex+(weekOffset*7))*86400000);return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()}}
function buildServerWeekSpawns(now=new Date(),weekOffset=0){const mondayUtc=serverWeekMondayUtc(now),state=homeBossScheduleState,spawns=[];HOME_DAYS.forEach((day,dayIndex)=>{const daySchedule=state.schedule[day]||{};state.times.forEach(time=>{const bosses=daySchedule[time]||[];if(!bosses.length)return;const [hour,minute]=time.split(":").map(Number);const p=serverDateFor(mondayUtc,dayIndex,weekOffset);spawns.push({serverDay:day,serverDayIndex:dayIndex,serverTime:time,bosses,date:zonedTimeToDate(HOME_SERVER_TIME_ZONE,p.year,p.month,p.day,hour,minute)})})});return spawns}
let bossSpawnCache={mondayUtc:null,spawns:[]};
function allBossSpawns(now=new Date()){const mondayUtc=serverWeekMondayUtc(now);if(bossSpawnCache.mondayUtc!==mondayUtc){bossSpawnCache={mondayUtc,spawns:[...buildServerWeekSpawns(now,0),...buildServerWeekSpawns(now,1)].sort((a,b)=>a.date-b.date)}}return bossSpawnCache.spawns}
function nextBossSpawn(now=new Date()){return allBossSpawns(now).find(x=>x.date>now)||null}
function bossSpawnKey(spawn){return spawn?`${spawn.date.toISOString()}|${spawn.serverDay}|${spawn.serverTime}|${spawn.bosses.join("\u001f")}`:"none"}
function localScheduleContext(now=new Date(),next=null){const anchor=next?.date||now;let timeZone="system-local";try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||timeZone}catch{}return{serverWeekMondayUtc:serverWeekMondayUtc(anchor),timeZone,localOffsetMinutes:now.getTimezoneOffset(),serverOffsetMinutes:Math.round(zonedOffsetMs(now,HOME_SERVER_TIME_ZONE)/60000)}}
function bossScheduleMaterializationKey(settings,now=new Date(),next=null,context=null){if(!settings.showLocalTime)return `server|${homeBossScheduleState.contentHash}|${settings.timeFormat}`;const value=context||localScheduleContext(now,next);return["local",homeBossScheduleState.contentHash,settings.timeFormat,value.serverWeekMondayUtc,value.timeZone,value.localOffsetMinutes,value.serverOffsetMinutes].join("|")}
function localDayName(date){return HOME_DAYS[(date.getDay()+6)%7]}
function fmtSpawnDateTime(spawn,settings){if(!spawn)return "-";if(settings.showLocalTime)return `${localDayName(spawn.date)} ${fmtLocalTime(spawn.date,settings.timeFormat)} Local`;return `${spawn.serverDay} ${fmtBossTime(spawn.serverTime,settings.timeFormat)} ${serverTimeZoneLabel(spawn.date)}`}
function nextServerReset(resetHours,now=new Date()){const sorted=[...resetHours].sort((a,b)=>a-b);const p=zonedParts(now,HOME_SERVER_TIME_ZONE);for(let dayOffset=0;dayOffset<2;dayOffset++){for(const h of sorted){const candidate=zonedTimeToDate(HOME_SERVER_TIME_ZONE,p.year,p.month,p.day+dayOffset,h,0);if(candidate>now)return candidate}}return zonedTimeToDate(HOME_SERVER_TIME_ZONE,p.year,p.month,p.day+1,sorted[0]||0,0)}
function nextDailyServerReset(hour=0,minute=0,now=new Date()){const p=zonedParts(now,HOME_SERVER_TIME_ZONE);for(let dayOffset=0;dayOffset<2;dayOffset++){const candidate=zonedTimeToDate(HOME_SERVER_TIME_ZONE,p.year,p.month,p.day+dayOffset,hour,minute);if(candidate>now)return candidate}return zonedTimeToDate(HOME_SERVER_TIME_ZONE,p.year,p.month,p.day+1,hour,minute)}
function resetTimerTarget(config,now=new Date()){return config.kind==="hours"?nextServerReset(config.hours,now):nextDailyServerReset(config.hour,config.minute||0,now)}
function normalizedResetSettings(){const saved=readSetting("resetTimerSettings",{});return {showLocalTime:saved.showLocalTime===true,timeFormat:(saved.timeFormat==="24"||normalizedHomeSettings().timeFormat==="24")?"24":"12"}}
function saveResetSettings(settings){persistSetting("resetTimerSettings",settings)}
function resetTimerServerLabel(target,settings){const p=zonedParts(target,HOME_SERVER_TIME_ZONE),time=`${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")}`;return settings.showLocalTime?`${fmtLocalTime(target,settings.timeFormat)} Local`:`${fmtBossTime(time,settings.timeFormat)} ${serverTimeZoneLabel(target)}`}
function ensureResetTimerCards(){
  if(!resetTimerEl.grid||resetTimerEl.grid.children.length===RESET_TIMER_CONFIG.length)return;
  resetTimerEl.grid.innerHTML=RESET_TIMER_CONFIG.map(config=>`<article class="resetTimerCard" data-reset-id="${config.id}"><div class="resetTimerTop"><span class="resetTimerTitle">${escapeHtml(config.label)}</span><span class="resetTimerIcon" aria-hidden="true">${RESET_TIMER_ICON_SVGS[config.id]||""}</span></div><strong class="resetTimerValue" data-reset-value></strong><div class="resetTimerSub"><span data-reset-next></span><br>${escapeHtml(config.detail)}</div><div class="resetTimerRule"></div></article>`).join("");
}
function renderResetTimers(settings=normalizedResetSettings()){
  if(!resetTimerEl.grid)return;
  if(resetTimerEl.localTime)resetTimerEl.localTime.checked=settings.showLocalTime;
  ensureResetTimerCards();
  const now=new Date();
  for(const config of RESET_TIMER_CONFIG){
    const card=resetTimerEl.grid.querySelector(`[data-reset-id="${config.id}"]`),target=resetTimerTarget(config,now);
    if(!card)continue;
    const value=card.querySelector("[data-reset-value]"),next=card.querySelector("[data-reset-next]");
    if(value)value.textContent=fmtCountdown(target-now);
    if(next)next.textContent=`Next reset: ${resetTimerServerLabel(target,settings)} - ${HOME_TIMER_CONFIG.region}`;
  }
  if(resetTimerEl.status)resetTimerEl.status.textContent=`Reset timers loaded - Last updated ${now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`;
}
function initializeResetTimers(){renderResetTimers(normalizedResetSettings())}
function dayNightState(now=new Date()){const cfg=HOME_TIMER_CONFIG.dayNight,cycle=cfg.cycleMinutes*60000,night=cfg.nightMinutes*60000,nightStart=Date.parse(cfg.nightStartUtcIso);const elapsed=((now.getTime()-nightStart)%cycle+cycle)%cycle;const isNight=elapsed<night;const remain=isNight?night-elapsed:cycle-elapsed;const progress=isNight?elapsed/night:(elapsed-night)/(cycle-night);return{state:isNight?"Night":"Day",remain,progress,next:isNight?"Day":"Night"}}
function guildBossSchedule(){const migrated=readSetting("guildBossAt","");let day=readSetting("guildBossDay",""),time=readSetting("guildBossTime","");if((day===""||!time)&&migrated){const old=new Date(migrated);if(!Number.isNaN(old.getTime())){day=String(old.getDay());time=`${String(old.getHours()).padStart(2,"0")}:${String(old.getMinutes()).padStart(2,"0")}`;persistSetting("guildBossDay",day);persistSetting("guildBossTime",time);persistSetting("guildBossAt","")}}return{day:String(day),time:String(time||"")}}
function guildBossTarget(now=new Date(),includeRecentlySpawned=false){const schedule=guildBossSchedule(),day=Number(schedule.day),parts=schedule.time.match(/^(\d{2}):(\d{2})$/);if(!Number.isInteger(day)||day<0||day>6||!parts)return null;const target=new Date(now);target.setHours(Number(parts[1]),Number(parts[2]),0,0);const daysAhead=(day-now.getDay()+7)%7;target.setDate(now.getDate()+daysAhead);if(target<=now&&(!includeRecentlySpawned||now-target>HOME_SPAWNING_NOW_GRACE_MS))target.setDate(target.getDate()+7);return{...schedule,date:target}}
function guildBossDayName(day){return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][Number(day)]||"Weekly"}
function fmtGuildBossCountdown(ms){return ms>86400000?`${Math.min(7,Math.ceil(ms/86400000))} days remaining`:fmtCountdown(ms)}
function updateGuildBossTimer(now=new Date()){const schedule=guildBossSchedule();if(homeEl.guildBossDay&&homeEl.guildBossDay.value!==schedule.day)homeEl.guildBossDay.value=schedule.day;if(homeEl.guildBossTime&&homeEl.guildBossTime.value!==schedule.time)homeEl.guildBossTime.value=schedule.time;const target=guildBossTarget(now);if(!target){if(homeEl.guildBossValue){homeEl.guildBossValue.textContent="--:--:--";homeEl.guildBossValue.dataset.displayMode="countdown"}if(homeEl.guildBossSub)homeEl.guildBossSub.textContent="Set the weekly guild boss day/time";if(homeEl.guildBossSetSub)homeEl.guildBossSetSub.textContent="Choose the weekly day and time";return;}const diff=target.date-now;homeEl.guildBossValue.textContent=fmtGuildBossCountdown(diff);homeEl.guildBossValue.dataset.displayMode=diff>86400000?"days":"countdown";homeEl.guildBossSub.textContent=`Until ${guildBossDayName(target.day)} ${target.time}`;homeEl.guildBossSetSub.textContent=`Repeats every ${guildBossDayName(target.day)} at ${target.time}`}
function renderBossNames(bosses){return bosses.length?bosses.map(renderBossName).join(""):`<span class="bossDash">&mdash;</span>`}
function sameBossList(a,b){return (a||[]).join("|")===(b||[]).join("|")}
function sizeBossScheduleTable(columnCount){homeEl.head?.closest("table")?.style.setProperty("--boss-schedule-min-width",`${72+Math.max(1,columnCount)*82}px`)}
function renderServerBossSchedule(settings,next){const state=homeBossScheduleState;sizeBossScheduleTable(state.times.length);homeEl.head.innerHTML=`<tr><th>${HOME_SERVER_TIME_ZONE_LABEL}</th>${state.times.map(t=>`<th>${fmtBossTime(t,settings.timeFormat)}</th>`).join("")}</tr>`;homeEl.body.innerHTML=HOME_DAYS.map(day=>`<tr><th>${HOME_DAY_LABELS[day]}</th>${state.times.map(time=>{const bosses=(state.schedule[day]||{})[time]||[],isNext=next&&next.serverDay===day&&next.serverTime===time&&sameBossList(next.bosses,bosses);return `<td><div class="bossScheduleCell ${isNext?"next":""}">${renderBossNames(bosses)}</div></td>`}).join("")}</tr>`).join("")}
function renderLocalBossSchedule(settings,next,now=new Date()){const anchor=next?.date||now,week=buildServerWeekSpawns(anchor,0),localTimes=[...new Set(week.map(s=>`${String(s.date.getHours()).padStart(2,"0")}:${String(s.date.getMinutes()).padStart(2,"0")}`))].sort((a,b)=>{const [ah,am]=a.split(":").map(Number),[bh,bm]=b.split(":").map(Number);return ah*60+am-(bh*60+bm)});sizeBossScheduleTable(localTimes.length);const grouped={};HOME_DAYS.forEach(d=>grouped[d]={});week.forEach(s=>{const day=localDayName(s.date),time=`${String(s.date.getHours()).padStart(2,"0")}:${String(s.date.getMinutes()).padStart(2,"0")}`,cell=grouped[day][time]||(grouped[day][time]={bosses:[],spawnKeys:new Set()});cell.bosses=[...new Set([...cell.bosses,...s.bosses])];cell.spawnKeys.add(bossSpawnKey(s))});const nextKey=bossSpawnKey(next);homeEl.head.innerHTML=`<tr><th>Local</th>${localTimes.map(t=>`<th>${fmtBossTime(t,settings.timeFormat)}</th>`).join("")}</tr>`;homeEl.body.innerHTML=HOME_DAYS.map(day=>`<tr><th>${HOME_DAY_LABELS[day]}</th>${localTimes.map(time=>{const cell=grouped[day][time]||{bosses:[],spawnKeys:new Set()},isNext=next&&cell.spawnKeys.has(nextKey);return `<td><div class="bossScheduleCell ${isNext?"next":""}">${renderBossNames(cell.bosses)}</div></td>`}).join("")}</tr>`).join("")}
let bossScheduleRenderState={materializationKey:"",nextSpawnKey:""};
function renderBossSchedule(settings,now=new Date(),next=nextBossSpawn(now),context=null){if(!homeEl.head||!homeEl.body)return false;settings.showLocalTime?renderLocalBossSchedule(settings,next,now):renderServerBossSchedule(settings,next);bossScheduleRenderState={materializationKey:bossScheduleMaterializationKey(settings,now,next,context),nextSpawnKey:bossSpawnKey(next)};return true}
function refreshBossScheduleIfNeeded(settings,now=new Date(),next=nextBossSpawn(now),context=null){const materializationKey=bossScheduleMaterializationKey(settings,now,next,context),nextSpawnKey=bossSpawnKey(next);if(materializationKey===bossScheduleRenderState.materializationKey&&nextSpawnKey===bossScheduleRenderState.nextSpawnKey)return false;return renderBossSchedule(settings,now,next,context)}
function renderBossToggles(settings){if(!homeEl.toggles)return;homeEl.toggles.innerHTML=homeBossScheduleState.bosses.map(b=>{const enabled=settings.bosses[b]!==false;return `<label class="bossToggle ${enabled?"":"disabledBoss"}"><input type="checkbox" data-boss-toggle="${escapeHtml(b)}" ${enabled?"checked":""}>${renderBossName(b)}</label>`}).join("")}
function applyHomeSettings(settings){if(homeEl.time12)homeEl.time12.classList.toggle("active",settings.timeFormat==="12");if(homeEl.time24)homeEl.time24.classList.toggle("active",settings.timeFormat==="24");if(homeEl.localTime)homeEl.localTime.checked=settings.showLocalTime;if(homeEl.master)homeEl.master.checked=settings.masterNotifications;if(homeEl.lead)homeEl.lead.value=String(settings.leadMinutes);if(homeEl.sound){homeEl.sound.checked=settings.soundEnabled;homeEl.sound.disabled=false;homeEl.sound.closest(".bossSettingRow")?.classList.remove("disabledBoss")}if(homeEl.tts)homeEl.tts.checked=settings.ttsEnabled;if(homeEl.guildNotify)homeEl.guildNotify.checked=settings.guildBossNotifications;renderBossSchedule(settings);renderBossToggles(settings);updateHomeTimers(settings)}
function updateBossScheduleStatus(){if(!homeEl.status)return;const state=homeBossScheduleState,stamp=state.fetchedAtUtc?new Date(state.fetchedAtUtc):null,time=stamp&&!Number.isNaN(stamp.getTime())?stamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):null;if(state.status==="LIVE")homeEl.status.textContent=`Schedule synced${time?` - ${time}`:""}`;else if(state.status==="CACHED")homeEl.status.textContent=`Using cached schedule${time?` - Last synced ${time}`:""}`;else homeEl.status.textContent=state.message||"Using bundled EU schedule"}
function updateHomeTimers(settings=normalizedHomeSettings(),now=new Date()){const next=nextBossSpawn(now);refreshBossScheduleIfNeeded(settings,now,next);if(next){const bossLabel=next.bosses.join(" + "),countdown=fmtCountdown(next.date-now);homeEl.nextBossTime.textContent=countdown;if(homeEl.nextBossTitle){homeEl.nextBossTitle.textContent=`Next Boss: ${bossLabel}`;homeEl.nextBossTitle.className=`homeTimerTitle ${next.bosses.map(bossClass).join(" ")}`}homeEl.nextBossSub.textContent=`${fmtSpawnDateTime(next,settings)} - ${HOME_TIMER_CONFIG.region}`;homeEl.nextBossLine.textContent=`Next: ${bossLabel} in ${countdown} (${fmtSpawnDateTime(next,settings)})`}const dn=dayNightState(now),cycleState=dn.state.toLowerCase();if(homeEl.dayNightCard&&homeEl.dayNightCard.dataset.cycleState!==cycleState)homeEl.dayNightCard.dataset.cycleState=cycleState;homeEl.dayNightValue.textContent=dn.state;homeEl.dayNightSub.textContent=`${fmtCountdown(dn.remain)} until ${dn.next}`;homeEl.dayNightProgress.style.width=`${Math.round(dn.progress*100)}%`;updateGuildBossTimer(now);updateBossScheduleStatus()}
const homeAlertInFlight=new Set();
let homeAlertRunPromise=null;
const HOME_SPAWNING_NOW_GRACE_MS=60*1000;
const HOME_ALERT_MILESTONES=Object.freeze([0,5,10,15,30]);
function alertStage(settings,delta,keyBase){const requestedLead=Number(settings.leadMinutes),lead=HOME_ALERT_MILESTONES.includes(requestedLead)?requestedLead:15;if(delta < -HOME_SPAWNING_NOW_GRACE_MS||delta>lead*60000)return null;const stage=HOME_ALERT_MILESTONES.find(minutes=>minutes<=lead&&delta<=minutes*60000),notified=settings.notified||{};return stage!==undefined&&!notified[`${keyBase}|${stage}`]?stage:null}
function alertLeadText(stage){const minutes=Number(stage);if(minutes===0)return"now";const safeMinutes=Math.max(1,minutes||1);return safeMinutes===1?"1 minute":`${safeMinutes} minutes`}
function spokenBossList(bosses){if(bosses.length<=1)return bosses[0]||"Boss";if(bosses.length===2)return `${bosses[0]} and ${bosses[1]}`;return `${bosses.slice(0,-1).join(", ")}, and ${bosses.at(-1)}`}
function notificationKeyDate(key){const part=String(key).split("|").find(x=>!Number.isNaN(Date.parse(x)));return part?Date.parse(part):NaN}
function pruneHomeNotifications(settings){const cutoff=Date.now()-14*86400000;for(const k of Object.keys(settings.notified||{})){const ts=notificationKeyDate(k);if(!Number.isNaN(ts)&&ts<cutoff)delete settings.notified[k]}}
function nextAlertableBossSpawn(settings,now=new Date()){for(const spawn of allBossSpawns(now)){const delta=spawn.date-now;if(delta < -HOME_SPAWNING_NOW_GRACE_MS)continue;const bosses=spawn.bosses.filter(boss=>settings.bosses[boss]!==false);if(!bosses.length)continue;if(delta<=0&&(settings.notified||{})[`boss|${spawn.date.toISOString()}|0`])continue;return {...spawn,bosses}}return null}
async function sendHomeAlert(title,message,spokenText,settings){const channels=[{name:"desktop notification",promise:bridgeCall("showDesktopNotification",{title,message})}];if(settings.soundEnabled)channels.push({name:"Alarm.mp3",promise:bridgeCall("playAlarmSound",{})});if(settings.ttsEnabled)channels.push({name:"text to speech",promise:bridgeCall("speakText",{text:spokenText})});NotificationService.ShowInfo(message,title);const results=await Promise.allSettled(channels.map(channel=>channel.promise)),failures=results.map((result,index)=>({result,channel:channels[index]})).filter(entry=>entry.result.status==="rejected");if(failures.length){console.warn("[HomeBossNotify] Alert channel failure",failures.map(entry=>({channel:entry.channel.name,error:entry.result.reason})));const names=failures.map(entry=>entry.channel.name).join(", ");if(failures.length===channels.length)NotificationService.ShowError(`Could not deliver the enabled alert channels: ${names}.`,"Boss alert failed");else NotificationService.ShowWarning(`Some alert channels failed: ${names}.`,"Boss alert partially delivered")}return results.some(result=>result.status==="fulfilled")}
async function persistDeliveredHomeAlert(key,settings,deliver){if(homeAlertInFlight.has(key))return false;homeAlertInFlight.add(key);try{const delivered=await deliver();if(delivered){const latest=normalizedHomeSettings(),notified={...(latest.notified||{}),...(settings.notified||{}),[key]:true},merged={...latest,notified};settings.notified=notified;pruneHomeNotifications(merged);saveHomeSettings(merged)}return delivered}finally{homeAlertInFlight.delete(key)}}
function migrateLegacyHomeAlert(keyBase,stage,settings){if(!(settings.notified||{})[keyBase])return false;const selectedLead=Number(settings.leadMinutes),deliveredStage=HOME_ALERT_MILESTONES.includes(selectedLead)&&selectedLead>0?selectedLead:stage,latest=normalizedHomeSettings(),notified={...(latest.notified||{}),...(settings.notified||{}),[`${keyBase}|${deliveredStage}`]:true},merged={...latest,notified};delete notified[keyBase];settings.notified=notified;pruneHomeNotifications(merged);saveHomeSettings(merged);return deliveredStage===stage}
async function checkBossNotifications(settings,now,next){if(!settings.masterNotifications||!next)return false;const delta=next.date-now,keyBase=`boss|${next.date.toISOString()}`,stage=alertStage(settings,delta,keyBase);if(stage===null||migrateLegacyHomeAlert(keyBase,stage,settings))return false;const key=`${keyBase}|${stage}`,spawningNow=stage===0,warningMinutes=spawningNow?0:Math.max(1,Math.ceil(delta/60000));console.debug("[HomeBossNotify]",{bosses:next.bosses,spawnUtc:next.date.toISOString(),deltaMs:delta,milestoneMinutes:stage,warningMinutes,leadMinutes:settings.leadMinutes,serverTime:fmtSpawnDateTime(next,{...settings,showLocalTime:false}),localTime:fmtSpawnDateTime(next,{...settings,showLocalTime:true})});const title=spawningNow?`${next.bosses.join(" + ")} - Spawning Now`:`${next.bosses.join(" + ")} spawning soon`,message=spawningNow?`${fmtSpawnDateTime(next,settings)} - Spawning Now - ${HOME_TIMER_CONFIG.region}`:`${fmtSpawnDateTime(next,settings)} - ${warningMinutes} minute warning - ${HOME_TIMER_CONFIG.region}`,spoken=spawningNow?`${spokenBossList(next.bosses)} spawning now.`:`${spokenBossList(next.bosses)} spawning in ${alertLeadText(warningMinutes)}.`;return persistDeliveredHomeAlert(key,settings,()=>sendHomeAlert(title,message,spoken,settings))}
async function checkGuildBossNotifications(settings,now){if(!settings.masterNotifications||!settings.guildBossNotifications)return false;const target=guildBossTarget(now,true);if(!target)return false;const delta=target.date-now,keyBase=`guild|${target.date.toISOString()}`,stage=alertStage(settings,delta,keyBase);if(stage===null||migrateLegacyHomeAlert(keyBase,stage,settings))return false;const key=`${keyBase}|${stage}`,spawningNow=stage===0,warningMinutes=spawningNow?0:Math.max(1,Math.ceil(delta/60000));const title=spawningNow?"Guild bosses - Spawning Now":"Guild bosses spawning soon",message=spawningNow?`${guildBossDayName(target.day)} ${target.time} - Spawning Now - Weekly guild boss timer`:`${guildBossDayName(target.day)} ${target.time} - ${warningMinutes} minute warning - Weekly guild boss timer`,spoken=spawningNow?"Guild bosses spawning now.":`Guild bosses spawning in ${alertLeadText(warningMinutes)}.`;return persistDeliveredHomeAlert(key,settings,()=>sendHomeAlert(title,message,spoken,settings))}
function runBackgroundNotifications(){if(homeAlertRunPromise)return homeAlertRunPromise;const settings=normalizedHomeSettings(),now=new Date(),next=nextAlertableBossSpawn(settings,now);homeAlertRunPromise=Promise.all([checkBossNotifications(settings,now,next),checkGuildBossNotifications(settings,now)]).catch(error=>{console.warn("[HomeBossNotify] Background alert check failed",error)}).finally(()=>{homeAlertRunPromise=null});return homeAlertRunPromise}
window.__bdoRunBackgroundNotifications=runBackgroundNotifications;
function normalizeBossScheduleDashboard(data){
  if(!data||data.sourceTimeZone!=="Europe/Berlin"||!data.schedule||typeof data.schedule!=="object")return null;
  const schedule={},times=new Set(),bosses=new Set();
  for(const day of HOME_DAYS){
    const slots=data.schedule[day];
    if(!Array.isArray(slots))return null;
    const daySchedule={};
    for(const slot of slots){
      const time=String(slot?.time||"");
      if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)||!Array.isArray(slot?.bosses))return null;
      const names=slot.bosses.map(name=>String(name||"").trim()).filter(Boolean);
      daySchedule[time]=[...new Set([...(daySchedule[time]||[]),...names])];
      times.add(time);
      names.forEach(name=>bosses.add(name));
    }
    if(!Object.keys(daySchedule).length)return null;
    schedule[day]=daySchedule;
  }
  const sortedTimes=[...times].sort((a,b)=>{const [ah,am]=a.split(":").map(Number),[bh,bm]=b.split(":").map(Number);return ah*60+am-(bh*60+bm)});
  if(!sortedTimes.length||!bosses.size)return null;
  return {
    times:sortedTimes,
    schedule,
    bosses:[...bosses].sort((a,b)=>a.localeCompare(b)),
    source:String(data.source||"BDO Alerts"),
    status:String(data.status||"CACHED").toUpperCase(),
    fetchedAtUtc:data.fetchedAtUtc||null,
    contentHash:String(data.contentHash||""),
    message:data.message||null
  };
}
function applyBossScheduleDashboard(data){
  const normalized=normalizeBossScheduleDashboard(data);
  if(!normalized){
    if(homeBossScheduleState.status==="BUNDLED"){
      homeBossScheduleState={...homeBossScheduleState,status:String(data?.status||"BUNDLED").toUpperCase(),message:data?.message||"Using bundled EU schedule"};
    }
    updateBossScheduleStatus();
    return false;
  }
  const changed=normalized.contentHash!==homeBossScheduleState.contentHash;
  homeBossScheduleState=normalized;
  bossSpawnCache={mondayUtc:null,spawns:[]};
  bossScheduleRenderState={materializationKey:"",nextSpawnKey:""};
  if(changed)applyHomeSettings(normalizedHomeSettings());
  else updateBossScheduleStatus();
  return true;
}
async function refreshBossScheduleOnStartup(){
  if(bossScheduleSyncState.refreshing)return;
  bossScheduleSyncState.refreshing=true;
  try{applyBossScheduleDashboard(await bridgeCall("refreshBossSchedule"))}
  catch(error){console.warn("[BossSchedule] startup refresh failed",error);homeBossScheduleState={...homeBossScheduleState,message:homeBossScheduleState.status==="BUNDLED"?"Using bundled EU schedule - Sync unavailable":homeBossScheduleState.message};updateBossScheduleStatus()}
  finally{bossScheduleSyncState.refreshing=false}
}
async function initializeBossScheduleSync(){
  if(bossScheduleSyncState.initialized)return;
  bossScheduleSyncState.initialized=true;
  try{applyBossScheduleDashboard(await bridgeCall("initializeBossSchedule"))}
  catch(error){console.warn("[BossSchedule] cache load failed",error)}
  await refreshBossScheduleOnStartup();
}
function initializeHomeDashboard(){const settings=normalizedHomeSettings();applyHomeSettings(settings);initializeBossScheduleSync()}
homeEl.time12?.addEventListener("click",()=>{const s=normalizedHomeSettings();s.timeFormat="12";commitHomeSettings(s);NotificationService.ShowInfo("Boss schedule uses 12-hour time.","Home settings saved")});
homeEl.time24?.addEventListener("click",()=>{const s=normalizedHomeSettings();s.timeFormat="24";commitHomeSettings(s);NotificationService.ShowInfo("Boss schedule uses 24-hour time.","Home settings saved")});
homeEl.localTime?.addEventListener("change",()=>{const s=normalizedHomeSettings();s.showLocalTime=homeEl.localTime.checked;commitHomeSettings(s);NotificationService.ShowInfo(`Boss schedule uses ${s.showLocalTime?"local PC time":"EU server time"}.`,"Home settings saved")});
homeEl.master?.addEventListener("change",()=>{const s=normalizedHomeSettings();s.masterNotifications=homeEl.master.checked;commitHomeSettings(s);NotificationService.ShowInfo(`Boss desktop notifications ${s.masterNotifications?"enabled":"disabled"}.`,"Home settings saved")});
homeEl.lead?.addEventListener("change",()=>{const s=normalizedHomeSettings();s.leadMinutes=Number(homeEl.lead.value);commitHomeSettings(s);const milestones=HOME_ALERT_MILESTONES.filter(minutes=>minutes<=s.leadMinutes).sort((a,b)=>b-a).map(minutes=>minutes===0?"Spawning Now":`${minutes} minutes before spawn`);NotificationService.ShowInfo(`Boss alerts: ${milestones.join(", ")}.`,"Home settings saved")});
homeEl.sound?.addEventListener("change",()=>{const s=normalizedHomeSettings();s.soundEnabled=homeEl.sound.checked;commitHomeSettings(s);NotificationService.ShowInfo(`Notification sound ${s.soundEnabled?"enabled":"disabled"}.`,"Home settings saved")});
homeEl.tts?.addEventListener("change",()=>{const s=normalizedHomeSettings();s.ttsEnabled=homeEl.tts.checked;commitHomeSettings(s);NotificationService.ShowInfo(`TTS announcements ${s.ttsEnabled?"enabled":"disabled"}.`,"Home settings saved")});
homeEl.guildNotify?.addEventListener("change",()=>{const s=normalizedHomeSettings();s.guildBossNotifications=homeEl.guildNotify.checked;commitHomeSettings(s);NotificationService.ShowInfo(`Guild boss notifications ${s.guildBossNotifications?"enabled":"disabled"}.`,"Home settings saved")});
function setBossAlertTestStatus(message,state=""){if(!homeEl.footer)return;homeEl.footer.textContent=message;homeEl.footer.dataset.state=state}
async function runBossAlertTest(button,busyLabel,action,onSuccess){if(!button||button.disabled)return;const original=button.textContent;button.disabled=true;button.textContent=busyLabel;button.setAttribute("aria-busy","true");setBossAlertTestStatus(`${busyLabel}...`,"busy");try{const result=await action();const message=onSuccess(result);setBossAlertTestStatus(message,"success");NotificationService.ShowSuccess(message,"Boss alert test")}catch(error){const message=error.message||"The alert test failed.";setBossAlertTestStatus(message,"error");NotificationService.ShowError(message,"Boss alert test failed")}finally{button.disabled=false;button.textContent=original;button.removeAttribute("aria-busy")}}
homeEl.testTts?.addEventListener("click",()=>{const settings=normalizedHomeSettings(),next=nextAlertableBossSpawn(settings),spawningNow=settings.leadMinutes===0,text=next?(spawningNow?`${spokenBossList(next.bosses)} spawning now.`:`${spokenBossList(next.bosses)} spawning in ${alertLeadText(settings.leadMinutes)}.`):"Black Spirit Hub text to speech test.";runBossAlertTest(homeEl.testTts,"Speaking",()=>bridgeCall("speakText",{text}),()=>`TTS played successfully: ${text}`)});
homeEl.testAlarm?.addEventListener("click",()=>runBossAlertTest(homeEl.testAlarm,"Playing",()=>bridgeCall("playAlarmSound",{}),result=>`Alarm.mp3 is playing${result?.durationMilliseconds?` (${(result.durationMilliseconds/1000).toFixed(1)} seconds)`:``}.`));
function saveGuildBossSchedule(){persistSetting("guildBossDay",homeEl.guildBossDay?.value||"");persistSetting("guildBossTime",homeEl.guildBossTime?.value||"");persistSetting("guildBossAt","");updateGuildBossTimer();NotificationService.ShowInfo("Weekly guild boss timer saved.","Home settings saved")}
homeEl.guildBossDay?.addEventListener("change",saveGuildBossSchedule);
homeEl.guildBossTime?.addEventListener("change",saveGuildBossSchedule);
homeEl.toggles?.addEventListener("change",event=>{const input=event.target.closest("[data-boss-toggle]");if(!input)return;const s=normalizedHomeSettings();s.bosses[input.dataset.bossToggle]=input.checked;commitHomeSettings(s);NotificationService.ShowInfo(`${input.dataset.bossToggle} notifications ${input.checked?"enabled":"disabled"}.`,"Home settings saved")});
resetTimerEl.localTime?.addEventListener("change",()=>{const settings=normalizedResetSettings();settings.showLocalTime=resetTimerEl.localTime.checked;saveResetSettings(settings);renderResetTimers(settings);NotificationService.ShowInfo(`Reset timers now show ${settings.showLocalTime?"local PC time":"EU server time"}.`,"Reset timers saved")});

const GRIND_SPOTS=Array.isArray(window.BDO_GRIND_SPOTS)?window.BDO_GRIND_SPOTS:[];
const grindState={initialized:false,selectedSpotId:String(readSetting("grindTrackerSelectedSpot",GRIND_SPOTS[0]?.id||"")),marketRegion:"eu",priceCache:readSetting("grindTrackerMarketPriceCache",{}),loadingPrices:false,pricePromise:null,priceTimer:null};
let grindPickerReturnFocus=null;
const grindEl={spotDetail:document.getElementById("grindSpotDetail")};
const GRIND_GUIDES=window.BDO_GRIND_GUIDES?.guides&&typeof window.BDO_GRIND_GUIDES.guides==="object"?window.BDO_GRIND_GUIDES.guides:{};
const grindGuideToneLabels={trigger:"Start here",do:"Do this",watch:"Watch for",avoid:"Avoid"};
const grindGuideVisualLabels={"rotation-route":"Rotation route","rotation-sites":"Rotation sites","activation-map":"Activation map","activation-object":"Activation object","encounter-layout":"Encounter flow","zone-overview":"Zone overview"};
const grindGuideImagePattern=/^Assets\/GrindTracker\/guides\/[a-z0-9._-]+\.(?:png|jpe?g|webp)$/i;
function grindGuideForSpot(spot){return spot?GRIND_GUIDES[String(spot.id)]||null:null}
function grindRenderGuidePanel(spot){
  const guide=grindGuideForSpot(spot);
  if(!guide)return"";
  const steps=Array.isArray(guide.steps)?guide.steps.map(item=>{const tone=Object.prototype.hasOwnProperty.call(grindGuideToneLabels,item?.tone)?item.tone:"watch";return`<article class="grindMechanicCard tone-${tone}"><span>${escapeHtml(grindGuideToneLabels[tone])}</span><strong>${escapeHtml(item?.title||"")}</strong><p>${escapeHtml(item?.text||"")}</p></article>`}).join(""):"";
  const rotations=Array.isArray(guide.rotations)?guide.rotations.map(item=>{const title=escapeHtml(item?.title||"Rotation reference"),caption=escapeHtml(item?.caption||""),kind=Object.prototype.hasOwnProperty.call(grindGuideVisualLabels,item?.visualKind)?item.visualKind:"rotation-route",kindLabel=escapeHtml(grindGuideVisualLabels[kind]);if(grindGuideImagePattern.test(String(item?.image||"")))return`<button class="grindRotationCard" type="button" data-grind-guide-image="${escapeHtml(item.image)}" data-grind-guide-title="${title}" data-grind-guide-caption="${caption}"><img src="${escapeHtml(item.image)}" loading="lazy" alt="${title}"><span><em>${kindLabel}</em><strong>${title}</strong><small>${caption}</small><b>View full image</b></span></button>`;return`<article class="grindRotationNote"><span aria-hidden="true">&#8635;</span><div><em>${kindLabel}</em><strong>${title}</strong><p>${caption}</p></div></article>`}).join(""):"";
  return`<section class="grindGuidePanel" aria-label="Mechanics and rotations"><div class="grindGuideHead"><div><span>Zone guide</span><h3>Mechanics &amp; Rotations</h3></div></div><p class="grindGuideSummary">${escapeHtml(guide.summary||"")}</p><div class="grindMechanicGrid">${steps}</div>${rotations?`<div class="grindRotationSection"><div class="grindRotationHead"><span>Route reference</span><h4>Rotations &amp; Activation Points</h4></div><div class="grindRotationGrid">${rotations}</div></div>`:""}</section>`;
}
const GRIND_PRICE_REFRESH_MS=24*60*60*1000;
const GRIND_PRICE_RETRY_MS=30*60*1000;
const GRIND_PRICE_CACHE_VERSION=16;
const GRIND_PRICE_CHUNK_SIZE=80;
const GRIND_PRICE_CHUNK_DELAY_MS=0;
const GRIND_FIXED_ITEM_PRICES={"5960":500,"44181":504,"44194":800,"44266":7500,"44267":15000,"44304":50000,"44305":50000,"44306":50000,"44311":50000,"44378":2100,"44400":15500,"44411":35000,"44423":8000,"44446":15000,"44448":15000,"44450":38000,"44451":15000,"44454":18000,"44455":12000,"44456":107000,"44476":4520,"44477":1820,"44482":18500,"44484":16000,"44485":17000,"44486":18000,"44487":17500,"44488":16000,"44489":19000,"44490":20140,"44495":24350,"44496":5620,"44516":25120,"44518":52500,"44519":117700,"44520":39000,"44521":40000,"44522":32950,"44523":16990,"44524":38800,"44525":35880,"45981":16100,"56322":52500,"56323":117700,"56327":52571,"56328":20520,"56329":59415,"56334":96040,"56338":59415,"59797":18575,"59798":96750,"59799":20000,"59800":26190,"59801":17520,"59802":25207,"59826":4902,"59827":5960,"59828":57777,"59880":25190,"65328":35100,"65329":32900,"65330":45570,"65397":34270,"65398":31500,"65399":30900,"65400":32900,"dehkia-mirumok-tainted-wood-fragment":101500,"tainted-bronze-fragment":125900,"stars-end-corrupted-sanguine-crystal":155000,"sycraia-upper-destroyed-ancient-weapon-power-stone":2350,"sycraia-underwater-ancient-weapon-power-stone":18000,"hoof-of-forest-ronaros":13490,"edania-ancient-soldier-fragment":147630,"edania-lightlost-core":140600,"edania-chilled-soul-piece":105640,"edania-contaminated-coral-piece":116200,"edania-hardened-lava-chunk":126980,"edania-tainted-armor-fragment":100507,"origin-of-corruption":3000000000};
const GRIND_MARKET_ITEM_ID_OVERRIDES={"corrupted-gluttony-crystal":15741,"gluttony-crystal":821344,"edania-refined-essence-of-devouring":767338,"edania-refined-origin-of-hunger":767337,"edania-crimson-primordial-pigment-sovereign":767293,"edania-violet-primordial-pigment-sovereign":767294,"edania-violet-primordial-pigment-edana":767296,"edania-crimson-primordial-luster-sovereign":821341,"edania-violet-primordial-luster-sovereign":821342,"edania-violet-primordial-luster-edana":821343,"corrupt-oil-of-immortality":1178};
Object.assign(GRIND_FIXED_ITEM_PRICES,{"44300":3000,"44322":1000,"44324":12000,"44425":1750,"44426":1925,"44427":1820,"44428":1890,"44429":2030,"44431":2100,"44432":2100,"44434":3150,"44435":2120,"44436":3000,"44437":3240,"44438":3600,"44439":3000,"44440":3445,"44442":4320,"44443":8800,"44494":9870,"faded-dark-energy":597680,"edania-primordial-fragment":30000000,"edania-won-crystal-of-ruin":5000000,"edania-bon-crystal-of-ruin":7000000,"edania-jin-crystal-of-ruin":8000000,"edania-han-crystal-of-ruin":10000000,"edania-won-crystal-of-dusky-ruin":500000000,"edania-bon-crystal-of-dusky-ruin":700000000,"edania-jin-crystal-of-dusky-ruin":800000000,"edania-han-crystal-of-dusky-ruin":1000000000});
Object.assign(GRIND_FIXED_ITEM_PRICES,{"mossy-ancient-ruins-fragment":10000,"great-marnis-stone-forest-ronaros":2000000,"8126":3000000,"8133":10000000,"15668":1000000,"6393":100000,"6399":100000,"6400":100000,"8124":3000000,"8129":3000000,"8135":100000,"8145":100000,"40968":100000,"44243":30000,"44284":30000,"44350":50000,"44383":1000000,"44405":100000,"65770":30000,"65780":30000,"721002":3000,"721044":30000000,"752023":51000,"757451":16400,"757452":18000,"757454":13200,"757455":14800,"757460":16000,"757470":17800,"757471":19400,"757473":16000,"820040":50000});
Object.assign(GRIND_FIXED_ITEM_PRICES,{"767350":165508});
Object.assign(GRIND_FIXED_ITEM_PRICES,{"15294":1200000000,"15295":1500000000,"15296":1700000000,"15297":2000000000,"821430":12000000,"821431":15000000,"821432":17000000,"821433":20000000,"980127":155127,"980128":160539,"980129":181042,"980130":186458,"980131":182049,"980132":196501,"980139":3000000000,"980140":3100000000,"980141":3200000000,"980142":3300000000,"980143":4000000000});
const GRIND_REFERENCE_FALLBACK_ITEM_PRICES={"980115":9350000000,"980116":93500000};
delete GRIND_FIXED_ITEM_PRICES["5960"];
Object.assign(GRIND_MARKET_ITEM_ID_OVERRIDES,{"edania-distorted-fragment-of-origin":821317,"edania-silent-fragment-of-origin":821318,"edania-crystallized-energy-of-endtimes":821252,"edania-distorted-crystal-of-origin":761802,"edania-silent-crystal-of-origin":761803,"edania-herald-s-crystal":821250,"edania-flawless-herald-s-crystal":821251,"imperfect-lightstone-of-earth":766105,"imperfect-lightstone-of-wind":766106,"sycraia-shard":821347});
const GRIND_NO_VALUE_ITEM_IDS=new Set(["ancient-creatures-scale","edania-deboreka-accessories","any-artifact","faint-sycraia-s-memory","gentle-sycraia-s-memory","intense-sycraia-s-memory","radiant-sycraia-s-memory","sycraia-underwater-ruins-paint","al-yurads-ring-piece","marnis-research-box","sycrids-scale-piece","void-tainted-whispers","752530","66108","66106","66107","40760","65778","65331","65332","15713","8958","8956","8957","8959","40709","40758","66945","56335","56505","8428","44799","40708","40756","44501","40706","40762","40711","40752","65327","56284","45017","45013","45018","45014"]);
GRIND_NO_VALUE_ITEM_IDS.add("761726");
const GRIND_UNMARKETABLE_ITEM_IDS=new Set(["821461","821462","821463","821464"]);
function grindNormalizeItemName(value){return String(value||"").toLowerCase().replace(/\[[^\]]+\]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function grindAllDrops(){const map=new Map();GRIND_SPOTS.forEach(spot=>(spot.drops||[]).forEach(drop=>{if(!map.has(String(drop.id)))map.set(String(drop.id),drop)}));return[...map.values()]}
function grindDropHasNoValue(drop){const id=String(drop?.id||""),name=String(drop?.name||"");return GRIND_NO_VALUE_ITEM_IDS.has(id)||/^event-/i.test(id)||/\[event\]/i.test(name)}
function grindDropIsUnmarketable(drop){return GRIND_UNMARKETABLE_ITEM_IDS.has(String(drop?.id||""))}
function grindDropMarketId(drop){const id=String(drop?.id||"");if(!id||grindDropHasNoValue(drop)||grindDropIsUnmarketable(drop)||Object.prototype.hasOwnProperty.call(GRIND_FIXED_ITEM_PRICES,id))return"";if(/^\d+$/.test(id))return id;return GRIND_MARKET_ITEM_ID_OVERRIDES[id]?String(GRIND_MARKET_ITEM_ID_OVERRIDES[id]):""}
function grindMarketItemIds(){return[...new Set(grindAllDrops().map(grindDropMarketId).filter(Boolean).map(Number))]}
function grindMarketDropsForSpot(spotId){const spot=grindSpotById(spotId);return(spot?.drops||[]).filter(drop=>grindDropMarketId(drop))}
function grindMarketItemIdsForSpot(spotId){return[...new Set(grindMarketDropsForSpot(spotId).map(grindDropMarketId).filter(Boolean).map(Number))]}
function grindEnsurePriceNameIndex(cache){if(!cache.priceNames||typeof cache.priceNames!=="object")cache.priceNames={};Object.values(cache.prices||{}).forEach(record=>{const key=grindNormalizeItemName(record?.name);if(key&&record?.itemId&&!cache.priceNames[key])cache.priceNames[key]=String(record.itemId)});return cache.priceNames}
function grindRegionPriceCache(region=grindState.marketRegion){const cache=grindState.priceCache&&typeof grindState.priceCache==="object"?grindState.priceCache:{};const normalized="eu";if(cache.na)delete cache.na;if(!cache[normalized]||typeof cache[normalized]!=="object")cache[normalized]={updatedAt:"",attemptedAt:"",prices:{},priceNames:{},message:"",version:GRIND_PRICE_CACHE_VERSION};if(cache[normalized].version!==GRIND_PRICE_CACHE_VERSION){cache[normalized].updatedAt="";cache[normalized].attemptedAt="";cache[normalized].version=GRIND_PRICE_CACHE_VERSION}if(!cache[normalized].prices||typeof cache[normalized].prices!=="object")cache[normalized].prices={};grindEnsurePriceNameIndex(cache[normalized]);grindState.priceCache=cache;grindState.marketRegion="eu";return cache[normalized]}
function grindPersistPriceCache(){persistSetting("grindTrackerMarketPriceCache",grindState.priceCache)}
function grindCachedMarketPrice(id,region=grindState.marketRegion){const cache=grindRegionPriceCache(region);return cache.prices?.[String(id)]||null}
function grindCachedMarketPriceByName(name,region=grindState.marketRegion){const cache=grindRegionPriceCache(region),key=grindNormalizeItemName(name),itemId=key?cache.priceNames?.[key]:"";return itemId?cache.prices?.[String(itemId)]||null:null}
function grindPriceRecordForDrop(drop,region=grindState.marketRegion){const id=String(drop?.id||"");if(grindDropHasNoValue(drop)||grindDropIsUnmarketable(drop))return null;if(Object.prototype.hasOwnProperty.call(GRIND_FIXED_ITEM_PRICES,id))return{itemId:id,price:Number(GRIND_FIXED_ITEM_PRICES[id])||0,source:"fixed-vendor",capturedUtc:"",region:"fixed"};const marketId=grindDropMarketId(drop),cached=marketId?grindCachedMarketPrice(marketId,region):null;if(cached&&Number(cached.price)>0)return cached;const byName=grindCachedMarketPriceByName(drop?.name,region);if(byName&&Number(byName.price)>0)return byName;if(Object.prototype.hasOwnProperty.call(GRIND_REFERENCE_FALLBACK_ITEM_PRICES,id))return{itemId:id,price:Number(GRIND_REFERENCE_FALLBACK_ITEM_PRICES[id])||0,source:"reference-fallback",capturedUtc:"",region:"reference"};return null}
function grindDropPriceText(drop){if(grindDropHasNoValue(drop))return"";const record=grindPriceRecordForDrop(drop);if(record&&Number(record.price)>0)return grindFormatSilver(record.price);return""}
function grindDropPriceClass(drop){return grindPriceRecordForDrop(drop)?"grindPriceLine":"grindPriceLine pending"}
function grindDropPriceLine(drop){if(grindDropHasNoValue(drop))return"";if(grindDropIsUnmarketable(drop))return'<span class="grindPriceLine pending">Not listed on Central Market</span>';const text=grindDropPriceText(drop);return`<span class="${grindDropPriceClass(drop)}">${escapeHtml(text||"Price unavailable")}</span>`}
function grindUpdateMarketRegionButtons(){grindState.marketRegion="eu";persistSetting("grindTrackerMarketRegion","eu");document.querySelectorAll("[data-grind-market-region]").forEach(button=>button.classList.toggle("active",(button.dataset.grindMarketRegion||"eu")==="eu"))}
function grindPriceCacheFresh(region=grindState.marketRegion){const cache=grindRegionPriceCache(region),updated=Date.parse(cache.updatedAt||""),ids=grindMarketItemIds(),complete=ids.length>0&&ids.every(id=>Number(cache.prices?.[String(id)]?.price)>0||Object.prototype.hasOwnProperty.call(GRIND_REFERENCE_FALLBACK_ITEM_PRICES,String(id)));return complete&&Number.isFinite(updated)&&Date.now()-updated<GRIND_PRICE_REFRESH_MS}
function grindPriceAttemptFresh(region=grindState.marketRegion){if(grindPriceCacheFresh(region))return true;const attempted=Date.parse(grindRegionPriceCache(region).attemptedAt||"");return Number.isFinite(attempted)&&Date.now()-attempted<GRIND_PRICE_RETRY_MS}
function grindDelay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function grindFetchMarketPrices(itemIds,{force=false,silent=true}={}){
  const ids=[...new Set((itemIds||[]).map(Number).filter(id=>Number.isFinite(id)&&id>0))];
  if(!ids.length)return null;
  const requestedRegion="eu",cache=grindRegionPriceCache(requestedRegion);
  if(!force&&grindPriceAttemptFresh(requestedRegion))return cache;
  if(grindState.loadingPrices)return grindState.pricePromise||cache;

  grindState.marketRegion="eu";
  grindState.loadingPrices=true;
  grindState.priceProgress={done:0,total:ids.length};
  cache.attemptedAt=new Date().toISOString();
  grindPersistPriceCache();

  grindState.pricePromise=(async()=>{
    const everyMarketId=grindMarketItemIds(),isCompleteCatalogRefresh=ids.length===everyMarketId.length&&everyMarketId.every(id=>ids.includes(id));
    const refreshedIds=new Set();
    let savedPrices=0,lastMessage="",latestCapturedUtc="";
    try{
      for(let index=0;index<ids.length;index+=GRIND_PRICE_CHUNK_SIZE){
        const chunk=ids.slice(index,index+GRIND_PRICE_CHUNK_SIZE);
        try{
          const data=await bridgeCall("getGrindMarketPrices",{region:requestedRegion,itemIds:chunk});
          const target=grindRegionPriceCache("eu"),returnedPrices=Array.isArray(data?.prices)?data.prices:[];
          returnedPrices.forEach(price=>{
            const returnedId=Number(price?.itemId);
            if(!Number.isFinite(returnedId)||!chunk.includes(returnedId)||!Number(price.price))return;
            const record={
              itemId:String(price.itemId),
              enhancement:Number(price.enhancement)||0,
              name:String(price.name||""),
              price:Number(price.price)||0,
              lowestListedPrice:price.lowestListedPrice??null,
              basePrice:price.basePrice??null,
              lastSoldPrice:price.lastSoldPrice??null,
              stock:price.stock??null,
              tradeCount:price.tradeCount??null,
              source:String(price.source||"market"),
              capturedUtc:price.capturedUtc||data.capturedUtc||new Date().toISOString(),
              region:"eu"
            };
            savedPrices++;
            refreshedIds.add(returnedId);
            target.prices[record.itemId]=record;
            if(record.capturedUtc&&(!latestCapturedUtc||Date.parse(record.capturedUtc)>Date.parse(latestCapturedUtc)))latestCapturedUtc=record.capturedUtc;
            const nameKey=grindNormalizeItemName(record.name);
            if(nameKey)target.priceNames[nameKey]=record.itemId;
          });
          target.attemptedAt=new Date().toISOString();
          target.message=String(data?.message||"");
          lastMessage=target.message;
          grindPersistPriceCache();
          if(!returnedPrices.length&&!savedPrices)break;
        }catch(error){
          console.warn("[GrindTracker] market price chunk failed",error);
          lastMessage=error.message||"Could not refresh the market cache.";
          break;
        }
        grindState.priceProgress.done=Math.min(ids.length,index+chunk.length);
        if(index+GRIND_PRICE_CHUNK_SIZE<ids.length&&GRIND_PRICE_CHUNK_DELAY_MS>0)await grindDelay(GRIND_PRICE_CHUNK_DELAY_MS);
      }
      const target=grindRegionPriceCache(requestedRegion);
      if(isCompleteCatalogRefresh&&ids.every(id=>refreshedIds.has(id)||Object.prototype.hasOwnProperty.call(GRIND_REFERENCE_FALLBACK_ITEM_PRICES,String(id))))target.updatedAt=latestCapturedUtc||new Date().toISOString();
      target.attemptedAt=new Date().toISOString();
      if(!silent)NotificationService.ShowInfo(savedPrices?`Cached ${savedPrices} market price${savedPrices===1?"":"s"}.`:lastMessage||"Market refresh attempted. Cached and fixed values remain available.","Grind market prices");
      return target;
    }catch(error){
      console.warn("[GrindTracker] market price refresh failed",error);
      if(!silent)NotificationService.ShowWarning(error.message||"Could not refresh market prices. Cached and fixed values remain available.","Grind market prices");
      return cache;
    }
  })();

  try{
    return await grindState.pricePromise;
  }finally{
    grindState.loadingPrices=false;
    grindState.pricePromise=null;
    grindState.priceProgress=null;
    grindRender();
  }
}
function grindRefreshMarketPrices(options={}){const region="eu",next={...options};grindState.marketRegion="eu";if(next.silent===false&&!grindPriceCacheFresh(region))next.force=true;return grindFetchMarketPrices(grindMarketItemIds(),next)}
function grindSchedulePriceRefresh(){clearInterval(grindState.priceTimer);grindState.priceTimer=setInterval(()=>grindRefreshMarketPrices({force:false,silent:true}),GRIND_PRICE_REFRESH_MS);if(!grindPriceAttemptFresh())setTimeout(()=>grindRefreshMarketPrices({force:false,silent:true}),900)}
function grindEnsureMarketPricesForSpot(spotId){const ids=grindMarketItemIdsForSpot(spotId),missing=ids.filter(id=>!grindCachedMarketPrice(id)&&!Object.prototype.hasOwnProperty.call(GRIND_REFERENCE_FALLBACK_ITEM_PRICES,String(id)));return missing.length?grindFetchMarketPrices(missing,{force:true,silent:true}):Promise.resolve(grindRegionPriceCache())}
function grindSpotById(id){return GRIND_SPOTS.find(spot=>String(spot.id)===String(id))||GRIND_SPOTS[0]||null}
function grindFormatSilver(value){const n=Number(value)||0,abs=Math.abs(n),sign=n<0?"-":"";if(abs>=1e12)return`${sign}${(abs/1e12).toFixed(abs>=10e12?1:2)}T`;if(abs>=1e9)return`${sign}${(abs/1e9).toFixed(abs>=10e9?1:2)}B`;if(abs>=1e6)return`${sign}${(abs/1e6).toFixed(abs>=10e6?1:2)}M`;return`${sign}${Math.round(abs).toLocaleString()}`}
function grindEmpty(message){return`<div class="grindEmpty">${escapeHtml(message)}</div>`}
function grindLootColor(drop){if(drop.isTrash)return"#fbbf24";const grade=Number(drop.grade);return grade>=4?"#f97316":grade===3?"#a78bfa":grade===2?"#60a5fa":grade===1?"#34d399":"#cbd5e1"}
function initializeGrindTracker(){
  const view=document.getElementById("grindTrackerView");
  if(!view)return;
  grindState.marketRegion="eu";
  persistSetting("grindTrackerMarketRegion","eu");
  grindUpdateMarketRegionButtons();
  grindSchedulePriceRefresh();
  if(!grindState.powerMode)grindState.powerMode=readSetting("grindTrackerPowerMode","recommended");
  if(typeof grindState.pickerSearch!=="string")grindState.pickerSearch="";
  if(!GRIND_SPOTS.some(spot=>String(spot.id)===String(grindState.selectedSpotId))&&GRIND_SPOTS[0])grindState.selectedSpotId=String(GRIND_SPOTS[0].id);
  if(!grindState.initialized){
    grindState.initialized=true;
    let pickerSearchTimer=null;
    document.querySelectorAll("[data-grind-market-region]").forEach(button=>button.addEventListener("click",()=>{
      grindState.marketRegion="eu";
      persistSetting("grindTrackerMarketRegion","eu");
      grindUpdateMarketRegionButtons();

      grindRender();
      grindRefreshMarketPrices({force:false,silent:false});
    }));
    document.querySelectorAll("[data-grind-power-mode]").forEach(button=>button.addEventListener("click",()=>{
      grindState.powerMode=button.dataset.grindPowerMode||"recommended";
      persistSetting("grindTrackerPowerMode",grindState.powerMode);
      grindRenderSpotPicker();
    }));
    document.getElementById("grindChangeZone")?.addEventListener("click",grindOpenSpotPicker);
    document.getElementById("grindSpotPickerClose")?.addEventListener("click",()=>grindCloseSpotPicker());
    document.getElementById("grindSpotPickerSearch")?.addEventListener("input",event=>{
      clearTimeout(pickerSearchTimer);
      pickerSearchTimer=setTimeout(()=>{grindState.pickerSearch=event.target.value||"";grindRenderSpotPicker()},100);
    });
    document.getElementById("grindSpotPicker")?.addEventListener("click",event=>{if(event.target.id==="grindSpotPicker")grindCloseSpotPicker()});
    view.addEventListener("click",event=>{
      const picker=event.target.closest("[data-grind-picker-spot]");
      if(picker)grindSelectSpot(picker.dataset.grindPickerSpot);
    });
    view.addEventListener("error",event=>{
      const image=event.target.closest?.("img[data-grind-fallback-icon]");
      if(!image)return;
      const fallback=image.dataset.grindFallbackIcon;
      if(fallback){image.dataset.grindFallbackIcon="";image.src=fallback}
      else image.hidden=true;
    },true);
  }
  grindRender();
  grindOpenSpotPicker();
}
function grindNormalizeName(value){return String(value||"").toLowerCase().replace(/[\[\]'()]/g," ").replace(/[^a-z0-9]+/g," ").trim()}
function grindTrashDrop(spot){const drops=Array.isArray(spot?.drops)?spot.drops:[],trashId=String(spot?.trashId||""),primary=String(spot?.primaryTrash||"").trim().toLowerCase();return drops.find(drop=>trashId&&String(drop.id)===trashId)||drops.find(drop=>primary&&String(drop.name||"").trim().toLowerCase()===primary)||drops.find(drop=>drop.isTrash)||drops[0]||null}
const grindCcIconMap={stiffness:"Assets/GrindTracker/cc/stiffness.png",stun:"Assets/GrindTracker/cc/stun.png",freeze:"Assets/GrindTracker/cc/freeze.png",knockdown:"Assets/GrindTracker/cc/knockdown.png",bound:"Assets/GrindTracker/cc/bound.png",knockback:"Assets/GrindTracker/cc/knockback.png",float:"Assets/GrindTracker/cc/float.png"};
const grindCcLabels={stiffness:"Stiffness",stun:"Stun",freeze:"Freeze",knockdown:"Knockdown",bound:"Bound",knockback:"Knockback",float:"Float"};
const grindCcOrder=["stiffness","stun","freeze","knockdown","bound","knockback","float"];
const grindResistanceCrystalGroups=[
  {ccs:["knockdown","bound"],label:"Knockdown / Bound",effect:"Knockdown / Bound Resistance +25%",primary:{name:"Sycraia Crystal - Adamantine",icon:"Assets/GrindTracker/icons-clean/bdfoundry-15742.png"},fallback:{name:"Ancient Magic Crystal of Nature - Adamantine",icon:"Assets/GrindTracker/icons-clean/bdfoundry-ancient-nature.webp"}},
  {ccs:["knockback","float"],label:"Knockback / Floating",effect:"Knockback / Floating Resistance +25%",primary:{name:"Sycraia Crystal - Fighting Spirit",icon:"Assets/GrindTracker/icons-clean/bdfoundry-15743.png"},fallback:{name:"Ancient Magic Crystal of Nature - Fighting Spirit",icon:"Assets/GrindTracker/icons-clean/bdfoundry-ancient-nature.webp"}},
  {ccs:["stun","stiffness","freeze"],label:"Stun / Stiffness / Freezing",effect:"Stun / Stiffness / Freezing Resistance +25%",primary:{name:"Sycraia Crystal - Giant",icon:"Assets/GrindTracker/icons-clean/bdfoundry-15744.png"},fallback:{name:"Ancient Magic Crystal of Nature - Giant",icon:"Assets/GrindTracker/icons-clean/bdfoundry-ancient-nature.webp"}}
];
const grindSpotCcOverrides={"dark energy floodlands":["knockdown","bound"],"zephyros castle":["knockdown","bound"],"tenebraum castle":["knockdown","bound"],"orbita castle":["knockdown","bound"],"aetherion castle":["stun","stiffness","freeze"],"nymphamar castle":["stun","stiffness","freeze"],"stars end":["stiffness","stun","freeze"],"star s end":["stiffness","stun","freeze"],"sycraia abyssal ruins lower":["knockback","float"],"old sycraia lower":["knockdown","bound"],"hystria ruins":["knockback","float"],"aakman temple":["knockdown","bound"],"dehkia hystria ruins":["knockback","float"],"dehkia aakman temple":["knockdown","bound"],"dehkia cyclops land":["knockback","float"],"dehkia cadry ruins":["stun","stiffness","freeze"],"dehkia crescent shrine":["knockdown","bound"],"dehkia ash forest":["knockdown","bound"],"dehkia 2 ash forest":["knockdown","bound"],"dehkia tunkuta":["knockdown","bound"],"dehkia thornwood forest":["knockback","knockdown"],"dehkia olun s valley":["knockdown","bound"],"dehkia 2 olun s valley":["knockdown","bound"],"gyfin rhasia underground":["knockdown","bound"],"olun s valley":["knockdown","bound"],"crypt of resting thoughts":["stun","stiffness","freeze"],"orcs camp":["stun","stiffness","freeze"],"orc camp":["stun","stiffness","freeze"],"bloody monastery":["stun","stiffness","freeze"],"biraghi den":["stun","stiffness","freeze"],"swamp fogan habitat":["stun","stiffness","freeze"],"swamp naga habitat":["stun","stiffness","freeze"],"saunil camp":["knockdown","bound"],"centaurus herd":["knockdown","bound"],"cadry ruins":["stun","stiffness","freeze"],"crescent shrine":["knockdown","bound"],"bashim base":[],"desert naga temple":[],"tshira ruins":["knockdown","bound"],"roud sulfur mine":["knockback","float"],"pila ku jail":["knockdown","bound"],"basilisk den":["knockback","float"],"traitor s graveyard":[],"gahaz bandit s lair":["stun","stiffness","freeze"],"zephyros dark energy floodlands":["knockdown","bound"],"orbita dark energy floodlands":["knockdown","bound"],"great red sea dark energy floodlands":["knockdown","bound"]};
const grindMaxCapOverrides={"stars end":[1950,800],"star s end":[1950,800],"zephyros castle":[2010,800],"sycraia abyssal ruins lower":[1935,800],"old sycraia lower":[800,290],"tenebraum castle":[1920,760],"dark energy floodlands":[1880,760],"orbita castle":[1800,740],"aetherion castle":[1595,615],"nymphamar castle":[1690,720],"elvia orzekea":[1595,700],"dehkia gyfin rhasia temple upper":[1680,715],"dehkia mirumok ruins":[1595,615],"dehkia 2 ash forest":[1540,540],"dehkia 2 olun s valley":[1490,540],"dokkebi forest":[1445,530],"fortunate golden pig cave":[1490,660],"unlucky golden pig cave":[1540,670],"yzrahid highlands":[1180,460],"quint hill":[1295,440],"hexe sanctuary":[1130,430],"dehkia thornwood forest":[1180,440],"dehkia cadry ruins":[1395,440],"dehkia cyclops land":[1180,440],"dehkia crescent shrine":[1350,440],"dehkia ash forest":[1350,440],"city of the dead":[1295,410],"dehkia tunkuta":[1180,440],"dehkia roud sulfur mine":[1130,440],"dehkia hystria ruins":[1130,440],"dehkia aakman temple":[1130,440],"dehkia pila ku jail":[1130,440],"sycraia abyssal ruins upper":[1130,440],"ash forest":[1130,430],"gyfin rhasia underground":[1030,410],"jade starlight forest":[950,370],"honglim base":[950,390],"crypt of resting thoughts":[1130,440],"olun s valley":[1030,410],"primal giant post":[1000,410],"swamp fogan habitat":[803,290],"winter tree fossil 280ap":[856,370],"winter tree fossil 280":[856,370],"orc camp":[856,350],"orcs camp":[856,350],"rhutum outstation":[835,380],"altar imp habitat":[753,280],"swamp naga habitat":[803,290],"saunil camp":[813,330],"biraghi den":[753,280],"murrowak s labyrinth":[856,370],"bloody monastery":[856,350],"tunkuta":[825,340],"sherekhan night":[480,170],"abandoned monastery":[856,370],"gyfin rhasia temple":[825,280],"crescent shrine":[245,125],"blood wolf settlement":[312,150],"thornwood forest":[756,280],"waragon nest":[250,160],"padix island":[825,340],"kratuga ancient ruins":[756,250],"vessel of inquisition pillars":[800,280],"castle ruins":[774,280],"polly s forest":[255,180],"mirumok ruins":[560,220],"fadus habitat":[280,140],"sherekhan day":[365,170],"vessel of inquisition":[800,280],"tooth fairy forest":[410,220],"centaurus herd":[312,145],"cadry ruins":[245,125],"gahaz bandit s lair":[245,140],"aakman temple":[600,250],"hystria ruins":[756,250],"protty cave":[280,145],"desert naga temple":[213,140],"bashim base":[213,140],"tshira ruins":[245,125],"roud sulfur mine":[365,180],"pila ku jail":[365,180],"basilisk den":[320,160],"traitor s graveyard":[255,250],"zephyros dark energy floodlands":[1880,760],"orbita dark energy floodlands":[1880,760],"great red sea dark energy floodlands":[1880,760]};
grindSpotCcOverrides["gavinya coastal cliff"]=["knockdown","bound"];
grindMaxCapOverrides["gavinya coastal cliff"]=[2020,820];
grindSpotCcOverrides["sycraia ruins lower zone"]=["knockback","float"];
grindMaxCapOverrides["sycraia ruins lower zone"]=[1935,800];
grindSpotCcOverrides["orzekea"]=["knockback","float"];
grindMaxCapOverrides["orzekea"]=[1595,700];
Object.assign(grindSpotCcOverrides,{"aphrodon temple":["knockdown","bound"],"hermesia inner castle":["knockback","float"],"magaia temple":["stun","stiffness","freeze"],"aresion temple":["knockdown","bound"],"scales of judgment":["stun","stiffness","freeze"],"event horizon":["stun","stiffness","freeze"]});
Object.assign(grindMaxCapOverrides,{"aphrodon temple":[2090,810],"hermesia inner castle":[2220,830],"magaia temple":[2340,840],"aresion temple":[2455,850],"scales of judgment":[2455,860],"event horizon":[2570,870]});
function grindMonsterMeta(spot){const type=String(spot?.type||"normal").toLowerCase();const map={human:["Human","monster-human.png"],demi:["Demihuman","monster-demi.png"],kama:["Kama","monster-kama.png"],edania:["Edania","monster-edania.png"],normal:["Normal","monster-normal.png"]};const key=type in map?type:"normal",data=map[key];return{type:key,label:data[0],icon:`Assets/GrindTracker/icons-clean/${data[1]}`}}
function grindSpotCcs(spot){const key=grindNormalizeName(spot?.name);if(Object.prototype.hasOwnProperty.call(grindSpotCcOverrides,key))return grindSpotCcOverrides[key];const type=String(spot?.type||"normal").toLowerCase();let effects=type==="human"?["stun","stiffness","freeze"]:type==="kama"?["knockdown","bound"]:type==="demi"?["knockdown","bound"]:type==="edania"?["knockdown","bound"]:["knockback","float"];return grindCcOrder.filter(item=>effects.includes(item))}
grindSpotCcOverrides["dehkia thornwood forest"]=["knockback","float"];
function grindResistanceRecommendations(spot){const ccs=new Set(grindSpotCcs(spot));return grindResistanceCrystalGroups.filter(group=>group.ccs.some(cc=>ccs.has(cc)))}
function grindRenderResistancePanel(spot){
  const recommendations=grindResistanceRecommendations(spot);
  const cards=recommendations.map(group=>`<article class="grindResistanceCard"><div class="grindResistancePrimary"><img src="${escapeHtml(group.primary.icon)}" data-grind-fallback-icon="${escapeHtml(group.fallback.icon)}" alt="${escapeHtml(group.primary.name)}"><div><span class="grindResistanceCc">For ${escapeHtml(group.label)}</span><strong>${escapeHtml(group.primary.name)}</strong><small>${escapeHtml(group.effect)} <b>&bull; Extra AP Against Monsters +4</b></small></div></div><div class="grindResistanceFallback"><img src="${escapeHtml(group.fallback.icon)}" data-grind-fallback-icon="" alt="${escapeHtml(group.fallback.name)}"><div><span>Alternative</span><strong>${escapeHtml(group.fallback.name)}</strong><small>${escapeHtml(group.effect)}</small></div></div></article>`).join("");
  return`<section class="grindResistancePanel" aria-label="Recommended resistance crystals"><div class="grindResistanceHead"><div><span>Survival setup</span><h3>Recommended Resistance Crystals</h3></div><p>Use the resistance that matches this zone's listed crowd control.</p></div><div class="grindResistanceGrid">${cards||`<div class="grindResistanceEmpty"><strong>No specific resistance crystal required</strong><span>This zone has no dangerous crowd-control type listed.</span></div>`}</div></section>`;
}
function grindRecommendedPower(spot){return{ap:Number(spot?.ap)||0,dp:Number(spot?.dp)||0,label:"Recommended"}}
function grindMaxPower(spot){const key=grindNormalizeName(spot?.name),override=grindMaxCapOverrides[key];if(override)return{ap:override[0],dp:override[1],label:"Max"};const ap=Number(spot?.ap)||0,dp=Number(spot?.dp)||0;return{ap:ap?Math.round(ap*3.2):0,dp:dp?Math.round(dp*1.15):0,label:"Max est."}}
function grindPowerForSpot(spot){return grindState.powerMode==="max"?grindMaxPower(spot):grindRecommendedPower(spot)}
function grindPowerText(spot){const power=grindPowerForSpot(spot);return`${power.ap?power.ap.toLocaleString():"-"} AP | ${power.dp?power.dp.toLocaleString():"-"} DP`}
function grindOpenSpotPicker(){
  grindPickerReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  grindState.pickerSearch="";
  const search=document.getElementById("grindSpotPickerSearch"),picker=document.getElementById("grindSpotPicker"),list=document.getElementById("grindSpotPickerList");
  if(search)search.value="";
  if(list)list.scrollTop=0;
  grindRenderSpotPicker();
  if(picker)picker.hidden=false;
  setTimeout(()=>search?.focus({preventScroll:true}),30);
}
function grindCloseSpotPicker(restoreFocus=true){
  const picker=document.getElementById("grindSpotPicker");
  if(picker)picker.hidden=true;
  if(restoreFocus&&grindPickerReturnFocus?.isConnected)setTimeout(()=>grindPickerReturnFocus.focus(),0);
  grindPickerReturnFocus=null;
}
document.getElementById("grindSpotPicker")?.addEventListener("keydown",event=>{
  const picker=event.currentTarget;
  if(event.key==="Escape"){event.preventDefault();grindCloseSpotPicker();return}
  if(event.key!=="Tab")return;
  const focusable=[...picker.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(element=>element.offsetParent!==null);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
});
function grindSelectSpot(spotId){const id=String(spotId||grindState.selectedSpotId||GRIND_SPOTS[0]?.id||"");if(!id)return;grindCloseSpotPicker();grindState.selectedSpotId=id;persistSetting("grindTrackerSelectedSpot",id);grindRender();grindEnsureMarketPricesForSpot(id)}
function grindRenderSpotPicker(){document.querySelectorAll("[data-grind-power-mode]").forEach(button=>button.classList.toggle("active",(button.dataset.grindPowerMode||"recommended")===grindState.powerMode));const header=document.getElementById("grindPowerHeader");if(header)header.textContent=grindState.powerMode==="max"?"Max AP / DP":"Recommended AP / DP";const list=document.getElementById("grindSpotPickerList");if(!list)return;const query=String(grindState.pickerSearch||"").trim().toLowerCase();const spots=GRIND_SPOTS.filter(spot=>{if(!query)return true;return`${spot.name} ${spot.zone} ${spot.primaryTrash}`.toLowerCase().includes(query)}).sort((a,b)=>{const aPower=grindPowerForSpot(a),bPower=grindPowerForSpot(b);const apDiff=(bPower.ap||0)-(aPower.ap||0);if(apDiff)return apDiff;const dpDiff=(bPower.dp||0)-(aPower.dp||0);if(dpDiff)return dpDiff;return String(a.name).localeCompare(String(b.name))});list.innerHTML=spots.length?spots.map(spot=>{const trash=grindTrashDrop(spot),monster=grindMonsterMeta(spot),ccs=grindSpotCcs(spot);const ccHtml=ccs.length?ccs.map(cc=>`<img class="grindCcIcon" src="${escapeHtml(grindCcIconMap[cc])}" alt="${escapeHtml(grindCcLabels[cc])}" title="${escapeHtml(grindCcLabels[cc])}">`).join(""):`<span class="grindNoCc">-</span>`;return`<button class="grindPickerRow" data-grind-picker-spot="${escapeHtml(spot.id)}" type="button"><span class="grindPickerName"><span class="grindPickerIcons"><img class="grindPickerLoot" src="${escapeHtml(trash?.icon||spot.icon||"")}" alt=""><img class="grindMonsterBadge ${escapeHtml(monster.type)}" src="${escapeHtml(monster.icon)}" alt="${escapeHtml(monster.label)}" title="${escapeHtml(monster.label)}"></span><span><strong>${escapeHtml(spot.name)}</strong><small>${escapeHtml(spot.zone||"Unknown region")} - ${escapeHtml(trash?.name||spot.primaryTrash||"Trash loot")}</small></span></span><span class="grindPickerCc">${ccHtml}</span><span class="grindCapText">${escapeHtml(grindPowerText(spot))}</span></button>`}).join(""):grindEmpty("No grind spots match that search.")}
function grindRenderSpotDetail(){
  if(!grindEl.spotDetail)return;
  const spot=grindSpotById(grindState.selectedSpotId);
  if(!spot){grindEl.spotDetail.innerHTML=grindEmpty("No grind-zone data found.");return}
  const trash=grindTrashDrop(spot);
  const loot=(spot.drops||[]).map(drop=>`<div class="grindLootCard" style="--loot-color:${grindLootColor(drop)}"><img src="${escapeHtml(drop.icon||"")}" alt=""><div><strong>${escapeHtml(drop.name)}</strong>${grindDropPriceLine(drop)}</div></div>`).join("");
  grindEl.spotDetail.innerHTML=`<div class="grindSpotTop"><img src="${escapeHtml(spot.icon||trash?.icon||"")}" alt=""><div><h2>${escapeHtml(spot.name)}</h2><p>${escapeHtml(spot.zone||"Unknown region")} - ${escapeHtml(trash?.name||spot.primaryTrash||"Trash loot")} - ${spot.players||1} player${String(spot.players||"1")==="1"?"":"s"}</p></div><div class="grindSpotStats"><span>${spot.ap||"-"} AP</span><span>${spot.dp||"-"} DP</span></div></div><div class="grindLootGrid">${loot||grindEmpty("No drop table available for this spot.")}</div>${grindRenderResistancePanel(spot)}${grindRenderGuidePanel(spot)}`;
}
function grindRender(){grindRenderSpotDetail();const picker=document.getElementById("grindSpotPicker");if(picker&&!picker.hidden)grindRenderSpotPicker()}
function grindCloseGuideLightbox(){const lightbox=document.getElementById("grindGuideLightbox");if(lightbox)lightbox.hidden=true}
grindEl.spotDetail?.addEventListener("click",event=>{const button=event.target.closest("[data-grind-guide-image]");if(!button)return;const image=String(button.dataset.grindGuideImage||"");if(!grindGuideImagePattern.test(image))return;const lightbox=document.getElementById("grindGuideLightbox"),target=document.getElementById("grindGuideLightboxImage"),title=document.getElementById("grindGuideLightboxTitle"),caption=document.getElementById("grindGuideLightboxCaption");if(!lightbox||!target)return;target.src=image;target.alt=button.dataset.grindGuideTitle||"Rotation map";if(title)title.textContent=button.dataset.grindGuideTitle||"Rotation map";if(caption)caption.textContent=button.dataset.grindGuideCaption||"";lightbox.hidden=false;document.getElementById("grindGuideLightboxClose")?.focus()});
document.getElementById("grindGuideLightboxClose")?.addEventListener("click",grindCloseGuideLightbox);
document.getElementById("grindGuideLightbox")?.addEventListener("click",event=>{if(event.target===event.currentTarget)grindCloseGuideLightbox()});
document.getElementById("grindGuideLightbox")?.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();grindCloseGuideLightbox()}});

const eventsState={initialized:false,loading:false,events:[],selectedId:"",lastStatus:""};
const eventsEl={status:document.getElementById("eventsStatusText"),refresh:document.getElementById("eventsRefresh"),timeline:document.getElementById("eventsTimelineScroller"),timelineTitle:document.getElementById("eventsTimelineTitle"),timelineCount:document.getElementById("eventsTimelineCount"),timelineDays:document.getElementById("eventsTimelineDays"),timelineBars:document.getElementById("eventsTimelineBars"),ongoing:document.getElementById("eventsOngoing"),ongoingCount:document.getElementById("eventsOngoingCount"),ongoingList:document.getElementById("eventsOngoingList"),detail:document.getElementById("eventsDetail")};
function eventCategorySlug(category){return String(category||"Adventure").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"adventure"}
function eventDateText(value){const date=eventDateValue(value);return date?date.toLocaleDateString([],{month:"short",day:"numeric",timeZone:"UTC"}):""}
function eventDateValue(value){if(value===null||value===undefined||(typeof value==="string"&&!value.trim()))return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:date}
function eventDayStart(value){const date=value instanceof Date?new Date(value):eventDateValue(value);if(!date)return null;date.setHours(0,0,0,0);return date}
function eventOfficialDayStart(value){const date=eventDateValue(value);return date?new Date(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()):null}
function eventMonthRangeText(days){if(!days.length)return"Official BDO Events";const first=days[0],last=days[days.length-1],firstMonth=first.toLocaleDateString([],{month:"long"}),lastMonth=last.toLocaleDateString([],{month:"long"}),year=last.getFullYear();return firstMonth===lastMonth?`${firstMonth} ${year}`:`${firstMonth} - ${lastMonth} ${year}`}
function eventTimelineLabel(title){return String(title||"Official event").replace(/\s+/g," ").trim()}
function eventHasOpenEndedSchedule(event){return /^ongoing$/i.test(String(event?.timeLeftText||"").trim())&&!eventOfficialDayStart(event?.endUtc)}
function eventCompactTimeLeft(event){const label=String(event?.timeLeftText||"").trim(),end=eventDateValue(event?.endUtc);let hours=end?Math.ceil((end-new Date())/3600000):NaN;if(!Number.isFinite(hours)&&/^ongoing$/i.test(label))return"Ongoing";if(!Number.isFinite(hours))hours=Number(event?.remainingHours);if(!Number.isFinite(hours))return label||"Active";if(hours<=0)return"Ends soon";if(hours<24)return`${Math.max(1,Math.round(hours))}h`;const days=Math.floor(hours/24),remaining=Math.round(hours%24);return remaining>0?`${days}d${remaining}h`:`${days}d`}
function eventNowPercent(firstDay,totalDays){const now=new Date(),dayMs=86400000;return eventClamp(((now-firstDay)/dayMs)/totalDays*100,0,100)}
const EVENT_TIMELINE_PAST_DAYS=12,EVENT_TIMELINE_TOTAL_DAYS=31;
function eventTimelineWindow(today=new Date()){const anchor=eventDayStart(today),firstDay=new Date(anchor);firstDay.setDate(firstDay.getDate()-EVENT_TIMELINE_PAST_DAYS);return{today:anchor,firstDay,totalDays:EVENT_TIMELINE_TOTAL_DAYS}}
function eventClockText(){return new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
const eventTimelinePalette=["#43c47d","#d85d61","#3f95d8","#d08f34","#c25a91","#58b7c8","#8f72e6","#d0b640","#de7a3a","#65aa58","#e05a7a","#4da0b8"];
function eventStableHash(value){let hash=0;for(const char of String(value||""))hash=(hash*31+char.charCodeAt(0))>>>0;return hash}
function eventTimelineColor(event,index){return eventTimelinePalette[(eventStableHash(event?.title||event?.id)+index)%eventTimelinePalette.length]}
function eventClamp(value,min,max){return Math.max(min,Math.min(max,value))}
function eventTimelinePosition(event,firstDay,totalDays,today=new Date()){if(eventHasOpenEndedSchedule(event))return null;const dayMs=86400000;let start=eventOfficialDayStart(event?.startUtc),end=eventOfficialDayStart(event?.endUtc);if(!start&&end){const activeStart=eventDayStart(today);start=activeStart&&activeStart<=end?activeStart:new Date(end)}else if(start&&!end)end=new Date(start);else if(!start&&!end)return null;if(end<firstDay)return null;const rawStart=Math.floor((start-firstDay)/dayMs)+1,rawEnd=Math.floor((end-firstDay)/dayMs)+2;if(rawStart>totalDays+1)return null;const startColumn=eventClamp(rawStart,1,totalDays),endColumn=eventClamp(Math.max(rawEnd,startColumn+1),startColumn+1,totalDays+1);return{start:startColumn,end:endColumn}}
function eventTimeLeftText(event){const end=eventDateValue(event?.endUtc);let hours=end?Math.ceil((end-new Date())/3600000):NaN;if(!Number.isFinite(hours)&&event?.timeLeftText)return event.timeLeftText;if(!Number.isFinite(hours))hours=Number(event?.remainingHours);if(!Number.isFinite(hours))return "Active";if(hours<=0)return"Ends soon";if(hours<24)return `${Math.max(1,Math.round(hours))}h left`;const days=Math.ceil(hours/24);return `${days}d left`}
function eventSummary(event){return event.summary||"Open the official event page for full rewards, rules, and schedule details."}
function eventImage(event){return event.imageUrl||""}
function eventCssImage(value){return String(value||"").replace(/\\/g,"/").replace(/'/g,"%27").replace(/\(/g,"%28").replace(/\)/g,"%29")}
function setEventsStatus(message,error=false,state=""){if(eventsEl.status){eventsEl.status.textContent=message;const host=eventsEl.status.closest(".eventsStatus");host?.classList.toggle("error",error);host?.classList.toggle("maintenance",state==="maintenance");host?.classList.toggle("cached",state==="cached")}}
function eventGroups(){const sorted=eventsState.events.slice().sort((a,b)=>(a.remainingHours??999999)-(b.remainingHours??999999)||String(a.title).localeCompare(String(b.title)));return{ending:sorted.filter(event=>event.status==="endingSoon"),active:sorted.filter(event=>event.status!=="endingSoon")}}
function eventsBindTimelineScroller(scroller){
  if(!scroller)return()=>{};
  const drag={pointerId:null,startX:0,startScrollLeft:0,active:false,suppressClick:false,suppressTimer:null};
  const clearClickSuppression=()=>{drag.suppressClick=false;if(drag.suppressTimer!==null){clearTimeout(drag.suppressTimer);drag.suppressTimer=null}};
  const releasePointer=(event,suppressClick)=>{if(drag.pointerId===null||event.pointerId!==drag.pointerId)return;const pointerId=drag.pointerId,wasDragging=drag.active;drag.pointerId=null;drag.active=false;scroller.classList.remove("isDragging");if(scroller.hasPointerCapture?.(pointerId)){try{scroller.releasePointerCapture(pointerId)}catch{}}if(wasDragging&&suppressClick){clearClickSuppression();drag.suppressClick=true;drag.suppressTimer=setTimeout(clearClickSuppression,0);event.preventDefault?.()}};
  const onPointerDown=event=>{if(event.button!==0||event.isPrimary===false||(event.pointerType&&!['mouse','pen'].includes(event.pointerType)))return;clearClickSuppression();drag.pointerId=event.pointerId;drag.startX=Number(event.clientX)||0;drag.startScrollLeft=Number(scroller.scrollLeft)||0;drag.active=false};
  const onPointerMove=event=>{if(drag.pointerId===null||event.pointerId!==drag.pointerId)return;const delta=(Number(event.clientX)||0)-drag.startX;if(!drag.active&&Math.abs(delta)<6)return;if(!drag.active){drag.active=true;scroller.classList.add("isDragging");try{scroller.setPointerCapture?.(event.pointerId)}catch{}}event.preventDefault?.();scroller.scrollLeft=drag.startScrollLeft-delta;eventsSyncTimelineLabels(scroller)};
  const onPointerUp=event=>releasePointer(event,true),onPointerCancel=event=>releasePointer(event,false);
  const onClick=event=>{if(!drag.suppressClick)return;clearClickSuppression();event.preventDefault();event.stopImmediatePropagation?.()};
  const onKeyDown=event=>{if(event.target!==scroller||!['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(event.key))return;const maxScroll=Math.max(0,(Number(scroller.scrollWidth)||0)-(Number(scroller.clientWidth)||0)),step=['PageUp','PageDown'].includes(event.key)?Math.max(160,(Number(scroller.clientWidth)||0)*.8):96;let next=Number(scroller.scrollLeft)||0;if(event.key==='Home')next=0;else if(event.key==='End')next=maxScroll;else next+=['ArrowLeft','PageUp'].includes(event.key)?-step:step;event.preventDefault();scroller.scrollTo?.({left:Math.max(0,Math.min(maxScroll,next)),behavior:'smooth'})};
  const onScroll=()=>eventsSyncTimelineLabels(scroller);
  scroller.addEventListener("pointerdown",onPointerDown);scroller.addEventListener("pointermove",onPointerMove);scroller.addEventListener("pointerup",onPointerUp);scroller.addEventListener("pointercancel",onPointerCancel);scroller.addEventListener("lostpointercapture",onPointerCancel);scroller.addEventListener("click",onClick,true);scroller.addEventListener("keydown",onKeyDown);scroller.addEventListener("scroll",onScroll,{passive:true});
  return()=>{clearClickSuppression();if(drag.pointerId!==null&&scroller.hasPointerCapture?.(drag.pointerId)){try{scroller.releasePointerCapture(drag.pointerId)}catch{}}scroller.removeEventListener("pointerdown",onPointerDown);scroller.removeEventListener("pointermove",onPointerMove);scroller.removeEventListener("pointerup",onPointerUp);scroller.removeEventListener("pointercancel",onPointerCancel);scroller.removeEventListener("lostpointercapture",onPointerCancel);scroller.removeEventListener("click",onClick,true);scroller.removeEventListener("keydown",onKeyDown);scroller.removeEventListener("scroll",onScroll);scroller.classList.remove("isDragging")};
}
function eventsSyncTimelineLabels(scroller=eventsEl.timeline){if(!scroller?.querySelectorAll||!scroller.getBoundingClientRect)return;const viewport=scroller.getBoundingClientRect(),visibleLeft=viewport.left+12,visibleRight=viewport.right-12;for(const bar of scroller.querySelectorAll(".eventsTimelineBar")){const content=bar.querySelector?.(".eventsTimelineBarContent");if(!content)continue;const rect=bar.getBoundingClientRect(),width=Math.max(0,Number(rect.width)||rect.right-rect.left),visible=rect.right>visibleLeft&&rect.left<visibleRight;let left=0,right=0;if(visible&&width>0){left=Math.min(width,Math.max(0,visibleLeft-rect.left));right=Math.min(Math.max(0,width-left),Math.max(0,rect.right-visibleRight))}content.style.setProperty("--event-content-left",`${Math.round(left)}px`);content.style.setProperty("--event-content-right",`${Math.round(right)}px`)}}
function renderEventTimeline(){if(!eventsEl.timelineDays||!eventsEl.timelineBars)return;const{today,firstDay,totalDays}=eventTimelineWindow(),days=[];eventsEl.timeline?.style.setProperty("--events-timeline-min-width",`${totalDays*64}px`);eventsEl.timeline?.style.setProperty("--events-timeline-column-width",`${100/totalDays}%`);eventsEl.timelineDays.style.gridTemplateColumns=`repeat(${totalDays}, minmax(64px, 1fr))`;eventsEl.timelineBars.style.gridTemplateColumns=`repeat(${totalDays}, minmax(64px, 1fr))`;for(let i=0;i<totalDays;i++){const date=new Date(firstDay);date.setDate(firstDay.getDate()+i);days.push(date)}eventsEl.timelineDays.innerHTML=days.map(date=>`<div class="eventsTimelineDay ${date.getTime()===today.getTime()?"today":""}"><span>${date.toLocaleDateString([],{weekday:"short"})}</span><strong>${date.getDate()}</strong></div>`).join("");if(eventsEl.timelineTitle)eventsEl.timelineTitle.textContent=eventMonthRangeText(days);if(eventsEl.timelineCount)eventsEl.timelineCount.textContent=`${eventsState.events.length} official event${eventsState.events.length===1?"":"s"}`;const timelineEvents=eventsState.events.filter(event=>!eventHasOpenEndedSchedule(event)).sort((a,b)=>(a.remainingHours??999999)-(b.remainingHours??999999)||(eventDateValue(a.endUtc)||new Date(8640000000000000))-(eventDateValue(b.endUtc)||new Date(8640000000000000))||String(a.title).localeCompare(String(b.title)));const bars=[];for(const event of timelineEvents){const position=eventTimelinePosition(event,firstDay,totalDays);if(!position)continue;const row=bars.length+1,span=position.end-position.start,countdown=eventCompactTimeLeft(event),image=eventImage(event),color=eventTimelineColor(event,row),style=`--event-start:${position.start};--event-end:${position.end};--event-lane:${row};--event-color:${color};${image?`--event-image:url('${eventCssImage(image)}');`:""}`;bars.push(`<button class="eventsTimelineBar ${event.id===eventsState.selectedId?"selected":""}" style="${style}" data-event-id="${escapeHtml(event.id)}" data-event-category="${eventCategorySlug(event.category)}" data-event-span="${span}" title="${escapeHtml(event.title)}" aria-label="${escapeHtml(`${event.title}, ${countdown}`)}">${image?`<span class="eventsTimelineArt" aria-hidden="true"></span>`:""}<span class="eventsTimelineBarContent"><span class="eventsTimelineBarText">${escapeHtml(eventTimelineLabel(event.title))}</span><span class="eventsTimelinePill">${escapeHtml(countdown)}</span></span></button>`)}const nowLine=`<div class="eventsNowLine" style="--now-pos:${eventNowPercent(firstDay,totalDays)}%"><span>${escapeHtml(eventClockText())}</span></div>`;eventsEl.timelineBars.innerHTML=nowLine+(bars.join("")||`<div class="eventsEmpty" style="grid-column:1/-1">No dated official events are available in this window.</div>`);eventsSyncTimelineLabels()}
function renderEventOngoing(){if(!eventsEl.ongoing||!eventsEl.ongoingList)return;const ongoing=eventsState.events.filter(eventHasOpenEndedSchedule).sort((a,b)=>String(a.title).localeCompare(String(b.title)));eventsEl.ongoing.hidden=!ongoing.length;if(eventsEl.ongoingCount)eventsEl.ongoingCount.textContent=String(ongoing.length);eventsEl.ongoingList.innerHTML=ongoing.map((event,index)=>{const image=eventImage(event),color=eventTimelineColor(event,index),start=eventDateText(event.startUtc),style=`--event-color:${color};${image?`--event-image:url('${eventCssImage(image)}');`:""}`;return`<button class="eventsOngoingCard ${event.id===eventsState.selectedId?"selected":""}" style="${style}" data-event-id="${escapeHtml(event.id)}" data-event-category="${eventCategorySlug(event.category)}" title="${escapeHtml(event.title)}">${image?`<span class="eventsOngoingArt" aria-hidden="true"></span>`:`<span class="eventsOngoingMark" aria-hidden="true"></span>`}<span class="eventsOngoingCopy"><strong>${escapeHtml(eventTimelineLabel(event.title))}</strong><small>${start?`Started ${escapeHtml(start)} - `:""}No fixed end date</small></span><span class="eventsTimelinePill">Ongoing</span></button>`}).join("")}
function updateEventTimelineClock(){const nowLine=eventsEl.timelineBars?.querySelector(".eventsNowLine"),window=eventTimelineWindow(),todayLabel=eventsEl.timelineDays?.querySelector(".eventsTimelineDay.today strong")?.textContent;if(!nowLine||todayLabel!==String(window.today.getDate())){renderEventTimeline();return;}nowLine.style.setProperty("--now-pos",`${eventNowPercent(window.firstDay,window.totalDays)}%`);const label=nowLine.querySelector("span");if(label)label.textContent=eventClockText()}
function renderEventDetail(){if(!eventsEl.detail)return;const event=eventsState.events.find(item=>item.id===eventsState.selectedId)||eventsState.events[0];if(!event){eventsEl.detail.innerHTML=`<div class="eventsEmpty">Official BDO events will appear here once loaded.</div>`;return;}const image=eventImage(event),category=escapeHtml(event.category||"Adventure"),timeLeft=escapeHtml(eventTimeLeftText(event)),schedule=eventHasOpenEndedSchedule(event)?"No fixed end date":event.dateRangeText||eventDateText(event.endUtc)||"Official schedule";eventsEl.detail.innerHTML=`<div class="eventsDetailHero">${image?`<img src="${escapeHtml(image)}" alt="">`:""}<div class="eventsDetailHeroText"><span class="eventBadge" data-event-category="${eventCategorySlug(event.category)}">${category}</span><h2>${escapeHtml(event.title)}</h2></div></div><div class="eventsDetailBody"><div class="eventsDetailMeta"><span>${escapeHtml(schedule)}</span><span>${timeLeft}</span><span>${escapeHtml(event.source||"Official BDO")}</span></div><p class="eventsDetailSummary">${escapeHtml(eventSummary(event))}</p><button class="eventsOpen" data-open-url="${escapeHtml(event.url)}" type="button">Open Official Event &nbsp; &nearr;</button></div>`}
function renderEvents(){const groups=eventGroups();if(eventsEl.timelineCount)eventsEl.timelineCount.textContent=`${eventsState.events.length} official event${eventsState.events.length===1?"":"s"}`;if(eventsEl.timelineTitle)eventsEl.timelineTitle.textContent="Official BDO Events";if(!eventsState.selectedId||!eventsState.events.some(event=>event.id===eventsState.selectedId))eventsState.selectedId=(groups.ending[0]||groups.active[0]||eventsState.events[0]||{}).id||"";renderEventTimeline();renderEventOngoing();renderEventDetail()}
function eventCacheAgeText(minutes){const value=Number(minutes);if(!Number.isFinite(value)||value<=0)return"";if(value<60)return`${Math.max(1,Math.round(value))}m old`;const hours=Math.round(value/60);return hours<48?`${hours}h old`:`${Math.round(hours/24)}d old`}
function applyEventsDashboard(data){eventsState.events=Array.isArray(data.events)?data.events:[];eventsState.lastStatus=String(data.status||"CACHED").toUpperCase();const attempt=eventDateValue(data.lastAttempt||data.lastRefreshed),cacheDate=eventDateValue(data.lastRefreshed),time=attempt?` - Last checked ${attempt.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:"",cacheTime=cacheDate?cacheDate.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",timeZoneName:"short"}):"";if(eventsState.lastStatus==="MAINTENANCE"){setEventsStatus(`Official site under maintenance - showing cached events${cacheTime?` from ${cacheTime}`:""}.`,false,"maintenance")}else if(eventsState.lastStatus==="LIVE"){setEventsStatus(data.message||`Official events synced${time}`,false)}else{const cachedLabel=data.isStale?`Cached official events loaded${data.cacheAgeMinutes?` (${eventCacheAgeText(data.cacheAgeMinutes)})`:""}`:"Cached official events loaded";setEventsStatus(data.message||`${cachedLabel}${time}`,false,"cached")}renderEvents()}
async function loadEvents(force=false){if(eventsState.loading)return;eventsState.loading=true;if(eventsEl.refresh){eventsEl.refresh.disabled=true;eventsEl.refresh.textContent=force?"Refreshing...":"Loading..."}setEventsStatus(force?"Refreshing official BDO events...":"Loading official BDO events...");try{const data=await bridgeCall(force?"refreshEvents":"initializeEvents");applyEventsDashboard(data);const status=String(data?.status||"").toUpperCase();if(!force&&status!=="MAINTENANCE"&&data?.isStale&&Array.isArray(data.events)&&data.events.length)setTimeout(()=>{if(!eventsState.loading)loadEvents(true)},700);if(force&&status==="LIVE")NotificationService.ShowSuccess("Official BDO events refreshed.","Events");else if(force&&status==="MAINTENANCE")NotificationService.ShowInfo("The official site is under maintenance. Cached events remain available.","Events");else if(force&&data.message)NotificationService.ShowWarning(data.message,"Events");}catch(error){setEventsStatus(error.message||"Could not load official events.",true);NotificationService.ShowError(error.message||"Could not load official BDO events.");}finally{eventsState.loading=false;if(eventsEl.refresh){eventsEl.refresh.disabled=false;eventsEl.refresh.textContent="Refresh Events"}}}
function initializeEvents(){if(!eventsState.initialized){eventsState.initialized=true;eventsBindTimelineScroller(eventsEl.timeline);eventsEl.refresh?.addEventListener("click",()=>loadEvents(true));const selectEvent=event=>{const item=event.target.closest("[data-event-id]");if(!item)return;eventsState.selectedId=item.dataset.eventId;renderEvents()};eventsEl.timelineBars?.addEventListener("click",selectEvent);eventsEl.ongoingList?.addEventListener("click",selectEvent);window.addEventListener("resize",()=>eventsSyncTimelineLabels())}renderEvents();loadEvents(false)}

const PLAYER_GUILD_REGIONS=new Set(["eu","na","kr","sa","asia"]);
const PLAYER_GUILD_CLASS_SLUGS=new Set(["archer","berserker","corsair","dark-knight","deadeye","dosa","drakania","guardian","hashashin","kunoichi","lahn","maegu","maehwa","musa","mystic","ninja","nova","ranger","sage","scholar","seraph","shai","sorceress","striker","tamer","valkyrie","warrior","witch","wizard","woosa","wukong"]);
const PLAYER_GUILD_CLASS_ALIASES={darkknight:"dark-knight",deadeye:"deadeye"};
const PLAYER_GUILD_LIFE_ICONS={gathering:"gathering.png",fishing:"fishing.png",hunting:"hunting.png",cooking:"cooking.png",alchemy:"alchemy.png",processing:"processing.png",training:"training.png",sailing:"sailing.png",trading:"trading.svg",trade:"trading.svg",farming:"farming.svg",barter:"barter.svg",bartering:"barter.svg"};
const PLAYER_GUILD_LIFE_SLUGS={gathering:"gathering",fishing:"fishing",hunting:"hunting",cooking:"cooking",alchemy:"alchemy",processing:"processing",training:"training",trading:"trade",trade:"trade",farming:"farming",sailing:"sailing",barter:"barter",bartering:"barter"};
const playerGuildEl={
  status:document.getElementById("playerGuildSourceStatus"),message:document.getElementById("playerGuildMessage"),mode:document.getElementById("playerGuildSearchMode"),region:document.getElementById("playerGuildRegion"),search:document.getElementById("playerGuildSearch"),searchButton:document.getElementById("playerGuildSearchButton"),recents:document.getElementById("playerGuildRecents"),
  results:document.getElementById("playerGuildSearchResults"),playerResultPanel:document.getElementById("playerGuildPlayerResults")?.closest(".playerGuildResultPanel"),guildResultPanel:document.getElementById("playerGuildGuildResults")?.closest(".playerGuildResultPanel"),playerResults:document.getElementById("playerGuildPlayerResults"),guildResults:document.getElementById("playerGuildGuildResults"),playerResultCount:document.getElementById("playerGuildPlayerResultCount"),guildResultCount:document.getElementById("playerGuildGuildResultCount"),
  guildProfile:document.getElementById("playerGuildGuildProfile"),guildName:document.getElementById("playerGuildGuildName"),guildMeta:document.getElementById("playerGuildGuildMeta"),guildUpdated:document.getElementById("playerGuildGuildUpdated"),guildMaster:document.getElementById("playerGuildMaster"),memberCount:document.getElementById("playerGuildMemberCount"),profileCoverage:document.getElementById("playerGuildProfileCoverage"),reloadGuild:document.getElementById("playerGuildReloadGuild"),rosterFilter:document.getElementById("playerGuildRosterFilter"),rosterSort:document.getElementById("playerGuildRosterSort"),rosterSummary:document.getElementById("playerGuildRosterSummary"),rosterRows:document.getElementById("playerGuildRosterRows"),
  playerProfile:document.getElementById("playerGuildPlayerProfile"),familyName:document.getElementById("playerGuildFamilyName"),familyMeta:document.getElementById("playerGuildFamilyMeta"),playerUpdated:document.getElementById("playerGuildPlayerUpdated"),reloadPlayer:document.getElementById("playerGuildReloadPlayer"),playerHeroIcon:document.getElementById("playerGuildPlayerHeroIcon"),profileNotice:document.getElementById("playerGuildProfileNotice"),profileNoticeBadge:document.getElementById("playerGuildProfileNoticeBadge"),profileNoticeCopy:document.getElementById("playerGuildProfileNoticeCopy"),maxGearScore:document.getElementById("playerGuildMaxGearScore"),contribution:document.getElementById("playerGuildContribution"),energy:document.getElementById("playerGuildEnergy"),familyCreated:document.getElementById("playerGuildFamilyCreated"),characterCount:document.getElementById("playerGuildCharacterCount"),characters:document.getElementById("playerGuildCharacters"),lifeSkills:document.getElementById("playerGuildLifeSkills"),history:document.getElementById("playerGuildHistory")
};
const playerGuildState={initialized:false,initializing:false,bindingCleanup:[],loading:false,mode:"player",region:"eu",view:"welcome",playerReturnView:"results",searchResults:[],guild:null,player:null,renderedRoster:[],recents:[],requestSequence:0,activeRequest:null};
let playerGuildRefreshRecentOverflow=()=>{};
function playerGuildPick(object,...names){if(!object||typeof object!=="object")return undefined;for(const name of names){if(Object.hasOwn(object,name)&&object[name]!==undefined&&object[name]!==null)return object[name]}return undefined}
function playerGuildString(value){return value===undefined||value===null||typeof value==="object"?"":String(value).trim()}
function playerGuildName(value,...keys){if(value&&typeof value==="object")return playerGuildString(playerGuildPick(value,...keys));return playerGuildString(value)}
function playerGuildNumber(value){if(value===""||value===null||value===undefined)return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function playerGuildNullableBoolean(value){return typeof value==="boolean"?value:null}
function playerGuildArray(value){return Array.isArray(value)?value:[]}
function playerGuildRegion(value){const region=playerGuildString(value).toLowerCase();return PLAYER_GUILD_REGIONS.has(region)?region:"eu"}
function playerGuildRegionLabel(region){return playerGuildRegion(region).toUpperCase()}
function playerGuildRoot(data,type){const body=data?.data??data;if(type==="guild")return body?.guild??body?.profile??body;if(type==="player")return body?.player??body?.profile??body;return body}
function playerGuildUpdatedText(value){if(!value)return"Update time unavailable";const date=new Date(value);return Number.isNaN(date.getTime())?"Update time unavailable":`Updated ${date.toLocaleString([],{dateStyle:"medium",timeStyle:"short"})}`}
function playerGuildMetric(value){const number=playerGuildNumber(value);if(number!==null)return Math.round(number).toLocaleString();const text=playerGuildString(value);return text||"—"}
function playerGuildSetStatus(text,type="ready"){if(!playerGuildEl.status)return;playerGuildEl.status.classList.toggle("loading",type==="loading");playerGuildEl.status.classList.toggle("error",type==="error");const label=playerGuildEl.status.querySelector("span");if(label)label.textContent=text}
function playerGuildSetMessage(message,type=""){if(!playerGuildEl.message)return;playerGuildEl.message.textContent=message||"";playerGuildEl.message.classList.toggle("show",Boolean(message));playerGuildEl.message.classList.toggle("error",type==="error")}
function playerGuildSetView(view){playerGuildState.view=view;if(playerGuildEl.results)playerGuildEl.results.hidden=view!=="results";if(playerGuildEl.guildProfile)playerGuildEl.guildProfile.hidden=view!=="guild";if(playerGuildEl.playerProfile)playerGuildEl.playerProfile.hidden=view!=="player"}
function playerGuildSetLoading(loading){playerGuildState.loading=loading;if(playerGuildEl.searchButton){playerGuildEl.searchButton.disabled=false;playerGuildEl.searchButton.textContent=loading?"Cancel":"Search";playerGuildEl.searchButton.setAttribute("aria-label",loading?"Cancel the current player or guild request":"Search players or guilds")}if(playerGuildEl.search)playerGuildEl.search.readOnly=loading;playerGuildEl.mode?.querySelectorAll("button").forEach(button=>button.disabled=loading);if(playerGuildEl.region)playerGuildEl.region.disabled=loading;if(playerGuildEl.reloadGuild)playerGuildEl.reloadGuild.disabled=loading;if(playerGuildEl.reloadPlayer){const refreshing=loading&&playerGuildState.activeRequest?.kind==="player-refresh";playerGuildEl.reloadPlayer.disabled=loading;playerGuildEl.reloadPlayer.textContent=refreshing?"Refreshing...":"Refresh Profile";playerGuildEl.reloadPlayer.setAttribute("aria-busy",String(refreshing))}for(const element of [playerGuildEl.recents,playerGuildEl.results,playerGuildEl.rosterRows])if(element)element.inert=loading;playerGuildEl.search?.closest("#playerGuildView")?.setAttribute("aria-busy",String(loading))}
function playerGuildModeLabel(mode=playerGuildState.mode){return mode==="guild"?"Guilds":"Players"}
function playerGuildBusyFeedback(){const action=playerGuildState.activeRequest?.label||"request";playerGuildSetMessage(`A ${action} is already running. Use Cancel to stop it before starting another.`);return false}
function playerGuildBeginRequest(kind,label,status){if(playerGuildState.loading){playerGuildBusyFeedback();return null}const request={id:++playerGuildState.requestSequence,kind,label,controller:new AbortController(),cancelReason:""};playerGuildState.activeRequest=request;playerGuildSetMessage("");playerGuildSetLoading(true);playerGuildSetStatus(status,"loading");return request}
function playerGuildFinishRequest(request){if(playerGuildState.activeRequest!==request)return;playerGuildState.activeRequest=null;playerGuildSetLoading(false)}
function playerGuildCancelActiveRequest(reason="The request was cancelled. You can try again."){const request=playerGuildState.activeRequest;if(!request)return false;request.cancelReason=reason;request.controller.abort();playerGuildSetStatus("Cancelling request...","loading");playerGuildSetMessage(reason);return true}
function playerGuildRequestError(error,fallback,request){if(error?.name==="AbortError")return request?.cancelReason||"The request was cancelled. You can try again.";const message=(playerGuildString(error?.message)||fallback).replace(new RegExp("BDO"+" Alerts","gi"),"The profile service");if(/timed out|did not answer|cancelled/i.test(message))return"The profile service did not answer in time. The request was stopped and the controls are ready; please try again.";return message}
function playerGuildUpdateIntentGuidance({force=false}={}){if(playerGuildState.loading)return;const query=playerGuildString(playerGuildEl.search?.value),region=playerGuildRegion(playerGuildEl.region?.value||playerGuildState.region),opposite=playerGuildState.recents.find(item=>item.type!==playerGuildState.mode&&item.region===region&&norm(item.name)===norm(query));if(opposite){playerGuildSetMessage(`“${query}” is saved as a ${opposite.type}. ${playerGuildModeLabel()} search is selected; switch to ${opposite.type==="guild"?"Guilds":"Players"} or use its Recent pill.`);return}if(force)playerGuildSetMessage(`${playerGuildRegionLabel(region)} ${playerGuildModeLabel()} search selected. Enter ${playerGuildState.mode==="guild"?"a guild name":"a family name (not a character or guild name)"}.`)}
function playerGuildClassSlug(name){const token=norm(name).replace(/[^a-z0-9]+/g,"");const slug=PLAYER_GUILD_CLASS_ALIASES[token]||[...PLAYER_GUILD_CLASS_SLUGS].find(item=>item.replace(/-/g,"")===token);return slug||""}
function playerGuildInitial(name){const parts=playerGuildString(name).split(/\s+/).filter(Boolean);return(parts.length>1?parts[0][0]+parts.at(-1)[0]:(parts[0]||"?").slice(0,2)).toUpperCase()}
function playerGuildClassIcon(name){const slug=playerGuildClassSlug(name);return slug?`<img src="Assets/GrindTracker/classes/${slug}.png" alt="${escapeHtml(name||"Class")}">`:`<span>${escapeHtml(playerGuildInitial(name||"Class"))}</span>`}
function playerGuildLifeIcon(name){const token=norm(name).replace(/[^a-z]/g,"");const file=PLAYER_GUILD_LIFE_ICONS[token],fallback=escapeHtml(playerGuildInitial(name));return file?`<img src="Assets/MasteryIcons/${file}" alt="${escapeHtml(name)}" data-player-guild-icon-fallback="${fallback}">`:`<span>${fallback}</span>`}
function playerGuildLifeSlug(name){const token=norm(name).replace(/[^a-z]/g,"");return PLAYER_GUILD_LIFE_SLUGS[token]||"other"}
function playerGuildHandleIconError(event){const image=event?.target,fallback=playerGuildString(image?.dataset?.playerGuildIconFallback);if(!fallback||String(image?.tagName||"").toLowerCase()!=="img")return;const replacement=document.createElement("span");replacement.textContent=fallback;replacement.setAttribute("role","img");replacement.setAttribute("aria-label",`${playerGuildString(image.alt)||"Life skill"} icon unavailable`);image.replaceWith(replacement)}
function playerGuildNormalizeSearch(data,mode){const root=playerGuildRoot(data);let values=playerGuildPick(root,mode==="player"?"players":"guilds",mode==="player"?"playerResults":"guildResults",mode==="player"?"player_results":"guild_results","results");if(!Array.isArray(values)&&Array.isArray(root))values=root;return playerGuildArray(values).map(item=>{if(mode==="guild"){return{guildName:playerGuildName(playerGuildPick(item,"guildName","guild_name","name"),"guildName","guild_name","name"),guildMaster:playerGuildName(playerGuildPick(item,"guildMaster","guild_master","master"),"familyName","family_name","name"),memberCount:playerGuildNumber(playerGuildPick(item,"memberCount","member_count","members")),lastUpdated:playerGuildPick(item,"lastUpdated","last_updated","scrapedAt","scraped_at")}}const main=playerGuildPick(item,"mainCharacter","main_character");return{familyName:playerGuildName(playerGuildPick(item,"familyName","family_name","name"),"familyName","family_name","name"),guild:playerGuildName(playerGuildPick(item,"guild","guildName","guild_name"),"guildName","guild_name","name"),mainCharacter:playerGuildName(main,"characterName","character_name","name")}}).filter(item=>mode==="guild"?item.guildName:item.familyName)}
function playerGuildNormalizeMember(item){if(typeof item==="string")return{familyName:item,hasCachedProfile:false,isPrivate:null,mainCharacter:"",className:"",maxGearScore:null,status:""};const profile=playerGuildPick(item,"player","profile")??item,main=playerGuildPick(profile,"mainCharacter","main_character");return{familyName:playerGuildName(playerGuildPick(profile,"familyName","family_name","name"),"familyName","family_name","name"),hasCachedProfile:playerGuildPick(profile,"hasCachedProfile","has_cached_profile")===true,isPrivate:playerGuildNullableBoolean(playerGuildPick(profile,"isPrivate","is_private")),mainCharacter:playerGuildName(main,"characterName","character_name","name"),className:playerGuildName(main,"className","class_name","class"),maxGearScore:playerGuildNumber(playerGuildPick(profile,"maxGearScore","max_gear_score","gearScore","gear_score")),status:playerGuildString(playerGuildPick(profile,"status"))}}
function playerGuildNormalizeGuild(data){const root=playerGuildRoot(data,"guild");const detailed=playerGuildPick(root,"membersDetailed","members_detailed");let members=Array.isArray(detailed)&&detailed.length?detailed:playerGuildPick(root,"members");if(!Array.isArray(members)&&Array.isArray(data?.members))members=data.members;const normalized=playerGuildArray(members).map(playerGuildNormalizeMember).filter(member=>member.familyName);return{guildName:playerGuildName(playerGuildPick(root,"guildName","guild_name","name"),"guildName","guild_name","name"),guildMaster:playerGuildName(playerGuildPick(root,"guildMaster","guild_master","master"),"familyName","family_name","name"),memberCount:playerGuildNumber(playerGuildPick(root,"memberCount","member_count"))??normalized.length,members:normalized,region:playerGuildRegion(playerGuildPick(root,"region")??data?.region??playerGuildState.region),updated:playerGuildPick(root,"scrapedAtUtc","scraped_at_utc","scrapedAt","scraped_at","updatedAtUtc","updated_at_utc","lastUpdated","last_updated","cachedAtUtc","cached_at_utc","fetchedAtUtc","fetched_at_utc")??data?.scrapedAtUtc??data?.updatedAtUtc??data?.cachedAtUtc??data?.fetchedAtUtc,status:playerGuildString(data?.status??root?.status),sourceStatus:playerGuildString(data?.sourceStatus??data?.source_status??root?.sourceStatus??root?.source_status),message:playerGuildString(data?.message??root?.message),cached:Boolean(data?.isCached||String(data?.status||"").toUpperCase()==="CACHED"),stale:Boolean(data?.isStale)}}
function playerGuildNormalizeCharacters(root){const main=playerGuildPick(root,"mainCharacter","main_character");const mainName=playerGuildName(main,"characterName","character_name","name");return playerGuildArray(playerGuildPick(root,"characters")).map(item=>({name:playerGuildName(playerGuildPick(item,"characterName","character_name","name"),"characterName","character_name","name"),className:playerGuildName(playerGuildPick(item,"className","class_name","class"),"className","class_name","name"),level:playerGuildNumber(playerGuildPick(item,"level","characterLevel","character_level")),isMain:Boolean(playerGuildPick(item,"isMain","is_main"))||Boolean(mainName&&norm(playerGuildName(playerGuildPick(item,"characterName","character_name","name"),"characterName","character_name","name"))===norm(mainName))})).filter(character=>character.name||character.className).sort((a,b)=>(b.level??-1)-(a.level??-1)||Number(b.isMain)-Number(a.isMain)||a.name.localeCompare(b.name))}
function playerGuildNormalizeLifeSkills(root){const raw=playerGuildPick(root,"lifeSkills","life_skills");if(Array.isArray(raw))return raw.map(item=>({name:playerGuildName(playerGuildPick(item,"name","skillName","skill_name"),"name","skillName","skill_name"),rank:playerGuildString(playerGuildPick(item,"rank","grade")),level:playerGuildPick(item,"level"),mastery:playerGuildPick(item,"mastery")})).filter(skill=>skill.name);if(raw&&typeof raw==="object")return Object.entries(raw).map(([name,value])=>{if(value&&typeof value==="object")return{name,rank:playerGuildString(playerGuildPick(value,"rank","grade")),level:playerGuildPick(value,"level"),mastery:playerGuildPick(value,"mastery")};return{name,rank:playerGuildString(value),level:null,mastery:null}});return[]}
function playerGuildNormalizeHistory(root,currentGuild){return playerGuildArray(playerGuildPick(root,"guildHistory","guild_history")).map(item=>{if(typeof item==="string")return{guildName:item,joined:"",left:"",role:"",current:norm(item)===norm(currentGuild)};const guildName=playerGuildName(playerGuildPick(item,"guildName","guild_name","name","guild"),"guildName","guild_name","name");const status=playerGuildString(playerGuildPick(item,"status","membershipStatus","membership_status"));const left=playerGuildPick(item,"leftAtUtc","left_at_utc","leftAt","left_at","leftDate","left_date","departureDate","departure_date");return{guildName,joined:playerGuildPick(item,"joinedAtUtc","joined_at_utc","joinedAt","joined_at","joinedDate","joined_date","joinDate","join_date"),left,role:playerGuildString(playerGuildPick(item,"role","rank")),current:Boolean(playerGuildPick(item,"isCurrent","is_current"))||/current|active/i.test(status)||Boolean(guildName&&!left&&norm(guildName)===norm(currentGuild))}}).filter(item=>item.guildName).sort((a,b)=>Number(b.current)-Number(a.current)||new Date(b.joined||0)-new Date(a.joined||0))}
function playerGuildProfileFlags(root,body){let isPrivate=playerGuildNullableBoolean(playerGuildPick(root,"isPrivate","is_private")??playerGuildPick(body,"isPrivate","is_private")),isComplete=playerGuildNullableBoolean(playerGuildPick(root,"isComplete","is_complete")??playerGuildPick(body,"isComplete","is_complete"));const visibility=norm(playerGuildPick(root,"profileVisibility","profile_visibility")??playerGuildPick(body,"profileVisibility","profile_visibility")),completeness=norm(playerGuildPick(root,"dataCompleteness","data_completeness")??playerGuildPick(body,"dataCompleteness","data_completeness"));if(isPrivate===null&&visibility)isPrivate=visibility==="private"?true:(visibility==="public"?false:null);if(isComplete===null&&completeness)isComplete=completeness==="complete"?true:(["partial","restricted"].includes(completeness)?false:null);return{isPrivate,isComplete}}
function playerGuildNormalizePlayer(data){const body=data?.data??data,root=playerGuildRoot(data,"player"),guild=playerGuildName(playerGuildPick(root,"guild","guildName","guild_name"),"guildName","guild_name","name"),flags=playerGuildProfileFlags(root,body);return{familyName:playerGuildName(playerGuildPick(root,"familyName","family_name","name"),"familyName","family_name","name"),guild,maxGearScore:playerGuildPick(root,"maxGearScore","max_gear_score","gearScore","gear_score"),contribution:playerGuildPick(root,"contributionPoints","contribution_points","contribution"),energy:playerGuildPick(root,"energy"),familyCreated:playerGuildPick(root,"familyCreated","family_created"),characters:playerGuildNormalizeCharacters(root),lifeSkills:playerGuildNormalizeLifeSkills(root),guildHistory:playerGuildNormalizeHistory(root,guild),isPrivate:flags.isPrivate,isComplete:flags.isComplete,region:playerGuildRegion(playerGuildPick(root,"region")??data?.region??playerGuildState.region),updated:playerGuildPick(root,"scrapedAtUtc","scraped_at_utc","scrapedAt","scraped_at","updatedAtUtc","updated_at_utc","cachedAtUtc","cached_at_utc","lastUpdated","last_updated","fetchedAtUtc","fetched_at_utc")??data?.scrapedAtUtc??data?.updatedAtUtc??data?.cachedAtUtc??data?.fetchedAtUtc,status:playerGuildString(data?.status??root?.status),sourceStatus:playerGuildString(data?.sourceStatus??data?.source_status??root?.sourceStatus??root?.source_status),message:playerGuildString(data?.message??root?.message),cached:Boolean(data?.isCached||String(data?.status||"").toUpperCase()==="CACHED"),stale:Boolean(data?.isStale)}}
function playerGuildLoadRecents(){const saved=readSetting("playerGuildRecents",[]);playerGuildState.recents=playerGuildArray(saved).map(item=>({type:item?.type==="guild"?"guild":"player",region:playerGuildRegion(item?.region),name:playerGuildString(item?.name)})).filter(item=>item.name).slice(0,8)}
function playerGuildSaveRecent(type,region,name){const entry={type:type==="guild"?"guild":"player",region:playerGuildRegion(region),name:playerGuildString(name)};if(!entry.name)return;playerGuildState.recents=[entry,...playerGuildState.recents.filter(item=>!(item.type===entry.type&&item.region===entry.region&&norm(item.name)===norm(entry.name)))].slice(0,8);persistSetting("playerGuildRecents",playerGuildState.recents);playerGuildRenderRecents()}
function playerGuildRenderRecents(){if(!playerGuildEl.recents)return;playerGuildEl.recents.innerHTML=playerGuildState.recents.length?playerGuildState.recents.map((item,index)=>`<button class="playerGuildRecentPill" data-player-guild-recent="${index}" data-recent-type="${item.type}" type="button">${escapeHtml(item.name)} <small>${playerGuildRegionLabel(item.region)}</small></button>`).join(""):'<small>Your recent profiles will stay on this device.</small>';playerGuildRefreshRecentOverflow()}
function playerGuildBindRecentScroller(scroller,bind){
  const drag={pointerId:null,startX:0,startScrollLeft:0,active:false,suppressClick:false,suppressTimer:null};
  const refreshOverflow=()=>{const maxScroll=Math.max(0,(Number(scroller.scrollWidth)||0)-(Number(scroller.clientWidth)||0)),position=Math.max(0,Number(scroller.scrollLeft)||0);scroller.classList.toggle("canScrollLeft",maxScroll>1&&position>1);scroller.classList.toggle("canScrollRight",maxScroll>1&&position<maxScroll-1)};
  const clearClickSuppression=()=>{drag.suppressClick=false;if(drag.suppressTimer!==null){clearTimeout(drag.suppressTimer);drag.suppressTimer=null}};
  const releasePointer=(event,suppressClick)=>{if(drag.pointerId===null||event.pointerId!==drag.pointerId)return;const pointerId=drag.pointerId,wasDragging=drag.active;drag.pointerId=null;drag.active=false;scroller.classList.remove("isDragging");if(scroller.hasPointerCapture?.(pointerId)){try{scroller.releasePointerCapture(pointerId)}catch{}}if(wasDragging&&suppressClick){clearClickSuppression();drag.suppressClick=true;drag.suppressTimer=setTimeout(clearClickSuppression,0);event.preventDefault?.()}refreshOverflow()};
  bind(scroller,"pointerdown",event=>{if(event.button!==0||event.isPrimary===false||(event.pointerType&&event.pointerType!=="mouse"))return;clearClickSuppression();drag.pointerId=event.pointerId;drag.startX=Number(event.clientX)||0;drag.startScrollLeft=Number(scroller.scrollLeft)||0;drag.active=false});
  bind(scroller,"pointermove",event=>{if(drag.pointerId===null||event.pointerId!==drag.pointerId)return;const delta=(Number(event.clientX)||0)-drag.startX;if(!drag.active&&Math.abs(delta)<6)return;if(!drag.active){drag.active=true;scroller.classList.add("isDragging");try{scroller.setPointerCapture?.(event.pointerId)}catch{}}event.preventDefault?.();scroller.scrollLeft=drag.startScrollLeft-delta;refreshOverflow()});
  bind(scroller,"pointerup",event=>releasePointer(event,true));
  bind(scroller,"pointercancel",event=>releasePointer(event,false));
  bind(scroller,"lostpointercapture",event=>releasePointer(event,false));
  bind(scroller,"click",event=>{if(!drag.suppressClick)return;clearClickSuppression();event.preventDefault();event.stopImmediatePropagation?.()});
  bind(scroller,"scroll",refreshOverflow,{passive:true});
  bind(window,"resize",refreshOverflow,{passive:true});
  playerGuildRefreshRecentOverflow=refreshOverflow;
  refreshOverflow();
  return()=>{clearClickSuppression();if(drag.pointerId!==null&&scroller.hasPointerCapture?.(drag.pointerId)){try{scroller.releasePointerCapture(drag.pointerId)}catch{}}drag.pointerId=null;drag.active=false;scroller.classList.remove("isDragging","canScrollLeft","canScrollRight");if(playerGuildRefreshRecentOverflow===refreshOverflow)playerGuildRefreshRecentOverflow=()=>{}};
}
function playerGuildSetMode(mode,{preserveView=false}={}){const next=mode==="guild"?"guild":"player",changed=next!==playerGuildState.mode;playerGuildState.mode=next;if(changed&&!preserveView)playerGuildState.searchResults=[];persistSetting("playerGuildMode",playerGuildState.mode);playerGuildEl.mode?.querySelectorAll("[data-player-guild-mode]").forEach(button=>{const active=button.dataset.playerGuildMode===playerGuildState.mode;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))});if(playerGuildEl.search){playerGuildEl.search.placeholder=playerGuildState.mode==="guild"?"Search guild name...":"Search family name...";playerGuildEl.search.setAttribute("aria-label",playerGuildState.mode==="guild"?"Guild name":"Family name")}if(changed&&!preserveView){if(playerGuildState.view==="results")playerGuildSetView("welcome");playerGuildSetStatus("Ready to search")}if(!preserveView)playerGuildUpdateIntentGuidance({force:true})}
function playerGuildRenderSearchResults(items,mode){playerGuildState.searchResults=items;if(!playerGuildEl.results)return;playerGuildEl.results.classList.add("single");if(playerGuildEl.playerResultPanel)playerGuildEl.playerResultPanel.hidden=mode!=="player";if(playerGuildEl.guildResultPanel)playerGuildEl.guildResultPanel.hidden=mode!=="guild";if(mode==="player"){if(playerGuildEl.playerResultCount)playerGuildEl.playerResultCount.textContent=`${items.length} match${items.length===1?"":"es"}`;if(playerGuildEl.playerResults)playerGuildEl.playerResults.innerHTML=items.length?items.map((item,index)=>`<button class="playerGuildResultRow" data-player-guild-search-result="${index}" type="button"><span><strong>${escapeHtml(item.familyName)}</strong><small>${escapeHtml([item.mainCharacter,item.guild].filter(Boolean).join(" · ")||"Public family profile")}</small></span><b>Open &rarr;</b></button>`).join(""):'<div class="playerGuildEmptyResult">No player families matched that search.</div>'}else{if(playerGuildEl.guildResultCount)playerGuildEl.guildResultCount.textContent=`${items.length} match${items.length===1?"":"es"}`;if(playerGuildEl.guildResults)playerGuildEl.guildResults.innerHTML=items.length?items.map((item,index)=>`<button class="playerGuildResultRow" data-player-guild-search-result="${index}" type="button"><span><strong>${escapeHtml(item.guildName)}</strong><small>${escapeHtml([item.guildMaster?`Master ${item.guildMaster}`:"",item.memberCount!==null?`${item.memberCount} members`:""].filter(Boolean).join(" · ")||"Public guild profile")}</small></span><b>Open &rarr;</b></button>`).join(""):'<div class="playerGuildEmptyResult">No guilds matched that search.</div>'}playerGuildSetView("results")}
function playerGuildRenderRoster(){const guild=playerGuildState.guild;if(!guild||!playerGuildEl.rosterRows)return;const query=norm(playerGuildEl.rosterFilter?.value),descending=playerGuildEl.rosterSort?.value==="name-desc",members=guild.members.filter(member=>!query||norm(member.familyName).includes(query)).sort((a,b)=>(descending?-1:1)*a.familyName.localeCompare(b.familyName));playerGuildState.renderedRoster=members;if(playerGuildEl.rosterSummary)playerGuildEl.rosterSummary.textContent=`${members.length} of ${guild.members.length} families`;playerGuildEl.rosterRows.innerHTML=members.length?members.map((member,index)=>{const master=norm(member.familyName)===norm(guild.guildMaster),classSlug=member.hasCachedProfile&&member.isPrivate===false?playerGuildClassSlug(member.className):"",hasArtwork=Boolean(classSlug),mainDetails=[member.mainCharacter,member.className].filter(Boolean).join(" · "),stateLabel=member.hasCachedProfile?(member.isPrivate===true?"private profile":member.isPrivate===false?"cached public profile":"profile visibility unknown"):"profile details not cached",accessibleLabel=`Open ${member.familyName} family profile${master?", guild master":""}; ${stateLabel}`;return`<button class="playerGuildMemberCard ${master?"guildMaster ":""}${hasArtwork?"hasClassArtwork":"nameOnly"}" data-player-guild-roster-member="${index}" type="button" aria-label="${escapeHtml(accessibleLabel)}">${hasArtwork?`<i class="playerGuildRosterAvatar hasClassArtwork" aria-hidden="true">${playerGuildClassIcon(member.className)}</i>`:""}<span class="playerGuildMemberCopy"><strong>${escapeHtml(member.familyName)}</strong>${hasArtwork?`<small>${escapeHtml([master?"Guild Master":"",mainDetails].filter(Boolean).join(" · "))}</small>`:""}</span><span class="playerGuildMemberOpen" aria-hidden="true">&rsaquo;</span></button>`}).join(""):'<div class="playerGuildRosterEmpty">No roster families match this filter.</div>'}
function playerGuildUpdateRosterMemberFromPlayer(player){const guild=playerGuildState.guild;if(!guild||playerGuildRegion(guild.region)!==playerGuildRegion(player.region))return;const member=guild.members.find(item=>norm(item.familyName)===norm(player.familyName));if(!member)return;member.hasCachedProfile=!player.stale;member.isPrivate=player.stale?null:player.isPrivate;member.mainCharacter="";member.className="";if(member.hasCachedProfile&&member.isPrivate===false){const main=player.characters.find(character=>character.isMain);if(main){member.mainCharacter=main.name;member.className=main.className}}playerGuildRenderRoster()}
function playerGuildRenderGuild(guild){playerGuildState.guild=guild;if(playerGuildEl.guildName)playerGuildEl.guildName.textContent=guild.guildName||"Guild profile";if(playerGuildEl.guildMeta)playerGuildEl.guildMeta.textContent=`${playerGuildRegionLabel(guild.region)} · ${guild.status||"Public profile"}`;if(playerGuildEl.guildUpdated)playerGuildEl.guildUpdated.textContent=playerGuildUpdatedText(guild.updated);if(playerGuildEl.guildMaster)playerGuildEl.guildMaster.textContent=guild.guildMaster||"—";const declared=Math.round(guild.memberCount||guild.members.length);if(playerGuildEl.memberCount)playerGuildEl.memberCount.textContent=declared.toLocaleString();if(playerGuildEl.profileCoverage)playerGuildEl.profileCoverage.textContent=declared?`${guild.members.length} / ${declared}`:"—";if(playerGuildEl.rosterFilter)playerGuildEl.rosterFilter.value="";playerGuildRenderRoster();playerGuildSetView("guild")}
function playerGuildLifeValue(skill){const rank=playerGuildString(skill.rank),level=playerGuildMetric(skill.level),mastery=playerGuildNumber(skill.mastery);const progress=[rank,level!=="—"?`Lv. ${level}`:""].filter(Boolean).join(" ")||"Public progress";return{progress,mastery:mastery!==null?`${Math.round(mastery).toLocaleString()} mastery`:""}}
function playerGuildHistoryDate(value){if(!value)return"";const date=new Date(value);return Number.isNaN(date.getTime())?playerGuildString(value):date.toLocaleDateString([],{dateStyle:"medium"})}
function playerGuildRenderProfileNotice(player){const notice=playerGuildEl.profileNotice;if(!notice)return;notice.hidden=true;delete notice.dataset.state;if(playerGuildEl.profileNoticeBadge)playerGuildEl.profileNoticeBadge.textContent="";if(playerGuildEl.profileNoticeCopy)playerGuildEl.profileNoticeCopy.textContent="";let state="",badge="",copy="";if(player.isPrivate===true){state="private";badge="Private profile";copy="Detailed progression is hidden by this adventurer. Public character names and classes may still appear."}else if(player.isComplete===false){state="limited";badge="Limited profile data";copy="Only part of this profile is publicly available. Missing values are shown as unavailable."}else{const hasDetails=player.characters.length||player.lifeSkills.length||player.guildHistory.length||playerGuildNumber(player.maxGearScore)!==null||playerGuildNumber(player.energy)!==null||playerGuildNumber(player.contribution)!==null||Boolean(player.familyCreated);if(player.isPrivate===null&&player.isComplete===null&&!hasDetails){state="empty";badge="No public details";copy="No detailed profile data was returned, so privacy could not be determined."}}if(!state)return;notice.dataset.state=state;if(playerGuildEl.profileNoticeBadge)playerGuildEl.profileNoticeBadge.textContent=badge;if(playerGuildEl.profileNoticeCopy)playerGuildEl.profileNoticeCopy.textContent=copy;notice.hidden=false}
function playerGuildRenderPlayer(player){playerGuildState.player=player;playerGuildRenderProfileNotice(player);if(playerGuildEl.familyName)playerGuildEl.familyName.textContent=player.familyName||"Family profile";if(playerGuildEl.familyMeta)playerGuildEl.familyMeta.textContent=`${playerGuildRegionLabel(player.region)}${player.guild?` · ${player.guild}`:" · No guild listed"}`;if(playerGuildEl.playerUpdated)playerGuildEl.playerUpdated.textContent=playerGuildUpdatedText(player.updated);if(playerGuildEl.maxGearScore)playerGuildEl.maxGearScore.textContent=playerGuildMetric(player.maxGearScore);if(playerGuildEl.contribution)playerGuildEl.contribution.textContent=playerGuildMetric(player.contribution);if(playerGuildEl.energy)playerGuildEl.energy.textContent=playerGuildMetric(player.energy);if(playerGuildEl.familyCreated){const date=new Date(player.familyCreated);playerGuildEl.familyCreated.textContent=player.familyCreated&&!Number.isNaN(date.getTime())?date.toLocaleDateString([],{dateStyle:"medium"}):playerGuildMetric(player.familyCreated)}const main=player.characters.find(character=>character.isMain)||player.characters[0];if(playerGuildEl.playerHeroIcon){playerGuildEl.playerHeroIcon.classList.toggle("hasClassIcon",Boolean(main&&playerGuildClassSlug(main.className)));playerGuildEl.playerHeroIcon.innerHTML=main?playerGuildClassIcon(main.className):""}if(playerGuildEl.characterCount)playerGuildEl.characterCount.textContent=`${player.characters.length} character${player.characters.length===1?"":"s"}`;if(playerGuildEl.characters)playerGuildEl.characters.innerHTML=player.characters.length?player.characters.map(character=>`<article class="playerGuildCharacterCard ${character.isMain?"main":""}"><div class="playerGuildClassIcon">${playerGuildClassIcon(character.className)}</div><div><strong>${escapeHtml(character.name||character.className||"Character")}</strong><span>${escapeHtml(character.className||"Class not listed")}</span><small>${character.level!==null?`Level ${escapeHtml(Math.round(character.level))}`:"Level not listed"}${character.isMain?" · Main":""}</small></div></article>`).join(""):'<div class="playerGuildDetailEmpty">No public characters were returned.</div>';if(playerGuildEl.lifeSkills)playerGuildEl.lifeSkills.innerHTML=player.lifeSkills.length?player.lifeSkills.map(skill=>{const value=playerGuildLifeValue(skill),slug=playerGuildLifeSlug(skill.name);return`<article class="playerGuildLifeSkillCard" data-life-skill="${escapeHtml(slug)}"><div class="playerGuildLifeIcon">${playerGuildLifeIcon(skill.name)}</div><div><strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(value.progress)}</span>${value.mastery?`<b>${escapeHtml(value.mastery)}</b>`:""}</div></article>`}).join(""):'<div class="playerGuildDetailEmpty">No public life-skill data was returned.</div>';if(playerGuildEl.history)playerGuildEl.history.innerHTML=player.guildHistory.length?player.guildHistory.map(item=>{const joined=playerGuildHistoryDate(item.joined),left=playerGuildHistoryDate(item.left),dates=[joined?`Joined ${joined}`:"",left?`Left ${left}`:""].filter(Boolean).join(" · ")||"Membership dates unavailable";return`<div class="playerGuildHistoryItem ${item.current?"current":""}"><strong>${escapeHtml(item.guildName)}</strong><span>${escapeHtml(dates)}</span><b>${escapeHtml(item.current?"Current guild":(item.role||"Previous guild"))}</b></div>`}).join(""):'<div class="playerGuildHistoryEmpty">No public guild history was returned.</div>';playerGuildSetView("player")}
function playerGuildProfileStatus(entity,label){const source=norm(entity.sourceStatus);const prefix=entity.stale?"Saved snapshot":entity.cached?"Local cache":source==="cached"?"Source cache":"Fetched now",message=playerGuildString(entity.message).replace(new RegExp("BDO"+" Alerts","gi"),"The profile service");playerGuildSetStatus(`${prefix} · ${label}`);if(message)playerGuildSetMessage(message,entity.stale?"error":"")}
async function playerGuildSearch(){
  if(playerGuildState.loading){playerGuildBusyFeedback();return}
  const query=playerGuildString(playerGuildEl.search?.value);
  if(query.length<2){playerGuildSetMessage(`Enter at least two characters. ${playerGuildModeLabel()} search expects ${playerGuildState.mode==="guild"?"a guild name":"a family name"}.`,"error");playerGuildEl.search?.focus();return}
  const mode=playerGuildState.mode,region=playerGuildRegion(playerGuildEl.region?.value);
  playerGuildState.region=region;
  persistSetting("playerGuildRegion",region);
  const request=playerGuildBeginRequest("search",`${playerGuildModeLabel(mode).toLowerCase()} search`, `Searching ${playerGuildRegionLabel(region)} ${mode==="guild"?"guilds":"players"}...`);
  if(!request)return;
  try{
    const data=await bridgeCall("searchBdoPlayersGuilds",{region,query,mode},{signal:request.controller.signal});
    if(playerGuildState.activeRequest!==request||request.controller.signal.aborted)return;
    const items=playerGuildNormalizeSearch(data,mode);
    playerGuildRenderSearchResults(items,mode);
    playerGuildSetStatus(items.length?`${items.length} ${mode==="guild"?"guild":"player"} match${items.length===1?"":"es"} found`:`No ${mode==="guild"?"guild":"player"} matches found`);
    if(!items.length){const opposite=playerGuildState.recents.find(item=>item.type!==mode&&item.region===region&&norm(item.name)===norm(query));const expected=mode==="guild"?"Guild searches use guild names.":"Player searches use family names, not character or guild names.";playerGuildSetMessage(`No ${mode==="guild"?"guilds":"players"} matched “${query}”. ${expected}${opposite?` This name is saved as a ${opposite.type}; switch to ${opposite.type==="guild"?"Guilds":"Players"} or use its Recent pill.`:""}`)}
  }catch(error){
    const cancelled=error?.name==="AbortError";
    playerGuildSetStatus(cancelled?"Search cancelled":"Search unavailable",cancelled?"ready":"error");
    playerGuildSetMessage(playerGuildRequestError(error,"Could not search public profiles.",request),cancelled?"":"error");
  }finally{playerGuildFinishRequest(request)}
}
async function playerGuildLoadGuild(guildName,region=playerGuildState.region,{forceRefresh=false}={}){
  if(!guildName)return;
  if(playerGuildState.loading){playerGuildBusyFeedback();return}
  playerGuildState.region=playerGuildRegion(region);
  if(playerGuildEl.region)playerGuildEl.region.value=playerGuildState.region;
  playerGuildSetMode("guild",{preserveView:true});
  const request=playerGuildBeginRequest("guild",forceRefresh?"guild refresh":"guild profile request",`${forceRefresh?"Refreshing":"Loading"} ${guildName}...`);
  if(!request)return;
  try{
    const data=await bridgeCall("getBdoGuildProfile",{region:playerGuildState.region,guildName,forceRefresh},{signal:request.controller.signal});
    if(playerGuildState.activeRequest!==request||request.controller.signal.aborted)return;
    const guild=playerGuildNormalizeGuild(data);
    if(!guild.guildName)guild.guildName=guildName;
    playerGuildRenderGuild(guild);
    playerGuildSaveRecent("guild",guild.region,guild.guildName);
    playerGuildProfileStatus(guild,"guild profile");
  }catch(error){
    const cancelled=error?.name==="AbortError";
    playerGuildSetStatus(cancelled?"Guild request cancelled":"Guild profile unavailable",cancelled?"ready":"error");
    playerGuildSetMessage(playerGuildRequestError(error,"Could not load that guild profile.",request),cancelled?"":"error");
  }finally{playerGuildFinishRequest(request)}
}
async function playerGuildLoadPlayer(familyName,region=playerGuildState.region,returnView=playerGuildState.view,{forceRefresh=false}={}){
  if(!familyName)return;
  if(playerGuildState.loading){playerGuildBusyFeedback();return}
  if(!forceRefresh)playerGuildState.playerReturnView=returnView==="guild"&&playerGuildState.guild?"guild":(playerGuildState.searchResults.length?"results":"welcome");
  playerGuildState.region=playerGuildRegion(region);
  if(playerGuildEl.region)playerGuildEl.region.value=playerGuildState.region;
  if(!forceRefresh&&returnView!=="guild")playerGuildSetMode("player",{preserveView:true});
  const request=playerGuildBeginRequest(forceRefresh?"player-refresh":"player",forceRefresh?"profile refresh":"player profile request",`${forceRefresh?"Refreshing":"Loading"} ${familyName}...`);
  if(!request)return;
  try{
    const payload={region:playerGuildState.region,familyName};
    if(forceRefresh)payload.forceRefresh=true;
    const data=await bridgeCall("getBdoPlayerProfile",payload,{signal:request.controller.signal});
    if(playerGuildState.activeRequest!==request||request.controller.signal.aborted)return;
    const player=playerGuildNormalizePlayer(data);
    if(!player.familyName)player.familyName=familyName;
    if(forceRefresh&&player.stale){playerGuildSetStatus("Profile refresh unavailable","error");playerGuildSetMessage("Could not refresh this profile. The current profile is still shown; try again.","error");return}
    if(returnView==="guild")playerGuildUpdateRosterMemberFromPlayer(player);
    playerGuildRenderPlayer(player);
    playerGuildSaveRecent("player",player.region,player.familyName);
    if(forceRefresh){playerGuildSetStatus("Profile refreshed");playerGuildSetMessage("")}else playerGuildProfileStatus(player,"player profile");
  }catch(error){
    const cancelled=error?.name==="AbortError";
    if(forceRefresh){playerGuildSetStatus(cancelled?"Profile refresh cancelled":"Profile refresh unavailable",cancelled?"ready":"error");playerGuildSetMessage(cancelled?playerGuildRequestError(error,"The refresh was cancelled.",request):"Could not refresh this profile. The current profile is still shown; try again.",cancelled?"":"error")}else{playerGuildSetStatus(cancelled?"Player request cancelled":"Player profile unavailable",cancelled?"ready":"error");playerGuildSetMessage(playerGuildRequestError(error,"Could not load that player profile.",request),cancelled?"":"error")}
  }finally{playerGuildFinishRequest(request)}
}
function initializePlayerGuild(){
  if(playerGuildState.initialized)return true;
  if(playerGuildState.initializing)return false;
  if(playerGuildState.bindingCleanup.length){const staleCleanup=playerGuildState.bindingCleanup.splice(0);staleCleanup.reverse().forEach(remove=>{try{remove()}catch{}})}
  playerGuildState.initializing=true;
  const cleanup=[];
  const bind=(target,type,handler,options)=>{if(!target)return;target.addEventListener(type,handler,options);cleanup.push(()=>target.removeEventListener(type,handler,options))};
  try{
    const required={view:document.getElementById("playerGuildView"),mode:playerGuildEl.mode,region:playerGuildEl.region,search:playerGuildEl.search,searchButton:playerGuildEl.searchButton,recents:playerGuildEl.recents};
    const missing=Object.entries(required).filter(([,element])=>!element).map(([name])=>name);
    if(missing.length)throw new Error(`Player & Guild markup is incomplete (${missing.join(", ")}).`);
    playerGuildLoadRecents();
    playerGuildState.region=playerGuildRegion(readSetting("playerGuildRegion","eu"));
    playerGuildState.mode=readSetting("playerGuildMode","player")==="guild"?"guild":"player";
    playerGuildEl.region.value=playerGuildState.region;
    playerGuildSetMode(playerGuildState.mode);
    playerGuildRenderRecents();
    cleanup.push(playerGuildBindRecentScroller(playerGuildEl.recents,bind));
    playerGuildSetView("welcome");
    playerGuildUpdateIntentGuidance({force:true});
    bind(playerGuildEl.searchButton,"click",event=>{if(event.currentTarget.form)event.preventDefault();if(playerGuildState.loading)playerGuildCancelActiveRequest();else playerGuildSearch()});
    bind(playerGuildEl.search,"keydown",event=>{if(event.key!=="Enter"||event.currentTarget.form)return;event.preventDefault();if(playerGuildState.loading)playerGuildBusyFeedback();else playerGuildSearch()});
    bind(playerGuildEl.search,"input",()=>playerGuildUpdateIntentGuidance({force:true}));
    bind(playerGuildEl.mode,"click",event=>{const button=event.target.closest("[data-player-guild-mode]");if(button&&!playerGuildState.loading)playerGuildSetMode(button.dataset.playerGuildMode)});
    bind(playerGuildEl.region,"change",()=>{playerGuildState.region=playerGuildRegion(playerGuildEl.region.value);playerGuildState.searchResults=[];persistSetting("playerGuildRegion",playerGuildState.region);if(playerGuildState.view==="results")playerGuildSetView("welcome");playerGuildSetStatus("Ready to search");playerGuildUpdateIntentGuidance({force:true})});
    bind(playerGuildEl.recents,"click",event=>{const button=event.target.closest("[data-player-guild-recent]");const item=button?playerGuildState.recents[Number(button.dataset.playerGuildRecent)]:null;if(!item)return;playerGuildState.searchResults=[];if(item.type==="guild")playerGuildLoadGuild(item.name,item.region);else playerGuildLoadPlayer(item.name,item.region,"welcome")});
    bind(playerGuildEl.results,"click",event=>{const button=event.target.closest("[data-player-guild-search-result]");const item=button?playerGuildState.searchResults[Number(button.dataset.playerGuildSearchResult)]:null;if(!item)return;if(playerGuildState.mode==="guild")playerGuildLoadGuild(item.guildName,playerGuildState.region);else playerGuildLoadPlayer(item.familyName,playerGuildState.region,"results")});
    bind(playerGuildEl.rosterRows,"click",event=>{const button=event.target.closest("[data-player-guild-roster-member]");const member=button?playerGuildState.renderedRoster[Number(button.dataset.playerGuildRosterMember)]:null;if(member?.familyName)playerGuildLoadPlayer(member.familyName,playerGuildState.guild?.region||playerGuildState.region,"guild")});
    bind(playerGuildEl.rosterFilter,"input",playerGuildRenderRoster);
    bind(playerGuildEl.rosterSort,"change",playerGuildRenderRoster);
    bind(playerGuildEl.lifeSkills,"error",playerGuildHandleIconError,true);
    bind(playerGuildEl.reloadGuild,"click",()=>{if(playerGuildState.loading){playerGuildBusyFeedback();return}if(playerGuildState.guild)playerGuildLoadGuild(playerGuildState.guild.guildName,playerGuildState.guild.region,{forceRefresh:true})});
    bind(playerGuildEl.reloadPlayer,"click",()=>{if(playerGuildState.loading){playerGuildBusyFeedback();return}const player=playerGuildState.player;if(player?.familyName)playerGuildLoadPlayer(player.familyName,player.region,playerGuildState.playerReturnView,{forceRefresh:true})});
    document.querySelectorAll("[data-player-guild-back]").forEach(button=>bind(button,"click",()=>{if(playerGuildState.loading){playerGuildCancelActiveRequest("The request was cancelled before leaving this profile.");return}playerGuildSetMessage("");if(playerGuildState.view==="player")playerGuildSetView(playerGuildState.playerReturnView);else playerGuildSetView(playerGuildState.searchResults.length?"results":"welcome");playerGuildSetStatus("Ready to search")}));
    bind(window,"pagehide",()=>playerGuildCancelActiveRequest("The application page closed."),{once:true});
    playerGuildState.bindingCleanup=cleanup;
    playerGuildState.initialized=true;
    return true;
  }catch(error){
    cleanup.reverse().forEach(remove=>{try{remove()}catch{}});
    playerGuildState.bindingCleanup=[];
    playerGuildState.initialized=false;
    playerGuildSetLoading(false);
    playerGuildSetStatus("Player & Guild unavailable","error");
    playerGuildSetMessage(playerGuildString(error?.message)||"Player & Guild could not initialize. Try opening the tab again.","error");
    console.error("Player & Guild initialization failed.",error);
    return false;
  }finally{playerGuildState.initializing=false}
}
function playerGuildHandleFormSubmit(event){
  if(event.target?.id!=="playerGuildSearchForm")return;
  event.preventDefault();
  if(!initializePlayerGuild())return;
  if(playerGuildState.loading)playerGuildBusyFeedback();else playerGuildSearch();
}
if(!window.__blackSpiritHubPlayerGuildSubmitGuard){window.__blackSpiritHubPlayerGuildSubmitGuard=true;document.addEventListener("submit",playerGuildHandleFormSubmit,true)}

const DEHKIA_CATALOG=[
  [11828,"Tungrad Earring","high"],[11629,"Tungrad Necklace","high"],[12061,"Tungrad Ring","high"],[12237,"Tungrad Belt","high"],
  [11630,"Laytenn's Power Stone","high"],[11607,"Ogre Ring","high"],[11662,"Revived River Necklace","high"],[11663,"Revived Lunar Necklace","high"],
  [11853,"Black Distortion Earring","high"],[12068,"Ominous Ring","high"],[11855,"Dawn Earring","high"],[12282,"Taebaek's Belt","high"],
  [11875,"Vaha's Dawn","high"],[11856,"Ethereal Earring","high"],[12257,"Turo's Belt","high"],
  [12042,"Forest Ronaros Ring","low"],[11628,"Serap's Necklace","low"],[11625,"Sicil's Necklace","low"],[12229,"Centaurus Belt","low"],
  [12251,"Orkinrad's Belt","low"],[12032,"Ring of Cadry Guardian","low"],[11834,"Narc Ear Accessory","low"],[12230,"Basilisk's Belt","low"],
  [12060,"Eye of the Ruins Ring","low"],[12031,"Ring of Crescent Guardian","low"],[12236,"Valtarra Eclipsed Belt","low"]
].map(([itemId,name,tier])=>({itemId,name,tier}));
const DEHKIA_ENHANCEMENTS={1:"PRI (I)",2:"DUO (II)",3:"TRI (III)"};
const DEHKIA_ENHANCEMENT_MARKS={1:"I",2:"II",3:"III",4:"IV"};
const DEHKIA_FUEL_YIELDS={high:{1:165,2:450,3:1275},low:{1:25,2:75,3:210}};
const DEHKIA_MARKET_ROW_COUNT=DEHKIA_CATALOG.length*3;
const DEHKIA_CANONICAL_KEYS=new Set(DEHKIA_CATALOG.flatMap(item=>[1,2,3].map(enhancementLevel=>`${item.itemId}:${enhancementLevel}`)));
const dehkiaEl={
  rows:document.getElementById("dehkiaRows"),refresh:document.getElementById("dehkiaRefresh"),
  state:document.getElementById("dehkiaDataState"),message:document.getElementById("dehkiaMessage"),
  updated:document.getElementById("dehkiaUpdatedText"),bestName:document.getElementById("dehkiaBestName"),bestValue:document.getElementById("dehkiaBestValue"),bestIconWrap:document.getElementById("dehkiaBestIconWrap"),bestIcon:document.getElementById("dehkiaBestIcon"),bestEnhancement:document.getElementById("dehkiaBestEnhancement"),
  crystal:document.getElementById("dehkiaCrystalValue"),crystalSource:document.getElementById("dehkiaCrystalSource"),useLiveCrystal:document.getElementById("dehkiaUseLiveCrystal"),crystalIcon:document.getElementById("dehkiaCrystalIcon")
};
function dehkiaStoredCrystal(){
  const stored=readSetting("dehkiaFuelCrystal",{}),value=Number(stored?.value);
  const mode=stored?.mode==="manual"?"manual":"live",trusted=mode==="manual"||stored?.verified===true;
  return{mode,value:trusted&&Number.isFinite(value)&&value>0?Math.floor(value):null,verified:trusted&&Number.isFinite(value)&&value>0};
}
const dehkiaState={ready:false,loading:false,rows:[],sortKey:"pricePerFuel",sortDirection:"asc",crystal:dehkiaStoredCrystal(),suggestedCrystalValue:null,crystalValueSource:null,crystalIconPath:"Assets/DehkiaFuel/item-766108.png",status:"idle",fetchedUtc:null,marketRows:0};
function dehkiaStaticRows(){return DEHKIA_CATALOG.flatMap(item=>[1,2,3].map(enhancementLevel=>({...item,enhancementLevel,fuelYield:DEHKIA_FUEL_YIELDS[item.tier][enhancementLevel],price:null,stock:null,iconPath:""})))}
function dehkiaNonNegative(value){if(value===null||value===undefined||value==="")return null;const numeric=Number(value);return Number.isFinite(numeric)&&numeric>=0?Math.floor(numeric):null}
function dehkiaPositive(value){const numeric=dehkiaNonNegative(value);return numeric!==null&&numeric>0?numeric:null}
function dehkiaKey(itemId,enhancementLevel){return`${itemId}:${enhancementLevel}`}
function dehkiaSafeIconPath(value){const path=String(value||"").replace(/\\/g,"/");return /^Assets\/[A-Za-z0-9_ ./-]+\.(?:png|webp|jpg|jpeg)$/i.test(path)&&!path.includes("..")&&!path.includes("://")?path:""}
function dehkiaIconPath(row){return`Assets/DehkiaFuel/item-${row.itemId}.png`}
function dehkiaEnhancementMark(enhancementLevel){return DEHKIA_ENHANCEMENT_MARKS[Number(enhancementLevel)]||String(enhancementLevel||"")}
function dehkiaNormalizeRows(payload){
  const supplied=Array.isArray(payload?.rows)?payload.rows:Array.isArray(payload?.items)?payload.items:[];
  const catalogById=new Map(DEHKIA_CATALOG.map(item=>[item.itemId,item])),merged=new Map(dehkiaStaticRows().map(row=>[dehkiaKey(row.itemId,row.enhancementLevel),row]));
  for(const source of supplied){
    const itemId=dehkiaNonNegative(source?.itemId??source?.item_id),enhancementLevel=dehkiaNonNegative(source?.enhancementLevel??source?.enhancement_level??source?.enhancement);
    if(!itemId||![1,2,3].includes(enhancementLevel))continue;
    const catalog=catalogById.get(itemId),tier=catalog?.tier??(["high","low"].includes(String(source?.tier).toLowerCase())?String(source.tier).toLowerCase():"");
    if(!tier)continue;
    const fuelYield=catalog?DEHKIA_FUEL_YIELDS[tier][enhancementLevel]:dehkiaNonNegative(source?.fuelYield??source?.fuel_yield??source?.lightFuel);
    if(!fuelYield)continue;
    const name=String(source?.name??source?.itemName??source?.item_name??catalog?.name??`Item ${itemId}`).trim()||catalog?.name||`Item ${itemId}`;
    merged.set(dehkiaKey(itemId,enhancementLevel),{itemId,name,tier,enhancementLevel,fuelYield,price:dehkiaNonNegative(source?.price??source?.currentPrice??source?.current_price),stock:dehkiaNonNegative(source?.stock??source?.currentStock??source?.current_stock),iconPath:dehkiaSafeIconPath(source?.iconPath??source?.icon_path)});
  }
  return[...merged.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.enhancementLevel-b.enhancementLevel);
}
function dehkiaRowsAreComplete(rows){
  if(!Array.isArray(rows)||rows.length!==DEHKIA_MARKET_ROW_COUNT)return false;
  const seen=new Set();
  for(const row of rows){const itemId=dehkiaNonNegative(row?.itemId??row?.item_id),enhancementLevel=dehkiaNonNegative(row?.enhancementLevel??row?.enhancement_level??row?.enhancement),key=dehkiaKey(itemId,enhancementLevel),price=dehkiaPositive(row?.price??row?.currentPrice??row?.current_price),stock=dehkiaNonNegative(row?.stock??row?.currentStock??row?.current_stock);if(!DEHKIA_CANONICAL_KEYS.has(key)||seen.has(key)||price===null||stock===null)return false;seen.add(key)}
  return seen.size===DEHKIA_MARKET_ROW_COUNT;
}
function dehkiaCompleteMarketRows(payload){const supplied=Array.isArray(payload?.rows)?payload.rows:Array.isArray(payload?.items)?payload.items:[];if(!dehkiaRowsAreComplete(supplied))return null;const normalized=dehkiaNormalizeRows({rows:supplied});return dehkiaRowsAreComplete(normalized)?normalized:null}
function dehkiaValidTimestamp(value){if(value===null||value===undefined||value==="")return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:value}
function dehkiaNormalizeStatus(payload){const raw=String(payload?.status||"").toLowerCase();if(raw==="cache")return"cached";if(["live","cached","stale","error","reference"].includes(raw))return raw;if(payload?.isStale===true)return"stale";if(payload?.cached===true)return"cached";return"live"}
function dehkiaRestoreSnapshot(){
  const snapshot=readSetting("dehkiaFuelSnapshot",null);if(!snapshot||!Array.isArray(snapshot.rows))return false;
  const rows=dehkiaCompleteMarketRows({rows:snapshot.rows});if(!rows)return false;
  dehkiaState.rows=rows;dehkiaState.marketRows=DEHKIA_MARKET_ROW_COUNT;dehkiaState.status="cached";dehkiaState.fetchedUtc=dehkiaValidTimestamp(snapshot.fetchedUtc);
  dehkiaState.suggestedCrystalValue=dehkiaPositive(snapshot.suggestedCrystalValue);dehkiaState.crystalValueSource=snapshot.crystalValueSource&&typeof snapshot.crystalValueSource==="object"?snapshot.crystalValueSource:null;
  dehkiaState.crystalIconPath=dehkiaSafeIconPath(snapshot.crystalIconPath)||"Assets/DehkiaFuel/item-766108.png";
  if(dehkiaState.crystal.mode==="live"&&dehkiaState.suggestedCrystalValue!==null)dehkiaState.crystal={mode:"live",value:dehkiaState.suggestedCrystalValue,verified:true};
  return true;
}
function dehkiaPersistSnapshot(){if(!dehkiaRowsAreComplete(dehkiaState.rows))return false;persistSetting("dehkiaFuelSnapshot",{schemaVersion:2,fetchedUtc:dehkiaState.fetchedUtc,rows:dehkiaState.rows,suggestedCrystalValue:dehkiaState.suggestedCrystalValue,crystalValueSource:dehkiaState.crystalValueSource,crystalIconPath:dehkiaState.crystalIconPath});return true}
function dehkiaSetMessage(text,state="idle"){
  if(!dehkiaEl.message)return;dehkiaEl.message.hidden=!text;dehkiaEl.message.textContent=text||"";dehkiaEl.message.dataset.state=state;
}
function dehkiaSetStatus(label,state){if(!dehkiaEl.state)return;dehkiaEl.state.textContent=label;dehkiaEl.state.dataset.state=state}
function dehkiaTotalCost(row,crystalValue){if(row.price===null||row.price<=0||dehkiaPositive(crystalValue)===null)return null;return row.price+10*crystalValue}
function dehkiaEnrichRows(){
  const crystal=dehkiaPositive(dehkiaState.crystal.value),complete=dehkiaRowsAreComplete(dehkiaState.rows);
  const rows=dehkiaState.rows.map(row=>{const key=dehkiaKey(row.itemId,row.enhancementLevel),totalCost=complete?dehkiaTotalCost(row,crystal):null,pricePerFuel=totalCost===null?null:Math.floor(totalCost/row.fuelYield),eligible=complete&&crystal!==null&&(row.price??0)>0&&(row.stock??0)>0;return{...row,key,totalCost,pricePerFuel,eligible}});
  const ranked=rows.filter(row=>row.eligible&&row.pricePerFuel!==null).sort((a,b)=>a.pricePerFuel-b.pricePerFuel||a.name.localeCompare(b.name)||a.enhancementLevel-b.enhancementLevel);
  const ranks=new Map(ranked.map((row,index)=>[row.key,index+1]));return rows.map(row=>({...row,rank:ranks.get(row.key)??null}));
}
function dehkiaSortValue(row,key){if(key==="name")return row.name.toLocaleLowerCase();return row[key]}
function dehkiaSortedRows(rows){
  const key=dehkiaState.sortKey,direction=dehkiaState.sortDirection==="desc"?-1:1;
  return rows.slice().sort((a,b)=>{const av=dehkiaSortValue(a,key),bv=dehkiaSortValue(b,key),aNull=av===null||av===undefined,bNull=bv===null||bv===undefined;if(aNull!==bNull)return aNull?1:-1;let compared=0;if(typeof av==="string")compared=av.localeCompare(bv);else compared=av-bv;return compared?compared*direction:a.name.localeCompare(b.name)||a.enhancementLevel-b.enhancementLevel});
}
function dehkiaFormatInteger(value){return value===null||value===undefined?"—":Math.floor(value).toLocaleString()}
function dehkiaFormatSilver(value){
  if(value===null||value===undefined)return"—";const numeric=Math.floor(value),units=[[1e12,"T"],[1e9,"B"],[1e6,"M"],[1e3,"K"]];
  for(const[limit,suffix]of units)if(numeric>=limit){const scaled=numeric/limit;return`${scaled>=100?scaled.toFixed(0):scaled>=10?scaled.toFixed(1):scaled.toFixed(2)}`.replace(/\.?0+$/,"")+suffix}return numeric.toLocaleString();
}
function dehkiaDateText(value){const date=new Date(value||"");return Number.isNaN(date.getTime())?"Update time unavailable":`Updated ${date.toLocaleString([],{dateStyle:"medium",timeStyle:"short"})}`}
function dehkiaCrystalSourceText(){
  const suggested=dehkiaState.suggestedCrystalValue,source=dehkiaState.crystalValueSource,current=dehkiaPositive(dehkiaState.crystal.value);if(dehkiaState.crystal.mode==="manual")return current!==null?(suggested!==null?`Manual value · live estimate ${dehkiaFormatSilver(suggested)}`:"Manual value · live estimate unavailable"):"Enter a crystal price to calculate totals and rankings.";
  if(suggested===null)return current!==null?"Last verified value · live estimate unavailable":"Live estimate unavailable · enter a crystal price to calculate totals.";
  const sourceName=String(source?.name||"lowest-priced Imperfect Lightstone"),yieldCount=dehkiaNonNegative(source?.yield)||6,stock=dehkiaNonNegative(source?.stock);return`Live estimate from ${sourceName} ÷ ${yieldCount}${stock!==null?` · stock ${stock.toLocaleString()}`:""}`;
}
function dehkiaSyncCrystalControls(){
  if(dehkiaEl.crystal&&document.activeElement!==dehkiaEl.crystal){const value=dehkiaPositive(dehkiaState.crystal.value);dehkiaEl.crystal.value=value===null?"":String(value)}
  if(dehkiaEl.crystalSource)dehkiaEl.crystalSource.textContent=dehkiaCrystalSourceText();if(dehkiaEl.useLiveCrystal)dehkiaEl.useLiveCrystal.disabled=dehkiaState.suggestedCrystalValue===null||dehkiaState.crystal.mode==="live";if(dehkiaEl.crystalIcon)dehkiaEl.crystalIcon.src=dehkiaSafeIconPath(dehkiaState.crystalIconPath)||"Assets/DehkiaFuel/item-766108.png";
}
function dehkiaRenderSummary(allRows){
  const hasCrystal=dehkiaPositive(dehkiaState.crystal.value)!==null,marketBest=allRows.filter(row=>row.price>0&&row.stock>0&&row.pricePerFuel!==null).sort((a,b)=>a.pricePerFuel-b.pricePerFuel||a.name.localeCompare(b.name))[0];
  if(dehkiaEl.bestName)dehkiaEl.bestName.textContent=!hasCrystal?"Crystal value required":marketBest?`${DEHKIA_ENHANCEMENTS[marketBest.enhancementLevel]} ${marketBest.name}`:"No in-stock market choice";
  if(dehkiaEl.bestValue)dehkiaEl.bestValue.textContent=!hasCrystal?"Enter the Magical Lightstone Crystal price to calculate efficiency.":marketBest?`${dehkiaFormatSilver(marketBest.pricePerFuel)} silver per fuel`:"Refresh when market stock is available.";
  if(dehkiaEl.bestIconWrap){dehkiaEl.bestIconWrap.hidden=!marketBest;dehkiaEl.bestIconWrap.title=marketBest?DEHKIA_ENHANCEMENTS[marketBest.enhancementLevel]:""}if(dehkiaEl.bestIcon&&marketBest){dehkiaEl.bestIcon.src=dehkiaIconPath(marketBest);dehkiaEl.bestIcon.alt=`${DEHKIA_ENHANCEMENTS[marketBest.enhancementLevel]} ${marketBest.name}`}if(dehkiaEl.bestEnhancement){dehkiaEl.bestEnhancement.textContent=marketBest?dehkiaEnhancementMark(marketBest.enhancementLevel):"";dehkiaEl.bestEnhancement.dataset.level=marketBest?String(marketBest.enhancementLevel):""}if(dehkiaEl.updated)dehkiaEl.updated.textContent=dehkiaState.marketRows===DEHKIA_MARKET_ROW_COUNT?`${DEHKIA_MARKET_ROW_COUNT.toLocaleString()} market choices · ${dehkiaDateText(dehkiaState.fetchedUtc)}`:`Market snapshot unavailable · ${dehkiaDateText(dehkiaState.fetchedUtc)}`;dehkiaSyncCrystalControls();
}
function dehkiaRenderSortHeaders(){document.querySelectorAll("[data-dehkia-sort]").forEach(button=>{const active=button.dataset.dehkiaSort===dehkiaState.sortKey;button.classList.toggle("active",active);if(active)button.dataset.direction=dehkiaState.sortDirection;else delete button.dataset.direction;button.setAttribute("aria-sort",active?(dehkiaState.sortDirection==="asc"?"ascending":"descending"):"none")})}
function dehkiaRender(){
  if(!dehkiaEl.rows)return;const all=dehkiaEnrichRows(),rows=dehkiaSortedRows(all);dehkiaRenderSummary(all);dehkiaRenderSortHeaders();
  dehkiaEl.rows.innerHTML=rows.map(row=>{const available=row.eligible,stockAvailable=row.stock>0&&row.price>0,icon=dehkiaIconPath(row),enhancementLabel=DEHKIA_ENHANCEMENTS[row.enhancementLevel]||dehkiaEnhancementMark(row.enhancementLevel),exactPrice=row.price===null?"":row.price.toLocaleString(),exactCost=row.totalCost===null?"":row.totalCost.toLocaleString(),exactEfficiency=row.pricePerFuel===null?"":row.pricePerFuel.toLocaleString();return`<tr class="${available?"":"unavailable"}" data-dehkia-row="${row.key}"><td><div class="dehkiaItemCell"><span class="dehkiaRank ${row.rank===1?"best":""}">${row.rank??"—"}</span><span class="dehkiaItemIconWrap" title="${escapeHtml(enhancementLabel)}"><img class="dehkiaItemIcon" src="${escapeHtml(icon)}" alt=""><span class="dehkiaIconEnhancement" data-level="${row.enhancementLevel}" aria-hidden="true">${dehkiaEnhancementMark(row.enhancementLevel)}</span></span><span class="dehkiaItemCopy"><strong title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</strong><span class="dehkiaItemMeta"><i class="dehkiaEnhancement">${enhancementLabel}</i><i class="dehkiaTierBadge ${row.tier}">${row.tier==="high"?"High tier":"Low tier"}</i></span></span></div></td><td class="dehkiaNumber" title="${exactPrice}">${dehkiaFormatSilver(row.price)}</td><td class="dehkiaNumber">${dehkiaFormatInteger(row.fuelYield)}</td><td><span class="dehkiaStockState ${stockAvailable?"available":"unavailable"}"><b class="dehkiaNumber">${dehkiaFormatInteger(row.stock)}</b><small>${stockAvailable?"Available":"Unavailable"}</small></span></td><td class="dehkiaNumber" title="${exactCost}">${dehkiaFormatSilver(row.totalCost)}</td><td class="dehkiaNumber dehkiaEfficiency" title="${exactEfficiency}">${dehkiaFormatSilver(row.pricePerFuel)}</td></tr>`}).join("");
}
function dehkiaApplyPayload(payload){
  const rows=dehkiaCompleteMarketRows(payload);if(!rows)return 0;dehkiaState.rows=rows;dehkiaState.marketRows=DEHKIA_MARKET_ROW_COUNT;dehkiaState.status=dehkiaNormalizeStatus(payload);dehkiaState.fetchedUtc=dehkiaValidTimestamp(payload?.fetchedUtc??payload?.scrapedAt??payload?.scraped_at??payload?.updatedUtc);
  dehkiaState.suggestedCrystalValue=dehkiaPositive(payload?.suggestedCrystalValue??payload?.suggested_crystal_value);dehkiaState.crystalValueSource=payload?.crystalValueSource??payload?.crystal_value_source??null;
  dehkiaState.crystalIconPath=dehkiaSafeIconPath(payload?.crystalIconPath??payload?.crystal_icon_path)||"Assets/DehkiaFuel/item-766108.png";
  if(dehkiaState.crystal.mode==="live"&&dehkiaState.suggestedCrystalValue!==null)dehkiaState.crystal={mode:"live",value:dehkiaState.suggestedCrystalValue,verified:true};
  if(dehkiaPositive(dehkiaState.crystal.value)!==null)persistSetting("dehkiaFuelCrystal",dehkiaState.crystal);dehkiaPersistSnapshot();return DEHKIA_MARKET_ROW_COUNT;
}
async function dehkiaLoad(forceRefresh=false){
  if(dehkiaState.loading)return;dehkiaState.loading=true;if(dehkiaEl.refresh){dehkiaEl.refresh.disabled=true;dehkiaEl.refresh.textContent=forceRefresh?"Refreshing...":"Loading..."}dehkiaSetStatus(forceRefresh?"Refreshing market":"Loading market","loading");dehkiaSetMessage(forceRefresh?"Refreshing market prices while keeping the current table available...":"Loading Dehkia market prices...","idle");
  try{
    const payload=await bridgeCall("getDehkiaFuelData",{forceRefresh:Boolean(forceRefresh)}),marketRows=dehkiaApplyPayload(payload);
    if(!marketRows){const restored=dehkiaRestoreSnapshot();if(restored){dehkiaSetStatus("Cached market data","stale");dehkiaSetMessage("Live market values are temporarily unavailable. The last complete local snapshot is still shown.","stale")}else{dehkiaState.status="error";dehkiaSetStatus("Market unavailable","error");dehkiaSetMessage("Market values are temporarily unavailable. The complete official accessory list remains visible and will update on the next successful refresh.","error")}}
    else if(dehkiaState.status==="cached"||dehkiaState.status==="stale"){dehkiaSetStatus(dehkiaState.status==="cached"?"Cached market data":"Stale market data",dehkiaState.status);dehkiaSetMessage("Showing the most recent complete local market snapshot.",dehkiaState.status)}else{dehkiaSetStatus("Live market data","live");dehkiaSetMessage("")}
  }catch(error){
    const restored=dehkiaState.marketRows>0||dehkiaRestoreSnapshot();if(restored){dehkiaState.status="stale";dehkiaSetStatus("Cached market data","stale");dehkiaSetMessage("The live refresh could not finish. Your last complete local market snapshot is still shown.","stale")}else{dehkiaState.rows=dehkiaStaticRows();dehkiaState.marketRows=0;dehkiaState.status="error";dehkiaSetStatus("Market unavailable","error");dehkiaSetMessage("Market values could not be loaded. The official accessory list is available and the controls are ready to try again.","error")}
  }finally{dehkiaState.loading=false;if(dehkiaEl.refresh){dehkiaEl.refresh.disabled=false;dehkiaEl.refresh.textContent="Refresh Market"}dehkiaRender()}
}
function dehkiaSetCrystalManual(){const value=dehkiaPositive(dehkiaEl.crystal?.value);if(value===null){dehkiaSyncCrystalControls();return}dehkiaState.crystal={mode:"manual",value,verified:true};persistSetting("dehkiaFuelCrystal",dehkiaState.crystal);dehkiaRender()}
function dehkiaUseLiveCrystal(){if(dehkiaState.suggestedCrystalValue===null)return;dehkiaState.crystal={mode:"live",value:dehkiaState.suggestedCrystalValue,verified:true};persistSetting("dehkiaFuelCrystal",dehkiaState.crystal);dehkiaRender()}
function dehkiaHandleIconError(event){const image=event.target;if(!(image instanceof HTMLImageElement)||!image.classList.contains("dehkiaItemIcon"))return;const fallback=document.createElement("span");fallback.className="dehkiaItemFallback";fallback.textContent="?";fallback.setAttribute("aria-hidden","true");image.replaceWith(fallback)}
function initializeDehkiaFuel(){
  if(dehkiaState.ready)return;if(!dehkiaEl.rows||!dehkiaEl.refresh)return;dehkiaState.ready=true;dehkiaState.rows=dehkiaStaticRows();dehkiaRestoreSnapshot();dehkiaSyncCrystalControls();
  dehkiaEl.refresh.addEventListener("click",()=>dehkiaLoad(true));dehkiaEl.crystal?.addEventListener("change",dehkiaSetCrystalManual);dehkiaEl.useLiveCrystal?.addEventListener("click",dehkiaUseLiveCrystal);
  dehkiaEl.rows.addEventListener("error",dehkiaHandleIconError,true);dehkiaEl.bestIcon?.addEventListener("error",()=>{if(dehkiaEl.bestIconWrap)dehkiaEl.bestIconWrap.hidden=true});dehkiaEl.crystalIcon?.addEventListener("error",()=>{const fallback="Assets/DehkiaFuel/item-766108.png";if(!dehkiaEl.crystalIcon.src.endsWith(fallback))dehkiaEl.crystalIcon.src=fallback});
  document.querySelectorAll("[data-dehkia-sort]").forEach(button=>button.addEventListener("click",()=>{const key=button.dataset.dehkiaSort,defaults={name:"asc",price:"asc",fuelYield:"desc",stock:"desc",totalCost:"asc",pricePerFuel:"asc"};if(dehkiaState.sortKey===key)dehkiaState.sortDirection=dehkiaState.sortDirection==="asc"?"desc":"asc";else{dehkiaState.sortKey=key;dehkiaState.sortDirection=defaults[key]||"asc"}dehkiaRender()}));
  dehkiaRender();dehkiaLoad(false);
}

initializeAppVersion();
initializeHomeDashboard();
setTimeout(()=>initializeCoupons(),1000);
setTimeout(()=>initializeUpdateChecker(),1600);
document.addEventListener("click", async event => {
  const external = event.target.closest("[data-open-url]");
  if(!external || external.closest("#couponDetail")) return;
  try {
    await bridgeCall("openExternalUrl", { url: external.dataset.openUrl });
  } catch(error) {
    NotificationService.ShowError(error.message || "Could not open link.");
  }
});

/* RECIPE_BOOK_CORE_START */
const RECIPE_BOOK_PAGE_SIZE=24;
const RECIPE_BOOK_ASSET_ROOT="https://recipebook.bdo.local/";
const RECIPE_BOOK_TYPE_LABELS=Object.freeze({
  COOK:"Cooking",COOKING:"Cooking",ALCHEMY:"Alchemy",SIMPLE_COOK:"Simple Cooking",SIMPLE_COOKING:"Simple Cooking",SIMPLE_ALCHEMY:"Simple Alchemy",
  HEAT:"Heating",HEATING:"Heating",GRIND:"Grinding",GRINDING:"Grinding",SHAKE:"Shaking",SHAKING:"Shaking",DRY:"Drying",DRYING:"Drying",
  THINNING:"Filtering",FILTER:"Filtering",FILTERING:"Filtering",FIREWOOD:"Chopping",CHOP:"Chopping",CHOPPING:"Chopping",CRAFT:"Manufacture",
  MANUFACTURE:"Manufacture",GUILD:"Guild Processing",GUILD_PROCESSING:"Guild Processing",ROYALGIFT_COOK:"Imperial Cuisine",IMPERIAL_CUISINE:"Imperial Cuisine",
  ROYALGIFT_ALCHEMY:"Imperial Alchemy",IMPERIAL_ALCHEMY:"Imperial Alchemy",HOUSE:"Workshop",WORKSHOP:"Workshop"
});
function recipeBookSubstitutionGroupDefinition(id,name,recipeTypes,representativeItemId,fallbackIcon,members,sharedIcon=false){
  return Object.freeze({
    id,name,representativeItemId:String(representativeItemId),fallbackIcon,sharedIcon:Boolean(sharedIcon),
    recipeTypes:Object.freeze(recipeTypes.map(recipeBookTypeKey)),
    members:Object.freeze(members.map(([itemId,memberName,factor=1,sourceWorth=factor,tier="standard"])=>Object.freeze({
      itemId:String(itemId),key:recipeBookIngredientKey(itemId,0),name:memberName,factor,sourceWorth,tier
    })))
  });
}
/*
 * These are explicit recipe-substitution groups, not visual guesses. Similar-looking
 * saps, timber, mushrooms, herbs, and other materials stay separate unless the
 * current BDO recipe rules identify them as substitutes.
 */
const RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS=Object.freeze([
  recipeBookSubstitutionGroupDefinition("blood-1","Blood Group 1",["ALCHEMY"],6214,"icons/items/7133a3c458cef7d13205e504ff12d2fa4466d1d5ad0d8eed200d152cb375b6b0.webp",[
    [6204,"Rhino Blood",1,1],[6214,"Wolf Blood",1,1],[6216,"Cheetah Dragon Blood",1,2],[6218,"Flamingo Blood",1,2]
  ],true),
  recipeBookSubstitutionGroupDefinition("blood-2","Blood Group 2",["ALCHEMY"],6205,"icons/items/37bbfa006af0128eb041211e893cca5a2ae937adad2786eac4ab98408715b74e.webp",[
    [6201,"Deer Blood",1,2],[6202,"Sheep Blood",1,2],[6205,"Pig Blood",1,1],[6206,"Ox Blood",1,2],[6215,"Waragon Blood",1,2],[6227,"Llama Blood",1,2],[6228,"Goat Blood",1,2]
  ],true),
  recipeBookSubstitutionGroupDefinition("blood-3","Blood Group 3",["ALCHEMY"],6203,"icons/items/2e5e0a99b3d7a2406585a91637c006c697771a50dc4c21d7d4a9f781bc21d650.webp",[
    [6203,"Fox Blood",1,1],[6210,"Raccoon Blood",1,2],[6211,"Monkey Blood",1,2],[6212,"Weasel Blood",1,2],[6224,"Scorpion Blood",1,1],[6226,"Marmot Blood",1,2]
  ],true),
  recipeBookSubstitutionGroupDefinition("blood-4","Blood Group 4",["ALCHEMY"],6213,"icons/items/0eb332d73942a88e043b9f62f59d82cdd176382d60b16d9f9ae919f8132d3ead.webp",[
    [6207,"Dinosaur Blood",1,2],[6213,"Bear Blood",1,1],[6220,"Troll Blood",1,2],[6221,"Ogre Blood",1,2],[6223,"Lion Blood",1,1],[6225,"Yak Blood",1,1],[6359,"Rock Elephant Blood",1,1]
  ],true),
  recipeBookSubstitutionGroupDefinition("blood-5","Blood Group 5",["ALCHEMY"],6208,"icons/items/d73cbeafc5dd6747f2b38523360582fbcb88dc3a8ca148175f4cea11b481a123.webp",[
    [6208,"Lizard Blood",1,1],[6209,"Worm Blood",1,2],[6217,"Kuku Bird Blood",1,2],[6219,"Bat Blood",1,2],[6222,"Cobra Blood",1,2]
  ],true),
  recipeBookSubstitutionGroupDefinition("meat-1","Meat Group 1",["COOK"],7905,"icons/items/ef4665a1c1b884038cc11c42f32a0c264bafcd288b80b5876e714f73bde3e384.webp",[
    [7901,"Deer Meat",1,2],[7902,"Lamb Meat",1,2],[7903,"Fox Meat",1,2],[7904,"Rhino Meat",1,2],[7905,"Pork",1,1],[7906,"Beef",1,2],[7910,"Raccoon Meat",1,2],[7911,"Weasel Meat",1,2],[7912,"Bear Meat",1,2],[7913,"Wolf Meat",1,2],[7925,"Gazelle Meat",1,2],[7957,"Goat Meat",1,2],[7960,"Sea Lion Meat",1,2],[7961,"Rabbit Meat",1,2],[7962,"Rock Elephant Meat",1,2]
  ],true),
  recipeBookSubstitutionGroupDefinition("meat-reptile","Reptile Meat Group",["COOK"],7908,"icons/items/0f480088bc0683a746d8c46af6f0e0fc1364c9630e9f6c283c21ac967f39911d.webp",[
    [7907,"Dinosaur Meat",1,2],[7908,"Lizard Meat",1,1],[7909,"Worm Meat",1,2],[7914,"Waragon Meat",2,4,"double"],[7915,"Cheetah Dragon Meat",2,4,"double"]
  ],true),
  recipeBookSubstitutionGroupDefinition("meat-bird","Bird Meat Group",["COOK"],7921,"icons/items/e3b0ad08fed6b98d51c480060785084230b03807c32927aeefc1f3268da3e58f.webp",[
    [7916,"Kuku Bird Meat",1,2],[7917,"Flamingo Meat",1,2],[7921,"Chicken Meat",1,1],[7953,"Bird Meat",1,2]
  ],true),
  recipeBookSubstitutionGroupDefinition("grain","Grain Group",["COOK","SIMPLE_COOK"],7001,"icons/items/85973e7826b3797718fbce8e3108beea89e14a3fbe4856f4f6d82610cb942e56.webp",[
    [7001,"Wheat",1,1],[7002,"Barley",1,2],[7003,"Potato",1,2],[7004,"Sweet Potato",1,2],[7005,"Corn",1,2],
    [7006,"High-quality Wheat",2,6,"high-quality"],[7007,"High-quality Barley",2,6,"high-quality"],[7008,"High-quality Potato",2,6,"high-quality"],[7009,"High-quality Sweet Potato",2,6,"high-quality"],[7010,"High-quality Corn",2,6,"high-quality"],
    [7011,"Special Wheat",3,36,"special"],[7012,"Special Barley",3,36,"special"],[7013,"Special Potato",3,36,"special"],[7014,"Special Sweet Potato",3,36,"special"],[7015,"Special Corn",3,36,"special"]
  ]),
  recipeBookSubstitutionGroupDefinition("flour","Flour Group",["COOK"],7101,"icons/items/983c82f39c5365f2b286cc55a6080cac514642bef8d8ab0af4b6c985dbb246d6.webp",[
    [7101,"Wheat Flour",1,1],[7102,"Barley Flour",1,2],[7103,"Potato Flour",1,2],[7104,"Sweet Potato Flour",1,2],[7105,"Corn Flour",1,2]
  ]),
  recipeBookSubstitutionGroupDefinition("dough","Dough Group",["COOK"],7201,"icons/items/4801ebc4cb262b9ef5e34916fde81a2950d614aefd2dac721cbd60e05507e542.webp",[
    [7201,"Wheat Dough",1,1],[7202,"Barley Dough",2,4,"double"],[7203,"Potato Dough",2,4,"double"],[7204,"Sweet Potato Dough",2,4,"double"],[7205,"Corn Dough",2,4,"double"]
  ]),
  recipeBookSubstitutionGroupDefinition("fruit","Fruit Group",["COOK"],7313,"icons/items/19aa821d3912433d33414a60cd8898aa365cccdc81e63c805876bf6960270602.webp",[
    [7304,"Strawberry",1,2],[7307,"Grape",1,2],[7313,"Apple",1,1],[7314,"Cherry",1,2],[7315,"Pear",1,2],[7316,"Banana",1,2],[7317,"Pineapple",1,2],[820108,"Wild Berry",1,1],[820113,"Persimmon",1,1],
    [7321,"High-quality Strawberry",2,12,"high-quality"],[7329,"High-quality Grape",2,12,"high-quality"],[7322,"Special Strawberry",3,72,"special"],[7341,"Special Grape",3,72,"special"]
  ]),
  recipeBookSubstitutionGroupDefinition("vegetable","Vegetable Group",["COOK"],7318,"icons/items/be5e87bd89ff0dd27c272751f1f19d46fe07bbcef83949da038e92f99d3be571.webp",[
    [7306,"Pumpkin",1,1],[7309,"Olive",1,1],[7311,"Tomato",1,1],[7312,"Paprika",1,1],[7318,"Cabbage",1,1],
    [7328,"High-quality Pumpkin",2,6,"high-quality"],[7331,"High-quality Olive",2,6,"high-quality"],[7333,"High-quality Tomato",2,6,"high-quality"],[7334,"High-quality Paprika",2,6,"high-quality"],
    [7340,"Special Pumpkin",3,36,"special"],[7343,"Special Olive",3,36,"special"],[7345,"Special Tomato",3,36,"special"],[7346,"Special Paprika",3,36,"special"]
  ]),
  recipeBookSubstitutionGroupDefinition("flower","Flower Group",["COOK"],7319,"icons/items/100b8f522d0606e0970ae57a918ab37cb73abe0a16fd8447b7d8c96fde8dc88d.webp",[
    [7308,"Sunflower",1,2],[7319,"Rose",1,1],[7320,"Tulip",1,2],[7330,"High-quality Sunflower",2,12,"high-quality"],[7342,"Special Sunflower",3,72,"special"]
  ]),
  /* Herbal Juice is the reviewed exception where different wild herbs and Weeds share one recipe pool. The 10:3 integer scale preserves the exact 3-herb / 10-Weeds conversion without floating-point stock. */
  recipeBookSubstitutionGroupDefinition("herb-juice","Herb Group 1",["SIMPLE_ALCHEMY"],5401,"icons/items/a2cf3d61bf8fc2e3f6eacba09e30506ec41efc522d49f4eaa22155c3832eee53.webp",[
    [5401,"Sunrise Herb",10,1,"herb"],[5402,"Silver Azalea",10,1,"herb"],[5403,"Fire Flake Flower",10,1,"herb"],[5404,"Dry Mane Grass",10,1,"herb"],[5405,"Silk Honey Grass",10,1,"herb"],[5406,"Everlasting Herb",10,1,"herb"],[5439,"Wild Grass",10,1,"wild-grass"],[5600,"Weeds",3,1,"weeds"]
  ])
]);
function recipeBookIsPlainObject(value){return Boolean(value)&&typeof value==="object"&&!Array.isArray(value)}
function recipeBookSearchNorm(value){
  return String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']s\b/g,"").replace(/&/g," and ").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
}
function recipeBookSearchTokens(value){return [...new Set(recipeBookSearchNorm(value).split(" ").filter(Boolean))]}
function recipeBookTypeKey(value){return String(value??"").trim().toUpperCase().replace(/[\s-]+/g,"_")}
function recipeBookTypeLabel(value){
  const key=recipeBookTypeKey(value);
  if(RECIPE_BOOK_TYPE_LABELS[key])return RECIPE_BOOK_TYPE_LABELS[key];
  return key.split("_").filter(Boolean).map(word=>word.charAt(0)+word.slice(1).toLowerCase()).join(" ")||"Other Crafting";
}
function recipeBookSafeIconPath(value){
  let path=String(value??"").trim().replace(/\\/g,"/");
  if(!path||/^[a-z][a-z\d+.-]*:/i.test(path)||path.startsWith("//")||path.startsWith("/")||path.split("/").includes(".."))return "";
  path=path.replace(/^\.\//,"");
  if(path.startsWith("Assets/RecipeBook/"))path=path.slice("Assets/RecipeBook/".length);
  else if(path.startsWith("RecipeBook/"))path=path.slice("RecipeBook/".length);
  if(!/^icons\/(?:items\/[a-f\d]{64}\.webp|item-fallback\.svg)$/i.test(path))return "";
  return `${RECIPE_BOOK_ASSET_ROOT}${path}`;
}
function recipeBookAssert(condition,message){if(!condition)throw new Error(`Recipe catalog is invalid: ${message}`)}
function recipeBookOptionalEnhancement(value,path){
  if(value===undefined)return undefined;
  recipeBookAssert(Number.isInteger(value)&&value>=0&&value<=99,`${path} must be an integer from 0 to 99`);
  return value;
}
function recipeBookPrepareData(payload){
  recipeBookAssert(recipeBookIsPlainObject(payload),"the root must be an object");
  recipeBookAssert(payload.schemaVersion===1,"schemaVersion must be 1");
  recipeBookAssert(recipeBookIsPlainObject(payload.items),"items must be an object keyed by item ID");
  recipeBookAssert(Array.isArray(payload.recipes),"recipes must be an array");
  const items=Object.create(null),itemEntries=Object.entries(payload.items);
  recipeBookAssert(itemEntries.length>0,"items cannot be empty");
  for(const [rawId,rawItem] of itemEntries){
    const id=String(rawId).trim();
    recipeBookAssert(Boolean(id),"an item ID is empty");
    recipeBookAssert(recipeBookIsPlainObject(rawItem),`item ${id} must be an object`);
    const name=typeof rawItem.name==="string"?rawItem.name.trim():"";
    recipeBookAssert(Boolean(name),`item ${id} has no name`);
    recipeBookAssert(Number.isInteger(rawItem.grade)&&rawItem.grade>=0&&rawItem.grade<=8,`item ${id} has an invalid grade`);
    recipeBookAssert(typeof rawItem.icon==="string",`item ${id} has no icon field`);
    recipeBookAssert(rawItem.description===undefined||typeof rawItem.description==="string",`item ${id} has an invalid description`);
    items[id]=Object.freeze({id,name,description:String(rawItem.description||"").trim(),grade:rawItem.grade,icon:rawItem.icon.trim(),search:recipeBookSearchNorm(name)});
  }
  const substitutionDefinitionIds=new Set(),substitutionDefinitionMembers=new Set();
  for(const definition of RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS){
    recipeBookAssert(/^[a-z\d]+(?:-[a-z\d]+)*$/.test(definition.id),`substitution group ${definition.id} has an invalid ID`);
    recipeBookAssert(!substitutionDefinitionIds.has(definition.id),`substitution group ${definition.id} is duplicated`);substitutionDefinitionIds.add(definition.id);
    recipeBookAssert(Boolean(definition.name)&&definition.recipeTypes.length>0&&definition.members.length>1,`substitution group ${definition.id} is incomplete`);
    recipeBookAssert(Boolean(recipeBookSafeIconPath(definition.fallbackIcon)),`substitution group ${definition.id} has an invalid fallback icon`);
    recipeBookAssert(definition.members.some(member=>member.itemId===definition.representativeItemId),`substitution group ${definition.id} has no representative member`);
    for(const member of definition.members){
      recipeBookAssert(/^\d+$/.test(member.itemId)&&Boolean(member.name),`substitution group ${definition.id} has an invalid member`);
      recipeBookAssert(!substitutionDefinitionMembers.has(member.key),`substitution member ${member.key} appears in more than one group`);substitutionDefinitionMembers.add(member.key);
      recipeBookAssert(Number.isSafeInteger(member.factor)&&member.factor>0&&Number.isSafeInteger(member.sourceWorth)&&member.sourceWorth>0,`substitution member ${member.key} has an invalid value`);
      if(!Object.hasOwn(items,member.itemId))items[member.itemId]=Object.freeze({
        id:member.itemId,name:member.name,description:`Verified member of ${definition.name}. This offline entry is included so My Resources can preserve the exact material.`,grade:0,icon:definition.sharedIcon?definition.fallbackIcon:"icons/item-fallback.svg",search:recipeBookSearchNorm(member.name),synthetic:true
      });
    }
  }
  const recipeIds=new Set(),recipes=payload.recipes.map((rawRecipe,index)=>{
    const path=`recipes[${index}]`;
    recipeBookAssert(recipeBookIsPlainObject(rawRecipe),`${path} must be an object`);
    const id=String(rawRecipe.id??"").trim(),outputId=String(rawRecipe.outputId??"").trim(),type=typeof rawRecipe.type==="string"?rawRecipe.type.trim():"";
    recipeBookAssert(Boolean(id),`${path}.id is empty`);
    recipeBookAssert(!recipeIds.has(id),`${path}.id duplicates ${id}`);
    recipeIds.add(id);
    recipeBookAssert(Boolean(outputId)&&Object.hasOwn(items,outputId),`${path}.outputId does not reference an item`);
    recipeBookAssert(Boolean(type),`${path}.type is empty`);
    recipeBookAssert(rawRecipe.station===undefined||typeof rawRecipe.station==="string",`${path}.station must be a string`);
    recipeBookAssert(Array.isArray(rawRecipe.inputs)&&rawRecipe.inputs.length>0,`${path}.inputs must not be empty`);
    const inputs=rawRecipe.inputs.map((rawInput,inputIndex)=>{
      const inputPath=`${path}.inputs[${inputIndex}]`;
      recipeBookAssert(recipeBookIsPlainObject(rawInput),`${inputPath} must be an object`);
      const itemId=String(rawInput.itemId??"").trim();
      recipeBookAssert(Boolean(itemId)&&Object.hasOwn(items,itemId),`${inputPath}.itemId does not reference an item`);
      recipeBookAssert(Number.isFinite(rawInput.count)&&rawInput.count>0,`${inputPath}.count must be greater than zero`);
      const enhancement=recipeBookOptionalEnhancement(rawInput.enhancement,`${inputPath}.enhancement`);
      return Object.freeze({itemId,count:rawInput.count,enhancement,key:recipeBookIngredientKey(itemId,enhancement)});
    });
    const output=items[outputId],station=(rawRecipe.station||"").trim(),recipeType=recipeBookTypeKey(type),genericAlternativeSearch=RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS.filter(definition=>definition.recipeTypes.includes(recipeType)&&inputs.some(input=>input.key===recipeBookIngredientKey(definition.representativeItemId,0))).flatMap(definition=>definition.members.map(member=>items[member.itemId]?.search||recipeBookSearchNorm(member.name)));
    return Object.freeze({
      id,outputId,outputEnhancement:recipeBookOptionalEnhancement(rawRecipe.outputEnhancement,`${path}.outputEnhancement`),type,station,inputs:Object.freeze(inputs),
      outputSearch:output.search,ingredientSearch:[...inputs.map(input=>items[input.itemId].search),...genericAlternativeSearch].join(" ")
    });
  });
  recipeBookAssert(recipes.length>0,"recipes cannot be empty");
  recipes.sort((left,right)=>items[left.outputId].name.localeCompare(items[right.outputId].name,undefined,{sensitivity:"base"})||recipeBookTypeLabel(left.type).localeCompare(recipeBookTypeLabel(right.type))||left.id.localeCompare(right.id,undefined,{numeric:true}));
  const types=[...new Set(recipes.map(recipe=>recipe.type))].sort((left,right)=>recipeBookTypeLabel(left).localeCompare(recipeBookTypeLabel(right))||left.localeCompare(right));
  const substitutionGroupLookup=Object.create(null),substitutionMemberByKey=Object.create(null);
  for(const definition of RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS){
    const members=definition.members.map(member=>Object.freeze({...member,groupId:definition.id,name:items[member.itemId].name})),weighted=members.some(member=>member.factor!==1),representativeKey=recipeBookIngredientKey(definition.representativeItemId,0);
    const group=Object.freeze({id:definition.id,name:definition.name,sharedIcon:definition.sharedIcon,representativeItemId:definition.representativeItemId,representativeKey,fallbackIcon:definition.fallbackIcon,recipeTypes:definition.recipeTypes,members:Object.freeze(members),weighted});
    substitutionGroupLookup[group.id]=group;for(const member of members)substitutionMemberByKey[member.key]=member;
  }
  const substitutionCanonicalRecipeById=Object.create(null);
  for(const group of Object.values(substitutionGroupLookup)){
    const memberByKey=new Map(group.members.map(member=>[member.key,member])),families=new Map();
    for(const recipe of recipes){
      if(!group.recipeTypes.includes(recipeBookTypeKey(recipe.type)))continue;
      const groupedInputs=recipe.inputs.filter(input=>memberByKey.has(input.key));if(groupedInputs.length!==1)continue;
      const groupedInput=groupedInputs[0],member=memberByKey.get(groupedInput.key),otherSignature=recipe.inputs.filter(input=>!memberByKey.has(input.key)).map(input=>`${input.key}x${input.count}`).sort().join("|"),familyKey=`${recipe.outputId}:${recipe.outputEnhancement||0}|${recipeBookTypeKey(recipe.type)}|${recipe.station}|${otherSignature}`;
      (families.get(familyKey)||families.set(familyKey,[]).get(familyKey)).push({recipe,key:groupedInput.key,equivalentCount:groupedInput.count*member.factor});
    }
    for(const family of families.values()){
      const canonical=family.find(entry=>entry.key===group.representativeKey);if(!canonical)continue;
      for(const entry of family)if(entry.recipe.id!==canonical.recipe.id&&entry.equivalentCount===canonical.equivalentCount)substitutionCanonicalRecipeById[entry.recipe.id]=canonical.recipe.id;
    }
  }
  const resourceLookup=Object.create(null),recipesUsingKey=Object.create(null),recipesProducingKey=Object.create(null);
  for(const recipe of recipes){
    if(substitutionCanonicalRecipeById[recipe.id])continue;
    const outputKey=recipeBookIngredientKey(recipe.outputId,recipe.outputEnhancement);(recipesProducingKey[outputKey]||=[]).push(recipe);
    for(const input of recipe.inputs)(recipesUsingKey[input.key]||=[]).push(Object.freeze({recipe,count:input.count}));
  }
  for(const recipe of recipes)for(const input of recipe.inputs){
    if(!resourceLookup[input.key])resourceLookup[input.key]={key:input.key,itemId:input.itemId,enhancement:input.enhancement||0,uses:0};
    resourceLookup[input.key].uses++;
  }
  for(const group of Object.values(substitutionGroupLookup)){
    /* Only the canonical representative denotes a generic recipe input. A literal sibling such as Potato in Potato Stew remains exact and must not advertise every grain as valid. */
    const applicableRecipes=recipes.filter(recipe=>group.recipeTypes.includes(recipeBookTypeKey(recipe.type))&&recipe.inputs.some(input=>input.key===group.representativeKey)),applicableRecipeIds=new Set(applicableRecipes.map(recipe=>recipe.id));
    for(const member of group.members){
      const candidate=resourceLookup[member.key]||(resourceLookup[member.key]={key:member.key,itemId:member.itemId,enhancement:0,uses:0});
      const usageEntries=recipesUsingKey[member.key]||(recipesUsingKey[member.key]=[]);
      for(const recipe of applicableRecipes){
        if(usageEntries.some(entry=>entry.recipe.id===recipe.id))continue;
        const equivalentCount=recipe.inputs.filter(input=>input.key===group.representativeKey).reduce((total,input)=>total+input.count,0);
        usageEntries.push(Object.freeze({recipe,count:Math.ceil(equivalentCount/member.factor),substitutionGroupId:group.id}));
      }
      candidate.uses=new Set([...usageEntries.map(entry=>entry.recipe.id),...applicableRecipeIds]).size;candidate.substitutionGroupId=group.id;candidate.substitutionFactor=member.factor;
    }
  }
  const resourceItems=Object.values(resourceLookup).map(candidate=>Object.freeze({...candidate,search:`${items[candidate.itemId].search} ${candidate.itemId}`})).sort((left,right)=>items[left.itemId].name.localeCompare(items[right.itemId].name,undefined,{sensitivity:"base"})||left.enhancement-right.enhancement||Number(left.itemId)-Number(right.itemId));
  for(const candidate of resourceItems)resourceLookup[candidate.key]=candidate;
  for(const index of [recipesUsingKey,recipesProducingKey])for(const key of Object.keys(index))index[key]=Object.freeze(index[key]);
  const source=recipeBookIsPlainObject(payload.source)?Object.freeze({...payload.source}):Object.freeze({});
  const counts=recipeBookIsPlainObject(payload.counts)?Object.freeze({...payload.counts}):Object.freeze({});
  return Object.freeze({items:Object.freeze(items),recipes:Object.freeze(recipes),types:Object.freeze(types),resourceItems:Object.freeze(resourceItems),resourceLookup:Object.freeze(resourceLookup),recipesUsingKey:Object.freeze(recipesUsingKey),recipesProducingKey:Object.freeze(recipesProducingKey),substitutionGroups:Object.freeze(Object.values(substitutionGroupLookup)),substitutionGroupLookup:Object.freeze(substitutionGroupLookup),substitutionMemberByKey:Object.freeze(substitutionMemberByKey),substitutionCanonicalRecipeById:Object.freeze(substitutionCanonicalRecipeById),source,counts});
}
function recipeBookFilterRecipes(data,{query="",mode="name",type=""}={}){
  const tokens=recipeBookSearchTokens(query),searchMode=mode==="ingredient"?"ingredient":"name";
  return data.recipes.filter(recipe=>{
    if(data.substitutionCanonicalRecipeById?.[recipe.id]||type&&recipe.type!==type)return false;
    const target=searchMode==="ingredient"?recipe.ingredientSearch:recipe.outputSearch;
    return tokens.every(token=>target.includes(token));
  });
}
function recipeBookIconDisplaySize(naturalWidth,naturalHeight,kind="ingredient"){
  const width=Number(naturalWidth),height=Number(naturalHeight),cap=kind==="output"?44:34;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return Object.freeze({width:cap,height:cap});
  const scale=Math.min(1,cap/width,cap/height);
  return Object.freeze({width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))});
}
function recipeBookIngredientKey(itemId,enhancement){return `${String(itemId??"").trim()}:${Number.isInteger(enhancement)&&enhancement>0?enhancement:0}`}
function recipeBookResourceAmount(value){const amount=Number(value);return Number.isSafeInteger(amount)&&amount>0&&amount<=999999999999?amount:0}
function recipeBookSanitizeResources(value,data){
  const clean=Object.create(null);if(!recipeBookIsPlainObject(value)||!data?.resourceLookup)return clean;
  for(const [key,valueAmount] of Object.entries(value)){const amount=recipeBookResourceAmount(valueAmount);if(amount&&Object.hasOwn(data.resourceLookup,key))clean[key]=amount}
  return clean;
}
function recipeBookResourceCandidates(data,query="",limit=10){
  if(!data?.resourceItems)return[];
  const tokens=recipeBookSearchTokens(query),normalizedQuery=recipeBookSearchNorm(query),cap=Math.max(1,Math.min(30,Math.floor(Number(limit)||10)));
  const matches=data.resourceItems.filter(candidate=>tokens.length&&tokens.every(token=>candidate.search.includes(token))).sort((left,right)=>right.uses-left.uses||data.items[left.itemId].name.localeCompare(data.items[right.itemId].name,undefined,{sensitivity:"base"})||left.enhancement-right.enhancement||Number(left.itemId)-Number(right.itemId));
  const exactNameMatches=matches.filter(candidate=>data.items[candidate.itemId].search===normalizedQuery);
  return (exactNameMatches.length?exactNameMatches:matches).slice(0,exactNameMatches.length?100:cap);
}
function recipeBookResourceInventoryRows(data,resources={}){
  if(!data?.resourceLookup)return[];
  const grouped=new Map(),rows=[];
  for(const [key,rawAmount] of Object.entries(recipeBookIsPlainObject(resources)?resources:{})){
    const amount=recipeBookResourceAmount(rawAmount),candidate=data.resourceLookup[key];if(!amount||!candidate)continue;
    const membership=data.substitutionMemberByKey?.[key],group=membership&&data.substitutionGroupLookup?.[membership.groupId];
    if(!group){rows.push(Object.freeze({kind:"single",id:key,key,candidate,amount}));continue}
    let bucket=grouped.get(group.id);if(!bucket){bucket={kind:"group",id:`group:${group.id}`,groupId:group.id,name:group.name,group,rawTotal:0,equivalentTotal:0,weighted:group.weighted,members:[]};grouped.set(group.id,bucket)}
    bucket.rawTotal+=amount;bucket.equivalentTotal+=amount*membership.factor;bucket.members.push(Object.freeze({key,candidate,amount,factor:membership.factor,sourceWorth:membership.sourceWorth,tier:membership.tier}));
  }
  for(const bucket of grouped.values()){
    bucket.members.sort((left,right)=>data.items[left.candidate.itemId].name.localeCompare(data.items[right.candidate.itemId].name,undefined,{sensitivity:"base"})||Number(left.candidate.itemId)-Number(right.candidate.itemId));
    bucket.representativeCandidate=data.resourceLookup[bucket.group.representativeKey]||bucket.members[0]?.candidate||null;rows.push(Object.freeze({...bucket,members:Object.freeze(bucket.members)}));
  }
  const rowName=row=>row.kind==="group"?row.name:(data.items[row.candidate.itemId]?.name||row.id);
  return Object.freeze(rows.sort((left,right)=>rowName(left).localeCompare(rowName(right),undefined,{sensitivity:"base"})||left.id.localeCompare(right.id,undefined,{numeric:true})));
}
function recipeBookSubstitutionOwnedTotals(data,resources,group){
  let raw=0,equivalent=0;for(const member of group?.members||[]){const amount=recipeBookResourceAmount(resources?.[member.key]);raw+=amount;equivalent+=amount*member.factor}return Object.freeze({raw,equivalent});
}
function recipeBookRecipeRequirements(recipe,resources={},data=null){
  const required=new Map(),recipeType=recipeBookTypeKey(recipe?.type);
  for(const input of recipe?.inputs||[]){
    /* The normalized snapshot uses the representative item for generic category requirements. A recipe that literally names another member (for example Potato Stew) stays exact. */
    const membership=data?.substitutionMemberByKey?.[input.key],group=membership&&data?.substitutionGroupLookup?.[membership.groupId],useGroup=Boolean(group&&group.recipeTypes.includes(recipeType)&&input.key===group.representativeKey),key=useGroup?`group:${group.id}`:input.key,count=input.count*(useGroup?membership.factor:1),current=required.get(key);
    if(current){current.count+=count;continue}
    const candidateKey=useGroup?group.representativeKey:input.key,candidate=data?.resourceLookup?.[candidateKey],name=useGroup?group.name:(candidate&&data?.items?.[candidate.itemId]?.name)||"Material";
    required.set(key,{key,count,candidateKey,groupId:useGroup?group.id:"",name,weighted:Boolean(useGroup&&group.weighted)});
  }
  return Object.freeze([...required.values()].map(requirement=>{
    if(requirement.groupId){const totals=recipeBookSubstitutionOwnedTotals(data,resources,data.substitutionGroupLookup[requirement.groupId]);return Object.freeze({...requirement,owned:totals.equivalent,rawOwned:totals.raw})}
    const owned=recipeBookResourceAmount(resources?.[requirement.key]);return Object.freeze({...requirement,owned,rawOwned:owned});
  }));
}
function recipeBookRecipeCraftCount(recipe,resources={},data=null){
  const requirements=recipeBookRecipeRequirements(recipe,resources,data);if(!requirements.length)return 0;
  return Math.max(0,Math.min(...requirements.map(requirement=>Math.floor(requirement.owned/requirement.count))));
}
function recipeBookClampCraftAmount(value,maxCrafts){
  const max=recipeBookResourceAmount(maxCrafts);if(!max)return 0;
  const amount=Number(value);return Number.isSafeInteger(amount)?Math.min(max,Math.max(1,amount)):max;
}
function recipeBookSanitizeCraftPlans(value){
  const clean=Object.create(null);if(!recipeBookIsPlainObject(value))return clean;
  for(const [recipeId,rawAmount] of Object.entries(value)){const amount=recipeBookResourceAmount(rawAmount);if(recipeId&&amount)clean[recipeId]=amount}
  return clean;
}
function recipeBookCraftMaterialUsage(perCraft,craftAmount,owned){
  const count=Number(perCraft),amount=Number(craftAmount),available=recipeBookResourceAmount(owned);
  const used=Number.isFinite(count)&&count>0&&Number.isSafeInteger(amount)&&amount>0?count*amount:0;
  return Object.freeze({used,remaining:Math.max(0,available-used)});
}
function recipeBookItemUsage(data,itemId,enhancement=0,limit=4){
  const key=recipeBookIngredientKey(itemId,enhancement),uses=data?.recipesUsingKey?.[key]||[],producedBy=data?.recipesProducingKey?.[key]||[],groups=new Map();
  for(const entry of uses){
    const outputKey=recipeBookIngredientKey(entry.recipe.outputId,entry.recipe.outputEnhancement),current=groups.get(outputKey);
    if(current){current.recipeCount++;current.minimum=Math.min(current.minimum,entry.count);current.maximum=Math.max(current.maximum,entry.count)}
    else groups.set(outputKey,{outputKey,outputId:entry.recipe.outputId,outputEnhancement:entry.recipe.outputEnhancement||0,type:entry.recipe.type,station:entry.recipe.station||recipeBookTypeLabel(entry.recipe.type),recipeCount:1,minimum:entry.count,maximum:entry.count});
  }
  const outputs=[...groups.values()].sort((left,right)=>right.recipeCount-left.recipeCount||data.items[left.outputId].name.localeCompare(data.items[right.outputId].name,undefined,{sensitivity:"base"})),cap=Math.max(1,Math.min(6,Math.floor(Number(limit)||4)));
  return Object.freeze({key,itemId:String(itemId),enhancement:Number(enhancement)||0,recipeCount:uses.length,uniqueOutputCount:outputs.length,outputs:Object.freeze(outputs.slice(0,cap).map(output=>Object.freeze(output))),producedByCount:producedBy.length,remainingOutputCount:Math.max(0,outputs.length-cap)});
}
function recipeBookCraftableRecipes(data,resources={},options={}){
  if(!data?.recipes)return[];
  const tokens=recipeBookSearchTokens(options.query||""),type=String(options.type||"");
  return data.recipes.reduce((results,recipe)=>{
    if(data.substitutionCanonicalRecipeById?.[recipe.id]||type&&recipe.type!==type)return results;
    const output=data.items[recipe.outputId];if(tokens.length&&!tokens.every(token=>output.search.includes(token)))return results;
    const maxCrafts=recipeBookRecipeCraftCount(recipe,resources,data);if(maxCrafts>0)results.push(Object.freeze({recipe,maxCrafts,requirements:recipeBookRecipeRequirements(recipe,resources,data)}));
    return results;
  },[]).sort((left,right)=>right.maxCrafts-left.maxCrafts||data.items[left.recipe.outputId].name.localeCompare(data.items[right.recipe.outputId].name,undefined,{sensitivity:"base"})||left.recipe.id.localeCompare(right.recipe.id,undefined,{numeric:true}));
}
/* RECIPE_BOOK_CORE_END */

/* RECIPE_BOOK_OCR_CORE_START */
const RECIPE_BOOK_OCR_MAX_QUANTITY=999999999999;
const RECIPE_BOOK_OCR_BORDER_GRADE_CONFIDENCE=.70;
const RECIPE_BOOK_OCR_MIN_WIDTH=1,RECIPE_BOOK_OCR_MIN_HEIGHT=1,RECIPE_BOOK_OCR_MAX_WIDTH=7680,RECIPE_BOOK_OCR_MAX_HEIGHT=4320,RECIPE_BOOK_OCR_MAX_PIXELS=24000000;
function recipeBookOcrDimensionsAreSafe(width,height){return Number.isSafeInteger(width)&&Number.isSafeInteger(height)&&width>=RECIPE_BOOK_OCR_MIN_WIDTH&&height>=RECIPE_BOOK_OCR_MIN_HEIGHT&&width<=RECIPE_BOOK_OCR_MAX_WIDTH&&height<=RECIPE_BOOK_OCR_MAX_HEIGHT&&width*height<=RECIPE_BOOK_OCR_MAX_PIXELS}
function recipeBookOcrPreviewBox(box,imageWidth,imageHeight){
  const horizontalOverflow=Math.max(4,Math.round(box.width*.12)),verticalOverflow=Math.max(1,Math.round(box.height*.03)),left=Math.max(0,box.x-horizontalOverflow),top=Math.max(0,box.y-verticalOverflow),right=Math.min(imageWidth,box.x+box.width+horizontalOverflow),bottom=Math.min(imageHeight,box.y+box.height+verticalOverflow);return Object.freeze({x:left,y:top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)});
}
function recipeBookOcrCanonicalIcon(value){
  let path=String(value??"").trim().replace(/\\/g,"/").replace(/^\.\//,"");
  if(path.startsWith("https://recipebook.bdo.local/"))path=path.slice("https://recipebook.bdo.local/".length);
  if(path.startsWith("Assets/RecipeBook/"))path=path.slice("Assets/RecipeBook/".length);
  else if(path.startsWith("RecipeBook/"))path=path.slice("RecipeBook/".length);
  return /^(?:icons\/items\/[a-f\d]{64}\.webp|icons\/item-fallback\.svg)$/i.test(path)?path.toLowerCase():"";
}
function recipeBookOcrParseQuantity(value){
  const text=String(value??"").trim().toUpperCase(),match=text.match(/^(?:(\d{1,3}(?:,\d{3})+|\d{1,5})|(\d{1,3})[.,](\d)([KM]))$/);
  if(!match)return Object.freeze({valid:false,value:null,approximate:/[KM]$/.test(text),text});
  const approximate=Boolean(match[4]),numeric=approximate?Number(`${match[2]}.${match[3]}`):Number(match[1].replace(/,/g,"")),multiplier=match[4]==="K"?1000:match[4]==="M"?1000000:1,result=Math.round(numeric*multiplier);
  if(!Number.isSafeInteger(result)||result<1||result>RECIPE_BOOK_OCR_MAX_QUANTITY)return Object.freeze({valid:false,value:null,approximate,text});
  return Object.freeze({valid:true,value:result,approximate,text});
}
function recipeBookOcrSanitizeResult(value){
  if(!recipeBookIsPlainObject(value))return null;
  const imageFingerprint=String(value.imageFingerprint??"").trim().toLowerCase(),width=Number(value.width),height=Number(value.height);
  if(!/^[a-f\d]{64}$/.test(imageFingerprint)||!recipeBookOcrDimensionsAreSafe(width,height))return null;
  const rawGrid=recipeBookIsPlainObject(value.grid)?value.grid:{},columns=Number(rawGrid.columns),rows=Number(rawGrid.rows),gridConfidence=Number(rawGrid.confidence),rawSlots=Array.isArray(value.slots)?value.slots.slice(0,192):[];
  if(!Number.isSafeInteger(columns)||!Number.isSafeInteger(rows)||columns<1||columns>9||rows<0||rows>Math.ceil(192/columns)||(rows===0&&rawSlots.length)||!Number.isFinite(gridConfidence)||gridConfidence<0||gridConfidence>1)return null;
  const ids=new Set(),slots=[];
  for(const raw of rawSlots){
    if(!recipeBookIsPlainObject(raw)||!recipeBookIsPlainObject(raw.box))continue;
    const id=String(raw.id??"").trim(),row=Number(raw.row),column=Number(raw.column),x=Number(raw.box.x),y=Number(raw.box.y),boxWidth=Number(raw.box.width),boxHeight=Number(raw.box.height);
    if(!id||id.length>100||ids.has(id)||!Number.isSafeInteger(row)||!Number.isSafeInteger(column)||row<0||column<0||row>=rows||column>=columns||![x,y,boxWidth,boxHeight].every(Number.isSafeInteger)||x<0||y<0||boxWidth<1||boxHeight<1||x+boxWidth>width||y+boxHeight>height)continue;
    const iconCandidates=[],icons=new Set();
    for(const rawCandidate of Array.isArray(raw.iconCandidates)?raw.iconCandidates.slice(0,8):[]){
      if(!recipeBookIsPlainObject(rawCandidate))continue;const icon=recipeBookOcrCanonicalIcon(rawCandidate.icon),score=Number(rawCandidate.score);
      if(!icon||icons.has(icon)||!Number.isFinite(score)||score<0||score>1)continue;icons.add(icon);iconCandidates.push(Object.freeze({icon,score}));
    }
    iconCandidates.sort((left,right)=>right.score-left.score||left.icon.localeCompare(right.icon));
    const parsed=recipeBookOcrParseQuantity(raw.quantityText),rawQuantity=raw.quantityValue,quantityValue=typeof rawQuantity==="number"&&Number.isSafeInteger(rawQuantity)&&rawQuantity>=1&&rawQuantity<=RECIPE_BOOK_OCR_MAX_QUANTITY?rawQuantity:null,quantityConfidence=Number(raw.quantityConfidence),safeQuantityConfidence=Number.isFinite(quantityConfidence)&&quantityConfidence>=0&&quantityConfidence<=1?quantityConfidence:0,rawBorderGrade=raw.borderGrade,borderGrade=typeof rawBorderGrade==="number"&&Number.isInteger(rawBorderGrade)&&rawBorderGrade>=0&&rawBorderGrade<=2?rawBorderGrade:null,rawBorderGradeConfidence=raw.borderGradeConfidence,borderGradeConfidence=typeof rawBorderGradeConfidence==="number"&&Number.isFinite(rawBorderGradeConfidence)&&rawBorderGradeConfidence>=0&&rawBorderGradeConfidence<=1?rawBorderGradeConfidence:0;
    ids.add(id);slots.push(Object.freeze({id,row,column,box:Object.freeze({x,y,width:boxWidth,height:boxHeight}),iconCandidates:Object.freeze(iconCandidates),quantityText:String(raw.quantityText??"").trim().slice(0,40),quantityValue,quantityApproximate:Boolean(raw.quantityApproximate)||parsed.approximate,quantityConfidence:safeQuantityConfidence,quantityAssumedOne:Boolean(raw.quantityAssumedOne),borderGrade,borderGradeConfidence}));
  }
  const warnings=Array.isArray(value.warnings)?value.warnings.map(item=>String(item??"").trim().slice(0,300)).filter(Boolean).slice(0,20):[];
  return Object.freeze({imageFingerprint,width,height,grid:Object.freeze({columns,rows,confidence:gridConfidence}),slots:Object.freeze(slots),warnings:Object.freeze(warnings)});
}
function recipeBookOcrQualityFamilyResources(resources,data){
  const exact=(Array.isArray(resources)?resources:[]).filter(resource=>(Number(resource?.enhancement)||0)===0&&data?.items?.[resource.itemId]),byName=new Map(),familyKeys=new Set();
  for(const resource of exact){const name=String(data.items[resource.itemId].name||"").trim();if(name)(byName.get(name)||byName.set(name,[]).get(name)).push(resource)}
  for(const base of exact){
    const item=data.items[base.itemId],baseName=String(item?.name||"").trim();if(item?.grade!==0||!baseName||/^(?:High-quality|Special)\s/u.test(baseName))continue;
    const high=(byName.get(`High-quality ${baseName}`)||[]).filter(resource=>data.items[resource.itemId]?.grade===1),special=(byName.get(`Special ${baseName}`)||[]).filter(resource=>data.items[resource.itemId]?.grade===2);if(!high.length&&!special.length)continue;
    familyKeys.add(base.key);for(const resource of [...high,...special])familyKeys.add(resource.key);
  }
  return exact.filter(resource=>familyKeys.has(resource.key));
}
function recipeBookOcrBorderGradeLabel(grade){return grade===1?"high-quality":grade===2?"special":"base"}
function recipeBookOcrBuildReviewRows(analysis,data){
  if(!analysis||!data?.resourceItems||!data?.resourceLookup||!data?.items)return[];
  const iconIndex=new Map();
  for(const resource of data.resourceItems){const item=data.items[resource.itemId],icon=recipeBookOcrCanonicalIcon(item?.icon);if(icon)(iconIndex.get(icon)||iconIndex.set(icon,[]).get(icon)).push(resource)}
  return analysis.slots.map(slot=>{
    const topIcon=slot.iconCandidates[0],nextIcon=slot.iconCandidates[1],topResources=topIcon?(iconIndex.get(topIcon.icon)||[]):[],gap=topIcon?topIcon.score-(nextIcon?.score||0):0,qualityFamily=recipeBookOcrQualityFamilyResources(topResources,data),trustedBorderGrade=Number.isInteger(slot.borderGrade)&&slot.borderGrade>=0&&slot.borderGrade<=2&&slot.borderGradeConfidence>=RECIPE_BOOK_OCR_BORDER_GRADE_CONFIDENCE&&qualityFamily.length>1,borderGradeMatches=trustedBorderGrade?qualityFamily.filter(resource=>data.items[resource.itemId]?.grade===slot.borderGrade):[],borderGradeResolved=trustedBorderGrade&&borderGradeMatches.length===1,borderGradeConflict=trustedBorderGrade&&!borderGradeResolved,resolvedKey=borderGradeResolved?borderGradeMatches[0].key:"",materialExactResources=trustedBorderGrade?borderGradeMatches:topResources,optionMap=new Map();
    for(const iconMatch of slot.iconCandidates)for(const resource of iconIndex.get(iconMatch.icon)||[]){const current=optionMap.get(resource.key);if(!current||iconMatch.score>current.score){const item=data.items[resource.itemId],enhancement=Number(resource.enhancement)||0;optionMap.set(resource.key,Object.freeze({key:resource.key,itemId:String(resource.itemId),enhancement,name:`${enhancement?`+${enhancement} `:""}${item?.name||"Unknown item"}`,score:iconMatch.score,uses:Number(resource.uses)||0}))}}
    const options=[...optionMap.values()].sort((left,right)=>Number(right.key===resolvedKey)-Number(left.key===resolvedKey)||right.score-left.score||right.uses-left.uses||left.name.localeCompare(right.name,undefined,{sensitivity:"base"}));
    const sharedMeatOrBloodIcon=topResources.length>1&&topResources.some(resource=>{const member=data.substitutionMemberByKey?.[resource.key],group=member&&data.substitutionGroupLookup?.[member.groupId];return Boolean(group?.sharedIcon&&/^(?:meat|blood)-/.test(group.id))}),unresolvedSharedMeatOrBloodIcon=sharedMeatOrBloodIcon&&materialExactResources.length!==1,defaultOption=borderGradeConflict||unresolvedSharedMeatOrBloodIcon?null:borderGradeResolved?optionMap.get(resolvedKey):options[0]||null;
    const readQuantity=!slot.quantityAssumedOne&&Number.isSafeInteger(slot.quantityValue)?slot.quantityValue:null,iconExact=Boolean(topIcon&&topIcon.score>=.82&&gap>=.08&&materialExactResources.length===1&&!unresolvedSharedMeatOrBloodIcon),quantityExact=Number.isSafeInteger(slot.quantityValue)&&slot.quantityValue>=1&&slot.quantityValue<=RECIPE_BOOK_OCR_MAX_QUANTITY&&slot.quantityConfidence>=.78&&!slot.quantityApproximate&&!slot.quantityAssumedOne,ready=iconExact&&quantityExact;
    const reasons=[];if(!topIcon||!options.length)reasons.push("No Recipe Book material matched this icon");else if(borderGradeConflict)reasons.push(borderGradeMatches.length?`The detected ${recipeBookOcrBorderGradeLabel(slot.borderGrade)} border still matches multiple materials`:`The detected ${recipeBookOcrBorderGradeLabel(slot.borderGrade)} border conflicts with this icon's verified quality family`);else if(materialExactResources.length>1)reasons.push("This icon is shared by multiple materials or enhancement levels");else if(topIcon.score<.82)reasons.push("The icon match is low confidence");else if(gap<.08)reasons.push("Two icons look nearly identical");if(slot.quantityApproximate)reasons.push("The displayed K/M quantity is rounded and needs confirmation");else if(slot.quantityAssumedOne)reasons.push("The quantity was hidden and cannot be assumed");else if(readQuantity===null)reasons.push("No valid quantity was detected");else if(!Number.isSafeInteger(slot.quantityValue)||slot.quantityConfidence<.78)reasons.push("The quantity read from the screenshot needs confirmation");
    return {id:`${analysis.imageFingerprint}:${slot.id}`,fingerprint:analysis.imageFingerprint,slotId:slot.id,row:slot.row,column:slot.column,box:slot.box,options,selectedKey:defaultOption?.key||"",quantity:readQuantity??"",suggestedQuantity:readQuantity,quantityText:slot.quantityText,quantityApproximate:Boolean(slot.quantityApproximate),borderGrade:slot.borderGrade,borderGradeConfidence:slot.borderGradeConfidence,reviewRequired:!ready,state:ready?"ready":options.length?"review":"unknown",reasons};
  });
}
function recipeBookOcrBuildMaterialCatalog(data){
  if(!data?.resourceItems||!data?.items)return[];
  return Object.freeze(data.resourceItems.map(resource=>{const item=data.items[resource.itemId],enhancement=Number(resource.enhancement)||0,label=`${enhancement?`+${enhancement} `:""}${item?.name||"Unknown item"} · Item ${resource.itemId}`;return Object.freeze({key:resource.key,label})}).sort((left,right)=>left.label.localeCompare(right.label,undefined,{sensitivity:"base",numeric:true})||left.key.localeCompare(right.key,undefined,{numeric:true})))
}
function recipeBookOcrRowIsComplete(row,data){const key=String(row?.selectedKey||"");return Object.hasOwn(data?.resourceLookup||{},key)&&Boolean(recipeBookResourceAmount(row?.quantity))}
function recipeBookOcrBuildImportPlan(rows,data){
  const sourceRows=Array.isArray(rows)?rows:[],totals=new Map(),errors=[];
  if(!sourceRows.length)errors.push("Detect at least one material before importing.");
  for(const row of sourceRows){
    const key=String(row?.selectedKey||""),quantity=recipeBookResourceAmount(row?.quantity);
    if(!Object.hasOwn(data?.resourceLookup||{},key)){errors.push(`Choose a valid material for ${row?.slotId||"a detected slot"}.`);continue}
    if(!quantity){errors.push(`Enter a whole quantity for ${row?.slotId||"a detected slot"}.`);continue}
    const total=(totals.get(key)||0)+quantity;if(!Number.isSafeInteger(total)||total>RECIPE_BOOK_OCR_MAX_QUANTITY){errors.push(`${key} exceeds the maximum supported quantity when its detected stacks are combined.`);continue}totals.set(key,total);
  }
  const entries=[...totals].map(([key,quantity])=>Object.freeze({key,quantity}));
  return Object.freeze({valid:errors.length===0,entries:Object.freeze(entries),errors:Object.freeze(errors)});
}
function recipeBookOcrApplyImportPlan(current,plan,data,mode="update"){
  const resources=recipeBookSanitizeResources(current,data),next=Object.assign(Object.create(null),resources),errors=[];
  if(!plan?.valid)return Object.freeze({ok:false,resources:next,changedKeys:Object.freeze([]),errors:Object.freeze([...(plan?.errors||["The import plan is invalid."])])});
  const changedKeys=[];
  for(const entry of plan.entries){const amount=recipeBookResourceAmount(entry.quantity);if(!Object.hasOwn(data.resourceLookup,entry.key)||!amount){errors.push(`Invalid import entry ${entry.key}.`);continue}const result=mode==="add"?(next[entry.key]||0)+amount:amount;if(!Number.isSafeInteger(result)||result<1||result>RECIPE_BOOK_OCR_MAX_QUANTITY){errors.push(`${entry.key} would exceed the maximum supported quantity.`);continue}if(next[entry.key]!==result)changedKeys.push(entry.key);next[entry.key]=result}
  return Object.freeze({ok:errors.length===0,resources:errors.length?Object.assign(Object.create(null),resources):next,changedKeys:Object.freeze(errors.length?[]:changedKeys),errors:Object.freeze(errors)});
}
function recipeBookOcrResourceSignature(resources){return JSON.stringify(Object.entries(recipeBookIsPlainObject(resources)?resources:{}).filter(([,amount])=>recipeBookResourceAmount(amount)).sort(([left],[right])=>left.localeCompare(right)).map(([key,amount])=>[key,Number(amount)]))}
function recipeBookOcrCreateUndoSnapshot(before,after){return Object.freeze({before:Object.freeze({...before}),afterSignature:recipeBookOcrResourceSignature(after)})}
function recipeBookOcrApplyUndo(snapshot,current,data){
  const safeCurrent=recipeBookSanitizeResources(current,data);if(!snapshot||snapshot.afterSignature!==recipeBookOcrResourceSignature(safeCurrent))return Object.freeze({ok:false,resources:safeCurrent,reason:"My Resources changed after the screenshot import, so Undo was safely cancelled."});
  return Object.freeze({ok:true,resources:recipeBookSanitizeResources(snapshot.before,data),reason:""});
}
function recipeBookOcrRegisterFingerprint(fingerprints,fingerprint){const list=Array.isArray(fingerprints)?fingerprints:[],value=String(fingerprint||"");return Object.freeze({duplicate:list.includes(value),fingerprints:Object.freeze(list.includes(value)?[...list]:[...list,value])})}
/* RECIPE_BOOK_OCR_CORE_END */

const recipeBookEl={
  view:document.getElementById("recipeBookView"),tooltip:document.getElementById("recipeBookItemTooltip"),tabs:[...document.querySelectorAll("[data-recipe-book-section]")],panels:[...document.querySelectorAll(".recipeBookWorkspacePanel")],form:document.getElementById("recipeBookSearchForm"),mode:document.getElementById("recipeBookSearchMode"),search:document.getElementById("recipeBookSearchInput"),searchButton:document.getElementById("recipeBookSearchButton"),clear:document.getElementById("recipeBookClear"),type:document.getElementById("recipeBookTypeFilter"),hint:document.getElementById("recipeBookSearchHint"),status:document.getElementById("recipeBookDataStatus"),summary:document.getElementById("recipeBookResultSummary"),pageSummary:document.getElementById("recipeBookPageSummary"),message:document.getElementById("recipeBookMessage"),retry:document.getElementById("recipeBookRetry"),grid:document.getElementById("recipeBookGrid"),pagination:document.getElementById("recipeBookPagination"),previous:document.getElementById("recipeBookPreviousPage"),next:document.getElementById("recipeBookNextPage"),pageNumbers:document.getElementById("recipeBookPageNumbers"),resourceForm:document.getElementById("recipeBookResourceForm"),resourceSearch:document.getElementById("recipeBookResourceSearch"),resourceSuggestions:document.getElementById("recipeBookResourceSuggestions"),resourceQuantity:document.getElementById("recipeBookResourceQuantity"),resourceAdd:document.getElementById("recipeBookResourceAdd"),resourceSelection:document.getElementById("recipeBookResourceSelection"),resourceList:document.getElementById("recipeBookResourceList"),craftableBadge:document.getElementById("recipeBookCraftablesBadge"),craftableSummary:document.getElementById("recipeBookCraftableSummary"),craftableSearch:document.getElementById("recipeBookCraftableSearch"),craftableType:document.getElementById("recipeBookCraftableType"),craftableGrid:document.getElementById("recipeBookCraftableGrid"),craftablePagination:document.getElementById("recipeBookCraftablePagination"),craftablePrevious:document.getElementById("recipeBookCraftablePrevious"),craftableNext:document.getElementById("recipeBookCraftableNext"),craftablePages:document.getElementById("recipeBookCraftablePages")
};
Object.assign(recipeBookEl,{screenshotOpen:document.getElementById("recipeBookScreenshotOpen"),screenshotUndo:document.getElementById("recipeBookScreenshotUndo"),screenshotDialog:document.getElementById("recipeBookScreenshotDialog"),screenshotSurface:document.querySelector(".recipeBookScreenshotSurface"),screenshotClose:document.getElementById("recipeBookScreenshotClose"),screenshotFiles:document.getElementById("recipeBookScreenshotFiles"),screenshotDropZone:document.getElementById("recipeBookScreenshotDropZone"),screenshotBrowse:document.getElementById("recipeBookScreenshotBrowse"),screenshotPaste:document.getElementById("recipeBookScreenshotPaste"),screenshotStatus:document.getElementById("recipeBookScreenshotStatus"),screenshotClear:document.getElementById("recipeBookScreenshotClear"),screenshotReview:document.getElementById("recipeBookScreenshotReview"),screenshotWarnings:document.getElementById("recipeBookScreenshotWarnings"),screenshotRows:document.getElementById("recipeBookScreenshotRows"),screenshotAddConfirmWrap:document.getElementById("recipeBookScreenshotAddConfirmWrap"),screenshotAddConfirm:document.getElementById("recipeBookScreenshotAddConfirm"),screenshotCancel:document.getElementById("recipeBookScreenshotCancel"),screenshotApply:document.getElementById("recipeBookScreenshotApply"),screenshotSelectionSummary:document.getElementById("recipeBookScreenshotSelectionSummary")});
const recipeBookState={initialized:false,loading:false,data:null,filtered:[],mode:"name",type:"",query:"",page:1,searchTimer:null,section:"catalog",resources:Object.create(null),selectedResourceKey:"",craftables:[],craftableQuery:"",craftableType:"",craftablePage:1,craftableTimer:null,craftPlans:Object.create(null),tooltipTarget:null,tooltipOpenTimer:null,tooltipCloseTimer:null,ocr:{open:false,busy:false,generation:0,controller:null,images:[],rows:[],fingerprints:[],warnings:[],undo:null,returnFocus:null,totalBytes:0,materialCatalog:new Map(),materialLabels:new Map()}};
const RECIPE_BOOK_RESOURCES_SETTING="recipeBookResources";
const RECIPE_BOOK_CRAFT_PLANS_SETTING="recipeBookCraftPlans";
function recipeBookSetStatus(message,state="ready"){
  if(!recipeBookEl.status)return;
  recipeBookEl.status.dataset.state=state;
  const copy=recipeBookEl.status.querySelector("span");
  if(copy)copy.textContent=message;
}
function recipeBookShowError(message){
  if(recipeBookEl.message){const copy=recipeBookEl.message.querySelector("span");if(copy)copy.textContent=message;recipeBookEl.message.hidden=false}
  if(recipeBookEl.grid){recipeBookEl.grid.setAttribute("aria-busy","false");recipeBookEl.grid.innerHTML='<div class="recipeBookEmpty"><span aria-hidden="true">!</span><strong>The recipe book could not be opened</strong><p>The rest of Black Spirit Hub is still available.</p></div>'}
  if(recipeBookEl.summary)recipeBookEl.summary.textContent="Recipe catalog unavailable";
  if(recipeBookEl.pagination)recipeBookEl.pagination.hidden=true;
  recipeBookSetStatus("Offline catalog unavailable","error");
}
function recipeBookFormatCount(value){return Number(value).toLocaleString(undefined,{maximumFractionDigits:2})}
function recipeBookEnhancementLabel(value){return Number.isInteger(value)&&value>0?`+${value}`:""}
function recipeBookSplitItemKey(value){const match=String(value||"").match(/^([^:]+):(\d+)$/);return match?{itemId:match[1],enhancement:Number(match[2])}:{itemId:"",enhancement:0}}
function recipeBookItemTargetAttributes(itemId,enhancement=0){return `data-recipe-book-item-key="${escapeHtml(recipeBookIngredientKey(itemId,enhancement))}" tabindex="0"`}
function recipeBookIconMarkup(item,sizeClass,alt,enhancement){
  const path=recipeBookSafeIconPath(item.icon),badge=recipeBookEnhancementLabel(enhancement);
  return `<span class="recipeBookItemIcon ${escapeHtml(sizeClass)} grade${item.grade}"><span class="recipeBookIconFallback" aria-hidden="true">✦</span>${path?`<img src="${escapeHtml(path)}" alt="" aria-hidden="true" loading="lazy" decoding="async">`:""}${badge?`<b class="recipeBookEnhancement">${escapeHtml(badge)}</b>`:""}</span>`;
}
function recipeBookTooltipMarkup(itemId,enhancement){
  const data=recipeBookState.data,item=data?.items?.[itemId];if(!item)return"";
  const usage=recipeBookItemUsage(data,itemId,enhancement,4),name=`${recipeBookEnhancementLabel(enhancement)}${enhancement?" ":""}${item.name}`,description=item.description||"No client description is available for this item.";
  const outputs=usage.outputs.map(output=>{const crafted=data.items[output.outputId],count=output.minimum===output.maximum?`×${recipeBookFormatCount(output.minimum)}`:`×${recipeBookFormatCount(output.minimum)}–${recipeBookFormatCount(output.maximum)}`;return `<li>${recipeBookIconMarkup(crafted,"ingredient","",output.outputEnhancement)}<span><strong>${escapeHtml(recipeBookEnhancementLabel(output.outputEnhancement))}${output.outputEnhancement?" ":""}${escapeHtml(crafted.name)}</strong><small>${escapeHtml(recipeBookTypeLabel(output.type))} · needs ${escapeHtml(count)}</small></span></li>`}).join("");
  const usageSection=usage.recipeCount?`<div class="recipeBookTooltipUsage"><strong>Used to craft</strong><p>Appears in ${recipeBookFormatCount(usage.recipeCount)} recipe variant${usage.recipeCount===1?"":"s"} across ${recipeBookFormatCount(usage.uniqueOutputCount)} crafted item${usage.uniqueOutputCount===1?"":"s"}.</p>${outputs?`<ul>${outputs}</ul>`:""}${usage.remainingOutputCount?`<small>+${recipeBookFormatCount(usage.remainingOutputCount)} more crafted items. Use Ingredient search for the full list.</small>`:""}</div>`:"";
  return `<div class="recipeBookTooltipHeader">${recipeBookIconMarkup(item,"output","",enhancement)}<div><span>ITEM ${escapeHtml(itemId)}</span><strong>${escapeHtml(name)}</strong><small>${usage.producedByCount?`Produced by ${recipeBookFormatCount(usage.producedByCount)} recipe variant${usage.producedByCount===1?"":"s"}`:"Material information"}</small></div></div><p class="recipeBookTooltipDescription">${escapeHtml(description)}</p>${usageSection}`;
}
function recipeBookPositionTooltip(target){
  const tooltip=recipeBookEl.tooltip;if(!tooltip||tooltip.hidden||!target?.isConnected)return;
  const targetRect=target.getBoundingClientRect(),tooltipRect=tooltip.getBoundingClientRect(),gap=12,margin=12,statusBar=44;
  let left=targetRect.right+gap;if(left+tooltipRect.width>innerWidth-margin)left=targetRect.left-tooltipRect.width-gap;
  left=Math.max(margin,Math.min(left,innerWidth-tooltipRect.width-margin));let top=targetRect.top+(targetRect.height-tooltipRect.height)/2;
  top=Math.max(margin,Math.min(top,innerHeight-tooltipRect.height-statusBar));tooltip.style.left=`${Math.round(left)}px`;tooltip.style.top=`${Math.round(top)}px`;
}
function recipeBookHideTooltip(){
  clearTimeout(recipeBookState.tooltipOpenTimer);clearTimeout(recipeBookState.tooltipCloseTimer);const target=recipeBookState.tooltipTarget,tooltip=recipeBookEl.tooltip;if(target)target.removeAttribute("aria-describedby");recipeBookState.tooltipTarget=null;if(tooltip){tooltip.hidden=true;tooltip.innerHTML=""}
}
function recipeBookShowTooltip(target){
  const tooltip=recipeBookEl.tooltip,data=recipeBookState.data;if(!tooltip||!data||!target?.isConnected)return;const {itemId,enhancement}=recipeBookSplitItemKey(target.dataset.recipeBookItemKey),markup=recipeBookTooltipMarkup(itemId,enhancement);if(!markup)return;
  if(recipeBookState.tooltipTarget&&recipeBookState.tooltipTarget!==target)recipeBookState.tooltipTarget.removeAttribute("aria-describedby");recipeBookState.tooltipTarget=target;tooltip.innerHTML=markup;tooltip.hidden=false;target.setAttribute("aria-describedby",tooltip.id);recipeBookPositionTooltip(target);
}
function recipeBookFitIcon(image){
  if(!(image instanceof HTMLImageElement))return;
  const wrap=image.closest(".recipeBookItemIcon");if(!wrap)return;
  const size=recipeBookIconDisplaySize(image.naturalWidth,image.naturalHeight,wrap.classList.contains("output")?"output":"ingredient");
  image.style.width=`${size.width}px`;image.style.height=`${size.height}px`;
}
function recipeBookSetSection(section,{focus=false}={}){
  recipeBookHideTooltip();
  const next=["catalog","resources","craftables"].includes(section)?section:"catalog";recipeBookState.section=next;
  for(const button of recipeBookEl.tabs){const active=button.dataset.recipeBookSection===next;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus()}
  const panelIds={catalog:"recipeBookCatalogPanel",resources:"recipeBookResourcesPanel",craftables:"recipeBookCraftablesPanel"};
  for(const panel of recipeBookEl.panels)panel.hidden=panel.id!==panelIds[next];
  if(next==="resources")recipeBookRenderResources();else if(next==="craftables")recipeBookRenderCraftables();
}
function recipeBookCandidateName(candidate){const item=recipeBookState.data?.items[candidate.itemId];return `${recipeBookEnhancementLabel(candidate.enhancement)}${candidate.enhancement?" ":""}${item?.name||"Unknown item"}`}
function recipeBookRenderResourceSuggestions(){
  if(!recipeBookEl.resourceSuggestions||!recipeBookState.data)return;
  const query=recipeBookEl.resourceSearch?.value||"",candidates=recipeBookResourceCandidates(recipeBookState.data,query,12);
  recipeBookEl.resourceSearch?.removeAttribute("aria-activedescendant");
  recipeBookEl.resourceSuggestions.hidden=!candidates.length;recipeBookEl.resourceSearch?.setAttribute("aria-expanded",String(Boolean(candidates.length)));
  recipeBookEl.resourceSuggestions.innerHTML=candidates.map((candidate,index)=>{const item=recipeBookState.data.items[candidate.itemId];return `<button id="recipeBookResourceOption-${index}" class="recipeBookResourceSuggestion" type="button" role="option" aria-selected="false" data-resource-key="${escapeHtml(candidate.key)}" data-recipe-book-item-key="${escapeHtml(candidate.key)}">${recipeBookIconMarkup(item,"ingredient","",candidate.enhancement)}<span><strong class="recipeBookResourceName">${escapeHtml(recipeBookCandidateName(candidate))}</strong><small class="recipeBookResourceMeta"><span class="recipeBookItemId">Item ID: ${escapeHtml(candidate.itemId)}</span><span class="recipeBookUsedIn">Used in ${recipeBookFormatCount(candidate.uses)} recipe${candidate.uses===1?"":"s"}</span></small></span></button>`}).join("");
}
function recipeBookRenderResourceSelection(){
  if(!recipeBookEl.resourceSelection||!recipeBookState.data)return;
  const candidate=recipeBookState.data.resourceLookup[recipeBookState.selectedResourceKey];
  if(!candidate){recipeBookEl.resourceSelection.classList.remove("selected");recipeBookEl.resourceSelection.removeAttribute("data-recipe-book-item-key");recipeBookEl.resourceSelection.removeAttribute("tabindex");recipeBookEl.resourceSelection.innerHTML='<span aria-hidden="true">◇</span><p>Search for an ingredient, then select it from the results.</p>';if(recipeBookEl.resourceQuantity)recipeBookEl.resourceQuantity.disabled=true;if(recipeBookEl.resourceAdd)recipeBookEl.resourceAdd.disabled=true;return}
  const item=recipeBookState.data.items[candidate.itemId],current=recipeBookState.resources[candidate.key]||0;
  recipeBookEl.resourceSelection.classList.add("selected");recipeBookEl.resourceSelection.setAttribute("data-recipe-book-item-key",candidate.key);recipeBookEl.resourceSelection.tabIndex=0;recipeBookEl.resourceSelection.innerHTML=`${recipeBookIconMarkup(item,"ingredient","",candidate.enhancement)}<p><strong class="recipeBookResourceName">${escapeHtml(recipeBookCandidateName(candidate))}</strong><small class="recipeBookResourceMeta"><span class="recipeBookItemId">Item ID: ${escapeHtml(candidate.itemId)}</span><span class="recipeBookUsedIn">Used in ${recipeBookFormatCount(candidate.uses)} recipe${candidate.uses===1?"":"s"}</span><span class="recipeBookStoredState">${current?`${recipeBookFormatCount(current)} currently stored · Add will update this total`:"Enter the quantity you currently own"}</span></small></p>`;
  if(recipeBookEl.resourceQuantity)recipeBookEl.resourceQuantity.disabled=false;if(recipeBookEl.resourceAdd)recipeBookEl.resourceAdd.disabled=false;
}
function recipeBookPersistResources(){persistSetting(RECIPE_BOOK_RESOURCES_SETTING,{...recipeBookState.resources})}
function recipeBookPersistCraftPlans(){persistSetting(RECIPE_BOOK_CRAFT_PLANS_SETTING,{...recipeBookState.craftPlans})}
function recipeBookRefreshCraftables(){
  if(!recipeBookState.data)return;
  recipeBookState.craftables=recipeBookCraftableRecipes(recipeBookState.data,recipeBookState.resources,{query:recipeBookState.craftableQuery,type:recipeBookState.craftableType});
  const total=recipeBookState.craftables.length;if(recipeBookEl.craftableBadge)recipeBookEl.craftableBadge.textContent=recipeBookFormatCount(total);
  const pages=Math.max(1,Math.ceil(total/RECIPE_BOOK_PAGE_SIZE));recipeBookState.craftablePage=Math.min(Math.max(1,recipeBookState.craftablePage),pages);
}
function recipeBookRenderResources(){
  recipeBookHideTooltip();
  if(!recipeBookState.data||!recipeBookEl.resourceList)return;
  const openGroups=new Set([...recipeBookEl.resourceList.querySelectorAll(".recipeBookResourceGroupDetails[open]")].map(details=>details.dataset.resourceGroupDetails)),rows=recipeBookResourceInventoryRows(recipeBookState.data,recipeBookState.resources);
  const memberMarkup=({candidate,amount,factor=1},className="recipeBookResourceCard")=>{const item=recipeBookState.data.items[candidate.itemId],name=recipeBookCandidateName(candidate),conversion=factor!==1?`<span class="recipeBookResourceFactor">1 item = ${recipeBookFormatCount(factor)} recipe units</span>`:"";return `<article class="${className}" data-resource-key="${escapeHtml(candidate.key)}" ${recipeBookItemTargetAttributes(candidate.itemId,candidate.enhancement)}>${recipeBookIconMarkup(item,"ingredient","",candidate.enhancement)}<div class="recipeBookResourceCopy"><strong class="recipeBookResourceName">${escapeHtml(name)}</strong><small class="recipeBookResourceMeta"><span class="recipeBookItemId">Item ID: ${escapeHtml(candidate.itemId)}</span><span class="recipeBookUsedIn">Used in ${recipeBookFormatCount(candidate.uses)} recipes</span>${conversion}</small></div><div class="recipeBookResourceControls"><input type="number" min="1" max="999999999999" step="1" inputmode="numeric" value="${amount}" data-resource-quantity="${escapeHtml(candidate.key)}" aria-label="Quantity owned for ${escapeHtml(name)}"><button class="recipeBookResourceRemove" type="button" data-resource-remove="${escapeHtml(candidate.key)}" aria-label="Remove ${escapeHtml(name)}" title="Remove">×</button></div></article>`};
  recipeBookEl.resourceList.innerHTML=rows.length?rows.map(row=>{
    if(row.kind==="single")return memberMarkup(row);
    const iconStack=row.members.slice(0,6).map(member=>{const candidate=member.candidate,item=recipeBookState.data.items[candidate.itemId],name=recipeBookCandidateName(candidate);return `<span class="recipeBookResourceGroupIcon" title="${escapeHtml(name)}" ${recipeBookItemTargetAttributes(candidate.itemId,candidate.enhancement)}>${recipeBookIconMarkup(item,"ingredient","",candidate.enhancement)}</span>`}).join(""),extra=row.members.length>6?`<b class="recipeBookResourceGroupMore">+${row.members.length-6}</b>`:"",open=openGroups.has(row.groupId)?" open":"";
    return `<article class="recipeBookResourceGroupCard" data-resource-group="${escapeHtml(row.groupId)}"><header><div class="recipeBookResourceGroupIcons" aria-label="${row.members.length} exact materials">${iconStack}${extra}</div><div class="recipeBookResourceGroupCopy"><span>Verified BDO substitutes</span><strong>${escapeHtml(row.name)}</strong><small>${recipeBookFormatCount(row.members.length)} exact material stack${row.members.length===1?"":"s"} preserved</small></div><div class="recipeBookResourceGroupTotals"><span><small>Total items</small><output data-resource-group-raw>${escapeHtml(recipeBookFormatCount(row.rawTotal))}</output></span><span><small>Recipe units${row.weighted?"":" (1:1)"}</small><output data-resource-group-equivalent>${escapeHtml(recipeBookFormatCount(row.equivalentTotal))}</output></span></div></header><details class="recipeBookResourceGroupDetails" data-resource-group-details="${escapeHtml(row.groupId)}"${open}><summary><span>Review and edit exact materials</span><b>${recipeBookFormatCount(row.members.length)}</b></summary><div class="recipeBookResourceGroupMembers">${row.members.map(member=>memberMarkup(member,"recipeBookResourceGroupMember")).join("")}</div></details></article>`;
  }).join(""):'<div class="recipeBookEmpty"><span aria-hidden="true">◇</span><strong>Your resource list is empty</strong><p>Add materials above to discover what you can craft.</p></div>';
  recipeBookRefreshCraftables();if(recipeBookState.section==="craftables")recipeBookRenderCraftables();
}
const RECIPE_BOOK_OCR_MAX_FILES=8,RECIPE_BOOK_OCR_MAX_FILE_BYTES=16*1024*1024,RECIPE_BOOK_OCR_MAX_ENCODED_CHARS=24*1024*1024,RECIPE_BOOK_OCR_MAX_SESSION_BYTES=48*1024*1024;
const RECIPE_BOOK_OCR_MIME_EXTENSIONS=Object.freeze({"image/png":".png","image/jpeg":".jpg","image/bmp":".bmp"});
function recipeBookOcrSetStatus(message,state="idle"){
  if(!recipeBookEl.screenshotStatus)return;recipeBookEl.screenshotStatus.dataset.state=state;const copy=recipeBookEl.screenshotStatus.querySelector("span");if(copy)copy.textContent=message;
}
function recipeBookOcrSetBusy(busy){
  recipeBookState.ocr.busy=Boolean(busy);recipeBookEl.screenshotSurface?.setAttribute("aria-busy",String(Boolean(busy)));recipeBookEl.screenshotDropZone?.classList.toggle("is-busy",Boolean(busy));for(const control of [recipeBookEl.screenshotBrowse,recipeBookEl.screenshotPaste,recipeBookEl.screenshotFiles,recipeBookEl.screenshotClear])if(control)control.disabled=Boolean(busy);recipeBookOcrRefreshSelection();
}
function recipeBookOcrPopulateMaterialCatalog(){
  const entries=recipeBookOcrBuildMaterialCatalog(recipeBookState.data),byLabel=new Map(),byKey=new Map();for(const entry of entries){byLabel.set(entry.label.trim().toLocaleLowerCase(),entry.key);byKey.set(entry.key,entry.label)}recipeBookState.ocr.materialCatalog=byLabel;recipeBookState.ocr.materialLabels=byKey;
}
function recipeBookOcrResetSession(){
  const state=recipeBookState.ocr;state.controller?.abort();state.controller=null;state.generation++;state.busy=false;state.images=[];state.rows=[];state.fingerprints=[];state.warnings=[];state.totalBytes=0;recipeBookEl.screenshotSurface?.setAttribute("aria-busy","false");recipeBookEl.screenshotDropZone?.classList.remove("is-busy","is-dragging");for(const control of [recipeBookEl.screenshotBrowse,recipeBookEl.screenshotPaste,recipeBookEl.screenshotFiles,recipeBookEl.screenshotClear])if(control)control.disabled=false;if(recipeBookEl.screenshotFiles)recipeBookEl.screenshotFiles.value="";if(recipeBookEl.screenshotAddConfirm)recipeBookEl.screenshotAddConfirm.checked=false;const update=recipeBookEl.screenshotDialog?.querySelector('input[name="recipeBookScreenshotMerge"][value="update"]');if(update)update.checked=true;recipeBookOcrSetStatus("Add one or more screenshots to begin.");recipeBookOcrRenderReview();
}
function recipeBookOcrOpenDialog(){
  if(!recipeBookState.data){NotificationService.ShowWarning("The Recipe Book catalog is still loading.","Screenshot Mats");return}if(!recipeBookState.ocr.materialCatalog.size)recipeBookOcrPopulateMaterialCatalog();recipeBookOcrResetSession();const state=recipeBookState.ocr;state.open=true;state.returnFocus=document.activeElement;recipeBookEl.screenshotDialog.hidden=false;document.body.classList.add("recipeBookOcrOpen");requestAnimationFrame(()=>{(recipeBookEl.screenshotClose||recipeBookEl.screenshotSurface)?.focus()});
}
function recipeBookOcrCloseDialog(){
  const state=recipeBookState.ocr;if(!state.open)return;const returnFocus=state.returnFocus;state.open=false;recipeBookOcrResetSession();recipeBookEl.screenshotDialog.hidden=true;document.body.classList.remove("recipeBookOcrOpen");if(returnFocus?.isConnected)requestAnimationFrame(()=>returnFocus.focus());
}
function recipeBookOcrReadDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error(`Could not read ${file.name||"the image"}.`));reader.onload=()=>resolve(String(reader.result||""));reader.readAsDataURL(file)})}
function recipeBookOcrDecodeImage(dataUrl){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("The selected file is not a readable image."));image.src=dataUrl})}
function recipeBookOcrCanonicalMimeType(value){const type=String(value||"").trim().toLowerCase();if(type==="image/png")return"image/png";if(type==="image/jpeg"||type==="image/jpg")return"image/jpeg";if(type==="image/bmp"||type==="image/x-ms-bmp")return"image/bmp";return""}
function recipeBookOcrMimeType(file){
  const declared=String(file?.type||"").trim();if(declared)return recipeBookOcrCanonicalMimeType(declared);const name=String(file?.name||"").toLowerCase();if(name.endsWith(".png"))return"image/png";if(/\.jpe?g$/.test(name))return"image/jpeg";if(name.endsWith(".bmp"))return"image/bmp";return"";
}
function recipeBookOcrFileName(file,mimeType){const extension=RECIPE_BOOK_OCR_MIME_EXTENSIONS[mimeType]||".png",raw=String(file?.name||"").trim(),stem=(raw?raw.replace(/\.[^.]*$/u,""):`pasted-${Date.now()}`).replace(/[\\/]/g,"-").slice(0,180-extension.length)||"screenshot";return`${stem}${extension}`}
async function recipeBookOcrNormalizeFile(file){
  if(!(file instanceof Blob))throw new Error("Only image files can be scanned.");const sourceMime=recipeBookOcrMimeType(file),displayName=String(file.name||"Pasted screenshot").slice(0,180),fileName=recipeBookOcrFileName(file,sourceMime),bytes=Number(file.size)||0;
  if(!sourceMime)throw new Error(`${displayName}: use a PNG, JPG, or BMP image.`);if(bytes<1||bytes>RECIPE_BOOK_OCR_MAX_FILE_BYTES)throw new Error(`${displayName}: images must be smaller than 16 MB.`);
  let dataUrl=await recipeBookOcrReadDataUrl(file),image=await recipeBookOcrDecodeImage(dataUrl),width=image.naturalWidth,height=image.naturalHeight;if(!recipeBookOcrDimensionsAreSafe(width,height))throw new Error(`${displayName}: this image exceeds the scanner's 7,680×4,320 and 24-megapixel safety limits.`);
  let mimeType=sourceMime,normalizedName=fileName;if(sourceMime==="image/bmp"){const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d",{alpha:false});if(!context)throw new Error(`${fileName}: BMP conversion is unavailable.`);context.drawImage(image,0,0);dataUrl=canvas.toDataURL("image/png");mimeType="image/png";normalizedName=fileName.replace(/\.bmp$/i,"")+".png";image=await recipeBookOcrDecodeImage(dataUrl)}
  const comma=dataUrl.indexOf(","),dataBase64=comma>=0?dataUrl.slice(comma+1):"";if(!dataBase64||dataBase64.length>RECIPE_BOOK_OCR_MAX_ENCODED_CHARS)throw new Error(`${fileName}: the prepared image exceeds the scanner's encoded size limit.`);return{fileName:normalizedName,originalName:displayName,mimeType,dataBase64,dataUrl,width,height,bytes,imagePromise:Promise.resolve(image)};
}
function recipeBookOcrFindImage(fingerprint){return recipeBookState.ocr.images.find(image=>image.fingerprint===fingerprint)}
async function recipeBookOcrDrawPreviews(){
  const generation=recipeBookState.ocr.generation;for(const canvas of recipeBookEl.screenshotRows?.querySelectorAll("canvas[data-ocr-row-index]")||[]){const row=recipeBookState.ocr.rows[Number(canvas.dataset.ocrRowIndex)],record=row&&recipeBookOcrFindImage(row.fingerprint);if(!record)continue;try{const image=await record.imagePromise;if(generation!==recipeBookState.ocr.generation||!canvas.isConnected)return;const context=canvas.getContext("2d",{alpha:false});if(!context)continue;const crop=recipeBookOcrPreviewBox(row.box,image.naturalWidth,image.naturalHeight),scale=Math.min(canvas.width/crop.width,canvas.height/crop.height),drawWidth=Math.max(1,Math.round(crop.width*scale)),drawHeight=Math.max(1,Math.round(crop.height*scale)),drawX=Math.floor((canvas.width-drawWidth)/2),drawY=Math.floor((canvas.height-drawHeight)/2);context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";context.fillStyle="#05070d";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,crop.x,crop.y,crop.width,crop.height,drawX,drawY,drawWidth,drawHeight)}catch{}}
}
function recipeBookOcrMaterialDisplayName(key){const candidate=recipeBookState.data?.resourceLookup?.[key];return candidate?recipeBookCandidateName(candidate):(recipeBookState.ocr.materialLabels.get(key)||"")}
function recipeBookOcrCloseMaterialPopups(except=null,{restoreFocus=false}={}){
  let closed=false,focusTarget=null;for(const popup of recipeBookEl.screenshotRows?.querySelectorAll("[data-ocr-material-menu],[data-ocr-material-results]")||[]){if(popup===except||popup.hidden)continue;const owner=popup.closest("[data-ocr-material-picker],[data-ocr-material-search-wrap]"),controller=popup.matches("[data-ocr-material-menu]")?owner?.querySelector("[data-ocr-material-trigger]"):owner?.querySelector("[data-ocr-material-search]");popup.hidden=true;owner?.classList.remove("is-open","opens-up");controller?.setAttribute("aria-expanded","false");controller?.removeAttribute("aria-activedescendant");if(restoreFocus&&!focusTarget)focusTarget=controller;closed=true}if(focusTarget?.isConnected)focusTarget.focus();return closed;
}
function recipeBookOcrPlaceMaterialPopup(popup){
  const owner=popup?.closest("[data-ocr-material-picker],[data-ocr-material-search-wrap]");if(!owner)return;owner.classList.remove("opens-up");popup.scrollIntoView({block:"nearest",inline:"nearest",behavior:"auto"});
}
function recipeBookOcrOpenMaterialMenu(trigger,{focusLast=false,moveFocus=false}={}){
  const popup=document.getElementById(trigger?.getAttribute("aria-controls")||"");if(!popup||!popup.querySelector("[data-ocr-material-option]"))return;const alreadyOpen=!popup.hidden;recipeBookOcrCloseMaterialPopups(popup);popup.hidden=false;popup.closest("[data-ocr-material-picker]")?.classList.add("is-open");trigger.setAttribute("aria-expanded","true");requestAnimationFrame(()=>{recipeBookOcrPlaceMaterialPopup(popup);if(moveFocus){const options=[...popup.querySelectorAll("[data-ocr-material-option]")];(focusLast?options.at(-1):options.find(option=>option.getAttribute("aria-selected")==="true")||options[0])?.focus()}});return alreadyOpen;
}
function recipeBookOcrRenderMaterialSearch(input){
  const article=input?.closest("[data-ocr-row-index]"),popup=article?.querySelector("[data-ocr-material-results]"),row=article&&recipeBookState.ocr.rows[Number(article.dataset.ocrRowIndex)],query=String(input?.value||"").trim(),selectedLabel=row?.searchSelected&&row.selectedKey?String(recipeBookState.ocr.materialLabels.get(row.selectedKey)||recipeBookOcrMaterialDisplayName(row.selectedKey)).trim():"";if(!popup)return;if(!query||selectedLabel&&query.toLocaleLowerCase()===selectedLabel.toLocaleLowerCase()){popup.innerHTML="";input.setAttribute("aria-expanded","false");if(!popup.hidden)recipeBookOcrCloseMaterialPopups();return}const candidates=recipeBookResourceCandidates(recipeBookState.data,query,12),rowIndex=Number(article.dataset.ocrRowIndex);popup.innerHTML=candidates.length?candidates.map((candidate,index)=>{const item=recipeBookState.data.items[candidate.itemId];return `<button id="recipeBookOcrSearch-${rowIndex}-${index}" class="recipeBookScreenshotMaterialOption recipeBookScreenshotSearchOption" type="button" role="option" aria-selected="false" data-ocr-search-option="${escapeHtml(candidate.key)}"><strong>${escapeHtml(recipeBookCandidateName(candidate))}</strong><small>Item ${escapeHtml(candidate.itemId)} · Used in ${recipeBookFormatCount(candidate.uses)} recipe${candidate.uses===1?"":"s"}</small></button>`}).join(""):`<div class="recipeBookScreenshotSearchEmpty" role="status">No materials match “${escapeHtml(query)}”.</div>`;recipeBookOcrCloseMaterialPopups(popup);popup.hidden=false;popup.closest("[data-ocr-material-search-wrap]")?.classList.add("is-open");input.setAttribute("aria-expanded","true");requestAnimationFrame(()=>recipeBookOcrPlaceMaterialPopup(popup));
}
function recipeBookOcrSelectMaterial(article,row,key,source="candidate"){
  const candidate=recipeBookState.data?.resourceLookup?.[key];if(!article||!row||!candidate)return;const changed=row.selectedKey!==key;row.selectedKey=key;row.searchSelected=source==="search";if(changed||row.reviewRequired){row.reviewRequired=true;row.state="review";article.dataset.state=row.state;const status=article.querySelector(".recipeBookScreenshotSlotMeta>span");if(status)status.textContent="Review required"}const trigger=article.querySelector("[data-ocr-material-trigger]"),displayName=recipeBookOcrMaterialDisplayName(key);if(trigger){trigger.classList.toggle("has-value",Boolean(displayName));const value=trigger.querySelector("[data-ocr-material-value]");if(value)value.textContent=displayName||"Choose a likely material…"}for(const option of article.querySelectorAll("[data-ocr-material-option]"))option.setAttribute("aria-selected",String(option.dataset.ocrMaterialOption===key));const search=article.querySelector("[data-ocr-material-search]");if(search)search.value=source==="search"?(recipeBookState.ocr.materialLabels.get(key)||displayName):"";const focusTarget=source==="search"?search:trigger;recipeBookOcrCloseMaterialPopups();if(focusTarget?.isConnected)requestAnimationFrame(()=>focusTarget.focus());recipeBookOcrRefreshSelection();
}
function recipeBookOcrClearMaterialSelection(article,row){
  if(!article||!row||!row.selectedKey)return;row.selectedKey="";row.searchSelected=false;row.reviewRequired=true;row.state=row.options.length?"review":"unknown";article.dataset.state=row.state;const trigger=article.querySelector("[data-ocr-material-trigger]"),value=trigger?.querySelector("[data-ocr-material-value]");trigger?.classList.remove("has-value");if(value)value.textContent=row.options.length?"Choose a likely material…":"No likely icon match";for(const option of article.querySelectorAll("[data-ocr-material-option]"))option.setAttribute("aria-selected","false");recipeBookOcrRefreshSelection();
}
function recipeBookOcrRowMarkup(row,index){
  const record=recipeBookOcrFindImage(row.fingerprint),status=row.state==="ready"?"Exact match":row.state==="unknown"?"No match":"Review required",reason=row.reasons.join(" · ")||"Unique icon and exact quantity",selected=String(row.selectedKey||""),selectedName=recipeBookOcrMaterialDisplayName(selected),searchedMaterial=row.searchSelected&&selected?(recipeBookState.ocr.materialLabels.get(selected)||selectedName):"",quantity=row.quantity===""?"":String(row.quantity),hasSuggestion=Number.isSafeInteger(row.suggestedQuantity),suggestion=hasSuggestion?`Read as ${recipeBookFormatCount(row.suggestedQuantity)}`:"Enter quantity",quantityNote=row.quantityText?(row.quantityApproximate?(hasSuggestion?`Read as “${row.quantityText}” → ${recipeBookFormatCount(row.suggestedQuantity)}; rounded, review before import`:`Read as “${row.quantityText}”; rounded result needs manual review`):`Read as “${row.quantityText}”${row.reviewRequired?"; review before import":""}`):"No quantity text was readable",menuId=`recipeBookOcrMaterialMenu-${index}`,searchId=`recipeBookOcrMaterialSearch-${index}`,resultsId=`recipeBookOcrMaterialResults-${index}`,quantityNoteId=`recipeBookOcrQuantityNote-${index}`,options=row.options.map((option,optionIndex)=>`<button id="recipeBookOcrMaterial-${index}-${optionIndex}" class="recipeBookScreenshotMaterialOption" type="button" role="option" aria-selected="${option.key===selected}" data-ocr-material-option="${escapeHtml(option.key)}"><strong>${escapeHtml(option.name)}</strong><small>${Math.round(option.score*100)}% visual match</small></button>`).join("");
  return `<article class="recipeBookScreenshotRow" data-state="${row.state}" data-ocr-row-index="${index}"><canvas class="recipeBookScreenshotCrop" width="84" height="72" data-ocr-row-index="${index}" aria-label="Material and quantity preview for screenshot slot ${escapeHtml(row.slotId)}"></canvas><div class="recipeBookScreenshotSlotMeta"><strong>${escapeHtml(record?.fileName||"Storage screenshot")} · row ${row.row+1}, column ${row.column+1}</strong><span>${status}</span><small>${escapeHtml(reason)}</small></div><div class="recipeBookScreenshotField recipeBookScreenshotMaterialField"><span>Material</span><div class="recipeBookScreenshotPicker" data-ocr-material-picker><button class="recipeBookScreenshotPickerTrigger ${selectedName?"has-value":""}" type="button" data-ocr-material-trigger aria-haspopup="listbox" aria-expanded="false" aria-controls="${menuId}" aria-label="Likely materials for screenshot slot ${escapeHtml(row.slotId)}" ${row.options.length?"":"disabled"}><span data-ocr-material-value>${escapeHtml(selectedName||(row.options.length?"Choose a likely material…":"No likely icon match"))}</span><i aria-hidden="true"></i></button><div id="${menuId}" class="recipeBookScreenshotMaterialMenu" data-ocr-material-menu role="listbox" aria-label="Likely icon matches for screenshot slot ${escapeHtml(row.slotId)}" hidden>${options}</div></div><div class="recipeBookScreenshotFallbackWrap" data-ocr-material-search-wrap><label class="recipeBookScreenshotFallback" for="${searchId}"><span>Not listed?</span><input id="${searchId}" type="search" data-ocr-material-search value="${escapeHtml(searchedMaterial)}" placeholder="Search all materials" aria-label="Search all materials for screenshot slot ${escapeHtml(row.slotId)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${resultsId}" autocomplete="off" spellcheck="false"></label><div id="${resultsId}" class="recipeBookScreenshotMaterialResults" data-ocr-material-results role="listbox" aria-label="Matching Recipe Book materials" hidden></div></div><small>${row.options.length?`${row.options.length} likely icon match${row.options.length===1?"":"es"} · search the full catalog if needed`:"Search the full Recipe Book material catalog"}</small></div><label class="recipeBookScreenshotField"><span>Quantity to import</span><input type="number" min="1" max="${RECIPE_BOOK_OCR_MAX_QUANTITY}" step="1" inputmode="numeric" data-ocr-quantity value="${escapeHtml(quantity)}" placeholder="${escapeHtml(suggestion)}" aria-label="Quantity to import for screenshot slot ${escapeHtml(row.slotId)}" aria-describedby="${quantityNoteId}"><small id="${quantityNoteId}" class="${row.reviewRequired?"warning":""}">${escapeHtml(quantityNote)}</small></label></article>`;
}
function recipeBookOcrRenderReview(){
  const state=recipeBookState.ocr,hasRows=state.rows.length>0,hasWarnings=state.warnings.length>0,showWarnings=hasWarnings&&!hasRows;if(recipeBookEl.screenshotReview){recipeBookEl.screenshotReview.hidden=!hasRows&&!showWarnings;const merge=recipeBookEl.screenshotReview.querySelector(".recipeBookScreenshotMergeMode");if(merge)merge.hidden=!hasRows}if(recipeBookEl.screenshotClear)recipeBookEl.screenshotClear.hidden=!state.images.length&&!hasWarnings;if(recipeBookEl.screenshotRows)recipeBookEl.screenshotRows.innerHTML=state.rows.map(recipeBookOcrRowMarkup).join("");
  if(recipeBookEl.screenshotWarnings){recipeBookEl.screenshotWarnings.hidden=!showWarnings;recipeBookEl.screenshotWarnings.setAttribute("role","alert");recipeBookEl.screenshotWarnings.innerHTML=showWarnings?`<ul>${state.warnings.map(warning=>`<li>${escapeHtml(warning)}</li>`).join("")}</ul>`:""}
  const mode=recipeBookEl.screenshotDialog?.querySelector('input[name="recipeBookScreenshotMerge"]:checked')?.value||"update";if(recipeBookEl.screenshotAddConfirmWrap)recipeBookEl.screenshotAddConfirmWrap.hidden=mode!=="add";recipeBookOcrRefreshSelection();recipeBookOcrDrawPreviews();
}
function recipeBookOcrRefreshSelection(){
  const state=recipeBookState.ocr,plan=recipeBookOcrBuildImportPlan(state.rows,recipeBookState.data),mode=recipeBookEl.screenshotDialog?.querySelector('input[name="recipeBookScreenshotMerge"]:checked')?.value||"update",addConfirmed=mode!=="add"||recipeBookEl.screenshotAddConfirm?.checked,complete=state.rows.filter(row=>recipeBookOcrRowIsComplete(row,recipeBookState.data)).length,total=state.rows.length;
  if(recipeBookEl.screenshotSelectionSummary)recipeBookEl.screenshotSelectionSummary.textContent=plan.valid?`${total} material${total===1?"":"s"} ready to ${mode==="add"?"add":"update"}.`:total?`${complete} of ${total} rows complete · ${plan.errors[0]}`:state.warnings.length?"Review the scanner message above.":"Add a screenshot to begin.";if(recipeBookEl.screenshotApply)recipeBookEl.screenshotApply.disabled=state.busy||!plan.valid||!addConfirmed;
}
async function recipeBookOcrQueueFiles(inputFiles,source="browse"){
  const state=recipeBookState.ocr;if(!state.open||state.busy)return;const files=[...inputFiles].filter(Boolean);if(!files.length){NotificationService.ShowWarning(source==="paste"?"The clipboard does not contain an image.":"Choose at least one screenshot.","Screenshot Mats");return}
  const room=Math.max(0,RECIPE_BOOK_OCR_MAX_FILES-state.images.length),queue=files.slice(0,room);if(!room){NotificationService.ShowWarning("A scan session can contain up to 8 screenshots.","Screenshot Mats");return}if(files.length>queue.length)state.warnings.push(`Only the first ${queue.length} image${queue.length===1?" was":"s were"} accepted because a session is limited to 8.`);
  const token=++state.generation,controller=new AbortController();state.controller=controller;recipeBookOcrSetBusy(true);let accepted=0;
  for(let index=0;index<queue.length;index++){
    const file=queue[index],displayName=String(file.name||`Pasted screenshot ${index+1}`);if(token!==state.generation)return;recipeBookOcrSetStatus(`Analyzing ${index+1} of ${queue.length}: ${displayName}…`,"busy");
    try{
      if(state.totalBytes+(Number(file.size)||0)>RECIPE_BOOK_OCR_MAX_SESSION_BYTES)throw new Error(`${displayName}: this session would exceed the 48 MB image limit.`);const normalized=await recipeBookOcrNormalizeFile(file);if(token!==state.generation)return;
      const response=await bridgeCall("analyzeRecipeBookScreenshot",{fileName:normalized.fileName,mimeType:normalized.mimeType,dataBase64:normalized.dataBase64},{signal:controller.signal}),analysis=recipeBookOcrSanitizeResult(response);if(token!==state.generation)return;if(!analysis)throw new Error(`${displayName}: the scanner returned an invalid result.`);if(analysis.width!==normalized.width||analysis.height!==normalized.height)throw new Error(`${displayName}: the analyzed image dimensions did not match the selected file.`);
      const registered=recipeBookOcrRegisterFingerprint(state.fingerprints,analysis.imageFingerprint);if(registered.duplicate){state.warnings.push(`${displayName} was skipped because the same screenshot is already in this session.`);continue}state.fingerprints=[...registered.fingerprints];state.totalBytes+=normalized.bytes;state.images.push({fingerprint:analysis.imageFingerprint,fileName:normalized.originalName,dataUrl:normalized.dataUrl,width:normalized.width,height:normalized.height,imagePromise:normalized.imagePromise});state.rows.push(...recipeBookOcrBuildReviewRows(analysis,recipeBookState.data));state.warnings.push(...analysis.warnings.map(warning=>`${displayName}: ${warning}`));if(!analysis.slots.length)state.warnings.push(`${displayName}: no storage material slots were detected. Include one or more complete item slots with their quantity labels, or crop tightly around a single item.`);accepted++;
    }catch(error){if(token!==state.generation)return;state.warnings.push(error?.message||`${displayName}: analysis failed.`)}
  }
  if(token!==state.generation)return;if(state.controller===controller)state.controller=null;recipeBookOcrSetBusy(false);recipeBookOcrSetStatus(state.images.length?`${state.images.length} screenshot${state.images.length===1?"":"s"} · ${state.rows.length} material slot${state.rows.length===1?"":"s"} detected`:"No screenshots were accepted. Review the messages below.",state.images.length?"ready":"error");recipeBookOcrRenderReview();if(accepted||state.warnings.length)recipeBookEl.screenshotReview?.scrollIntoView({block:"nearest",behavior:document.body.dataset.motion==="reduced"?"auto":"smooth"});
}
async function recipeBookOcrPasteFromClipboard(){
  if(!navigator.clipboard?.read){NotificationService.ShowInfo("Focus this window and press Ctrl+V to paste a screenshot.","Screenshot Mats");return}try{const items=await navigator.clipboard.read(),files=[];for(const item of items){const offered=item.types.map(type=>({type,mimeType:recipeBookOcrCanonicalMimeType(type)})).find(entry=>entry.mimeType);if(!offered)continue;const blob=await item.getType(offered.type),extension=RECIPE_BOOK_OCR_MIME_EXTENSIONS[offered.mimeType];files.push(new File([blob],`clipboard-${Date.now()}${extension}`,{type:offered.mimeType}))}await recipeBookOcrQueueFiles(files,"paste")}catch{NotificationService.ShowInfo("Clipboard access was not available. Focus this window and press Ctrl+V instead.","Screenshot Mats")}
}
function recipeBookOcrApply(){
  const mode=recipeBookEl.screenshotDialog?.querySelector('input[name="recipeBookScreenshotMerge"]:checked')?.value||"update",plan=recipeBookOcrBuildImportPlan(recipeBookState.ocr.rows,recipeBookState.data);if(mode==="add"&&!recipeBookEl.screenshotAddConfirm?.checked){NotificationService.ShowWarning("Confirm the double-count warning before adding to current totals.","Screenshot Mats");return}if(!plan.valid){NotificationService.ShowWarning(plan.errors[0]||"Complete every detected material.","Screenshot Mats");return}
  const before={...recipeBookState.resources},result=recipeBookOcrApplyImportPlan(before,plan,recipeBookState.data,mode);if(!result.ok){NotificationService.ShowError(result.errors[0]||"The screenshot import could not be applied.","Screenshot Mats");return}recipeBookState.resources=result.resources;recipeBookState.ocr.undo=recipeBookOcrCreateUndoSnapshot(before,result.resources);recipeBookPersistResources();recipeBookRenderResources();if(recipeBookEl.screenshotUndo)recipeBookEl.screenshotUndo.hidden=false;const changed=result.changedKeys.length;recipeBookOcrCloseDialog();NotificationService.ShowSuccess(`${changed} material${changed===1?"":"s"} ${mode==="add"?"added to":"updated in"} My Resources.`,"Screenshot import complete");
}
function recipeBookOcrUndo(){
  const result=recipeBookOcrApplyUndo(recipeBookState.ocr.undo,recipeBookState.resources,recipeBookState.data);if(!result.ok){recipeBookState.ocr.undo=null;if(recipeBookEl.screenshotUndo)recipeBookEl.screenshotUndo.hidden=true;NotificationService.ShowWarning(result.reason,"Undo screenshot import");return}recipeBookState.resources=result.resources;recipeBookState.ocr.undo=null;recipeBookPersistResources();recipeBookRenderResources();if(recipeBookEl.screenshotUndo)recipeBookEl.screenshotUndo.hidden=true;NotificationService.ShowSuccess("The last screenshot import was undone.","My Resources");
}
function recipeBookCraftableCardMarkup(entry){
  const {recipe,maxCrafts,requirements}=entry,data=recipeBookState.data,output=data.items[recipe.outputId],typeLabel=recipeBookTypeLabel(recipe.type),outputEnhancement=recipeBookEnhancementLabel(recipe.outputEnhancement),savedAmount=recipeBookState.craftPlans[recipe.id],craftAmount=recipeBookClampCraftAmount(savedAmount,maxCrafts),progress=maxCrafts<=1?100:Math.round(((craftAmount-1)/(maxCrafts-1))*100),disabled=maxCrafts===1?" disabled":"";
  const ingredients=requirements.map(requirement=>{const candidate=data.resourceLookup[requirement.candidateKey||requirement.key],item=data.items[candidate.itemId],usage=recipeBookCraftMaterialUsage(requirement.count,craftAmount,requirement.owned),name=requirement.groupId?requirement.name:recipeBookCandidateName(candidate),unit=requirement.weighted?" recipe units":"",rawDetail=requirement.weighted?`<em>${escapeHtml(recipeBookFormatCount(requirement.rawOwned))} physical items</em>`:"";return `<li data-craft-requirement data-per-craft="${requirement.count}" data-owned="${requirement.owned}" data-substitution-group="${escapeHtml(requirement.groupId||"")}" ${recipeBookItemTargetAttributes(candidate.itemId,candidate.enhancement)}>${recipeBookIconMarkup(item,"ingredient","",candidate.enhancement)}<span class="recipeBookIngredientCopy"><strong>${escapeHtml(name)}</strong><small class="recipeBookIngredientPer">Per craft <b>×${escapeHtml(recipeBookFormatCount(requirement.count))}</b>${escapeHtml(unit)}</small></span><span class="recipeBookIngredientStock"><b class="recipeBookOwnedAmount">${escapeHtml(recipeBookFormatCount(requirement.owned))}${escapeHtml(unit)} owned</b>${rawDetail}<small class="recipeBookConsumedAmount"><span data-craft-used>${escapeHtml(recipeBookFormatCount(usage.used))} used</span><span data-craft-remaining>${escapeHtml(recipeBookFormatCount(usage.remaining))} left</span></small></span></li>`}).join("");
  return `<article class="recipeBookCard" data-recipe-id="${escapeHtml(recipe.id)}"><header ${recipeBookItemTargetAttributes(recipe.outputId,recipe.outputEnhancement)}>${recipeBookIconMarkup(output,"output","",recipe.outputEnhancement)}<div class="recipeBookCardTitle"><span>${escapeHtml(typeLabel)}</span><h3>${outputEnhancement?`<em>${escapeHtml(outputEnhancement)}</em> `:""}${escapeHtml(output.name)}</h3><small>${escapeHtml(recipe.station||typeLabel)}</small></div><div class="recipeBookCraftCount"><strong>×${escapeHtml(recipeBookFormatCount(maxCrafts))}</strong><small>max crafts</small></div></header><fieldset class="recipeBookCraftPlanner" data-craft-plan data-recipe-id="${escapeHtml(recipe.id)}" data-craft-amount="${craftAmount}" data-max-crafts="${maxCrafts}"><legend class="recipeBookSrOnly">Plan craft batches for ${escapeHtml(output.name)}</legend><div class="recipeBookCraftPlannerHead"><span>Craft amount</span><output><b data-craft-plan-value>×${escapeHtml(recipeBookFormatCount(craftAmount))}</b><small>of ${escapeHtml(recipeBookFormatCount(maxCrafts))} max</small></output></div><div class="recipeBookCraftPlannerControls"><label class="recipeBookCraftRange"><span class="recipeBookSrOnly">Drag craft amount for ${escapeHtml(output.name)}</span><input type="range" min="1" max="${maxCrafts}" step="1" value="${craftAmount}" data-craft-plan-range aria-label="Craft amount for ${escapeHtml(output.name)}" aria-valuetext="${craftAmount} of ${maxCrafts} craft batches" style="--craft-progress:${progress}%"${disabled}></label><label class="recipeBookCraftExact"><span>Exact</span><input type="number" min="1" max="${maxCrafts}" step="1" inputmode="numeric" value="${craftAmount}" data-craft-plan-number aria-label="Exact craft amount for ${escapeHtml(output.name)}"${disabled}></label></div></fieldset><div class="recipeBookIngredientHead"><span>Covered materials</span><b>${requirements.length}</b></div><ul>${ingredients}</ul></article>`;
}
function recipeBookUpdateCraftPlanner(control,{commit=false}={}){
  const planner=control?.closest?.("[data-craft-plan]");if(!planner)return;
  const maxCrafts=recipeBookResourceAmount(planner.dataset.maxCrafts),raw=String(control.value??"").trim(),parsed=Number(raw),valid=raw!==""&&Number.isSafeInteger(parsed);
  if(!valid&&!commit)return;
  const craftAmount=recipeBookClampCraftAmount(valid?parsed:planner.dataset.craftAmount,maxCrafts);if(!craftAmount)return;
  const recipeId=planner.dataset.recipeId;recipeBookState.craftPlans[recipeId]=craftAmount;planner.dataset.craftAmount=String(craftAmount);
  const range=planner.querySelector("[data-craft-plan-range]"),number=planner.querySelector("[data-craft-plan-number]"),value=planner.querySelector("[data-craft-plan-value]"),progress=maxCrafts<=1?100:((craftAmount-1)/(maxCrafts-1))*100;
  if(range){range.value=String(craftAmount);range.style.setProperty("--craft-progress",`${progress}%`);range.setAttribute("aria-valuetext",`${craftAmount} of ${maxCrafts} craft batches`)}
  if(number)number.value=String(craftAmount);if(value)value.textContent=`×${recipeBookFormatCount(craftAmount)}`;
  for(const row of planner.closest(".recipeBookCard")?.querySelectorAll("[data-craft-requirement]")||[]){const usage=recipeBookCraftMaterialUsage(row.dataset.perCraft,craftAmount,row.dataset.owned),used=row.querySelector("[data-craft-used]"),remaining=row.querySelector("[data-craft-remaining]");if(used)used.textContent=`${recipeBookFormatCount(usage.used)} used`;if(remaining)remaining.textContent=`${recipeBookFormatCount(usage.remaining)} left`}
  if(commit)recipeBookPersistCraftPlans();
}
function recipeBookRenderCraftables(){
  recipeBookHideTooltip();
  if(!recipeBookState.data||!recipeBookEl.craftableGrid)return;recipeBookRefreshCraftables();
  const total=recipeBookState.craftables.length,pages=Math.max(1,Math.ceil(total/RECIPE_BOOK_PAGE_SIZE)),start=(recipeBookState.craftablePage-1)*RECIPE_BOOK_PAGE_SIZE,end=Math.min(start+RECIPE_BOOK_PAGE_SIZE,total),resourceCount=Object.keys(recipeBookState.resources).length;
  if(recipeBookEl.craftableSummary)recipeBookEl.craftableSummary.textContent=total?`${recipeBookFormatCount(total)} craftable recipe${total===1?"":"s"}`:resourceCount?"No complete recipes yet":"Add resources to begin";
  recipeBookEl.craftableGrid.innerHTML=total?recipeBookState.craftables.slice(start,end).map(recipeBookCraftableCardMarkup).join(""):`<div class="recipeBookEmpty"><span aria-hidden="true">✦</span><strong>${resourceCount?"Nothing is fully craftable yet":"No craftables yet"}</strong><p>${resourceCount?"Add the missing ingredients or increase the quantities in My Resources.":"Add the materials you own under My Resources."}</p><button type="button" data-recipe-book-section-link="resources">Open My Resources</button></div>`;
  if(recipeBookEl.craftablePagination){recipeBookEl.craftablePagination.hidden=pages<=1||!total;recipeBookEl.craftablePrevious.disabled=recipeBookState.craftablePage<=1;recipeBookEl.craftableNext.disabled=recipeBookState.craftablePage>=pages}
  if(recipeBookEl.craftablePages)recipeBookEl.craftablePages.innerHTML=recipeBookPageWindow(recipeBookState.craftablePage,pages).map(page=>page==="ellipsis"?'<i aria-hidden="true">…</i>':`<button type="button" data-craftable-page="${page}" class="${page===recipeBookState.craftablePage?"active":""}" ${page===recipeBookState.craftablePage?'aria-current="page"':""} aria-label="Craftables page ${page}">${page}</button>`).join("");
}
function recipeBookCardMarkup(recipe,tokens){
  const data=recipeBookState.data,output=data.items[recipe.outputId],typeLabel=recipeBookTypeLabel(recipe.type),outputEnhancement=recipeBookEnhancementLabel(recipe.outputEnhancement);
  const ingredients=recipe.inputs.map(input=>{
    const item=data.items[input.itemId],isMatch=recipeBookState.mode==="ingredient"&&tokens.length&&tokens.some(token=>item.search.includes(token));
    return `<li class="${isMatch?"matchesQuery":""}" ${recipeBookItemTargetAttributes(input.itemId,input.enhancement)}>${recipeBookIconMarkup(item,"ingredient",item.name,input.enhancement)}<span class="recipeBookIngredientCopy"><strong>${escapeHtml(item.name)}</strong><small>${isMatch?"Matching ingredient":"Ingredient"}</small></span><b class="recipeBookIngredientCount">×${escapeHtml(recipeBookFormatCount(input.count))}</b></li>`;
  }).join("");
  const station=recipe.station||typeLabel;
  return `<article class="recipeBookCard" data-recipe-id="${escapeHtml(recipe.id)}"><header ${recipeBookItemTargetAttributes(recipe.outputId,recipe.outputEnhancement)}>${recipeBookIconMarkup(output,"output",output.name,recipe.outputEnhancement)}<div class="recipeBookCardTitle"><span>${escapeHtml(typeLabel)}</span><h3>${outputEnhancement?`<em>${escapeHtml(outputEnhancement)}</em> `:""}${escapeHtml(output.name)}</h3><small>${escapeHtml(station)}</small></div></header><div class="recipeBookIngredientHead"><span>Ingredients</span><b>${recipe.inputs.length}</b></div><ul>${ingredients}</ul></article>`;
}
function recipeBookPageWindow(current,total){
  if(total<=7)return Array.from({length:total},(_,index)=>index+1);
  const pages=new Set([1,total,current-1,current,current+1]);
  if(current<=3){pages.add(2);pages.add(3);pages.add(4)}
  if(current>=total-2){pages.add(total-1);pages.add(total-2);pages.add(total-3)}
  const sorted=[...pages].filter(page=>page>=1&&page<=total).sort((a,b)=>a-b),result=[];
  sorted.forEach((page,index)=>{if(index&&page-sorted[index-1]>1)result.push("ellipsis");result.push(page)});
  return result;
}
function recipeBookRender({focusResults=false}={}){
  recipeBookHideTooltip();
  const data=recipeBookState.data;if(!data)return;
  recipeBookState.filtered=recipeBookFilterRecipes(data,{query:recipeBookState.query,mode:recipeBookState.mode,type:recipeBookState.type});
  const total=recipeBookState.filtered.length,totalPages=Math.max(1,Math.ceil(total/RECIPE_BOOK_PAGE_SIZE));
  recipeBookState.page=Math.min(Math.max(1,recipeBookState.page),totalPages);
  const start=(recipeBookState.page-1)*RECIPE_BOOK_PAGE_SIZE,end=Math.min(start+RECIPE_BOOK_PAGE_SIZE,total),tokens=recipeBookSearchTokens(recipeBookState.query);
  if(recipeBookEl.grid){
    recipeBookEl.grid.setAttribute("aria-busy","false");
    recipeBookEl.grid.innerHTML=total?recipeBookState.filtered.slice(start,end).map(recipe=>recipeBookCardMarkup(recipe,tokens)).join(""):`<div class="recipeBookEmpty"><span aria-hidden="true">⌕</span><strong>No recipes matched</strong><p>${recipeBookState.mode==="ingredient"?"Try a different ingredient or choose another craft category.":"Try fewer words or search by ingredient instead."}</p></div>`;
  }
  const query=recipeBookState.query.trim(),typeLabel=recipeBookState.type?recipeBookTypeLabel(recipeBookState.type):"";
  if(recipeBookEl.summary)recipeBookEl.summary.textContent=query?`${recipeBookFormatCount(total)} recipe${total===1?"":"s"} found for “${query}”`:typeLabel?`${recipeBookFormatCount(total)} ${typeLabel} recipe${total===1?"":"s"}`:`${recipeBookFormatCount(total)} current recipe${total===1?"":"s"}`;
  if(recipeBookEl.pageSummary)recipeBookEl.pageSummary.textContent=total?`Showing ${recipeBookFormatCount(start+1)}–${recipeBookFormatCount(end)} of ${recipeBookFormatCount(total)}`:"0 results";
  if(recipeBookEl.pagination){recipeBookEl.pagination.hidden=totalPages<=1||!total;recipeBookEl.previous.disabled=recipeBookState.page<=1;recipeBookEl.next.disabled=recipeBookState.page>=totalPages}
  if(recipeBookEl.pageNumbers)recipeBookEl.pageNumbers.innerHTML=recipeBookPageWindow(recipeBookState.page,totalPages).map(page=>page==="ellipsis"?'<i aria-hidden="true">…</i>':`<button type="button" data-recipe-book-page="${page}" class="${page===recipeBookState.page?"active":""}" ${page===recipeBookState.page?'aria-current="page"':""} aria-label="Page ${page}">${page}</button>`).join("");
  if(recipeBookEl.clear)recipeBookEl.clear.hidden=!recipeBookState.query;
  if(focusResults)document.querySelector(".recipeBookResultsHead")?.scrollIntoView({behavior:document.body.dataset.motion==="reduced"?"auto":"smooth",block:"start"});
}
function recipeBookApplySearch({focusResults=false}={}){
  recipeBookState.query=recipeBookEl.search?.value||"";
  recipeBookState.page=1;
  recipeBookRender({focusResults});
}
function recipeBookSetMode(mode){
  recipeBookState.mode=mode==="ingredient"?"ingredient":"name";
  if(recipeBookEl.search)recipeBookEl.search.placeholder=recipeBookState.mode==="ingredient"?"Search an ingredient, e.g. Wolf's Blood...":"Search a recipe name...";
  if(recipeBookEl.hint)recipeBookEl.hint.textContent=recipeBookState.mode==="ingredient"?"Find every recipe containing all of the ingredient words you enter.":"Find recipes whose crafted item contains every word you enter.";
  recipeBookState.page=1;recipeBookRender();
}
function recipeBookPopulateTypes(){
  if(!recipeBookEl.type||!recipeBookState.data)return;
  recipeBookEl.type.innerHTML='<option value="">All categories</option>'+recipeBookState.data.types.map(type=>`<option value="${escapeHtml(type)}">${escapeHtml(recipeBookTypeLabel(type))}</option>`).join("");
}
async function recipeBookLoadData(){
  if(recipeBookState.loading)return;
  recipeBookState.loading=true;
  if(recipeBookEl.message)recipeBookEl.message.hidden=true;
  if(recipeBookEl.grid){recipeBookEl.grid.setAttribute("aria-busy","true");recipeBookEl.grid.innerHTML='<div class="recipeBookLoading"><i></i><strong>Opening the recipe book...</strong><span>Validating recipes and preparing the search index.</span></div>'}
  recipeBookSetStatus("Loading offline recipe catalog...","loading");
  try{
    const response=await fetch(`${RECIPE_BOOK_ASSET_ROOT}recipes.json`,{cache:"no-cache",headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error(`Recipe data returned ${response.status}`);
    recipeBookState.data=recipeBookPrepareData(await response.json());
    recipeBookState.resources=recipeBookSanitizeResources(readSetting(RECIPE_BOOK_RESOURCES_SETTING,{}),recipeBookState.data);
    recipeBookState.craftPlans=recipeBookSanitizeCraftPlans(readSetting(RECIPE_BOOK_CRAFT_PLANS_SETTING,{}));
    recipeBookPopulateTypes();
    if(recipeBookEl.craftableType)recipeBookEl.craftableType.innerHTML='<option value="">All categories</option>'+recipeBookState.data.types.map(type=>`<option value="${escapeHtml(type)}">${escapeHtml(recipeBookTypeLabel(type))}</option>`).join("");
    for(const control of [recipeBookEl.search,recipeBookEl.searchButton,recipeBookEl.type,recipeBookEl.resourceSearch,recipeBookEl.craftableSearch,recipeBookEl.craftableType,recipeBookEl.screenshotOpen])if(control)control.disabled=false;
    const iconCount=Number(recipeBookState.data.counts.uniqueIcons)||Object.values(recipeBookState.data.items).filter(item=>recipeBookSafeIconPath(item.icon)).length;
    recipeBookSetStatus(`${recipeBookFormatCount(recipeBookState.data.recipes.length)} recipes · ${recipeBookFormatCount(iconCount)} cached images`,"ready");
    recipeBookState.page=1;recipeBookRender();recipeBookRenderResources();recipeBookSetSection(recipeBookState.section);
  }catch(error){
    recipeBookState.data=null;
    recipeBookShowError(error?.message||"The bundled recipe data could not be read.");
  }finally{recipeBookState.loading=false}
}
function initializeRecipeBook(){
  if(recipeBookState.initialized)return;
  recipeBookState.initialized=true;
  recipeBookEl.form?.addEventListener("submit",event=>{event.preventDefault();clearTimeout(recipeBookState.searchTimer);recipeBookApplySearch()});
  recipeBookEl.search?.addEventListener("input",()=>{if(recipeBookEl.clear)recipeBookEl.clear.hidden=!recipeBookEl.search.value;clearTimeout(recipeBookState.searchTimer);recipeBookState.searchTimer=setTimeout(()=>recipeBookApplySearch(),90)});
  recipeBookEl.search?.addEventListener("keydown",event=>{if(event.key==="Escape"&&recipeBookEl.search.value){event.preventDefault();recipeBookEl.search.value="";recipeBookApplySearch();recipeBookEl.search.focus()}});
  recipeBookEl.clear?.addEventListener("click",()=>{recipeBookEl.search.value="";recipeBookApplySearch();recipeBookEl.search.focus()});
  recipeBookEl.mode?.addEventListener("change",event=>{if(event.target.matches('input[name="recipeBookMode"]'))recipeBookSetMode(event.target.value)});
  recipeBookEl.type?.addEventListener("change",()=>{recipeBookState.type=recipeBookEl.type.value;recipeBookState.page=1;recipeBookRender()});
  recipeBookEl.retry?.addEventListener("click",recipeBookLoadData);
  recipeBookEl.previous?.addEventListener("click",()=>{if(recipeBookState.page>1){recipeBookState.page--;recipeBookRender({focusResults:true})}});
  recipeBookEl.next?.addEventListener("click",()=>{const pages=Math.ceil(recipeBookState.filtered.length/RECIPE_BOOK_PAGE_SIZE);if(recipeBookState.page<pages){recipeBookState.page++;recipeBookRender({focusResults:true})}});
  recipeBookEl.pageNumbers?.addEventListener("click",event=>{const button=event.target.closest("[data-recipe-book-page]");if(!button)return;recipeBookState.page=Number(button.dataset.recipeBookPage)||1;recipeBookRender({focusResults:true})});
  for(const tab of recipeBookEl.tabs)tab.addEventListener("click",()=>recipeBookSetSection(tab.dataset.recipeBookSection));
  recipeBookEl.view?.querySelector(".recipeBookWorkspaceTabs")?.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const tabs=recipeBookEl.tabs,current=Math.max(0,tabs.indexOf(document.activeElement));let next=event.key==="Home"?0:event.key==="End"?tabs.length-1:event.key==="ArrowRight"?(current+1)%tabs.length:(current-1+tabs.length)%tabs.length;recipeBookSetSection(tabs[next].dataset.recipeBookSection,{focus:true})});
  recipeBookEl.view?.addEventListener("click",event=>{const link=event.target.closest("[data-recipe-book-section-link]");if(link)recipeBookSetSection(link.dataset.recipeBookSectionLink,{focus:true})});
  recipeBookEl.resourceSearch?.addEventListener("input",()=>{recipeBookState.selectedResourceKey="";recipeBookRenderResourceSelection();recipeBookRenderResourceSuggestions()});
  recipeBookEl.resourceSearch?.addEventListener("focus",recipeBookRenderResourceSuggestions);
  recipeBookEl.resourceSearch?.addEventListener("keydown",event=>{const options=[...recipeBookEl.resourceSuggestions.querySelectorAll("[data-resource-key]")];if(event.key==="Escape"){recipeBookEl.resourceSuggestions.hidden=true;recipeBookEl.resourceSearch.setAttribute("aria-expanded","false");recipeBookEl.resourceSearch.removeAttribute("aria-activedescendant");return}if(!options.length)return;let index=options.findIndex(option=>option.getAttribute("aria-selected")==="true");if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();index=event.key==="ArrowDown"?(index+1)%options.length:(index-1+options.length)%options.length;options.forEach((option,optionIndex)=>option.setAttribute("aria-selected",String(optionIndex===index)));recipeBookEl.resourceSearch.setAttribute("aria-activedescendant",options[index].id);options[index].scrollIntoView({block:"nearest"})}else if(event.key==="Enter"&&index>=0){event.preventDefault();options[index].click()}});
  recipeBookEl.resourceSuggestions?.addEventListener("click",event=>{const button=event.target.closest("[data-resource-key]");if(!button)return;recipeBookState.selectedResourceKey=button.dataset.resourceKey;const candidate=recipeBookState.data.resourceLookup[recipeBookState.selectedResourceKey];recipeBookEl.resourceSearch.value=recipeBookCandidateName(candidate);recipeBookEl.resourceSuggestions.hidden=true;recipeBookEl.resourceSearch.setAttribute("aria-expanded","false");recipeBookEl.resourceSearch.removeAttribute("aria-activedescendant");recipeBookEl.resourceQuantity.value=recipeBookState.resources[candidate.key]||1;recipeBookEl.resourceAdd.textContent=recipeBookState.resources[candidate.key]?"Update":"Add";recipeBookRenderResourceSelection();recipeBookEl.resourceQuantity.focus();recipeBookEl.resourceQuantity.select()});
  recipeBookEl.resourceForm?.addEventListener("submit",event=>{event.preventDefault();const key=recipeBookState.selectedResourceKey,amount=recipeBookResourceAmount(recipeBookEl.resourceQuantity.value);if(!key||!recipeBookState.data.resourceLookup[key]||!amount){NotificationService.ShowWarning("Choose an ingredient and enter a whole quantity of at least 1.","My Resources");return}recipeBookState.resources[key]=amount;recipeBookPersistResources();recipeBookRenderResources();recipeBookEl.resourceAdd.textContent="Update";recipeBookRenderResourceSelection();NotificationService.ShowSuccess(`${recipeBookCandidateName(recipeBookState.data.resourceLookup[key])} saved to My Resources.`,"Resource saved")});
  recipeBookEl.resourceList?.addEventListener("change",event=>{const input=event.target.closest("[data-resource-quantity]");if(!input)return;const amount=recipeBookResourceAmount(input.value);if(!amount){input.value=recipeBookState.resources[input.dataset.resourceQuantity];NotificationService.ShowWarning("Resource quantities must be whole numbers of at least 1.","My Resources");return}recipeBookState.resources[input.dataset.resourceQuantity]=amount;recipeBookPersistResources();recipeBookRenderResources()});
  recipeBookEl.resourceList?.addEventListener("click",event=>{const button=event.target.closest("[data-resource-remove]");if(!button)return;const candidate=recipeBookState.data.resourceLookup[button.dataset.resourceRemove];delete recipeBookState.resources[button.dataset.resourceRemove];recipeBookPersistResources();if(recipeBookState.selectedResourceKey===button.dataset.resourceRemove){recipeBookState.selectedResourceKey="";recipeBookEl.resourceSearch.value="";recipeBookEl.resourceAdd.textContent="Add";recipeBookRenderResourceSelection()}recipeBookRenderResources();NotificationService.ShowInfo(`${recipeBookCandidateName(candidate)} removed.`,"Resource removed")});
  recipeBookEl.screenshotOpen?.addEventListener("click",recipeBookOcrOpenDialog);recipeBookEl.screenshotUndo?.addEventListener("click",recipeBookOcrUndo);recipeBookEl.screenshotClose?.addEventListener("click",recipeBookOcrCloseDialog);recipeBookEl.screenshotCancel?.addEventListener("click",recipeBookOcrCloseDialog);recipeBookEl.screenshotDialog?.querySelector("[data-recipe-book-ocr-close]")?.addEventListener("click",recipeBookOcrCloseDialog);recipeBookEl.screenshotBrowse?.addEventListener("click",()=>recipeBookEl.screenshotFiles?.click());recipeBookEl.screenshotPaste?.addEventListener("click",recipeBookOcrPasteFromClipboard);recipeBookEl.screenshotClear?.addEventListener("click",recipeBookOcrResetSession);recipeBookEl.screenshotApply?.addEventListener("click",recipeBookOcrApply);
  recipeBookEl.screenshotFiles?.addEventListener("change",()=>{const files=[...recipeBookEl.screenshotFiles.files];recipeBookEl.screenshotFiles.value="";recipeBookOcrQueueFiles(files,"browse")});
  let recipeBookOcrDragDepth=0;recipeBookEl.screenshotDropZone?.addEventListener("dragenter",event=>{if(!event.dataTransfer?.types?.includes("Files"))return;event.preventDefault();recipeBookOcrDragDepth++;recipeBookEl.screenshotDropZone.classList.add("is-dragging")});recipeBookEl.screenshotDropZone?.addEventListener("dragover",event=>{if(!event.dataTransfer?.types?.includes("Files"))return;event.preventDefault();event.dataTransfer.dropEffect="copy"});recipeBookEl.screenshotDropZone?.addEventListener("dragleave",event=>{event.preventDefault();recipeBookOcrDragDepth=Math.max(0,recipeBookOcrDragDepth-1);if(!recipeBookOcrDragDepth)recipeBookEl.screenshotDropZone.classList.remove("is-dragging")});recipeBookEl.screenshotDropZone?.addEventListener("drop",event=>{event.preventDefault();recipeBookOcrDragDepth=0;recipeBookEl.screenshotDropZone.classList.remove("is-dragging");recipeBookOcrQueueFiles(event.dataTransfer?.files||[],"drop")});
  document.addEventListener("paste",event=>{if(!recipeBookState.ocr.open||recipeBookState.ocr.busy)return;const files=[...event.clipboardData?.items||[]].filter(item=>item.kind==="file"&&recipeBookOcrCanonicalMimeType(item.type)).map(item=>item.getAsFile()).filter(Boolean);if(files.length){event.preventDefault();recipeBookOcrQueueFiles(files,"paste")}});
  recipeBookEl.screenshotRows?.addEventListener("click",event=>{const article=event.target.closest("[data-ocr-row-index]"),row=article&&recipeBookState.ocr.rows[Number(article.dataset.ocrRowIndex)];if(!row)return;const candidate=event.target.closest("[data-ocr-material-option]");if(candidate){event.preventDefault();recipeBookOcrSelectMaterial(article,row,candidate.dataset.ocrMaterialOption,"candidate");return}const searchResult=event.target.closest("[data-ocr-search-option]");if(searchResult){event.preventDefault();recipeBookOcrSelectMaterial(article,row,searchResult.dataset.ocrSearchOption,"search");return}const trigger=event.target.closest("[data-ocr-material-trigger]");if(trigger){event.preventDefault();const popup=document.getElementById(trigger.getAttribute("aria-controls")||"");if(popup&&!popup.hidden)recipeBookOcrCloseMaterialPopups();else recipeBookOcrOpenMaterialMenu(trigger)}});
  recipeBookEl.screenshotRows?.addEventListener("input",event=>{const article=event.target.closest("[data-ocr-row-index]"),row=article&&recipeBookState.ocr.rows[Number(article.dataset.ocrRowIndex)];if(!row)return;if(event.target.matches("[data-ocr-quantity]")){row.quantity=event.target.value;recipeBookOcrRefreshSelection();return}if(event.target.matches("[data-ocr-material-search]")){const expected=row.searchSelected&&row.selectedKey?(recipeBookState.ocr.materialLabels.get(row.selectedKey)||"").trim().toLocaleLowerCase():"",actual=event.target.value.trim().toLocaleLowerCase();if(row.selectedKey&&actual!==expected)recipeBookOcrClearMaterialSelection(article,row);recipeBookOcrRenderMaterialSearch(event.target)}});
  recipeBookEl.screenshotRows?.addEventListener("focusin",event=>{const owner=event.target.closest("[data-ocr-material-picker],[data-ocr-material-search-wrap]"),keep=owner?.querySelector("[data-ocr-material-menu],[data-ocr-material-results]")||null;recipeBookOcrCloseMaterialPopups(keep);if(event.target.matches("[data-ocr-material-search]")&&event.target.value.trim())recipeBookOcrRenderMaterialSearch(event.target)});
  recipeBookEl.screenshotRows?.addEventListener("keydown",event=>{const option=event.target.closest("[data-ocr-material-option],[data-ocr-search-option]");if(option){const popup=option.closest("[data-ocr-material-menu],[data-ocr-material-results]"),options=[...popup.querySelectorAll("[data-ocr-material-option],[data-ocr-search-option]")],index=options.indexOf(option);if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?options.length-1:(index+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;options[next]?.focus();return}if(event.key==="Escape"){event.preventDefault();event.stopPropagation();recipeBookOcrCloseMaterialPopups(null,{restoreFocus:true});return}return}const trigger=event.target.closest("[data-ocr-material-trigger]");if(trigger&&["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();recipeBookOcrOpenMaterialMenu(trigger,{focusLast:event.key==="ArrowUp",moveFocus:true});return}if(trigger&&event.key==="Escape"&&trigger.getAttribute("aria-expanded")==="true"){event.preventDefault();event.stopPropagation();recipeBookOcrCloseMaterialPopups();return}const search=event.target.closest("[data-ocr-material-search]");if(!search)return;const popup=document.getElementById(search.getAttribute("aria-controls")||"");if(["ArrowDown","ArrowUp"].includes(event.key)){if(popup?.hidden)recipeBookOcrRenderMaterialSearch(search);const results=[...popup?.querySelectorAll("[data-ocr-search-option]")||[]];if(results.length){event.preventDefault();(event.key==="ArrowUp"?results.at(-1):results[0]).focus()}return}if(event.key==="Enter"&&!popup?.hidden){const first=popup?.querySelector("[data-ocr-search-option]");if(first){event.preventDefault();first.click()}return}if(event.key==="Escape"&&!popup?.hidden){event.preventDefault();event.stopPropagation();recipeBookOcrCloseMaterialPopups();search.focus()}});
  recipeBookEl.screenshotRows?.addEventListener("change",event=>{const article=event.target.closest("[data-ocr-row-index]"),row=article&&recipeBookState.ocr.rows[Number(article.dataset.ocrRowIndex)];if(!row)return;if(event.target.matches("[data-ocr-quantity]"))row.quantity=event.target.value;recipeBookOcrRefreshSelection()});
  document.addEventListener("click",event=>{if(recipeBookState.ocr.open&&!event.target.closest("[data-ocr-material-picker],[data-ocr-material-search-wrap]"))recipeBookOcrCloseMaterialPopups()});
  recipeBookEl.screenshotDialog?.addEventListener("change",event=>{if(event.target.matches('input[name="recipeBookScreenshotMerge"]')){const add=event.target.value==="add";if(recipeBookEl.screenshotAddConfirmWrap)recipeBookEl.screenshotAddConfirmWrap.hidden=!add;if(!add&&recipeBookEl.screenshotAddConfirm)recipeBookEl.screenshotAddConfirm.checked=false;recipeBookOcrRefreshSelection()}else if(event.target===recipeBookEl.screenshotAddConfirm)recipeBookOcrRefreshSelection()});
  recipeBookEl.screenshotDialog?.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();if(recipeBookOcrCloseMaterialPopups(null,{restoreFocus:true}))return;recipeBookOcrCloseDialog();return}if(event.key!=="Tab")return;const focusable=[...recipeBookEl.screenshotSurface.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(element=>!element.hidden&&element.getClientRects().length);if(!focusable.length){event.preventDefault();recipeBookEl.screenshotSurface.focus();return}const first=focusable[0],last=focusable.at(-1),active=document.activeElement;if(active===recipeBookEl.screenshotSurface||!recipeBookEl.screenshotSurface.contains(active)){event.preventDefault();(event.shiftKey?last:first).focus()}else if(event.shiftKey&&active===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&active===last){event.preventDefault();first.focus()}});
  recipeBookEl.craftableSearch?.addEventListener("input",()=>{clearTimeout(recipeBookState.craftableTimer);recipeBookState.craftableTimer=setTimeout(()=>{recipeBookState.craftableQuery=recipeBookEl.craftableSearch.value;recipeBookState.craftablePage=1;recipeBookRenderCraftables()},90)});
  recipeBookEl.craftableType?.addEventListener("change",()=>{recipeBookState.craftableType=recipeBookEl.craftableType.value;recipeBookState.craftablePage=1;recipeBookRenderCraftables()});
  recipeBookEl.craftableGrid?.addEventListener("input",event=>{const control=event.target.closest("[data-craft-plan-range],[data-craft-plan-number]");if(control)recipeBookUpdateCraftPlanner(control)});
  recipeBookEl.craftableGrid?.addEventListener("change",event=>{const control=event.target.closest("[data-craft-plan-range],[data-craft-plan-number]");if(control)recipeBookUpdateCraftPlanner(control,{commit:true})});
  recipeBookEl.craftablePrevious?.addEventListener("click",()=>{if(recipeBookState.craftablePage>1){recipeBookState.craftablePage--;recipeBookRenderCraftables()}});recipeBookEl.craftableNext?.addEventListener("click",()=>{const pages=Math.ceil(recipeBookState.craftables.length/RECIPE_BOOK_PAGE_SIZE);if(recipeBookState.craftablePage<pages){recipeBookState.craftablePage++;recipeBookRenderCraftables()}});recipeBookEl.craftablePages?.addEventListener("click",event=>{const button=event.target.closest("[data-craftable-page]");if(!button)return;recipeBookState.craftablePage=Number(button.dataset.craftablePage)||1;recipeBookRenderCraftables()});
  recipeBookEl.grid?.addEventListener("load",event=>recipeBookFitIcon(event.target),true);
  for(const root of [recipeBookEl.resourceSuggestions,recipeBookEl.resourceSelection,recipeBookEl.resourceList,recipeBookEl.craftableGrid,recipeBookEl.tooltip])root?.addEventListener("load",event=>recipeBookFitIcon(event.target),true);
  recipeBookEl.grid?.addEventListener("error",event=>{if(event.target instanceof HTMLImageElement){const wrap=event.target.closest(".recipeBookItemIcon");if(wrap)wrap.classList.add("iconMissing");event.target.hidden=true}},true);
  for(const root of [recipeBookEl.resourceSuggestions,recipeBookEl.resourceSelection,recipeBookEl.resourceList,recipeBookEl.craftableGrid,recipeBookEl.tooltip])root?.addEventListener("error",event=>{if(event.target instanceof HTMLImageElement){const wrap=event.target.closest(".recipeBookItemIcon");if(wrap)wrap.classList.add("iconMissing");event.target.hidden=true}},true);
  recipeBookEl.view?.addEventListener("pointerover",event=>{if(event.pointerType==="touch")return;const target=event.target.closest("[data-recipe-book-item-key]"),interactive=event.target.closest("input,button,select,textarea,a");if(!target||(interactive&&interactive!==target)||target.contains(event.relatedTarget))return;clearTimeout(recipeBookState.tooltipCloseTimer);recipeBookState.tooltipOpenTimer=setTimeout(()=>recipeBookShowTooltip(target),130)});
  recipeBookEl.view?.addEventListener("pointerout",event=>{const target=event.target.closest("[data-recipe-book-item-key]");if(!target||target.contains(event.relatedTarget))return;clearTimeout(recipeBookState.tooltipOpenTimer);recipeBookState.tooltipCloseTimer=setTimeout(recipeBookHideTooltip,80)});
  recipeBookEl.view?.addEventListener("focusin",event=>{const target=event.target.closest("[data-recipe-book-item-key]"),interactive=event.target.closest("input,button,select,textarea,a");if(target&&(!interactive||interactive===target))recipeBookShowTooltip(target);else if(interactive)recipeBookHideTooltip()});
  recipeBookEl.view?.addEventListener("focusout",event=>{const target=event.target.closest("[data-recipe-book-item-key]");if(target===recipeBookState.tooltipTarget&&!target.contains(event.relatedTarget))recipeBookHideTooltip()});
  recipeBookEl.view?.addEventListener("click",event=>{const target=event.target.closest("[data-recipe-book-item-key]"),interactive=event.target.closest("input,button,select,textarea,a");if(!target||(interactive&&interactive!==target))return;if(recipeBookState.tooltipTarget===target&&!recipeBookEl.tooltip.hidden)recipeBookHideTooltip();else recipeBookShowTooltip(target)});
  recipeBookEl.view?.addEventListener("keydown",event=>{if(event.key==="Escape"&&!recipeBookEl.tooltip?.hidden){event.preventDefault();recipeBookHideTooltip()}});
  addEventListener("scroll",()=>{if(recipeBookState.tooltipTarget&&!recipeBookEl.tooltip?.hidden)recipeBookPositionTooltip(recipeBookState.tooltipTarget)},{passive:true});
  addEventListener("resize",()=>{if(recipeBookState.tooltipTarget&&!recipeBookEl.tooltip?.hidden)recipeBookPositionTooltip(recipeBookState.tooltipTarget)});
  recipeBookSetSection("catalog");
  recipeBookLoadData();
}

let appViewTransitionTimer=null;
let activeAppViewId=document.querySelector(".appView.active")?.id||"homeView";
const CINEMATIC_BACKGROUNDS=["homeView","calculatorView","marketView","portraitView","fontChangerView","couponsView","eventsView","grindTrackerView","settingsView","resetTimersView","bracketsView","masteryBracketsView"].reduce((map,view,index)=>{map[view]=`Assets/CinematicBackgrounds/cinematic-${String(Math.min(index+1,10)).padStart(2,"0")}.jpg`;return map;},{playerGuildView:"Assets/CinematicBackgrounds/cinematic-08.jpg",dehkiaFuelView:"Assets/CinematicBackgrounds/cinematic-09.jpg",lightstoneSetsView:"Assets/CinematicBackgrounds/cinematic-10.jpg",recipeBookView:"Assets/CinematicBackgrounds/cinematic-06.jpg"});
function updateCinematicBackground(viewId){const url=CINEMATIC_BACKGROUNDS[viewId]||CINEMATIC_BACKGROUNDS.homeView;document.body.style.setProperty("--cinematic-bg",`url("${url}")`)}
function tickActiveAppView(){if(document.hidden)return;if(activeAppViewId==="homeView")updateHomeTimers(normalizedHomeSettings());else if(activeAppViewId==="resetTimersView")renderResetTimers(normalizedResetSettings());else if(activeAppViewId==="eventsView"&&eventsState.events.length)updateEventTimelineClock()}
clearInterval(window.__bdoActiveViewTicker);
window.__bdoActiveViewTicker=setInterval(tickActiveAppView,1000);
function syncPageVisibility(){document.body.classList.toggle("appHidden",document.hidden);if(!document.hidden)tickActiveAppView()}
document.addEventListener("visibilitychange",syncPageVisibility);
syncPageVisibility();
function syncFixedChromeOffset(){
  const title=document.getElementById("windowTitleBar");
  const nav=document.querySelector(".navFrame");
  const titleHeight=Math.ceil(title?.getBoundingClientRect().height||62);
  const navHeight=Math.ceil(nav?.getBoundingClientRect().height||150);
  const navOffset=document.body.classList.contains("navAutoHidden")?14:navHeight+18;
  document.documentElement.style.setProperty("--titleBarHeight",`${titleHeight}px`);
  document.documentElement.style.setProperty("--fixedTopOffset",`${titleHeight+navOffset}px`);
}
function scheduleFixedChromeOffsetSync(){
  cancelAnimationFrame(window.__bdoFixedChromeSyncFrame||0);
  window.__bdoFixedChromeSyncFrame=requestAnimationFrame(syncFixedChromeOffset);
}
const navigationFrame=document.querySelector(".navFrame");
const navigationPinButton=document.getElementById("navigationPinButton");
const NAVIGATION_HIDE_DELAY_MS=3000;
const NAVIGATION_REVEAL_DEPTH_PX=28;
const NAVIGATION_PIN_SETTING="navigationPinned";
let navigationHideTimer=null;
let navigationLastPointerY=Number.POSITIVE_INFINITY;
let navigationPointerInside=false;
let navigationPinned=readSetting(NAVIGATION_PIN_SETTING,false)===true;
function pointerIsNearNavigationRevealZone(clientY){
  const titleHeight=document.getElementById("windowTitleBar")?.getBoundingClientRect().height||62;
  return Number.isFinite(clientY)&&clientY<=titleHeight+NAVIGATION_REVEAL_DEPTH_PX;
}
function pointerIsInNavigationTouchRevealZone(clientY){
  const titleHeight=document.getElementById("windowTitleBar")?.getBoundingClientRect().height||62;
  return Number.isFinite(clientY)&&clientY>=titleHeight&&clientY<=titleHeight+NAVIGATION_REVEAL_DEPTH_PX;
}
function navigationHasVisibleFocus(){
  const activeElement=document.activeElement;
  return Boolean(activeElement
    &&navigationFrame?.contains(activeElement)
    &&activeElement.matches(":focus-visible"));
}
function setNavigationHidden(hidden){
  if(navigationPinned&&hidden)return;
  if(!navigationFrame||document.body.classList.contains("navAutoHidden")===hidden)return;
  document.body.classList.toggle("navAutoHidden",hidden);
  syncFixedChromeOffset();
}
function cancelNavigationHide(){
  clearTimeout(navigationHideTimer);
  navigationHideTimer=null;
}
function showNavigation(){
  cancelNavigationHide();
  setNavigationHidden(false);
}
function scheduleNavigationHide(){
  cancelNavigationHide();
  if(navigationPinned
    ||!navigationFrame
    ||navigationPointerInside
    ||navigationHasVisibleFocus()
    ||pointerIsNearNavigationRevealZone(navigationLastPointerY)){
    return;
  }
  navigationHideTimer=setTimeout(()=>{
    navigationHideTimer=null;
    if(navigationPinned
      ||navigationPointerInside
      ||navigationHasVisibleFocus()
      ||pointerIsNearNavigationRevealZone(navigationLastPointerY)){
      return;
    }
    setNavigationHidden(true);
  },NAVIGATION_HIDE_DELAY_MS);
}
function syncNavigationPinnedState(){
  document.body.classList.toggle("navPinned",navigationPinned);
  if(!navigationPinButton)return;
  const label="Keep navigation visible";
  navigationPinButton.setAttribute("aria-pressed",String(navigationPinned));
  navigationPinButton.setAttribute("aria-label",label);
  navigationPinButton.title=label;
}
function setNavigationPinned(pinned,save=false){
  navigationPinned=pinned===true;
  syncNavigationPinnedState();
  if(navigationPinned){
    showNavigation();
    syncFixedChromeOffset();
  }else{
    scheduleNavigationHide();
  }
  if(save)persistSetting(NAVIGATION_PIN_SETTING,navigationPinned);
}
function handleNavigationPointerMove(event){
  if(event.pointerType&&event.pointerType!=="mouse"&&event.pointerType!=="pen")return;
  navigationLastPointerY=event.clientY;
  navigationPointerInside=Boolean(navigationFrame?.contains(event.target));
  if(pointerIsNearNavigationRevealZone(event.clientY)||navigationPointerInside){
    showNavigation();
  }else if(!document.body.classList.contains("navAutoHidden")&&!navigationHideTimer){
    scheduleNavigationHide();
  }
}
function handleNavigationPointerDown(event){
  if(event.pointerType==="touch"&&pointerIsInNavigationTouchRevealZone(event.clientY))showNavigation();
}
function initializeNavigationAutoHide(){
  if(!navigationFrame)return;
  navigationPinButton?.addEventListener("click",()=>setNavigationPinned(!navigationPinned,true));
  navigationFrame.addEventListener("pointerenter",()=>{
    navigationPointerInside=true;
    showNavigation();
  });
  navigationFrame.addEventListener("pointerleave",event=>{
    navigationPointerInside=false;
    navigationLastPointerY=event.clientY;
    scheduleNavigationHide();
  });
  navigationFrame.addEventListener("focusin",showNavigation);
  navigationFrame.addEventListener("focusout",()=>setTimeout(scheduleNavigationHide,0));
  document.addEventListener("pointermove",handleNavigationPointerMove,{passive:true});
  document.addEventListener("pointerdown",handleNavigationPointerDown,{passive:true});
  setNavigationPinned(navigationPinned);
}
function initializeAppView(viewId){
  activeAppViewId=viewId;
  updateCinematicBackground(viewId);
  if(viewId === "homeView") initializeHomeDashboard();
  if(viewId === "marketView") initializeMarket();
  if(viewId === "portraitView") initializePortraitReplacer();
  if(viewId === "fontChangerView") initializeFontChanger();
  if(viewId === "couponsView") initializeCoupons();
  if(viewId === "eventsView") initializeEvents();
  if(viewId === "playerGuildView") initializePlayerGuild();
  if(viewId === "dehkiaFuelView") initializeDehkiaFuel();
  if(viewId === "grindTrackerView") initializeGrindTracker();
  if(viewId === "resetTimersView") initializeResetTimers();
  if(viewId === "bracketsView") initializeBrackets();
  if(viewId === "masteryBracketsView") initializeMasteryBrackets();
  if(viewId === "recipeBookView") initializeRecipeBook();
  if(viewId === "lightstoneSetsView") initializeLightstoneSets();
  if(viewId === "settingsView") initializeAppBehaviorSettings({showError:true});
}
function activateAppView(button){
  const targetId=button.dataset.appView,current=document.querySelector(".appView.active"),target=document.getElementById(targetId);
  if(!target||current===target)return;
  if(current?.id==="playerGuildView"&&targetId!=="playerGuildView")playerGuildCancelActiveRequest("The request was cancelled because you left Player & Guild.");
  clearTimeout(appViewTransitionTimer);
  document.querySelectorAll("[data-app-view]").forEach(x => x.classList.toggle("active", x === button));
  if(current){
    current.classList.add("viewFading");
    appViewTransitionTimer=setTimeout(()=>{
      current.classList.remove("active","viewFading");
      target.classList.add("active","viewFading");
      initializeAppView(targetId);
      syncFixedChromeOffset();
      requestAnimationFrame(()=>target.classList.remove("viewFading"));
    },180);
  }else{
    target.classList.add("active");
    initializeAppView(targetId);
    syncFixedChromeOffset();
  }
}
document.querySelectorAll("[data-app-view]").forEach(button => {
  button.addEventListener("click", () => activateAppView(button));
});
window.addEventListener("resize", syncFixedChromeOffset);
requestAnimationFrame(syncFixedChromeOffset);
setTimeout(syncFixedChromeOffset,250);
initializeNavigationAutoHide();

const titleBar = document.getElementById("windowTitleBar");
titleBar?.addEventListener("pointerdown", event => {
  if(event.button !== 0 || event.target.closest("button")) return;
  bridgeCall("windowDrag").catch(() => {});
});
titleBar?.addEventListener("dblclick", event => {
  if(event.target.closest("button")) return;
  bridgeCall("windowToggleMaximize").catch(() => {});
});
document.getElementById("windowMinimize")?.addEventListener("click", () => bridgeCall("windowMinimize").catch(() => {}));
document.getElementById("windowMaximize")?.addEventListener("click", () => bridgeCall("windowToggleMaximize").catch(() => {}));
document.getElementById("windowClose")?.addEventListener("click", () => bridgeCall("windowClose").catch(() => {}));

document.querySelectorAll("[data-market-panel]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-market-panel]").forEach(x => x.classList.toggle("active", x === button));
    document.querySelectorAll(".marketPanelView").forEach(panel =>
      panel.classList.toggle("active", panel.id === button.dataset.marketPanel));
    if(button.dataset.marketPanel === "outfitPanel") loadOutfitReport();
  });
});

let marketSearchTimer;
let marketSearchGeneration=0;
marketEl.search.addEventListener("input", () => {
  clearTimeout(marketSearchTimer);
  const generation=++marketSearchGeneration;
  const query = marketEl.search.value.trim();
  if(query.length < 2) {
    marketEl.searchResults.innerHTML = "";
    return;
  }
  marketSearchTimer = setTimeout(() => searchMarket(query,generation), 350);
});

async function searchMarket(query,generation=++marketSearchGeneration) {
  try {
    marketEl.searchResults.innerHTML = `<div class="marketSearchResult">Searching...</div>`;
    const results = await bridgeCall("search", {query});
    if(generation!==marketSearchGeneration)return;
    marketEl.searchResults.innerHTML = results.slice(0, 80).map(item => `
      <button class="marketSearchResult" data-item-id="${item.itemId}">
        <span><strong>${escapeHtml(item.name)}</strong><small>Item ${item.itemId}</small></span>
        <small>${fmtSilver(item.currentPrice)}</small><small>${fmtInt(item.stock)} listed</small>
      </button>`).join("") || `<div class="marketSearchResult">No matching market items.</div>`;
  } catch(error) {
    if(generation!==marketSearchGeneration)return;
    marketEl.searchResults.innerHTML = `<div class="marketSearchResult negative">${escapeHtml(error.message)}</div>`;
  }
}

marketEl.searchResults.addEventListener("click", async event => {
  const button = event.target.closest("[data-item-id]");
  if(!button) return;
  const generation=++marketSearchGeneration;
  try {
    setMarketStatus("Loading item options...");
    const variants = await bridgeCall("getVariants", {itemId:Number(button.dataset.itemId)});
    if(generation!==marketSearchGeneration)return;
    marketEl.searchResults.innerHTML = variants.map(item => `
      <button class="marketSearchResult" data-add-item='${escapeHtml(JSON.stringify(item))}'>
        <span><strong>${escapeHtml(enhancedName(item))}</strong><small>Click to track</small></span>
        <small>${fmtSilver(item.currentPrice)}</small><small>${fmtInt(item.tradeCount)} lifetime sales</small>
      </button>`).join("");
  } catch(error) {
    setMarketStatus(error.message, true);
  }
});

marketEl.searchResults.addEventListener("click", async event => {
  const button = event.target.closest("[data-add-item]");
  if(!button) return;
  try {
    const item = JSON.parse(button.dataset.addItem);
    setMarketStatus(`Adding ${enhancedName(item)}...`);
    marketState.items = await bridgeCall("addTracked", item);
    marketEl.search.value = "";
    marketEl.searchResults.innerHTML = "";
    renderTrackedItems();
    selectTrackedItem(marketState.items.find(x => x.itemId === item.itemId && x.enhancement === item.enhancement));
    setMarketStatus("Item added and initial snapshot stored.");
  } catch(error) {
    setMarketStatus(error.message, true);
  }
});

function enhancedName(item) {
  return item.enhancement > 0 ? `${item.name} +${item.enhancement}` : item.name;
}

function renderTrackedItems() {
  const filter = norm(marketEl.trackedFilter.value);
  const sort = marketEl.trackedSort.value;
  let items = marketState.items.filter(item => !filter || norm(enhancedName(item)).includes(filter));
  items = [...items].sort((a,b) => {
    if(sort === "priceDesc") return (b.lastPrice || 0) - (a.lastPrice || 0);
    if(sort === "updated") return String(b.lastUpdatedUtc || "").localeCompare(String(a.lastUpdatedUtc || ""));
    return enhancedName(a).localeCompare(enhancedName(b));
  });
  marketEl.trackedCount.textContent = String(marketState.items.length);
  marketEl.trackedItems.innerHTML = items.map(item => `
    <button class="trackedItem ${marketState.selected?.itemId === item.itemId && marketState.selected?.enhancement === item.enhancement ? "active" : ""}"
      data-tracked-id="${item.itemId}" data-enhancement="${item.enhancement}">
      <strong>${escapeHtml(enhancedName(item))}</strong>
      <span>${fmtSilver(item.lastPrice)} | ${item.lastUpdatedUtc ? new Date(item.lastUpdatedUtc).toLocaleString() : "Not updated"}</span>
    </button>`).join("") || `<div class="marketEmpty" style="min-height:180px">No tracked items match.</div>`;
}

marketEl.trackedFilter.addEventListener("input", renderTrackedItems);
marketEl.trackedSort.addEventListener("change", renderTrackedItems);
marketEl.trackedItems.addEventListener("click", event => {
  const button = event.target.closest("[data-tracked-id]");
  if(!button) return;
  selectTrackedItem(marketState.items.find(item =>
    item.itemId === Number(button.dataset.trackedId) && item.enhancement === Number(button.dataset.enhancement)));
});

function selectTrackedItem(item) {
  if(!item) return;
  marketState.selected = item;
  renderTrackedItems();
  loadAnalytics();
}

async function loadAnalytics() {
  if(!marketState.selected) return;
  try {
    setMarketStatus("Loading item analytics...");
    marketState.analytics = await bridgeCall("getAnalytics", {
      itemId:marketState.selected.itemId,
      enhancement:marketState.selected.enhancement,
      region:getMarketRegion(),
      days:Number(marketEl.range.value)
    });
    renderAnalytics();
    setMarketStatus("Ready");
  } catch(error) {
    setMarketStatus(error.message, true);
  }
}

function renderAnalytics() {
  const data = marketState.analytics;
  if(!data) return clearMarketDetail();
  marketEl.empty.hidden = true;
  marketEl.detail.hidden = false;
  marketEl.detailName.textContent = enhancedName(data.item);
  marketEl.detailMeta.textContent =
    `${data.item.region.toUpperCase()} | Item ${data.item.itemId} | Last update ${data.item.lastUpdatedUtc ? new Date(data.item.lastUpdatedUtc).toLocaleString() : "pending"}`;
  marketEl.current.textContent = fmtSilver(data.currentPrice);
  marketEl.min.textContent = fmtSilver(data.minimumPrice);
  marketEl.max.textContent = fmtSilver(data.maximumPrice);
  marketEl.average.textContent = fmtSilver(data.averagePrice);
  marketEl.trend.textContent = data.trendPercent == null ? "Building history" : `${data.trendPercent >= 0 ? "+" : ""}${data.trendPercent.toFixed(2)}%`;
  marketEl.trend.className = data.trendPercent == null ? "" : data.trendPercent >= 0 ? "positive" : "negative";
  marketEl.salesGrid.innerHTML = data.sales.map(window => `
    <div class="marketMetric">
      <span>Sales: ${escapeHtml(window.label)}</span>
      <strong>${window.complete ? fmtInt(window.sales) : "Building history"}</strong>
      <small class="confidence">${window.complete ? `${window.coverageHours.toFixed(0)}h local coverage` : `${window.coverageHours.toFixed(0)}h collected`}</small>
    </div>`).join("");
  drawLineChart(marketEl.priceChart, data.points.map(point => ({time:new Date(point.timestamp), value:point.price})), fmtSilver);
  const salesPoints = [];
  const tradePoints = data.points.filter(point => point.tradeCount != null);
  for(let i=1; i<tradePoints.length; i++) {
    salesPoints.push({
      time:new Date(tradePoints[i].timestamp),
      value:Math.max(0, tradePoints[i].tradeCount - tradePoints[i-1].tradeCount)
    });
  }
  drawLineChart(marketEl.salesChart, salesPoints, value => fmtInt(value));
}

function clearMarketDetail() {
  marketState.selected = null;
  marketState.analytics = null;
  marketEl.empty.hidden = false;
  marketEl.detail.hidden = true;
  renderTrackedItems();
}

marketEl.range.addEventListener("change", loadAnalytics);
marketEl.remove.addEventListener("click", async () => {
  if(!marketState.selected) return;
  try {
    marketState.items = await bridgeCall("removeTracked", {
      itemId:marketState.selected.itemId,
      enhancement:marketState.selected.enhancement
    });
    clearMarketDetail();
    setMarketStatus("Item removed from tracking. Existing history remains available in CSV exports.");
  } catch(error) {
    setMarketStatus(error.message, true);
  }
});

async function loadMarketRegionState(region = getMarketRegion(), updateStatus = true) {
  try {
    const selectedRegion = "eu";
    const requestNumber = ++marketState.outfitRequestNumber;
    const state = await bridgeCall("getRegionState", { region:selectedRegion });
    if(requestNumber !== marketState.outfitRequestNumber || getMarketRegion() !== selectedRegion) return;
    marketState.items = state.items || [];
    marketState.outfits = state.outfits || null;
    clearMarketDetail();
    renderTrackedItems();
    renderOutfitReport();
    if(updateStatus) setMarketStatus(outfitSalesStatusMessage(state.outfits, selectedRegion));
  } catch(error) {
    setMarketStatus(error.message, true);
  }
}

marketEl.regionButtons.forEach(button => {
  button.addEventListener("click", async () => {
    const nextRegion = button.dataset.marketRegion || "eu";
    if(getMarketRegion() === nextRegion) return;
    const panels = marketRegionPanels();
    try {
      panels.forEach(panel => panel.classList.add("marketRegionFading"));
      await waitForMarketFade();
      setMarketRegion(nextRegion);
      await loadMarketRegionState(nextRegion);
    } finally {
      requestAnimationFrame(() => panels.forEach(panel => panel.classList.remove("marketRegionFading")));
    }
  });
});
marketEl.export.addEventListener("click", async () => {
  try {
    const result = await bridgeCall("exportCsv");
    setMarketStatus(result.cancelled ? "Export cancelled." : `CSV exported to ${result.path}`);
  } catch(error) {
    setMarketStatus(error.message, true);
  }
});

async function loadOutfitReport() {
  if(!marketState.initialized) return;
  const selectedRegion = getMarketRegion();
  const requestNumber = ++marketState.outfitRequestNumber;
  try {
    const report = await bridgeCall("getOutfitReport", { region:selectedRegion });
    if(requestNumber !== marketState.outfitRequestNumber || getMarketRegion() !== selectedRegion) return;
    marketState.outfits = report;
    renderOutfitReport();
  } catch(error) {
    if(requestNumber !== marketState.outfitRequestNumber) return;
    marketEl.outfitCoverage.textContent = error.message;
  }
}

function formatMarketSampleTime(value) {
  const timestamp = Date.parse(value || "");
  if(!Number.isFinite(timestamp)) return "time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    year:"numeric",
    month:"short",
    day:"numeric",
    hour:"numeric",
    minute:"2-digit"
  }).format(new Date(timestamp));
}

function staleOutfitSalesSummary(report) {
  const staleItems = Array.isArray(report?.opportunities)
    ? report.opportunities.filter(item => item?.salesDataStale === true)
    : [];
  const timestamps = staleItems
    .map(item => Date.parse(item.lastSalesSampleUtc || ""))
    .filter(Number.isFinite)
    .sort((a,b) => a - b);
  const count = Number.isFinite(Number(report?.staleSalesOutfitCount))
    ? Number(report.staleSalesOutfitCount)
    : staleItems.length;
  if(count <= 0) return null;
  if(!timestamps.length) return { count, updatedLabel:"time unavailable" };
  const first = formatMarketSampleTime(new Date(timestamps[0]).toISOString());
  const last = formatMarketSampleTime(new Date(timestamps[timestamps.length - 1]).toISOString());
  return { count, updatedLabel:first === last ? first : `${first} – ${last}` };
}

function outfitSalesStatusMessage(report, region = getMarketRegion()) {
  const regionLabel = String(region || "eu").toUpperCase();
  const stale = staleOutfitSalesSummary(report);
  if(stale) {
    return `${regionLabel} cached sales loaded for ${fmtInt(stale.count)} outfits. Last successful samples: ${stale.updatedLabel}.`;
  }
  if(report?.lastSalesSampleUtc) {
    return `${regionLabel} sales loaded. Updated ${formatMarketSampleTime(report.lastSalesSampleUtc)}.`;
  }
  return `${regionLabel} catalog loaded. No sales samples are available yet.`;
}

function outfitSalesCacheMeta(item) {
  if(item?.salesDataStale !== true) return null;
  const updated = formatMarketSampleTime(item.lastSalesSampleUtc);
  return {
    label:`Cached sales · updated ${updated}`,
    title:`Cached historical sales. Last successful sample: ${updated}.`
  };
}

function outfitSalesValue(item, value, windowClass) {
  if(value == null) return "-";
  const cached = outfitSalesCacheMeta(item);
  const classes = `outfitSalesValue ${windowClass}${cached ? " cachedSalesValue" : ""}`;
  const title = cached ? ` title="${escapeHtml(cached.title)}"` : "";
  return `<span class="${classes}"${title}>${fmtInt(value)}</span>`;
}

/* OUTFIT_RECOMMENDATION_CORE_BEGIN */
function outfitTopRecommendations(report, limit = 3) {
  const requested = Math.max(0, Math.floor(Number(limit) || 0));
  if(!requested) return [];
  const authoritative = Array.isArray(report?.topOpportunities) ? report.topOpportunities : [];
  const available = Array.isArray(report?.opportunities) ? report.opportunities : [];
  const seen = new Set();
  return authoritative.concat(available).filter(item => {
    const itemId = Number(item?.itemId);
    if(!item || itemId <= 0 || Number(item.price) <= 0 || !String(item.name || "").trim() || seen.has(itemId)) return false;
    seen.add(itemId);
    return true;
  }).slice(0, requested);
}

function outfitRecommendationTier(item) {
  if(item?.recommendationEligible === true) return "verified";
  if(item?.salesSignalEligible === true) return "sales-watch";
  return "early-watch";
}
/* OUTFIT_RECOMMENDATION_CORE_END */

function renderOutfitReport() {
  const report = marketState.outfits;
  if(!report) return;
  const selectedRegionLabel = getMarketRegion().toUpperCase();
  marketEl.outfitCoverage.textContent =
    `${fmtInt(report.catalogCount)} outfits discovered | ${fmtInt(report.detailedCount)} checked at least once | ${report.coveragePercent.toFixed(1)}% catalog coverage`;
  const filter = norm(marketEl.outfitFilter.value)
    .replace(/\bberzerker\b/g, "berserker")
    .replace(/\bzerker\b/g, "berserker");
  const filtered = report.opportunities.filter(item => !filter || norm(item.name).includes(filter));
  const topThree = outfitTopRecommendations(report, 3);
  marketEl.topOutfitCards.innerHTML = topThree.map((item,index) => {
    const tier = outfitRecommendationTier(item);
    const cached = outfitSalesCacheMeta(item);
    const detailChecked = item.lastDetailedUtc
      ? formatMarketSampleTime(item.lastDetailedUtc)
      : null;
    const rankLabel = tier === "verified"
      ? `Verified recommendation #${index + 1}`
      : tier === "sales-watch"
        ? `Sales watch #${index + 1}`
        : `Early market watch #${index + 1}`;
    const signal = tier === "verified"
      ? "Strong current preorder signal"
      : tier === "sales-watch"
        ? item.preorderDataFresh === true
          ? "Strong recent sales — no active preorder queue"
          : "Strong recent sales — preorder queue not recently verified"
        : cached
          ? `Best available ${selectedRegionLabel} signal — cached sales refresh pending`
          : `Best available ${selectedRegionLabel} signal — building more evidence`;
    const preorderLabel = item.preorderDataFresh === true
      ? "Preorders"
      : detailChecked ? "Older preorder snapshot" : "Preorder scan";
    const preorderValue = item.preorderDataFresh === true
      ? (item.preorderCount == null ? "Scanning" : fmtInt(item.preorderCount))
      : detailChecked
        ? `${item.preorderCount == null ? "Unavailable" : `${fmtInt(item.preorderCount)} recorded`} · checked ${detailChecked}`
        : "Not scanned yet";
    const queueLabel = tier === "verified" ? "Queue estimate" : "Queue status";
    const queueValue = tier === "verified"
      ? (item.estimatedQueueDays == null ? "-" : item.estimatedQueueDays < 1 ? "< 1 day" : `${item.estimatedQueueDays.toFixed(1)} days`)
      : tier === "sales-watch"
        ? item.preorderDataFresh === true ? "No active queue" : "Refresh needed"
        : cached ? "Sales refresh pending" : "More history needed";
    return `<article class="mustOrderCard" role="listitem" data-opportunity-tier="${tier}">
      <div class="mustOrderRank">${rankLabel}</div>
      <h3>${escapeHtml(item.name)}</h3>
      <div class="mustOrderStats">
        <span>Recommendation<strong>${signal}</strong></span>
        <span>Price<strong>${fmtSilver(item.price)}</strong></span>
        <span>24h / 3d / 7d<strong>${outfitSalesValue(item,item.sales24Hours,"salesWindow24h")} / ${outfitSalesValue(item,item.sales3Days,"salesWindow3d")} / ${outfitSalesValue(item,item.sales7Days,"salesWindow7d")}</strong></span>
        <span>${preorderLabel}<strong>${preorderValue}</strong></span>
        <span>${queueLabel}<strong>${queueValue}</strong></span>
      </div>
    </article>`;
  }).join("") || `<div class="mustOrderCard" role="listitem">
    <strong>Building the first three outfit opportunities</strong>
    <span class="confidence">Central Market history is still being collected. The strongest three available signals will appear automatically.</span>
  </div>`;
  const rows = filtered.slice(0, 500);
  marketEl.outfitRows.innerHTML = rows.map((item,index) => {
    const cached = outfitSalesCacheMeta(item);
    const queue = item.estimatedQueueDays == null ? "-" :
      item.estimatedQueueDays < 1 ? "< 1d" : `${item.estimatedQueueDays.toFixed(1)}d`;
    const momentum = item.demandMomentumPercent == null ? "" :
      `<span class="confidence">${item.demandMomentumPercent >= 0 ? "+" : ""}${item.demandMomentumPercent.toFixed(0)}% recent momentum</span>`;
    const cacheNote = cached
      ? `<span class="outfitCacheNote" title="${escapeHtml(cached.title)}">${escapeHtml(cached.label)}</span>`
      : "";
    return `<tr${cached ? ` class="salesDataStale"` : ""}>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(item.name)}</strong><span class="confidence">Item ${item.itemId}</span>${cacheNote}</td>
      <td class="right mono">${outfitSalesValue(item,item.sales24Hours,"salesWindow24h")}</td>
      <td class="right mono">${outfitSalesValue(item,item.sales3Days,"salesWindow3d")}</td>
      <td class="right mono">${outfitSalesValue(item,item.sales7Days,"salesWindow7d")}</td>
      <td class="right mono">${item.preorderCount == null ? "-" : fmtInt(item.preorderCount)}</td>
      <td class="right mono">${queue}${momentum}</td>
      <td class="right mono">${fmtSilver(item.price)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="8">No outfits match this filter.</td></tr>`;
}

marketEl.outfitFilter.addEventListener("input", renderOutfitReport);

function fmtSilver(value) {
  if(value == null || !Number.isFinite(Number(value))) return "-";
  const number = Number(value);
  if(number >= 1e9) return `${(number / 1e9).toFixed(2)}b`;
  if(number >= 1e6) return `${(number / 1e6).toFixed(2)}m`;
  if(number >= 1e3) return `${(number / 1e3).toFixed(1)}k`;
  return Math.round(number).toLocaleString();
}

function drawLineChart(canvas, points, valueFormatter) {
  const parent = canvas.parentElement;
  const tooltip = parent.querySelector(".graphTooltip");
  const width = Math.max(320, Math.floor(canvas.clientWidth));
  const height = 230;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  const style = getComputedStyle(document.body);
  const muted = style.getPropertyValue("--muted").trim();
  const line = style.getPropertyValue("--a1").trim();
  const grid = style.getPropertyValue("--border").trim();
  const plot = {left:48, top:14, right:width - 12, bottom:height - 28};

  ctx.strokeStyle = grid;
  ctx.fillStyle = muted;
  ctx.font = "10px Inter";
  for(let i=0; i<=4; i++) {
    const y = plot.top + (plot.bottom - plot.top) * i / 4;
    ctx.beginPath(); ctx.moveTo(plot.left, y); ctx.lineTo(plot.right, y); ctx.stroke();
  }
  if(!points.length) {
    ctx.fillText("History will appear after snapshots are collected.", plot.left, height / 2);
    canvas.onmousemove = null;
    tooltip.style.display = "none";
    return;
  }

  const values = points.map(x => Number(x.value));
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if(minValue === maxValue) { minValue *= .98; maxValue *= 1.02; }
  const minTime = points[0].time.getTime();
  const maxTime = points[points.length - 1].time.getTime();
  const mapped = points.map((point,index) => ({
    ...point,
    x:plot.left + (plot.right - plot.left) * (maxTime === minTime ? index / Math.max(1, points.length - 1) : (point.time.getTime() - minTime) / (maxTime - minTime)),
    y:plot.bottom - (plot.bottom - plot.top) * (Number(point.value) - minValue) / Math.max(1, maxValue - minValue)
  }));
  ctx.fillText(valueFormatter(maxValue), 2, plot.top + 4);
  ctx.fillText(valueFormatter(minValue), 2, plot.bottom);
  ctx.fillText(points[0].time.toLocaleDateString(), plot.left, height - 8);
  const endLabel = points[points.length - 1].time.toLocaleDateString();
  ctx.fillText(endLabel, plot.right - ctx.measureText(endLabel).width, height - 8);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  mapped.forEach((point,index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke();

  canvas.onmousemove = event => {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const nearest = mapped.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
    tooltip.style.display = "block";
    tooltip.style.left = `${Math.min(width - 150, Math.max(6, nearest.x + 8))}px`;
    tooltip.style.top = `${Math.max(6, nearest.y - 42)}px`;
    tooltip.textContent = `${nearest.time.toLocaleString()} | ${valueFormatter(nearest.value)}`;
  };
  canvas.onmouseleave = () => tooltip.style.display = "none";
}

window.addEventListener("resize", () => {
  if(marketState.analytics) renderAnalytics();
});

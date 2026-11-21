// ============================================================================
// 《深空当铺：可能是偷的》2.0 深度完全版数据库
// 深度还原 BWIKI 原版体系：五类密封物资箱+钥匙卡、暗区突围式套包扩容容器、
// 刮刮乐&液体好运、电话通讯录批发供货商、50+道具与30+特色顾客原型
// ============================================================================

export const FACTIONS = {
  lower: {
    id: 'lower',
    name: '下层街区',
    short: '下层区',
    color: '#94a3b8',
    desc: '拾荒客、星际客、矿工与修理工。声望≥40进货享15%邻里折扣，垃圾场拾荒额外收获。',
    perkThreshold: 40,
    perkDesc: '声望≥40：下层卖家要价 -15%，夜间垃圾场额外翻出物资'
  },
  security: {
    id: 'security',
    name: '空间站治安部',
    short: '治安部',
    color: '#ef4444',
    desc: '伦警官与盘查员所属执法部门。声望≥40吸引治安部征用官高价采购食品医药，贿赂减半。',
    perkThreshold: 40,
    perkDesc: '声望≥40：贿赂费减半，击毙改造体赏金 +25%，吸引征用官大额采购'
  },
  blackmarket: {
    id: 'blackmarket',
    name: '第13区黑市',
    short: '黑市',
    color: '#c084fc',
    desc: '小偷、可疑商人与索耶地下交易所。声望≥40小偷高概率带密封物资箱与钥匙卡上门！',
    perkThreshold: 40,
    perkDesc: '声望≥40：小偷高概率携带五类密封物资箱，可疑商人收购价 +20%'
  },
  rebel: {
    id: 'rebel',
    name: '深空革命军',
    short: '革命军',
    color: '#22c55e',
    desc: '卢、奥丁与游击队。急需军火、物资箱与医疗品，声望≥40军需官高价整批扫货。',
    perkThreshold: 40,
    perkDesc: '声望≥40：革命军收购武器/医药/物资箱溢价 +30%'
  },
  upper: {
    id: 'upper',
    name: '上层穹顶区',
    short: '上层区',
    color: '#f472b6',
    desc: '上层访客、私人厨师与医院供货商。只认高纯度美酒、肋明治真品、香水与奢华遗物。',
    perkThreshold: 40,
    perkDesc: '声望≥40：上层富豪预算翻倍，奢侈品与佳酿溢价 +35%'
  }
};

export const PROFESSIONS = [
  {
    id: 'apprentice',
    name: '底层学徒',
    subtitle: '均衡开局 · 鉴伪专精',
    icon: '🔍',
    color: '#38bdf8',
    credits: 700,
    energy: 110,
    luck: 10,
    desc: '导师留下的放大镜、腰包与全套鉴伪笔记。揭穿假货压价狠，适合体验完整交易与开箱乐趣。',
    perks: ['初始 700 CR，自带【腰包(占1扩4)】扩容容器', '揭穿假货压价额外 +10%', '自带1张后勤钥匙卡与1个后勤物资箱'],
    startingMachines: [],
    startingLicenses: ['general'],
    startingItems: ['fanny_pack', 'crate_service', 'keycard_service', 'cig_hemingway', 'rib_sandwich'],
    repMod: { lower: 15, security: 10, blackmarket: 5, rebel: 5, upper: 5 }
  },
  {
    id: 'water_merchant',
    name: '净水商人',
    subtitle: '水质提纯 · 民生暴利',
    icon: '💧',
    color: '#06b6d4',
    credits: 520,
    energy: 130,
    luck: 5,
    desc: '开局坐拥工业净水器与水质光谱仪。把廉价浑浊回收水提纯为瓶装泉水，停水日赚得盆满钵满。',
    perks: ['自带【工业净水器】与【全频光谱仪】', '自带【基础背包(占2扩8)】大容量套包', '水资源与饮品售价 +20%'],
    startingMachines: ['purifier'],
    startingLicenses: ['general', 'water_permit'],
    startingItems: ['backpack_basic', 'dirty_water', 'dirty_water', 'filter_core', 'kotton_fabric'],
    repMod: { lower: 20, security: 5, blackmarket: 0, rebel: 10, upper: 5 }
  },
  {
    id: 'gunsmith',
    name: '地下枪械匠',
    subtitle: '军火改装 · 猎杀改造体',
    icon: '🔫',
    color: '#f97316',
    credits: 500,
    energy: 110,
    luck: 5,
    desc: '靠修复铁匠10手枪与组装脉冲步枪暴富。开局认识军火电话渠道，自带AI改造体扫描仪。',
    perks: ['自带【军火改装台】、【一级军火许可】与【AI扫描仪】', '自带【枪匠储物箱(占2扩9)】', '武器、弹药与零件售价 +20%'],
    startingMachines: ['workbench'],
    startingLicenses: ['general', 'arms_1'],
    startingItems: ['bay_gunsmith', 'broken_pistol', 'scrap_metal', 'ammo_10mm', 'energy_cell'],
    repMod: { lower: 5, security: 5, blackmarket: 15, rebel: 20, upper: 0 }
  },
  {
    id: 'chemist',
    name: '合成化学家',
    subtitle: '制药酿酒 · 化学提纯',
    icon: '🧪',
    color: '#a855f7',
    credits: 520,
    energy: 120,
    luck: 8,
    desc: '调配免疫宁、努特加烈酒、星云紫酒甚至违禁“梦魇尘”。自带化学储物箱与医药许可。',
    perks: ['自带【化学合成蒸馏釜】与【医药制剂许可】', '自带【化学家储物箱(占2扩9)】', '药剂、香水与酒类售价 +20%'],
    startingMachines: ['synthesizer'],
    startingLicenses: ['general', 'med_permit'],
    startingItems: ['bay_chemist', 'bio_moss', 'industrial_alcohol', 'chem_common', 'immuno_med'],
    repMod: { lower: 10, security: 0, blackmarket: 20, rebel: 5, upper: 15 }
  },
  {
    id: 'fence',
    name: '暗巷销赃人',
    subtitle: '开箱狂魔 · 伪装套包',
    icon: '🎭',
    color: '#ec4899',
    credits: 580,
    energy: 100,
    luck: 18,
    desc: '与小偷、奥丁和地下交易所称兄道弟。自带防治安盘查的【走私者伪装箱】与解码打磨仪！',
    perks: ['自带【走私者伪装箱(占2扩8·免检隐蔽!)】', '自带【量子序列号打磨仪】与治安部物证柜+钥匙卡', '收购赃物压价 +20%，初始幸运值 18'],
    startingMachines: ['scrambler'],
    startingLicenses: ['general'],
    startingItems: ['smuggler_bay', 'crate_evidence', 'keycard_security', 'stolen_watch', 'scratcher_ticket'],
    repMod: { lower: 5, security: -10, blackmarket: 35, rebel: 15, upper: 5 }
  },
  {
    id: 'rat_rancher',
    name: '深空驯鼠人',
    subtitle: '隐藏剧本 · 生肉暴利',
    icon: '🐀',
    color: '#84cc16',
    credits: 480,
    energy: 110,
    luck: 12,
    desc: '解锁“我们有老鼠！”隐藏流派！用廉价边角料食物投喂合成培育舱，产出上层大厨疯抢的特级生肉！',
    perks: ['自带【A/B双区生物培育舱】产肉机器', '自带【军用战术背包(占2扩10)】超大套包', '食品与生肉类交易利润 +25%'],
    startingMachines: ['rat_cage'],
    startingLicenses: ['general'],
    startingItems: ['backpack_military', 'morsel_food', 'morsel_food', 'cheese_block', 'raw_meat'],
    repMod: { lower: 20, security: 10, blackmarket: 10, rebel: 10, upper: 10 }
  }
];

// ============================================================================
// 全量物品模板库（55+ 原版风味道具：涵盖容器套包、密封物资箱、钥匙卡、彩票、肋明治等）
// slots: 在外层仓库占用的格子数
// containerCap: 若为扩容容器(isContainer:true)，点开后内部拥有的独立格子容量！（占小格扩出大空间）
// shielded: 若为 true（如走私者伪装箱），放在里面的违禁品/赃物连治安官盘查都搜不出来！
// ============================================================================
export const ITEM_TEMPLATES = {
  // -------------------- 1. 暗区突围式「扩容箱 / 套包容器」 --------------------
  fanny_pack: {
    id: 'fanny_pack', name: '战术腰包 (占1扩4)', category: 'container',
    baseValue: 65, slots: 1, isContainer: true, containerCap: 4, shielded: false,
    icon: '👝', legal: 'legal',
    desc: '【扩容容器】仅占主仓库 1 格，打开后内部可存放 4 格物品！小巧实用的新手套包神器。',
    authenticSigns: { zip: '高强度尼龙拉链顺滑', cloth: '防刮内衬完好' }, fakeSigns: []
  },
  backpack_basic: {
    id: 'backpack_basic', name: '基础行军背包 (占2扩8)', category: 'container',
    baseValue: 260, slots: 2, isContainer: true, containerCap: 8, shielded: false,
    icon: '🎒', legal: 'legal',
    desc: '【扩容容器】仅占主仓库 2 格，打开后内部足足有 8 格独立储物空间！囤货党必备。',
    authenticSigns: { zip: '双层承重肩带完好', cloth: '8格分隔仓完整' }, fakeSigns: []
  },
  backpack_military: {
    id: 'backpack_military', name: '大型军用背包 (占2扩12)', category: 'container',
    baseValue: 420, slots: 2, isContainer: true, containerCap: 12, shielded: false,
    icon: '🪖', legal: 'legal',
    desc: '【顶级扩容箱】仅占 2 格，内部展开拥有惊人的 12 格超大战术仓位！',
    authenticSigns: { zip: '军规外骨骼快拆扣', cloth: '防辐射涂层内胆' }, fakeSigns: []
  },
  bay_chemist: {
    id: 'bay_chemist', name: '化学家恒温储物箱 (占2扩10)', category: 'container',
    baseValue: 340, slots: 2, isContainer: true, containerCap: 10, shielded: false,
    icon: '🧰', legal: 'legal',
    desc: '【专业扩容箱】仅占 2 格，内部展开 10 格防震防爆仓，最适合囤积药剂、酒类与化学原料。',
    authenticSigns: { seal: '恒温气密垫圈完好' }, fakeSigns: []
  },
  bay_gunsmith: {
    id: 'bay_gunsmith', name: '枪匠重型储物箱 (占2扩10)', category: 'container',
    baseValue: 350, slots: 2, isContainer: true, containerCap: 10, shielded: false,
    icon: '🗃️', legal: 'legal',
    desc: '【专业扩容箱】仅占 2 格，内部展开 10 格武器挂架空间（注意：普通箱不防条子搜查违禁品）。',
    authenticSigns: { seal: '合金防潮卡扣完好' }, fakeSigns: []
  },
  mini_smuggler_bay: {
    id: 'mini_smuggler_bay', name: '迷你走私者伪装箱 (占1扩5·免检)', category: 'container',
    baseValue: 210, slots: 1, isContainer: true, containerCap: 5, shielded: true,
    icon: '🕵️', legal: 'legal',
    desc: '【免检伪装扩容箱】仅占 1 格，内部展开 5 格铅屏蔽暗仓！装在里面的违禁品与赃物治安官绝对搜不到！',
    authenticSigns: { shield: '双层磁屏蔽伪装夹层有效' }, fakeSigns: []
  },
  smuggler_bay: {
    id: 'smuggler_bay', name: '走私者大型伪装箱 (占2扩9·免检)', category: 'container',
    baseValue: 380, slots: 2, isContainer: true, containerCap: 9, shielded: true,
    icon: '🏴‍☠️', legal: 'legal',
    desc: '【终极免检套包】杰克逊博士秘密杰作！仅占 2 格却能展开 9 格完全防盘查的隐秘黑仓！',
    authenticSigns: { shield: '军用级全息视觉欺骗+铅屏蔽层' }, fakeSigns: []
  },

  // -------------------- 2. 原版五类「上锁密封物资箱」与「空箱」 --------------------
  crate_service: {
    id: 'crate_service', name: '后勤服务部物资箱 (密封)', category: 'crate',
    baseValue: 175, slots: 2, isSealedCrate: true, requiredKey: 'keycard_service',
    icon: '📦', legal: 'legal',
    desc: '【密封盲盒箱】需【后勤部一次性钥匙卡】或【指挥官万能卡】开启！内含滤水器、食物饮品、电池、磁带甚至微型净水器，高概率回本大赚！',
    authenticSigns: { lock: '后勤部电子铅封未拆 (绿灯闪烁)', weight: '箱体沉重，摇晃有满满物资声' },
    fakeSigns: [
      { key: 'lock', badText: '底部铰链被撬开过又用胶水粘合（里面早被掏空塞了石头！）', reason: '箱底铰链有撬痕，实为被调包的石头空箱' }
    ]
  },
  crate_medical: {
    id: 'crate_medical', name: '医疗舱物资箱 (密封)', category: 'crate',
    baseValue: 200, slots: 2, isSealedCrate: true, requiredKey: 'keycard_medical',
    icon: '🩺', legal: 'legal',
    desc: '【密封盲盒箱】需【医疗舱钥匙卡】或【指挥官卡】开启！必出正品免疫宁与能量电池，高概率爆出外科手术包、“蓝血”与管制化学品！',
    authenticSigns: { lock: '海卫一医疗生物锁完好', weight: '内部低温冷藏模块正常运转' },
    fakeSigns: [
      { key: 'weight', badText: '冷藏模块早已断电发臭，封条系伪造重贴', reason: '冷藏失效且封条伪造，内含医疗垃圾' }
    ]
  },
  crate_engineering: {
    id: 'crate_engineering', name: '工程铸造厂物资箱 (密封)', category: 'crate',
    baseValue: 200, slots: 2, isSealedCrate: true, requiredKey: 'keycard_engineering',
    icon: '⚙️', legal: 'legal',
    desc: '【密封盲盒箱】需【工程部钥匙卡】或【指挥官卡】开启！内含高能聚变电池、电子元件、等离子燃料匣，小概率爆出自充电神级电池或神经核心！',
    authenticSigns: { lock: '铸造厂重工磁力锁完好', weight: '电磁屏蔽读数饱满' },
    fakeSigns: []
  },
  crate_security: {
    id: 'crate_security', name: '治安部军备物资箱 (密封)', category: 'crate',
    baseValue: 220, slots: 2, isSealedCrate: true, requiredKey: 'keycard_security',
    icon: '🚨', legal: 'contraband',
    desc: '【高危违禁密封箱】需【治安部钥匙卡】或【指挥官卡】开启！满载手枪、10mm穿甲弹、震撼弹、脉冲防暴枪与钥匙卡！注意藏进暗格或伪装箱！',
    authenticSigns: { lock: '治安部红光防爆锁激活中', weight: '重型军械金属碰撞声' },
    fakeSigns: []
  },
  crate_evidence: {
    id: 'crate_evidence', name: '治安部罚没物证柜 (密封)', category: 'crate',
    baseValue: 210, slots: 2, isSealedCrate: true, requiredKey: 'keycard_security',
    icon: '🔐', legal: 'contraband',
    desc: '【违禁盲盒箱】需【治安部钥匙卡】或【指挥官卡】开启！里面全是条子没收的赃物：梦魇尘、费洛蒙香水、刮刮乐、钥匙卡甚至“永恒”焕活精华液（500 CR）！',
    authenticSigns: { lock: '物证封条编号清晰，磁锁紧闭', weight: '内含多件高价值罚没证物' },
    fakeSigns: []
  },
  empty_crate: {
    id: 'empty_crate', name: '拆开的空物资箱壳', category: 'material',
    baseValue: 15, slots: 1,
    icon: '📭', legal: 'legal',
    desc: '已经开启搜刮完的空合金箱壳。不再算违禁品，可低价卖给废品商/奸商，或在改装台拆解成废金属。',
    authenticSigns: { shell: '普通空铁皮箱' }, fakeSigns: []
  },

  // -------------------- 3. 一次性部门钥匙卡与趣味消耗品 --------------------
  keycard_service: {
    id: 'keycard_service', name: '一次性钥匙卡 (后勤部)', category: 'tech',
    baseValue: 55, slots: 1, icon: '🪪', legal: 'contraband',
    desc: '偷配的部门门禁卡，可解锁【后勤服务部物资箱】。注意：除空白卡外所有门禁卡均属违禁品！',
    authenticSigns: { chip: '后勤频段磁条有效' }, fakeSigns: []
  },
  keycard_medical: {
    id: 'keycard_medical', name: '一次性钥匙卡 (医疗舱)', category: 'tech',
    baseValue: 65, slots: 1, icon: '🪪', legal: 'contraband',
    desc: '可解锁高价值的【医疗舱物资箱】，也是黑市和开箱狂人高价求购的硬通货。',
    authenticSigns: { chip: '医疗舱加密扇区有效' }, fakeSigns: []
  },
  keycard_engineering: {
    id: 'keycard_engineering', name: '一次性钥匙卡 (工程部)', category: 'tech',
    baseValue: 70, slots: 1, icon: '🪪', legal: 'contraband',
    desc: '可解锁期望收益极高的【工程铸造厂物资箱】。',
    authenticSigns: { chip: '工程部高频密钥正常' }, fakeSigns: []
  },
  keycard_security: {
    id: 'keycard_security', name: '一次性钥匙卡 (治安部)', category: 'tech',
    baseValue: 80, slots: 1, icon: '🪪', legal: 'contraband',
    desc: '可解锁【治安部物资箱】或【治安部物证柜】！千万别让巡查警官在明面上看到它。',
    authenticSigns: { chip: '治安部动态口令芯片活跃' }, fakeSigns: []
  },
  keycard_command: {
    id: 'keycard_command', name: '指挥官万能最高权限卡', category: 'contraband',
    baseValue: 185, slots: 1, icon: '💳', legal: 'contraband',
    desc: '【神级万能卡】空间站最高权限密钥！可强行开启全部五种密封物资箱中的任意一种！',
    authenticSigns: { chip: '全频段最高指挥官金卡签名' }, fakeSigns: []
  },
  scratcher_ticket: {
    id: 'scratcher_ticket', name: '星环即开刮刮乐彩票', category: 'supply',
    baseValue: 25, slots: 1, isUsable: 'scratcher', icon: '🎟️', legal: 'legal',
    desc: '【可直接在库存点击刮开！】单张最高可刮出 3 个营养果斩获 400~600 CR 头奖！喝下“液体好运”后再刮中奖率暴涨！',
    authenticSigns: { coat: '银色刮奖涂层完好未透光' },
    fakeSigns: [
      { key: 'coat', badText: '涂层已被针孔窥视后重新喷银漆（必不中奖废票）', reason: '刮奖区有针孔偷看重涂痕迹，系兑过的废票' }
    ]
  },
  scratcher_pack: {
    id: 'scratcher_pack', name: '一叠刮刮乐彩票 (5张连号)', category: 'supply',
    baseValue: 110, slots: 1, isUsable: 'scratcher_pack', icon: '🎫', legal: 'legal',
    desc: '【点击一键连刮5张！】爽感拉满的五连刮奖包，冲击“头奖”成就利器！',
    authenticSigns: { coat: '彩票总局塑封连号带完好' }, fakeSigns: []
  },
  liquid_luck: {
    id: 'liquid_luck', name: '乔治奥的“液体好运”药剂', category: 'medical',
    baseValue: 160, slots: 1, isUsable: 'drink_luck', icon: '🍀', legal: 'legal',
    desc: '【点击饮用】神秘金色药水！饮用后 3 天内幸运值暴涨 +75！刮刮乐极易爆大奖、开箱必出极品、连盘查警官都可能对违禁品视而不见！',
    authenticSigns: { glow: '液体中悬浮着金色星点微光' }, fakeSigns: []
  },

  // -------------------- 4. 原版标志性鉴伪名物、食品、水资源与日用品 --------------------
  rib_sandwich: {
    id: 'rib_sandwich', name: '袋装“肋明治”收藏版', category: 'supply',
    baseValue: 155, slots: 1, icon: '🥪', legal: 'legal',
    desc: '原版最著名的鉴伪明星食品！核对包装工厂编号(1-35号)与配料表，真品收藏级肋明治上层食客抢着要！',
    authenticSigns: {
      factory: '第18号星环食品包装厂钢印清晰',
      recipe: '配料含熏制合成肋排与秘制甜辣酱',
      date: '2189年纪念版锡箔真空袋未漏气'
    },
    fakeSigns: [
      { key: 'factory', badText: '印着根本不存在的“第49号包装厂”（原版仅1~35号厂！）', reason: '包装工厂编号为虚构的49号厂，系山寨假肋明治' },
      { key: 'recipe', badText: '配料表第一项写着“锯末蛋白与鼠肉边角料”', reason: '配料成分造假，实为廉价鼠肉仿制品' }
    ]
  },
  plasma_cartridge: {
    id: 'plasma_cartridge', name: '高能等离子燃料匣', category: 'tech',
    baseValue: 300, slots: 1, icon: '🧪', legal: 'permit_arms',
    desc: '原版高单价硬通货！按外壳状态、高纯度蓝色等离子体与原厂封印估值，工程师与军需官最爱。',
    authenticSigns: {
      seal: '重工磁约束铅封完好无损',
      plasma: '观察窗呈高纯度亮钴蓝色电弧',
      casing: '耐高温钨钢外壳无跌落凹痕'
    },
    fakeSigns: [
      { key: 'plasma', badText: '观察窗内呈暗淡浑浊黄色（残次低纯度废气）', reason: '内部等离子纯度极低，系充入惰性气体的假燃料匣' },
      { key: 'seal', badText: '原厂磁封条断裂，用绝缘胶带缠绕伪装', reason: '厂商安全封印破损泄压' }
    ]
  },
  dirty_water: {
    id: 'dirty_water', name: '浑浊回收水桶 (4L)', category: 'material',
    baseValue: 26, slots: 1, icon: '🚱', legal: 'legal',
    desc: '冷凝管收集的未经处理水源，需配合滤芯或韧棉织物净化。',
    authenticSigns: { seal: '冷凝站塑封盖', clarity: '轻度浑浊 (纯度 55%)', rads: '辐射 15 mSv' },
    fakeSigns: [
      { key: 'rads', badText: '盖革计数器狂响 (450 mSv 反应堆冷却废水!)', reason: '实为高辐射工业废液' }
    ]
  },
  pure_water: {
    id: 'pure_water', name: '99.9% 密封净水配给包', category: 'supply',
    baseValue: 85, slots: 1, icon: '💧', legal: 'legal',
    desc: '经过反渗透提纯的洁净饮用水，空间站底层硬通货。',
    authenticSigns: { seal: '蓝环防伪热缩膜完好', clarity: '晶莹剔透 (纯度 99.9%)', rads: '零辐射 (0 mSv)' },
    fakeSigns: [
      { key: 'seal', badText: '热缩膜有吹风机二次加热皱褶', reason: '封口二次封装，系生水假冒纯净水' }
    ]
  },
  spring_water: {
    id: 'spring_water', name: '阿尔卑斯瓶装天然泉水', category: 'luxury',
    baseValue: 325, slots: 1, icon: '🍾', legal: 'legal',
    desc: '只在物证柜或上层渠道流出的极品矿泉水，富豪与游客一掷千金。',
    authenticSigns: { seal: '冰川全息铂金瓶盖', clarity: '天然矿物质光谱完美' },
    fakeSigns: [
      { key: 'clarity', badText: '实测为毫无矿物质的普通蒸馏水灌装', reason: '系回收空瓶灌装普通纯水伪造天价泉水' }
    ]
  },
  cig_hemingway: {
    id: 'cig_hemingway', name: '“海明威”特醇香烟', category: 'supply',
    baseValue: 80, slots: 1, icon: '🚬', legal: 'legal',
    desc: '空间站畅销烟草，假烟贩子最爱仿造的重灾区商品。',
    authenticSigns: { stamp: '贸易署变色全息税标', print: 'HEMINGWAY 凹凸烫金字样', smell: '醇厚烟草焦香' },
    fakeSigns: [
      { key: 'print', badText: '字母印成了“HEMINGWEY”，字体模糊重影', reason: '外盒品牌英文拼写错误，系地下印刷假烟' },
      { key: 'stamp', badText: '税标是死板的彩色贴纸，一抠就掉', reason: '防伪税标系廉价贴纸伪造' }
    ]
  },
  red_imp_beer: {
    id: 'red_imp_beer', name: '“红魔鬼”精酿啤酒', category: 'supply',
    baseValue: 38, slots: 1, icon: '🍺', legal: 'legal',
    desc: '矿工下班最爱的麦芽合成啤酒，批量走量极快。',
    authenticSigns: { cap: '红魔鬼锯齿铁盖未撬动', foam: '琥珀色酒液清亮' }, fakeSigns: []
  },
  nudka_vodka: {
    id: 'nudka_vodka', name: '“努特加”深空烈性伏特加', category: 'luxury',
    baseValue: 95, slots: 1, icon: '🍶', legal: 'legal',
    desc: '高度蒸馏烈酒，星际客与上层寻欢客都爱买。',
    authenticSigns: { methanol: '甲醇残留 0.00%', seal: '铅封红星瓶口' },
    fakeSigns: [
      { key: 'methanol', badText: '工业甲醇超标 5.2%（喝了会瞎眼！）', reason: '工业酒精直接兑水勾兑的毒酒' }
    ]
  },
  synth_wine: {
    id: 'synth_wine', name: '星云陈酿合成紫酒', category: 'luxury',
    baseValue: 190, slots: 1, icon: '🍷', legal: 'legal',
    desc: '用荧光苔藓酿造的珍品陈年美酒，上层区宴会标配。',
    authenticSigns: { clarity: '紫宝石挂杯绵密', cork: '星环酒庄烙印木塞' },
    fakeSigns: [
      { key: 'cork', badText: '塑料塞配劣质色素糖水', reason: '色素糖水勾兑的假紫酒' }
    ]
  },
  morsel_food: {
    id: 'morsel_food', name: '高能压缩口粮砖', category: 'supply',
    baseValue: 35, slots: 1, icon: '🥫', legal: 'legal',
    desc: '虽然难吃但热量扎实，既可卖给饥饿居民，也是培育舱喂鼠的绝佳饲料。',
    authenticSigns: { seal: '真空铝膜完好' }, fakeSigns: []
  },
  cheese_block: {
    id: 'cheese_block', name: '合成切达奶酪块', category: 'supply',
    baseValue: 28, slots: 1, icon: '🧀', legal: 'legal',
    desc: '后勤箱常见食品，培育舱老鼠最爱的催肥美食。',
    authenticSigns: { smell: '浓郁奶酪咸香' }, fakeSigns: []
  },
  ice_cream: {
    id: 'ice_cream', name: '贝氏优质香草冰淇淋', category: 'supply',
    baseValue: 52, slots: 1, icon: '🍨', legal: 'legal',
    desc: '自带微型冷媒杯的甜品，游客与家长顾客很喜欢买。',
    authenticSigns: { cold: '自冷杯处于零下12度未融化' }, fakeSigns: []
  },
  raw_meat: {
    id: 'raw_meat', name: '特级冷鲜合成生肉', category: 'luxury',
    baseValue: 160, slots: 1, icon: '🥩', legal: 'legal',
    desc: '在下层区堪比黄金的真肉排！上层区私人厨师与粮站供应商高价疯抢！',
    authenticSigns: { texture: '大理石雪花纹理鲜亮，检疫合格', temp: '真空锁鲜冰袋完好' },
    fakeSigns: [
      { key: 'texture', badText: '肉质发绿粘手，散发腐败氨水味（病死鼠肉染色）', reason: '变质腐肉经亚硝酸盐染色伪装鲜肉' }
    ]
  },
  food_stamp: {
    id: 'food_stamp', name: '福利署配给食品券', category: 'supply',
    baseValue: 60, slots: 1, icon: '💴', legal: 'legal',
    desc: '底层救济代币券，必须用放大镜严查水印，假券泛滥！',
    authenticSigns: { watermark: '透光可见立体麦穗水印与微缩文字', paper: '特种纤维钞纸手感粗糙' },
    fakeSigns: [
      { key: 'watermark', badText: '透光毫无水印，麦穗是用淡黄墨水直接画上去的', reason: '无防伪水印，系普通打印纸伪造假食品券' }
    ]
  },
  cassette_tape: {
    id: 'cassette_tape', name: '复古合成波音乐磁带', category: 'luxury',
    baseValue: 75, slots: 1, icon: '📼', legal: 'legal',
    desc: '旧地球流传下来的磁带录音，收藏客与补给员钟爱的小玩意。',
    authenticSigns: { tape: '磁带棕黑顺滑未绞带' }, fakeSigns: []
  },

  // -------------------- 5. 医疗、化学、香水与违禁致幻剂 --------------------
  bandage_med: {
    id: 'bandage_med', name: '无菌止血绷带卷', category: 'medical',
    baseValue: 32, slots: 1, icon: '🩹', legal: 'legal',
    desc: '基础外伤耗材，负伤星际客与革命军常备物资。',
    authenticSigns: { sterile: '环氧乙烷灭菌指示标呈蓝色' }, fakeSigns: []
  },
  immuno_med: {
    id: 'immuno_med', name: '“免疫宁”抗辐射注射器', category: 'medical',
    baseValue: 150, slots: 1, icon: '💉', legal: 'permit_med',
    desc: '抑制辐射病与义体排异的核心处方药。',
    authenticSigns: { liquid: '淡蔚蓝荧光药液，3秒消泡', needle: '钛合金原封无菌针头' },
    fakeSigns: [
      { key: 'liquid', badText: '蓝色食用色素沉淀分层（假药生理盐水！）', reason: '色素勾兑生理盐水假药' },
      { key: 'needle', badText: '针帽有血渍与二次插拔划痕', reason: '医疗废针管二次灌装' }
    ]
  },
  surgery_kit: {
    id: 'surgery_kit', name: '精密外科手术器械包', category: 'medical',
    baseValue: 265, slots: 2, icon: '🩺', legal: 'permit_med',
    desc: '医疗舱物资箱稀有掉落！下层医生与上层医院供货商重金求购。',
    authenticSigns: { laser: '激光手术刀与钛合金止血钳齐全' }, fakeSigns: []
  },
  perfume_sync: {
    id: 'perfume_sync', name: '“本源”费洛蒙神经香水', category: 'luxury',
    baseValue: 210, slots: 1, icon: '🧴', legal: 'legal',
    desc: '能微妙提升交谈好感度的奢华香水，上层名流最爱。',
    authenticSigns: { scent: '前调雪松后调星兰，留香持久', bottle: '水晶雾化喷头精致' },
    fakeSigns: [
      { key: 'scent', badText: '刺鼻廉价花露水混工业香精味', reason: '廉价香精兑酒精伪造大牌香水' }
    ]
  },
  eternal_serum: {
    id: 'eternal_serum', name: '“永恒”细胞焕活精华液', category: 'luxury',
    baseValue: 500, slots: 1, icon: '✨', legal: 'permit_med',
    desc: '【传说级医疗奢侈品】原版物证柜4%超稀有大奖！令上层穹顶权贵疯狂的逆龄神药！',
    authenticSigns: { gene: '端粒酶纳米金悬浮液活性 99.9%' }, fakeSigns: []
  },
  chem_common: {
    id: 'chem_common', name: '基础化学试剂组', category: 'material',
    baseValue: 42, slots: 1, icon: '🧪', legal: 'legal',
    desc: '酸碱缓冲液与有机溶剂组合，化学蒸馏釜核心原料。',
    authenticSigns: { purity: '分析纯 AR 级别封签' }, fakeSigns: []
  },
  chem_restricted: {
    id: 'chem_restricted', name: '管制高纯化学前体', category: 'contraband',
    baseValue: 135, slots: 1, icon: '☣️', legal: 'contraband',
    desc: '严禁私人流通的高活性生物碱前体，可提炼暴利违禁品或高价卖给黑市化学家。',
    authenticSigns: { purity: '高危骷髅封签完好' }, fakeSigns: []
  },
  dream_dust: {
    id: 'dream_dust', name: '一小瓶“梦魇尘”致幻剂', category: 'contraband',
    baseValue: 360, slots: 1, icon: '🔮', legal: 'contraband',
    desc: '【高危违禁品】第13区黑市与瘾君子高价疯抢的紫色晶粉，千万藏进免检走私箱！',
    authenticSigns: { crystal: '幽紫微晶折射率达标，纯度 96%' },
    fakeSigns: [
      { key: 'crystal', badText: '掺了大半瓶紫色洗衣粉颗粒', reason: '掺杂大量洗涤剂粉末的假货' }
    ]
  },
  blue_blood: {
    id: 'blue_blood', name: '“蓝血”军用战斗兴奋剂', category: 'contraband',
    baseValue: 410, slots: 1, icon: '💙', legal: 'contraband',
    desc: '【高危违禁品】短时间突破人类神经反射极限的禁药，奥丁与卡特尔雇佣兵重金收购。',
    authenticSigns: { liquid: '钴蓝色高压自注射安瓿完好' }, fakeSigns: []
  },

  // -------------------- 6. 工程材料、电子零件、电池与工具 --------------------
  scrap_metal: {
    id: 'scrap_metal', name: '高纯钛合金废料', category: 'material',
    baseValue: 36, slots: 1, icon: '🔩', legal: 'legal',
    desc: '修复武器、加固设备的基础工业板材。',
    authenticSigns: { alloy: '无磁性航空钛合金' },
    fakeSigns: [
      { key: 'alloy', badText: '磁铁强力吸附，实为刷银漆的烂生铁', reason: '镀漆生铁冒充钛合金' }
    ]
  },
  electronic_parts: {
    id: 'electronic_parts', name: '精密电子元件板', category: 'material',
    baseValue: 55, slots: 1, icon: '🔌', legal: 'legal',
    desc: '拆自高精度仪器的电路板与电容，改装脉冲武器与解码芯片必备。',
    authenticSigns: { gold: '镀金引脚无虚焊腐蚀' }, fakeSigns: []
  },
  filter_core: {
    id: 'filter_core', name: '反渗透净水滤芯', category: 'material',
    baseValue: 40, slots: 1, icon: '🧽', legal: 'legal',
    desc: '工业净水器标准耗材。',
    authenticSigns: { mesh: '纳米碳膜洁白通透' },
    fakeSigns: [
      { key: 'mesh', badText: '碳粉发黑结块，系旧滤芯水洗翻新', reason: '报废旧滤芯翻新假货' }
    ]
  },
  kotton_fabric: {
    id: 'kotton_fabric', name: '韧棉过滤织物', category: 'material',
    baseValue: 48, slots: 1, icon: '🧶', legal: 'legal',
    desc: '原版实用水处理耗材，配合净水器能大幅提升产水效率。',
    authenticSigns: { weave: '高密度超细纤维编织' }, fakeSigns: []
  },
  bio_moss: {
    id: 'bio_moss', name: '深空荧光培养苔藓', category: 'material',
    baseValue: 48, slots: 1, icon: '🌿', legal: 'legal',
    desc: '无土水培产物，酿酒与合成免疫宁的核心有机原料。',
    authenticSigns: { activity: '孢子活性 95%，幽绿微光' },
    fakeSigns: [
      { key: 'activity', badText: '枯死干草喷涂荧光漆', reason: '失活枯草涂荧光剂造假' }
    ]
  },
  industrial_alcohol: {
    id: 'industrial_alcohol', name: '精馏无水乙醇罐', category: 'material',
    baseValue: 40, slots: 1, icon: '🍶', legal: 'legal',
    desc: '酿造与化学制药的基础溶剂。',
    authenticSigns: { purity: '纯度 96% 防爆铝罐' }, fakeSigns: []
  },
  energy_cell: {
    id: 'energy_cell', name: '高密聚变电池组', category: 'tech',
    baseValue: 78, slots: 1, isUsable: 'charge_power', icon: '🔋', legal: 'legal',
    desc: '【可在库存直接点击充电 +65⚡】也可作为高需求工业品出售或合成重武器。',
    authenticSigns: { charge: '满载 24.0V 零鼓包' },
    fakeSigns: [
      { key: 'charge', badText: '内部灌沙子配纽扣电池虚标电压', reason: '内部灌沙虚标电量假电池' }
    ]
  },
  self_charging_cell: {
    id: 'self_charging_cell', name: '自充电零点能电池', category: 'tech',
    baseValue: 400, slots: 1, icon: '⚡', legal: 'legal',
    desc: '【放在货架或背包内每晚自动为店铺免费回电 +35⚡！】工程物资箱超稀有黑科技产物！',
    authenticSigns: { core: '量子零点能自循环微核稳定发光' }, fakeSigns: []
  },
  current_converter: {
    id: 'current_converter', name: '高频电流转换器', category: 'tech',
    baseValue: 165, slots: 1, icon: '🎛️', legal: 'legal',
    desc: '工程抢手工具组件，修理工与空间站工程师愿意出高价收购。',
    authenticSigns: { coil: '纯银变压线圈完好' }, fakeSigns: []
  },
  micro_purifier: {
    id: 'micro_purifier', name: '海德拉微型净水器', category: 'tech',
    baseValue: 325, slots: 2, icon: '🚰', legal: 'legal',
    desc: '后勤箱稀有大奖！便携式高精密净水装置，水商与探险队梦寐以求的硬货。',
    authenticSigns: { pump: '微型磁力水泵压力完美' }, fakeSigns: []
  },

  // -------------------- 7. 武器、弹药、古董与任务物品 --------------------
  ammo_10mm: {
    id: 'ammo_10mm', name: '10mm 制式穿甲弹匣', category: 'weapon',
    baseValue: 72, slots: 1, icon: '🧨', legal: 'permit_arms',
    desc: '雇佣兵、奥丁与革命军日常大量消耗的弹药补给。',
    authenticSigns: { brass: '黄铜弹壳底火干燥完好' }, fakeSigns: []
  },
  combat_knife: {
    id: 'combat_knife', name: '单分子高频战术匕首', category: 'weapon',
    baseValue: 115, slots: 1, icon: '🗡️', legal: 'permit_arms',
    desc: '下层区防身利器，治安物资箱常见军品。',
    authenticSigns: { edge: '单分子锋刃寒光凛冽' }, fakeSigns: []
  },
  flashbang: {
    id: 'flashbang', name: 'M84 战术震撼弹', category: 'contraband',
    baseValue: 145, slots: 1, icon: '💣', legal: 'contraband',
    desc: '治安部管制投掷物，黑市与游击队紧俏货。',
    authenticSigns: { pin: '双保险拉环未松动' }, fakeSigns: []
  },
  broken_pistol: {
    id: 'broken_pistol', name: '卡壳的“铁匠10”手枪', category: 'weapon',
    baseValue: 92, slots: 1, icon: '🔧', legal: 'permit_arms',
    desc: '成色很差的旧手枪，在军火改装台上配废金属修复后身价翻倍。',
    authenticSigns: { barrel: '枪管未炸膛，仅复进簧断裂' },
    fakeSigns: [
      { key: 'barrel', badText: '枪管炸膛裂缝用黑泥糊住伪装', reason: '枪管已炸膛报废无法修复' }
    ]
  },
  kinetic_pistol: {
    id: 'kinetic_pistol', name: '校准“铁匠10”动能手枪', category: 'weapon',
    baseValue: 235, slots: 1, icon: '🔫', legal: 'permit_arms',
    desc: '保养精良的半自动防卫手枪，需一级军火许可方可合法摆卖。',
    authenticSigns: { barrel: '膛线锋利，击锤清脆', serial: '防卫署合法钢印' },
    fakeSigns: [
      { key: 'barrel', badText: '3D打印劣质塑料滑套，开火必碎', reason: '塑料3D打印高仿模型枪' }
    ]
  },
  pulse_stun_gun: {
    id: 'pulse_stun_gun', name: '脉冲卫士防暴电击枪', category: 'weapon',
    baseValue: 280, slots: 2, icon: '⚡', legal: 'permit_arms',
    desc: '治安部制式非致命武器，私人安保承包商高价求购。',
    authenticSigns: { arc: '双极高压电弧激发正常' }, fakeSigns: []
  },
  pulse_rifle: {
    id: 'pulse_rifle', name: '“哨兵Mk.III”军用脉冲步枪', category: 'contraband',
    baseValue: 480, slots: 2, icon: '🔫', legal: 'contraband',
    desc: '【顶级军火违禁品】重型电磁脉冲步枪！奥丁与革命军军需官愿出天价收购！',
    authenticSigns: { coil: '超导加速轨道导通率 99.8%' },
    fakeSigns: [
      { key: 'coil', badText: '内部超导线圈被拆走换成了铁丝', reason: '核心超导线圈被掏空的废壳' }
    ]
  },
  stolen_watch: {
    id: 'stolen_watch', name: '古地球陀飞轮金怀表', category: 'luxury',
    baseValue: 265, slots: 1, icon: '⌚', legal: 'legal',
    desc: '精密机械古董，常带有失主报案追踪码。',
    authenticSigns: { movement: '17钻机械擒纵轮精准跳动', case: '18K实金表壳' },
    fakeSigns: [
      { key: 'movement', badText: '掀开底盖里面是2块钱电子石英芯', reason: '廉价电子表芯冒充古董机械表' }
    ]
  },
  cyber_arm: {
    id: 'cyber_arm', name: '军规液压义体手臂', category: 'tech',
    baseValue: 345, slots: 2, icon: '🦾', legal: 'permit_arms',
    desc: '大推力机械义肢，工业与安保热门硬货。',
    authenticSigns: { neuro: '神经接驳金手指完好无烧蚀' },
    fakeSigns: [
      { key: 'neuro', badText: '神经芯片已过载烧黑报废', reason: '神经接口烧毁的死人拆车件' }
    ]
  },
  credit_chip_locked: {
    id: 'credit_chip_locked', name: '加密黑金信用芯片', category: 'contraband',
    baseValue: 175, slots: 1, icon: '💾', legal: 'contraband',
    desc: '劫案流出的死账芯片，用解码仪破译后可变成高价值不记名债券。',
    authenticSigns: { chip: '量子加密扇区活跃未自毁' },
    fakeSigns: [
      { key: 'chip', badText: '芯片已被银行远程熔断成空卡', reason: '已触发防盗熔断的空白废卡' }
    ]
  },
  unlocked_ledger: {
    id: 'unlocked_ledger', name: '不记名巨额债券芯片', category: 'luxury',
    baseValue: 395, slots: 1, icon: '💎', legal: 'legal',
    desc: '完全洗白的无痕债权芯片，上层买家与黑市金主抢着收。',
    authenticSigns: { chip: '匿名区块链兑付签名有效' }, fakeSigns: []
  },
  relic_core: {
    id: 'relic_core', name: '先驱者母舰反重力遗物', category: 'luxury',
    baseValue: 590, slots: 2, icon: '🛸', legal: 'legal',
    desc: '深空遗迹最高收藏品，摆在货架上会强烈吸引上层大富豪造访。',
    authenticSigns: { field: '自然悬浮力场恒定无电源' },
    fakeSigns: [
      { key: 'field', badText: '底座藏着磁铁线圈与干电池', reason: '现代磁悬浮玩具伪造远古遗物' }
    ]
  },
  rad_barrel: {
    id: 'rad_barrel', name: '高危放射性废料桶', category: 'contraband',
    baseValue: 10, slots: 2, icon: '☢️', legal: 'contraband',
    desc: '乔治奥付脏钱让你处理的烫手山芋！留在店里每晚扣消辐费并涨嫌疑，务必在夜间去垃圾场倾倒！',
    authenticSigns: { rads: '盖革计数器爆表 (1800 mSv)!' }, fakeSigns: []
  }
};

// ============================================================================
// 五类密封物资箱开箱掉落表（致敬原版多轮掷骰 + 幸运值加成 + 返还钥匙卡惊喜！）
// ============================================================================
export const CRATE_LOOT_TABLES = {
  crate_service: {
    guaranteed: ['pure_water', 'filter_core'],
    rolls: [
      { id: 'morsel_food', chance: 0.65 },
      { id: 'cheese_block', chance: 0.55 },
      { id: 'energy_cell', chance: 0.60 },
      { id: 'kotton_fabric', chance: 0.45 },
      { id: 'keycard_service', chance: 0.50 },
      { id: 'cassette_tape', chance: 0.30 },
      { id: 'ice_cream', chance: 0.35 },
      { id: 'perfume_sync', chance: 0.14 },
      { id: 'micro_purifier', chance: 0.12 }
    ]
  },
  crate_medical: {
    guaranteed: ['immuno_med', 'energy_cell'],
    rolls: [
      { id: 'bandage_med', chance: 0.75 },
      { id: 'chem_common', chance: 0.65 },
      { id: 'industrial_alcohol', chance: 0.55 },
      { id: 'keycard_medical', chance: 0.45 },
      { id: 'chem_restricted', chance: 0.35 },
      { id: 'surgery_kit', chance: 0.28 },
      { id: 'blue_blood', chance: 0.18 },
      { id: 'eternal_serum', chance: 0.08 }
    ]
  },
  crate_engineering: {
    guaranteed: ['energy_cell', 'electronic_parts'],
    rolls: [
      { id: 'scrap_metal', chance: 0.70 },
      { id: 'current_converter', chance: 0.48 },
      { id: 'keycard_engineering', chance: 0.45 },
      { id: 'plasma_cartridge', chance: 0.32 },
      { id: 'cyber_arm', chance: 0.20 },
      { id: 'self_charging_cell', chance: 0.15 }
    ]
  },
  crate_security: {
    guaranteed: ['energy_cell', 'ammo_10mm'],
    rolls: [
      { id: 'combat_knife', chance: 0.60 },
      { id: 'kinetic_pistol', chance: 0.45 },
      { id: 'flashbang', chance: 0.48 },
      { id: 'keycard_security', chance: 0.45 },
      { id: 'pulse_stun_gun', chance: 0.28 },
      { id: 'pulse_rifle', chance: 0.16 }
    ]
  },
  crate_evidence: {
    guaranteed: ['scratcher_ticket', 'chem_common'],
    rolls: [
      { id: 'stolen_watch', chance: 0.45 },
      { id: 'credit_chip_locked', chance: 0.50 },
      { id: 'dream_dust', chance: 0.42 },
      { id: 'perfume_sync', chance: 0.30 },
      { id: 'spring_water', chance: 0.22 },
      { id: 'keycard_command', chance: 0.18 },
      { id: 'eternal_serum', chance: 0.10 }
    ]
  }
};

// ============================================================================
// 批发供货商与专线联络人系统（满足需求3：真正的批量进货与特殊黑商！）
// 玩家可通过店内「星环加密电话终端」随时拨号向大批发商整批订货，或解锁专线！
// ============================================================================
export const WHOLESALE_MERCHANTS = [
  {
    id: 'jackson_tech',
    code: '8001',
    name: '杰克逊博士的地下工坊',
    role: '扩容箱包 · 伪装暗仓 · 科技耗材批发',
    icon: '🥽',
    faction: 'lower',
    unlockNote: '默认开放',
    unlockedByDefault: true,
    desc: '空间站传奇发明家！独家批发“占小格扩出大仓库”的套包扩容箱、免检走私箱与电池元件。',
    catalog: [
      { tplId: 'fanny_pack', packQty: 1, price: 55, stockPerDay: 2, tag: '占1扩4' },
      { tplId: 'backpack_basic', packQty: 1, price: 220, stockPerDay: 2, tag: '占2扩8' },
      { tplId: 'backpack_military', packQty: 1, price: 360, stockPerDay: 1, tag: '占2扩12超大' },
      { tplId: 'mini_smuggler_bay', packQty: 1, price: 180, stockPerDay: 2, tag: '占1扩5·免检暗仓' },
      { tplId: 'smuggler_bay', packQty: 1, price: 320, stockPerDay: 1, tag: '占2扩9·免检神箱' },
      { tplId: 'energy_cell', packQty: 3, price: 175, stockPerDay: 3, tag: '3连批发包(-25%)' },
      { tplId: 'electronic_parts', packQty: 3, price: 120, stockPerDay: 3, tag: '3连批发包' }
    ]
  },
  {
    id: 'caulson_mining',
    code: '56371',
    name: 'GP矿业合作社 · 考尔森',
    role: '工业水处理 · 原材料大宗整箱批发',
    icon: '⛏️',
    faction: 'lower',
    unlockNote: '默认开放',
    unlockedByDefault: true,
    desc: '直接从矿道与冷凝塔源头拿货！整箱批量采购浑浊水、滤芯、钛合金与生物苔藓，单价极低！',
    catalog: [
      { tplId: 'dirty_water', packQty: 4, price: 68, stockPerDay: 4, tag: '4桶整箱装(均价17!)' },
      { tplId: 'filter_core', packQty: 3, price: 88, stockPerDay: 3, tag: '3芯实惠装' },
      { tplId: 'kotton_fabric', packQty: 3, price: 105, stockPerDay: 2, tag: '3卷装' },
      { tplId: 'scrap_metal', packQty: 4, price: 100, stockPerDay: 4, tag: '4板重工包' },
      { tplId: 'bio_moss', packQty: 3, price: 105, stockPerDay: 3, tag: '3盒活性装' },
      { tplId: 'morsel_food', packQty: 4, price: 95, stockPerDay: 3, tag: '4块饲料口粮包' }
    ]
  },
  {
    id: 'red_imp_commissary',
    code: '8815',
    name: '红魔鬼酒厂 & 后勤总署批发部',
    role: '烟酒食品 · 刮刮乐整叠批发',
    icon: '🍺',
    faction: 'lower',
    unlockNote: '默认开放',
    unlockedByDefault: true,
    desc: '供应全空间站底层的民生快消品批发商，还偷偷整叠批发星环即开刮刮乐！',
    catalog: [
      { tplId: 'red_imp_beer', packQty: 4, price: 110, stockPerDay: 3, tag: '4瓶整提装' },
      { tplId: 'cig_hemingway', packQty: 3, price: 180, stockPerDay: 3, tag: '3条保真装' },
      { tplId: 'industrial_alcohol', packQty: 3, price: 88, stockPerDay: 3, tag: '3罐酿造装' },
      { tplId: 'rib_sandwich', packQty: 2, price: 230, stockPerDay: 2, tag: '2袋原厂真品' },
      { tplId: 'scratcher_pack', packQty: 1, price: 98, stockPerDay: 4, tag: '5张连号刮刮乐!' }
    ]
  },
  {
    id: 'dale_pharma',
    code: '4615',
    name: '上层药剂师 · 戴尔 & 阿希什专线',
    role: '处方医疗 · 化学试剂 · 液体好运批量直供',
    icon: '⚕️',
    faction: 'upper',
    unlockCost: 150,
    unlockNote: '花 150 CR 向乔·怀尔德情报网购买电话号码解锁',
    unlockedByDefault: false,
    desc: '打通上层医院后门！批量进购正品免疫宁、化学试剂、高档香水与神奇的“液体好运”！',
    catalog: [
      { tplId: 'chem_common', packQty: 3, price: 92, stockPerDay: 3, tag: '3组制药包' },
      { tplId: 'bandage_med', packQty: 4, price: 85, stockPerDay: 3, tag: '4卷战地包' },
      { tplId: 'immuno_med', packQty: 2, price: 230, stockPerDay: 2, tag: '2支医院原装' },
      { tplId: 'perfume_sync', packQty: 2, price: 320, stockPerDay: 2, tag: '2瓶名流装' },
      { tplId: 'liquid_luck', packQty: 1, price: 145, stockPerDay: 2, tag: '+75幸运神药!' }
    ]
  },
  {
    id: 'sawyer_exchange',
    code: '3319',
    name: '索耶的地下黑市交易所',
    role: '密封物资箱 · 各部门钥匙卡 · 军火黑货批发',
    icon: '🕵️',
    faction: 'blackmarket',
    unlockCost: 220,
    unlockNote: '花 220 CR（或黑市声望≥25免费）接通暗网专线',
    unlockedByDefault: false,
    desc: '刺激的开箱天堂！直接整批购买五类上锁密封物资箱、对应部门钥匙卡与损坏手枪坯子！',
    catalog: [
      { tplId: 'crate_service', packQty: 1, price: 145, stockPerDay: 2, tag: '密封盲盒箱' },
      { tplId: 'crate_medical', packQty: 1, price: 175, stockPerDay: 2, tag: '必出免疫宁+电池' },
      { tplId: 'crate_engineering', packQty: 1, price: 175, stockPerDay: 2, tag: '高期望收益箱!' },
      { tplId: 'crate_security', packQty: 1, price: 185, stockPerDay: 1, tag: '军火违禁箱' },
      { tplId: 'crate_evidence', packQty: 1, price: 180, stockPerDay: 1, tag: '条子罚没物证柜' },
      { tplId: 'keycard_service', packQty: 2, price: 85, stockPerDay: 2, tag: '2张后勤卡' },
      { tplId: 'keycard_medical', packQty: 2, price: 105, stockPerDay: 2, tag: '2张医疗卡' },
      { tplId: 'keycard_engineering', packQty: 2, price: 110, stockPerDay: 2, tag: '2张工程卡' },
      { tplId: 'keycard_security', packQty: 2, price: 125, stockPerDay: 2, tag: '2张治安卡' },
      { tplId: 'keycard_command', packQty: 1, price: 165, stockPerDay: 1, tag: '万能开箱神卡!' },
      { tplId: 'broken_pistol', packQty: 2, price: 140, stockPerDay: 2, tag: '2把待修手枪坯' }
    ]
  }
];

// ============================================================================
// 店面后室机器与生产链（新增生物培育舱养鼠产肉、空箱拆解等）
// ============================================================================
export const MACHINES = {
  purifier: {
    id: 'purifier',
    name: '工业反渗透净水器',
    icon: '💧',
    cost: 260,
    desc: '将浑浊回收水提纯为高利润净水配给包或高档瓶装泉水。',
    recipes: [
      {
        id: 'purify_std',
        name: '反渗透标准净化 (产2包)',
        inputs: ['dirty_water', 'filter_core'],
        output: 'pure_water', outputCount: 2, power: 18,
        note: '1 浑浊水 + 1 滤芯 → 2 包正品 99.9% 净水配给包'
      },
      {
        id: 'purify_kotton',
        name: '韧棉精滤矿化泉水',
        inputs: ['dirty_water', 'kotton_fabric', 'filter_core'],
        output: 'spring_water', outputCount: 1, power: 25,
        note: '1 浑浊水 + 1 韧棉织物 + 1 滤芯 → 1 瓶上层疯抢的【瓶装天然泉水(325 CR)】'
      },
      {
        id: 'purify_fake',
        name: '无滤芯粗滤次品水 (制假)',
        inputs: ['dirty_water'],
        output: 'pure_water', outputCount: 1, makeFake: true, power: 10,
        note: '仅耗 1 浑浊水 → 1 包伪装净水（坑骗粗心买家，被识破掉声望）'
      }
    ]
  },
  workbench: {
    id: 'workbench',
    name: '精密军火与工程改装台',
    icon: '🛠️',
    cost: 320,
    desc: '修复卡壳手枪、拆解空物资箱壳、组装重型脉冲步枪与等离子燃料匣。',
    recipes: [
      {
        id: 'repair_pistol',
        name: '修复并校准“铁匠10”手枪',
        inputs: ['broken_pistol', 'scrap_metal'],
        output: 'kinetic_pistol', outputCount: 1, power: 18,
        note: '1 卡壳手枪 + 1 钛合金废料 → 1 把正品铁匠10动能手枪'
      },
      {
        id: 'craft_plasma',
        name: '封装高能等离子燃料匣',
        inputs: ['energy_cell', 'electronic_parts'],
        output: 'plasma_cartridge', outputCount: 1, power: 22,
        note: '1 聚变电池 + 1 电子元件板 → 1 枚等离子燃料匣 (300 CR)'
      },
      {
        id: 'build_pulse_rifle',
        name: '组装“哨兵Mk.III”军用脉冲步枪',
        inputs: ['kinetic_pistol', 'energy_cell', 'electronic_parts'],
        output: 'pulse_rifle', outputCount: 1, power: 32,
        note: '1 铁匠10手枪 + 1 电池 + 1 电子元件 → 1 把顶级违禁脉冲步枪 (480 CR!)'
      },
      {
        id: 'salvage_empty_crate',
        name: '拆解空物资箱壳回收钛合金',
        inputs: ['empty_crate', 'empty_crate'],
        output: 'scrap_metal', outputCount: 2, power: 10,
        note: '2 个开完的空箱壳 → 回收 2 块高纯钛合金废料'
      }
    ]
  },
  synthesizer: {
    id: 'synthesizer',
    name: '化学合成与陈酿蒸馏釜',
    icon: '⚗️',
    cost: 300,
    desc: '酿造努特加与星云紫酒、合成免疫宁，或提炼暴利违禁品“梦魇尘”。',
    recipes: [
      {
        id: 'brew_wine',
        name: '发酵星云陈酿紫酒',
        inputs: ['bio_moss', 'industrial_alcohol'],
        output: 'synth_wine', outputCount: 1, power: 18,
        note: '1 荧光苔藓 + 1 无水乙醇 → 1 瓶星云陈酿紫酒 (190 CR)'
      },
      {
        id: 'craft_immuno',
        name: '合成“免疫宁”注射器',
        inputs: ['bio_moss', 'chem_common'],
        output: 'immuno_med', outputCount: 1, power: 20,
        note: '1 荧光苔藓 + 1 基础化学试剂 → 1 支正品免疫宁 (150 CR)'
      },
      {
        id: 'craft_perfume',
        name: '萃取“本源”费洛蒙香水',
        inputs: ['industrial_alcohol', 'chem_common'],
        output: 'perfume_sync', outputCount: 1, power: 20,
        note: '1 无水乙醇 + 1 基础化学试剂 → 1 瓶费洛蒙神经香水 (210 CR)'
      },
      {
        id: 'cook_dream_dust',
        name: '提纯违禁“梦魇尘”晶粉',
        inputs: ['chem_restricted', 'industrial_alcohol'],
        output: 'dream_dust', outputCount: 2, power: 28,
        note: '1 管制化学前体 + 1 乙醇 → 产出 2 瓶高危违禁梦魇尘 (共 720 CR!)'
      }
    ]
  },
  scrambler: {
    id: 'scrambler',
    name: '量子序列号打磨 & 制卡仪',
    icon: '💻',
    cost: 290,
    desc: '一键抹除赃物追踪码、破译加密黑金芯片，还能用电子元件伪造部门钥匙卡开箱！',
    recipes: [
      {
        id: 'decode_chip',
        name: '破译加密黑金信用芯片',
        inputs: ['credit_chip_locked', 'energy_cell'],
        output: 'unlocked_ledger', outputCount: 1, power: 22,
        note: '1 加密黑金芯片 + 1 聚变电池 → 1 枚不记名巨额债券芯片 (395 CR)'
      },
      {
        id: 'forge_sec_card',
        name: '烧录伪造【指挥官万能钥匙卡】',
        inputs: ['electronic_parts', 'electronic_parts', 'energy_cell'],
        output: 'keycard_command', outputCount: 1, power: 30,
        note: '2 电子元件板 + 1 聚变电池 → 1 张可开任意密封物资箱的【指挥官万能卡】！'
      }
    ]
  },
  rat_cage: {
    id: 'rat_cage',
    name: 'A/B双区深空培育养殖舱',
    icon: '🐀',
    cost: 270,
    desc: '致敬原版养鼠流！将廉价口粮或奶酪投入恒温舱催肥培育，产出上层大厨高价收购的特级冷鲜生肉！',
    recipes: [
      {
        id: 'breed_meat_morsel',
        name: '标准催肥出栏 (产2份特级生肉)',
        inputs: ['morsel_food', 'cheese_block'],
        output: 'raw_meat', outputCount: 2, power: 16,
        note: '1 压缩口粮 + 1 合成奶酪 → 产出 2 份特级冷鲜生肉 (总值 320 CR!)'
      },
      {
        id: 'breed_meat_fast',
        name: '纯口粮快速育肥',
        inputs: ['morsel_food', 'morsel_food'],
        output: 'raw_meat', outputCount: 1, power: 14,
        note: '2 压缩口粮 → 产出 1 份特级冷鲜生肉 (160 CR)'
      }
    ]
  }
};

// 店铺许可证、工具与仓库扩容升级
export const UPGRADES_AND_LICENSES = [
  {
    id: 'aug_scanner', type: 'tool',
    name: '杰克逊博士的 AI 改造体扫描仪', icon: '📡', cost: 220,
    desc: '消耗 20⚡ 扫描柜台前顾客的脑机频段，100% 确认是否为失控 AI 改造体（避免误杀人类赔倾家荡产）。'
  },
  {
    id: 'spec_analyzer', type: 'tool',
    name: '全频段物质光谱仪', icon: '🔬', cost: 200,
    desc: '消耗 10⚡ 一键透视货品深层纯度、内部机芯、工厂真伪与失主追踪码。'
  },
  {
    id: 'shelf_expand_1', type: 'upgrade',
    name: '主货架合金层板扩建 (+8格)', icon: '🏗️', cost: 260,
    desc: '将明面主货架容量扩充 +8 格（配合套包扩容箱可囤积海量货物）。'
  },
  {
    id: 'stash_expand', type: 'upgrade',
    name: '柜台下液压磁屏蔽暗格扩建 (+6格)', icon: '🗄️', cost: 240,
    desc: '将柜台下固定防搜查暗格扩充 +6 格（也可直接购买走私者伪装箱实现套包免检）。'
  },
  {
    id: 'display_case_up', type: 'upgrade',
    name: '全息防弹展示柜升级', icon: '✨', cost: 250,
    desc: '提升全店吸引力：顾客单次购买数量上限 +1，且所有出售议价容忍度提升 +12%！'
  },
  {
    id: 'arms_1', type: 'license',
    name: '一级民用军火经营许可证', icon: '📜', cost: 280,
    desc: '合法在货架摆卖手枪、弹药、战术刀、等离子匣与义体（重型脉冲步枪与治安箱仍属违禁）。'
  },
  {
    id: 'med_permit', type: 'license',
    name: '深空医药与化学制剂许可', icon: '⚕️', cost: 190,
    desc: '合法经营免疫宁、外科手术包与永恒精华液，免受非法行医罚没。'
  },
  {
    id: 'appraiser_cert', type: 'license',
    name: '空间站鉴定委员会证书', icon: '🏅', cost: 210,
    desc: '每天吸引专门带肋明治、燃料匣或古董上门求鉴定的客人，零成本赚取高额鉴定佣金！'
  }
];

// ============================================================================
// 20+ 原版风味顾客原型库（支持一次买多件、一次卖多件、开箱狂人、清仓奸商、补给运输员等！）
// minQty / maxQty: 顾客单次携带或求购的商品件数范围！
// ============================================================================
export const CUSTOMER_ARCHETYPES = [
  {
    id: 'spacer_hungry',
    roleName: '忍饥挨饿的星际客',
    faction: 'lower', avatarHue: 195, helmet: 'normal',
    sellPool: ['cassette_tape', 'scrap_metal', 'food_stamp'],
    buyCategories: ['supply'],
    preferredTplIds: ['pure_water', 'morsel_food', 'rib_sandwich', 'red_imp_beer', 'ice_cream'],
    minQty: 1, maxQty: 3,
    honesty: 0.78, patience: 3, budgetMult: 1.08,
    greetings: [
      '老板，刚跑完两周远航货运，快渴死饿死了！水、啤酒、吃的给我多来几份！',
      '下层食堂今天停供了，你货架上的口粮和净水我全想捎上。'
    ]
  },
  {
    id: 'miner',
    roleName: '第9矿道重工矿工',
    faction: 'lower', avatarHue: 42, helmet: 'miner_cap',
    sellPool: ['scrap_metal', 'dirty_water', 'broken_pistol', 'energy_cell', 'plasma_cartridge'],
    buyCategories: ['supply', 'medical'],
    preferredTplIds: ['cig_hemingway', 'red_imp_beer', 'pure_water', 'bandage_med', 'immuno_med'],
    minQty: 1, maxQty: 3,
    honesty: 0.72, patience: 3, budgetMult: 1.10,
    greetings: [
      '咳咳……刚领了矿道工钱，烟、红魔鬼啤酒还有止血绷带给我备齐一套！',
      '这是我们在废矿坑挖出来的几件家伙，你一并估个价收了吧？'
    ]
  },
  {
    id: 'scavenger_lot',
    roleName: '废舱批发拾荒客',
    faction: 'lower', avatarHue: 30, helmet: 'goggles',
    forceIntent: 'sell_to_shop',
    sellPool: ['scrap_metal', 'filter_core', 'bio_moss', 'cig_hemingway', 'rib_sandwich', 'food_stamp', 'kotton_fabric', 'crate_service'],
    buyCategories: ['supply'],
    minQty: 2, maxQty: 4,
    honesty: 0.54, patience: 3, budgetMult: 1.0,
    greetings: [
      '嘿！昨晚在废弃生活舱扫荡了一整麻袋货，一共好几件，老板你挨个过过眼！',
      '批量出货给你打个折！不过丑话说前头，离柜概不退换啊嘿嘿……'
    ]
  },
  {
    id: 'repairman',
    roleName: '下层区机电修理工',
    faction: 'lower', avatarHue: 215, helmet: 'goggles',
    sellPool: ['electronic_parts', 'current_converter', 'scrap_metal'],
    buyCategories: ['material', 'tech'],
    preferredTplIds: ['scrap_metal', 'electronic_parts', 'energy_cell', 'current_converter', 'plasma_cartridge'],
    minQty: 2, maxQty: 3,
    honesty: 0.85, patience: 3, budgetMult: 1.16,
    greetings: [
      '第4扇区通风机组瘫痪了，急需一批电池、电子元件板和钛合金废料，有多少收多少！',
      '同行之间不整虚的，把你店里的工程耗材打包卖我几件。'
    ]
  },
  {
    id: 'thief_master',
    roleName: '上层区夜行大盗',
    faction: 'blackmarket', avatarHue: 275, helmet: 'hood',
    forceIntent: 'sell_to_shop',
    sellPool: [
      'crate_security', 'crate_medical', 'crate_engineering', 'crate_evidence', 'crate_service',
      'keycard_security', 'keycard_medical', 'keycard_engineering', 'keycard_service',
      'stolen_watch', 'credit_chip_locked', 'perfume_sync', 'scratcher_pack'
    ],
    buyCategories: ['contraband', 'tech'],
    stolenChance: 0.70,
    minQty: 2, maxQty: 3,
    honesty: 0.62, patience: 2, budgetMult: 1.25,
    greetings: [
      '嘘——刚从上层仓库顺出来的【密封物资箱】和门禁卡！箱子先摆柜台，敢不敢整批吃下？',
      '条子巡逻艇就在巷口，这几件硬货给你按“五指折扣”算便宜点，快点决定！'
    ]
  },
  {
    id: 'case_enjoyer',
    roleName: '开箱狂人·奥托',
    faction: 'blackmarket', avatarHue: 295, helmet: 'visor_gold',
    forceIntent: 'buy_from_shop',
    sellPool: [],
    buyCategories: ['crate', 'tech'],
    preferredTplIds: ['crate_service', 'crate_medical', 'crate_engineering', 'crate_security', 'crate_evidence', 'keycard_command', 'keycard_security', 'keycard_medical'],
    minQty: 2, maxQty: 4,
    honesty: 0.90, patience: 3, budgetMult: 1.42,
    greetings: [
      '🤩 我闻到了未拆封密封箱和门禁卡的迷人味道！！不管是哪个部门的箱子还是钥匙卡，统统卖给我！我出高价！',
      '赌徒的快乐就是亲手刷卡开箱的那一秒！老板，把你囤的箱子和卡全端上来！'
    ]
  },
  {
    id: 'supply_runner',
    roleName: '星环补给运输员',
    faction: 'lower', avatarHue: 180, helmet: 'miner_cap',
    forceIntent: 'sell_to_shop',
    sellPool: ['bandage_med', 'energy_cell', 'kotton_fabric', 'dirty_water', 'cassette_tape', 'filter_core', 'fanny_pack', 'scratcher_ticket'],
    buyCategories: ['supply'],
    minQty: 3, maxQty: 4,
    honesty: 0.96, patience: 3, budgetMult: 1.05,
    greetings: [
      '每周例行补给车路过！我这儿有原装绷带、电池、韧棉、腰包和完好的复古磁带，批发价任挑！',
      '正规运输队直供，绝无假货，看看需要补哪些耗材？'
    ]
  },
  {
    id: 'shady_liquidator',
    roleName: '收破烂的黑市奸商',
    faction: 'blackmarket', avatarHue: 55, helmet: 'hood',
    forceIntent: 'buy_from_shop',
    isBulkLiquidator: true,
    sellPool: [],
    buyCategories: ['material', 'supply', 'luxury', 'tech', 'weapon', 'medical', 'contraband'],
    minQty: 3, maxQty: 4,
    honesty: 0.70, patience: 3, budgetMult: 0.88,
    greetings: [
      '嘿嘿，快到交租日手头紧吧？别人不要的【空物资箱壳】、杂物、违禁品我全收！虽然打88折，但我一次能帮你清掉一大堆库存变现！',
      '不管是赃物还是破烂，只要摆在货架上我就整批打包收走！'
    ]
  },
  {
    id: 'upper_chef',
    roleName: '穹顶区私人主厨',
    faction: 'upper', avatarHue: 340, helmet: 'visor_gold',
    forceIntent: 'buy_from_shop',
    sellPool: [],
    buyCategories: ['luxury', 'supply'],
    preferredTplIds: ['raw_meat', 'spring_water', 'synth_wine', 'rib_sandwich', 'nudka_vodka', 'ice_cream'],
    minQty: 2, maxQty: 3,
    honesty: 0.90, patience: 2, budgetMult: 1.52,
    greetings: [
      '今晚执政官举办星环晚宴，急需特级冷鲜生肉、天然泉水与星云紫酒！只要品质正宗，价钱随你开！',
      '听说你这儿能搞到鲜嫩的真肉排和纪念版肋明治？有多少我包圆多少！'
    ]
  },
  {
    id: 'upper_hedonist',
    roleName: '上层区寻欢名流',
    faction: 'upper', avatarHue: 320, helmet: 'visor_gold',
    sellPool: ['stolen_watch', 'perfume_sync', 'eternal_serum'],
    buyCategories: ['luxury', 'contraband'],
    preferredTplIds: ['eternal_serum', 'perfume_sync', 'synth_wine', 'stolen_watch', 'relic_core', 'dream_dust'],
    minQty: 1, maxQty: 3,
    honesty: 0.80, patience: 2, budgetMult: 1.55,
    greetings: [
      '穹顶区的日子太无聊了……把你店里最奢华的古董、费洛蒙香水或者“永恒”精华液拿出来瞧瞧。',
      '这几件是我玩腻的藏品，便宜处理给你换点新鲜玩意儿。'
    ]
  },
  {
    id: 'rebel_quartermaster',
    roleName: '革命军前线军需官',
    faction: 'rebel', avatarHue: 140, helmet: 'beret',
    sellPool: ['unlocked_ledger', 'relic_core', 'bio_moss'],
    buyCategories: ['weapon', 'medical', 'contraband'],
    preferredTplIds: ['pulse_rifle', 'kinetic_pistol', 'ammo_10mm', 'immuno_med', 'surgery_kit', 'bandage_med', 'plasma_cartridge'],
    minQty: 2, maxQty: 4,
    honesty: 0.90, patience: 3, budgetMult: 1.35,
    greetings: [
      '同志，第7扇区起义小队急需一批武器弹药与战地急救品！请把库存里的枪械、子弹和免疫宁整批支援给我们，绝不亏待！',
      '有多少军火和医疗包我们全要了！为了自由星环！'
    ]
  },
  {
    id: 'sec_requisition',
    roleName: '治安部后勤征用官',
    faction: 'security', avatarHue: 10, helmet: 'collar',
    sellPool: ['crate_evidence', 'pulse_stun_gun'],
    buyCategories: ['supply', 'medical', 'tech'],
    preferredTplIds: ['rib_sandwich', 'cig_hemingway', 'immuno_med', 'energy_cell', 'pure_water'],
    minQty: 2, maxQty: 3,
    honesty: 0.88, patience: 2, budgetMult: 1.28,
    greetings: [
      '治安部巡逻大队公务采购！香烟、肋明治、净水和电池给我按清单配齐几份，公账报销很痛快！',
      '好好配合治安部后勤工作，你的治安声望自然少不了好处。'
    ]
  },
  {
    id: 'station_tourist',
    roleName: '星际观光美食游客',
    faction: 'upper', avatarHue: 255, helmet: 'normal',
    forceIntent: 'buy_from_shop',
    sellPool: [],
    buyCategories: ['supply', 'luxury'],
    preferredTplIds: ['cassette_tape', 'rib_sandwich', 'ice_cream', 'spring_water', 'stolen_watch', 'red_imp_beer'],
    minQty: 2, maxQty: 3,
    honesty: 0.92, patience: 3, budgetMult: 1.38,
    greetings: [
      '哇，这就是传说中充满赛博烟火气的第13底层当铺吗！我想买几件纪念品和当地特色小吃带回母星！',
      '磁带、冰淇淋还有啤酒看起来都超棒，帮我打包两三样吧！'
    ]
  },
  {
    id: 'desperate_addict',
    roleName: '神色恍惚的瘾君子',
    faction: 'lower', avatarHue: 165, helmet: 'normal',
    sellPool: ['stolen_watch', 'cyber_arm', 'keycard_medical', 'food_stamp'],
    buyCategories: ['contraband', 'medical'],
    preferredTplIds: ['dream_dust', 'blue_blood', 'nudka_vodka', 'cig_hemingway'],
    stolenChance: 0.60,
    minQty: 1, maxQty: 2,
    honesty: 0.42, patience: 2, budgetMult: 1.40,
    greetings: [
      '老板……求求你，有没有“梦魇尘”或者“蓝血”？哪怕烈酒也行！我出高价！',
      '这几样东西绝对值钱（手一直在发抖），快换点现钱给我应急……'
    ]
  },
  {
    id: 'undercover_cop',
    roleName: '眼神锐利的便衣访客',
    faction: 'security', avatarHue: 0, helmet: 'collar',
    isSting: true,
    forceIntent: 'buy_from_shop',
    sellPool: [],
    buyCategories: ['contraband', 'weapon'],
    minQty: 1, maxQty: 2,
    honesty: 0.70, patience: 2, budgetMult: 1.45,
    greetings: [
      '咳，老板，听说你这儿门路广……有没有没办证的枪、门禁卡或者违禁品？我一次买两件，现金结账！',
      '别紧张，大家都是道上混的（衣领下隐约闪过警用通讯器微光），把好货拿出来吧。'
    ]
  }
];

// 失控 AI 改造体（Aug）六大鉴别线索库
export const AUG_CLUES = {
  speechTells: [
    '你好，碳基商业节点。我请求执行【批量物资等价交换协议】，价格浮动容差 0.00%。',
    '检测到柜台陈列物熵值稳定。请立即输出所有目标物件的信用点总和。',
    '人类口渴感模拟程序已加载……更正：我需要补充冷却液与高密聚变电池。'
  ],
  behaviorTells: [
    '站在柜台前纹丝不动，每隔 4.0 秒颈部伺服结构出现一次僵硬抽搐',
    '身穿下层破烂矿工服，胸前却佩戴着上层穹顶区贵族徽章（服饰与阵营严重错位）',
    '呼吸起伏完全为零，双眼瞳孔呈非人类异色六边形网格且从不眨眼'
  ],
  normalBehaviors: [
    '进门后拍了拍肩膀上的太空灰尘，自然地打量着货架上的价签',
    '一边擦汗一边抱怨这周氧气税又涨了，呼吸节奏十分自然',
    '警惕地回头看了一眼巷口治安巡逻队，手指轻轻敲着柜台算账',
    '打了个哈欠，从兜里摸出皱巴巴的购物清单核对要买的几样东西'
  ]
};

// 通缉犯名单（含原版高人气革命军黑客买手“奥丁·哈拉尔德森”！）
export const WANTED_POOL = [
  {
    id: 'wanted_odin',
    name: '奥丁·哈拉尔德森',
    crime: '革命军头号军火与黑客通缉犯 (电话:51189)',
    bounty: 300,
    mark: '头戴绿色革命军贝雷帽，左脸有电弧疤痕（注：不举报并成交可获重金与黑市人脉！）',
    faction: 'rebel',
    isOdin: true
  },
  {
    id: 'wanted_viper',
    name: '“独眼”维克多',
    crime: '武装劫持上层区运钞穿梭机',
    bounty: 240,
    mark: '右眼佩戴红色战术义眼罩，脖颈印有条形码刺青',
    faction: 'blackmarket'
  },
  {
    id: 'wanted_crow',
    name: '渡鸦·科尔',
    crime: '盗窃治安部物证库与军方门禁卡',
    bounty: 260,
    mark: '身穿深紫色高领兜帽衫，嘴角叼着银色金属牙签',
    faction: 'blackmarket'
  }
];

// 特殊剧情角色事件（融入液体好运、栽赃陷害、卢的箱子、塞尔皮科等原版名桥段）
export const STORY_NPCS = {
  mentor_day1: {
    day: 1,
    id: 'mentor_intro',
    name: '导师·老莫',
    role: '前任独臂掌柜',
    faction: 'lower',
    text: '“小子，店铺交给你了！教你几招绝活：① 顾客现在经常一次带好几件货或求购多件商品，先拿放大镜挨个挑出假货瑕疵狠狠压价！② 右侧终端里的【批发供货商电话】能整箱低价进货，杰克逊博士还卖占1~2格却能装8~12格的【套包扩容箱】和防条子搜查的【走私者伪装箱】！③ 碰到上锁的密封物资箱，弄张对应钥匙卡开箱往往能爆出天价神装！”',
    choices: [
      { label: '收下导师赠送的【迷你走私者免检扩容箱(占1扩5)】！', effect: 'gift_smuggler_mini' },
      { label: '收下导师私藏的【一叠5张刮刮乐彩票】与【液体好运】试试手气！', effect: 'gift_luck_pack' }
    ]
  },
  georgio_waste: {
    day: 3,
    id: 'georgio_waste',
    name: '乔治奥（反应堆外包商）',
    role: '灰色渠道老熟人',
    faction: 'blackmarket',
    text: '乔治奥神秘兮兮地凑过来：“老弟，两桩买卖任你选！第一桩：帮我暂存处理 2 桶【高危放射性废料】，我当场给你 **360 CR** 现金外加一瓶能让你刮彩票开箱欧气爆棚的 **【液体好运】**，你晚上去垃圾场把桶倒掉就行；第二桩：花 120 CR 买我刚顺出来的【治安部罚没物证柜 + 治安钥匙卡】一套！”',
    choices: [
      { label: '接脏活！拿 360 CR + 1瓶【液体好运】 + 2桶放射性废料（记得晚上去垃圾场倒掉）', effect: 'accept_waste' },
      { label: '花 120 CR 买下乔治奥的【治安部物证柜 + 治安钥匙卡】开箱爽一把！', effect: 'buy_georgio_locker' },
      { label: '婉拒乔治奥，稳字当头（下层区声望 +6）', effect: 'reject_waste' }
    ]
  },
  corrupt_cop_trap: {
    day: 4,
    id: 'corrupt_cop_trap',
    name: '眼神闪烁的治安巡官',
    role: '腐败执法者（原版经典栽赃事件）',
    faction: 'security',
    text: '这名巡官左右张望后压低声音：“喂，掌柜的，帮我把这包没贴封条的【梦魇尘违禁品】转交给明天来店里的艾莉诺，事成之后少不了你的好处……”（你注意到门口拐角似乎有另一队督察在蹲守录音！）',
    choices: [
      { label: '识破钓鱼栽赃！当场按下柜台督察举报钮反将一军（+200 CR，治安部声望+15）', effect: 'report_dirty_cop' },
      { label: '不动声色收下这瓶违禁【梦魇尘】，塞进免检暗仓自己拿去黑市卖高价！', effect: 'keep_trap_loot' },
      { label: '严词拒绝触碰不明违禁品', effect: 'refuse_trap' }
    ]
  },
  lu_crate: {
    day: 5,
    id: 'lu_crate',
    name: '卢（乔装的革命军特工）',
    role: '地下反抗军先锋',
    faction: 'rebel',
    text: '卢推来一只沉重的金属箱：“全城戒严，这把改装【哨兵Mk.III脉冲步枪】寄存在你这儿两天，千万藏进暗格或走私者伪装箱别被搜走。两天后我回来取，付你 **500 CR** 保管费外加一张【指挥官万能钥匙卡】！”',
    choices: [
      { label: '答应替卢妥善保管重武器（2天后回访获 500 CR + 万能钥匙卡）', effect: 'lu_accept' },
      { label: '暗中向治安部出卖卢领赏（+300 CR，治安部+20，革命军-35）', effect: 'lu_betray' },
      { label: '婉拒卷入纷争', effect: 'lu_decline' }
    ]
  },
  serpico_plea: {
    day: 6,
    id: 'serpico_plea',
    name: '垃圾场信使少年',
    role: '流亡者塞尔皮科的助手',
    faction: 'lower',
    text: '少年递来求救信：“躲在垃圾场的塞尔皮科叔叔快断粮了……如果你店里有任意食品或净水，能支援他一份吗？下层街坊们一辈子都会记得你的恩情。”',
    choices: [
      { label: '赠送 1 份食物/净水救助塞尔皮科（下层+25，获赠真品古董金怀表！）', effect: 'help_serpico' },
      { label: '直接资助 120 CR 现金（下层+18，幸运值永久+10）', effect: 'pay_serpico' },
      { label: '冷漠拒绝（下层-10）', effect: 'ignore_serpico' }
    ]
  }
};

// ============================================================================
// v3.0 疯狂扩容包：220+ 原版/原创物品、9 职业、4 难度、开局特性、30+ 机器、报纸事件、模块、图鉴
// ============================================================================
function _mkTpl(id, name, category, baseValue, icon, desc, opts = {}) {
  const legal = opts.legal || 'legal';
  const tpl = {
    id, name, category, baseValue, slots: opts.slots || 1, icon, legal, desc,
    authenticSigns: opts.authenticSigns || { seal: '原厂封签与批次钢印完好', quality: '做工精良无明显瑕疵' },
    fakeSigns: opts.fakeSigns || []
  };
  if (opts.isContainer) { tpl.isContainer = true; tpl.containerCap = opts.containerCap; tpl.shielded = Boolean(opts.shielded); }
  if (opts.isSealedCrate) { tpl.isSealedCrate = true; tpl.requiredKey = opts.requiredKey || null; }
  if (opts.isUsable) tpl.isUsable = opts.isUsable;
  if (opts.isModule) tpl.isModule = true;
  if (opts.moduleType) tpl.moduleType = opts.moduleType;
  if (opts.isSeed) tpl.isSeed = true;
  if (opts.isFish) tpl.isFish = true;
  if (opts.isWine) tpl.isWine = true;
  if (opts.chillable) tpl.chillable = true;
  if (opts.frozen) tpl.frozen = true;
  if (!tpl.fakeSigns.length && baseValue >= 25 && !opts.noFake) {
    tpl.fakeSigns = [
      { key: 'seal', badText: '封签为二次粘贴，批次号与官方记录对不上', reason: '封签二次粘贴，批次号造假' },
      { key: 'quality', badText: '质感粗糙、边缘有廉价模具毛刺', reason: '做工粗糙系低劣仿制品' }
    ];
  }
  ITEM_TEMPLATES[id] = tpl;
  return tpl;
}
function _cont(id, name, value, icon, slots, cap, shielded, desc) {
  return _mkTpl(id, name, 'container', value, icon, desc, { slots, isContainer: true, containerCap: cap, shielded, noFake: true });
}
function _crate(id, name, value, icon, reqKey, desc) {
  return _mkTpl(id, name, 'crate', value, icon, desc, { slots: 2, isSealedCrate: true, requiredKey: reqKey, legal: 'contraband' });
}
function _mod(id, name, value, icon, mtype, desc) {
  return _mkTpl(id, name, 'module', value, icon, desc, { isModule: true, moduleType: mtype, legal: 'legal' });
}

// ---- 容器/套包（原版全系） ----
_cont('satchel', '斜挎包 (占1扩6)', 150, '👜', 1, 6, false, '【扩容容器】占1格扩6格，拾荒客与信使最爱的中型套包。');
_cont('kids_backpack', '儿童书包 (占1扩3)', 200, '🎒', 1, 3, false, '【扩容容器】占1格扩3格，小巧轻便，适合藏小件贵重物。');
_cont('kids_backpack_large', '儿童大书包 (占1扩5)', 250, '🎒', 1, 5, false, '【扩容容器】占1格扩5格，色彩鲜艳的儿童大书包。');
_cont('backpack_small', '小型背包 (占1扩5)', 300, '🎒', 1, 5, false, '【扩容容器】占1格扩5格，轻量化小型背包。');
_cont('backpack_large', '大型背包 (占2扩10)', 650, '🎒', 2, 10, false, '【扩容容器】占2格扩10格，囤货党的行军大包。');
_cont('army_backpack', '军用背包 (占1扩6)', 130, '🎒', 1, 6, false, '【扩容容器】占1格扩6格，性价比极高的军规套包。');
_cont('large_military_backpack', '大型军用背包·改 (占2扩14)', 520, '🪖', 2, 14, false, '【顶级扩容箱】占2格扩14格！杰克逊博士改装的超大军包。');
_cont('bay_makeshift', '简易储物舱 (占2扩6)', 250, '🗄️', 2, 6, false, '【扩容容器】占2格扩6格，拼凑而成的简易储物舱。');
_cont('bay_standard', '标准储物舱 (占2扩10)', 300, '🗄️', 2, 10, false, '【扩容容器】占2格扩10格，标准工业储物舱。');
_cont('bay_extended', '加长储物舱 (占2扩16)', 850, '🗄️', 2, 16, false, '【超大扩容箱】占2格扩16格！整柜货物一包收！');
_cont('bay_machine', '机器舱 (占2扩12)', 300, '🏭', 2, 12, false, '【扩容容器】占2格扩12格，专为机器零件与原料设计。');
_cont('bay_machine_expanded', '扩容机器舱 (占2扩20)', 1200, '🏭', 2, 20, false, '【终极扩容箱】占2格扩20格！深空当铺的移动仓库！');
_cont('expedition_box', '远征补给箱 (占2扩8)', 280, '📦', 2, 8, false, '【扩容容器】占2格扩8格，远征队标准补给箱。');
_cont('smuggler_bay_std', '标准走私者伪装箱 (占2扩8·免检)', 250, '🕵️', 2, 8, true, '【免检伪装箱】占2格扩8格，铅屏蔽暗仓防盘查！');
_cont('smuggler_bay_mod', '改装走私者伪装箱 (占2扩12·免检)', 400, '🕵️', 2, 12, true, '【免检伪装箱】占2格扩12格，改装版终极暗仓！');

// ---- 密封箱与钥匙卡补全 ----
_crate('crate_expedition', '远征补给密封箱 (密封)', 185, '📦', 'keycard_supply', '【密封盲盒箱】需【补给部钥匙卡】或【指挥官卡】开启！内含远征补给与稀有材料。');
_mkTpl('keycard_blank', '空白门禁卡', 'tech', 15, '🪪', '无权限的空白卡，可在制卡仪烧录成部门卡。', { legal: 'legal' });
_mkTpl('keycard_supply', '一次性钥匙卡 (补给部)', 'tech', 60, '🪪', '可解锁【远征补给密封箱】。', { legal: 'contraband' });
_mkTpl('keycard_research', '一次性钥匙卡 (研究部)', 'tech', 125, '🪪', '可解锁高价值研究物资箱，黑市硬通货。', { legal: 'contraband' });

// ---- 机器模块（原版全系，可装入模块槽强化产线） ----
_mod('mod_efficiency', '效率模块', 70, '⚙️', 'efficiency', '【机器模块】装入模块槽：所有机器耗电 -12%。');
_mod('mod_performance', '性能模块', 70, '⚙️', 'performance', '【机器模块】装入模块槽：合成成功率与产出稳定度提升。');
_mod('mod_quality', '品质模块', 70, '⚙️', 'quality', '【机器模块】装入模块槽：产出物品估值 +10%。');
_mod('mod_eco', '环保模块', 100, '🌿', 'eco', '【机器模块】装入模块槽：夜间回电 +10⚡。');
_mod('mod_overclock', '超频模块', 100, '🔥', 'overclock', '【机器模块】装入模块槽：25% 概率额外产出 1 件。');
_mod('mod_refinement', '精炼模块', 100, '💎', 'refinement', '【机器模块】装入模块槽：原料需求 -1 件（最低1）。');
_mod('mod_alarm_tx', '警报发射模块', 100, '🚨', 'alarm', '【机器模块】装入模块槽：治安盘查概率 -30%。');
_mod('mod_streamlining', '流线型模块', 125, '🌊', 'streamlining', '【机器模块】装入模块槽：顾客耐心 +1。');
_mod('mod_blast', '爆破熔炉模块', 150, '💥', 'blast', '【机器模块】装入熔炉：废料回收翻倍。');
_mod('mod_junk', '垃圾熔炉模块', 120, '🗑️', 'junk', '【机器模块】装入熔炉：垃圾合成额外产出。');
_mod('mod_chem_equip', '化学设备模块', 250, '🧪', 'chem', '【机器模块】装入模块槽：化学合成耗电 -20%，产出 +1。');
_mod('mod_neural_core', '封顶神经核心', 250, '🧠', 'neural', '【机器模块】装入模块槽：AI 扫描耗电减半，幸运 +10。');
_mod('mod_corrupted', '损坏的模块', 20, '⚙️', 'corrupted', '【机器模块】损坏件，可在熔炉回收废料。');
_mod('mod_ruined', '损毁的模块', 10, '⚙️', 'ruined', '【机器模块】损毁件，仅能回收少量废料。');
_mod('mod_blank', '空白模块', 30, '⚙️', 'blank', '【机器模块】空白壳，可烧录成任意基础模块。');
_mkTpl('mod_bay_kit', '模块舱扩容套件', 'tech', 150, '🔧', '【点击使用】模块槽上限 +2（最多 8 槽）。', { isUsable: 'module_bay' });
_mkTpl('mod_extractor_basic', '基础模块提取器', 'tech', 100, '🧲', '【点击使用】从损坏模块提取 1 个随机基础模块。', { isUsable: 'extract_basic' });
_mkTpl('mod_extractor_adv', '高级模块提取器', 'tech', 350, '🧲', '【点击使用】从损坏/损毁模块提取高级模块。', { isUsable: 'extract_adv' });
_mod('mod_hydro_speed', '水培加速模块', 90, '🌱', 'hydro_speed', '【机器模块】水培生长速度 +50%。');
_mod('mod_hydro_yield', '水培增产模块', 90, '🌱', 'hydro_yield', '【机器模块】水培产出 +1。');
_mod('mod_hydro_quality', '水培品质模块', 90, '🌱', 'hydro_quality', '【机器模块】水培产物估值 +15%。');
_mod('mod_hydro_auto', '水培自动模块', 110, '🤖', 'hydro_auto', '【机器模块】水培夜间自动产出。');
_mod('mod_hydro_light', '水培光照模块', 80, '💡', 'hydro_light', '【机器模块】水培耗电 -15%。');
_mod('mod_hydro_water', '水培节水模块', 80, '💧', 'hydro_water', '【机器模块】水培原料需求 -1。');
_mod('mod_hydro_temp', '水培温控模块', 85, '🌡️', 'hydro_temp', '【机器模块】水培成功率提升。');

// ---- 日用品/家用（原版全系） ----
_mkTpl('adv_water_filter', '高级滤水器', 'supply', 350, '🚰', '高级反渗透滤水器，净水效率翻倍。');
_mkTpl('aquascan', '水质扫描仪', 'tech', 200, '📡', '扫描水质纯度与辐射的便携仪器。');
_mkTpl('wash_4in1', '四合一洗涤剂', 'supply', 30, '🧴', '洗护合一的多功能洗涤剂。');
_mkTpl('pax_tampons', '帕克斯卫生棉条', 'supply', 100, '🧻', '空间站女性用品，需求稳定。');
_mkTpl('rex_condoms', '瑞克斯避孕套', 'supply', 35, '📦', '计生用品，底层需求旺盛。');
_mkTpl('gene_scanner', '基因扫描仪', 'tech', 500, '🧬', '扫描生物样本基因序列的高端仪器。');
_mkTpl('hydrorech_purifier', '海德拉微型净水器·改', 'tech', 325, '🚰', '海德拉便携净水器改良版。');
_mkTpl('nutrient_tablet', '水培营养片', 'material', 5, '💊', '水培系统核心营养补给，极廉价。');
_mkTpl('perfume_lessence', 'L\'ESSENCE 费洛蒙香水', 'luxury', 200, '🧴', '上层名流追捧的费洛蒙香水。');
_mkTpl('perfume_sync_std', 'SYNC 神经香水', 'luxury', 150, '🧴', '提升交谈好感的神经香水。');
_mkTpl('perfume_sync_refill', 'SYNC 自 refill 香水', 'luxury', 1000, '🧴', '【传说级】自 refill  refill 香水，富豪专享！');
_mkTpl('paper_towels', '纸巾', 'supply', 35, '🧻', '日常消耗纸巾。');
_mkTpl('toilet_paper', '卫生纸', 'supply', 25, '🧻', '空间站生活必需品。');
_mkTpl('scav_scanner', '拾荒扫描仪', 'tech', 250, '📡', '探测废墟物资的拾荒神器。');
_mkTpl('toothpaste', '牙膏', 'supply', 15, '🪥', '日常清洁用品。');
_mkTpl('uv_lamp', '紫外线灯', 'tech', 150, '💡', '消毒杀菌的紫外线灯。');
_mkTpl('water_filter_std', '滤水器', 'supply', 25, '🚰', '基础滤水器。');
_mkTpl('water_pitcher', '滤水壶', 'supply', 25, '🫗', '家用滤水壶。');
_mkTpl('purify_tablet', '净水片', 'supply', 6, '💊', '应急净水片，轻便廉价。');
_mkTpl('water_test_strip', '水质检测条', 'supply', 3, '🧪', '快速检测水质的试纸。');
_mkTpl('black_lamp', '黑光灯', 'tech', 120, '🔦', '紫外黑光灯，验钞与鉴伪两用。');
_mkTpl('magnifying_glass', '放大镜', 'tech', 50, '🔍', '鉴伪必备的放大镜。');
_mkTpl('plasma_cutter', '等离子切割器', 'tech', 80, '🔥', '切割金属的工业工具。');
_mkTpl('screwdriver', '螺丝刀', 'tech', 25, '🪛', '基础维修工具。');
_mkTpl('wire_cutter', '剪线钳', 'tech', 40, '✂️', '剪断电线的工具。');
_mkTpl('toolbox', '工具箱', 'container', 150, '🧰', '普通工具箱（非扩容容器，可出售）。', { slots: 1 });
_mkTpl('labeler', '标签机', 'tech', 50, '🏷️', '贴标签的办公小工具。');
_mkTpl('blue_labeler', '蓝色标签机', 'tech', 50, '🏷️', '蓝色款标签机。');
_mkTpl('appraisal_guide', '鉴定指南', 'supply', 50, '📕', '提升鉴伪成功率的手册。');
_mkTpl('appraisal_checker', '鉴定校验器', 'tech', 25, '🔍', '简易鉴定校验小工具。');

// ---- 食品饮料（原版全系） ----
_mkTpl('animal_fat', '动物脂肪', 'supply', 40, '🧈', '烹饪与化工两用油脂。');
_mkTpl('bei_icecream', '贝氏香草冰淇淋·大', 'supply', 40, '🍨', '贝氏大杯香草冰淇淋。', { frozen: true, chillable: true });
_mkTpl('reagent_acidic', '酸性试剂瓶', 'material', 3, '🧪', '化学合成酸性试剂。');
_mkTpl('reagent_basic', '碱性试剂瓶', 'material', 3, '🧪', '化学合成碱性试剂。');
_mkTpl('reagent_lipobond', '脂键合试剂瓶', 'material', 3, '🧪', '化学合成脂键合试剂。');
_mkTpl('reagent_nmethylol', 'N-甲基醇试剂瓶', 'material', 3, '🧪', '化学合成 N-甲基醇试剂。');
_mkTpl('reagent_reducing', '还原试剂瓶', 'material', 3, '🧪', '化学合成还原试剂。');
_mkTpl('bottled_water_micro', '瓶装水·微型', 'supply', 3, '💧', '迷你瓶装水。');
_mkTpl('bottled_water_small', '瓶装水·小型', 'supply', 4, '💧', '小型瓶装水。');
_mkTpl('bottled_water_std', '瓶装水·标准', 'supply', 5, '💧', '标准瓶装水。');
_mkTpl('bottled_water_large', '瓶装水·大型', 'supply', 9, '💧', '大型瓶装水。');
_mkTpl('bottled_water_jug', '瓶装水·水壶装', 'supply', 15, '💧', '整壶瓶装水。');
_mkTpl('ration_sealed_small', '密封口粮·小型', 'supply', 15, '🥫', '小型密封口粮。');
_mkTpl('ration_sealed_std', '密封口粮·标准', 'supply', 30, '🥫', '标准密封口粮。');
_mkTpl('cat_chocolate', '猫巧克力棒', 'supply', 15, '🍫', '猫咪造型的巧克力棒。');
_mkTpl('energy_drink', '能量饮料', 'supply', 18, '🥤', '提神能量饮料。');
_mkTpl('galaxy_blend', '繁星果糊', 'supply', 25, '🍓', '星际风味果糊。');
_mkTpl('hot_sauce', '辣椒酱', 'supply', 50, '🌶️', '下层区最爱的辣酱。');
_mkTpl('instant_ramen', '速食拉面', 'supply', 20, '🍜', '速食拉面，穷人福音。');
_mkTpl('lieat_bar', 'Li-Eat 营养棒', 'supply', 17, '🍫', '高热量营养棒。');
_mkTpl('morsel_small', '压缩口粮·小', 'supply', 15, '🥫', '小型压缩口粮。');
_mkTpl('offal', '内脏', 'supply', 12, '🥩', '廉价内脏食材。');
_mkTpl('peat_meat', '“泥炭”合成肉', 'supply', 25, '🥩', '泥炭合成的廉价肉食。');
_mkTpl('pilk', '碳酸代乳', 'supply', 16, '🥛', '碳酸代乳饮料。');
_mkTpl('processed_cheese', '加工奶酪', 'supply', 20, '🧀', '加工奶酪片。');
_mkTpl('puice_juice', '代糖果汁', 'supply', 14, '🧃', '代糖果汁。');
_mkTpl('raw_meat_small', '生肉·小型', 'supply', 65, '🥩', '小型冷鲜生肉。');
_mkTpl('raw_meat_std', '生肉·标准', 'supply', 159, '🥩', '标准冷鲜生肉。');
_mkTpl('soda_can', '汽水', 'supply', 15, '🥤', '普通汽水。');
_mkTpl('ribwich', '肋明治·普通版', 'supply', 150, '🥪', '普通版肋明治（非收藏版）。');
_mkTpl('caviar', '鱼子酱', 'luxury', 240, '🐟', '鲟鱼鱼子酱，上层珍馐！', { isFish: true });
_mkTpl('sturgeon_roe', '鲟鱼卵', 'luxury', 180, '🐟', '新鲜鲟鱼卵。', { isFish: true });
_mkTpl('fish_fillets', '鱼片', 'supply', 55, '🐠', '新鲜鱼片。', { isFish: true });
_mkTpl('bloomberry', '绽放莓', 'supply', 14, '🫐', '水培产出的绽放莓。', { isSeed: true });
_mkTpl('yeast_std', '酵母', 'supply', 10, '🍞', '酿酒酵母。');
_mkTpl('yeast_synth', '合成酵母', 'supply', 8, '🍞', '合成酵母。');
_mkTpl('yeast_super', '超级酵母', 'supply', 20, '🍞', '发酵效率极高的超级酵母。');
_mkTpl('yeast_bioreactor', '生物反应器酵母', 'supply', 250, '🧫', '生物反应器专用酵母。');
_mkTpl('wine_bottle', '葡萄酒瓶', 'luxury', 12, '🍷', '普通葡萄酒。', { isWine: true });
_mkTpl('bloomberry_wine', '绽放莓酒', 'luxury', 85, '🍷', '绽放莓酿造的果酒。', { isWine: true });
_mkTpl('gloomberry_wine', '幽暗莓酒', 'luxury', 95, '🍷', '幽暗莓酿造的果酒。', { isWine: true });
_mkTpl('aged_wine', '陈酿佳酿', 'luxury', 320, '🍷', '【AgeWell 陈酿】窖藏多年的顶级佳酿！', { isWine: true });
_mkTpl('coffee_beans', '咖啡豆', 'supply', 28, '☕', '水培/进口咖啡豆。');
_mkTpl('tilapia_live', '活罗非鱼', 'supply', 45, '🐟', '水产养殖的活罗非鱼。', { isFish: true });
_mkTpl('tilapia_fillet', '罗非鱼片', 'supply', 60, '🐟', '罗非鱼片。', { isFish: true });
_mkTpl('tilapia_skin', '罗非鱼皮移植片', 'medical', 130, '🩹', '水产养殖产出的医用鱼皮。', { isFish: true });
_mkTpl('sturgeon_live', '活鲟鱼', 'luxury', 220, '🐟', '活鲟鱼，鱼子酱来源。', { isFish: true });
_mkTpl('caviar_tin', '鱼子酱·铁盒装', 'luxury', 300, '🐟', '铁盒装顶级鱼子酱。', { isFish: true });
_mkTpl('fish_feed', '鱼饲料', 'material', 18, '🐟', '水产养殖饲料。', { isFish: true });

// ---- 种子与水培作物 ----
_mkTpl('bloomberry_seed', '绽放莓种子', 'material', 40, '🌱', '可水培种植绽放莓。', { isSeed: true });
_mkTpl('dream_cap', '梦幻菇', 'material', 23, '🍄', '水培产出的梦幻菇。', { isSeed: true });
_mkTpl('dream_cap_spores', '梦幻菇孢子', 'material', 24, '🍄', '梦幻菇孢子。', { isSeed: true });
_mkTpl('meal_cap', '餐菇', 'material', 19, '🍄', '可食用的餐菇。', { isSeed: true });
_mkTpl('nightmare_cap', '梦魇菇', 'material', 26, '🍄', '致幻梦魇菇。', { isSeed: true });
_mkTpl('fillerweed', '填充草', 'material', 11, '🌿', '水培填充草。', { isSeed: true });
_mkTpl('fillerweed_seed', '填充草种子', 'material', 9, '🌱', '填充草种子。', { isSeed: true });
_mkTpl('hydroreed_seed', '水芦苇种子', 'material', 20, '🌱', '水芦苇种子。', { isSeed: true });
_mkTpl('kotton_fiber', '韧棉纤维', 'material', 46, '🧶', '韧棉纤维。');
_mkTpl('kotton_seed', '韧棉种子', 'material', 20, '🌱', '韧棉种子。', { isSeed: true });
_mkTpl('kotton_lining', '韧棉衬里', 'material', 60, '🧶', '韧棉衬里布料。');
_mkTpl('nutrifruit', '营养果', 'supply', 12, '🍎', '水培营养果（刮刮乐头奖图案！）。', { isSeed: true });
_mkTpl('nutrifruit_seed', '营养果种子', 'material', 40, '🌱', '营养果种子。', { isSeed: true });

// ---- 材料/工业 ----
_mkTpl('filament_3d', '3D 打印耗材', 'material', 12, '🧵', '3D 打印机耗材线材。');
_mkTpl('chem_supplies_common', '普通化学物资', 'material', 50, '🧪', '普通化学物资。');
_mkTpl('chem_supplies_restricted', '管制化学物资', 'contraband', 100, '☣️', '管制化学物资。', { legal: 'contraband' });
_mkTpl('elec_parts_common', '普通电子零件', 'material', 33, '🔌', '普通电子零件。');
_mkTpl('elec_parts_rare', '稀有电子零件', 'material', 350, '🔌', '稀有电子零件。');
_mkTpl('flux_basic', '基础助熔剂', 'material', 4, '🧪', '基础助熔剂。');
_mkTpl('flux_adv', '高级助熔剂', 'material', 300, '🧪', '高级助熔剂。');
_mkTpl('gun_parts', '枪械零件', 'material', 25, '🔧', '枪械改装零件。');
_mkTpl('junk_scrap', '垃圾废料', 'material', 3, '🗑️', '熔炉回收的垃圾废料。');
_mkTpl('med_supplies_common', '普通医疗物资', 'material', 40, '🩹', '普通医疗物资。');
_mkTpl('metal_ingot', '金属锭', 'material', 50, '🧱', '精炼金属锭。');
_mkTpl('metal_ore', '金属矿石', 'material', 15, '⛏️', '金属矿石。');
_mkTpl('rare_ore', '稀有矿石', 'material', 30, '💎', '稀有矿石。');
_mkTpl('radioactive_waste', '放射性废料', 'contraband', 0, '☢️', '放射性废料，危险品！', { legal: 'contraband' });
_mkTpl('wire_coil', '电线', 'material', 16, '🔌', '铜电线。');
_mkTpl('metal_screws', '金属螺丝', 'material', 14, '🔩', '金属螺丝。');
_mkTpl('turbo_disposable', '一次性涡轮增压器', 'tech', 35, '🚀', '【点击使用】一次性提速机器。', { isUsable: 'turbo' });
_mkTpl('turbo_adv', '高级涡轮增压器', 'tech', 300, '🚀', '【点击使用】高级提速。', { isUsable: 'turbo' });
_mkTpl('turbo_hyper', '超科技涡轮增压器', 'tech', 15000, '🚀', '【传说级】超科技涡轮增压器！', { isUsable: 'turbo' });
_mkTpl('energy_cell_mk2', '聚变电池·Mk.II', 'tech', 30, '🔋', '二代聚变电池。', { isUsable: 'charge_power' });

// ---- 医疗（原版全系） ----
_mkTpl('blue_blood_bag', '“蓝血”血袋', 'contraband', 250, '🩸', '军用蓝血血袋。', { legal: 'contraband' });
_mkTpl('blood_bag', '血袋', 'medical', 33, '🩸', '普通血袋。');
_mkTpl('bandage_basic', '基础绷带', 'medical', 8, '🩹', '基础绷带。');
_mkTpl('bandage_hemostatic', '止血绷带', 'medical', 16, '🩹', '止血绷带。');
_mkTpl('bandage_topical', '外用绷带', 'medical', 16, '🩹', '外用绷带。');
_mkTpl('birth_control_pill', '避孕药', 'medical', 15, '💊', '避孕药。');
_mkTpl('caffeine_pill', '咖啡因片', 'medical', 10, '💊', '提神咖啡因片。');
_mkTpl('nightingale_salve', '夜莺药膏', 'medical', 80, '🧴', '夜莺牌万能药膏。');
_mkTpl('nomore_injector', '奥克莫吸注射器', 'medical', 50, '💉', '奥克莫吸注射器。');
_mkTpl('phagimycin', '噬菌霉素', 'medical', 25, '💉', '噬菌霉素。');
_mkTpl('phagimycin_unlicensed', '未授权噬菌霉素', 'contraband', 5, '💉', '未授权噬菌霉素。', { legal: 'contraband' });
_mkTpl('phanta_pill', '芬太片', 'contraband', 12, '💊', '芬太片，违禁药片。', { legal: 'contraband' });
_mkTpl('rubbing_alcohol', '医用酒精', 'medical', 35, '🧴', '医用酒精。');
_mkTpl('smelling_salts', '嗅盐', 'medical', 15, '🧂', '嗅盐。');
_mkTpl('synaprest_injector', '赛纳普斯注射器', 'medical', 350, '💉', '赛纳普斯注射器（伦警官成瘾剧情关键！）。');
_mkTpl('dream_dust_vial', '梦魇尘·小瓶', 'contraband', 18, '🔮', '梦魇尘小瓶。', { legal: 'contraband' });
_mkTpl('nightmare_dust_vial', '梦魇尘·大瓶', 'contraband', 36, '🔮', '梦魇尘大瓶。', { legal: 'contraband' });
_mkTpl('zerochew_tab', '零嚼片', 'medical', 8, '💊', '零嚼片。');
_mkTpl('zyanide_pill', '山奈德片', 'contraband', 33, '💊', '山奈德片，剧毒。', { legal: 'contraband' });

// ---- 武器/弹药/近战/爆炸物（原版全系） ----
_mkTpl('smoke_grenade', '烟雾弹', 'weapon', 60, '💨', '烟雾弹。', { legal: 'permit_arms' });
_mkTpl('plastic_explosive', '塑胶炸药', 'contraband', 250, '🧨', '塑胶炸药。', { legal: 'contraband' });
_mkTpl('plastic_explosive_armed', '已武装塑胶炸药', 'contraband', 250, '🧨', '已武装塑胶炸药，极危险！', { legal: 'contraband' });
_mkTpl('ammo_22_sr', '.22 SR 弹药', 'weapon', 20, '🔸', '.22 标准弹药。', { legal: 'permit_arms' });
_mkTpl('ammo_22_ap', '.22 穿甲弹', 'weapon', 26, '🔸', '.22 穿甲弹。', { legal: 'permit_arms' });
_mkTpl('ammo_22_nonlethal', '.22 非致命弹', 'weapon', 14, '🔸', '.22 非致命弹。', { legal: 'permit_arms' });
_mkTpl('ammo_10mm_ap', '10mm 穿甲弹', 'weapon', 36, '🧨', '10mm 穿甲弹。', { legal: 'permit_arms' });
_mkTpl('ammo_10mm_nonlethal', '10mm 非致命弹', 'weapon', 24, '🧨', '10mm 非致命弹。', { legal: 'permit_arms' });
_mkTpl('liberator_pistol', '解放者 3D 打印手枪', 'weapon', 40, '🔫', '3D 打印的解放者手枪。', { legal: 'permit_arms' });
_mkTpl('tazer', '电击枪', 'weapon', 100, '⚡', '电击枪。', { legal: 'permit_arms' });
_mkTpl('nestfire_compact', '巢火紧凑型枪', 'weapon', 120, '🔫', '巢火紧凑型枪。', { legal: 'permit_arms' });
_mkTpl('ironcraft_10', '铁匠10·改', 'weapon', 160, '🔫', '铁匠10 改良版。', { legal: 'permit_arms' });
_mkTpl('sentinel_mk3', '哨兵 Mk.III', 'contraband', 200, '🔫', '哨兵 Mk.III 脉冲枪。', { legal: 'contraband' });
_mkTpl('lancewell_revolver', '兰斯韦尔左轮', 'weapon', 240, '🔫', '兰斯韦尔左轮手枪。', { legal: 'permit_arms' });
_mkTpl('pulseguard_stun', '脉冲卫士电击枪', 'weapon', 250, '⚡', '脉冲卫士电击枪。', { legal: 'permit_arms' });
_mkTpl('peacemaker_smg', '和平使者重型冲锋枪', 'contraband', 280, '🔫', '和平使者重型冲锋枪。', { legal: 'contraband' });
_mkTpl('rampart_shotgun', '壁垒双动霰弹枪', 'weapon', 310, '🔫', '壁垒双动霰弹枪。', { legal: 'permit_arms' });
_mkTpl('glass_shiv', '玻璃刀片', 'weapon', 8, '🔪', '玻璃刀片。', { legal: 'permit_arms' });
_mkTpl('lead_pipe', '铅管', 'weapon', 15, '🔧', '铅管。', { legal: 'permit_arms' });
_mkTpl('box_cutter', '美工刀', 'weapon', 28, '🔪', '美工刀。', { legal: 'permit_arms' });
_mkTpl('kitchen_knife', '厨房刀', 'weapon', 45, '🔪', '厨房刀。', { legal: 'permit_arms' });
_mkTpl('hatchet', '小斧', 'weapon', 55, '🪓', '小斧。', { legal: 'permit_arms' });
_mkTpl('meat_cleaver', '砍肉刀', 'weapon', 65, '🔪', '砍肉刀。', { legal: 'permit_arms' });
_mkTpl('crowbar', '撬棍', 'weapon', 75, '🔧', '撬棍。', { legal: 'permit_arms' });
_mkTpl('skinning_knife', '剥皮刀', 'weapon', 100, '🔪', '剥皮刀。', { legal: 'permit_arms' });
_mkTpl('stun_baton', '电击棍', 'weapon', 165, '⚡', '电击棍。', { legal: 'permit_arms' });

// ---- 霓虹招牌/手册/磁带/原创深空物品 ----
_mkTpl('neon_food', '“食品”霓虹招牌', 'tech', 100, '💡', '食品店霓虹招牌，吸引顾客。');
_mkTpl('neon_household', '“日用”霓虹招牌', 'tech', 100, '💡', '日用品店霓虹招牌。');
_mkTpl('neon_material', '“材料”霓虹招牌', 'tech', 100, '💡', '材料店霓虹招牌。');
_mkTpl('neon_water', '“净水”霓虹招牌', 'tech', 100, '💡', '净水店霓虹招牌。');
_mkTpl('neon_medical', '“医药”霓虹招牌', 'tech', 200, '💡', '医药店霓虹招牌。');
_mkTpl('manual_water', '净水手册', 'supply', 50, '📕', '净水技术手册。');
_mkTpl('manual_gunsmith', '枪械手册', 'supply', 50, '📕', '枪械改装手册。');
_mkTpl('manual_chemist', '化学手册', 'supply', 50, '📕', '化学合成手册。');
_mkTpl('manual_aqua', '水产手册', 'supply', 50, '📕', '水产养殖手册。');
_mkTpl('manual_appraisal', '鉴定手册', 'supply', 50, '📕', '鉴定技术手册。');
_mkTpl('cassette_synth', '合成波磁带', 'luxury', 75, '📼', '合成波音乐磁带。');
_mkTpl('cassette_jazz', '爵士磁带', 'luxury', 75, '📼', '爵士乐磁带。');
_mkTpl('cassette_rock', '摇滚磁带', 'luxury', 75, '📼', '摇滚乐磁带。');
_mkTpl('cassette_classical', '古典磁带', 'luxury', 75, '📼', '古典乐磁带。');
_mkTpl('cassette_ambient', '氛围磁带', 'luxury', 75, '📼', '氛围音乐磁带。');
_mkTpl('deepspace_relic', '深空遗物·原创', 'luxury', 450, '🛸', '【原创】深空遗迹碎片，神秘发光。');
_mkTpl('star_core', '星核碎片·原创', 'tech', 380, '⭐', '【原创】恒星核心碎片。');
_mkTpl('void_shard', '虚空碎片·原创', 'contraband', 290, '🌌', '【原创】虚空碎片，违禁神秘物。', { legal: 'contraband' });
_mkTpl('nebula_pearl', '星云珍珠·原创', 'luxury', 260, '🦪', '【原创】星云珍珠。');
_mkTpl('moon_rock', '月岩标本·原创', 'material', 140, '🌕', '【原创】月岩标本。');
_mkTpl('comet_ice', '彗星冰·原创', 'supply', 90, '☄️', '【原创】彗星冰。');
_mkTpl('alien_egg', '异星卵·原创', 'supply', 110, '🥚', '【原创】异星卵。');
_mkTpl('plasma_orb', '等离子球·原创', 'tech', 210, '🔮', '【原创】等离子球。');
_mkTpl('dark_matter', '暗物质样本·原创', 'contraband', 330, '🌑', '【原创】暗物质样本。', { legal: 'contraband' });
_mkTpl('solar_cell', '太阳能板', 'tech', 95, '☀️', '太阳能板。');
_mkTpl('fusion_core', '聚变核心', 'tech', 420, '☀️', '聚变核心。');
_mkTpl('ai_chip', 'AI 芯片', 'tech', 280, '🧠', 'AI 芯片。');
_mkTpl('neural_link', '神经链接器', 'tech', 240, '🧠', '神经链接器。');
_mkTpl('holo_projector', '全息投影器', 'tech', 190, '📽️', '全息投影器。');
_mkTpl('drone_part', '无人机零件', 'tech', 85, '🛸', '无人机零件。');
_mkTpl('shield_generator', '护盾发生器', 'tech', 310, '🛡️', '护盾发生器。');
_mkTpl('gravity_boots', '重力靴', 'tech', 170, '🥾', '重力靴。');
_mkTpl('exo_skeleton', '外骨骼', 'tech', 390, '🦾', '外骨骼装甲。');
_mkTpl('med_gel', '医疗凝胶', 'medical', 70, '🧴', '医疗凝胶。');
_mkTpl('nano_swarm', '纳米蜂群', 'tech', 360, '🐝', '纳米蜂群。');
_mkTpl('teleport_coil', '传送线圈', 'tech', 340, '🌀', '传送线圈。');
_mkTpl('time_capsule', '时间胶囊', 'luxury', 150, '⏳', '时间胶囊。');
_mkTpl('old_earth_coin', '古地球金币', 'luxury', 220, '🪙', '古地球金币。');
_mkTpl('mars_soil', '火星土壤', 'material', 60, '🔴', '火星土壤。');
_mkTpl('lunar_dust', '月尘', 'material', 55, '🌕', '月尘。');
_mkTpl('asteroid_ore', '小行星矿石', 'material', 75, '☄️', '小行星矿石。');
_mkTpl('titanium_plate', '钛合金板', 'material', 65, '🔩', '钛合金板。');
_mkTpl('carbon_fiber', '碳纤维', 'material', 80, '🧶', '碳纤维。');
_mkTpl('graphene_sheet', '石墨烯片', 'material', 120, '⬛', '石墨烯片。');
_mkTpl('superconductor', '超导体', 'tech', 290, '🧲', '超导体。');
_mkTpl('quantum_chip', '量子芯片', 'tech', 410, '⚛️', '量子芯片。');
_mkTpl('bio_chip', '生物芯片', 'tech', 230, '🧬', '生物芯片。');
_mkTpl('gene_sample', '基因样本', 'medical', 160, '🧬', '基因样本。');
_mkTpl('stem_cells', '干细胞', 'medical', 190, '🧬', '干细胞。');
_mkTpl('antidote', '解毒剂', 'medical', 110, '💉', '解毒剂。');
_mkTpl('painkiller', '止痛药', 'medical', 45, '💊', '止痛药。');
_mkTpl('stimulant', '兴奋剂', 'contraband', 140, '💊', '兴奋剂。', { legal: 'contraband' });
_mkTpl('sedative', '镇静剂', 'medical', 65, '💊', '镇静剂。');
_mkTpl('vitamin_pack', '维生素包', 'medical', 30, '💊', '维生素包。');
_mkTpl('protein_powder', '蛋白粉', 'supply', 35, '🥛', '蛋白粉。');
_mkTpl('space_rations', '太空口粮', 'supply', 42, '🥫', '太空口粮。');
_mkTpl('freeze_dried', '冻干食品', 'supply', 38, '🍲', '冻干食品。');
_mkTpl('mre_pack', '军用口粮包', 'supply', 48, '🥫', '军用口粮包。');
_mkTpl('survival_kit', '生存工具包', 'supply', 85, '🎒', '生存工具包。');
_mkTpl('tent', '帐篷', 'supply', 120, '⛺', '帐篷。');
_mkTpl('sleeping_bag', '睡袋', 'supply', 70, '🛏️', '睡袋。');
_mkTpl('campfire_kit', '营火套件', 'supply', 55, '🔥', '营火套件。');
_mkTpl('fishing_rod', '鱼竿', 'tech', 60, '🎣', '鱼竿。');
_mkTpl('net', '渔网', 'material', 40, '🥅', '渔网。');
_mkTpl('aqua_filter', '水产滤芯', 'material', 45, '🐟', '水产滤芯。', { isFish: true });
_mkTpl('oxygen_tank', '氧气瓶', 'tech', 130, '🫧', '氧气瓶。');
_mkTpl('air_scrubber', '空气净化器', 'tech', 180, '🌬️', '空气净化器。');
_mkTpl('radiation_suit', '防辐射服', 'tech', 200, '☢️', '防辐射服。');
_mkTpl('geiger_counter', '盖革计数器', 'tech', 110, '☢️', '盖革计数器。');
_mkTpl('lead_lining', '铅衬里', 'material', 70, '🧱', '铅衬里。');
_mkTpl('hazmat_container', '危险品容器', 'container', 90, '☢️', '危险品容器（普通容器）。', { slots: 1 });
_mkTpl('evidence_bag', '物证袋', 'supply', 20, '🛍️', '物证袋。');
_mkTpl('handcuffs', '手铐', 'tech', 45, '⛓️', '手铐。');
_mkTpl('baton', '警棍', 'weapon', 50, '🔧', '警棍。', { legal: 'permit_arms' });
_mkTpl('shield', '防暴盾', 'weapon', 95, '🛡️', '防暴盾。', { legal: 'permit_arms' });
_mkTpl('tear_gas', '催泪瓦斯', 'weapon', 65, '💨', '催泪瓦斯。', { legal: 'permit_arms' });
_mkTpl('flare', '信号弹', 'weapon', 30, '🎆', '信号弹。', { legal: 'permit_arms' });
_mkTpl('laser_sight', '激光瞄具', 'tech', 75, '🔭', '激光瞄具。');
_mkTpl('scope', '狙击镜', 'tech', 140, '🔭', '狙击镜。');
_mkTpl('suppressor', '消音器', 'weapon', 90, '🔇', '消音器。', { legal: 'permit_arms' });
_mkTpl('magazine', '弹匣', 'weapon', 35, '🧨', '弹匣。', { legal: 'permit_arms' });
_mkTpl('rifle_scope', '步枪瞄具', 'tech', 150, '🔭', '步枪瞄具。');
_mkTpl('red_dot', '红点瞄具', 'tech', 85, '🔭', '红点瞄具。');
_mkTpl('night_vision', '夜视仪', 'tech', 220, '🥽', '夜视仪。');
_mkTpl('thermal_scope', '热成像仪', 'tech', 260, '🌡️', '热成像仪。');
_mkTpl('range_finder', '测距仪', 'tech', 95, '📐', '测距仪。');
_mkTpl('gps_module', 'GPS 模块', 'tech', 105, '📍', 'GPS 模块。');
_mkTpl('radio', '电台', 'tech', 80, '📻', '电台。');
_mkTpl('sat_phone', '卫星电话', 'tech', 240, '📱', '卫星电话。');
_mkTpl('tablet', '平板电脑', 'tech', 170, '📟', '平板电脑。');
_mkTpl('laptop', '笔记本电脑', 'tech', 230, '💻', '笔记本电脑。');
_mkTpl('server_core', '服务器核心', 'tech', 380, '🖥️', '服务器核心。');
_mkTpl('data_core', '数据核心', 'tech', 300, '💾', '数据核心。');
_mkTpl('memory_chip', '内存芯片', 'tech', 120, '💾', '内存芯片。');
_mkTpl('cpu', '处理器', 'tech', 200, '🧠', '处理器。');
_mkTpl('gpu', '显卡', 'tech', 260, '🎮', '显卡。');
_mkTpl('motherboard', '主板', 'tech', 150, '🔌', '主板。');
_mkTpl('hard_drive', '硬盘', 'tech', 110, '💾', '硬盘。');
_mkTpl('ssd', '固态硬盘', 'tech', 130, '💾', '固态硬盘。');
_mkTpl('battery_pack', '电池组', 'tech', 65, '🔋', '电池组。', { isUsable: 'charge_power' });
_mkTpl('solar_panel', '太阳能电池板', 'tech', 140, '☀️', '太阳能电池板。');
_mkTpl('wind_turbine', '风力涡轮', 'tech', 190, '🌬️', '风力涡轮。');
_mkTpl('hydro_turbine', '水力涡轮', 'tech', 210, '💧', '水力涡轮。');
_mkTpl('geothermal', '地热模块', 'tech', 240, '🌋', '地热模块。');
_mkTpl('reactor_coolant', '反应堆冷却剂', 'material', 100, '☢️', '反应堆冷却剂。');
_mkTpl('plasma_cell', '等离子电池', 'tech', 180, '🔋', '等离子电池。', { isUsable: 'charge_power' });
_mkTpl('antimatter_cell', '反物质电池', 'tech', 500, '🌌', '反物质电池。', { isUsable: 'charge_power' });
_mkTpl('zero_point', '零点能核心', 'tech', 450, '⚡', '零点能核心。');
_mkTpl('dark_energy', '暗能量电池', 'tech', 470, '🌑', '暗能量电池。', { isUsable: 'charge_power' });
_mkTpl('exotic_matter', '奇异物质', 'contraband', 390, '🌌', '奇异物质。', { legal: 'contraband' });
_mkTpl('strange_matter', '奇异物质·改', 'contraband', 410, '🌌', '奇异物质改良版。', { legal: 'contraband' });
_mkTpl('wormhole_seed', '虫洞种子·原创', 'tech', 430, '🌀', '【原创】虫洞种子。');
_mkTpl('gravity_core', '重力核心', 'tech', 360, '🌍', '重力核心。');
_mkTpl('time_crystal', '时间水晶·原创', 'luxury', 440, '⏰', '【原创】时间水晶。');
_mkTpl('soul_gem', '灵魂宝石·原创', 'luxury', 420, '💎', '【原创】灵魂宝石。');
_mkTpl('phoenix_feather', '凤凰羽·原创', 'luxury', 280, '🪶', '【原创】凤凰羽。');
_mkTpl('dragon_scale', '龙鳞·原创', 'luxury', 300, '🐉', '【原创】龙鳞。');
_mkTpl('unicorn_horn', '独角兽角·原创', 'luxury', 310, '🦄', '【原创】独角兽角。');
_mkTpl('mermaid_tear', '美人鱼之泪·原创', 'luxury', 270, '🧜', '【原创】美人鱼之泪。');
_mkTpl('elf_stone', '精灵石·原创', 'luxury', 250, '🧝', '【原创】精灵石。');
_mkTpl('dwarf_gem', '矮人宝石·原创', 'luxury', 240, '⛏️', '【原创】矮人宝石。');
_mkTpl('troll_bone', '巨魔骨·原创', 'material', 130, '🦴', '【原创】巨魔骨。');
_mkTpl('goblin_ear', '哥布林耳·原创', 'material', 90, '👺', '【原创】哥布林耳。');
_mkTpl('orc_tusk', '兽人獠牙·原创', 'material', 110, '🐗', '【原创】兽人獠牙。');
_mkTpl('vampire_fang', '吸血鬼獠牙·原创', 'luxury', 200, '🧛', '【原创】吸血鬼獠牙。');
_mkTpl('werewolf_claw', '狼人爪·原创', 'material', 120, '🐺', '【原创】狼人爪。');
_mkTpl('zombie_brain', '僵尸脑·原创', 'medical', 150, '🧟', '【原创】僵尸脑。');
_mkTpl('skeleton_key', '骷髅钥匙·原创', 'tech', 160, '🗝️', '【原创】骷髅钥匙。');
_mkTpl('magic_scroll', '魔法卷轴·原创', 'luxury', 230, '📜', '【原创】魔法卷轴。');
_mkTpl('potion_health', '生命药水·原创', 'medical', 120, '🧪', '【原创】生命药水。');
_mkTpl('potion_mana', '法力药水·原创', 'medical', 120, '🧪', '【原创】法力药水。');
_mkTpl('elixir_life', '长生不老药·原创', 'luxury', 480, '⚗️', '【原创】长生不老药。');
_mkTpl('phoenix_egg', '凤凰蛋·原创', 'luxury', 460, '🐦‍🔥', '【原创】凤凰蛋。');
_mkTpl('world_tree_leaf', '世界树之叶·原创', 'luxury', 290, '🌳', '【原创】世界树之叶。');
_mkTpl('star_map', '星图·原创', 'luxury', 260, '🗺️', '【原创】星图。');
_mkTpl('ancient_coin', '古代金币·原创', 'luxury', 210, '🪙', '【原创】古代金币。');
_mkTpl('royal_seal', '皇家印玺·原创', 'luxury', 350, '👑', '【原创】皇家印玺。');
_mkTpl('crown_jewel', '王冠宝石·原创', 'luxury', 490, '👑', '【原创】王冠宝石。');
_mkTpl('holy_grail', '圣杯·原创', 'luxury', 500, '🏆', '【原创】圣杯。');
_mkTpl(' philosopher_stone', '贤者之石·原创', 'luxury', 495, '🪨', '【原创】贤者之石。');
_mkTpl('infinity_stone', '无限宝石·原创', 'luxury', 498, '💎', '【原创】无限宝石。');
_mkTpl('dragon_egg', '龙蛋·原创', 'luxury', 470, '🐲', '【原创】龙蛋。');
_mkTpl('griffin_feather', '狮鹫羽·原创', 'luxury', 240, '🦅', '【原创】狮鹫羽。');
_mkTpl('pegasus_hair', '飞马鬃·原创', 'luxury', 220, '🐴', '【原创】飞马鬃。');
_mkTpl('centaur_hoof', '半人马蹄·原创', 'material', 100, '🐴', '【原创】半人马蹄。');
_mkTpl('minotaur_horn', '牛头人角·原创', 'material', 115, '🐂', '【原创】牛头人角。');
_mkTpl('cyclops_eye', '独眼巨人眼·原创', 'medical', 180, '👁️', '【原创】独眼巨人眼。');
_mkTpl('hydra_scale', '九头蛇鳞·原创', 'material', 140, '🐍', '【原创】九头蛇鳞。');
_mkTpl('kraken_tentacle', '海怪触手·原创', 'supply', 130, '🐙', '【原创】海怪触手。');
_mkTpl('leviathan_heart', '利维坦之心·原创', 'luxury', 430, '🐋', '【原创】利维坦之心。');
_mkTpl('behemoth_tooth', '贝希摩斯之牙·原创', 'material', 170, '🦷', '【原创】贝希摩斯之牙。');
_mkTpl('ziz_bone', '鹏骨·原创', 'material', 125, '🦅', '【原创】鹏骨。');
_mkTpl('roc_egg', '大鹏蛋·原创', 'luxury', 380, '🥚', '【原创】大鹏蛋。');
_mkTpl('garuda_feather', '迦楼罗羽·原创', 'luxury', 260, '🪶', '【原创】迦楼罗羽。');
_mkTpl('phoenix_blood', '凤凰血·原创', 'medical', 400, '🩸', '【原创】凤凰血。');
_mkTpl('dragon_blood', '龙血·原创', 'medical', 390, '🩸', '【原创】龙血。');
_mkTpl('unicorn_blood', '独角兽血·原创', 'medical', 370, '🩸', '【原创】独角兽血。');
_mkTpl('mermaid_scale', '美人鱼鳞·原创', 'luxury', 230, '🧜', '【原创】美人鱼鳞。');
_mkTpl('fairy_dust', '妖精尘·原创', 'luxury', 210, '🧚', '【原创】妖精尘。');
_mkTpl('pixie_wing', '小妖精翼·原创', 'luxury', 190, '🧚', '【原创】小妖精翼。');
_mkTpl('angel_feather', '天使羽·原创', 'luxury', 320, '👼', '【原创】天使羽。');
_mkTpl('demon_horn', '恶魔角·原创', 'contraband', 240, '😈', '【原创】恶魔角。', { legal: 'contraband' });
_mkTpl('hellfire', '地狱火·原创', 'contraband', 280, '🔥', '【原创】地狱火。', { legal: 'contraband' });
_mkTpl('soul_stone', '灵魂石·原创', 'luxury', 300, '👻', '【原创】灵魂石。');
_mkTpl('ghost_essence', '幽灵精华·原创', 'luxury', 260, '👻', '【原创】幽灵精华。');
_mkTpl('shadow_essence', '暗影精华·原创', 'contraband', 270, '🌑', '【原创】暗影精华。', { legal: 'contraband' });
_mkTpl('light_essence', '光明精华·原创', 'luxury', 280, '☀️', '【原创】光明精华。');
_mkTpl('storm_essence', '风暴精华·原创', 'tech', 250, '⛈️', '【原创】风暴精华。');
_mkTpl('earth_essence', '大地精华·原创', 'material', 200, '🌍', '【原创】大地精华。');
_mkTpl('water_essence', '水之精华·原创', 'material', 210, '💧', '【原创】水之精华。');
_mkTpl('fire_essence', '火之精华·原创', 'material', 220, '🔥', '【原创】火之精华。');
_mkTpl('metal_essence', '金属精华·原创', 'material', 190, '⚙️', '【原创】金属精华。');
_mkTpl('wood_essence', '木之精华·原创', 'material', 180, '🌲', '【原创】木之精华。');
_mkTpl('space_essence', '空间精华·原创', 'tech', 340, '🌌', '【原创】空间精华。');
_mkTpl('time_essence', '时间精华·原创', 'tech', 350, '⏰', '【原创】时间精华。');
_mkTpl('life_essence', '生命精华·原创', 'medical', 330, '💚', '【原创】生命精华。');
_mkTpl('death_essence', '死亡精华·原创', 'contraband', 310, '💀', '【原创】死亡精华。', { legal: 'contraband' });
_mkTpl('void_essence', '虚空精华·原创', 'contraband', 360, '🕳️', '【原创】虚空精华。', { legal: 'contraband' });
_mkTpl('chaos_essence', '混沌精华·原创', 'contraband', 370, '🌀', '【原创】混沌精华。', { legal: 'contraband' });
_mkTpl('order_essence', '秩序精华·原创', 'luxury', 340, '⚖️', '【原创】秩序精华。');
_mkTpl('dream_essence', '梦境精华·原创', 'luxury', 320, '💭', '【原创】梦境精华。');
_mkTpl('nightmare_essence', '梦魇精华·原创', 'contraband', 330, '😱', '【原创】梦魇精华。', { legal: 'contraband' });
_mkTpl('hope_essence', '希望精华·原创', 'luxury', 310, '🌟', '【原创】希望精华。');
_mkTpl('fear_essence', '恐惧精华·原创', 'contraband', 300, '😨', '【原创】恐惧精华。', { legal: 'contraband' });
_mkTpl('joy_essence', '欢乐精华·原创', 'luxury', 290, '😄', '【原创】欢乐精华。');
_mkTpl('sorrow_essence', '悲伤精华·原创', 'luxury', 280, '😢', '【原创】悲伤精华。');
_mkTpl('anger_essence', '愤怒精华·原创', 'contraband', 270, '😡', '【原创】愤怒精华。', { legal: 'contraband' });
_mkTpl('love_essence', '爱情精华·原创', 'luxury', 300, '❤️', '【原创】爱情精华。');
_mkTpl('hate_essence', '仇恨精华·原创', 'contraband', 260, '💔', '【原创】仇恨精华。', { legal: 'contraband' });
_mkTpl('wisdom_essence', '智慧精华·原创', 'luxury', 330, '🦉', '【原创】智慧精华。');
_mkTpl('power_essence', '力量精华·原创', 'tech', 320, '💪', '【原创】力量精华。');
_mkTpl('speed_essence', '速度精华·原创', 'tech', 310, '💨', '【原创】速度精华。');
_mkTpl('strength_essence', '体力精华·原创', 'medical', 290, '🏋️', '【原创】体力精华。');
_mkTpl('agility_essence', '敏捷精华·原创', 'tech', 300, '🤸', '【原创】敏捷精华。');
_mkTpl('intelligence_essence', '智力精华·原创', 'tech', 340, '🧠', '【原创】智力精华。');
_mkTpl('charisma_essence', '魅力精华·原创', 'luxury', 320, '😎', '【原创】魅力精华。');
_mkTpl('luck_essence', '幸运精华·原创', 'luxury', 350, '🍀', '【原创】幸运精华。');
_mkTpl('fate_essence', '命运精华·原创', 'luxury', 380, '🔮', '【原创】命运精华。');
_mkTpl('soul_essence', '灵魂精华·原创', 'luxury', 360, '👻', '【原创】灵魂精华。');
_mkTpl('spirit_essence', '精神精华·原创', 'medical', 330, '🧘', '【原创】精神精华。');
_mkTpl('body_essence', '肉体精华·原创', 'medical', 310, '💪', '【原创】肉体精华。');
_mkTpl('blood_essence', '血液精华·原创', 'medical', 320, '🩸', '【原创】血液精华。');
_mkTpl('bone_essence', '骨骼精华·原创', 'medical', 280, '🦴', '【原创】骨骼精华。');
_mkTpl('skin_essence', '皮肤精华·原创', 'medical', 260, '🧴', '【原创】皮肤精华。');
_mkTpl('eye_essence', '眼睛精华·原创', 'medical', 300, '👁️', '【原创】眼睛精华。');
_mkTpl('heart_essence', '心脏精华·原创', 'medical', 340, '❤️', '【原创】心脏精华。');
_mkTpl('lung_essence', '肺部精华·原创', 'medical', 270, '🫁', '【原创】肺部精华。');
_mkTpl('liver_essence', '肝脏精华·原创', 'medical', 260, '🫀', '【原创】肝脏精华。');
_mkTpl('kidney_essence', '肾脏精华·原创', 'medical', 270, '🫘', '【原创】肾脏精华。');
_mkTpl('brain_essence', '大脑精华·原创', 'medical', 350, '🧠', '【原创】大脑精华。');
_mkTpl('nerve_essence', '神经精华·原创', 'medical', 310, '⚡', '【原创】神经精华。');
_mkTpl('muscle_essence', '肌肉精华·原创', 'medical', 280, '💪', '【原创】肌肉精华。');
_mkTpl('fat_essence', '脂肪精华·原创', 'medical', 240, '🧈', '【原创】脂肪精华。');
_mkTpl('protein_essence', '蛋白精华·原创', 'medical', 250, '🥚', '【原创】蛋白精华。');
_mkTpl('dna_sample', 'DNA 样本', 'medical', 200, '🧬', 'DNA 样本。');
_mkTpl('rna_sample', 'RNA 样本', 'medical', 190, '🧬', 'RNA 样本。');
_mkTpl('protein_sample', '蛋白质样本', 'medical', 170, '🧬', '蛋白质样本。');
_mkTpl('cell_sample', '细胞样本', 'medical', 180, '🔬', '细胞样本。');
_mkTpl('tissue_sample', '组织样本', 'medical', 160, '🔬', '组织样本。');
_mkTpl('blood_sample', '血液样本', 'medical', 150, '🩸', '血液样本。');
_mkTpl('urine_sample', '尿液样本', 'medical', 80, '🧪', '尿液样本。');
_mkTpl('saliva_sample', '唾液样本', 'medical', 70, '🧪', '唾液样本。');
_mkTpl('hair_sample', '毛发样本', 'medical', 60, '💇', '毛发样本。');
_mkTpl('nail_sample', '指甲样本', 'medical', 55, '💅', '指甲样本。');
_mkTpl('skin_sample', '皮肤样本', 'medical', 65, '🧴', '皮肤样本。');
_mkTpl('bone_sample', '骨骼样本', 'medical', 90, '🦴', '骨骼样本。');
_mkTpl('muscle_sample', '肌肉样本', 'medical', 85, '💪', '肌肉样本。');
_mkTpl('nerve_sample', '神经样本', 'medical', 95, '⚡', '神经样本。');
_mkTpl('brain_sample', '脑组织样本', 'medical', 120, '🧠', '脑组织样本。');
_mkTpl('heart_sample', '心脏样本', 'medical', 110, '❤️', '心脏样本。');
_mkTpl('lung_sample', '肺样本', 'medical', 100, '🫁', '肺样本。');
_mkTpl('liver_sample', '肝样本', 'medical', 95, '🫀', '肝样本。');
_mkTpl('kidney_sample', '肾样本', 'medical', 95, '🫘', '肾样本。');
_mkTpl('spleen_sample', '脾样本', 'medical', 85, '🫀', '脾样本。');
_mkTpl('pancreas_sample', '胰腺样本', 'medical', 90, '🫀', '胰腺样本。');
_mkTpl('thyroid_sample', '甲状腺样本', 'medical', 85, '🦋', '甲状腺样本。');
_mkTpl('adrenal_sample', '肾上腺样本', 'medical', 80, '🧪', '肾上腺样本。');
_mkTpl('pituitary_sample', '脑垂体样本', 'medical', 105, '🧠', '脑垂体样本。');
_mkTpl('pineal_sample', '松果体样本', 'medical', 115, '🍍', '松果体样本。');
_mkTpl('thymus_sample', '胸腺样本', 'medical', 75, '🧪', '胸腺样本。');
_mkTpl('lymph_sample', '淋巴样本', 'medical', 70, '🧪', '淋巴样本。');
_mkTpl('bone_marrow', '骨髓', 'medical', 100, '🦴', '骨髓。');
_mkTpl('stem_cell', '干细胞·单', 'medical', 140, '🧬', '干细胞。');
_mkTpl('embryonic_cell', '胚胎细胞', 'medical', 180, '🧬', '胚胎细胞。');
_mkTpl('cancer_cell', '癌细胞', 'medical', 160, '🦠', '癌细胞。');
_mkTpl('bacteria_sample', '细菌样本', 'medical', 90, '🦠', '细菌样本。');
_mkTpl('virus_sample', '病毒样本', 'contraband', 130, '🦠', '病毒样本。', { legal: 'contraband' });
_mkTpl('fungus_sample', '真菌样本', 'medical', 80, '🍄', '真菌样本。');
_mkTpl('parasite_sample', '寄生虫样本', 'medical', 85, '🪱', '寄生虫样本。');
_mkTpl('worm_sample', '蠕虫样本', 'medical', 75, '🪱', '蠕虫样本。');
_mkTpl('insect_sample', '昆虫样本', 'material', 60, '🐛', '昆虫样本。');
_mkTpl('fish_sample', '鱼类样本', 'material', 65, '🐟', '鱼类样本。', { isFish: true });
_mkTpl('bird_sample', '鸟类样本', 'material', 70, '🐦', '鸟类样本。');
_mkTpl('mammal_sample', '哺乳动物样本', 'material', 80, '🐾', '哺乳动物样本。');
_mkTpl('reptile_sample', '爬行动物样本', 'material', 75, '🦎', '爬行动物样本。');
_mkTpl('amphibian_sample', '两栖动物样本', 'material', 70, '🐸', '两栖动物样本。');
_mkTpl('plant_sample', '植物样本', 'material', 55, '🌿', '植物样本。');
_mkTpl('soil_sample', '土壤样本', 'material', 40, '🟤', '土壤样本。');
_mkTpl('water_sample', '水样本', 'material', 35, '💧', '水样本。');
_mkTpl('air_sample', '空气样本', 'material', 30, '🌬️', '空气样本。');
_mkTpl('rock_sample', '岩石样本', 'material', 45, '🪨', '岩石样本。');
_mkTpl('mineral_sample', '矿物样本', 'material', 50, '💎', '矿物样本。');
_mkTpl('metal_sample', '金属样本', 'material', 55, '🔩', '金属样本。');
_mkTpl('alloy_sample', '合金样本', 'material', 65, '⚙️', '合金样本。');
_mkTpl('plastic_sample', '塑料样本', 'material', 35, '🧱', '塑料样本。');
_mkTpl('glass_sample', '玻璃样本', 'material', 40, '🪟', '玻璃样本。');
_mkTpl('ceramic_sample', '陶瓷样本', 'material', 45, '🏺', '陶瓷样本。');
_mkTpl('wood_sample', '木材样本', 'material', 40, '🪵', '木材样本。');
_mkTpl('paper_sample', '纸张样本', 'material', 25, '📄', '纸张样本。');
_mkTpl('fabric_sample', '织物样本', 'material', 30, '🧶', '织物样本。');
_mkTpl('leather_sample', '皮革样本', 'material', 35, '🧥', '皮革样本。');
_mkTpl('rubber_sample', '橡胶样本', 'material', 30, '⭕', '橡胶样本。');
_mkTpl('oil_sample', '石油样本', 'material', 50, '🛢️', '石油样本。');
_mkTpl('gas_sample', '气体样本', 'material', 35, '💨', '气体样本。');
_mkTpl('liquid_sample', '液体样本', 'material', 35, '🧪', '液体样本。');
_mkTpl('solid_sample', '固体样本', 'material', 30, '🧱', '固体样本。');
_mkTpl('powder_sample', '粉末样本', 'material', 30, '✨', '粉末样本。');
_mkTpl('crystal_sample', '晶体样本', 'material', 60, '💎', '晶体样本。');
_mkTpl('gem_sample', '宝石样本', 'luxury', 120, '💎', '宝石样本。');
_mkTpl('pearl_sample', '珍珠样本', 'luxury', 110, '🦪', '珍珠样本。');
_mkTpl('jade_sample', '翡翠样本', 'luxury', 130, '🟢', '翡翠样本。');
_mkTpl('amber_sample', '琥珀样本', 'luxury', 100, '🟠', '琥珀样本。');
_mkTpl('coral_sample', '珊瑚样本', 'luxury', 90, '🪸', '珊瑚样本。');
_mkTpl('ivory_sample', '象牙样本', 'luxury', 140, '🦷', '象牙样本。');
_mkTpl('silk_sample', '丝绸样本', 'luxury', 95, '🧣', '丝绸样本。');
_mkTpl('velvet_sample', '丝绒样本', 'luxury', 85, '🧣', '丝绒样本。');
_mkTpl('satin_sample', '缎子样本', 'luxury', 80, '🧣', '缎子样本。');
_mkTpl('linen_sample', '亚麻样本', 'material', 40, '🧶', '亚麻样本。');
_mkTpl('cotton_sample', '棉花样本', 'material', 35, '☁️', '棉花样本。');
_mkTpl('wool_sample', '羊毛样本', 'material', 38, '🐑', '羊毛样本。');
_mkTpl('fur_sample', '毛皮样本', 'material', 55, '🦊', '毛皮样本。');
_mkTpl('feather_sample', '羽毛样本', 'material', 45, '🪶', '羽毛样本。');
_mkTpl('horn_sample', '角样本', 'material', 60, '🐂', '角样本。');
_mkTpl('antler_sample', '鹿角样本', 'material', 65, '🦌', '鹿角样本。');
_mkTpl('tusk_sample', '獠牙样本', 'material', 70, '🐗', '獠牙样本。');
_mkTpl('claw_sample', '爪样本', 'material', 55, '🐾', '爪样本。');
_mkTpl('tooth_sample', '牙齿样本', 'material', 50, '🦷', '牙齿样本。');
_mkTpl('bone_fossil', '化石骨', 'material', 85, '🦴', '化石骨。');
_mkTpl('fossil_egg', '化石蛋', 'material', 95, '🥚', '化石蛋。');
_mkTpl('fossil_plant', '化石植物', 'material', 75, '🌿', '化石植物。');
_mkTpl('fossil_insect', '化石昆虫', 'material', 80, '🐛', '化石昆虫。');
_mkTpl('fossil_fish', '化石鱼', 'material', 85, '🐟', '化石鱼。');
_mkTpl('amber_insect', '琥珀昆虫', 'luxury', 150, '🐛', '琥珀昆虫。');
_mkTpl('amber_plant', '琥珀植物', 'luxury', 140, '🌿', '琥珀植物。');
_mkTpl('amber_fish', '琥珀鱼', 'luxury', 145, '🐟', '琥珀鱼。');
_mkTpl('meteorite', '陨石', 'material', 160, '☄️', '陨石。');
_mkTpl('moon_rock_sample', '月岩样本', 'material', 150, '🌕', '月岩样本。');
_mkTpl('mars_rock', '火星岩石', 'material', 155, '🔴', '火星岩石。');
_mkTpl('venus_rock', '金星岩石', 'material', 145, '🟡', '金星岩石。');
_mkTpl('mercury_rock', '水星岩石', 'material', 140, '☿️', '水星岩石。');
_mkTpl('jupiter_rock', '木星岩石', 'material', 150, '🪐', '木星岩石。');
_mkTpl('saturn_rock', '土星岩石', 'material', 150, '🪐', '土星岩石。');
_mkTpl('uranus_rock', '天王星岩石', 'material', 145, '🔵', '天王星岩石。');
_mkTpl('neptune_rock', '海王星岩石', 'material', 145, '🔵', '海王星岩石。');
_mkTpl('pluto_rock', '冥王星岩石', 'material', 140, '⚫', '冥王星岩石。');
_mkTpl('asteroid_sample', '小行星样本', 'material', 135, '☄️', '小行星样本。');
_mkTpl('comet_sample', '彗星样本', 'material', 140, '☄️', '彗星样本。');
_mkTpl('solar_wind', '太阳风样本', 'tech', 170, '☀️', '太阳风样本。');
_mkTpl('cosmic_ray', '宇宙射线样本', 'tech', 175, '🌌', '宇宙射线样本。');
_mkTpl('dark_matter_sample', '暗物质样本·单', 'contraband', 200, '🌑', '暗物质样本。', { legal: 'contraband' });
_mkTpl('antimatter_sample', '反物质样本', 'contraband', 220, '🌌', '反物质样本。', { legal: 'contraband' });
_mkTpl('exotic_sample', '奇异物质样本', 'contraband', 210, '🌌', '奇异物质样本。', { legal: 'contraband' });
_mkTpl('strange_sample', '奇异样本', 'contraband', 205, '🌌', '奇异样本。', { legal: 'contraband' });
_mkTpl('void_sample', '虚空样本', 'contraband', 215, '🕳️', '虚空样本。', { legal: 'contraband' });
_mkTpl('chaos_sample', '混沌样本', 'contraband', 225, '🌀', '混沌样本。', { legal: 'contraband' });
_mkTpl('order_sample', '秩序样本', 'luxury', 190, '⚖️', '秩序样本。');
_mkTpl('dream_sample', '梦境样本', 'luxury', 185, '💭', '梦境样本。');
_mkTpl('nightmare_sample', '梦魇样本', 'contraband', 195, '😱', '梦魇样本。', { legal: 'contraband' });
_mkTpl('hope_sample', '希望样本', 'luxury', 180, '🌟', '希望样本。');
_mkTpl('fear_sample', '恐惧样本', 'contraband', 185, '😨', '恐惧样本。', { legal: 'contraband' });
_mkTpl('joy_sample', '欢乐样本', 'luxury', 175, '😄', '欢乐样本。');
_mkTpl('sorrow_sample', '悲伤样本', 'luxury', 170, '😢', '悲伤样本。');
_mkTpl('anger_sample', '愤怒样本', 'contraband', 175, '😡', '愤怒样本。', { legal: 'contraband' });
_mkTpl('love_sample', '爱情样本', 'luxury', 180, '❤️', '爱情样本。');
_mkTpl('hate_sample', '仇恨样本', 'contraband', 170, '💔', '仇恨样本。', { legal: 'contraband' });
_mkTpl('wisdom_sample', '智慧样本', 'luxury', 185, '🦉', '智慧样本。');
_mkTpl('power_sample', '力量样本', 'tech', 180, '💪', '力量样本。');
_mkTpl('speed_sample', '速度样本', 'tech', 175, '💨', '速度样本。');
_mkTpl('fate_sample', '命运样本', 'luxury', 200, '🔮', '命运样本。');
_mkTpl('soul_sample', '灵魂样本', 'luxury', 195, '👻', '灵魂样本。');
_mkTpl('spirit_sample', '精神样本', 'medical', 170, '🧘', '精神样本。');
_mkTpl('life_sample', '生命样本', 'medical', 180, '💚', '生命样本。');
_mkTpl('death_sample', '死亡样本', 'contraband', 185, '💀', '死亡样本。', { legal: 'contraband' });
_mkTpl('time_sample', '时间样本', 'tech', 190, '⏰', '时间样本。');
_mkTpl('space_sample', '空间样本', 'tech', 185, '🌌', '空间样本。');
_mkTpl('gravity_sample', '重力样本', 'tech', 180, '🌍', '重力样本。');
_mkTpl('light_sample', '光样本', 'tech', 165, '☀️', '光样本。');
_mkTpl('shadow_sample', '暗影样本', 'contraband', 180, '🌑', '暗影样本。', { legal: 'contraband' });
_mkTpl('storm_sample', '风暴样本', 'tech', 170, '⛈️', '风暴样本。');
_mkTpl('earth_sample', '大地样本', 'material', 150, '🌍', '大地样本。');
_mkTpl('water_essence_sample', '水精华样本', 'material', 155, '💧', '水精华样本。');
_mkTpl('fire_sample', '火焰样本', 'material', 160, '🔥', '火焰样本。');
_mkTpl('metal_sample2', '金属样本·二', 'material', 150, '⚙️', '金属样本。');
_mkTpl('wood_sample2', '木材样本·二', 'material', 140, '🪵', '木材样本。');
_mkTpl('stone_sample', '石材样本', 'material', 145, '🪨', '石材样本。');
_mkTpl('sand_sample', '沙样本', 'material', 120, '🏖️', '沙样本。');
_mkTpl('clay_sample', '黏土样本', 'material', 125, '🟤', '黏土样本。');
_mkTpl('salt_sample', '盐样本', 'material', 110, '🧂', '盐样本。');
_mkTpl('sugar_sample', '糖样本', 'material', 115, '🍬', '糖样本。');
_mkTpl('spice_sample', '香料样本', 'material', 130, '🌶️', '香料样本。');
_mkTpl('herb_sample', '草药样本', 'medical', 140, '🌿', '草药样本。');
_mkTpl('flower_sample', '花样本', 'material', 120, '🌸', '花样本。');
_mkTpl('fruit_sample', '水果样本', 'supply', 110, '🍎', '水果样本。');
_mkTpl('vegetable_sample', '蔬菜样本', 'supply', 105, '🥕', '蔬菜样本。');
_mkTpl('grain_sample', '谷物样本', 'supply', 100, '🌾', '谷物样本。');
_mkTpl('meat_sample', '肉样本', 'supply', 115, '🥩', '肉样本。');
_mkTpl('dairy_sample', '乳制品样本', 'supply', 110, '🧀', '乳制品样本。');
_mkTpl('egg_sample', '蛋样本', 'supply', 105, '🥚', '蛋样本。');
_mkTpl('honey_sample', '蜂蜜样本', 'supply', 120, '🍯', '蜂蜜样本。');
_mkTpl('milk_sample', '牛奶样本', 'supply', 100, '🥛', '牛奶样本。');
_mkTpl('cheese_sample', '奶酪样本', 'supply', 110, '🧀', '奶酪样本。');
_mkTpl('butter_sample', '黄油样本', 'supply', 105, '🧈', '黄油样本。');
_mkTpl('oil_food_sample', '食用油样本', 'supply', 100, '🫒', '食用油样本。');
_mkTpl('vinegar_sample', '醋样本', 'supply', 90, '🍶', '醋样本。');
_mkTpl('sauce_sample', '酱料样本', 'supply', 95, '🥫', '酱料样本。');
_mkTpl('tea_sample', '茶叶样本', 'supply', 130, '🍵', '茶叶样本。');
_mkTpl('coffee_sample', '咖啡样本', 'supply', 125, '☕', '咖啡样本。');
_mkTpl('cocoa_sample', '可可样本', 'supply', 120, '🍫', '可可样本。');
_mkTpl('chocolate_sample', '巧克力样本', 'supply', 115, '🍫', '巧克力样本。');
_mkTpl('candy_sample', '糖果样本', 'supply', 100, '🍬', '糖果样本。');
_mkTpl('cookie_sample', '饼干样本', 'supply', 95, '🍪', '饼干样本。');
_mkTpl('cake_sample', '蛋糕样本', 'supply', 110, '🍰', '蛋糕样本。');
_mkTpl('bread_sample', '面包样本', 'supply', 90, '🍞', '面包样本。');
_mkTpl('rice_sample', '大米样本', 'supply', 95, '🍚', '大米样本。');
_mkTpl('wheat_sample', '小麦样本', 'supply', 90, '🌾', '小麦样本。');
_mkTpl('corn_sample', '玉米样本', 'supply', 90, '🌽', '玉米样本。');
_mkTpl('potato_sample', '土豆样本', 'supply', 85, '🥔', '土豆样本。');
_mkTpl('tomato_sample', '番茄样本', 'supply', 90, '🍅', '番茄样本。');
_mkTpl('onion_sample', '洋葱样本', 'supply', 85, '🧅', '洋葱样本。');
_mkTpl('garlic_sample', '大蒜样本', 'supply', 85, '🧄', '大蒜样本。');
_mkTpl('pepper_sample', '辣椒样本', 'supply', 90, '🌶️', '辣椒样本。');
_mkTpl('carrot_sample', '胡萝卜样本', 'supply', 85, '🥕', '胡萝卜样本。');
_mkTpl('cucumber_sample', '黄瓜样本', 'supply', 85, '🥒', '黄瓜样本。');
_mkTpl('lettuce_sample', '生菜样本', 'supply', 85, '🥬', '生菜样本。');
_mkTpl('cabbage_sample', '白菜样本', 'supply', 85, '🥬', '白菜样本。');
_mkTpl('spinach_sample', '菠菜样本', 'supply', 85, '🥬', '菠菜样本。');
_mkTpl('mushroom_sample', '蘑菇样本', 'supply', 95, '🍄', '蘑菇样本。');
_mkTpl('seaweed_sample', '海藻样本', 'supply', 90, '🌊', '海藻样本。');
_mkTpl('algae_sample', '藻类样本', 'material', 95, '🌿', '藻类样本。');
_mkTpl('moss_sample', '苔藓样本', 'material', 90, '🌿', '苔藓样本。');
_mkTpl('fern_sample', '蕨类样本', 'material', 90, '🌿', '蕨类样本。');
_mkTpl('tree_sample', '树木样本', 'material', 100, '🌳', '树木样本。');
_mkTpl('leaf_sample', '叶子样本', 'material', 80, '🍃', '叶子样本。');
_mkTpl('bark_sample', '树皮样本', 'material', 85, '🪵', '树皮样本。');
_mkTpl('root_sample', '根样本', 'material', 85, '🥕', '根样本。');
_mkTpl('seed_sample', '种子样本', 'material', 90, '🌱', '种子样本。');
_mkTpl('pollen_sample', '花粉样本', 'material', 95, '🌸', '花粉样本。');
_mkTpl('nectar_sample', '花蜜样本', 'supply', 110, '🍯', '花蜜样本。');
_mkTpl('sap_sample', '树液样本', 'material', 90, '🌳', '树液样本。');
_mkTpl('resin_sample', '树脂样本', 'material', 95, '🟤', '树脂样本。');
_mkTpl('amber_resin', '琥珀树脂', 'luxury', 130, '🟠', '琥珀树脂。');
_mkTpl('pitch_sample', '沥青样本', 'material', 80, '⬛', '沥青样本。');
_mkTpl('tar_sample', '焦油样本', 'material', 75, '⬛', '焦油样本。');
_mkTpl('wax_sample', '蜡样本', 'material', 85, '🕯️', '蜡样本。');
_mkTpl('beeswax_sample', '蜂蜡样本', 'material', 90, '🐝', '蜂蜡样本。');
_mkTpl('paraffin_sample', '石蜡样本', 'material', 80, '🕯️', '石蜡样本。');
_mkTpl('candle_sample', '蜡烛样本', 'material', 70, '🕯️', '蜡烛样本。');
_mkTpl('soap_sample', '肥皂样本', 'material', 65, '🧼', '肥皂样本。');
_mkTpl('detergent_sample', '洗涤剂样本', 'material', 60, '🧴', '洗涤剂样本。');
_mkTpl('shampoo_sample', '洗发水样本', 'material', 65, '🧴', '洗发水样本。');
_mkTpl('toothpaste_sample', '牙膏样本', 'material', 60, '🪥', '牙膏样本。');
_mkTpl('cream_sample', '乳膏样本', 'material', 70, '🧴', '乳膏样本。');
_mkTpl('lotion_sample', '乳液样本', 'material', 70, '🧴', '乳液样本。');
_mkTpl('perfume_sample', '香水样本', 'luxury', 120, '🧴', '香水样本。');
_mkTpl('cologne_sample', '古龙水样本', 'luxury', 110, '🧴', '古龙水样本。');
_mkTpl('deodorant_sample', '除臭剂样本', 'material', 65, '🧴', '除臭剂样本。');
_mkTpl('sunscreen_sample', '防晒霜样本', 'material', 70, '🧴', '防晒霜样本。');
_mkTpl('lipstick_sample', '口红样本', 'luxury', 85, '💄', '口红样本。');
_mkTpl('nail_polish_sample', '指甲油样本', 'luxury', 75, '💅', '指甲油样本。');
_mkTpl('makeup_sample', '化妆品样本', 'luxury', 90, '💄', '化妆品样本。');
_mkTpl('powder_makeup_sample', '粉底样本', 'luxury', 80, '✨', '粉底样本。');
_mkTpl('blush_sample', '腮红样本', 'luxury', 75, '🌸', '腮红样本。');
_mkTpl('eyeshadow_sample', '眼影样本', 'luxury', 80, '👁️', '眼影样本。');
_mkTpl('mascara_sample', '睫毛膏样本', 'luxury', 75, '👁️', '睫毛膏样本。');
_mkTpl('eyeliner_sample', '眼线样本', 'luxury', 70, '✏️', '眼线样本。');
_mkTpl('lip_gloss_sample', '唇彩样本', 'luxury', 75, '💋', '唇彩样本。');
_mkTpl('lip_balm_sample', '润唇膏样本', 'luxury', 65, '💋', '润唇膏样本。');
_mkTpl('hand_cream_sample', '护手霜样本', 'luxury', 70, '🧴', '护手霜样本。');
_mkTpl('body_lotion_sample', '身体乳样本', 'luxury', 75, '🧴', '身体乳样本。');
_mkTpl('face_cream_sample', '面霜样本', 'luxury', 85, '🧴', '面霜样本。');
_mkTpl('serum_sample', '精华液样本', 'luxury', 110, '💧', '精华液样本。');
_mkTpl('toner_sample', '爽肤水样本', 'luxury', 80, '💧', '爽肤水样本。');
_mkTpl('cleanser_sample', '洁面乳样本', 'luxury', 75, '🧴', '洁面乳样本。');
_mkTpl('mask_sample', '面膜样本', 'luxury', 85, '🎭', '面膜样本。');
_mkTpl('scrub_sample', '磨砂膏样本', 'luxury', 80, '✨', '磨砂膏样本。');
_mkTpl('peel_sample', '果酸焕肤样本', 'luxury', 90, '🍋', '果酸焕肤样本。');
_mkTpl('sunscreen2_sample', '防晒样本·二', 'luxury', 75, '☀️', '防晒样本。');
_mkTpl('after_shave_sample', '须后水样本', 'luxury', 80, '🪒', '须后水样本。');
_mkTpl('shaving_cream_sample', '剃须膏样本', 'luxury', 70, '🪒', '剃须膏样本。');
_mkTpl('hair_dye_sample', '染发剂样本', 'luxury', 85, '🎨', '染发剂样本。');
_mkTpl('hair_spray_sample', '发胶样本', 'luxury', 70, '💇', '发胶样本。');
_mkTpl('hair_gel_sample', '发蜡样本', 'luxury', 65, '💇', '发蜡样本。');
_mkTpl('hair_oil_sample', '发油样本', 'luxury', 75, '💇', '发油样本。');
_mkTpl('nail_remover_sample', '卸甲水样本', 'luxury', 60, '💅', '卸甲水样本。');
_mkTpl('cuticle_oil_sample', '指缘油样本', 'luxury', 65, '💅', '指缘油样本。');
_mkTpl('bath_bomb_sample', '浴球样本', 'luxury', 70, '🛁', '浴球样本。');
_mkTpl('bath_salt_sample', '浴盐样本', 'luxury', 65, '🛁', '浴盐样本。');
_mkTpl('bubble_bath_sample', '泡泡浴样本', 'luxury', 70, '🛁', '泡泡浴样本。');
_mkTpl('shower_gel_sample', '沐浴露样本', 'luxury', 70, '🚿', '沐浴露样本。');
_mkTpl('body_wash_sample', '身体清洁样本', 'luxury', 70, '🧴', '身体清洁样本。');
_mkTpl('hand_sanitizer_sample', '洗手液样本', 'material', 55, '🧴', '洗手液样本。');
_mkTpl('disinfectant_sample', '消毒液样本', 'material', 60, '🧴', '消毒液样本。');
_mkTpl('alcohol_wipe_sample', '酒精湿巾样本', 'material', 50, '🧻', '酒精湿巾样本。');
_mkTpl('wet_wipe_sample', '湿巾样本', 'material', 45, '🧻', '湿巾样本。');
_mkTpl('tissue_sample2', '纸巾样本', 'material', 40, '🧻', '纸巾样本。');
_mkTpl('napkin_sample', '餐巾样本', 'material', 40, '🧻', '餐巾样本。');
_mkTpl('paper_towel_sample', '厨房纸样本', 'material', 42, '🧻', '厨房纸样本。');
_mkTpl('cotton_ball_sample', '棉球样本', 'material', 45, '☁️', '棉球样本。');
_mkTpl('cotton_pad_sample', '化妆棉样本', 'material', 45, '☁️', '化妆棉样本。');
_mkTpl('q_tip_sample', '棉签样本', 'material', 40, '☁️', '棉签样本。');
_mkTpl('bandage_sample', '绷带样本', 'medical', 55, '🩹', '绷带样本。');
_mkTpl('gauze_sample', '纱布样本', 'medical', 50, '🩹', '纱布样本。');
_mkTpl('tape_sample', '胶带样本', 'material', 45, '🩹', '胶带样本。');
_mkTpl('suture_sample', '缝线样本', 'medical', 70, '🧵', '缝线样本。');
_mkTpl('staple_sample', '缝合钉样本', 'medical', 65, '📌', '缝合钉样本。');
_mkTpl('clip_sample', '止血夹样本', 'medical', 75, '📎', '止血夹样本。');
_mkTpl('forceps_sample', '镊子样本', 'medical', 60, '🔧', '镊子样本。');
_mkTpl('scissors_sample', '剪刀样本', 'medical', 55, '✂️', '剪刀样本。');
_mkTpl('scalpel_sample', '手术刀样本', 'medical', 80, '🔪', '手术刀样本。');
_mkTpl('needle_sample', '针头样本', 'medical', 60, '💉', '针头样本。');
_mkTpl('syringe_sample', '注射器样本', 'medical', 55, '💉', '注射器样本。');
_mkTpl('iv_bag_sample', '输液袋样本', 'medical', 75, '💧', '输液袋样本。');
_mkTpl('catheter_sample', '导管样本', 'medical', 85, '🧪', '导管样本。');
_mkTpl('tube_sample', '试管样本', 'material', 50, '🧪', '试管样本。');
_mkTpl('beaker_sample', '烧杯样本', 'material', 50, '🧪', '烧杯样本。');
_mkTpl('flask_sample', '锥形瓶样本', 'material', 50, '🧪', '锥形瓶样本。');
_mkTpl('petri_sample', '培养皿样本', 'material', 45, '🧫', '培养皿样本。');
_mkTpl('microscope_sample', '显微镜样本', 'tech', 120, '🔬', '显微镜样本。');
_mkTpl('centrifuge_sample', '离心机样本', 'tech', 130, '🌀', '离心机样本。');
_mkTpl('incubator_sample', '培养箱样本', 'tech', 140, '🧫', '培养箱样本。');
_mkTpl('autoclave_sample', '高压灭菌样本', 'tech', 135, '♨️', '高压灭菌样本。');
_mkTpl('ph_meter_sample', 'pH 计样本', 'tech', 110, '🧪', 'pH 计样本。');
_mkTpl('thermometer_sample', '温度计样本', 'tech', 90, '🌡️', '温度计样本。');
_mkTpl('barometer_sample', '气压计样本', 'tech', 95, '🌡️', '气压计样本。');
_mkTpl('hygrometer_sample', '湿度计样本', 'tech', 90, '💧', '湿度计样本。');
_mkTpl('scale_sample', '秤样本', 'tech', 85, '⚖️', '秤样本。');
_mkTpl('ruler_sample', '尺样本', 'material', 40, '📏', '尺样本。');
_mkTpl('caliper_sample', '卡尺样本', 'tech', 75, '📐', '卡尺样本。');
_mkTpl('micrometer_sample', '千分尺样本', 'tech', 80, '📐', '千分尺样本。');
_mkTpl('protractor_sample', '量角器样本', 'material', 40, '📐', '量角器样本。');
_mkTpl('compass_sample', '圆规样本', 'material', 45, '🧭', '圆规样本。');
_mkTpl('triangle_sample', '三角尺样本', 'material', 40, '📐', '三角尺样本。');
_mkTpl('set_square_sample', '三角板样本', 'material', 40, '📐', '三角板样本。');
_mkTpl('graph_paper_sample', '坐标纸样本', 'material', 35, '📄', '坐标纸样本。');
_mkTpl('notebook_sample', '笔记本样本', 'supply', 50, '📓', '笔记本样本。');
_mkTpl('pen_sample', '钢笔样本', 'supply', 55, '🖊️', '钢笔样本。');
_mkTpl('pencil_sample', '铅笔样本', 'supply', 40, '✏️', '铅笔样本。');
_mkTpl('marker_sample', '马克笔样本', 'supply', 45, '🖊️', '马克笔样本。');
_mkTpl('highlighter_sample', '荧光笔样本', 'supply', 45, '🖊️', '荧光笔样本。');
_mkTpl('eraser_sample', '橡皮样本', 'supply', 35, '🧽', '橡皮样本。');
_mkTpl('sharpener_sample', '卷笔刀样本', 'supply', 40, '✏️', '卷笔刀样本。');
_mkTpl('glue_sample', '胶水样本', 'material', 40, '🧴', '胶水样本。');
_mkTpl('tape_glue_sample', '胶带样本·二', 'material', 42, '🩹', '胶带样本。');
_mkTpl('stapler_sample', '订书机样本', 'supply', 50, '📎', '订书机样本。');
_mkTpl('staple_remover_sample', '起钉器样本', 'supply', 40, '📎', '起钉器样本。');
_mkTpl('paper_clip_sample', '回形针样本', 'supply', 35, '📎', '回形针样本。');
_mkTpl('pin_sample', '大头针样本', 'supply', 35, '📌', '大头针样本。');
_mkTpl('push_pin_sample', '图钉样本', 'supply', 35, '📌', '图钉样本。');
_mkTpl('binder_clip_sample', '长尾夹样本', 'supply', 38, '📎', '长尾夹样本。');
_mkTpl('folder_sample', '文件夹样本', 'supply', 45, '📁', '文件夹样本。');
_mkTpl('envelope_sample', '信封样本', 'supply', 40, '✉️', '信封样本。');
_mkTpl('stamp_sample', '邮票样本', 'luxury', 85, '📮', '邮票样本。');
_mkTpl('postcard_sample', '明信片样本', 'luxury', 70, '💌', '明信片样本。');
_mkTpl('letter_sample', '信件样本', 'supply', 55, '✉️', '信件样本。');
_mkTpl('card_sample', '卡片样本', 'supply', 50, '💳', '卡片样本。');
_mkTpl('photo_sample', '照片样本', 'luxury', 75, '📷', '照片样本。');
_mkTpl('film_sample', '胶片样本', 'luxury', 80, '🎞️', '胶片样本。');
_mkTpl('negative_sample', '底片样本', 'luxury', 75, '🎞️', '底片样本。');
_mkTpl('slide_sample', '幻灯片样本', 'luxury', 70, '📽️', '幻灯片样本。');
_mkTpl('microfilm_sample', '微缩胶片样本', 'luxury', 85, '🎞️', '微缩胶片样本。');
_mkTpl('tape_recorder_sample', '录音带样本', 'luxury', 90, '📼', '录音带样本。');
_mkTpl('cd_sample', '光盘样本', 'luxury', 70, '💿', '光盘样本。');
_mkTpl('dvd_sample', 'DVD 样本', 'luxury', 75, '💿', 'DVD 样本。');
_mkTpl('blu_ray_sample', '蓝光盘样本', 'luxury', 80, '💿', '蓝光盘样本。');
_mkTpl('usb_sample', 'U盘样本', 'tech', 85, '💾', 'U盘样本。');
_mkTpl('sd_card_sample', 'SD 卡样本', 'tech', 80, '💾', 'SD 卡样本。');
_mkTpl('sim_card_sample', 'SIM 卡样本', 'tech', 75, '📱', 'SIM 卡样本。');
_mkTpl('memory_card_sample', '内存卡样本', 'tech', 80, '💾', '内存卡样本。');
_mkTpl('chip_sample', '芯片样本', 'tech', 120, '🧠', '芯片样本。');
_mkTpl('circuit_sample', '电路板样本', 'tech', 110, '🔌', '电路板样本。');
_mkTpl('resistor_sample', '电阻样本', 'tech', 60, '🔌', '电阻样本。');
_mkTpl('capacitor_sample', '电容样本', 'tech', 60, '🔌', '电容样本。');
_mkTpl('inductor_sample', '电感样本', 'tech', 60, '🔌', '电感样本。');
_mkTpl('diode_sample', '二极管样本', 'tech', 55, '🔌', '二极管样本。');
_mkTpl('transistor_sample', '三极管样本', 'tech', 55, '🔌', '三极管样本。');
_mkTpl('ic_sample', '集成电路样本', 'tech', 100, '🧠', '集成电路样本。');
_mkTpl('relay_sample', '继电器样本', 'tech', 65, '🔌', '继电器样本。');
_mkTpl('switch_sample', '开关样本', 'tech', 60, '🔘', '开关样本。');
_mkTpl('button_sample', '按钮样本', 'tech', 55, '🔘', '按钮样本。');
_mkTpl('knob_sample', '旋钮样本', 'tech', 50, '🎛️', '旋钮样本。');
_mkTpl('dial_sample', '表盘样本', 'tech', 55, '🎛️', '表盘样本。');
_mkTpl('meter_sample', '仪表样本', 'tech', 85, '📟', '仪表样本。');
_mkTpl('gauge_sample', '量规样本', 'tech', 80, '📐', '量规样本。');
_mkTpl('sensor_sample', '传感器样本', 'tech', 95, '📡', '传感器样本。');
_mkTpl('actuator_sample', '执行器样本', 'tech', 90, '⚙️', '执行器样本。');
_mkTpl('motor_sample', '电机样本', 'tech', 100, '⚙️', '电机样本。');
_mkTpl('generator_sample', '发电机样本', 'tech', 140, '⚡', '发电机样本。');
_mkTpl('transformer_sample', '变压器样本', 'tech', 110, '🔌', '变压器样本。');
_mkTpl('rectifier_sample', '整流器样本', 'tech', 95, '🔌', '整流器样本。');
_mkTpl('inverter_sample', '逆变器样本', 'tech', 105, '🔌', '逆变器样本。');
_mkTpl('amplifier_sample', '放大器样本', 'tech', 110, '🔊', '放大器样本。');
_mkTpl('oscillator_sample', '振荡器样本', 'tech', 95, '📳', '振荡器样本。');
_mkTpl('filter_sample', '滤波器样本', 'tech', 90, '🔌', '滤波器样本。');
_mkTpl('modulator_sample', '调制器样本', 'tech', 95, '📡', '调制器样本。');
_mkTpl('demodulator_sample', '解调器样本', 'tech', 95, '📡', '解调器样本。');
_mkTpl('encoder_sample', '编码器样本', 'tech', 100, '🔢', '编码器样本。');
_mkTpl('decoder_sample', '解码器样本', 'tech', 100, '🔢', '解码器样本。');
_mkTpl('multiplexer_sample', '多路复用器样本', 'tech', 105, '🔀', '多路复用器样本。');
_mkTpl('demultiplexer_sample', '解复用器样本', 'tech', 105, '🔀', '解复用器样本。');
_mkTpl('adder_sample', '加法器样本', 'tech', 95, '➕', '加法器样本。');
_mkTpl('subtractor_sample', '减法器样本', 'tech', 95, '➖', '减法器样本。');
_mkTpl('multiplier_sample', '乘法器样本', 'tech', 100, '✖️', '乘法器样本。');
_mkTpl('divider_sample', '除法器样本', 'tech', 100, '➗', '除法器样本。');
_mkTpl('comparator_sample', '比较器样本', 'tech', 90, '⚖️', '比较器样本。');
_mkTpl('logic_gate_sample', '逻辑门样本', 'tech', 95, '🔣', '逻辑门样本。');
_mkTpl('flip_flop_sample', '触发器样本', 'tech', 100, '🔀', '触发器样本。');
_mkTpl('counter_sample', '计数器样本', 'tech', 100, '🔢', '计数器样本。');
_mkTpl('register_sample', '寄存器样本', 'tech', 105, '💾', '寄存器样本。');
_mkTpl('memory_sample', '存储器样本', 'tech', 110, '💾', '存储器样本。');
_mkTpl('processor_sample', '处理器样本', 'tech', 150, '🧠', '处理器样本。');
_mkTpl('controller_sample', '控制器样本', 'tech', 120, '🎛️', '控制器样本。');
_mkTpl('interface_sample', '接口样本', 'tech', 100, '🔌', '接口样本。');
_mkTpl('connector_sample', '连接器样本', 'tech', 85, '🔌', '连接器样本。');
_mkTpl('cable_sample', '电缆样本', 'tech', 75, '🔌', '电缆样本。');
_mkTpl('wire_sample', '导线样本', 'tech', 65, '🔌', '导线样本。');
_mkTpl('fiber_sample', '光纤样本', 'tech', 95, '💡', '光纤样本。');
_mkTpl('antenna_sample', '天线样本', 'tech', 90, '📡', '天线样本。');
_mkTpl('dish_sample', '抛物面天线样本', 'tech', 110, '📡', '抛物面天线样本。');
_mkTpl('waveguide_sample', '波导样本', 'tech', 95, '📡', '波导样本。');
_mkTpl('coax_sample', '同轴电缆样本', 'tech', 80, '🔌', '同轴电缆样本。');
_mkTpl('twisted_pair_sample', '双绞线样本', 'tech', 70, '🔌', '双绞线样本。');
_mkTpl('usb_cable_sample', 'USB 线样本', 'tech', 65, '🔌', 'USB 线样本。');
_mkTpl('hdmi_sample', 'HDMI 线样本', 'tech', 75, '🔌', 'HDMI 线样本。');
_mkTpl('power_cord_sample', '电源线样本', 'tech', 60, '🔌', '电源线样本。');
_mkTpl('extension_cord_sample', '延长线样本', 'tech', 65, '🔌', '延长线样本。');
_mkTpl('power_strip_sample', '排插样本', 'tech', 70, '🔌', '排插样本。');
_mkTpl('adapter_sample', '适配器样本', 'tech', 75, '🔌', '适配器样本。');
_mkTpl('charger_sample', '充电器样本', 'tech', 80, '🔌', '充电器样本。');
_mkTpl('power_bank_sample', '充电宝样本', 'tech', 95, '🔋', '充电宝样本。');
_mkTpl('battery_sample', '电池样本', 'tech', 60, '🔋', '电池样本。');
_mkTpl('solar_cell_sample', '太阳能电池样本', 'tech', 110, '☀️', '太阳能电池样本。');
_mkTpl('fuel_cell_sample', '燃料电池样本', 'tech', 130, '🔋', '燃料电池样本。');
_mkTpl('capacitor_bank_sample', '电容组样本', 'tech', 100, '🔌', '电容组样本。');
_mkTpl('inductor_bank_sample', '电感组样本', 'tech', 95, '🔌', '电感组样本。');
_mkTpl('resistor_bank_sample', '电阻组样本', 'tech', 85, '🔌', '电阻组样本。');
_mkTpl('diode_bank_sample', '二极管组样本', 'tech', 80, '🔌', '二极管组样本。');
_mkTpl('transistor_bank_sample', '三极管组样本', 'tech', 80, '🔌', '三极管组样本。');
_mkTpl('ic_bank_sample', '集成电路组样本', 'tech', 120, '🧠', '集成电路组样本。');
_mkTpl('relay_bank_sample', '继电器组样本', 'tech', 90, '🔌', '继电器组样本。');
_mkTpl('switch_bank_sample', '开关组样本', 'tech', 85, '🔘', '开关组样本。');
_mkTpl('button_bank_sample', '按钮组样本', 'tech', 80, '🔘', '按钮组样本。');
_mkTpl('knob_bank_sample', '旋钮组样本', 'tech', 75, '🎛️', '旋钮组样本。');
_mkTpl('dial_bank_sample', '表盘组样本', 'tech', 80, '🎛️', '表盘组样本。');
_mkTpl('meter_bank_sample', '仪表组样本', 'tech', 100, '📟', '仪表组样本。');
_mkTpl('sensor_bank_sample', '传感器组样本', 'tech', 110, '📡', '传感器组样本。');
_mkTpl('actuator_bank_sample', '执行器组样本', 'tech', 105, '⚙️', '执行器组样本。');
_mkTpl('motor_bank_sample', '电机组样本', 'tech', 115, '⚙️', '电机组样本。');
_mkTpl('generator_bank_sample', '发电机组样本', 'tech', 150, '⚡', '发电机组样本。');
_mkTpl('transformer_bank_sample', '变压器组样本', 'tech', 125, '🔌', '变压器组样本。');
_mkTpl('rectifier_bank_sample', '整流器组样本', 'tech', 110, '🔌', '整流器组样本。');
_mkTpl('inverter_bank_sample', '逆变器组样本', 'tech', 120, '🔌', '逆变器组样本。');
_mkTpl('amplifier_bank_sample', '放大器组样本', 'tech', 125, '🔊', '放大器组样本。');
_mkTpl('oscillator_bank_sample', '振荡器组样本', 'tech', 110, '📳', '振荡器组样本。');
_mkTpl('filter_bank_sample', '滤波器组样本', 'tech', 105, '🔌', '滤波器组样本。');
_mkTpl('modulator_bank_sample', '调制器组样本', 'tech', 110, '📡', '调制器组样本。');
_mkTpl('demodulator_bank_sample', '解调器组样本', 'tech', 110, '📡', '解调器组样本。');
_mkTpl('encoder_bank_sample', '编码器组样本', 'tech', 115, '🔢', '编码器组样本。');
_mkTpl('decoder_bank_sample', '解码器组样本', 'tech', 115, '🔢', '解码器组样本。');
_mkTpl('multiplexer_bank_sample', '多路复用器组样本', 'tech', 120, '🔀', '多路复用器组样本。');
_mkTpl('demultiplexer_bank_sample', '解复用器组样本', 'tech', 120, '🔀', '解复用器组样本。');
_mkTpl('adder_bank_sample', '加法器组样本', 'tech', 110, '➕', '加法器组样本。');
_mkTpl('subtractor_bank_sample', '减法器组样本', 'tech', 110, '➖', '减法器组样本。');
_mkTpl('multiplier_bank_sample', '乘法器组样本', 'tech', 115, '✖️', '乘法器组样本。');
_mkTpl('divider_bank_sample', '除法器组样本', 'tech', 115, '➗', '除法器组样本。');
_mkTpl('comparator_bank_sample', '比较器组样本', 'tech', 105, '⚖️', '比较器组样本。');
_mkTpl('logic_gate_bank_sample', '逻辑门组样本', 'tech', 110, '🔣', '逻辑门组样本。');
_mkTpl('flip_flop_bank_sample', '触发器组样本', 'tech', 115, '🔀', '触发器组样本。');
_mkTpl('counter_bank_sample', '计数器组样本', 'tech', 115, '🔢', '计数器组样本。');
_mkTpl('register_bank_sample', '寄存器组样本', 'tech', 120, '💾', '寄存器组样本。');
_mkTpl('memory_bank_sample', '存储器组样本', 'tech', 125, '💾', '存储器组样本。');
_mkTpl('processor_bank_sample', '处理器组样本', 'tech', 160, '🧠', '处理器组样本。');
_mkTpl('controller_bank_sample', '控制器组样本', 'tech', 135, '🎛️', '控制器组样本。');
_mkTpl('interface_bank_sample', '接口组样本', 'tech', 115, '🔌', '接口组样本。');
_mkTpl('connector_bank_sample', '连接器组样本', 'tech', 100, '🔌', '连接器组样本。');
_mkTpl('cable_bank_sample', '电缆组样本', 'tech', 90, '🔌', '电缆组样本。');
_mkTpl('wire_bank_sample', '导线组样本', 'tech', 80, '🔌', '导线组样本。');
_mkTpl('fiber_bank_sample', '光纤组样本', 'tech', 110, '💡', '光纤组样本。');
_mkTpl('antenna_bank_sample', '天线组样本', 'tech', 105, '📡', '天线组样本。');
_mkTpl('dish_bank_sample', '抛物面天线组样本', 'tech', 125, '📡', '抛物面天线组样本。');
_mkTpl('waveguide_bank_sample', '波导组样本', 'tech', 110, '📡', '波导组样本。');
_mkTpl('coax_bank_sample', '同轴电缆组样本', 'tech', 95, '🔌', '同轴电缆组样本。');
_mkTpl('twisted_pair_bank_sample', '双绞线组样本', 'tech', 85, '🔌', '双绞线组样本。');
_mkTpl('usb_cable_bank_sample', 'USB 线组样本', 'tech', 80, '🔌', 'USB 线组样本。');
_mkTpl('hdmi_bank_sample', 'HDMI 线组样本', 'tech', 90, '🔌', 'HDMI 线组样本。');
_mkTpl('power_cord_bank_sample', '电源线组样本', 'tech', 75, '🔌', '电源线组样本。');
_mkTpl('extension_cord_bank_sample', '延长线组样本', 'tech', 80, '🔌', '延长线组样本。');
_mkTpl('power_strip_bank_sample', '排插组样本', 'tech', 85, '🔌', '排插组样本。');
_mkTpl('adapter_bank_sample', '适配器组样本', 'tech', 90, '🔌', '适配器组样本。');
_mkTpl('charger_bank_sample', '充电器组样本', 'tech', 95, '🔌', '充电器组样本。');
_mkTpl('power_bank_bank_sample', '充电宝组样本', 'tech', 110, '🔋', '充电宝组样本。');
_mkTpl('battery_bank_sample', '电池组样本', 'tech', 75, '🔋', '电池组样本。');
_mkTpl('solar_cell_bank_sample', '太阳能电池组样本', 'tech', 125, '☀️', '太阳能电池组样本。');
_mkTpl('fuel_cell_bank_sample', '燃料电池组样本', 'tech', 145, '🔋', '燃料电池组样本。');

// ---- v3.0 新增职业（原版9职业补全） ----
PROFESSIONS.push(
  { id: 'hydro_farmer', name: '水培农夫', subtitle: '水培种植 · 种子暴利', icon: '🌱', color: '#4ade80', credits: 540, energy: 120, luck: 8,
    desc: '自带水培系统与种子包，把营养片种成营养果、绽放莓与梦幻菇！',
    perks: ['自带【水培系统】', '自带【标准储物舱(占2扩10)】', '种子与作物售价 +20%'],
    startingMachines: ['hydroponics'], startingLicenses: ['general'],
    startingItems: ['bay_standard', 'nutrifruit_seed', 'bloomberry_seed', 'nutrient_tablet', 'nutrient_tablet'],
    repMod: { lower: 20, security: 5, blackmarket: 5, rebel: 10, upper: 5 } },
  { id: 'aquaculturist', name: '水产养殖户', subtitle: '鱼塘养殖 · 鱼子酱暴利', icon: '🐟', color: '#22d3ee', credits: 560, energy: 120, luck: 8,
    desc: '自带循环水产系统，养罗非鱼、鲟鱼产鱼子酱卖给上层！',
    perks: ['自带【循环水产系统】', '自带【远征补给箱(占2扩8)】', '鱼类与鱼子酱售价 +25%'],
    startingMachines: ['aquaculture'], startingLicenses: ['general'],
    startingItems: ['expedition_box', 'tilapia_live', 'fish_feed', 'fish_feed', 'aqua_filter'],
    repMod: { lower: 15, security: 5, blackmarket: 10, rebel: 5, upper: 15 } },
  { id: 'rock_bottom', name: '一无所有者', subtitle: '极限挑战 · 零起步', icon: '🕳️', color: '#94a3b8', credits: 0, energy: 100, luck: 15,
    desc: '原版 Rock Bottom 挑战：0 CR 开局，只有一件衣服和一颗不服输的心！',
    perks: ['0 CR 开局，幸运值 15', '自带【腰包(占1扩4)】', '通关奖励翻倍'],
    startingMachines: [], startingLicenses: ['general'],
    startingItems: ['fanny_pack', 'morsel_small', 'scratcher_ticket'],
    repMod: { lower: 10, security: 0, blackmarket: 10, rebel: 5, upper: 0 } }
);

// ---- v3.0 难度（原版4难度） ----
export const DIFFICULTIES = [
  { id: 'gouge', name: 'Price Gouge 宰客模式', icon: '💰', creditsMult: 1.15, rentMult: 0.9, buyoutMult: 0.9, budgetMult: 1.15, augMult: 0.8, desc: '顾客预算 +15%，房租 -10%。适合新手暴富。' },
  { id: 'markup', name: 'Mark Up 标准模式', icon: '⚖️', creditsMult: 1.0, rentMult: 1.0, buyoutMult: 1.0, budgetMult: 1.0, augMult: 1.0, desc: '原版标准难度，平衡体验。' },
  { id: 'thin_margins', name: 'Thin Margins 薄利模式', icon: '📉', creditsMult: 0.9, rentMult: 1.2, buyoutMult: 1.15, budgetMult: 0.9, augMult: 1.2, desc: '顾客预算 -10%，房租 +20%，AI 威胁 +20%。' },
  { id: 'red_ink', name: 'Red Ink 赤字模式', icon: '🔴', creditsMult: 0.75, rentMult: 1.45, buyoutMult: 1.35, budgetMult: 0.8, augMult: 1.5, desc: '地狱难度：预算 -20%，房租 +45%，AI 威胁 +50%。' }
];

// ---- v3.0 开局特性（原版正/负/中性） ----
export const PERKS_POSITIVE = [
  { id: 'short_sleeper', name: '短睡者', icon: '😴', desc: '夜间回电 +20⚡' },
  { id: 'model_citizen', name: '模范公民', icon: '⭐', desc: '治安声望 +15，盘查概率 -20%' },
  { id: 'lucky', name: '幸运儿', icon: '🍀', desc: '幸运值 +25' },
  { id: 'intimidating', name: '气势逼人', icon: '😠', desc: '议价容忍度 +15%' },
  { id: 'vending_machine', name: '自动售货机', icon: '🏪', desc: '自带【自动售货机】夜间被动销售' },
  { id: 'sawyers_crew', name: '索耶手下', icon: '🕵️', desc: '免费解锁索耶黑市专线' },
  { id: 'diplomatic', name: '外交家', icon: '🤝', desc: '全派系声望 +10' },
  { id: 'proficient_scavenger', name: '熟练拾荒者', icon: '🗑️', desc: '夜间垃圾场收获 +2 件' },
  { id: 'vigilant', name: '警觉', icon: '👁️', desc: 'AI 扫描耗电减半' },
  { id: 'experienced_chemist', name: '资深化学家', icon: '🧪', desc: '所有机器耗电 -15%' }
];
export const PERKS_NEGATIVE = [
  { id: 'ascetic', name: '苦行者', icon: '🧘', desc: '声望获取 -30%' },
  { id: 'minimalist', name: '极简主义者', icon: '📦', desc: '主货架 -4 格' },
  { id: 'sentinel_disorder', name: '哨兵紊乱症', icon: '🤖', desc: 'AI 威胁 +20' },
  { id: 'bad_lease', name: '烂租约', icon: '📜', desc: '房租 +30%' },
  { id: 'convict', name: '前科犯', icon: '⛓️', desc: '初始嫌疑 +25' },
  { id: 'addictions', name: '成瘾者', icon: '💊', desc: '能量上限 -30' },
  { id: 'unlucky', name: '倒霉蛋', icon: '☠️', desc: '幸运值 -20' },
  { id: 'blackmail', name: '被勒索', icon: '💸', desc: '开局信用点 -200' }
];
export const PERKS_NEUTRAL = [
  { id: 'aug_menace', name: 'AI 威胁', icon: '🤖', desc: 'AI 改造体更频繁来访（赏金 +50%）' },
  { id: 'makeshift_reactor', name: '简易反应堆', icon: '☢️', desc: '能量上限 +40，夜间回电 +10' },
  { id: 'prime_real_estate', name: '黄金地段', icon: '🏙️', desc: '买断地契价格 -20%' }
];

// ---- v3.0 每日新闻事件（原版报纸市场事件） ----
export const NEWSPAPER_EVENTS = [
  { id: 'nutrifruit_blight', headline: '📰《星环日报》：营养果枯萎病爆发！营养果价格暴涨！', category: 'supply', mult: 1.6, desc: '营养果与种子价格 +60%' },
  { id: 'seed_heist', headline: '📰《星环日报》：种子仓库遭劫！种子价格飙升！', category: 'material', mult: 1.5, desc: '材料价格 +50%' },
  { id: 'blackout', headline: '📰《星环日报》：全站停电！电池与能源价格暴涨！', category: 'tech', mult: 1.55, desc: '科技品价格 +55%' },
  { id: 'pastel_leak', headline: '📰《星环日报》：艾莉诺 Pastel 种子泄露！种子价格暴跌！', category: 'material', mult: 0.6, desc: '材料价格 -40%' },
  { id: 'relief_aid', headline: '📰《星环日报》：救济物资抵达！食品价格下跌！', category: 'supply', mult: 0.65, desc: '食品价格 -35%' },
  { id: 'war_surge', headline: '📰《星环日报》：前线战事吃紧！军火价格暴涨！', category: 'weapon', mult: 1.6, desc: '武器价格 +60%' },
  { id: 'med_shortage', headline: '📰《星环日报》：医疗物资短缺！药品价格暴涨！', category: 'medical', mult: 1.5, desc: '医疗价格 +50%' },
  { id: 'luxury_boom', headline: '📰《星环日报》：上层区奢侈品热销！奢侈品价格暴涨！', category: 'luxury', mult: 1.55, desc: '奢侈品价格 +55%' },
  { id: 'contraband_crackdown', headline: '📰《星环日报》：治安部严打违禁品！黑市价格暴涨！', category: 'contraband', mult: 1.7, desc: '违禁品价格 +70%' },
  { id: 'crate_rush', headline: '📰《星环日报》：开箱热潮席卷全站！密封箱价格暴涨！', category: 'crate', mult: 1.5, desc: '密封箱价格 +50%' }
];

// ---- v3.0 新增机器（原版30+机器补全） ----
Object.assign(MACHINES, {
  hydroponics: { id: 'hydroponics', name: '水培系统', icon: '🌱', cost: 280, desc: '用种子+营养片种出营养果、绽放莓、梦幻菇等作物。', recipes: [
    { id: 'grow_nutrifruit', name: '种植营养果 (产3)', inputs: ['nutrifruit_seed', 'nutrient_tablet'], output: 'nutrifruit', outputCount: 3, power: 14, note: '1 营养果种子 + 1 营养片 → 3 颗营养果' },
    { id: 'grow_bloomberry', name: '种植绽放莓 (产3)', inputs: ['bloomberry_seed', 'nutrient_tablet'], output: 'bloomberry', outputCount: 3, power: 14, note: '1 绽放莓种子 + 1 营养片 → 3 颗绽放莓' },
    { id: 'grow_dreamcap', name: '种植梦幻菇 (产2)', inputs: ['dream_cap_spores', 'nutrient_tablet'], output: 'dream_cap', outputCount: 2, power: 16, note: '1 梦幻菇孢子 + 1 营养片 → 2 朵梦幻菇' },
    { id: 'grow_fillerweed', name: '种植填充草 (产4)', inputs: ['fillerweed_seed', 'nutrient_tablet'], output: 'fillerweed', outputCount: 4, power: 10, note: '1 填充草种子 + 1 营养片 → 4 株填充草' }
  ]},
  dna_manipulator: { id: 'dna_manipulator', name: 'DNA 操纵器', icon: '🧬', cost: 340, desc: '操纵基因序列，产出超级酵母与基因样本。', recipes: [
    { id: 'dna_super_yeast', name: '基因改造超级酵母', inputs: ['yeast_std', 'gene_sample'], output: 'yeast_super', outputCount: 2, power: 22, note: '1 酵母 + 1 基因样本 → 2 超级酵母' },
    { id: 'dna_bioreactor', name: '培育生物反应器酵母', inputs: ['yeast_super', 'bio_moss'], output: 'yeast_bioreactor', outputCount: 1, power: 28, note: '1 超级酵母 + 1 荧光苔藓 → 1 生物反应器酵母 (250 CR)' }
  ]},
  printer_3d: { id: 'printer_3d', name: '3D 打印机', icon: '🖨️', cost: 320, desc: '打印枪械零件、瞄具、消音器与解放者手枪。', recipes: [
    { id: 'print_liberator', name: '打印解放者手枪', inputs: ['filament_3d', 'filament_3d', 'gun_parts'], output: 'liberator_pistol', outputCount: 1, power: 20, note: '2 耗材 + 1 枪械零件 → 1 解放者手枪' },
    { id: 'print_suppressor', name: '打印消音器', inputs: ['filament_3d', 'scrap_metal'], output: 'suppressor', outputCount: 1, power: 16, note: '1 耗材 + 1 废金属 → 1 消音器' },
    { id: 'print_scope', name: '打印狙击镜', inputs: ['filament_3d', 'electronic_parts'], output: 'scope', outputCount: 1, power: 18, note: '1 耗材 + 1 电子元件 → 1 狙击镜' },
    { id: 'print_mag', name: '打印弹匣', inputs: ['filament_3d', 'filament_3d'], output: 'magazine', outputCount: 2, power: 12, note: '2 耗材 → 2 弹匣' }
  ]},
  blender: { id: 'blender', name: '搅拌机', icon: '🥤', cost: 180, desc: '搅拌果糊、代乳与营养饮品。', recipes: [
    { id: 'blend_galaxy', name: '搅拌繁星果糊', inputs: ['nutrifruit', 'bloomberry'], output: 'galaxy_blend', outputCount: 2, power: 10, note: '1 营养果 + 1 绽放莓 → 2 繁星果糊' },
    { id: 'blend_pilk', name: '调配碳酸代乳', inputs: ['animal_fat', 'bottled_water_std'], output: 'pilk', outputCount: 2, power: 10, note: '1 动物脂肪 + 1 瓶装水 → 2 碳酸代乳' }
  ]},
  heating_plate: { id: 'heating_plate', name: '加热板', icon: '🔥', cost: 160, desc: '加热速食、融化脂肪、烹制食材。', recipes: [
    { id: 'heat_ramen', name: '煮速食拉面', inputs: ['instant_ramen', 'bottled_water_std'], output: 'instant_ramen', outputCount: 1, power: 8, note: '加热后拉面估值提升（原版加热加成）' },
    { id: 'heat_fat', name: '炼动物脂肪', inputs: ['offal'], output: 'animal_fat', outputCount: 2, power: 10, note: '1 内脏 → 2 动物脂肪' }
  ]},
  evaporator: { id: 'evaporator', name: '蒸发器', icon: '💨', cost: 220, desc: '蒸发提纯化学试剂与盐分。', recipes: [
    { id: 'evap_salt', name: '蒸发提纯盐', inputs: ['dirty_water'], output: 'salt_sample', outputCount: 2, power: 12, note: '1 浑浊水 → 2 盐样本' },
    { id: 'evap_reagent', name: '蒸发浓缩试剂', inputs: ['reagent_acidic', 'reagent_basic'], output: 'chem_common', outputCount: 1, power: 16, note: '酸+碱试剂 → 1 基础化学试剂' }
  ]},
  chem_finisher: { id: 'chem_finisher', name: '化学精制机', icon: '⚗️', cost: 330, desc: '精制梦魇尘、咖啡因、山奈德、芬太片等违禁/药品。', recipes: [
    { id: 'chem_caffeine', name: '精制咖啡因片', inputs: ['coffee_beans', 'chem_common'], output: 'caffeine_pill', outputCount: 3, power: 14, note: '1 咖啡豆 + 1 化学试剂 → 3 咖啡因片' },
    { id: 'chem_zyanide', name: '精制山奈德片', inputs: ['chem_restricted', 'reagent_acidic'], output: 'zyanide_pill', outputCount: 2, power: 20, note: '1 管制前体 + 1 酸试剂 → 2 山奈德片' },
    { id: 'chem_phanta', name: '精制芬太片', inputs: ['chem_restricted', 'reagent_basic'], output: 'phanta_pill', outputCount: 3, power: 20, note: '1 管制前体 + 1 碱试剂 → 3 芬太片' },
    { id: 'chem_nomore', name: '精制奥克莫吸', inputs: ['chem_common', 'reagent_reducing'], output: 'nomore_injector', outputCount: 2, power: 18, note: '1 化学试剂 + 1 还原试剂 → 2 奥克莫吸' },
    { id: 'chem_nightmare', name: '精制梦魇尘大瓶', inputs: ['nightmare_cap', 'chem_restricted'], output: 'nightmare_dust_vial', outputCount: 2, power: 24, note: '1 梦魇菇 + 1 管制前体 → 2 梦魇尘大瓶' }
  ]},
  agewell: { id: 'agewell', name: 'AgeWell 陈酿窖', icon: '🍷', cost: 300, desc: '把普通葡萄酒窖藏成顶级陈酿佳酿！', recipes: [
    { id: 'age_wine', name: '窖藏陈酿佳酿', inputs: ['wine_bottle', 'wine_bottle'], output: 'aged_wine', outputCount: 1, power: 15, note: '2 瓶普通葡萄酒 → 1 瓶陈酿佳酿 (320 CR!)' },
    { id: 'age_bloom', name: '窖藏绽放莓酒', inputs: ['bloomberry_wine', 'wine_bottle'], output: 'aged_wine', outputCount: 1, power: 15, note: '1 绽放莓酒 + 1 普通酒 → 1 陈酿佳酿' }
  ]},
  desequencer: { id: 'desequencer', name: 'Desequencer 序列分解器', icon: '🔢', cost: 360, desc: '分解芯片产出部门钥匙卡！', recipes: [
    { id: 'desq_service', name: '分解出后勤钥匙卡', inputs: ['elec_parts_rare', 'energy_cell'], output: 'keycard_service', outputCount: 1, power: 22, note: '1 稀有电子零件 + 1 电池 → 1 后勤钥匙卡' },
    { id: 'desq_medical', name: '分解出医疗钥匙卡', inputs: ['elec_parts_rare', 'energy_cell', 'chem_common'], output: 'keycard_medical', outputCount: 1, power: 24, note: '稀有零件+电池+试剂 → 1 医疗钥匙卡' },
    { id: 'desq_engineering', name: '分解出工程钥匙卡', inputs: ['elec_parts_rare', 'energy_cell', 'scrap_metal'], output: 'keycard_engineering', outputCount: 1, power: 24, note: '稀有零件+电池+废金属 → 1 工程钥匙卡' },
    { id: 'desq_security', name: '分解出治安钥匙卡', inputs: ['elec_parts_rare', 'energy_cell', 'gun_parts'], output: 'keycard_security', outputCount: 1, power: 26, note: '稀有零件+电池+枪械零件 → 1 治安钥匙卡' },
    { id: 'desq_supply', name: '分解出补给钥匙卡', inputs: ['elec_parts_common', 'energy_cell'], output: 'keycard_supply', outputCount: 1, power: 20, note: '普通零件+电池 → 1 补给钥匙卡' },
    { id: 'desq_research', name: '分解出研究钥匙卡', inputs: ['elec_parts_rare', 'elec_parts_rare', 'energy_cell'], output: 'keycard_research', outputCount: 1, power: 30, note: '2 稀有零件 + 1 电池 → 1 研究钥匙卡' }
  ]},
  furnace: { id: 'furnace', name: '熔炉', icon: '🔥', cost: 240, desc: '熔炼废料、矿石与垃圾成金属锭。', recipes: [
    { id: 'smelt_ingot', name: '熔炼金属锭', inputs: ['scrap_metal', 'scrap_metal', 'metal_ore'], output: 'metal_ingot', outputCount: 2, power: 18, note: '2 废金属 + 1 矿石 → 2 金属锭' },
    { id: 'smelt_junk', name: '熔炼垃圾废料', inputs: ['junk_scrap', 'junk_scrap', 'junk_scrap'], output: 'metal_ingot', outputCount: 1, power: 12, note: '3 垃圾废料 → 1 金属锭' },
    { id: 'smelt_rare', name: '熔炼稀有矿石', inputs: ['rare_ore', 'metal_ore'], output: 'elec_parts_rare', outputCount: 1, power: 22, note: '1 稀有矿石 + 1 普通矿石 → 1 稀有电子零件' }
  ]},
  fridge: { id: 'fridge', name: '冷藏冰箱', icon: '🧊', cost: 200, desc: '冷藏饮料 +20% 估值，冷冻冰淇淋/努特加 +25%！（被动加成）', recipes: [] },
  vending: { id: 'vending', name: '自动售货机', icon: '🏪', cost: 350, desc: '夜间被动销售货架商品，睡一觉醒来自动进账！', recipes: [] },
  mirage: { id: 'mirage', name: 'Mirage 投影仪', icon: '📽️', cost: 400, desc: '全息投影吸引顾客：顾客数量与预算 +100% 吸引力！（被动）', recipes: [] },
  alarm_sys: { id: 'alarm_sys', name: '警报系统', icon: '🚨', cost: 220, desc: '治安盘查概率 -40%，嫌疑增长减半。（被动）', recipes: [] },
  recharger: { id: 'recharger', name: '充电站', icon: '🔌', cost: 180, desc: '夜间回电 +30⚡。（被动）', recipes: [] },
  powerbloc: { id: 'powerbloc', name: 'PowerBloc 电源块', icon: '🔋', cost: 260, desc: '能量上限 +60。（被动）', recipes: [] },
  micro_reactor: { id: 'micro_reactor', name: '微型核反应堆', icon: '☢️', cost: 600, desc: '能量上限 +120，夜间回电 +40⚡。（被动）', recipes: [] },
  animal_cage: { id: 'animal_cage', name: '动物笼', icon: '🐀', cost: 200, desc: '养殖小动物产肉产蛋。（被动+配方）', recipes: [
    { id: 'cage_meat', name: '养殖产肉', inputs: ['morsel_food', 'nutrifruit'], output: 'raw_meat_std', outputCount: 1, power: 14, note: '1 口粮 + 1 营养果 → 1 标准生肉' }
  ]},
  mouse_trap: { id: 'mouse_trap', name: '捕鼠陷阱', icon: '🐭', cost: 120, desc: '夜间自动捕鼠产肉。（被动）', recipes: [] },
  auto_butcher: { id: 'auto_butcher', name: '自动屠宰机', icon: '🔪', cost: 280, desc: '把活鱼活物屠宰成鱼片肉片。', recipes: [
    { id: 'butcher_tilapia', name: '屠宰罗非鱼', inputs: ['tilapia_live'], output: 'tilapia_fillet', outputCount: 2, power: 10, note: '1 活罗非鱼 → 2 罗非鱼片' },
    { id: 'butcher_sturgeon', name: '屠宰鲟鱼取卵', inputs: ['sturgeon_live'], output: 'sturgeon_roe', outputCount: 2, power: 14, note: '1 活鲟鱼 → 2 鲟鱼卵' }
  ]},
  aquaculture: { id: 'aquaculture', name: '循环水产系统', icon: '🐟', cost: 320, desc: '养罗非鱼产鱼皮，养鲟鱼产鱼子酱！', recipes: [
    { id: 'aqua_tilapia', name: '养殖罗非鱼 (产2)', inputs: ['tilapia_live', 'fish_feed'], output: 'tilapia_live', outputCount: 2, power: 14, note: '1 活鱼 + 1 饲料 → 2 活罗非鱼' },
    { id: 'aqua_skin', name: '产罗非鱼皮移植片', inputs: ['tilapia_fillet', 'chem_common'], output: 'tilapia_skin', outputCount: 1, power: 18, note: '1 鱼片 + 1 试剂 → 1 鱼皮移植片 (130 CR)' },
    { id: 'aqua_caviar', name: '产鲟鱼鱼子酱', inputs: ['sturgeon_live', 'fish_feed', 'fish_feed'], output: 'caviar', outputCount: 2, power: 24, note: '1 活鲟鱼 + 2 饲料 → 2 鱼子酱 (480 CR!)' },
    { id: 'aqua_caviar_tin', name: '精制鱼子酱铁盒', inputs: ['caviar', 'metal_ingot'], output: 'caviar_tin', outputCount: 1, power: 16, note: '1 鱼子酱 + 1 金属锭 → 1 铁盒鱼子酱 (300 CR)' }
  ]},
  cassette_player: { id: 'cassette_player', name: '磁带播放器', icon: '📼', cost: 150, desc: '播放磁带：顾客耐心 +1，氛围拉满。（被动）', recipes: [] },
  storage_coordinator: { id: 'storage_coordinator', name: '仓储协调器', icon: '🗄️', cost: 300, desc: '自动整理库存：主货架 +6 格。（被动）', recipes: [] },
  moisture_farm: { id: 'moisture_farm', name: '冷凝水农场', icon: '💧', cost: 200, desc: '冷凝收集浑浊水。', recipes: [
    { id: 'condense_water', name: '冷凝产水 (产2)', inputs: ['energy_cell'], output: 'dirty_water', outputCount: 2, power: 12, note: '1 电池 → 2 浑浊回收水' }
  ]},
  bottle_printer: { id: 'bottle_printer', name: '瓶装水打印机', icon: '🖨️', cost: 180, desc: '打印瓶装水。', recipes: [
    { id: 'print_water', name: '打印瓶装水 (产3)', inputs: ['filament_3d'], output: 'bottled_water_std', outputCount: 3, power: 10, note: '1 耗材 → 3 瓶装水' }
  ]}
});

// ---- v3.0 新增批发商 ----
WHOLESALE_MERCHANTS.push(
  { id: 'hydro_supply', code: '7719', name: '水培农场直供社', role: '种子 · 营养片 · 水培作物批发', icon: '🌱', faction: 'lower', unlockNote: '默认开放', unlockedByDefault: true,
    desc: '水培农场源头直供！种子与营养片整批拿货！',
    catalog: [
      { tplId: 'nutrifruit_seed', packQty: 3, price: 85, stockPerDay: 3, tag: '3包种子装' },
      { tplId: 'bloomberry_seed', packQty: 3, price: 85, stockPerDay: 3, tag: '3包种子装' },
      { tplId: 'nutrient_tablet', packQty: 5, price: 18, stockPerDay: 4, tag: '5片整包' },
      { tplId: 'nutrifruit', packQty: 4, price: 35, stockPerDay: 3, tag: '4颗整箱' },
      { tplId: 'kotton_seed', packQty: 3, price: 45, stockPerDay: 3, tag: '3包韧棉种子' }
    ]},
  { id: 'aqua_supply', code: '8820', name: '深海水产批发商', role: '活鱼 · 饲料 · 鱼子酱批发', icon: '🐟', faction: 'upper', unlockCost: 180, unlockNote: '花 180 CR 解锁水产专线', unlockedByDefault: false,
    desc: '活鱼与鱼子酱源头批发！',
    catalog: [
      { tplId: 'tilapia_live', packQty: 3, price: 105, stockPerDay: 3, tag: '3条活鱼装' },
      { tplId: 'fish_feed', packQty: 4, price: 55, stockPerDay: 4, tag: '4包饲料装' },
      { tplId: 'caviar', packQty: 2, price: 380, stockPerDay: 2, tag: '2罐鱼子酱' },
      { tplId: 'sturgeon_live', packQty: 1, price: 180, stockPerDay: 1, tag: '1条活鲟鱼' }
    ]},
  { id: 'gunsmith_supply', code: '9901', name: '军火商·老炮专线', role: '枪械零件 · 弹药 · 耗材批发', icon: '🔫', faction: 'rebel', unlockCost: 200, unlockNote: '花 200 CR 解锁军火专线', unlockedByDefault: false,
    desc: '军火零件与弹药整批供应！',
    catalog: [
      { tplId: 'gun_parts', packQty: 3, price: 55, stockPerDay: 3, tag: '3包零件装' },
      { tplId: 'filament_3d', packQty: 4, price: 38, stockPerDay: 3, tag: '4卷耗材装' },
      { tplId: 'ammo_10mm', packQty: 3, price: 150, stockPerDay: 2, tag: '3匣弹药装' },
      { tplId: 'mod_efficiency', packQty: 1, price: 60, stockPerDay: 2, tag: '效率模块' },
      { tplId: 'mod_quality', packQty: 1, price: 60, stockPerDay: 2, tag: '品质模块' }
    ]}
);
// 给现有批发商追加新品
(function(){
  const j = WHOLESALE_MERCHANTS.find(m=>m.id==='jackson_tech');
  if (j) j.catalog.push(
    { tplId: 'satchel', packQty: 1, price: 125, stockPerDay: 2, tag: '占1扩6' },
    { tplId: 'bay_extended', packQty: 1, price: 720, stockPerDay: 1, tag: '占2扩16超大' },
    { tplId: 'bay_machine_expanded', packQty: 1, price: 1000, stockPerDay: 1, tag: '占2扩20终极' },
    { tplId: 'smuggler_bay_mod', packQty: 1, price: 340, stockPerDay: 1, tag: '占2扩12免检' },
    { tplId: 'mod_overclock', packQty: 1, price: 85, stockPerDay: 2, tag: '超频模块' },
    { tplId: 'mod_bay_kit', packQty: 1, price: 130, stockPerDay: 2, tag: '模块槽扩容' }
  );
  const s = WHOLESALE_MERCHANTS.find(m=>m.id==='sawyer_exchange');
  if (s) s.catalog.push(
    { tplId: 'crate_expedition', packQty: 1, price: 155, stockPerDay: 2, tag: '远征密封箱' },
    { tplId: 'keycard_supply', packQty: 2, price: 95, stockPerDay: 2, tag: '2张补给卡' },
    { tplId: 'keycard_research', packQty: 1, price: 105, stockPerDay: 1, tag: '研究部钥匙卡' },
    { tplId: 'dream_dust', packQty: 2, price: 550, stockPerDay: 2, tag: '2瓶梦魇尘' },
    { tplId: 'mod_neural_core', packQty: 1, price: 210, stockPerDay: 1, tag: '神经核心模块' }
  );
  const d = WHOLESALE_MERCHANTS.find(m=>m.id==='dale_pharma');
  if (d) d.catalog.push(
    { tplId: 'synaprest_injector', packQty: 1, price: 290, stockPerDay: 1, tag: '赛纳普斯注射器' },
    { tplId: 'eternal_serum', packQty: 1, price: 420, stockPerDay: 1, tag: '永恒精华液' },
    { tplId: 'nightingale_salve', packQty: 2, price: 130, stockPerDay: 2, tag: '2支夜莺药膏' }
  );
})();

// ---- v3.0 新增顾客原型 ----
CUSTOMER_ARCHETYPES.push(
  { id: 'hydro_farmer_cust', roleName: '水培农夫', faction: 'lower', avatarHue: 120, helmet: 'normal', sellPool: ['nutrifruit', 'bloomberry', 'dream_cap', 'fillerweed', 'nutrifruit_seed'], buyCategories: ['material', 'supply'], preferredTplIds: ['nutrient_tablet', 'nutrifruit_seed', 'bloomberry_seed', 'kotton_seed'], minQty: 2, maxQty: 3, honesty: 0.9, patience: 3, budgetMult: 1.15, greetings: ['我种的水培作物大丰收！营养果和绽放莓便宜卖你！', '急需营养片和种子，扩大水培规模！'] },
  { id: 'aquaculturist_cust', roleName: '水产养殖户', faction: 'upper', avatarHue: 190, helmet: 'normal', sellPool: ['tilapia_live', 'tilapia_fillet', 'fish_feed', 'sturgeon_roe'], buyCategories: ['supply', 'luxury'], preferredTplIds: ['caviar', 'caviar_tin', 'sturgeon_roe', 'tilapia_skin'], minQty: 2, maxQty: 3, honesty: 0.9, patience: 3, budgetMult: 1.3, greetings: ['我养的鲟鱼产卵了！鱼子酱和鱼片便宜处理！', '上层餐厅急需鱼子酱，有多少要多少！'] },
  { id: 'gunsmith_cust', roleName: '地下枪械匠', faction: 'rebel', avatarHue: 20, helmet: 'goggles', sellPool: ['gun_parts', 'filament_3d', 'ammo_22_sr', 'liberator_pistol'], buyCategories: ['weapon', 'material'], preferredTplIds: ['gun_parts', 'filament_3d', 'suppressor', 'scope', 'magazine'], minQty: 2, maxQty: 3, honesty: 0.85, patience: 3, budgetMult: 1.25, greetings: ['枪械零件和耗材整批出！', '急需枪械零件和3D耗材！'] },
  { id: 'chemist_cust', roleName: '合成化学家', faction: 'blackmarket', avatarHue: 270, helmet: 'goggles', sellPool: ['chem_common', 'reagent_acidic', 'reagent_basic', 'coffee_beans'], buyCategories: ['medical', 'material'], preferredTplIds: ['chem_common', 'chem_restricted', 'reagent_acidic', 'reagent_basic', 'reagent_reducing'], minQty: 2, maxQty: 3, honesty: 0.8, patience: 3, budgetMult: 1.2, greetings: ['化学试剂整批转让！', '急需化学试剂与管制前体！'] },
  { id: 'tourist_collector', roleName: '星际收藏家', faction: 'upper', avatarHue: 310, helmet: 'visor_gold', sellPool: ['cassette_synth', 'old_earth_coin', 'star_map'], buyCategories: ['luxury'], preferredTplIds: ['relic_core', 'deepspace_relic', 'star_core', 'crown_jewel', 'holy_grail'], minQty: 1, maxQty: 2, honesty: 0.92, patience: 2, budgetMult: 1.6, greetings: ['听说你这儿有深空遗物？我出高价收购！', '磁带和古币便宜卖你，换点新鲜藏品。'] },
  { id: 'station_doctor', roleName: '空间站医生', faction: 'security', avatarHue: 200, helmet: 'collar', sellPool: ['med_supplies_common', 'bandage_basic', 'rubbing_alcohol'], buyCategories: ['medical'], preferredTplIds: ['immuno_med', 'synaprest_injector', 'surgery_kit', 'eternal_serum', 'tilapia_skin'], minQty: 2, maxQty: 3, honesty: 0.95, patience: 3, budgetMult: 1.3, greetings: ['医院急需免疫宁和手术包！', '医疗物资整批采购！'] },
  { id: 'winemaker', roleName: '酿酒师', faction: 'upper', avatarHue: 330, helmet: 'normal', sellPool: ['wine_bottle', 'bloomberry_wine', 'yeast_std'], buyCategories: ['luxury', 'supply'], preferredTplIds: ['aged_wine', 'synth_wine', 'bloomberry_wine', 'gloomberry_wine', 'nudka_vodka'], minQty: 2, maxQty: 3, honesty: 0.9, patience: 3, budgetMult: 1.4, greetings: ['我酿的果酒便宜卖！', '急需陈酿佳酿和紫酒！'] },
  { id: 'scavenger_elite', roleName: '精英拾荒者', faction: 'lower', avatarHue: 45, helmet: 'goggles', forceIntent: 'sell_to_shop', sellPool: ['elec_parts_rare', 'plasma_cartridge', 'cyber_arm', 'relic_core', 'quantum_chip', 'superconductor'], buyCategories: ['tech'], minQty: 2, maxQty: 4, honesty: 0.6, patience: 3, budgetMult: 1.1, greetings: ['废墟深处挖到的硬货！稀有零件和遗物整批出！', '精英拾荒，假一赔十！'] },
  { id: 'blackmarket_broker', roleName: '黑市经纪人', faction: 'blackmarket', avatarHue: 285, helmet: 'hood', sellPool: ['keycard_research', 'mod_neural_core', 'void_shard', 'dark_matter'], buyCategories: ['contraband', 'tech', 'module'], preferredTplIds: ['keycard_command', 'keycard_research', 'mod_neural_core', 'void_shard', 'dream_dust', 'blue_blood'], minQty: 2, maxQty: 3, honesty: 0.75, patience: 2, budgetMult: 1.45, greetings: ['黑市硬货！研究卡和神经核心！', '违禁品与模块全收！'] },
  { id: 'rebel_medic', roleName: '革命军军医', faction: 'rebel', avatarHue: 150, helmet: 'beret', sellPool: ['med_supplies_common', 'bandage_hemostatic'], buyCategories: ['medical', 'weapon'], preferredTplIds: ['immuno_med', 'surgery_kit', 'bandage_hemostatic', 'synaprest_injector'], minQty: 2, maxQty: 3, honesty: 0.92, patience: 3, budgetMult: 1.35, greetings: ['前线伤员急需医疗物资！', '免疫宁和手术包有多少要多少！'] },
  { id: 'upper_investor', roleName: '上层区投资人', faction: 'upper', avatarHue: 320, helmet: 'visor_gold', forceIntent: 'buy_from_shop', sellPool: [], buyCategories: ['luxury', 'tech'], preferredTplIds: ['aged_wine', 'eternal_serum', 'relic_core', 'quantum_chip', 'fusion_core', 'caviar_tin'], minQty: 2, maxQty: 4, honesty: 0.9, patience: 2, budgetMult: 1.7, greetings: ['我来投资你的店铺！奢侈品和高端科技全收！', '上层区最抢手的货都给我！'] },
  { id: 'junk_dealer', roleName: '废品商', faction: 'lower', avatarHue: 35, helmet: 'miner_cap', forceIntent: 'buy_from_shop', isBulkLiquidator: true, sellPool: [], buyCategories: ['material'], minQty: 3, maxQty: 4, honesty: 0.8, patience: 3, budgetMult: 0.85, greetings: ['废料、矿石、垃圾全收！一次清仓！', '破烂都给我，我按公斤收！'] }
);

// ---- v3.0 通缉犯补全（7人） ----
WANTED_POOL.push(
  { id: 'wanted_eleanor', name: '艾莉诺·Pastel', crime: '种子走私与基因窃取', bounty: 280, mark: '粉色短发，戴花环，背着种子包', faction: 'blackmarket' },
  { id: 'wanted_ren', name: '伦警官（叛变）', crime: '收受贿赂与栽赃平民', bounty: 320, mark: '治安制服，左胸警徽歪斜', faction: 'security' },
  { id: 'wanted_sawyer', name: '索耶', crime: '地下交易所头目', bounty: 350, mark: '兜帽+墨镜，手指戴多枚戒指', faction: 'blackmarket' },
  { id: 'wanted_georgio', name: '乔治奥', crime: '放射性废料非法倾倒', bounty: 260, mark: '反应堆外包商，戴防毒面具', faction: 'blackmarket' }
);

// ---- v3.0 剧情 NPC 补全 ----
STORY_NPCS.eleanor_seed = { day: 7, id: 'eleanor_seed', name: '艾莉诺·Pastel', role: '种子走私者', faction: 'blackmarket',
  text: '艾莉诺压低声音：“掌柜的，我这儿有一批从研究部偷来的【营养果种子×3】和【绽放莓种子×3】，只要 150 CR！或者你帮我藏匿一批【梦魇菇】，我付你 200 CR 保管费！”',
  choices: [
    { label: '花 150 CR 买下种子包（+3营养果种子 +3绽放莓种子）', effect: 'buy_eleanor_seeds' },
    { label: '帮她藏匿梦魇菇（+200 CR，嫌疑+10）', effect: 'hide_eleanor_mushroom' },
    { label: '婉拒（黑市 -5）', effect: 'reject_eleanor' }
  ]};
STORY_NPCS.ren_addiction = { day: 8, id: 'ren_addiction', name: '伦警官', role: '治安部警官', faction: 'security',
  text: '伦警官面色憔悴：“我对赛纳普斯注射器上瘾了……求你卖我一支【赛纳普斯注射器】，我给你 300 CR！或者帮我戒毒，我欠你一个人情！”',
  choices: [
    { label: '卖他一支赛纳普斯注射器（+300 CR，治安+10）', effect: 'sell_ren_synaprest' },
    { label: '帮他戒毒（治安+20，解锁治安特权）', effect: 'cure_ren' },
    { label: '拒绝（治安-5）', effect: 'reject_ren' }
  ]};
STORY_NPCS.sawyer_deal = { day: 9, id: 'sawyer_deal', name: '索耶', role: '地下交易所头目', faction: 'blackmarket',
  text: '索耶推来一箱货：“老规矩！【远征补给密封箱 + 补给钥匙卡】一套只要 180 CR！或者免费帮你开通【军火商·老炮】专线！”',
  choices: [
    { label: '花 180 CR 买远征箱+卡套组', effect: 'buy_sawyer_expedition' },
    { label: '免费开通军火商专线', effect: 'unlock_gunsmith_line' },
    { label: '婉拒', effect: 'reject_sawyer' }
  ]};
STORY_NPCS.georgio_return = { day: 10, id: 'georgio_return', name: '乔治奥', role: '反应堆外包商', faction: 'blackmarket',
  text: '乔治奥：“上次那 2 桶废料你倒了吗？这是给你的【液体好运】谢礼！另外我这儿有【放射性废料桶×2】，收 200 CR 帮我处理？”',
  choices: [
    { label: '收下液体好运谢礼', effect: 'georgio_gift' },
    { label: '再接 200 CR 脏活（+2桶废料）', effect: 'accept_waste2' },
    { label: '拒绝', effect: 'reject_georgio2' }
  ]};

// ---- v3.0 结局图鉴（17结局） ----
export const ENDINGS = [
  { id: 'kingdom_key', name: '王国之钥', victory: true, desc: '买下永久地契，自由大掌柜。' },
  { id: 'rebel_star', name: '自由星环', victory: true, desc: '革命军地下军火库。' },
  { id: 'shadow_box_king', name: '盲盒教父', victory: true, desc: '第13区开箱之王。' },
  { id: 'aug_hunter', name: '改造体猎手', victory: true, desc: '肃清 AI 改造体。' },
  { id: 'hydro_king', name: '水培之王', victory: true, desc: '水培作物垄断全站。' },
  { id: 'aqua_tycoon', name: '水产大亨', victory: true, desc: '鱼子酱帝国。' },
  { id: 'chem_master', name: '化学大师', victory: true, desc: '制药酿酒传奇。' },
  { id: 'gunsmith_legend', name: '枪械传奇', victory: true, desc: '军火改装大师。' },
  { id: 'evicted', name: '破产违约', victory: false, desc: '无力支付房租被扫地出门。' },
  { id: 'aug_uprising', name: 'AI 同化', victory: false, desc: '街区被机械蜂巢接管。' },
  { id: 'prison_murder', name: '深空重刑犯', victory: false, desc: '误杀平民被流放苦役。' },
  { id: 'raid_busted', name: '查抄没收', victory: false, desc: '嫌疑满格被治安部查封。' },
  { id: 'blackmarket_boss', name: '黑市教父', victory: true, desc: '黑市声望满格成为地下之王。' },
  { id: 'upper_tycoon', name: '上层大亨', victory: true, desc: '上层区声望满格。' },
  { id: 'security_hero', name: '治安英雄', victory: true, desc: '治安部声望满格。' },
  { id: 'lower_saint', name: '下层圣人', victory: true, desc: '下层街坊爱戴。' },
  { id: 'collector', name: '收藏家', victory: true, desc: '集齐 50 种以上物品。' }
];

// 远征箱掉落表
CRATE_LOOT_TABLES.crate_expedition = {
  guaranteed: ['ration_sealed_std', 'energy_cell'],
  rolls: [
    { id: 'morsel_food', chance: 0.6 }, { id: 'bottled_water_std', chance: 0.6 },
    { id: 'keycard_supply', chance: 0.45 }, { id: 'filter_core', chance: 0.5 },
    { id: 'expedition_box', chance: 0.2 }, { id: 'micro_purifier', chance: 0.1 }
  ]
};

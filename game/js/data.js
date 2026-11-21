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

// ============================================================================
// 《深空当铺：可能是偷的》(Deepspace Pawnshop: Probably Stolen)
// 核心数据库：职业流派、阵营、物品图鉴、鉴定规则、机器生产链、顾客与剧情事件
// ============================================================================

export const FACTIONS = {
  lower: {
    id: 'lower',
    name: '下层街区',
    short: '下层区',
    color: '#94a3b8',
    desc: '底层拾荒者、矿工与平民。声望高时进货享受 15% 邻里折扣，垃圾场偶遇线人。',
    perkThreshold: 40,
    perkDesc: '声望≥40：底层居民出售物品要价降低 15%，夜间拾荒额外收获 +1'
  },
  security: {
    id: 'security',
    name: '空间站治安局',
    short: '治安局',
    color: '#ef4444',
    desc: '腐败而强硬的执法机构。声望高可减少突击查抄并购买武器许可；案底高会招致搜查。',
    perkThreshold: 40,
    perkDesc: '声望≥40：解锁二级军火许可，贿赂费用减半，击毙改造体赏金 +25%'
  },
  blackmarket: {
    id: 'blackmarket',
    name: '第13区黑市',
    short: '黑市',
    color: '#c084fc',
    desc: '地下销赃网与暗巷帮派。声望高会吸引大盗与高价值违禁品买家，但容易引起条子注意。',
    perkThreshold: 40,
    perkDesc: '声望≥40：黑市商人高价收购赃物与违禁品 (+25%)，开放夜间黑市特殊货源'
  },
  rebel: {
    id: 'rebel',
    name: '深空革命军',
    short: '革命军',
    color: '#22c55e',
    desc: '反抗上层垄断的地下武装。急需武器、纯净水与医疗品，声望高可提供庇护与秘密订单。',
    perkThreshold: 40,
    perkDesc: '声望≥40：革命军高价采购军火与医疗物资 (+30%)，危急时替你销毁一次治安局案底'
  },
  upper: {
    id: 'upper',
    name: '上层穹顶区',
    short: '上层区',
    color: '#f472b6',
    desc: '奢靡冷漠的权贵精英。只对高纯度佳酿、古董遗物和义体感兴趣，出价极高但极度挑剔。',
    perkThreshold: 40,
    perkDesc: '声望≥40：吸引富豪收藏家到访，展示柜奢侈品溢价 +35%'
  }
};

export const PROFESSIONS = [
  {
    id: 'apprentice',
    name: '底层学徒',
    subtitle: '均衡开局 · 鉴定专精',
    icon: '🔍',
    color: '#38bdf8',
    credits: 650,
    energy: 100,
    desc: '前任老店长留下的放大镜与鉴定笔记。资金宽裕，没有案底，适合稳扎稳打摸透空间站生存法则。',
    perks: ['初始信用点 650 CR', '自带【光学放大镜】与【水质检测试剂】', '鉴定揭穿假货时对方降价幅度额外 +10%'],
    startingMachines: [],
    startingLicenses: ['general'],
    startingItems: ['ration_pack', 'dirty_water', 'cig_redstar'],
    repMod: { lower: 15, security: 10, blackmarket: 0, rebel: 5, upper: 0 }
  },
  {
    id: 'water_merchant',
    name: '净水商人',
    subtitle: '民生刚需 · 水质提纯',
    icon: '💧',
    color: '#06b6d4',
    credits: 450,
    energy: 120,
    desc: '在下层区，干净的水比命还贵。你开局拥有一台工业净水器，但小心别把受辐射污染的废水卖给街坊——或者掺点料牟取暴利。',
    perks: ['开局自带【工业净水器】机器', '自带【水质光谱仪】无限检测纯度', '水资源与饮品售价 +15%'],
    startingMachines: ['purifier'],
    startingLicenses: ['general', 'water_permit'],
    startingItems: ['dirty_water', 'dirty_water', 'filter_core'],
    repMod: { lower: 20, security: 5, blackmarket: 0, rebel: 10, upper: 0 }
  },
  {
    id: 'gunsmith',
    name: '地下枪械匠',
    subtitle: '军火改装 · 高危暴利',
    icon: '🔫',
    color: '#f97316',
    credits: 420,
    energy: 100,
    desc: '靠修复损坏的动能手枪和脉冲步枪发家。利润惊人，但治安局巡逻队每隔几天就会来查你的持枪许可证和序列号。',
    perks: ['开局自带【武器改装台】与【一级军火许可】', '自带【AI改造体扫描仪】', '武器与零件交易利润 +20%，但初始治安关注度较高'],
    startingMachines: ['workbench'],
    startingLicenses: ['general', 'arms_1'],
    startingItems: ['broken_pistol', 'scrap_metal', 'energy_cell'],
    repMod: { lower: 5, security: 5, blackmarket: 15, rebel: 15, upper: 0 }
  },
  {
    id: 'chemist',
    name: '合成化学家',
    subtitle: '药剂酿造 · 灰色成瘾',
    icon: '🧪',
    color: '#a855f7',
    credits: 440,
    energy: 110,
    desc: '无论是救命的“免疫宁”，还是令人沉醉的深空合成烈酒与违禁兴奋剂，都在你的蒸馏釜里诞生。配方与纯度决定一切。',
    perks: ['开局自带【化学合成蒸馏釜】', '化学药剂、酒类与医疗品估值 +20%', '解锁隐藏违禁合成配方'],
    startingMachines: ['synthesizer'],
    startingLicenses: ['general', 'med_permit'],
    startingItems: ['bio_moss', 'industrial_alcohol', 'immuno_med'],
    repMod: { lower: 10, security: 0, blackmarket: 20, rebel: 5, upper: 10 }
  },
  {
    id: 'fence',
    name: '暗巷销赃人',
    subtitle: '黑市倒爷 · 刀尖舔血',
    icon: '🎭',
    color: '#ec4899',
    credits: 520,
    energy: 90,
    desc: '“这批货可能是偷的，但谁在乎呢？”你天生懂得利用秘密暗格藏匿赃物，与第13区小偷和走私客称兄道弟。',
    perks: ['暗格初始容量翻倍（6格），自带【序列号打磨机】', '收购赃物额外压价 20%，黑市初始声望 30', '初始带有 15 点治安局嫌疑值'],
    startingMachines: ['scrambler'],
    startingLicenses: ['general'],
    startingItems: ['stolen_watch', 'credit_chip_locked', 'cig_redstar'],
    repMod: { lower: 5, security: -10, blackmarket: 30, rebel: 10, upper: 5 }
  }
];

// 物品模板库
// category: 'supply'(民生补给), 'luxury'(奢侈古董), 'medical'(化学医疗), 'weapon'(军火武器), 'tech'(赛博零件), 'material'(工业原料), 'contraband'(重度违禁)
export const ITEM_TEMPLATES = {
  dirty_water: {
    id: 'dirty_water',
    name: '浑浊回收水 (2L)',
    category: 'material',
    baseValue: 28,
    w: 1, h: 2,
    icon: '🚱',
    legal: 'legal',
    inspectType: 'liquid',
    desc: '空间站冷凝管收集的未经处理水源，含有重金属和微量辐射。直接饮用有患病风险。',
    authenticSigns: { seal: '冷凝站原厂封口', clarity: '轻度浑浊 (纯度 ~52%)', rads: '微弱背景辐射 (18 mSv)' },
    fakeSigns: [
      { key: 'rads', badText: '致命辐射超标 (420 mSv - 反应堆冷却废液!)', reason: '辐射含量严重超标，实为工业废液' },
      { key: 'clarity', badText: '刺鼻化学油膜 (纯度 <15%)', reason: '掺杂工业废油，无法正常饮用' }
    ]
  },
  pure_water: {
    id: 'pure_water',
    name: '99.9% 特级纯净水',
    category: 'supply',
    baseValue: 88,
    w: 1, h: 2,
    icon: '💧',
    legal: 'legal',
    inspectType: 'liquid',
    desc: '经过多层反渗透滤芯净化的生命之源，在下层区硬通货程度堪比信用点。',
    authenticSigns: { seal: '蓝环防伪热缩膜完好', clarity: '晶莹剔透 (纯度 99.9%)', rads: '零辐射残留 (0.0 mSv)' },
    fakeSigns: [
      { key: 'seal', badText: '热缩膜有二次吹风机加热皱褶', reason: '封口存在二次封装痕迹，系自来水灌装假货' },
      { key: 'clarity', badText: '底部有肉眼可见悬浮絮状物 (纯度 68%)', reason: '水质纯度虚标，未达饮用特级标准' }
    ]
  },
  cig_redstar: {
    id: 'cig_redstar',
    name: '“红巨星”过滤嘴香烟',
    category: 'supply',
    baseValue: 65,
    w: 1, h: 1,
    icon: '🚬',
    legal: 'legal',
    inspectType: 'packaging',
    desc: '矿工与治安官最爱的合成烟草制品。市面上充斥着锯末卷制的劣质假烟。',
    authenticSigns: { stamp: '贸易署激光全息税标 (清晰变色)', print: '烫金“RED GIANT”凹凸压印', smell: '烘烤合成烟叶焦香' },
    fakeSigns: [
      { key: 'stamp', badText: '税标为普通油墨印刷，无全息反光', reason: '防伪税标系廉价油墨伪造' },
      { key: 'print', badText: '拼写错误印成了“RED GAINT”', reason: '包装外盒存在低级拼写印刷错误' },
      { key: 'smell', badText: '散发发霉木屑与劣质胶水味', reason: '内部填充物为发霉木屑而非烟草' }
    ]
  },
  ration_pack: {
    id: 'ration_pack',
    name: '军用高能营养膏',
    category: 'supply',
    baseValue: 55,
    w: 1, h: 1,
    icon: '🥫',
    legal: 'legal',
    inspectType: 'packaging',
    desc: '印着联合舰队标志的铝塑管装蛋白质糊，虽然味道像湿纸板，但一管能顶两天饿。',
    authenticSigns: { date: '保质期至 2192 年 · 批次号激光蚀刻', seal: '真空铝膜紧绷平整', code: '舰队后勤部校验码通过' },
    fakeSigns: [
      { key: 'date', badText: '原过期日期被砂纸磨掉后重盖墨印', reason: '生产日期被人为篡改涂抹，实为过期军粮' },
      { key: 'seal', badText: '包装明显胀袋鼓包，按压漏气', reason: '铝塑袋胀袋变质，存在肉毒毒素风险' }
    ]
  },
  immuno_med: {
    id: 'immuno_med',
    name: '“免疫宁”抗辐射注射器',
    category: 'medical',
    baseValue: 145,
    w: 1, h: 2,
    icon: '💉',
    legal: 'permit_med',
    inspectType: 'chemical',
    desc: '深空辐射病与哨兵综合征的救命药剂。黑市假药泛滥，不少骗子用染色生理盐水充数。',
    authenticSigns: { liquid: '淡蔚蓝荧光药液，摇晃后3秒消泡', label: '海卫一制药微缩防伪码完好', needle: '无菌钛合金封针未拆封' },
    fakeSigns: [
      { key: 'liquid', badText: '液体呈死板深蓝色，沉淀出色素颗粒', reason: '药液系食用色素勾兑生理盐水，毫无疗效' },
      { key: 'needle', badText: '针头护帽有细微血迹与拔插划痕', reason: '使用过的医疗废品二次回收灌装' }
    ]
  },
  synth_wine: {
    id: 'synth_wine',
    name: '星云陈酿合成紫酒',
    category: 'luxury',
    baseValue: 175,
    w: 1, h: 2,
    icon: '🍷',
    legal: 'legal',
    inspectType: 'liquid',
    desc: '用深空荧光苔藓与精馏酒精酿造的佳酿，深受上层穹顶区精英追捧。',
    authenticSigns: { clarity: '琥珀紫挂杯绵密 (酒精度 42.0%)', methanol: '甲醇残留 <0.01% (安全)', cork: '合成橡木塞烙有星环酒庄徽记' },
    fakeSigns: [
      { key: 'methanol', badText: '工业甲醇含量高达 4.8% (致盲风险!)', reason: '工业酒精直接勾兑，甲醇严重超标' },
      { key: 'cork', badText: '塞口由廉价塑料塞加胶水封死', reason: '酒瓶系回收真瓶灌装劣质散酒' }
    ]
  },
  scrap_metal: {
    id: 'scrap_metal',
    name: '高纯钛合金废料',
    category: 'material',
    baseValue: 35,
    w: 2, h: 1,
    icon: '🔩',
    legal: 'legal',
    inspectType: 'tech',
    desc: '从废弃舱壁或无人机残骸上拆下的合金板材，可用于冶炼零件或修复枪械。',
    authenticSigns: { alloy: '无磁性航空钛合金 (密度 4.5g/cm³)', rust: '表面仅轻微太空氧化层' },
    fakeSigns: [
      { key: 'alloy', badText: '强磁铁吸附反应剧烈，内芯是镀漆生铁', reason: '实为廉价铸铁表面喷涂钛银漆' }
    ]
  },
  filter_core: {
    id: 'filter_core',
    name: '纳米碳净水滤芯',
    category: 'material',
    baseValue: 42,
    w: 1, h: 1,
    icon: '🧽',
    legal: 'legal',
    inspectType: 'tech',
    desc: '工业净水器的核心耗材，能将浑浊废水提纯为昂贵的特级纯净水。',
    authenticSigns: { mesh: '蜂窝纳米碳膜未染色，透气均匀', casing: '卡扣无磨损痕迹' },
    fakeSigns: [
      { key: 'mesh', badText: '内部碳粉结块发黑，系报废旧滤芯水洗翻新', reason: '滤芯早已饱和失效，系旧件水洗翻新' }
    ]
  },
  bio_moss: {
    id: 'bio_moss',
    name: '深空荧光培养苔藓',
    category: 'material',
    baseValue: 48,
    w: 1, h: 1,
    icon: '🌿',
    legal: 'legal',
    inspectType: 'chemical',
    desc: '无土栽培舱产出的活性有机植物，是合成“免疫宁”和酿造紫酒的关键原料。',
    authenticSigns: { activity: '孢子生物活性 94%，幽绿微光稳定', mold: '无杂菌感染斑点' },
    fakeSigns: [
      { key: 'activity', badText: '菌丝枯死发黑，涂有荧光粉伪装活性', reason: '苔藓已完全失活，表面喷涂工业荧光剂' }
    ]
  },
  industrial_alcohol: {
    id: 'industrial_alcohol',
    name: '精馏工业乙醇罐',
    category: 'material',
    baseValue: 40,
    w: 1, h: 1,
    icon: '🧪',
    legal: 'legal',
    inspectType: 'liquid',
    desc: '化学合成与酿造的基础溶剂，经过脱毒蒸馏后可用于制药或酿酒。',
    authenticSigns: { purity: '无水乙醇纯度 96%', container: '防爆铝罐压力正常' },
    fakeSigns: [
      { key: 'purity', badText: '兑水严重，摇晃全是水泡 (纯度仅 35%)', reason: '乙醇被大量兑水稀释' }
    ]
  },
  energy_cell: {
    id: 'energy_cell',
    name: '高密聚变电池组',
    category: 'tech',
    baseValue: 75,
    w: 1, h: 1,
    icon: '🔋',
    legal: 'legal',
    inspectType: 'tech',
    desc: '既能给店铺机器补充 60 点电力，也能驱动 AI 扫描仪或高价转售。',
    authenticSigns: { charge: '满载电压 24.0V · 循环次数 <10次', shell: '绝缘陶瓷外壳无鼓包' },
    fakeSigns: [
      { key: 'charge', badText: '虚标电压，实测内阻极大仅剩 8% 残电', reason: '报废电芯串联虚标满电' }
    ]
  },
  broken_pistol: {
    id: 'broken_pistol',
    name: '卡壳的9mm动能手枪',
    category: 'weapon',
    baseValue: 95,
    w: 2, h: 1,
    icon: '🔧',
    legal: 'permit_arms',
    inspectType: 'weapon',
    desc: '撞针断裂的下层区防身手枪。在改装台上用废金属修复后价值翻倍。',
    authenticSigns: { barrel: '膛线尚存7成新，仅击发弹簧断裂', serial: '民用防卫序列号可查' },
    fakeSigns: [
      { key: 'barrel', badText: '枪管内部炸膛裂缝被焊锡掩盖，开火即炸', reason: '炸膛报废枪管被焊锡伪装，无法安全修复' }
    ]
  },
  kinetic_pistol: {
    id: 'kinetic_pistol',
    name: '“蝮蛇”制式动能手枪',
    category: 'weapon',
    baseValue: 230,
    w: 2, h: 1,
    icon: '🔫',
    legal: 'permit_arms',
    inspectType: 'weapon',
    desc: '校准完毕的半自动手枪。无一级军火许可摆在明面上会被治安官直接没收并罚款！',
    authenticSigns: { barrel: '冷锻精钢膛线完好，击锤清脆', serial: '标准防卫署备案编码', frame: '原厂聚合物握把' },
    fakeSigns: [
      { key: 'frame', badText: '劣质3D打印塑料机匣，猛击即碎', reason: '采用廉价塑料3D打印拼装的玩具级仿制品' }
    ]
  },
  pulse_rifle: {
    id: 'pulse_rifle',
    name: '军用电磁脉冲步枪',
    category: 'contraband',
    baseValue: 460,
    w: 2, h: 2,
    icon: '⚡',
    legal: 'contraband',
    inspectType: 'weapon',
    desc: '严禁民间持有的重型制式武器。革命军与黑市疯抢的硬货，但被治安局搜出后果极其严重。',
    authenticSigns: { coil: '超导加速线圈导通率 99%', serial: '军方批次铭牌', capacitor: '高能电容充放电正常' },
    fakeSigns: [
      { key: 'coil', badText: '内部超导线圈被偷换成了普通铜线', reason: '核心超导电磁线圈被调包，无法激发脉冲' }
    ]
  },
  stolen_watch: {
    id: 'stolen_watch',
    name: '欧米茄古董机械怀表',
    category: 'luxury',
    baseValue: 260,
    w: 1, h: 1,
    icon: '⌚',
    legal: 'legal',
    inspectType: 'luxury',
    desc: '旧地球时代的精密机械遗物，上层贵族趋之若鹜。经常带有失主报案的防盗追踪码。',
    authenticSigns: { movement: '17钻陀飞轮擒纵机构运转精准', case: '18K玫瑰金表壳，内侧瑞士铭文清晰', glass: '蓝宝石弧面表镜无划痕' },
    fakeSigns: [
      { key: 'movement', badText: '打开后盖里面塞着廉价电子石英机芯', reason: '内部机芯为廉价石英表芯伪造机械表' },
      { key: 'case', badText: '表壳镀金层脱落，露出黄铜底色', reason: '表壳系黄铜电镀而非真金古董' }
    ]
  },
  cyber_arm: {
    id: 'cyber_arm',
    name: '“荒坂式”军规义体手臂',
    category: 'tech',
    baseValue: 340,
    w: 2, h: 2,
    icon: '🦾',
    legal: 'permit_arms',
    inspectType: 'tech',
    desc: '具备液压增力模块的精密义体。义体诊所、上层买家与改装客都愿意出大价钱。',
    authenticSigns: { servo: '微型液压伺服电机响应延迟 2ms', neuro: '神经接驳金手指无氧化烧蚀', armor: '碳纤维外甲原厂涂装' },
    fakeSigns: [
      { key: 'neuro', badText: '神经接口存在严重过载烧焦黑斑（死人身上硬扯下来的报废件）', reason: '神经接驳芯片已烧毁报废' },
      { key: 'servo', badText: '关节活动发出刺耳齿轮卡死声', reason: '内部液压漏油且齿轮崩齿' }
    ]
  },
  credit_chip_locked: {
    id: 'credit_chip_locked',
    name: '加密黑金信用芯片',
    category: 'contraband',
    baseValue: 180,
    w: 1, h: 1,
    icon: '💳',
    legal: 'contraband',
    inspectType: 'tech',
    desc: '从上层区银行劫案流出的死账芯片。用序列号打磨机/解码器破译后可提取高额无痕资金或转卖黑市。',
    authenticSigns: { chip: '量子加密存储扇区完整，内含活跃秘钥', casing: '钛金封装未触发自毁熔断' },
    fakeSigns: [
      { key: 'chip', badText: '芯片已被远程触发电磁自毁，内部全是乱码空扇区', reason: '芯片已触发防盗自毁，实为空白废卡' }
    ]
  },
  unlocked_ledger: {
    id: 'unlocked_ledger',
    name: '破译的不记名债券芯片',
    category: 'luxury',
    baseValue: 390,
    w: 1, h: 1,
    icon: '💎',
    legal: 'legal',
    inspectType: 'tech',
    desc: '洗白并解除追踪的巨额不记名债权凭证，任何富商或黑市金主都会爽快高价买走。',
    authenticSigns: { chip: '区块链无痕签名校验有效', casing: '全新匿名封装壳' },
    fakeSigns: []
  },
  red_dust: {
    id: 'red_dust',
    name: '“猩红星尘”神经兴奋剂',
    category: 'contraband',
    baseValue: 380,
    w: 1, h: 1,
    icon: '🩸',
    legal: 'contraband',
    inspectType: 'chemical',
    desc: '高度管制的违禁神经加速药剂。暴利惊人，但一旦被治安官查获或卖给便衣线人就会引火烧身。',
    authenticSigns: { crystal: '深红六方晶系粉末，折射率极高', purity: '合成生物碱纯度 95%' },
    fakeSigns: [
      { key: 'crystal', badText: '掺入大量红砖粉与咖啡因颗粒', reason: '掺杂大量砖粉的劣质假货' }
    ]
  },
  rad_barrel: {
    id: 'rad_barrel',
    name: '高危放射性废料桶',
    category: 'contraband',
    baseValue: 15,
    w: 2, h: 2,
    icon: '☢️',
    legal: 'contraband',
    inspectType: 'liquid',
    desc: '别人花脏钱请你代为处理的烫手山芋！留在店里每晚会增加辐射污染与治安风险，必须在夜间去垃圾场偷偷倾倒处理。',
    authenticSigns: { rads: '盖革计数器疯狂爆表 (1800 mSv)!!', seal: '铅封桶壁正在缓慢渗漏绿液' },
    fakeSigns: []
  },
  relic_core: {
    id: 'relic_core',
    name: '先驱者母舰量子遗物',
    category: 'luxury',
    baseValue: 580,
    w: 2, h: 2,
    icon: '🔮',
    legal: 'legal',
    inspectType: 'luxury',
    desc: '深空遗迹打捞出的神秘悬浮球体，全空间站最顶级的收藏珍品。放进展示柜能引来最阔绰的大人物。',
    authenticSigns: { field: '反重力微弱自旋力场稳定', glyph: '古地球先驱者纳米蚀刻铭文' },
    fakeSigns: [
      { key: 'field', badText: '底座藏着微型磁悬浮线圈和纽扣电池', reason: '现代磁悬浮工艺品伪造远古遗物' }
    ]
  }
};

// 店面后室机器与生产链
export const MACHINES = {
  purifier: {
    id: 'purifier',
    name: '工业反渗透净水器',
    icon: '💧',
    cost: 280,
    powerPerRun: 20,
    desc: '将浑浊回收水与滤芯加工成高利润的 99.9% 特级纯净水。',
    recipes: [
      {
        id: 'purify_water_clean',
        name: '标准多层净化',
        inputs: ['dirty_water', 'filter_core'],
        output: 'pure_water',
        outputCount: 2,
        power: 20,
        note: '消耗 1 浑浊水 + 1 纳米滤芯 → 产出 2 瓶正品特级纯净水'
      },
      {
        id: 'purify_water_shady',
        name: '无滤芯快速粗滤 (次品伪装)',
        inputs: ['dirty_water'],
        output: 'pure_water',
        outputCount: 1,
        makeFake: true,
        power: 12,
        note: '仅消耗 1 浑浊水 → 产出 1 瓶伪装成特级纯净水的次品水（可坑骗粗心买家，被识破掉声望）'
      }
    ]
  },
  workbench: {
    id: 'workbench',
    name: '精密军火与机械改装台',
    icon: '🛠️',
    cost: 340,
    powerPerRun: 25,
    desc: '修复损坏枪械、组装军规义体或升级重型脉冲武器。',
    recipes: [
      {
        id: 'repair_pistol',
        name: '修复并校准动能手枪',
        inputs: ['broken_pistol', 'scrap_metal'],
        output: 'kinetic_pistol',
        outputCount: 1,
        power: 20,
        note: '消耗 1 卡壳手枪 + 1 钛合金废料 → 产出 1 把正品“蝮蛇”手枪'
      },
      {
        id: 'build_pulse_rifle',
        name: '秘密改装军用脉冲步枪',
        inputs: ['kinetic_pistol', 'energy_cell', 'scrap_metal'],
        output: 'pulse_rifle',
        outputCount: 1,
        power: 35,
        note: '消耗 1 蝮蛇手枪 + 1 聚变电池 + 1 废金属 → 产出 1 把违禁脉冲步枪 (暴利!)'
      }
    ]
  },
  synthesizer: {
    id: 'synthesizer',
    name: '化学合成与酿造蒸馏釜',
    icon: '⚗️',
    cost: 320,
    powerPerRun: 25,
    desc: '调配“免疫宁”抗辐射药剂、酿造上层紫酒，或提炼违禁“猩红星尘”。',
    recipes: [
      {
        id: 'brew_wine',
        name: '发酵星云陈酿紫酒',
        inputs: ['bio_moss', 'industrial_alcohol'],
        output: 'synth_wine',
        outputCount: 1,
        power: 20,
        note: '消耗 1 荧光苔藓 + 1 工业乙醇 → 产出 1 瓶星云陈酿紫酒'
      },
      {
        id: 'craft_immuno',
        name: '合成“免疫宁”药剂',
        inputs: ['bio_moss', 'pure_water'],
        output: 'immuno_med',
        outputCount: 1,
        power: 22,
        note: '消耗 1 荧光苔藓 + 1 特级纯净水 → 产出 1 支免疫宁注射器'
      },
      {
        id: 'cook_reddust',
        name: '提纯违禁“猩红星尘”',
        inputs: ['immuno_med', 'industrial_alcohol'],
        output: 'red_dust',
        outputCount: 1,
        power: 30,
        note: '消耗 1 免疫宁 + 1 工业乙醇 → 产出 1 份高危违禁品“猩红星尘”'
      }
    ]
  },
  scrambler: {
    id: 'scrambler',
    name: '量子序列号打磨/解码仪',
    icon: '💻',
    cost: 300,
    powerPerRun: 20,
    desc: '抹除任何赃物上的失主报案追踪码（洗白赃物），或破译黑金加密芯片。',
    recipes: [
      {
        id: 'decode_chip',
        name: '破译黑金信用芯片',
        inputs: ['credit_chip_locked', 'energy_cell'],
        output: 'unlocked_ledger',
        outputCount: 1,
        power: 25,
        note: '消耗 1 加密黑金芯片 + 1 聚变电池 → 产出 1 枚高价值不记名债券芯片'
      }
    ]
  }
};

// 店铺升级与许可证
export const UPGRADES_AND_LICENSES = [
  {
    id: 'aug_scanner',
    type: 'tool',
    name: '杰克逊博士的 AI 改造体扫描仪',
    icon: '📡',
    cost: 240,
    desc: '每次消耗 20 点电力对柜台前的顾客进行生物芯片扫描，100% 确认对方是否为失控 AI 改造体（Aug）。'
  },
  {
    id: 'spec_analyzer',
    type: 'tool',
    name: '全频段物质光谱仪',
    icon: '🔬',
    cost: 220,
    desc: '深度鉴定工具：一键透视液体纯度、化学成分、隐藏机芯与防盗追踪码，不漏过任何高仿瑕疵。'
  },
  {
    id: 'stash_expand',
    type: 'upgrade',
    name: '液压磁屏蔽暗格扩建',
    icon: '🗄️',
    cost: 260,
    desc: '将柜台下方的秘密防搜查暗格容量扩充至 8 格，治安官常规突击检查无法发现暗格内的赃物与违禁品。'
  },
  {
    id: 'display_case_up',
    type: 'upgrade',
    name: '全息防弹展示柜升级',
    icon: '✨',
    cost: 250,
    desc: '摆放在主货架前 3 格的高价值商品会自动吸引上层区富豪顾客，且所有出售议价容忍度提升 12%。'
  },
  {
    id: 'arms_1',
    type: 'license',
    name: '一级民用军火经营许可证',
    icon: '📜',
    cost: 300,
    reqFaction: { id: 'security', min: 10 },
    desc: '贸易署与治安局联合签发。合法持有与买卖手枪、义体等受控武器装备（不含重型脉冲步枪违禁品）。'
  },
  {
    id: 'med_permit',
    type: 'license',
    name: '深空医药与化学制剂许可',
    icon: '⚕️',
    cost: 200,
    desc: '合法经营“免疫宁”等处方抗辐射药剂，避免在治安巡查时被当作非法行医罚没。'
  },
  {
    id: 'appraiser_cert',
    type: 'license',
    name: '空间站鉴定委员会初级证书',
    icon: '🏅',
    cost: 220,
    desc: '挂在店内后，每天有概率吸引专门上门求鉴定的委托客人，成功鉴定即可直接赚取丰厚鉴定佣金！'
  }
];

// 人物原型与特征生成（用于《请出示证件》+《深空当铺》式的察言观色与 AI 改造体识别）
export const CUSTOMER_ARCHETYPES = [
  {
    id: 'miner',
    roleName: '下层矿工',
    faction: 'lower',
    avatarHue: 205,
    helmet: 'miner_cap',
    sellPool: ['scrap_metal', 'dirty_water', 'broken_pistol', 'cig_redstar', 'energy_cell'],
    buyCategories: ['supply', 'medical'],
    honesty: 0.72,
    patience: 3,
    budgetMult: 1.05,
    greetings: [
      '咳咳……刚从第9矿道下来，肺里全是铁锈味。老板，看看这件货收不收？',
      '老兄，这周水费又涨了，手头紧得要命，给个公道价吧。',
      '听说你这儿童叟无欺，我想淘点能保命的日用品。'
    ]
  },
  {
    id: 'scavenger',
    roleName: '废舱拾荒客',
    faction: 'lower',
    avatarHue: 38,
    helmet: 'goggles',
    sellPool: ['scrap_metal', 'filter_core', 'bio_moss', 'broken_pistol', 'stolen_watch', 'cyber_arm', 'ration_pack'],
    buyCategories: ['supply', 'tech'],
    honesty: 0.52,
    patience: 3,
    budgetMult: 1.0,
    greetings: [
      '嘿嘿，昨晚在废弃反应堆夹层摸出来的好宝贝，绝对原装正版！大概吧……',
      '别问哪儿来的，在这座空间站里，没人认领的东西就是无主之物。',
      '老板眼力毒，但咱这趟差点喂了变异鼠，多少给添几个子儿？'
    ]
  },
  {
    id: 'thief',
    roleName: '第13区暗巷扒手',
    faction: 'blackmarket',
    avatarHue: 280,
    helmet: 'hood',
    sellPool: ['stolen_watch', 'credit_chip_locked', 'cyber_arm', 'immuno_med', 'synth_wine', 'kinetic_pistol'],
    buyCategories: ['weapon', 'contraband', 'tech'],
    stolenChance: 0.75,
    honesty: 0.40,
    patience: 2,
    budgetMult: 1.22,
    greetings: [
      '嘘——小声点，外面刚过去一队红皮条子。这货有点“烫手”，你敢吃下吗？',
      '上层区老爷兜里刚顺出来的，连体温都还热乎着呢，便宜出给你。',
      '有没有不记名、不查证件的硬货？价钱好商量。'
    ]
  },
  {
    id: 'rebel_courier',
    roleName: '革命军地下联络员',
    faction: 'rebel',
    avatarHue: 140,
    helmet: 'beret',
    sellPool: ['energy_cell', 'industrial_alcohol', 'bio_moss', 'relic_core'],
    buyCategories: ['weapon', 'medical', 'supply', 'contraband'],
    honesty: 0.85,
    patience: 3,
    budgetMult: 1.25,
    greetings: [
      '为了自由星环。我们前线据点急需一批补给和防身家伙，算我欠你个人情。',
      '上层穹顶把持着90%的净水，弟兄们快撑不住了，你店里有存货吗？',
      '这是我们突袭运输船缴获的物资，换点现金买药。'
    ]
  },
  {
    id: 'upper_agent',
    roleName: '穹顶区私人买手',
    faction: 'upper',
    avatarHue: 330,
    helmet: 'visor_gold',
    sellPool: ['synth_wine', 'immuno_med', 'stolen_watch', 'relic_core'],
    buyCategories: ['luxury', 'tech'],
    honesty: 0.78,
    patience: 2,
    budgetMult: 1.48,
    greetings: [
      '啧，下层区的空气真是令人作呕……快点，我家主人想要几件体面的稀罕货。',
      '只要东西正宗，信用点不是问题。但要是敢拿假货糊弄我，等着瞧。',
      '把上层淘汰下来的藏品处理掉，你这小庙吃得下吗？'
    ]
  },
  {
    id: 'undercover_cop',
    roleName: '可疑的便衣访客',
    faction: 'security',
    avatarHue: 5,
    helmet: 'collar',
    isSting: true,
    sellPool: ['cig_redstar', 'kinetic_pistol'],
    buyCategories: ['contraband', 'weapon'],
    honesty: 0.65,
    patience: 2,
    budgetMult: 1.35,
    greetings: [
      '咳，老板，听说你这儿路子野……有没有那种“不需要许可证”的刺激玩意儿？我出高价。',
      '我是新来的帮派成员（眼神不自然地瞟向你的货架编号），卖点违禁品给我呗？'
    ]
  }
];

// 失控 AI 改造体（Aug）专属异常线索库（还原原版 6 大鉴别维度：芯片、瞳孔、表情、台词、动作、服饰错位）
export const AUG_CLUES = {
  visualTells: [
    '耳后皮肤下隐约闪烁着高频红色 AI 神经接驳芯片微光',
    '左眼瞳孔呈现非人类的六边形机械收缩网格，完全不眨眼',
    '面部肌肉僵硬对称，嘴角保持着毫米级固定弧度的诡异假笑'
  ],
  speechTells: [
    '你好，人类商业经营单位。我请求执行【等价物质交换协议】，误差容忍率 0.00%。',
    '这件物品的物理熵值处于理想区间。请立即输出你的信用点报价参数。',
    '口渴感模拟模块已触发……更正：我今天嗓子有点干，需要摄入液体或高能电池。'
  ],
  behaviorTells: [
    '身体静止得像一尊雕像，每隔4.2秒颈部关节会出现一次轻微的机械抽搐',
    '穿着下层矿工的破旧工装，胸口却别着上层穹顶区精英的门禁徽章（服饰与阵营严重不符）',
    '呼吸频率完全为零，手指在金属柜台上敲击出精准的二进制节拍'
  ],
  normalBehaviors: [
    '站在柜台前不耐烦地搓着手，时不时回头看一眼巷口巡逻队',
    '眼角带着熬夜的黑眼圈，说话时带着浓重的下层区口音与叹气声',
    '衣袖沾着机油和灰尘，神态自然地打量着货架上的标价牌',
    '呼吸略显急促，习惯性地摸了摸口袋里皱巴巴的烟盒'
  ]
};

// 通缉犯名单模板（每日随机刷新 1-2 名通缉犯特征，遇到可举报领赏或私下黑市交易）
export const WANTED_POOL = [
  {
    id: 'wanted_viper',
    name: '“独眼”维克多',
    crime: '劫持上层区运钞穿梭机',
    bounty: 220,
    mark: '右眼佩戴红色战术义眼罩，脖颈有条形码刺青',
    faction: 'blackmarket'
  },
  {
    id: 'wanted_ghost',
    name: '幽灵焊工·林',
    crime: '破坏空间站氧气税计费总闸',
    bounty: 190,
    mark: '左脸颊有一道电弧灼伤疤痕，头戴铜色护目镜',
    faction: 'rebel'
  },
  {
    id: 'wanted_crow',
    name: '渡鸦·科尔',
    crime: '倒卖军方加密神经芯片',
    bounty: 250,
    mark: '身穿深紫色高领兜帽衫，嘴角叼着银色金属牙签',
    faction: 'blackmarket'
  }
];

// 特殊剧情角色事件（致敬原版 卢 Lu、塞尔皮科 Serpico、乔治奥 Georgio、房东等黑色幽默故事线）
export const STORY_NPCS = {
  mentor_day1: {
    day: 1,
    id: 'mentor_intro',
    name: '老莫（前任独臂店主）',
    role: '退休当铺掌柜',
    faction: 'lower',
    text: '“咳咳……小子，钥匙给你了。记住在下层区开当铺的三条铁律：第一，买货前先拿放大镜看清楚封口和防伪标，十个拾荒客里有四个揣着假货；第二，治安局条子来查铺之前，把没证的枪和脏货塞进柜台底下的【秘密暗格】；第三，最近空间站闹失控 AI 改造体（Aug），要是确认对面不是活人，柜台底下那把霰弹枪别省子弹！每周日房东会来收租，攒够 12,000 信用点把产权买下来，你才算真正自由。”',
    choices: [
      { label: '收下老莫留下的备用电池与忠告 (+1 聚变电池)', effect: 'gift_cell' },
      { label: '询问关于“失控 AI 改造体”的细节 (+30 电量, 解锁鉴别图鉴)', effect: 'aug_tip' }
    ]
  },
  georgio_waste: {
    day: 3,
    id: 'georgio_waste',
    name: '乔治奥（反应堆外包工头）',
    role: '灰色废料中间人',
    faction: 'blackmarket',
    text: '乔治奥压低帽檐凑近柜台：“老板，发财的脏活干不干？上层反应堆有 2 桶【高危放射性废料】，正规无害化处理太贵了。你帮我暂存处理掉，我当场给你 **320 信用点** 现金！只要你晚上抽空去垃圾场偷偷倒掉就行……当然，别让治安局在店里搜出来。”',
    choices: [
      { label: '接下脏活！收下 320 CR 和 2 桶放射性废料', effect: 'accept_waste' },
      { label: '严词拒绝：我这小店不想变成辐射墓地', effect: 'reject_waste' }
    ]
  },
  lu_crate: {
    day: 5,
    id: 'lu_crate',
    name: '卢（神秘的乔装女客）',
    role: '革命军特勤先锋',
    faction: 'rebel',
    text: '身穿旧风衣的女人警惕地扫视门外，将一个沉甸甸的合金箱推上柜台：“听着，治安局特工正在封锁街区。这把改装脉冲步枪先寄存在你这儿保管两天，别卖掉也别被条子搜走。事成之后我给你 **450 信用点** 保管费，外加革命军的永久友谊。当然，如果你转头向治安局告密……我不建议你这么做。”',
    choices: [
      { label: '答应替卢保管箱中重武器（获得脉冲步枪，2天后卢回访重谢）', effect: 'lu_accept' },
      { label: '暗中按下治安局举报按钮领赏（+280 CR，治安局+20，革命军-30）', effect: 'lu_betray' },
      { label: '婉拒卷入派系纷争', effect: 'lu_decline' }
    ]
  },
  serpico_plea: {
    day: 6,
    id: 'serpico_plea',
    name: '瘦弱的送信少年',
    role: '垃圾场流亡者信使',
    faction: 'lower',
    text: '少年递来一封沾满油污的信：“是躲在垃圾倾倒场深处的塞尔皮科叔叔让我来的……他因为揭发水务公司掺毒被通缉，快饿死了。如果你背包里有【军用高能营养膏】或【特级纯净水】，能支援他一份吗？虽然没钱付给你，但下层区的街坊们都会记住你的恩情。”',
    choices: [
      { label: '免费赠送 1 份营养膏或纯净水救助塞尔皮科（下层区+22，革命军+12，获得神秘回礼线索）', effect: 'help_serpico' },
      { label: '资助 120 信用点让他自己买吃的（下层区+15，好运提升）', effect: 'pay_serpico' },
      { label: '冷漠赶走：当铺不做慈善（下层区-8）', effect: 'ignore_serpico' }
    ]
  }
};

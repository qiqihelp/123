package com.mchelper.data

object CommandRepository {
    
    val commands: List<Command> = listOf(
        Command(
            id = "gamemode",
            name = "/gamemode",
            syntax = "/gamemode <模式> [玩家]",
            description = "更改游戏模式",
            category = CommandCategory.GAMEPLAY,
            examples = listOf(
                "/gamemode creative - 切换到创造模式",
                "/gamemode survival - 切换到生存模式",
                "/gamemode adventure - 切换到冒险模式",
                "/gamemode spectator - 切换到旁观者模式"
            ),
            notes = "简写: /gm creative, /gm c, /gm 1"
        ),
        Command(
            id = "give",
            name = "/give",
            syntax = "/give <玩家> <物品> [数量] [数据值]",
            description = "给予玩家物品",
            category = CommandCategory.ITEM,
            examples = listOf(
                "/give @p diamond 64 - 给最近玩家64个钻石",
                "/give @a diamond_sword - 给所有玩家钻石剑",
                "/give @p minecraft:diamond 10"
            ),
            notes = "@p=最近玩家, @a=所有玩家, @r=随机玩家, @e=所有实体, @s=自己"
        ),
        Command(
            id = "tp",
            name = "/tp",
            syntax = "/tp <目标> [目的地]",
            description = "传送实体或玩家",
            category = CommandCategory.PLAYER,
            examples = listOf(
                "/tp @p ~ ~ ~10 - 向前传送10格",
                "/tp Steve Alex - 把Steve传送到Alex",
                "/tp @p 100 64 200 - 传送到指定坐标"
            ),
            notes = "~表示相对坐标, ~~表示当前坐标"
        ),
        Command(
            id = "summon",
            name = "/summon",
            syntax = "/summon <实体> [位置] [NBT]",
            description = "召唤实体",
            category = CommandCategory.ENTITY,
            examples = listOf(
                "/summon zombie ~ ~ ~ - 在当前位置召唤僵尸",
                "/summon cow ~ ~ ~ {CustomName:'\"Bessie\"'}",
                "/summon ender_dragon - 召唤末影龙"
            ),
            notes = "可配合NBT标签自定义实体属性"
        ),
        Command(
            id = "setblock",
            name = "/setblock",
            syntax = "/setblock <位置> <方块> [模式]",
            description = "放置方块",
            category = CommandCategory.BLOCK,
            examples = listOf(
                "/setblock ~ ~ ~ diamond_block - 在脚下放置钻石块",
                "/setblock 100 64 200 stone replace"
            ),
            notes = "模式: replace(替换), destroy(破坏原方块), keep(仅空气处放置)"
        ),
        Command(
            id = "fill",
            name = "/fill",
            syntax = "/fill <起点> <终点> <方块> [模式]",
            description = "填充区域",
            category = CommandCategory.BLOCK,
            examples = listOf(
                "/fill ~ ~ ~ ~10 ~10 ~10 stone - 填充10x10x10石头",
                "/fill ~ ~ ~ ~5 ~5 ~5 air - 清除区域"
            ),
            notes = "模式: replace, destroy, keep, hollow, outline"
        ),
        Command(
            id = "kill",
            name = "/kill",
            syntax = "/kill [目标]",
            description = "杀死实体",
            category = CommandCategory.ENTITY,
            examples = listOf(
                "/kill @e[type=zombie] - 杀死所有僵尸",
                "/kill @p - 杀死最近的玩家",
                "/kill @e - 杀死所有实体(慎用!)"
            ),
            notes = "不加参数则杀死自己"
        ),
        Command(
            id = "effect",
            name = "/effect",
            syntax = "/effect <give|clear> <目标> [效果] [秒数] [等级] [隐藏粒子]",
            description = "给予或清除效果",
            category = CommandCategory.PLAYER,
            examples = listOf(
                "/effect give @p speed 60 1 - 给予速度II 60秒",
                "/effect clear @p - 清除所有效果",
                "/effect give @p invisibility 999999 0 true - 隐身无粒子"
            ),
            notes = "等级从0开始, 0=I级, 1=II级"
        ),
        Command(
            id = "enchant",
            name = "/enchant",
            syntax = "/enchant <玩家> <附魔> [等级]",
            description = "附魔手持物品",
            category = CommandCategory.ITEM,
            examples = listOf(
                "/enchant @p sharpness 5 - 锋利V",
                "/enchant @p protection 4 - 保护IV",
                "/enchant @p mending - 经验修补"
            ),
            notes = "仅适用于可附魔的物品"
        ),
        Command(
            id = "time",
            name = "/time",
            syntax = "/time <set|add|query> <值>",
            description = "设置或查询时间",
            category = CommandCategory.WORLD,
            examples = listOf(
                "/time set day - 设置为白天",
                "/time set night - 设置为夜晚",
                "/time set 6000 - 设置为中午",
                "/time add 1000 - 时间前进1000"
            ),
            notes = "0=日出, 6000=中午, 12000=日落, 18000=午夜"
        ),
        Command(
            id = "weather",
            name = "/weather",
            syntax = "/weather <clear|rain|thunder> [秒数]",
            description = "设置天气",
            category = CommandCategory.WORLD,
            examples = listOf(
                "/weather clear - 晴天",
                "/weather rain 6000 - 下雨5分钟",
                "/weather thunder - 雷暴"
            ),
            notes = "不指定时间则持续随机时长"
        ),
        Command(
            id = "gamerule",
            name = "/gamerule",
            syntax = "/gamerule <规则> [值]",
            description = "设置游戏规则",
            category = CommandCategory.SERVER,
            examples = listOf(
                "/gamerule keepInventory true - 死亡保留物品",
                "/gamerule mobGriefing false - 生物不破坏方块",
                "/gamerule doDaylightCycle false - 时间停止",
                "/gamerule showDeathMessages false - 隐藏死亡消息"
            ),
            notes = "常用规则: keepInventory, mobGriefing, doDaylightCycle, doMobSpawning"
        ),
        Command(
            id = "scoreboard",
            name = "/scoreboard",
            syntax = "/scoreboard <objectives|players> ...",
            description = "管理计分板",
            category = CommandCategory.REDSTONE,
            examples = listOf(
                "/scoreboard objectives add death deathCount 死亡数",
                "/scoreboard players set @p money 1000",
                "/scoreboard objectives add kills playerKillCount"
            ),
            notes = "可用于制作复杂的游戏机制"
        ),
        Command(
            id = "execute",
            name = "/execute",
            syntax = "/execute <执行者> <位置> <子命令>",
            description = "以特定条件执行命令",
            category = CommandCategory.CHEAT,
            examples = listOf(
                "/execute at @p run say Hello",
                "/execute as @e[type=zombie] at @s run tp @s ~ ~ ~10",
                "/execute if block ~ ~ ~ diamond_block run say 找到钻石块"
            ),
            notes = "非常强大的命令, 可组合各种条件"
        ),
        Command(
            id = "clone",
            name = "/clone",
            syntax = "/clone <起点1> <起点2> <目的地> [模式]",
            description = "复制区域",
            category = CommandCategory.BLOCK,
            examples = listOf(
                "/clone ~ ~ ~ ~10 ~10 ~10 ~20 ~ ~",
                "/clone 0 0 0 10 10 10 100 100 100"
            ),
            notes = "可配合execute实现条件复制"
        ),
        Command(
            id = "locate",
            name = "/locate",
            syntax = "/locate <structure|biome|poi> <类型>",
            description = "定位结构或生物群系",
            category = CommandCategory.WORLD,
            examples = listOf(
                "/locate structure village - 定位村庄",
                "/locate biome desert - 定位沙漠",
                "/locate structure stronghold - 定位要塞"
            ),
            notes = "1.19+版本需要指定structure/biome/poi"
        ),
        Command(
            id = "seed",
            name = "/seed",
            syntax = "/seed",
            description = "显示世界种子",
            category = CommandCategory.WORLD,
            examples = listOf("/seed"),
            notes = "点击种子可复制"
        ),
        Command(
            id = "difficulty",
            name = "/difficulty",
            syntax = "/difficulty <难度>",
            description = "设置游戏难度",
            category = CommandCategory.SERVER,
            examples = listOf(
                "/difficulty peaceful - 和平",
                "/difficulty easy - 简单",
                "/difficulty normal - 普通",
                "/difficulty hard - 困难"
            ),
            notes = "和平模式下饥饿值不会减少"
        ),
        Command(
            id = "spawnpoint",
            name = "/spawnpoint",
            syntax = "/spawnpoint [玩家] [位置]",
            description = "设置重生点",
            category = CommandCategory.PLAYER,
            examples = listOf(
                "/spawnpoint @p ~ ~ ~ - 设置当前位置为重生点",
                "/spawnpoint Steve 100 64 200"
            ),
            notes = "不指定位置则使用当前位置"
        ),
        Command(
            id = "title",
            name = "/title",
            syntax = "/title <玩家> <title|subtitle|clear> [内容]",
            description = "显示标题",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/title @a title {\"text\":\"欢迎!\",\"color\":\"gold\"}",
                "/title @p subtitle \"副标题\"",
                "/title @a clear - 清除标题"
            ),
            notes = "可使用JSON格式自定义样式"
        ),
        Command(
            id = "tellraw",
            name = "/tellraw",
            syntax = "/tellraw <玩家> <JSON消息>",
            description = "发送JSON格式消息",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/tellraw @a {\"text\":\"Hello\",\"color\":\"red\"}",
                "/tellraw @p [{\"text\":\"点击传送\",\"clickEvent\":{\"action\":\"run_command\",\"value\":\"/tp @p 0 0 0\"}}]"
            ),
            notes = "支持点击事件、悬停事件等"
        ),
        Command(
            id = "particle",
            name = "/particle",
            syntax = "/particle <粒子> <位置> [速度] [数量] [玩家]",
            description = "生成粒子效果",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/particle flame ~ ~ ~ 1 1 1 0.1 100",
                "/particle heart ~ ~1 ~ 0.5 0.5 0.5 0 5"
            ),
            notes = "粒子类型: flame, heart, smoke, explosion, etc."
        ),
        Command(
            id = "playsound",
            name = "/playsound",
            syntax = "/playsound <声音> <来源> <玩家> [位置] [音量] [音调]",
            description = "播放声音",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/playsound minecraft:entity.experience_orb.pickup master @p",
                "/playsound ambient.weather.thunder master @a"
            ),
            notes = "来源: master, music, record, weather, block, hostile, neutral, player"
        ),
        Command(
            id = "function",
            name = "/function",
            syntax = "/function <函数名>",
            description = "执行函数",
            category = CommandCategory.CHEAT,
            examples = listOf(
                "/function my_datapack:main",
                "/function #minecraft:tick"
            ),
            notes = "函数文件位于数据包的functions文件夹中"
        ),
        Command(
            id = "data",
            name = "/data",
            syntax = "/data <get|set|merge|remove> <目标> <路径> [值]",
            description = "操作NBT数据",
            category = CommandCategory.CHEAT,
            examples = listOf(
                "/data get entity @p Health - 获取玩家血量",
                "/data merge entity @e[type=zombie,limit=1] {CustomName:'\"Boss\"'}",
                "/data remove block ~ ~ ~ Items"
            ),
            notes = "可操作实体、方块和存储的NBT数据"
        ),
        Command(
            id = "xp",
            name = "/xp",
            syntax = "/xp <add|set|query> <玩家> <值> [points|levels]",
            description = "管理经验值",
            category = CommandCategory.PLAYER,
            examples = listOf(
                "/xp add @p 100 points - 增加100经验点",
                "/xp set @p 30 levels - 设置为30级",
                "/xp query @p levels - 查询等级"
            ),
            notes = "points=经验点, levels=等级"
        ),
        Command(
            id = "defaultgamemode",
            name = "/defaultgamemode",
            syntax = "/defaultgamemode <模式>",
            description = "设置默认游戏模式",
            category = CommandCategory.SERVER,
            examples = listOf(
                "/defaultgamemode survival",
                "/defaultgamemode creative"
            ),
            notes = "新玩家加入时使用此模式"
        ),
        Command(
            id = "op",
            name = "/op",
            syntax = "/op <玩家>",
            description = "给予玩家OP权限",
            category = CommandCategory.SERVER,
            examples = listOf("/op Steve"),
            notes = "需要服务器管理员权限"
        ),
        Command(
            id = "deop",
            name = "/deop",
            syntax = "/deop <玩家>",
            description = "移除玩家OP权限",
            category = CommandCategory.SERVER,
            examples = listOf("/deop Steve"),
            notes = "需要服务器管理员权限"
        ),
        Command(
            id = "ban",
            name = "/ban",
            syntax = "/ban <玩家> [原因]",
            description = "封禁玩家",
            category = CommandCategory.SERVER,
            examples = listOf(
                "/ban Steve 作弊",
                "/ban Alex"
            ),
            notes = "仅服务器可用"
        ),
        Command(
            id = "kick",
            name = "/kick",
            syntax = "/kick <玩家> [原因]",
            description = "踢出玩家",
            category = CommandCategory.SERVER,
            examples = listOf(
                "/kick Steve 请遵守规则",
                "/kick Alex"
            ),
            notes = "玩家可重新加入"
        ),
        Command(
            id = "worldborder",
            name = "/worldborder",
            syntax = "/worldborder <set|add|center|damage|warning> ...",
            description = "管理世界边界",
            category = CommandCategory.WORLD,
            examples = listOf(
                "/worldborder set 1000 - 设置边界为1000格",
                "/worldborder center ~ ~ - 设置边界中心",
                "/worldborder add 100 60 - 60秒内扩大100格"
            ),
            notes = "可设置伤害和警告区域"
        ),
        Command(
            id = "spreadplayers",
            name = "/spreadplayers",
            syntax = "/spreadplayers <中心X> <中心Z> <最小距离> <最大距离> <尊重团队> <目标>",
            description = "分散玩家",
            category = CommandCategory.PLAYER,
            examples = listOf(
                "/spreadplayers 0 0 100 500 false @a",
                "/spreadplayers ~ ~ 50 200 true @a"
            ),
            notes = "适用于小游戏服务器"
        ),
        Command(
            id = "bossbar",
            name = "/bossbar",
            syntax = "/bossbar <add|remove|set|get> ...",
            description = "管理Boss栏",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/bossbar add myboss \"Boss名称\"",
                "/bossbar set myboss value 50",
                "/bossbar set myboss players @a"
            ),
            notes = "可显示进度条给特定玩家"
        ),
        Command(
            id = "tag",
            name = "/tag",
            syntax = "/tag <目标> <add|remove|list> [标签名]",
            description = "管理实体标签",
            category = CommandCategory.ENTITY,
            examples = listOf(
                "/tag @e[type=zombie] add enemy",
                "/tag @p remove vip",
                "/tag @e list"
            ),
            notes = "可用于选择器筛选: @e[tag=enemy]"
        ),
        Command(
            id = "team",
            name = "/team",
            syntax = "/team <add|remove|join|leave|modify> ...",
            description = "管理队伍",
            category = CommandCategory.PLAYER,
            examples = listOf(
                "/team add red \"红队\"",
                "/team join red @p",
                "/team modify red color red"
            ),
            notes = "可设置队伍颜色、前缀、后缀等"
        ),
        Command(
            id = "schedule",
            name = "/schedule",
            syntax = "/schedule function <函数> <时间> [append|replace]",
            description = "计划执行函数",
            category = CommandCategory.CHEAT,
            examples = listOf(
                "/schedule function my:delayed 100t",
                "/schedule function my:test 5s"
            ),
            notes = "t=刻(1/20秒), s=秒"
        ),
        Command(
            id = "forceload",
            name = "/forceload",
            syntax = "/forceload <add|remove|query> <位置>",
            description = "强制加载区块",
            category = CommandCategory.WORLD,
            examples = listOf(
                "/forceload add ~ ~ - 强制加载当前区块",
                "/forceload remove all - 移除所有强制加载"
            ),
            notes = "过多强制加载会影响性能"
        ),
        Command(
            id = "locatebiome",
            name = "/locatebiome",
            syntax = "/locatebiome <生物群系>",
            description = "定位生物群系(旧版)",
            category = CommandCategory.WORLD,
            examples = listOf(
                "/locatebiome desert",
                "/locatebiome jungle"
            ),
            notes = "1.19+请使用 /locate biome"
        ),
        Command(
            id = "trigger",
            name = "/trigger",
            syntax = "/trigger <目标> [add|set] <值>",
            description = "修改触发器计分板",
            category = CommandCategory.REDSTONE,
            examples = listOf(
                "/trigger objective add 1",
                "/trigger objective set 10"
            ),
            notes = "允许非OP玩家修改特定计分板"
        ),
        Command(
            id = "recipe",
            name = "/recipe",
            syntax = "/recipe <give|take> <玩家> <配方>",
            description = "给予或移除配方",
            category = CommandCategory.ITEM,
            examples = listOf(
                "/recipe give @a * - 给予所有配方",
                "/recipe take @p minecraft:diamond_sword"
            ),
            notes = "* 表示所有配方"
        ),
        Command(
            id = "advancement",
            name = "/advancement",
            syntax = "/advancement <grant|revoke> <玩家> <条件>",
            description = "管理进度",
            category = CommandCategory.PLAYER,
            examples = listOf(
                "/advancement grant @p everything",
                "/advancement revoke @a only minecraft:story/root"
            ),
            notes = "可用于自定义地图"
        ),
        Command(
            id = "loot",
            name = "/loot",
            syntax = "/loot <目标> <来源>",
            description = "生成战利品",
            category = CommandCategory.ITEM,
            examples = listOf(
                "/loot give @p loot minecraft:entities/zombie",
                "/loot spawn ~ ~ ~ loot minecraft:chests/spawn_bonus_chest"
            ),
            notes = "可自定义战利品表"
        ),
        Command(
            id = "attribute",
            name = "/attribute",
            syntax = "/attribute <目标> <属性> <get|set|modifier> ...",
            description = "修改属性",
            category = CommandCategory.ENTITY,
            examples = listOf(
                "/attribute @p minecraft:generic.max_health base set 20",
                "/attribute @e[type=zombie,limit=1] minecraft:generic.attack_damage get"
            ),
            notes = "属性: max_health, attack_damage, movement_speed, etc."
        ),
        Command(
            id = "item",
            name = "/item",
            syntax = "/item <replace|modify> <目标> <槽位> ...",
            description = "操作物品槽",
            category = CommandCategory.ITEM,
            examples = listOf(
                "/item replace entity @p weapon.mainhand with diamond_sword",
                "/item replace block ~ ~ ~ container.0 with diamond 64"
            ),
            notes = "1.17+替代部分give功能"
        ),
        Command(
            id = "place",
            name = "/place",
            syntax = "/place <feature|jigsaw|structure|template> ...",
            description = "放置结构",
            category = CommandCategory.WORLD,
            examples = listOf(
                "/place structure minecraft:village_plains ~ ~ ~",
                "/place template my_structures:house ~ ~ ~"
            ),
            notes = "1.18+新增命令"
        ),
        Command(
            id = "ride",
            name = "/ride",
            syntax = "/ride <实体> <mount|dismount> [坐骑]",
            description = "骑乘管理",
            category = CommandCategory.ENTITY,
            examples = listOf(
                "/ride @p mount @e[type=horse,limit=1]",
                "/ride @e[type=pig,limit=1] dismount"
            ),
            notes = "1.19.4+新增"
        ),
        Command(
            id = "damage",
            name = "/damage",
            syntax = "/damage <目标> <伤害> <类型> [来源]",
            description = "造成伤害",
            category = CommandCategory.ENTITY,
            examples = listOf(
                "/damage @p 10 by entity @e[type=zombie,limit=1]",
                "/damage @e[type=creeper,limit=1] 100 by fire"
            ),
            notes = "1.20+新增,可指定伤害类型"
        ),
        Command(
            id = "random",
            name = "/random",
            syntax = "/random <roll|range> <值> [序列]",
            description = "随机数生成",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/random roll 1d6 - 掷骰子",
                "/random roll 2d20+5",
                "/random range 1..100"
            ),
            notes = "1.20.2+新增"
        ),
        Command(
            id = "return",
            name = "/return",
            syntax = "/return <值>",
            description = "返回值(函数)",
            category = CommandCategory.CHEAT,
            examples = listOf(
                "/return 0",
                "/return run say hello"
            ),
            notes = "用于函数返回值控制"
        ),
        Command(
            id = "clear",
            name = "/clear",
            syntax = "/clear [玩家] [物品] [最大数量]",
            description = "清除物品",
            category = CommandCategory.ITEM,
            examples = listOf(
                "/clear @p - 清除玩家所有物品",
                "/clear @p diamond 10 - 清除最多10个钻石",
                "/clear @a - 清除所有玩家物品"
            ),
            notes = "不加参数则清除自己所有物品"
        ),
        Command(
            id = "replaceitem",
            name = "/replaceitem",
            syntax = "/replaceitem <entity|block> <目标> <槽位> <物品> [数量]",
            description = "替换物品(旧版)",
            category = CommandCategory.ITEM,
            examples = listOf(
                "/replaceitem entity @p slot.armor.head diamond_helmet",
                "/replaceitem block ~ ~ ~ slot.container.0 diamond 64"
            ),
            notes = "1.17+建议使用/item命令"
        ),
        Command(
            id = "help",
            name = "/help",
            syntax = "/help [命令]",
            description = "显示帮助信息",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/help - 显示所有命令",
                "/help gamemode - 显示gamemode帮助"
            ),
            notes = "游戏内查看命令帮助"
        ),
        Command(
            id = "me",
            name = "/me",
            syntax = "/me <动作>",
            description = "显示动作消息",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/me 正在挖矿",
                "/me 发现了钻石!"
            ),
            notes = "显示为: *玩家 正在挖矿"
        ),
        Command(
            id = "msg",
            name = "/msg",
            syntax = "/msg <玩家> <消息>",
            description = "发送私聊消息",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/msg Steve 你好!",
                "/msg Alex 一起来玩吧"
            ),
            notes = "别名: /tell, /w"
        ),
        Command(
            id = "say",
            name = "/say",
            syntax = "/say <消息>",
            description = "广播消息",
            category = CommandCategory.OTHER,
            examples = listOf(
                "/say 欢迎来到服务器!",
                "/say 服务器将在5分钟后重启"
            ),
            notes = "所有玩家都能看到"
        )
    )
    
    fun getByCategory(category: CommandCategory): List<Command> {
        return commands.filter { it.category == category }
    }
    
    fun search(query: String): List<Command> {
        val lowerQuery = query.lowercase()
        return commands.filter {
            it.name.lowercase().contains(lowerQuery) ||
            it.description.contains(query, ignoreCase = true) ||
            it.syntax.lowercase().contains(lowerQuery) ||
            it.examples.any { ex -> ex.lowercase().contains(lowerQuery) }
        }
    }
    
    fun getById(id: String): Command? {
        return commands.find { it.id == id }
    }
}

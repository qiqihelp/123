package com.mchelper.data

data class Command(
    val id: String,
    val name: String,
    val syntax: String,
    val description: String,
    val category: CommandCategory,
    val examples: List<String> = emptyList(),
    val notes: String = ""
)

enum class CommandCategory(val displayName: String, val icon: String) {
    GAMEPLAY("游戏玩法", "🎮"),
    WORLD("世界管理", "🌍"),
    PLAYER("玩家管理", "👤"),
    ENTITY("实体管理", "🐄"),
    ITEM("物品管理", "📦"),
    BLOCK("方块管理", "🧱"),
    SERVER("服务器", "🖥️"),
    CHEAT("作弊指令", "⚡"),
    REDSTONE("红石", "🔴"),
    OTHER("其他", "📋")
}

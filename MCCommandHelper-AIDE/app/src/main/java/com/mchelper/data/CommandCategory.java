package com.mchelper.data;

public enum CommandCategory {
    GAMEPLAY("游戏玩法", "🎮"),
    WORLD("世界管理", "🌍"),
    PLAYER("玩家管理", "👤"),
    ENTITY("实体管理", "🐄"),
    ITEM("物品管理", "📦"),
    BLOCK("方块管理", "🧱"),
    SERVER("服务器", "🖥️"),
    CHEAT("作弊指令", "⚡"),
    REDSTONE("红石", "🔴"),
    OTHER("其他", "📋");

    private String displayName;
    private String icon;

    CommandCategory(String displayName, String icon) {
        this.displayName = displayName;
        this.icon = icon;
    }

    public String getDisplayName() { return displayName; }
    public String getIcon() { return icon; }
}

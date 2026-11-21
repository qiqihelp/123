# 05 — 素材包接收约定

## 投放位置

把素材包直接丢到：

```
rw-mod/intake/
```

支持：`.zip`、`.rwmod`、文件夹、单个 `.png` / `.ogg` / `.ini`。
丢完告诉我一声（或直接说“素材包已放好”），我会接手处理。

## 命名建议

```
pack-001-坦克贴图.zip
pack-002-音效.rwmod
pack-003-单位ini.zip
```

## 收到后我会做什么

1. **解包**：`unpack.py` 解到临时目录，列出文件清单
2. **分类**：
   - `*.ini` → `mods/<ModName>/units/<unit_id>/`
   - `*.png` → 同单位目录或 `sprites/`
   - `*.ogg` → `sounds/`
   - 特效/地图/音乐 → `effects/` / `maps/` / `music/`
3. **校验**：`validate.py --strict` 检查引用完整性
4. **归位**：合并到目标模组，保留原始文件名，冲突时加后缀并记录
5. **打包**：`pack.py` 生成 `.rwmod`，给出安装路径

## 素材包自检（丢之前可看一眼）

- INI 引用的图片/音效是否在包内（或已在模组内）
- `[core] name` 是否唯一（不要与原版重名）
- `ROOT:\` 路径是否以模组根为基准
- 图片命名建议：`<unit>.png` / `<unit>_turret.png` / `<unit>_dead.png`

## 大文件

单个素材包建议 < 50MB；更大的分卷丢，或直接丢文件夹。
`intake/` 下的原始包默认不入库（见 `rw-mod/.gitignore`），归位后的文件才入库。

# 03 — 版本兼容说明

## 目标版本

- 默认目标：**1.15**（Steam 最新稳定版）
- `mod-info.txt` 的 `minVersion` 建议填 `1.15`，避免在旧版上加载出未知键报错

## 1.15 关键变化

| 变化 | 说明 |
|---|---|
| `streamingCost` | 新增流式成本字段（资源/解锁相关） |
| `switchPriceWithStreamingCost` | 价格与流式成本切换逻辑 |
| `strictLevel: 1` | 严格模式，重复键/未知键更敏感，调试推荐开启 |
| 自动扫描 | 新版按文件夹结构自动扫描单位，`units.index` 旧注册方式弱化 |

## 兼容策略

1. **新模组**：按 1.15 结构开发，`minVersion: 1.15`
2. **移植旧模组**（1.14 及更早）：
   - 检查 `units.index` 是否仍被引用，必要时改为文件夹自动扫描
   - 检查已废弃键（以 Reference 的“版本”列为准）
   - 补齐 1.15 新增必填/推荐键
3. **跨平台**：Windows / Android 的 `mods/units` 逻辑一致，仅路径不同；`ROOT:\` 引用跨平台有效
4. **多人**：所有玩家需安装**相同版本**的 `.rwmod`，否则不同步；打包后用校验工具确认无缺失引用

## 旧教程注意事项

- 旧中文教程（CSDN/9k9k 等）多为安卓 MT 管理器/APK 解包流程，**不要**按其修改原版 `assets/`，新版优先用 `mods/units` 文件夹模组
- 旧教程提到的 `assets/units/<unit>` 路径是原版资源路径，模组应放在 `mods/units/<ModName>/units/...`
- 涉及 `techLevel`、`buildSpeed`、`total_frames` 的说明仍然有效，可参考

## 验证清单（发版前）

- [ ] `validate.py --strict` 无 ERROR
- [ ] 游戏内能看到单位、能建造、能开火、残骸正常
- [ ] 多人联机双方 `.rwmod` 哈希一致
- [ ] `mod-info.txt` 的 `minVersion` 与实际测试版本一致

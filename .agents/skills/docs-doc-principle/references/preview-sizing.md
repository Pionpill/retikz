# 预览尺寸与 Control 空间

用于新增或调整 ComponentPreview 的 size、control 面板宽度、取景或裁切。先在约 1440px viewport、约 800px 正文的真实页面运行 `apps/docs/scripts/check-figure-size.mjs`（包命令 `check:figure-size`）；用 `--help` 查询当前参数，不编造参数或用源码 width/height 替代实测。

## 脚本计算顺序

1. 测量图形 bounds，选择能完整容纳图形高度 + 40px 的最小 size，作为图形基准档位。
2. 在该档位记录 control 字段数、分组数、列数、item/section gap、滚动视口、完整 scrollHeight、workspace 高度与 requiredWorkspaceHeight。
3. 用基准档位的 `remainingOverflow / workspaceHeight` 计算 `heightGapRatio`。差距不超过 50% 时先尝试只升 size；基准档位 md 及以下最多升两档，lg 及以上最多升一档。
4. 同时采样默认 25% 和双倍 50% 面板。图形实际宽度不超过 workspace 一半时，50% 才是候选；差距大于 50% 时优先检查该候选，可与升档组合。
5. 在允许范围能放下时选择较小的有效配置；仍放不下时输出最大允许空间和剩余溢出，保留滚动，不继续缩小主体、追加升档或扩大面板。

JSON 保留每档、两种宽度的原始观测值，以及 heightGapRatio、rule、推荐 size、推荐面板宽度与剩余溢出。脚本负责确定性计算，LLM 核对实际页面和本次修改范围。

## 应用结果

- zh/en 都建议 50%，且真实页面图形未被压缩时，才对该 demo 使用 `defaultSize: 50`。
- 双倍宽度若没有形成有效两列、没有降低 controls 所需高度或溢出，不采用；需要两列时核对实际列布局，不能把“变宽”当成“已换列”。
- size 只调整纵向空间。横向裁切先检查图形 bounds、viewBox 和输出宽度；不靠升 size 掩盖。
- 需要固定取景的交互 demo 使用固定 viewBox；扩展 viewBox 时同步保持自然输出比例，1 user unit 对应 1 CSS px，不把主体缩小或放大。
- 默认档位按桌面测量，窄屏另查滚动、裁切和可读性，不反过来把桌面档位放大。
- 仅修改用户授权的 demo；用户已明确要求批量修正时可按逐项测量结果批量应用，不另设一律禁止批量修改的规则。

## 可观察验证

查看实际 render pane、SVG 和 preview bounds；图形、文字、滤镜与辅助标注不裁切，面板可滚动、有效字段可到达，拖动分隔线不意外缩放主体。保留必要留白：常规四边约 12px，有顶部悬浮控件时顶部额外留约 40px。

无法运行测量或浏览器检查时报告缺失观测，不凭 controls 数量给出“已验证”的尺寸结论。

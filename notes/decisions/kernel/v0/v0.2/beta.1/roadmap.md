# v0.2.0-beta.1 实施待办

> 写于 2026-05-24。完工后保留留档（摘要写进 `v0.2.md` 跟踪段）。
>
> 关联：[`v0 roadmap`](./roadmap.md) · [`v0.2 总计划`](../roadmap.md) · [`flow-beta` SKILL](../../../../../../.agents/skills/flow-beta/SKILL.md)

## 背景与定位

v0.2 能力补全阶段（alpha.7–9）已覆盖 gap §1–6 全部值得做的项。原计划在 beta 前另设一段 `alpha.X 收尾`（破坏性命名冻结窗口），**2026-05-24 决定取消该段、把破坏性收口并入 beta.1**——flow-beta 本就允许 beta 期做重构 / 改名 / 删 alias / 改默认值（rc 起才冻结公开 API），故 beta.1 兼任"优化窗口 + 最后破坏性清理"。

beta.1 = **最后一个改名 / 破坏窗口**：rc 起公开 API（schema 字段名 / 组件名 / 函数签名 / 公开 type 名）冻结。本版只做**修改类**（重构 / 命名 / 注释 / 测试加固 / 错误信息 / 性能 / 默认值），**不开新功能 ADR**（新 IR 形态 / 新公开字段 → 推下个 alpha）。

## 进度看板

| # | 标题 | level | 工作量 | 状态 | 备注 |
|---|---|---|---|---|---|
| 1 | core 注释 / `.describe()` renderer-中立 sweep（alpha.7–9 新文件） | internal | 中 | ✅ 6df1db5 | 新文件已遵循 adapter-example 约定；仅清 arrows/patterns 的"历史 SVG 等价"措辞（兼违历史阶段引用铁律） |
| 2 | unbuilder round-trip 补 alpha.7–9 新增 IR 形态 | internal | 中 | ✅ da9f37e | **发现真 bug**：unbuilder path 分支手写漏 rotate/scale/marks → 改用 `pickDefined(PATH_FIELDS)` 修；generator 无 React DSL（IR-only）断言抛错 |
| 3 | `makeRound` `-0` 归一 | visible | 小 | ✅ 58d87c2 | `r===0?0:r`，保 round-trip Object.is 稳定 |
| 4 | **删 `<TikZ>` deprecated alias** | breaking | 小-中 | ✅ f885255 / 9aad4c1 | 删 export + dev warn + AST 白名单 + RetikzPreview；4 测试迁移；mdx 失实描述更新；parser.test 迁移 |
| 5 | IR discriminator 命名约定文档化 | internal | 小 | ✅ (本提交) | 写进根 AGENTS「IR / Schema 风格」：实体 / paint = `type`，子变体（step/transform/clip/resource）= `kind`；**不改代码** |
| 6 | schema 字段名 / `.describe()` 全量审查 | — | 中 | ✅ 审完无改 | alpha.7–9 新字段遵循既有约定（`cx/cy/rx/ry` 同 EllipsePrim、`t` 同 AnchorRef、`outAngle/inAngle/looseness` TikZ vocab、`viewBox/pin` 全词）；`marks.pos`（纯 0..1）与 StepLabel.position（含 keyword）概念近似但语义不同，保留——无破坏性 rename 必要 |

### 候选（待评估，可能推 beta.2 或单列）

- **image 填充真 object-fit**（逐形状裁剪修 fit 近似限制）：visible 行为改进，体量中-大。alpha.7 实现是 `<pattern>` + objectBoundingBox，fit 按归一方形算（非真实长宽比）；真 object-fit 需改渲染路径。属 beta 范围（行为修复、非新 IR 字段），但单独评估是否本版做。

## 待决策

### TODO-4：`<TikZ>` deprecated alias 去留

alpha.6 把顶层容器 `<TikZ>` → `<Layout>`，`<TikZ>` 留 deprecated alias（dev console warn）。rc 起冻结，beta.1 是最后处置窗口。三选项：

- **A. 删 alias（breaking）**：rc 前彻底移除 `<TikZ>`，强制迁移 `<Layout>`。最干净，但破坏仍用 `<TikZ>` 的下游；需 changelog BREAKING + 迁移路径。
- **B. 保留 alias 到 v0.2.0**：维持现状（dev warn），v0.3 再删。最稳，但把 deprecated 表面带进稳定版。
- **C. 删 alias + 提供 codemod**：删 `<TikZ>` + 随包给 jscodeshift transform / 文档 sed 片段。介于 A/B，工作量最大。

> **决定（2026-05-24）：A 删**。retikz v0.x 仍预发布、用户面极小，趁早干净。落地：删 `<TikZ>` / `TikZProps` export + dev warn 逻辑；AST 白名单 / system prompt 去 `TikZ`；docs 若有残留 `<TikZ>` 一并清；changelog 写 BREAKING + 迁移路径（`<TikZ>` → `<Layout>`）。

### TODO-5/6：命名收口

discriminator 经盘点**无需破坏性改动**（约定自洽，仅文档化）。TODO-6 schema 全量审查若发现个别字段名不清晰，逐条评估再动（每条 breaking 走 changelog）。

## 流程（flow-beta 3 阶段）

每条 TODO：① 实现（改实现 + 视需要加测试，lint/tsc/既有测试三全过）→ ② 多 LLM 评估（等价性审计 + breaking 收益审计；主 AI 起草 prompt + diff，用户跑外部 LLM 贴回，或用独立 Opus subagent 作 best-effort 替代）→ ③ 收尾（breaking 必写 changelog BREAKING + 迁移路径；roadmap / 本 plan 勾 ✅ + commit hash）。

> 完工后摘要写进 `v0.2.md` 跟踪段；本文件留档。

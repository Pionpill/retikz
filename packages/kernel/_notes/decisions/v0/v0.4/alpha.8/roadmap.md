# v0.4.0-alpha.8 Roadmap: v0.4 改动收口与 dashOffset 补齐

## 目标

alpha.8 是 v0.4 的 alpha 收口版本。原始目标是把 alpha.1-alpha.7 已落地的纵向底座改动重新对账，确认公开 roadmap、changelog、架构完备评测文档与实际发布节奏一致，为后续 v0.4 beta / rc 与 v0.5 主题拆分留下清晰边界。
本轮在 alpha.8 内追加 plot 牵引的 `dashOffset` 描边相位补齐，作为 beta 前的 core 通用描边能力收敛：它只补齐既有 `dashPattern` 的配套字段，不新建 plot-only 线条语义。随后补一组最小内置 provider 示例，让 `pathGenerators` 与 `ribbonWidthProfiles` 不再只存在于自定义示例中。

本 milestone 的主题是 **0.4 改动收口**：

- kernel 组包版本 lockstep bump 到 `0.4.0-alpha.8`。
- 公开 roadmap 从“下一段 alpha 待讨论”更新为 alpha.8 收口。
- changelog 区分 alpha.8 收口项与 `dashOffset` 能力补齐项。
- `core-drawing-complete.md` 已把 headless interaction 纳入完备评测，但 interaction 实现不进入 alpha.8。
- `dashOffset` 以 core 通用描边字段落地，覆盖 IR / Scene / renderer / adapter / docs。
- `parabola` path generator 与 `bulge` ribbon width profile 作为内置 definition 落地，覆盖 provider / compile / docs。
- 后续 v0.5 / beta / long-term 候选保持分层：v0.5 可讨论 headless interaction / progressive update 等机制，beta 聚焦 API 与安装验收，长期项不塞进 v0.4。

## 决策列表

| ADR | 状态 | 主题 | 说明 |
| --- | --- | --- | --- |
| [ADR-01](./01-drawing-complete-alpha4-closeout.md) | Accepted | Drawing complete × alpha.4 收口审计 | 总审计与分流索引，确认 alpha.4 图元级 effect 无阻塞问题，并把 interaction / group effect / docs reference 分拆到后续 ADR。 |
| [ADR-02](./02-headless-interaction-boundary.md) | Accepted | Headless interaction manifest 边界登记 | 明确现有 hydration / hit-test 不是缺失；缺口是 core 缺 JSON-safe target / role / intent / hit-area manifest，进入 v0.5 候选。 |
| [ADR-03](./03-group-scope-effect-boundary.md) | Accepted | Group / Scope 级视觉效果延期边界 | 保持 alpha.4 图元级 shadow / blend 语义，登记 group effect / blend isolation / offscreen composite 为独立后续设计。 |
| [ADR-04](./04-scene-primitive-reference-closeout.md) | Accepted | ScenePrimitive reference 与发布文案收口 | alpha.8 已完成 docs-only reference / changelog 对账，不回写 alpha.4 历史 ADR。 |
| [ADR-05](./05-stroke-dash-offset.md) | Accepted | Stroke dash offset | 补齐 `dashPattern` 配套的 `dashOffset` 通用描边字段，覆盖 IR / Scene / renderer / adapter / docs。 |
| [ADR-06](./06-builtin-path-generator-ribbon-profile.md) | Accepted | Builtin path generator and ribbon width profile | 为 `pathGenerators` 增加内置 `parabola`，为 `ribbonWidthProfiles` 增加内置 `bulge`，并同步测试与文档。 |

## 范围

本 milestone 覆盖：

- `packages/kernel/{math,core,render,vanilla,react,tex}/package.json` 的版本号。
- kernel v0.4 notes 中 alpha 里程碑状态。
- docs changelog 与 public roadmap 的 alpha.8 描述。
- release 前用于核对的轻量验证。
- alpha.8 ADR 集合：结合 Drawing Complete 与 alpha.4 Scene 视觉效果做收口审计，登记 interaction / group effect / docs reference 的后续分流。
- ADR-05：`dashOffset` 通用描边相位字段，作为 beta 前的 core 能力补齐。
- ADR-06：为已经存在的 `pathGenerators` / `ribbonWidthProfiles` 扩展点补最小内置 definition，作为 provider 参考实现。

不在本 milestone 范围：

- 除 ADR-05 `dashOffset` 与 ADR-06 内置 provider 示例外，新增或修改 core IR / Scene / renderer / adapter runtime 行为。
- 实现 tooltip、select、hover、focus、drag、editing handles 等 interaction runtime。
- 新增 headless interaction manifest / event target API。
- 开始 v0.5 正式 ADR 或实现。
- beta / rc API freeze。

## 验收清单

- [x] 六个 kernel 包版本均为 `0.4.0-alpha.8`。
- [x] npm registry 已确认 `0.4.0-alpha.7` 是当前连续前序版本。
- [x] v0.4 总 roadmap 有 alpha.8 里程碑，并说明这是收口版本。
- [x] docs changelog 有 alpha.8 条目，说明无新增 runtime API。
- [x] public roadmap 指向 `v0.4.0-alpha.8`，并把 v0.5 / beta / long-term 候选分开。
- [x] `git diff --check` 通过。
- [x] alpha.8 ADR 集合已完成 subagent review。
- [x] 已按 ADR-04 补 reference docs / changelog wording。
- [x] ADR-05 `dashOffset` Accepted 文档确认。
- [x] ADR-05 实现、测试、docs 与 changelog 对账完成。
- [x] ADR-06 经人工确认后进入实现。
- [x] `parabola` 与 `bulge` 作为内置 provider 示例落地并同步 docs。

## 后续分流建议

alpha.8 发布后，下一轮讨论应把候选拆成三层：

| 层级 | 候选 | 说明 |
| --- | --- | --- |
| v0.5 alpha | headless interaction、Progressive IR / JSON Patch、incremental compile | 仍属于纵向机制探索，需先做 ADR；交互和用户操作场景要评估 IR diff、bailout、局部重编译与 concurrent 调度。 |
| v0.4 beta / rc | API 复核、安装验收、docs / changelog 对账 | 不新增能力，面向稳定化。 |
| 更长期 | P3D、scope polygon / ellipse / padding、blur / mask / layer | 需要更强需求牵引或跨包设计，不随 v0.4 收口发布。 |

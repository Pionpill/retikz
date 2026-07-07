# ADR-01：Drawing complete × alpha.4 视觉效果收口审计

- 状态：Accepted（2026-07-03 收尾确认：alpha.8 ADR / docs / changelog 对账完成；interaction manifest 分流到 v0.5 候选，group / scope effect 分流到独立后续设计）
- 决策日期：2026-07-03
- 关联：[v0.4-alpha.8 roadmap](./roadmap.md) · [core drawing complete](../../../../architecture/core-drawing-complete.md) · [v0.4-alpha.4 roadmap](../alpha.4/roadmap.md) · [alpha.4 ADR-01 shadow](../alpha.4/01-scene-drop-shadow.md) · [alpha.4 ADR-02 blend](../alpha.4/02-blend-mode.md) · [ADR-02 interaction boundary](./02-headless-interaction-boundary.md) · [ADR-03 group effect boundary](./03-group-scope-effect-boundary.md) · [ADR-04 docs closeout](./04-scene-primitive-reference-closeout.md)

## 背景

alpha.8 的主题是 v0.4 改动收口，不新增运行时 API。收口时新增了一份 `core-drawing-complete.md`，把 core 完备目标从“静态二维图形”扩展到“静态二维图形 + 可绑定在图形上的 headless interaction intent”，并要求能力能经 `IR / schema -> contract / provider -> compile -> Scene / interaction manifest -> render / adapter` 形成闭环。

alpha.4 已完成图元级 `shadow` 与 `blendMode`：Node 主 shape、Path 主路径和端点箭头可以投影 / 混合；Text、label、pin、GroupPrim、Scope 整体效果不继承。这一边界是当时明确决定，不是实现遗漏。但从 drawing complete 的新检测维度看，它留下了 Composition × Style 与 Interaction 两类后续缺口。

本 ADR 不是重新设计 alpha.4，也不把 interaction 或 group effect 塞进 alpha.8。它只把当前审计结果固化为 alpha.8 的版本边界：哪些问题必须在 alpha.8 文档中说清，哪些进入 v0.5 或更长期设计。

## 决策：alpha.8 只做收口登记与文档对账，运行时缺口分流到后续版本

alpha.8 对 alpha.4 与完备评测的处理采用三分流：

1. **alpha.8 必须收口的文档一致性问题**：ScenePrimitive reference 要补 `RectPrim` / `EllipsePrim` / `PathPrim` 的 `shadow` / `blendMode`，并明确 Text / Group 不支持图元级 effect；changelog 中的 SVG filter region 文案应改成当前实现的“`userSpaceOnUse` + 按 shadow 外扩后的 scene viewBox”。本 ADR 记录当前真源，不回写 alpha.4 Accepted ADR 的历史施工指针。执行细则见 [ADR-04](./04-scene-primitive-reference-closeout.md)。
2. **v0.5 候选**：headless interaction manifest。core 只表达 JSON-safe target、role、intent、hit area、provenance 关系；tooltip 浮层、selection 状态机、hover 样式、键盘策略和拖拽编辑器留在 adapter / userland。
3. **更长期或独立 ADR**：group / scope 级视觉效果。若后续要支持整组投影、含文字卡片投影、blend isolation，需要 `GroupPrim` effect 字段、SVG filter-on-`<g>` / isolation、Canvas offscreen composite 与跨端测试；不和 alpha.8 bump 或 interaction manifest 混做。

理由：

1. alpha.4 的图元级效果实现与 ADR 主决策一致，alpha.8 不应制造无必要的 runtime churn。
2. drawing complete 是准入 / 评测框架，不等于 alpha.8 要一次补完所有缺口；收口版本的正确动作是把缺口和后续版本边界写清。
3. interaction manifest 与 group effect 都会触及 core Scene / compile / render observable 行为，必须分别开红级 ADR，而不是作为发布文档补丁搭车。

## 审计发现

| 编号 | 结论                                                             | 证据                                                                                                                                                                                                                                               | 处理                                                                                                                    |
| ---- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| F1   | alpha.4 图元级 effect 主路径无阻塞问题。                         | `shadow` / `blendMode` 进入 `GraphicStyleSchema`；Scene `RectPrim` / `EllipsePrim` / `PathPrim` 有字段；SVG / Canvas 分别 emit filter / `mix-blend-mode` / `globalCompositeOperation`。                                                            | alpha.8 不改 runtime。                                                                                                  |
| F2   | interaction manifest 是 drawing complete 新标准下的缺口。        | 完备文档要求 `Scene / interaction manifest`；当前已有 render / adapter hydration 基于 Scene `id/meta`、SVG `data-retikz-id` 与 Canvas `hitTest` 做运行时定位，但 core 还没有与 Scene 同步的 JSON-safe target / role / intent / hit-area manifest。 | 见 [ADR-02](./02-headless-interaction-boundary.md)：放入 v0.5 候选，不在 alpha.8 实现。                                 |
| F3   | group / scope 级 effect 仍是 Composition × Style 缺口。          | alpha.4 ADR 明确 `GroupPrim` / `IRScope` 不纳入；当前 `GroupPrim` 只有 id / meta / animations / transforms / clipRef / children。                                                                                                                  | 见 [ADR-03](./03-group-scope-effect-boundary.md)：长期或独立 ADR。                                                      |
| F4   | docs reference 未完整呈现 alpha.4 Scene primitive 字段。         | ScenePrimitive reference 只列常见视觉字段，未列 `shadow` / `blendMode`。                                                                                                                                                                           | 见 [ADR-04](./04-scene-primitive-reference-closeout.md)：alpha.8 docs follow-up。                                       |
| F5   | 历史 ADR / changelog 与当前代码路径和 filter region 口径有漂移。 | alpha.4 ADR 指向旧 `ir/effects.ts`、`primitive/scene.ts`；当前实现位于 `schemas/effects`、`contract/scene`、`compile/effects`、`render/src/svg/builders/shadow-defs.ts`，且 filter region 会按 shadow 外扩 scene layout。                          | 见 [ADR-04](./04-scene-primitive-reference-closeout.md)：alpha.8 记录当前真源并修 release wording；不回写 alpha.4 ADR。 |

## 绘图完备检查

- 能力面：Style / Resource、Composition、Interaction。
- 是否属于 core：图元级 shadow / blend 已属于 core；headless interaction manifest 属于 core；tooltip UI / selection runtime 不属于 core。
- 是否需要新 IR / schema：alpha.8 无；v0.5 interaction manifest 需要另开 ADR 评估。
- 是否需要新 contract / definition：alpha.8 无；interaction 若需要 role / intent extension，再单独设计。
- 是否需要新 provider / registry：alpha.8 无。
- 是否需要改 compile / Scene：alpha.8 无；group effect / interaction manifest 都会需要。
- 是否需要 interaction target / manifest：alpha.8 只登记缺口；后续版本需要。
- runtime state 是否保持外部 headless：是。core 不保存 hover / selected / focus 等状态。
- renderer 是否可跨后端实现：图元级 effect 已可；group effect 需要离屏合成与 isolation 测试后再判断。
- 上层模块如何消费：alpha.8 只消费文档边界；后续 React / Vanilla 可基于 manifest 做 headless runtime。
- 不支持边界与诊断：shadow / blend 不是组级；hit-test 不把 shadow 外溢当命中区；blend 不引入 isolation。
- 本轮不做的能力及原因：不做 tooltip/select runtime、不做 manifest、不做 group effect，避免收口版本变成功能版本。

## 已执行口径

- **alpha.8 reference / changelog docs-only follow-up**：已按 [ADR-04](./04-scene-primitive-reference-closeout.md) 执行，alpha.8 文档对账项可关闭。

## 不在本 ADR 范围

- 新增 `InteractionManifest` / `InteractionTarget` / tooltip / selection intent 字段。
- 实现 tooltip、select、hover、focus、drag、keyboard 或编辑器状态机。
- 给 `GroupPrim` / `IRScope` 新增 `shadow` / `blendMode` / `isolation`。
- 修改 alpha.4 runtime 行为或重新跑完整 renderer parity。
- 回写 alpha.4 Accepted ADR 的历史实现指针。

---

> **实现指针**：本 ADR 已随 kernel v0.4-alpha.8 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show v0.4.0-alpha.8:packages/kernel/_notes/decisions/v0/v0.4/alpha.8/01-drawing-complete-alpha4-closeout.md`。

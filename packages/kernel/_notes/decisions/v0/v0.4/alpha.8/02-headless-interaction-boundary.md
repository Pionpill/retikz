# ADR-02：Headless interaction manifest 边界登记

- 状态：Accepted（2026-07-03 收尾确认：alpha.8 不新增 interaction API；现有 hydration / hit-test 保留为 runtime 定位层，headless interaction manifest 进入 v0.5 候选）
- 决策日期：2026-07-03
- 关联：[v0.4-alpha.8 roadmap](./roadmap.md) · [ADR-01 closeout](./01-drawing-complete-alpha4-closeout.md) · [core drawing complete](../../../../architecture/core-drawing-complete.md)

## 背景

`core-drawing-complete.md` 把 Interaction 纳入 core 完备评测：core 不负责 tooltip 浮层、selection 状态机、hover 样式或键盘策略，但需要能表达可被这些外部无头 runtime 消费的 JSON-safe target / intent / role / provenance / hit area。

当前系统并不是没有 interaction 基础。`@retikz/render` 已有 hydration 子路径，SVG 会 emit `data-retikz-id`，Canvas 有 `hitTest(scene, point)`，React / Vanilla 可以把事件绑定到命中 id 上。这些能力解决了“运行时如何定位 Scene primitive”，但 interaction 语义仍主要由 adapter / userland 从 primitive `id/meta` 和几何命中结果反推。

alpha.8 是 v0.4 收口版本，不新增 runtime API。本 ADR 只登记边界：future core work 可以设计 headless interaction manifest，但不能把具体 UI 或状态机塞进 core。

## 决策：interaction 缺口进入 v0.5 候选，alpha.8 只固定无头边界

alpha.8 对 interaction 的结论如下：

1. **现有 hydration / hit-test 保留为 runtime 定位层**。未来 manifest 应给它更稳定的输入，而不是替代它。
2. **core 可拥有的未来能力仅限 headless manifest**：JSON-safe target、role、intent、hit area、source provenance 等语义关系；字段名和 schema 不在 alpha.8 拍板。
3. **core 不拥有 runtime state**：hovered、selected、focused、dragging、tooltip open、keyboard focus ring 等状态由 React / Vanilla / userland 管理。
4. **core 不拥有 UI**：tooltip DOM、popover 定位策略、selection outline、框选 / 拖拽 handles、编辑器 snapping 都不进 core。
5. **v0.5 若启动 interaction，必须单独红级 ADR**，并同时考虑 core Scene / manifest、render hydration、React / Vanilla headless API 与 docs。

理由：

1. interaction manifest 会改变 core 输出合同，必须走 schema / compile / render-observable 级设计，不能作为 alpha.8 收口补丁。
2. 只定义无头 intent 能复用现有 SVG / Canvas hydration，也能让上层包做不同 UI，而不把 core 变成编辑器框架。
3. tooltip / select 是最常见需求，但它们的显示、状态、键盘和可访问性策略受宿主框架影响，放在 adapter / userland 更稳。

## v0.5 设计问题清单

正式设计时必须先回答这些问题；本 ADR 不提供字段草案或 JSX 草案：

- target 是否引用 IR id、Scene primitive id、还是独立 interaction target id。
- hit area 是否可独立于可见几何声明。
- tooltip content 是纯 JSON 文本、外部 content key，还是完全不进 core。
- selection 是否只表达“可选中意图”，不表达当前 selected state。
- manifest 是否和 Scene 同步输出，还是通过 compile option opt-in 输出。
- cursor、aria、focus ring 等 presentation / accessibility hint 由 manifest 提供语义依据，还是完全由 adapter / userland 派生。

## 完备性影响

本 ADR 不执行完整绘图完备性检测；完整审计入口在 [ADR-01](./01-drawing-complete-alpha4-closeout.md)。这里仅记录 interaction 对完备标准的影响：

- 对 Interaction 能力面：当前 hydration / hit-test 能定位 primitive，但缺少 core 同步输出的 JSON-safe target / role / intent / hit-area manifest。
- 对 core 边界：headless target / intent / role / hit area 属于 core 候选；tooltip UI、hover / selected / focused 状态、键盘策略和拖拽编辑器不属于 core。
- 对后续设计：v0.5 若启动 interaction，需要另开红级 ADR 评估 IR / schema、compile 输出、Scene 或独立 manifest、render hydration、React / Vanilla headless runtime 与 docs。
- 对 alpha.8：不新增字段、schema 或 runtime API；只把缺口登记为后续候选，避免收口版本变成功能版本。

## 不在本 ADR 范围

- 新增 interaction schema 字段。
- 实现 tooltip / select / hover / focus / drag。
- 改 `@retikz/render/hydration` API。
- 给 React / Vanilla 增加 headless interaction hook。

---

> **实现指针**：本 ADR 已随 kernel v0.4-alpha.8 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show v0.4.0-alpha.8:packages/kernel/_notes/decisions/v0/v0.4/alpha.8/02-headless-interaction-boundary.md`。

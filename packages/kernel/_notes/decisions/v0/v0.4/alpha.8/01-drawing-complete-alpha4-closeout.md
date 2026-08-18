# ADR-01：Drawing complete × alpha.4 视觉效果收口审计

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[ADR-02](./02-headless-interaction-boundary.md) · [ADR-03](./03-group-scope-effect-boundary.md) · [ADR-04](./04-scene-primitive-reference-closeout.md)

## 背景与目标

alpha.8 负责收口 v0.4 既有能力，不把 Drawing Complete 的新增评估维度误变成一次功能扩张。alpha.4 的图元级 `shadow` 与 `blendMode` 已有明确语义，但 headless interaction manifest、group/scope effect 和 reference 文案仍需分别确定边界

## 决策

alpha.8 只固化以下版本边界：

1. `RectPrim`、`EllipsePrim`、`PathPrim` 支持图元级 `shadow` / `blendMode`；Text、label、pin、GroupPrim 和 Scope 不继承组级 effect
2. headless interaction manifest 进入 v0.5 候选；Core 未来只表达 JSON-safe target、role、intent、hit area 与 provenance，tooltip、selection state、hover style、keyboard policy 与 editor UI 留在 adapter / userland
3. group / scope effect、blend isolation 与 offscreen composite 延后到独立设计，不在 alpha.8 改变 Scene、compile 或 renderer 行为
4. ScenePrimitive reference 与发布文案补齐当前 effect 字段和边界，且不回写 alpha.4 历史 ADR

Drawing Complete 是长期能力边界，不要求每个收口版本一次补完所有缺口；涉及 Core Scene / compile / render observable behavior 的能力必须分别立 ADR

## 兼容性与最终结果

alpha.8 不新增 runtime API 或 IR 字段。图元级 effect 语义保持，文档明确 Text / Group 不支持图元级 effect，interaction 与 group effect 作为后续候选登记

## 遗留边界

Interaction manifest、整组投影 / 混合、SVG group isolation、Canvas offscreen composite、hit-test 与 layout overflow 仍需独立契约

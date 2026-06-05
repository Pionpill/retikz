# ADR-09：边界 / error path 测试补完

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-15](./roadmap.md)

> **范围**：补若干**边界 / error path** 测试守门缺口（模块 happy path 已通过，但极端输入 / 错误路径 / 契约边界缺测，重构时可能静默回归）。补测过程中顺带定下几条此前未规约的边界行为。

## 背景 / 约束

全仓审查发现 6 类缺测：shape 算子（way[0] 是 circle/ellipse、负 radius、arc `startAngle===endAngle`）、viewBox 计算（NaN / Infinity 坐标输入未规约）、fallbackMeasurer（size=0 / 负 size / NaN size / 多 codepoint emoji）、`buildPathD` / `buildTransform` 的 default → throw（throw message 未验证含 kind 名）、多渲染实例下相同 arrow spec 是否产出不同 marker id（避免 SVG defs 冲突）、browser-measurer 模块级 canvas 单例。

## 决策：按 6 类各加 1~3 个测试，分散到对应单测文件

被否决的备选：合并到既有测试文件——单文件会涨；新建小文件每个 ~30-80 行更易 review、后续可继续追加且命名 pattern 一致。

补测过程中定下的边界行为（此前未规约，属真决策）：

- **NaN / Infinity 坐标：过滤 + warn**——viewBox 计算过滤非有限坐标、经 ADR-08 `onWarn` 触发 warning，不抛错（viewBox 退化优于 crash）。
- **`fallbackMeasurer(size=0) → { width: 0, height: 0 }`**（与 `text=""` 一致）；**负 size / NaN size 抛错**——非法输入早 fail。
- **`buildPathD` / `buildTransform` throw message 必须含 kind 字面量字符串**（格式 `"Unknown PathCommand kind: '<kind>'"`）——让用户从 message 反推哪个 kind 漏处理。
- **多渲染实例 marker id 隔离**——marker id 前缀从 `useId()` 派生，两实例同 spec 也不冲突。
- **browser-measurer 模块级 canvas 单例**——同次会话二次调用复用 canvas、不重复 `createElement`。

## 不在本 ADR 范围

- 性能 benchmark（如 100 step path compile 耗时）——留 ADR-05 拆 compile/path 时一并。
- E2E 集成（headless browser 跑真实 SVG 输出）、视觉回归（screenshot diff）——v0.2+。

---

> **实现指针**：level `green`、非 breaking（纯补测 + 个别边界行为微调）。真源以代码为准——边界行为落在 viewBox 计算（`core/src/compile/compile.ts`，`BBOX_EXTREME` 类 warning）、`core/src/compile/text-metrics.ts`、`render/src/svg/builders/`（path-d / transform throw message）、`render` 的 marker 收集（`useId` 派生前缀）。测试见 `core/tests/`（`parsers/parseWay-shape-errors`、`compile/text-metrics-extremes`）与 `react/tests/`（`render/path-d-builder-errors`、`kernel/Layout-multi-instance`、`render/browser-measurer-cache`）。完整原文（6 类缺测表 / 测试象限）见本文件 git 历史。

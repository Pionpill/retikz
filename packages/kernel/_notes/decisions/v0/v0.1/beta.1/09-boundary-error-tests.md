# ADR-09：边界输入与错误语义

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：

> **目标**：明确边界输入、错误路径和诊断行为，避免非法值静默改变可观察输出

## 背景 / 约束

## 决策：固化以下边界行为与诊断语义

补测过程中定下的边界行为（此前未规约，属真决策）：

- **NaN / Infinity 坐标：过滤 + warn**——viewBox 计算过滤非有限坐标、经 ADR-08 `onWarn` 触发 warning，不抛错（viewBox 退化优于 crash）。
- **`fallbackMeasurer(size=0) → { width: 0, height: 0 }`**（与 `text=""` 一致）；**负 size / NaN size 抛错**——非法输入早 fail。
- **`buildPathD` / `buildTransform` throw message 必须含 kind 字面量字符串**（格式 `"Unknown PathCommand kind: '<kind>'"`）——让用户从 message 反推哪个 kind 漏处理。
- **多渲染实例 marker id 隔离**——marker id 前缀从 `useId()` 派生，两实例同 spec 也不冲突。
- **browser-measurer 模块级 canvas 单例**——同次会话二次调用复用 canvas、不重复 `createElement`。

## 长期边界

- 性能 benchmark（如 100 step path compile 耗时）——留 ADR-05 拆 compile/path 时一并。
- E2E 集成（headless browser 跑真实 SVG 输出）、视觉回归（screenshot diff）——v0.2+。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：非 breaking（纯补测 + 个别边界行为微调）；其余默认行为、失败语义与公开契约以正文为准。

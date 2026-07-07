# Core 绘图完备设计

> 本文定义 `@retikz/core` 的绘图完备目标和检测方法。总纲见 [`notes/architecture/capability-design.md`](../../../../notes/architecture/capability-design.md)。本文只讨论 core 模块，不覆盖 plot、chart、React / Vanilla adapter 或具体 renderer 的体验封装；interaction 只讨论它们可消费的 headless 契约。

---

## 1. 定义

`@retikz/core` 的定位是 **Foundation of Graph System**：它不是某个图表库、diagram preset 或 renderer 的内部实现，而是整个 retikz 图形系统的基础表达层。所有 core 功能迭代都必须服务这个定位。

`@retikz/core` 的完备方向是 **Graphic Complete / Drawing Complete**：

> 任意静态二维图形语义，以及绑定在这些图形上的 headless interaction intent，都应能通过 core 的 JSON IR、扩展契约、编译管线和 renderer-agnostic Scene / manifest 表达。

这里的“任意图形”不是指 core 内置所有 shape、preset 或 diagram 类型，而是指 core 有足够稳定的底座，让新增图形能力可以通过同一套机制进入：

```text
IR / schema
  -> contract / definition
  -> provider / registry
  -> compile / lowering
  -> Scene / interaction manifest
  -> render package / adapter
```

如果某种图形只能在 React、Vanilla、plot 或某个 renderer 里特判实现，而不能落回 core IR / Scene，它不属于 core 完备能力。如果某种交互只能靠 adapter 从 Scene primitive 反推 id、bbox、hit area 或 provenance，也说明 core 缺少 headless interaction 底座；但 tooltip 浮层、选择状态、hover 样式和键盘策略仍不属于 core。

---

## 2. Core 需要检测的能力面

Core 绘图完备至少覆盖八类能力面。每类能力都可以独立演进，但必须共享同一条 IR -> Scene / manifest 管线。

| 能力面              | 目标                                                                                       | 不属于 core 的情况                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Primitive / Scene   | 定义后端中立的最小可渲染图元。                                                             | SVG-only / Canvas-only 私有能力；某个 renderer 的快捷 API。                              |
| Geometry            | 提供纯函数几何计算和图形构造基础。                                                         | 单一 domain 的 layout 算法；依赖 DOM / renderer 的测量逻辑。                             |
| Target / Coordinate | 支持节点、锚点、边界、局部坐标和命名引用。                                                 | plot scale、geo projection、domain-specific 坐标变换。                                   |
| Transform           | 表达图形空间变换并保持结构化输出。                                                         | 数据变换、统计变换、动画运行时状态机。                                                   |
| Constraint / Layout | 承载跨图形通用的定位和约束求解。                                                           | flow / graph / table 等领域布局策略。                                                    |
| Style / Resource    | 表达通用样式、paint、marker、pattern、clip 等资源。                                        | 某后端独有滤镜或无法诊断降级的视觉效果。                                                 |
| Composition         | 用 scope、group、zIndex、meta 等组合复杂图形。                                             | 上层私有节点树或不可持久化的运行时组合结构。                                             |
| Interaction         | 表达 JSON-safe 的交互目标、命中区域、tooltip / selection intent、role 与 provenance 关联。 | tooltip 浮层 UI、选中状态机、hover 样式、DOM 事件 handler、键盘策略、框选 / 拖拽编辑器。 |

这些能力面是检测维度，不是目录结构要求。具体实现仍按 `schemas / contract / providers / compile / shared` 分层。

---

## 3. 准入原则

新增 core 能力前，先做三步判断。

### 3.1 是否真的属于 core

属于 core 的能力通常满足：

- 能增强 Graph System foundation，而不是只服务单个上层封装、短期图形或某个 renderer 的局部便利。
- 多个上层模块都会消费。
- 能用 JSON IR 描述。
- 能编译成 renderer-agnostic Scene，或与 Scene 同步的 renderer-agnostic manifest。
- 不依赖 React、DOM、Canvas 实例、SVG DOM 或第三方重型 domain 依赖。
- 不要求用户数据、scale、stat、chart type 等 plot 语义。
- 交互能力只描述 JSON-safe intent / target / role / payload，不保存 runtime state、回调函数或具体 UI。

不满足这些条件时，优先放到 plot、domain 包、render 包或 adapter 层。

### 3.2 是否需要新底座

如果现有 core 能力可以组合表达，应优先组合，不新增底座。

只有出现以下情况，才考虑新增 core 底座：

- 现有 Scene primitive 无法正确表达该图形。
- 上层重复实现同一类几何或引用规则。
- 自定义能力无法通过现有 definition / registry 接入。
- renderer 之间需要共享一套新的抽象语义。
- 缺少该能力会迫使 plot / adapter / domain 包私造平行 IR 或 renderer 语义。
- 缺少统一 target / handle / provenance 会迫使 adapter 从 Scene primitive 反推命中区域或交互语义。

### 3.3 是否形成闭环

进入 core 的能力必须能形成闭环：

```text
schema 可表达
contract 可扩展
provider 可内置
compile 可消费
Scene 可承载
interaction manifest 可查询
renderer 可实现或可诊断降级
tests 可锁定
docs / notes 可解释
```

只完成其中一段，不能称为 core 完备能力。

---

## 4. 设计检查模板

涉及 core 新能力的 ADR 或架构 notes，应加入以下小节：

```md
## 绘图完备检查

- 能力面：
- 是否属于 core：
- 是否需要新 IR / schema：
- 是否需要新 contract / definition：
- 是否需要新 provider / registry：
- 是否需要改 compile / Scene：
- 是否需要 interaction target / manifest：
- runtime state 是否保持外部 headless：
- renderer 是否可跨后端实现：
- 上层模块如何消费：
- 不支持边界与诊断：
- 本轮不做的能力及原因：
```

评审时优先看两类问题：

1. **能力放错层**：plot / domain / renderer 能力被塞进 core，或 core 通用能力被上层私造。
2. **闭环缺失**：只加 schema、只加内置实现、只在 renderer 里能画、interaction 只能在 adapter 里反推、或自定义能力不是同机制。

---

## 5. 与现有设计的关系

本文不替代现有 core 架构规则：

- `notes/architecture/core-design.md` 仍是全局 core 架构背景。
- `packages/kernel/core/AGENTS.md` 仍是包内硬约束。
- `standard-structure` / `standard-schema` / `standard-contract` / `standard-providers` / `standard-pipeline-compile` 仍决定代码落层。
- kernel ADR 仍记录具体版本的设计决策。

本文只补一个判断框架：当 core 要接收新图形或 headless interaction 能力时，用绘图完备检测确认它放对层、能闭环、不会破坏 renderer-agnostic 与 JSON IR 的底座。

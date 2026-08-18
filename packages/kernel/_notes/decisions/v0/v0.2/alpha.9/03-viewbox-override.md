# ADR-03：自定义 viewBox override（覆盖自动包围盒的逃生口）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联： · tikz-gap-analysis §6 Scene（历史分析已删除） · 本 milestone [ADR-01](./01-partway-absolute-target.md) / [ADR-02](./02-clip.md)

## 背景 / 约束

viewBox 原先全自动：core 算 scene `Layout`（`{ x, y, width, height }`，按内容 + padding），react `formatViewBox` 只是格式化，**无覆盖入口**。

TikZ `\useasboundingbox` 用指定区域当包围盒、覆盖自动范围。诉求是真实存在的逃生口：固定画布尺寸（内容多少同尺寸）、裁剪显示区域、多图对齐同框、把溢出装饰排除出包围盒——全自动无法表达。

## 决策：Scene IR 顶层加可选 `viewBox` override 字段

override 落点是 **Scene IR 顶层 `viewBox` 字段**，可序列化、AI 可生成；**不是**仅 React prop / `CompileOptions`。`<Layout>` 的 `viewBox` prop 透传进 IR 顶层。compile 有 override 则直接用它当 `Layout`、跳过自动包围盒；无 override 则现行为零变化。react `formatViewBox` 无需改（消费同一 `Layout`）。

理由：

1. **一处定，避免三处漏**：顶层 IR 字段让 prop / IR / compile 单一真源，不必在三处同步。
2. **复用现成 Layout 计算**：有 override 跳过自动算、无 override 零变化，react 端无改动；纯叠加字段 + compile 一个分支，低成本。

设计细节（具体决策）：

- **形态 = 具名四字段对象 `{ x, y, width, height }`**：实现采用具名对象（与 `Scene.layout` / SVG viewBox 同构、JSON 可序列化），非原提案倾向的 `[x,y,w,h]` 元组。`width` / `height` `.positive().finite()`，`x` / `y` `.finite()`。
- **override = 最终框，不叠 padding**：用户既然显式给框，所见即所得；compile 忽略 `CompileOptions.padding`。
- **与 clip 正交**（[ADR-02](./02-clip.md)）：viewBox 决定画布范围（坐标系映射），clip 决定可见裁切；clip 不改 viewBox、viewBox 不裁元素。
- **override 框小于内容**：内容溢出框（视觉裁切交给 clip），viewBox 只定坐标范围。

## 长期边界

- **path-as-bbox**（任意路径 / node 当包围盒，对齐 `\useasboundingbox` 任意路径）：留扩展，首批整框覆盖。
- **部分覆盖**（只固定宽 / 只固定高、其余自动）：留扩展。
- **libraries 划分**（`\usetikzlibrary`）：非功能缺口，已被注册面策略覆盖，不做。
- **partway**→ [ADR-01](./01-partway-absolute-target.md)；**clip**→ [ADR-02](./02-clip.md)。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：向后兼容纯叠加字段、零破坏（未给时全自动不变）；其余默认行为、失败语义与公开契约以正文为准。

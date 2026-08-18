# ADR-01：Scene `ViewBox` → `Layout` 抽象

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联： · [alpha.5 ADR-01 Scene primitive structured](../alpha.5/01-scene-primitive-structured.md) · [beta.1 ADR-01 renderer-neutral core](../beta.1/01-core-comments-renderer-neutral.md)

> **目标**：把 Scene 暴露的场景整体边界从 `ViewBox` / `Scene.viewBox` / `computeViewBox` 改为中性命名 `Layout` / `Scene.layout` / `computeLayout`，让 core 公开类型层不再以 SVG 为中心。

## 背景 / 约束

- 该数据本质是场景布局边界，不是 SVG 专属结构；`viewBox` 只是 SVG adapter 最终渲染时的属性名——公开类型沿用它会让 core 显得以 SVG 为中心，与 renderer-neutral 目标冲突。
- alpha.5 已把 `PathPrim` / `GroupPrim` 从 SVG 字符串解耦、beta.1 已清理 core 里 SVG-imposing 注释，命名层是同类残留的最后一块。
- beta 是公开 API 冻结前最后的改名窗口，rc 之后冻结。

## 决策：改为 `Layout` / `scene.layout` / `computeLayout`

公开 type、Scene 字段、compile helper 一次性全改中性命名，**不保留 deprecated alias**。`Layout` 字段仍为 `{ x, y, width, height }`，字段语义与数值行为不变。

理由：

1. beta 是最后改名窗口，rc 之后公开 API 冻结。
2. `Layout` 更准确描述场景整体几何边界，适配 SVG / Canvas / Skia / PDF。
3. 一次改 type / field / helper / file，避免半中性半 SVG 的命名漂移。

决策细节（均为具体决策）：

- React SVG adapter 内部 文件名与 `formatViewBox` 函数名**保留**——那里确实是在把 `Layout` 格式化为 SVG `<svg viewBox="...">` 字符串，仅参数类型从 `ViewBox` 改为 `Layout`。
- 所有 SVG attribute 字面量 `viewBox` 不改（`<svg viewBox>`、`<marker viewBox>`、SVG icon、renderer 注释里的 SVG 属性说明）。
- 旧 notes / ADR 中作为历史描述的 `viewBox` 不强制全量改写。

## 长期边界

- 新增用户可配置 layout / bounding box API。
- 修改 `Layout` 的字段结构、坐标系或 padding 策略。
- 修改 SVG adapter 的 `formatViewBox` 输出格式。
- 清理历史 ADR 中作为历史事实出现的 `viewBox` 文字。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：正文所列默认行为与既有契约保持兼容；其余默认行为、失败语义与公开契约以正文为准。

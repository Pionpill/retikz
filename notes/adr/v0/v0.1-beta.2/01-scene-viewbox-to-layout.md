# ADR-01：Scene `ViewBox` → `Layout` 抽象

- 状态：Accepted
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-1](../../../plans/v0/v0.1-beta.2.md) · [alpha.5 ADR-01 Scene primitive structured](../v0.1-alpha.5/01-scene-primitive-structured.md) · [beta.1 ADR-01 renderer-neutral core](../v0.1-beta.1/01-core-comments-renderer-neutral.md)

## 背景

`packages/core/src/primitive/view-box.ts` 当前导出 `ViewBox = { x, y, width, height }`，`Scene` 也通过 `viewBox: ViewBox` 暴露场景整体边界。这个数据本质上是场景布局边界，不是 SVG 专属结构；`viewBox` 只是 SVG adapter 最终渲染时需要的属性名。

alpha.5 已经把 `PathPrim` / `GroupPrim` 从 SVG 字符串表达中解耦，beta.1 也清理了 core 里 SVG-imposing 的注释。继续保留 `ViewBox` / `Scene.viewBox` / `computeViewBox` 会让 core 的公开类型层仍然显得以 SVG 为中心，与 renderer-neutral 的目标不一致。

## 选项

### A. 直接改为 `Layout` / `scene.layout` / `computeLayout`（推荐）

把公开类型、Scene 字段和 compile helper 都改成中性命名：

```ts
import { type Layout, type Scene } from '@retikz/core';

type Scene = {
  primitives: Array<ScenePrimitive>;
  layout: Layout;
};
```

文件 rename：

- `packages/core/src/primitive/view-box.ts` → `packages/core/src/primitive/layout.ts`
- `packages/core/src/compile/view-box.ts` → `packages/core/src/compile/layout.ts`

React SVG adapter 内部的 `packages/react/src/render/viewBox.ts` 与 `formatViewBox` 保留，因为那里确实是在把 `Layout` 格式化为 SVG `<svg viewBox="...">` 字符串。

### B. 只改 type 为 `Layout`，保留 `scene.viewBox`

迁移成本较小，但 Scene 字段仍然带 SVG 命名，核心问题没有解决。

### C. 保持不变

避免 breaking，但会把 renderer-specific 命名带进 rc 之后的冻结 API。

## 决策：A

理由：

1. beta 是最后的改名窗口，rc 之后公开 API 冻结。
2. `Layout` 更准确描述场景整体几何边界，适配 SVG / Canvas / Skia / PDF 等渲染目标。
3. 一次性改 type、field、helper、file，避免半中性半 SVG 的命名漂移。

## 决策细节

- `ViewBox` / `Scene.viewBox` / `computeViewBox` 直接删除并替换为 `Layout` / `Scene.layout` / `computeLayout`，不保留 deprecated alias。
- `Layout` 字段仍为 `{ x, y, width, height }`，字段语义和数值行为不变。
- `react/src/render/viewBox.ts` 文件名和 `formatViewBox` 函数名保留；仅参数类型从 `ViewBox` 改为 `Layout`。
- 所有对 SVG attribute `viewBox` 的字面量不改，包括 `<svg viewBox="...">`、`<marker viewBox="...">`、SVG icon、renderer 注释里的 SVG attribute 说明。
- 旧 notes / ADR 中作为历史描述出现的 `viewBox` 不强制全量改写；当前 plan / roadmap / docs 的用户可见当前状态需要同步。

## DSL 表面

```ts
// 旧
import { computeViewBox, type Scene, type ViewBox } from '@retikz/core';

scene.viewBox;
computeViewBox(points, padding, round);

// 新
import { computeLayout, type Layout, type Scene } from '@retikz/core';

scene.layout;
computeLayout(points, padding, round);
```

## 影响

- **公开 API**：BREAKING。`ViewBox` / `Scene.viewBox` / `computeViewBox` 改名。
- **运行时行为**：不变。布局边界计算公式、rounding、padding、空点集兜底行为保持等价。
- **React adapter**：`<TikZ>` 内部读取 `scene.layout`，继续渲染 SVG `viewBox` 属性。
- **文档**：需要 changelog BREAKING + 迁移路径；涉及当前 docs 示例、API 说明和阅读指南。

## 不在本 ADR 范围

- 新增用户可配置 layout / bounding box API。
- 修改 `Layout` 的字段结构、坐标系或 padding 策略。
- 修改 SVG adapter 的 `formatViewBox` 输出格式。
- 清理历史 ADR 中作为历史事实出现的 `viewBox` 文字。

---

## 实现契约

### Level

`breaking`。改 core 公开 type / Scene 字段 / helper export，并同步 react adapter 与 docs。

### Schema 改动

无 zod IR schema 改动；Scene primitive TypeScript 类型改名。

| 文件 | 操作 | 字段 / 类型 | 旧 | 新 |
|---|---|---|---|---|
| `packages/core/src/primitive/view-box.ts` | rename | type | `ViewBox` | `Layout` |
| `packages/core/src/primitive/scene.ts` | 字段 rename | `Scene` | `viewBox: ViewBox` | `layout: Layout` |
| `packages/core/src/compile/view-box.ts` | rename | function | `computeViewBox` | `computeLayout` |
| `packages/core/src/index.ts` | export rename | public export | `ViewBox` | `Layout` |

### 文件 scope

- `packages/core/src/primitive/view-box.ts` → `packages/core/src/primitive/layout.ts`
- `packages/core/src/primitive/scene.ts`
- `packages/core/src/primitive/index.ts`
- `packages/core/src/compile/view-box.ts` → `packages/core/src/compile/layout.ts`
- `packages/core/src/compile/compile.ts`
- `packages/core/src/compile/index.ts`
- `packages/core/src/index.ts`
- `packages/core/tests/**` 中 `scene.viewBox` / `computeViewBox` / `view-box` 引用
- `packages/react/src/kernel/TikZ.tsx`
- `packages/react/src/render/viewBox.ts`
- `packages/react/tests/**` 中 scene snapshot 或 render 相关引用
- `apps/docs/src/**` 中当前 API / demo / 阅读指南相关引用
- `AGENTS.md` 中当前流程示例的 `<TikZ>` 改名不属于本 ADR，若与 ADR-02 同批实现则统一处理

### 测试象限

**等价守门（既有测试改名后必须保持语义）**

1. 空点集 layout 仍为 `{ x: 0, y: 0, width: 100, height: 100 }`。
2. 单点 layout padding 行为不变。
3. 多点 layout padding 行为不变。
4. rounding 行为不变。
5. 退化 bbox（宽高为 0）兜底行为不变。

**公开 API smoke**

6. `import { computeLayout, type Layout, type Scene } from '@retikz/core'` 可用。
7. `Scene['layout']` 类型为 `Layout`。
8. 旧 `computeViewBox` / `ViewBox` 不再从 public index 导出。

**React adapter**

9. `<TikZ>` 渲染出的 `<svg>` 仍包含正确 `viewBox` attribute。
10. `formatViewBox(layout)` 输出字符串格式不变。

**回归**

11. 节点 / 路径 / label 导致的 scene 边界断言全部改为 `scene.layout` 后继续通过。
12. NaN / Infinity layout 输入防护测试保持通过。

### 多 LLM 评估关注点

- 是否遗漏 public export 或 deep import 路径。
- 是否把 SVG attribute `viewBox` 错误改成了 `layout`。
- 是否只改了类型名但遗漏 `Scene.viewBox` 字段。
- docs / changelog 是否明确 BREAKING 和迁移路径。

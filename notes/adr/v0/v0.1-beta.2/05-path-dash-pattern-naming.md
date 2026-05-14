# ADR-05: Path dash pattern 命名对齐 TikZ

- 状态：Accepted
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-5](../../../plans/v0/v0.1-beta.2.md) · [TikZ actions](https://tikz.dev/tikz-actions)

## 背景

`PathSchema` 当前公开字段为 `strokeDasharray`，React `<Path>` / `<Draw>` 也透传同名 prop。这个名字直接来自 SVG / CSS `stroke-dasharray`。

核对 TikZ / PGF manual 后：

- TikZ 使用 `line cap` / `line join`，当前 `lineCap` / `lineJoin` 与 TikZ 术语一致。
- TikZ 使用 `dash pattern` 描述虚线模式，当前 `strokeDasharray` 与 TikZ 术语不一致。
- TikZ 对填充内部规则使用 nonzero winding number rule / even odd rule，当前 `fillRule: 'nonzero' | 'evenodd'` 语义可接受。

beta 是公开 API 冻结前最后的命名窗口；如果保留 `strokeDasharray`，rc 之后就会把 SVG/CSS 术语固定在核心 DSL 中。

## 选项

### A. `strokeDasharray` 改名为 `dashPattern`（推荐）

公开 IR 字段、React `<Path>` / `<Draw>` prop、Scene primitive 字段同步改为 `dashPattern: Array<number>`。React/SVG renderer 内部再把数组 join 成 SVG `strokeDasharray` attribute。

### B. 仅文档改成 TikZ 解释，字段保留 `strokeDasharray`

迁移成本低，但公开 API 继续保留 SVG/CSS 命名。

### C. 使用 `dashArray`

项目中 Node 已有 `dashArray`，但 TikZ manual 更接近 `dash pattern`；继续使用 `dashArray` 也容易和 SVG dash array 语义绑定。若保留 Node 字段名，至少应把字段值改为 `Array<number>`，避免保留 SVG/CSS 字符串文法。

## 决策：A

理由：

1. `dashPattern` 更接近 TikZ 术语，且不暴露 SVG attribute 名。
2. beta 允许 breaking rename，rc 后不应再改公开字段。
3. React/SVG renderer 本来就是把 core Scene 映射到 SVG attribute 的边界，`dashPattern -> strokeDasharray` 的 `join(' ')` 应在 renderer 内完成。

## 决策细节

- `IRPath.strokeDasharray` 改名为 `IRPath.dashPattern: Array<number>`。
- React `<Path strokeDasharray>` / `<Draw strokeDasharray>` 改为 `dashPattern`。
- `PathPrim.strokeDasharray`、`RectPrim.strokeDasharray`、`EllipsePrim.strokeDasharray` 改为 `dashPattern: Array<number>`。
- React renderer 内部仍使用 SVG prop `strokeDasharray={p.dashPattern?.join(' ')}`。
- Node 当前已有 `dashArray` 字段。本 ADR 保留字段名以减少改名面积，但同步把字段值从 string 改为 `Array<number>`；文档不得称其为“SVG 原生逃生口”。
- `lineCap` / `lineJoin` 保持不变。
- `fillRule` 保持不变。
- 不保留 `strokeDasharray` alias。

## 影响

- **公开 API**：BREAKING。影响 core IR、React `<Path>` / `<Draw>` prop、Scene primitive type。
- **运行时行为**：渲染结果不变；公开值从字符串改为 number 数组，SVG adapter 内部负责 join。
- **文档**：需要 changelog BREAKING + zh/en docs + demos 同步。

## 实现契约

### Level

`breaking`。公开字段 / prop rename。

### Schema 改动

| 文件 | 操作 | 旧 | 新 |
|---|---|---|---|
| `packages/core/src/ir/path/path.ts` | 字段 rename + value shape | `strokeDasharray: string` | `dashPattern: Array<number>` |
| `packages/core/src/primitive/path.ts` | 字段 rename + value shape | `strokeDasharray: string` | `dashPattern: Array<number>` |
| `packages/core/src/primitive/rect.ts` | 字段 rename + value shape | `strokeDasharray: string` | `dashPattern: Array<number>` |
| `packages/core/src/primitive/ellipse.ts` | 字段 rename + value shape | `strokeDasharray: string` | `dashPattern: Array<number>` |
| `packages/react/src/kernel/Path.tsx` | prop rename + value shape | `strokeDasharray="4 2"` | `dashPattern={[4, 2]}` |
| `packages/react/src/sugar/Draw.tsx` | prop rename + value shape | `strokeDasharray="4 2"` | `dashPattern={[4, 2]}` |

### 文件 scope

- `packages/core/src/ir/path/path.ts`
- `packages/core/src/primitive/path.ts`
- `packages/core/src/primitive/rect.ts`
- `packages/core/src/primitive/ellipse.ts`
- `packages/core/src/compile/path/index.ts`
- `packages/core/src/compile/node.ts`
- `packages/react/src/kernel/Path.tsx`
- `packages/react/src/sugar/Draw.tsx`
- `packages/react/src/kernel/_fields.ts`
- `packages/react/src/kernel/unbuilder.ts`
- `packages/react/src/render/renderPrim.tsx`
- `packages/core/tests/**`
- `packages/react/tests/**`
- `apps/docs/src/contents/**`
- `apps/docs/src/i18n/**`

### 测试象限

1. `PathSchema` 接受 `dashPattern`。
2. `PathSchema` 不再公开 `strokeDasharray`。
3. `<Path dashPattern={[4, 2]}>` 产出的 IR 含 `dashPattern: [4, 2]`。
4. `<Draw dashPattern={[4, 2]}>` 与等价 `<Path dashPattern={[4, 2]}>` 构造一致。
5. `compileToScene` 把 `IRPath.dashPattern` 透传到 `PathPrim.dashPattern`。
6. React/SVG renderer 把 `PathPrim.dashPattern` join 后渲染为 SVG `stroke-dasharray`。
7. Node dashed / dotted / explicit dash 行为保持现有优先级。
8. unbuilder round-trip 使用新字段。
9. docs demos 不再引用 `strokeDasharray`。
10. changelog zh/en 明确迁移路径：`strokeDasharray="4 2"` -> `dashPattern={[4, 2]}`，以及 `dashArray="6 2"` -> `dashArray={[6, 2]}`。

## 多 LLM 评估关注点

- 是否遗漏 docs/demo/test 中的旧 prop。
- 是否错误修改了 SVG renderer 的实际 attribute 名。
- 是否让 Node `dashArray` 字段名与 Path `dashPattern` 字段名产生不可接受的不一致；如保留，文档是否说明清楚。

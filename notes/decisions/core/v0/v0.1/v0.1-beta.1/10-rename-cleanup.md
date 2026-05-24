# ADR-10：改名 + 命名清理（`NodeTextSchema` → `TextBlockSchema`、`_builder` 去 `_` 前缀、`renderPrim` `ctx`→`context`）

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-16](./roadmap.md) · [AGENTS.md "不缩写命名"](../../../../../../AGENTS.md)

## 背景

beta.1 阶段发现 3 处命名不一致，本 ADR 一并处理。原计划改 1 因 schema 导出名冻结约定推到下次 alpha 窗口；**beta.1 不考虑兼容性原则下**，三处一起做。

| # | 原命名 | 问题 | 是否破坏 |
|---|---|---|---|
| 1 | `NodeTextSchema` / `IRNodeText` | 名带 "Node" 但实是通用文本块（已在 alpha.5 ADR-02 抽到 `ir/text.ts`）；与 `text.ts` 文件位置呼应、与未来 StepLabel / NodeLabel / `<Text>` 复用呼应应该叫 `TextBlockSchema` / `IRTextBlock` | **BREAKING**（schema 导出名）—— 用户需调整 import |
| 2 | `_builder.ts` / `_unbuilder.ts` | `_` 前缀表示"内部模块"，但 `buildIR` 通过 `index.ts` 公开导出 `convertReactNodeToIR` —— 命名表意不一致 | **非破坏**（文件名 rename，公开 import path 不变） |
| 3 | `renderPrim.tsx` 公开签名 `ctx: RenderContext` | `ctx` 是缩写，与类型名 `RenderContext` 不对齐 + 违反 AGENTS.md "不缩写"； 但 `ctx` 是位置参数名，TS 不约束调用方参数名 | **非破坏**（参数名变化对调用方零影响） |

## 选项

### A. 三处一并做（**推荐**——beta.1 不考虑兼容性）

**改 1**：`NodeTextSchema` → `TextBlockSchema`、`IRNodeText` → `IRTextBlock`

```ts
// packages/core/src/ir/text.ts
export const TextBlockSchema = z.union([...]).describe('Text block: ...');
export type IRTextBlock = z.infer<typeof TextBlockSchema>;

// packages/core/src/index.ts
export { TextBlockSchema } from './ir';
export type { IRTextBlock } from './ir';
// NodeTextSchema / IRNodeText 不再 export
```

`NodeSchema.text` / `LineSpecSchema` 内部 schema 引用同步改。changelog 标 BREAKING + 迁移路径（`NodeTextSchema → TextBlockSchema`、`IRNodeText → IRTextBlock`）。

**改 2**：`_builder.ts` → `builder.ts`，`_unbuilder.ts` → `unbuilder.ts`

```bash
git mv packages/react/src/kernel/_builder.ts packages/react/src/kernel/builder.ts
git mv packages/react/src/kernel/_unbuilder.ts packages/react/src/kernel/unbuilder.ts
```

公开 import path（`@retikz/react`）通过 barrel re-export 不变；内部 `import { buildIR } from './kernel/_builder'` 改为 `from './kernel/builder'`。

**改 3**：`renderPrim.tsx` `ctx: RenderContext` → `context: RenderContext`

```ts
// 旧
export const renderPrim = (prim: ScenePrimitive, key: number, ctx: RenderContext = {}) => { ... };

// 新
export const renderPrim = (prim: ScenePrimitive, key: number, context: RenderContext = {}) => { ... };
```

参数名变化对外部调用方零影响（TS 不约束参数名）。

### B. 只做改 2 + 改 3，改 1 推下次 alpha 窗口

代价：beta.1 不考虑兼容性原则下，没必要推迟；推下版本反而拉长尾。

### C. 不动

代价：命名违反约束持续；TODO-16 主题已写进 plan，懒于落地不符工作流。

## 决策：A

理由：
1. beta.1 不考虑兼容性——`NodeTextSchema` 改名零成本：用户从 alpha → beta 直接升级、import 改一行
2. 改 1 + 2 同期做避免命名漂移：`TextBlockSchema` 与 `text.ts` 文件位置 / 未来 StepLabel / NodeLabel / `<Text>` 复用语义对齐
3. 改 3 顺手清理 `ctx` 缩写，符合 AGENTS.md "不缩写命名" 硬约束

## 决策细节

- ✓ **`NodeTextSchema` / `IRNodeText` 直接删除、用 `TextBlockSchema` / `IRTextBlock` 替代**——不留 deprecated alias；用户从 alpha → beta 一次性改 import
- ✓ **`packages/core/src/ir/text.ts` 内 schema 重命名**——同步改 `NodeSchema.text` / 内部所有引用
- ✓ **`_builder.ts` rename 后既有跨包 import**：仓库内除测试外只有 `react/src/index.ts` 引用，改 import 路径即可
- ✓ **测试文件同步 rename**：`packages/react/tests/kernel/_builder.test.tsx` → `builder.test.tsx`；`_unbuilder.test.tsx` 同理
- ✓ **一并审计其他 `_xxx` 私有模块**：grep `packages/{core,react}/src/**/_*.ts*` 列其他候选——预期仅 `_transform.ts`（ADR-03 新建，纯内部不公开导出，保留）
- ✓ **改名 commit 走 git mv**——保留 git history rename 检测
- ✓ **changelog 草稿（zh + en）必写**——`NodeTextSchema → TextBlockSchema` 是 BREAKING，需在 wrapup 时呈现迁移指引

## DSL 表面

```ts
// 旧（alpha.5）
import { NodeTextSchema, type IRNodeText } from '@retikz/core';

// 新（beta.1）
import { TextBlockSchema, type IRTextBlock } from '@retikz/core';
```

`_builder` 改名 / `ctx → context` 改名对外 import / 调用方零影响。

## 测试设计

无新测试——既有测试全过即守门通过。需要验证：

- `import { TextBlockSchema, type IRTextBlock } from '@retikz/core'` 可用
- `NodeTextSchema` / `IRNodeText` 不再 export（用户 import 报错）
- `import { convertReactNodeToIR } from '@retikz/react'` 仍可用
- 既有 `_builder.test.tsx` / `_unbuilder.test.tsx` 测试 rename 后仍跑过

## 影响

- **代码组织**：4 个文件 rename（`_builder.ts` + `_unbuilder.ts` + 2 测试）+ schema 导出名变化
- **公开 API**：`NodeTextSchema` / `IRNodeText` ⚠️ BREAKING → 用 `TextBlockSchema` / `IRTextBlock`
- **commit log**：git rename 检测（`similarity index 100%`）
- **下游用户**：`NodeTextSchema` 用户需改 import 一行；其他改动零影响

## 不在本 ADR 范围

- 其他可能存在的 `_xxx` 私有模块（如未来 alpha 期产生）——本 ADR 仅扫当前两处 + ADR-03 新建的 `_transform.ts`（纯内部、保留）

---

## 实现契约

### Level

`red`（动公开 schema 导出名 `NodeTextSchema` / `IRNodeText`——⚠️ BREAKING；动 `packages/react/src/kernel/` 内部组织）

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/text.ts` | 重命名导出 | `NodeTextSchema` → `TextBlockSchema` | `z.union([z.string(), z.array(LineSpecSchema).min(1)])` | — | 文本块（单字符串或多行 LineSpec 数组） |
| `packages/core/src/ir/text.ts` | 重命名 type | `IRNodeText`（隐式）→ `IRTextBlock` | `z.infer<typeof TextBlockSchema>` | — | — |
| `packages/core/src/index.ts` | 替换 export | `NodeTextSchema` → `TextBlockSchema` | — | — | — |

`NodeSchema.text` 字段名 / 类型不变（仍是同一 schema 字段引用，只是类型 alias 名变）；schema 字段引用同步用新名。

### 文件 scope

- `packages/core/src/ir/text.ts` —— `NodeTextSchema` → `TextBlockSchema`，`IRLineSpec` 不变
- `packages/core/src/ir/node.ts` —— import `TextBlockSchema`（替换 `NodeTextSchema`）
- `packages/core/src/index.ts` —— export `TextBlockSchema` / `IRTextBlock`；删 `NodeTextSchema` / `IRNodeText`
- `packages/core/tests/**` —— grep `NodeTextSchema` / `IRNodeText` 引用同步改
- `packages/react/src/kernel/_builder.ts` → `packages/react/src/kernel/builder.ts`（git mv）
- `packages/react/src/kernel/_unbuilder.ts` → `packages/react/src/kernel/unbuilder.ts`（git mv）
- `packages/react/tests/kernel/_builder.test.tsx` → `packages/react/tests/kernel/builder.test.tsx`（git mv）
- `packages/react/tests/kernel/_unbuilder.test.tsx` → `packages/react/tests/kernel/unbuilder.test.tsx`（git mv）
- `packages/react/src/index.ts` —— 内部 import path 更新
- `packages/react/src/kernel/Tikz.tsx` —— 内部 import path 更新（如有引用）
- `packages/react/src/render/renderPrim.tsx` —— 参数名 `ctx` → `context`
- `apps/docs/src/**` —— grep `NodeTextSchema` mdx / schema-registry 引用同步改
- changelog mdx zh + en —— ⚠️ BREAKING 段

### 测试象限

零行为变化，守门即可：

**守门（既有）**：
- `pnpm --filter @retikz/react test:run` 全过
- `tsc --noEmit` 全过
- `import { convertReactNodeToIR } from '@retikz/react'` 可用（既有测试已含）

### 依赖的现有元素

- `_builder.ts` / `_unbuilder.ts` —— **rename**
- `renderPrim.tsx` —— **参数 rename**
- `react/src/index.ts` —— **修改**：import path 更新

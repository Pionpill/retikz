# ADR-10：改名 + 命名清理（`_builder` 去 `_` 前缀、`renderPrim` `ctx`→`context`）

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-16](../../../plans/v0/v0.1-beta.1.md) · [AGENTS.md "不缩写命名"](../../../../AGENTS.md)

## 背景

beta.1 阶段发现 3 处命名不一致，本 ADR 处理其中 **非破坏性的 2 处**——第 3 处 schema 导出名 rename 推到下次 alpha 窗口（见"不在本 ADR 范围"段）。

| # | 原命名 | 问题 | 是否破坏 |
|---|---|---|---|
| 1 | `NodeTextSchema` | 名带 "Node" 但实是通用文本块（已在 alpha.5 ADR-02 抽到 `ir/text.ts`）；与 `text.ts` 文件位置呼应、与未来 StepLabel / NodeLabel / `<Text>` 复用呼应应该叫 `TextBlockSchema` | **破坏**（schema 导出名，alpha.5 后冻结）—— 推下次 alpha 窗口 |
| 2 | `_builder.ts` / `_unbuilder.ts` | `_` 前缀表示"内部模块"，但 `buildIR` 通过 `index.ts` 公开导出 `convertReactNodeToIR` —— 命名表意不一致 | **非破坏**（文件名 rename，公开 import path 不变） |
| 3 | `renderPrim.tsx` 公开签名 `ctx: RenderContext` | `ctx` 是缩写，与类型名 `RenderContext` 不对齐 + 违反 AGENTS.md "不缩写"； 但 `ctx` 是位置参数名，TS 不约束调用方参数名 | **非破坏**（参数名变化对调用方零影响） |

## 选项

### A. 本 ADR 只做改 2 + 改 3，改 1 推下次 alpha 窗口（**推荐**）

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

参数名变化对外部调用方零影响（TS 不约束参数名，所有调用方按位置传或对象解构传）。

### B. 三处一并做

代价：改 1 是 schema 导出名变化、破坏 alpha.5 冻结约定。哪怕加 deprecated alias 共存，也是 alpha 窗口动作。beta.1 严守"非破坏"硬规则。

### C. 不动

代价：命名违反约束持续；TODO-16 主题已写进 plan，懒于落地不符 beta.1 工作流。

## 决策：A

理由：
1. beta.1 硬规则：schema 字段名 / 语义 / 公开 API surface 不动——改 1 推下次 alpha 窗口
2. 改 2 是**文件 rename**，公开 import path 由 barrel 保证不变；属内部命名整理、非破坏
3. 改 3 是**函数参数名**，对调用方零影响；属命名清理

## 待决策点

- **`_builder.ts` rename 后既有跨包 import**：仓库内除测试外只有 `react/src/index.ts` 引用，改 import 路径即可
- **测试文件路径**：`packages/react/tests/kernel/_builder.test.tsx` 同步 rename 为 `builder.test.tsx`；`_unbuilder.test.tsx` 同理
- **是否一并审计其他 `_xxx` 私有模块**：grep `packages/{core,react}/src/**/_*.ts*` 列其他候选——预期为零（`_builder` / `_unbuilder` 是历史遗留），如有再决策
- **改名 commit 是否走 git mv**：必须——保留 git history rename 检测

## DSL 表面

无变化（公开 import path 不变）。

## 测试设计

无新测试——既有测试全过即守门通过。但需要验证：

- `import { convertReactNodeToIR } from '@retikz/react'` 仍可用
- 既有 `_builder.test.tsx` / `_unbuilder.test.tsx` 测试 rename 后仍跑过

## 影响

- **代码组织**：4 个文件 rename（`_builder.ts` + `_unbuilder.ts` + 2 测试）
- **公开 API**：无变化
- **commit log**：git rename 检测（` similarity index 100%`）
- **下游用户**：零影响

## 不在本 ADR 范围

- **改 1 `NodeTextSchema` → `TextBlockSchema`**：推下次 alpha 窗口（v0.2 alpha 或重开 alpha.6），届时一并：
  - schema 导出名 rename
  - IR 类型 `IRNodeText` → `IRTextBlock` 同步
  - 短期保留 `NodeTextSchema` 作 deprecated alias（v0.2 删）
  - 或者直接破除 alias（用户从 alpha → beta → v0.2 已知存在重命名）
- 其他可能存在的 `_xxx` 私有模块（如未来 alpha 期产生）—— 本 ADR 仅扫当前两处

---

## 实现契约

### Level

`green`（动 `packages/react/src/kernel/`，但仅文件 rename + 参数名 rename + 内部 import 调整；公开 API 表面零变化）

### Schema 改动

无 zod schema 改动。

### 文件 scope

- `packages/react/src/kernel/_builder.ts` → `packages/react/src/kernel/builder.ts`（git mv）
- `packages/react/src/kernel/_unbuilder.ts` → `packages/react/src/kernel/unbuilder.ts`（git mv）
- `packages/react/tests/kernel/_builder.test.tsx` → `packages/react/tests/kernel/builder.test.tsx`（git mv）
- `packages/react/tests/kernel/_unbuilder.test.tsx` → `packages/react/tests/kernel/unbuilder.test.tsx`（git mv）
- `packages/react/src/index.ts` —— 内部 import path 更新
- `packages/react/src/kernel/Tikz.tsx` —— 内部 import path 更新（如有引用）
- `packages/react/src/render/renderPrim.tsx` —— 参数名 `ctx` → `context`
- 其他可能引用 `_builder` / `_unbuilder` 的内部文件（grep 全仓）

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

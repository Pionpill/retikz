# ADR-10：改名 + 命名清理（`NodeTextSchema` → `TextBlockSchema`、`_builder` 去 `_` 前缀、`renderPrim` `ctx`→`context`）

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-16](./roadmap.md) · [AGENTS.md "不缩写命名"](../../../../../../AGENTS.md)

> **范围**：beta.1 阶段发现的 3 处命名不一致一并处理——schema 导出名 `NodeTextSchema`、内部模块 `_builder` / `_unbuilder` 的 `_` 前缀、`renderPrim` 的 `ctx` 缩写参数。beta.1 不考虑兼容性，三处一起做。

## 背景 / 约束

3 处命名不一致：

1. **`NodeTextSchema` / `IRNodeText`** —— 名带 "Node" 但实是通用文本块（已在 alpha.5 抽到 `ir/text.ts`），与文件位置 / 未来 StepLabel / NodeLabel / `<Text>` 复用语义不符。⚠️ **BREAKING**（schema 导出名，用户需调 import）。
2. **`_builder.ts` / `_unbuilder.ts`** —— `_` 前缀表"内部模块"，但 `buildIR` / `convertReactNodeToIR` 经 `index.ts` 公开导出，命名表意不一致。非破坏（文件名 rename，公开 import path 不变）。
3. **`renderPrim` 的 `ctx: RenderContext`** —— `ctx` 缩写与类型名不对齐、违反 AGENTS.md "不缩写"；但是位置参数名、TS 不约束调用方。非破坏。

## 决策：三处一并做（beta.1 不考虑兼容性）

- `NodeTextSchema` → `TextBlockSchema`、`IRNodeText` → `IRTextBlock`；**直接删除旧名、不留 deprecated alias**——用户从 alpha → beta 一次性改 import 一行。
- `_builder.ts` / `_unbuilder.ts` → `builder.ts` / `unbuilder.ts`（含测试文件，走 git mv 保留 rename 检测）；公开 import path 通过 barrel re-export 不变。
- `renderPrim` 参数 `ctx` → `context`。

被否决的备选：(B) 只做 2 + 3、改 1 推下次 alpha 窗口——beta.1 不考虑兼容性、推迟反而拉长尾；(C) 不动——命名违反约束持续。

理由：`NodeTextSchema` 改名零成本（升级时 import 改一行）；`TextBlockSchema` 与文件位置 / 未来复用语义对齐；`ctx → context` 顺手清缩写。

## 不在本 ADR 范围

- 其他可能存在的 `_xxx` 私有模块——本 ADR 仅扫当前两处 + ADR-03 新建的 `_transform.ts`（纯内部、不公开导出，前缀合理、保留）。

---

> **实现指针**：level `red`、⚠️ **BREAKING**（公开 schema 导出名 `NodeTextSchema` / `IRNodeText` → `TextBlockSchema` / `IRTextBlock`，下游需改 import；`_builder` 改名 / `ctx → context` 对外零影响）。changelog 需带迁移指引。真源以代码为准——`TextBlockSchema` / `IRTextBlock`（`core/src/ir/text.ts`，经 `core/src/index.ts` 导出，`NodeSchema.text` 内部引用同步改）、`react/src/kernel/{builder,unbuilder}.ts`、`renderPrim` 的 `context` 参数（render adapter）。守门靠既有测试全过 + `import { TextBlockSchema } from '@retikz/core'` 可用 / 旧名不再 export。完整原文（schema 改动表 / 文件 scope）见本文件 git 历史。

> 🔖 封板压缩 commit `ea674f3f`；压缩前完整施工蓝图 = `git show ea674f3f^:notes/decisions/core/v0/v0.1/beta.1/10-rename-cleanup.md`。

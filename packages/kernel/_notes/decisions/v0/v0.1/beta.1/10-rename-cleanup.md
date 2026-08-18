# ADR-10：改名 + 命名清理（`NodeTextSchema` → `TextBlockSchema`、`_builder` 去 `_` 前缀、`renderPrim` `ctx`→`context`）

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：

> **目标**：beta.1 阶段发现的 3 处命名不一致一并处理——schema 导出名 `NodeTextSchema`、内部模块 `_builder` / `_unbuilder` 的 `_` 前缀、`renderPrim` 的 `ctx` 缩写参数。beta.1 不考虑兼容性，三处一起做。

## 背景 / 约束

3 处命名不一致：

1. **`NodeTextSchema` / `IRNodeText`** —— 名带 "Node" 但实是通用文本块（已在 alpha.5 抽到 `ir/text.ts`），与文件位置 / 未来 StepLabel / NodeLabel / `<Text>` 复用语义不符。⚠️ **BREAKING**（schema 导出名，用户需调 import）。
2. **`_builder.ts` / `_unbuilder.ts`** —— `_` 前缀表"内部模块"，但 `buildIR` / `convertReactNodeToIR` 经 `index.ts` 公开导出，命名表意不一致。非破坏（文件名 rename，公开 import path 不变）。
3. **`renderPrim` 的 `ctx: RenderContext`** —— `ctx` 缩写与类型名不对齐、违反 AGENTS.md "不缩写"；但是位置参数名、TS 不约束调用方。非破坏。

## 决策：三处一并做（beta.1 不考虑兼容性）

- `NodeTextSchema` → `TextBlockSchema`、`IRNodeText` → `IRTextBlock`；**直接删除旧名、不留 deprecated alias**——用户从 alpha → beta 一次性改 import 一行。
- `renderPrim` 参数 `ctx` → `context`。

理由：`NodeTextSchema` 改名零成本（升级时 import 改一行）；`TextBlockSchema` 与文件位置 / 未来复用语义对齐；`ctx → context` 顺手清缩写。

## 长期边界

- 其他可能存在的 `_xxx` 私有模块——本 ADR 仅扫当前两处 + ADR-03 新建的 `_transform.ts`（纯内部、不公开导出，前缀合理、保留）。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：BREAKING\*\*（公开 schema 导出名 `NodeTextSchema` / `IRNodeText` → `TextBlockSchema` / `IRTextBlock`，下游需改 import；`_builder` 改名 / `ctx → context` 对外零影响）；其余默认行为、失败语义与公开契约以正文为准。

---
description: '节点文字并非专属节点结构；能被正文和标签共同使用的文字块称为 TextBlock'
keywords: 'NodeTextSchema、TextBlockSchema、builder、renderPrim、ctx、context、IRNodeText'
---

# ADR-017：改名 + 命名清理（`NodeTextSchema` → `TextBlockSchema`、`_builder` 去 `_` 前缀、`renderPrim` `ctx`→`context`）

- 状态：Accepted
- 决策日期：2026-05-13
- 参见：[kernel v0.5/081](../v0.5/081-shared-text-capabilities.md)

## 决策

节点文字并非专属节点结构；能被正文和标签共同使用的文字块称为 TextBlock。公开词汇随职责统一，不保留旧名别名。内部目录和局部参数的改名不构成额外契约。

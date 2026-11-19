---
description: '可选 TeX 包负责数学语法、排版和字形降解，最终输出基础图形；普通文字与节点布局不应依赖完整 TeX 引擎，renderer 也不解析公式'
keywords: 'retikz、tex'
---

# ADR-011：@retikz/tex 与公式降解能力

- 状态：Partially Superseded
- 决策日期：2026-06-16
- 关联：[ADR-012 带框公式](./012-node-embedded-math.md)、[ADR-013 行内混排](./013-inline-math-runs.md)
- 后续决策：[kernel v0.4/013](013-inline-math-runs.md)、[kernel v0.5/081](../v0.5/081-shared-text-capabilities.md)

## 保留的决策

可选 TeX 包负责数学语法、排版和字形降解，最终输出基础图形；普通文字与节点布局不应依赖完整 TeX 引擎，renderer 也不解析公式。

缺少公式 lowerer 与公式本身无效应分别报告。失败只影响相关公式片段，不能令同一节点中的普通文本或整幅图消失。

## 修订边界

早期在 Node 上接入公式是首个宿主，不是独立的节点数学协议；混排由共享行与片段承载。

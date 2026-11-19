---
description: '路径步骤的标签可以指定文字外观，不必继承线条的全部绘制属性'
keywords: 'StepLabel、textColor、opacity、font、label、StepLabelSchema'
---

# ADR-006：StepLabel 样式扩展（textColor / opacity / font + label 继承顺序）

- 状态：Partially Superseded
- 决策日期：2026-05-21
- 关联：[kernel v0 Roadmap](../roadmap.md)、[本 milestone ADR-005 Scope 样式继承](./005-scope-style-inheritance.md)
- 后续决策：[kernel v0.5/081](../v0.5/081-shared-text-capabilities.md)、[kernel v0.5/087](../v0.5/087-unified-label-text-block.md)

## 保留的决策

路径步骤的标签可以指定文字外观，不必继承线条的全部绘制属性。作者没有指定的文字字段才进入相应继承与默认计算。

## 修订边界

旧 StepLabel 专用文字结构和硬编码的渲染回退不再定义排版。内容、字体与文字透明度走共享文本契约，位置和附着仍由路径决定。

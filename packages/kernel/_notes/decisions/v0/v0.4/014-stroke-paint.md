---
description: 'stroke 与 fill 一样可以是基础颜色或结构化 paint'
keywords: 'stroke、paint'
---

# ADR-014：stroke paint 支持

- 状态：Partially Superseded
- 决策日期：2026-06-23
- 关联：[core Paint 基础](../v0.2/019-paint-basics.md)
- 后续决策：[kernel v0.5/085](../v0.5/085-scene-resources.md)

## 保留的决策

stroke 与 fill 一样可以是基础颜色或结构化 paint。相同绘制资源不应因用于描边而被定义第二次，纯色也不必强制提升为资源。

## 修订边界

旧文的 Scene.resources 去重表不再是混合列表；paint 引用在分类资源容器中解析。

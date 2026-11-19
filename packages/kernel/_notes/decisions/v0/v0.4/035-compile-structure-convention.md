---
description: 'Node、Path、Text 等原子阶段按领域组织，几何与绘制语义归其所有者；名字和目录不应让调用者依赖某个驱动的临时中间态'
keywords: 'Compile、Structure、Convention、resolve、normalize、lower、layout'
---

# ADR-035: Compile Structure Convention

- 状态：Partially Superseded
- 决策日期：2026-07-06
- 关联：[ADR-021](./021-path-kind-registry.md)、[ADR-033](./033-builtin-path-generator-ribbon-profile.md)
- 后续决策：[kernel v0.5/080](../v0.5/080-unified-reconciler-compilation.md)、[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 保留的决策

Node、Path、Text 等原子阶段按领域组织，几何与绘制语义归其所有者；名字和目录不应让调用者依赖某个驱动的临时中间态。

## 修订边界

旧文将全局遍历和 orchestration 置于 Core。现由 Reconciler 执行完整遍历或增量调度，两条驱动共享原子能力，不互相调用来维持一致性。

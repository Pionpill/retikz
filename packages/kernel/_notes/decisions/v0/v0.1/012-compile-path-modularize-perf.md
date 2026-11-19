---
description: '构造路径时依次推进游标，复用最近一次有效绘制的位置，不为每个步骤从头寻找前驱'
keywords: 'compile、path、findPrev、THICKNESS、WIDTH、enum、emitPathPrimitive、lastDrawnIdx'
---

# ADR-012：`compile/path.ts` 拆目录 + `findPrev` O(n²)→O(n) + `THICKNESS_TO_WIDTH` 与 enum 互锁

- 状态：Accepted
- 决策日期：2026-05-13
- 关联：[ADR-004 PathPrim 结构化](./004-scene-primitive-structured.md)
- 参见：[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 决策

构造路径时依次推进游标，复用最近一次有效绘制的位置，不为每个步骤从头寻找前驱。未提供新端点的步骤不能冒充最近的显式目标。这样既保留位置语义，也避免长路径的二次扫描。厚度词汇与线宽表须相互完备，不能因增加枚举项留下没有宽度的值。

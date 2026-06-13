# ADR-05：`compile/path.ts` 拆目录 + `findPrev` O(n²)→O(n) + `THICKNESS_TO_WIDTH` 与 enum 互锁

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-11](./roadmap.md) · [alpha.5 ADR-01 PathPrim 结构化](../alpha.5/01-scene-primitive-structured.md)

> **范围**：把多轮扩张后近 900 行的单文件 `compile/path.ts` 拆成 `compile/path/` 子目录、修 `findPrev` 的 O(n²)、把 `THICKNESS_TO_WIDTH` 与 thickness enum 类型互锁。三者是一组高内聚改动，用户视角编译输出完全等价。

## 背景 / 约束

- `compile/path.ts` 单文件混 8 类职责（relative target 解析 / step 主循环 / emit helpers / arrow shrink / label emit / sub-path split / anchor lookup / cycle 判定），`emitPathPrimitive` 单函数近 500 行，维护困难。
- `findPrev(i)` 在主循环里每步反向扫一遍 anchors 数组——n 步 path 全程 O(n²)；典型流程图 50+ step 时已成可观察 hotspot，alpha.5 PathPrim 结构化后这个循环走得更频繁。
- `THICKNESS_TO_WIDTH` 的 `Record<NonNullable<IRPath['thickness']>, number>` 与 thickness enum 字面重复——新增档位时漏写哪一边 TS 不抓（"字段表漂移"主题之一，本 ADR 只处理 THICKNESS，其余字段表互锁见 ADR-06）。

## 决策：拆子目录 + findPrev 单调指针 + THICKNESS 类型互锁

被否决的备选：(B) 仅修 findPrev 不拆文件——近 900 行单文件依然难维护；(C) 仅拆文件不动 findPrev——性能 hotspot 是用户可观察问题（大 path 慢），值得一并修。三者一组改、分散到 3 个 ADR 反而难 review。

`findPrev` 改单调指针：主循环维护 `lastDrawnIdx` / `lastDrawnAnchor` 单调推进（有 to 字段的 step 绘制后更新；cycle / arc / circle / ellipse 等无 to 的 step 不更新），findPrev 直接读这两变量、O(1)。

THICKNESS 互锁（字面即决策）：`as const satisfies Record<NonNullable<IRPath['thickness']>, number>` + 一条 `AssertEqual<keyof typeof THICKNESS_TO_WIDTH, NonNullable<IRPath['thickness']>>` 完备性检查——加档位漏写哪边 TS 都报错。

### 决策细节

- **`compile/path.ts` 不保留 re-export、直接拆**（beta.1 不考虑兼容性）——内部 import 改指 `compile/path/index.ts` 或子文件；公开 API 走 barrel `@retikz/core` 不变。
- **`THICKNESS_TO_WIDTH` 是内部 helper、不公开 export**。

## 不在本 ADR 范围

- builder / unbuilder 字段表化（TODO-12）→ ADR-06。
- `_builder.ts` cast 收敛（TODO-13）→ ADR-07。
- arrow marker `stableSpecKey` 字段表（TODO-17）→ 并入 ADR-06。

---

> **实现指针**：level `red`（动整个 path 编译器组织 + algorithm + 类型层），非 breaking（零行为 / 零 IR / 零公开 API 变化）。真源以代码为准——拆出的 `core/src/compile/path/` 子目录（`index.ts` 主循环入口 + `relative` / `shrink` / `split` / `label` / `anchor` 子文件），`findPrev` 单调指针在 `path/index.ts`，`THICKNESS_TO_WIDTH` 互锁基准 `IRPath['thickness']`（`core/src/ir/path/path.ts`）。e2e snapshot + algorithm 等价性 + 类型互锁测试见 `core/tests/compile/`。完整原文（8 职责分解 / findPrev 代码 / 测试象限 / 重构 commit 顺序）见本文件 git 历史。

> 🔖 封板压缩 commit `ea674f3f`；压缩前完整施工蓝图 = `git show ea674f3f^:notes/decisions/core/v0/v0.1/beta.1/05-compile-path-modularize-perf.md`。

# ADR-05：`compile/path.ts` 拆目录 + `findPrev` O(n²)→O(n) + `THICKNESS_TO_WIDTH` 与 enum 互锁

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-11](../../../plans/v0/v0.1-beta.1.md) · [alpha.5 ADR-01 PathPrim 结构化](../v0.1-alpha.5/01-scene-primitive-structured.md)

## 背景

`packages/core/src/compile/path.ts` 经过 alpha.3 → alpha.5 多轮扩张，当前 **879 行单文件**；其中 `emitPathPrimitive` 单函数 **489 行**，混 8 类职责：

1. relative target 解析（`normalizeRelativeTargets`，323-385）
2. step iteration 主循环（571-725）
3. emit helpers（`emitMove` / `emitLine` / `emitQuad` / ... 477-569）
4. arrow shrink + endpoint shift（748-836）
5. label emit（`emitLabelPrimitive`，229-318）
6. sub-path split for markers（839-878）
7. anchor lookup helpers（`refPointOfTarget` / `clipForTarget`，119-178）
8. cycle close 判定（582-591）

`findPrev(i)` 在主循环里**每步反向扫一遍 anchors 数组**——n 步 path 全程 **O(n²)**。典型流程图 50+ step 时已成可观察 hotspot；alpha.5 PathPrim 结构化后这个循环被走得更频繁（每步都要 findPrev）。

`compile/path.ts:194` 的 `THICKNESS_TO_WIDTH: Record<NonNullable<IRPath['thickness']>, number>` 与 `ir/path/path.ts:60-68` 的 `thickness` enum 字面重复——新增 `extraThick` 之类的档位时漏写哪一边 TS 不抓。这是 TODO-11 / TODO-12 / TODO-17 共享的"字段表漂移"主题之一（本 ADR 只处理 THICKNESS，其他字段表互锁见 ADR-06）。

## 选项

### A. 拆 `compile/path/` 子目录 + findPrev 单调指针 + THICKNESS 类型互锁（**推荐**）

```
compile/
├── path.ts                 ← deprecated（保留 1 行 re-export），后续删
└── path/                   ← 新建子目录
    ├── index.ts            ← emitPathPrimitive 入口，主循环
    ├── relative.ts         ← normalizeRelativeTargets
    ├── shrink.ts           ← arrow shrink + endpointOf + setEndpoint
    ├── split.ts            ← sub-path split for markers
    ├── label.ts            ← emitLabelPrimitive
    └── anchor.ts           ← refPointOfTarget + clipForTarget + samePoint + cornerOf
```

`findPrev` 改为单调指针：

```ts
// 旧 O(n²)
const findPrev = (i: number) => {
  for (let j = i - 1; j >= 0; j--) { ... }  // 每步 O(i)
};

// 新 O(n)
let lastDrawnIdx = -1;
let lastDrawnAnchor: IRPosition | null = null;
for (let i = 0; i < steps.length; i++) {
  // 主循环中维护 lastDrawnIdx / lastDrawnAnchor 单调推进
  // findPrev 直接读这两个变量，O(1)
}
```

`THICKNESS_TO_WIDTH` 与 enum 互锁：

```ts
// 旧
const THICKNESS_TO_WIDTH: Record<NonNullable<IRPath['thickness']>, number> = { ... };

// 新（满足 satisfies + AssertEqual 双约束）
const THICKNESS_TO_WIDTH = {
  ultraThin: 0.25, veryThin: 0.5, thin: 1, semithick: 1.5,
  thick: 2, veryThick: 3, ultraThick: 4,
} as const satisfies Record<NonNullable<IRPath['thickness']>, number>;

// 类型互锁完备性：
type _ThicknessCheck = AssertEqual<
  keyof typeof THICKNESS_TO_WIDTH,
  NonNullable<IRPath['thickness']>
>;
```

加 thickness 档位时漏写哪边 TS 报错。

### B. 仅 findPrev O(n²) → O(n)，不拆文件

工作量小、风险低，但 879 行单文件依然难维护。

### C. 仅拆文件，不动 findPrev

收益不全——性能 hotspot 是用户可观察的问题（大 path 慢），值得一并修。

## 决策：A

理由：
1. 879 行单文件已经维护困难；拆 5 子文件每个 ~100-200 行，单一职责
2. findPrev O(n²) 对大 path 是真实性能问题，algorithmic 改进而非微优化
3. THICKNESS 类型互锁防字段表漂移（同 TODO-12 / TODO-17 一类做法，本 ADR 一并解决）
4. 拆目录 + algorithmic 改 + 类型互锁是一组高内聚改动，分散到 3 个 ADR 反而难 review

## 待决策点

- **`path.ts` 是否保留 re-export**：保留 1 行 `export * from './path/index'`，确保 import path `compile/path` 仍可用；后续 alpha.6 / beta.2 时再删
- **`findPrev` 实现细节**：用单调指针 `lastDrawnIdx` 维护；初始 `-1`，每次有 to 字段的 step 绘制后更新；cycle / arc / circle / ellipse 等无 to 的 step 不更新
- **e2e snapshot 守门**：本 ADR 实施前**必须先加** core/tests 的 IR→Scene 全 snapshot test（至少 10 个典型流程图 / UML / 曲线场景），锁住 commands 数组输出 + arrow shrink 数值，再做拆分。这是防止重构期间静默回归的关键
- **拆目录 vs 性能优化 vs 类型互锁 commit 顺序**：建议三连小 commit，每 commit 跑全测——单 commit 一次拆 5 文件 + 改 algorithm + 改类型，review 太重

## DSL 表面

无变化（用户视角 path 编译输出完全等价）。

## 测试设计

**新增 e2e snapshot 守门**（重构前先加）：

`packages/core/tests/compile/path-e2e-snapshot.test.ts`（新建）—— 10+ 个典型场景：
- 直线 2 step / 多 step
- fold `-|` / `|-` 单 / 多段
- cycle 闭合
- curve / cubic / bend 曲线
- arc 弧 + circlePath / ellipsePath
- 含 arrow start / end / 起末
- 多 sub-path（marker split）
- label 各 step kind

每场景断言完整 `commands` 数组深 equal。重构每个 commit 跑此守门。

**性能 micro-benchmark**（可选 / 不进 CI）：
- `packages/core/tests/compile/path-perf.bench.ts`（可选）—— 100 step path 编译耗时对比，证明 O(n²) → O(n) 实际收益；不进 vitest 全跑、只在重构期间手动跑

## 影响

- **代码组织**：1 文件 → 5 子文件 + 1 re-export
- **性能**：大 path（50+ step）编译时间显著下降；小 path（< 10 step）无可观察变化
- **公开 API**：无（`compile/path` import path 通过 re-export 保留）
- **类型层**：新增 `AssertEqual` 互锁，新加 thickness 档位 TS 强制提示

## 不在本 ADR 范围

- builder/unbuilder 字段表化（TODO-12）——独立 ADR-06
- `_builder.ts` cast 收敛（TODO-13）——独立 ADR-07
- arrow marker `stableSpecKey` 字段表（TODO-17）——并入 ADR-06

---

## 实现契约

### Level

`red`（动 `packages/core/src/compile/path.ts` —— 但仅内部组织 / algorithm / 类型层，零行为 / 零 IR / 零公开 API 变化）

### Schema 改动

无 zod schema 改动。`THICKNESS_TO_WIDTH` 是内部 helper、不公开 export。

### 文件 scope

- `packages/core/src/compile/path.ts`（改为 re-export shim 1 行）
- `packages/core/src/compile/path/index.ts`（新建）
- `packages/core/src/compile/path/relative.ts`（新建）
- `packages/core/src/compile/path/shrink.ts`（新建）
- `packages/core/src/compile/path/split.ts`（新建）
- `packages/core/src/compile/path/label.ts`（新建）
- `packages/core/src/compile/path/anchor.ts`（新建）
- `packages/core/tests/compile/path-e2e-snapshot.test.ts`（新建——守门）

### 测试象限

**守门 e2e snapshot（≥ 10）**：
- 见"测试设计"段 10 种 path 形态各 1 snapshot

**Algorithm 等价性（≥ 3）**：
- `findPrev` 大 path 行为等价（50 step 链）：单调指针实现 vs 旧 O(n²) 实现产出 `commands` 数组深 equal
- `findPrev` 含跳过 step kind（move / cycle / arc）的 path：正确跳过、正确推进 lastDrawnIdx
- `findPrev` 首步 cycle / arc（无前驱）：正确返回 null 不 crash

**类型互锁（1）**：
- 新加 thickness 档位 漏写 `THICKNESS_TO_WIDTH` 时 TS 报错（type-level assertion 测试）

**既有 833 测试**：全过

### 依赖的现有元素

- `compile/path.ts` 现有逻辑 —— **修改**：拆 5 文件
- `ir/path/path.ts` `IRPath['thickness']` enum —— **引用**：作 THICKNESS_TO_WIDTH 类型互锁基准
- `compile/text-metrics.ts` `TextMeasurer` —— **引用**：label.ts 依赖
- `geometry/{bend,arc,segment}.ts` —— **引用**：曲线 / 弧 / sample 工具

# ADR-03: endpoint arrow split 命名中性化

- 状态：Accepted
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-3](./roadmap.md) · [beta.1 ADR-01 renderer-neutral core](../v0.1-beta.1/01-core-comments-renderer-neutral.md)

## 背景

`packages/core/src/compile/path/split.ts` 当前 helper 名为 `splitSubPathsForMarkers`，注释也以 SVG marker 的行为解释多 sub-path + arrow 的拆分策略。

实际语义不是“core 需要 SVG marker”，而是“端点箭头只属于整条 path 的首端和末端”。当一条 `PathPrim` 内含多个 sub-path 时，如果把箭头挂到每个 sub-path 上，视觉上会在中间断点产生多余箭头。SVG marker 只是 React/SVG renderer 的实现方式；Canvas / PDF / Skia renderer 也会面对同一个端点箭头语义。

## 选项

### A. 改名为 `splitSubPathsForEndpointArrows`（推荐）

把 helper 命名和注释改成 endpoint arrows / path endpoints 语义，不再把 SVG marker 写进 core 语义层。

### B. 保持 `splitSubPathsForMarkers`

实现成本为零，但会继续让 core compile 层看起来依赖 SVG marker 模型。

## 决策：A

理由：

1. beta.2 正在收敛 core 的 renderer-neutral 边界，当前命名和注释属于同一类泄漏。
2. 改动是 internal 级别，不改变 IR / Scene 结构和运行时结果。
3. 新命名更准确：core 输出的是 `arrowStart` / `arrowEnd` 端点箭头规格，不是 renderer marker。

## 决策细节

- `splitSubPathsForMarkers` 改名为 `splitSubPathsForEndpointArrows`。
- `PathBaseProps` 可保留；如果实现中出现更合适命名，可同步改为 endpoint arrow 语义。
- 注释改成“多 sub-path + 有端点箭头时，仅首段保留 `arrowStart`，末段保留 `arrowEnd`”。
- 测试标题不再写 SVG marker；只断言首末端箭头归属。
- React/SVG renderer 仍可继续把 `arrowStart` / `arrowEnd` 翻译成 SVG marker。

## 影响

- **公开 API**：无。
- **运行时行为**：不变。
- **测试**：只允许跟随命名调整 import / 标题，不弱化断言。

## 实现契约

### Level

`internal`。只改 core 内部 helper 命名和注释。

### 文件 scope

- `packages/core/src/compile/path/split.ts`
- `packages/core/src/compile/path/index.ts`
- `packages/core/tests/compile/path.test.ts`
- `packages/core/tests/compile/path-primitive-adversarial.test.ts`

### 测试象限

1. 单 sub-path + 无 arrow：仍输出单个 `PathPrim`。
2. 单 sub-path + end arrow：仍输出单个 `PathPrim` 且只有 `arrowEnd`。
3. 单 sub-path + both arrows：仍输出单个 `PathPrim` 且有 `arrowStart` / `arrowEnd`。
4. 多 sub-path + no arrow：仍输出单个 `PathPrim`。
5. 多 sub-path + end arrow：输出 `GroupPrim`，只有末段带 `arrowEnd`。
6. 多 sub-path + start arrow：输出 `GroupPrim`，只有首段带 `arrowStart`。
7. 多 sub-path + both arrows：首段带 `arrowStart`，末段带 `arrowEnd`，中间段无箭头。
8. 子路径顺序与 commands slice 不变。
9. `baseProps` 的 stroke / fill / opacity 等视觉字段在每段保持一致。

## 多 LLM 评估关注点

- 是否只做命名 / 注释收敛，没有改变拆分行为。
- 是否还在 core 注释或测试标题里把 SVG marker 当成 core 语义。
- 是否影响 React renderer 的 marker id / marker dedup 行为。

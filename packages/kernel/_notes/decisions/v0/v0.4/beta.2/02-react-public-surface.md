# ADR-02：React 包根公共面收口

- 状态：Accepted
- 决策日期：2026-07-11
- 验收日期：2026-07-14
- 实现提交：`27695cbe`
- 关联：[beta.2 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [renderer repackage](../../v0.3/alpha.1/05-renderer-repackage.md) · [`@retikz/react` AGENTS](../../../../../react/AGENTS.md)

## 背景

实施前，`@retikz/react` 的 `src/index.ts` 依次聚合 `kernel`、`render`、`sugar`。其中 Kernel / Sugar 是作者直接使用的 JSX 与互操作 API；`render` 下的 Canvas host、SVG React binding、defs wrapper 和 browser measurer 则只服务于 `<Layout>` 的内部宿主接线。

因为 `render/index.ts` 继续聚合 `canvas`、`svg`、`text`，这些内部能力与为测试保留的 `@retikz/render/svg` 转发也被带到 npm 包根，形成了没有文档契约却受 semver 约束的 accidental exports。根入口本身使用 `export *` 没有问题，问题是把非公共 owner 纳入了向上聚合链。

## 决策

`@retikz/react` 包根只聚合公开的 `kernel` 与 `sugar` 一级 owner：

```ts
export * from './kernel';
export * from './sugar';
```

`render` 定位为包内实现分组，不进入包根公共面。`kernel/runtime/Layout.tsx` 需要宿主能力时，分别从带独立 barrel 的二级 owner 导入：

```ts
import { CanvasHost } from '../../render/canvas';
import { svgToReact } from '../../render/svg';
import { browserMeasurer } from '../../render/text';
```

`render/canvas`、`render/svg`、`render/text` 的 `index.ts` 继续默认使用 `export *`，供包内跨 owner 消费和就近测试使用；它们不是 package.json exports 暴露的 npm 子路径。

## 公共面变化

以下符号从 `@retikz/react` 包根移除：

- Canvas：`CanvasHost`、`CanvasHostProps`。
- SVG React binding：`ArrowMarker`、`ArrowMarkerProps`、`ClipDefs`、`PaintDefs`、`renderPrim`、`RenderContext`、`svgToReact`。
- 文本测量：`browserDefaultFontFamily`、`browserMeasurer`。
- renderer-neutral 兼容转发：`buildPathD`、`buildTransform`、`formatViewBox`。

Kernel、Sugar、extension contract、Props 与 `<Layout>` 的 SVG / Canvas 行为保持不变。

## 迁移

| 原导入                                                                 | 迁移方式                                                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `buildPathD` / `buildTransform` / `formatViewBox` from `@retikz/react` | 改从 `@retikz/render/svg` 导入。                                                                |
| `CanvasHost` / defs wrapper / `renderPrim` / `svgToReact`              | 不提供 React 公共替代；应用继续使用 `<Layout renderer="svg"｜"canvas">`。                       |
| `browserMeasurer` / `browserDefaultFontFamily`                         | 不提供 React 公共替代；自定义编译入口显式提供自己的 `TextMeasurer`，或使用 core fallback。      |
| 自定义 renderer                                                        | 消费 `@retikz/render` 的 framework-neutral Scene renderer API，不依赖 React adapter internals。 |

0.x beta 阶段不保留兼容别名或 deprecated bridge。

## 测试归属

- 新增 React 包根 public API 守卫：稳定 Kernel / Sugar runtime export 继续存在，renderer internals 不存在。
- `renderPrim`、defs、`svgToReact`、CanvasHost、browser measurer 的测试保留在 React 包，并从对应二级 owner barrel 导入。
- `buildPathD`、`buildTransform`、`formatViewBox` 的测试迁到 `@retikz/render`，删除 React 内只为测试保留的转发文件。
- React `Layout` 的公开 API、SVG / Canvas 与 renderer context 测试继续作为行为等价守卫。

## 最终实现

- React 包根只聚合 `kernel` 与 `sugar`；`render` 保持包内实现 owner，不再向 npm 根入口传递内部能力。
- `<Layout>` 从 `render/canvas`、`render/svg`、`render/text` 二级 owner barrel 消费宿主能力。
- `buildPathD`、`buildTransform`、`formatViewBox` 的公共归属统一到 `@retikz/render/svg`，对应测试迁回 render。
- React public API 守卫固定保留的 Kernel / Sugar 入口，并明确断言 renderer internals 不存在。

## 验证

2026-07-14 在 `next` release 基线上复核：

- `pnpm run check:kernel` 通过，覆盖六个 kernel 包的 ESLint 与 `tsc --noEmit`。
- `@retikz/render` 全量测试通过：45 files / 374 tests。
- React public API、unbuilder、Layout runtime 与动画宿主定向回归通过：5 files / 89 tests。
- 源码与产物入口不再存在 `export * from './render'`、`require` 条件或 renderer-neutral React 转发。

主 agent 对 ADR、changelog、README、双语 docs、实现与测试做 Contract Auditor，未发现 BLOCKING 偏差。

## 遗留边界

- React 的 Canvas host、SVG binding、defs wrapper 与 browser measurer 仍可在包内按 owner 复用，但不承诺 npm 子路径。
- 若未来开放 React 专属 renderer 扩展面，需要单独设计稳定子路径，不能重新从包根透出内部实现。

# @retikz/core

Framework-agnostic core of [retikz](https://pionpill.github.io/retikz/) — a TikZ-inspired diagramming library. Provides the zod-typed **IR**, atomic resolution, layout, and emission stages, geometry helpers, and the provider registries used by core compilation. Runtime dependencies are `@retikz/foundation`, `@retikz/math`, and `zod`; IR remains 100% JSON-serializable.

零框架核心：retikz 的中间表示（IR）、原子解析、布局与图元生成阶段、几何工具与 core 编译期 provider 注册面。**零 React、零 DOM**，运行时依赖为 `@retikz/foundation`、`@retikz/math` 与 `zod`，IR 100% 可 JSON 序列化。

## Install

```bash
pnpm add @retikz/core @retikz/reconciler
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

## Usage

`@retikz/core` is renderer-agnostic: it supplies drawing contracts and atomic compilation products. `@retikz/reconciler` assembles these into a serializable `Scene` and typed artifacts. A backend (`@retikz/render`) or runtime (`@retikz/react` / `@retikz/vanilla`) then renders the Scene.

```ts
import { compileToScene } from '@retikz/reconciler';

const { scene, artifacts } = compileToScene(ir);
// optional: compileToScene(ir, { measureText, shapes, arrows, clips, paths, padding, ... })
// hand `scene` to @retikz/render/svg, @retikz/render/canvas, or a runtime
// inspect `artifacts` when composite definitions or node layout collection publish compile DTOs
```

Most users consume core indirectly through [`@retikz/react`](https://www.npmjs.com/package/@retikz/react) or [`@retikz/vanilla`](https://www.npmjs.com/package/@retikz/vanilla). Use core directly when you build IR programmatically, persist/transport scenes, or write a custom renderer.

## Exports

- Atomic stages: `resolveNode`, `compileNode`, `projectNodeGeometry`, `resolveCoordinate`, `compileCoordinate`, `compilePath`, and `compileScope`
- Complete `compileToScene` / `compileSceneSnapshot` APIs and result types are exported by `@retikz/reconciler`
- `computeLayoutFromBounds` — axis-aligned bounds → `BoundsRect`; `fallbackMeasurer` — dependency-free default `TextMeasurer`
- Layout-aware composite authoring — `layoutChild(child, proposal)` evaluates two-axis `minimum` / `natural` / `range` / `exact` proposals and returns a resolved `slotSize`, real allocation / visual bounds, alignment guides, or an isolated failure; `context.replay()` / `context.raise()` select one callback-local transaction without adding runtime handles to IR or Scene
- IR & `Scene` zod schemas + inferred types
- Authoring parsers `parseWay` / `parseNodeTarget` / `parseTargetSugar` are provided by `@retikz/vanilla`; Core consumes their structured IR output
- `point` / `rect` / `circle` / `ellipse` / `diamond` / `polar` — geometry
- Provider registries and definition helpers for `shapes`, `boundaries`, `clips`, `arrows`, `patterns`, `pathGenerators`, `paths`, and `composites`
- Built-in provider collections such as `BUILTIN_SHAPES`, `BUILTIN_BOUNDARIES`, `BUILTIN_CLIPS`, `BUILTIN_ARROWS`, `BUILTIN_PATTERNS`, `BUILTIN_PATH_GENERATORS`, and `BUILTIN_PATHS`; optional kinds such as Ribbon come from `@retikz/extension` and are injected through `paths` or a provider contribution

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT

# @retikz/core

Framework-agnostic core of [retikz](https://pionpill.github.io/retikz/) — a TikZ-inspired diagramming library. Provides the zod-typed **IR**, the **`compileToScene`** compiler, pure **parsers**, geometry helpers, and the provider registries used by core compilation.

零框架核心：retikz 的中间表示（IR）、`compileToScene` 编译器、纯解析器、几何工具与 core 编译期 provider 注册面。**零 React、零 DOM**，运行时依赖只有 `zod` 与 `@retikz/math`，IR 100% 可 JSON 序列化。

## Install

```bash
pnpm add @retikz/core
```

## Usage

`@retikz/core` is renderer-agnostic: it turns an IR into a serializable `Scene`. A backend (`@retikz/render`) or runtime (`@retikz/react` / `@retikz/vanilla`) then renders that Scene.

```ts
import { compileToScene } from '@retikz/core';

const scene = compileToScene(ir);
// optional: compileToScene(ir, { measureText, shapes, arrows, clips, pathKinds, padding, ... })
// hand `scene` to @retikz/render/svg, @retikz/render/canvas, or a runtime
```

Most users consume core indirectly through [`@retikz/react`](https://www.npmjs.com/package/@retikz/react) or [`@retikz/vanilla`](https://www.npmjs.com/package/@retikz/vanilla). Use core directly when you build IR programmatically, persist/transport scenes, or write a custom renderer.

## Exports

- `compileToScene` / `computeLayout` / `fallbackMeasurer` — IR → `Scene`
- `lowerIRToKernel` — Tier 2 composite IR → JSON-serializable Tier 1 Kernel IR; accepts `composites` and `maxCompositeDepth`
- IR & `Scene` zod schemas + inferred types
- `parseWay` / `parseNodeTarget` / `parseTargetSugar` — pure parsers
- `point` / `rect` / `circle` / `ellipse` / `diamond` / `polar` — geometry
- Provider registries and definition helpers for `shapes`, `boundaries`, `clips`, `arrows`, `patterns`, `pathGenerators`, `pathKinds`, `ribbonWidthProfiles`, and `composites`
- Built-in provider collections such as `BUILTIN_SHAPES`, `BUILTIN_BOUNDARIES`, `BUILTIN_CLIPS`, `BUILTIN_ARROWS`, `BUILTIN_PATTERNS`, `BUILTIN_PATH_GENERATORS`, `BUILTIN_PATH_KINDS`, and `BUILTIN_RIBBON_WIDTH_PROFILES`

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT

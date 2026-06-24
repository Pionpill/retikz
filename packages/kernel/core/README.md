# @retikz/core

Framework-agnostic core of [retikz](https://pionpill.github.io/retikz/) — a TikZ-inspired diagramming library. Provides the zod-typed **IR**, the **`compileToScene`** compiler, pure **parsers**, geometry helpers, and the shape / arrow / pattern / path-generator registries.

零框架核心：retikz 的中间表示（IR）、`compileToScene` 编译器、纯解析器、几何工具与形状 / 箭头 / 图案 / 路径生成器注册面。**零 React、零 DOM**，运行时依赖只有 `zod`，IR 100% 可 JSON 序列化。

## Install

```bash
pnpm add @retikz/core
```

## Usage

`@retikz/core` is renderer-agnostic: it turns an IR into a serializable `Scene`. A backend (`@retikz/render`) or runtime (`@retikz/react` / `@retikz/vanilla`) then renders that Scene.

```ts
import { compileToScene } from '@retikz/core';

const scene = compileToScene(ir);
// optional: compileToScene(ir, { measureText, shapes, arrows, padding, ... })
// hand `scene` to @retikz/render/svg, @retikz/render/canvas, or a runtime
```

Most users consume core indirectly through [`@retikz/react`](https://www.npmjs.com/package/@retikz/react) or [`@retikz/vanilla`](https://www.npmjs.com/package/@retikz/vanilla). Use core directly when you build IR programmatically, persist/transport scenes, or write a custom renderer.

## Exports

- `compileToScene` / `computeLayout` / `fallbackMeasurer` — IR → `Scene`
- IR & `Scene` zod schemas + inferred types
- `parseWay` / `parseNodeTarget` / `parseTargetSugar` — pure parsers
- `point` / `rect` / `circle` / `ellipse` / `diamond` / `polar` — geometry
- `BUILTIN_SHAPES` / `BUILTIN_ARROWS` / `BUILTIN_PATTERNS` + `ShapeDefinition` / `ArrowDefinition` / `PatternDefinition` / `definePathGenerator` — registries

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT

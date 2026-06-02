# retikz

[English](./README.md) | [简体中文](./README.zh.md)

> retikz is an AI-native, IR-first diagram primitive library. Today it ships a React API, inspired by TikZ.

[![npm version](https://img.shields.io/npm/v/@retikz/react?label=npm)](https://www.npmjs.com/package/@retikz/react)
[![license](https://img.shields.io/npm/l/@retikz/react)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-online-2563eb)](https://pionpill.github.io/retikz/)
[![react](https://img.shields.io/badge/react-%3E%3D18-149eca)](https://react.dev/)
[![package size](https://img.shields.io/bundlephobia/minzip/@retikz/react?label=minzip)](https://bundlephobia.com/package/@retikz/react)

retikz is built around a durable JSON IR, not around any single UI framework. The React package is the API we provide today, while plain JavaScript, Vue, Svelte, or other runtimes can integrate by producing the same IR or by building thin adapters on top of `@retikz/core`.

It is not another chart template library. Think of it as a drawing foundation for relationship diagrams, technical explanations, geometric sketches, annotated figures, and AI-generated or AI-edited diagrams.

## Why retikz?

<p align="center">
  <img src="./assets/readme/ir-centered.svg" alt="IR-centered retikz architecture" />
</p>

retikz's architecture starts with one durable drawing contract: Sugar JSX, Kernel JSX, future text DSLs, plain JavaScript objects, Vue or other framework adapters, and AI output can all converge into the same JSON IR before rendering.

- **IR is the core product**: persist diagrams, validate them with schema, replay them later, and render them through any compatible adapter.
- **AI-friendly by design**: LLMs can generate schema-constrained JSON IR or patch existing diagrams without writing brittle JSX strings.
- **React API today, framework-neutral core underneath**: `@retikz/react` is the current official authoring API; `@retikz/core` has no React or DOM dependency.
- **TikZ-inspired vocabulary**: use proven ideas like nodes, paths, anchors, and scopes without needing to know LaTeX or TikZ first.

## AI-friendly by design

AI friendliness is not an add-on. It is the reason the IR exists.

| Design choice | Why it matters |
| --- | --- |
| JSON-only IR | Models can emit structured data instead of source code text |
| Schema-backed fields | Runtime validation catches invalid diagrams early |
| Patchable document shape | AI can edit a small part of a diagram without rewriting the whole figure |
| Framework-neutral contract | Human JSX, native JS objects, future Vue adapters, and AI output can share one drawing format |

## See it in action

### Karl's unit circle

This example shows the TikZ-like primitive layer: grid, axes, anchors, labels, arrows, sectors, and paths are composed directly into a precise mathematical figure.

<p align="center">
  <img src="./assets/readme/karl-circle.svg" alt="Karl's unit circle example" />
</p>

Example: [Karl's Unit Circle](https://pionpill.github.io/retikz/core/examples/karl-circle) · [source](./apps/docs/src/contents/core/examples/karl-circle/karl-circle-07-info.en.demo.tsx)

### Ohm's law circuit

This example shows the encapsulation path for product and business diagrams: custom circuit symbols are packaged as reusable components, then duplicated and positioned with `Scope`.

<p align="center">
  <img src="./assets/readme/ohms-law-circuit.svg" alt="Ohm's law circuit example" />
</p>

Example: [Ohm's Law Circuit](https://pionpill.github.io/retikz/core/examples/ohms-law-circuit) · [source](./apps/docs/src/contents/core/examples/ohms-law-circuit/ohms-law-circuit-06-labels.en.demo.tsx)

## Quick start

Install the current official React adapter and React peer dependencies:

```bash
pnpm add @retikz/react react react-dom
```

Draw a small named-node diagram:

```tsx
import { Draw, Layout, Node } from '@retikz/react';

export const Example = () => (
  <Layout width={420} height={120}>
    <Node id="idea" position={[0, 0]}>
      Idea
    </Node>
    <Node id="ir" position={[110, 0]}>
      JSON IR
    </Node>
    <Node id="svg" position={[230, 0]}>
      SVG
    </Node>

    <Draw way={['idea', 'ir', 'svg']} arrow="->" />
  </Layout>
);
```

Open the [Quick Start](https://pionpill.github.io/retikz/core/get-start) to build the same idea step by step, or jump into the [examples](https://pionpill.github.io/retikz/core/examples/karl-circle).

Prefer not to author with React? The stable boundary is the IR. You can create JSON IR directly with plain JavaScript or build another framework adapter that emits the same IR, then compile it with `@retikz/core`. The maintained high-level component API is React for now.

## What you can draw today

retikz v0.2 focuses on general diagram primitives:

| Capability | What it gives you |
| --- | --- |
| Named nodes and coordinates | Stable references for later paths and edits |
| Paths, steps, arrows, and edge labels | Relationship lines that attach to anchors instead of raw text centers |
| Scopes and transforms | Grouping, local movement, rotation, scale, and inherited style |
| Shapes, fills, and registries | Built-in shapes plus extensible shapes, arrows, patterns, and path generators |
| JSON IR and Scene output | A portable contract for persistence, AI editing, and future renderers |

For data-driven charts, flow layout, codecs, and additional render targets, see the [roadmap](https://pionpill.github.io/retikz/about/releases/roadmap).

## Architecture

```text
React JSX / plain JS objects / future DSL / AI JSON
  -> retikz IR
  -> compileToScene()
  -> Scene primitives
  -> React + SVG today, more adapters later
```

The important design choice is that React JSX is only one input format. Once a diagram becomes IR, the same data can be saved, validated, patched by an LLM, compiled, and rendered by any compatible adapter.

| Integration path | Status |
| --- | --- |
| React components via `@retikz/react` | Official API today |
| Plain JavaScript or TypeScript IR objects | Supported at the `@retikz/core` boundary |
| Vue / Svelte / other framework adapters | Architecturally intended, not packaged yet |
| Canvas / native / PDF renderers | Future renderer direction |

## Packages

| Package | Role | Runtime dependencies |
| --- | --- | --- |
| [`@retikz/core`](https://www.npmjs.com/package/@retikz/core) | Framework-neutral JSON IR, schemas, pure parsers, and the IR-to-Scene compiler | `zod` |
| [`@retikz/react`](https://www.npmjs.com/package/@retikz/react) | Current official React components, JSX-to-IR builder, and SVG renderer | `@retikz/core`, peer `react >=18` |

The two public packages normally ship together with the same version.

## Project status

The repository is currently on `0.2.0-rc.1`. That means the v0.2 public API is frozen while installation, docs, examples, and release notes are being validated. The previous stable npm line is `0.1.0`.

retikz is still pre-1.0, so API details may change before the first stable major release. Breaking changes are documented in the [versioning guide](https://pionpill.github.io/retikz/about/releases/versioning) and release notes.

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm dev:docs
```

Useful links:

- [Documentation](https://pionpill.github.io/retikz/)
- [Introduction](https://pionpill.github.io/retikz/core/introduction)
- [Source code guide](https://pionpill.github.io/retikz/about/developer/source-code-guide)
- [Roadmap](https://pionpill.github.io/retikz/about/releases/roadmap)

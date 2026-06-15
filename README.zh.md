# retikz

[English](./README.md) | 简体中文

> retikz 是一个 AI 原生、IR 优先的图形原语库。提供 React 与原生 JavaScript 两套官方 API，设计灵感来自 TikZ。

[![npm version](https://img.shields.io/npm/v/@retikz/react?label=npm)](https://www.npmjs.com/package/@retikz/react)
[![license](https://img.shields.io/npm/l/@retikz/react)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-online-2563eb)](https://pionpill.github.io/retikz/)
[![react](https://img.shields.io/badge/react-%3E%3D18-149eca)](https://react.dev/)
[![package size](https://img.shields.io/bundlephobia/minzip/@retikz/react?label=minzip)](https://bundlephobia.com/package/@retikz/react)

retikz 的核心是一份可持久化的 JSON IR，而不是某个单一 UI 框架。React（`@retikz/react`）与原生 JavaScript（`@retikz/vanilla`）是当前官方维护的两套 API；Vue、Svelte 或其它运行时，也可以通过生成同一份 IR，或在 `@retikz/core` 之上构建薄 adapter 来接入。

它不是又一个图表模板库。更准确地说，retikz 是一个图形表达底座：适合关系图、技术解释图、几何示意图、带注释的文章配图，以及由 AI 生成或编辑的结构化图形。

## 为什么是 retikz？

<p align="center">
  <img src="./assets/readme/ir-centered.svg" alt="retikz 的 IR 居中架构" />
</p>

retikz 的架构从一份稳定的图形契约开始：Sugar JSX、Kernel JSX、未来的文本 DSL、原生 JavaScript 对象、Vue 或其它框架 adapter，以及 AI 输出，都可以在渲染前汇聚成同一份 JSON IR。

- **IR 是核心产品**：图形可以被持久化、按 schema 校验、之后重放，并通过任何兼容 adapter 渲染。
- **为 AI 设计**：LLM 可以生成受 schema 约束的 JSON IR，也可以 patch 现有图形，而不是拼容易出错的 JSX 字符串。
- **官方提供 React 与原生 JS 两套书写入口，底层保持框架无关**：`@retikz/react` 与 `@retikz/vanilla` 是目前官方维护的书写入口；`@retikz/core` 不依赖 React 或 DOM。
- **借用 TikZ 的成熟词汇**：node、path、anchor、scope 等概念直接服务几何关系表达，但用户不需要先学 LaTeX 或 TikZ。

## AI 友好不是附加功能

AI 友好不是 retikz 后补的能力，而是 IR 存在的理由。

| 设计选择 | 意义 |
| --- | --- |
| 纯 JSON IR | 模型输出结构化数据，而不是源码文本 |
| schema 约束字段 | runtime 能尽早发现非法图形 |
| 可 patch 的文档形态 | AI 可以局部编辑图形，不必重写整张图 |
| 框架无关契约 | 人写的 JSX、原生 JS 对象、未来 Vue adapter、AI 输出可以共用一份图形格式 |

## 看看效果

### Karl 单位圆

这个例子展示 retikz 的 TikZ-like 原语能力：网格、坐标轴、anchor、label、箭头、扇形和路径，可以直接组合成精确的数学示意图。

<p align="center">
  <img src="./assets/readme/karl-circle.svg" alt="Karl 单位圆示例" />
</p>

示例：[Karl 单位圆](https://pionpill.github.io/retikz/core/examples/karl-circle) · [源码](./apps/docs/src/contents/core/examples/karl-circle/karl-circle-07-info.zh.demo.tsx)

### 欧姆定律电路

这个例子展示 retikz 面向产品和业务图形的封装路径：把电路符号封装成可复用组件，再用 `Scope` 复制、移动和组合。

<p align="center">
  <img src="./assets/readme/ohms-law-circuit.svg" alt="欧姆定律电路示例" />
</p>

示例：[欧姆定律电路](https://pionpill.github.io/retikz/core/examples/ohms-law-circuit) · [源码](./apps/docs/src/contents/core/examples/ohms-law-circuit/ohms-law-circuit-06-labels.zh.demo.tsx)

## 快速开始

安装当前官方 React adapter 以及 React peer 依赖：

```bash
pnpm add @retikz/react react react-dom
```

画一个最小的命名节点图：

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

不想用 React？官方的 `@retikz/vanilla` 提供无框架的命令式 builder，以及 `mountSvg` / `mountCanvas`（同样支持 SSR）：

```ts
import { figure, node, draw } from '@retikz/vanilla';

const fig = figure([
  node('idea', { position: [0, 0], text: 'Idea' }),
  node('ir', { position: [110, 0], text: 'JSON IR' }),
  node('svg', { position: [230, 0], text: 'SVG' }),
  draw(['idea', 'ir', 'svg'], { arrow: '->' }),
]);

fig.mount(document.querySelector('#diagram')); // 也可 fig.toSvgString() / fig.toCanvas(canvas)
```

可以从[快速开始](https://pionpill.github.io/retikz/core/get-start)一步步搭起这个例子，也可以直接看更完整的[示例](https://pionpill.github.io/retikz/core/examples/karl-circle)。

再往底层走，稳定边界是 IR：你可以用原生 JavaScript 直接创建 JSON IR，也可以实现其它框架 adapter，让它输出同一份 IR，再交给 `@retikz/core` 编译。

## 现在能画什么？

retikz 0.3 聚焦通用图形原语，并补齐了多后端渲染、动画与交互：

| 能力 | 作用 |
| --- | --- |
| 命名节点与坐标 | 给后续路径和编辑提供稳定引用 |
| 路径、step、箭头、边标签 | 关系线可以贴到 anchor，而不是粗暴连到文字中心 |
| Scope 与 transform | 分组、局部移动、旋转、缩放和样式继承 |
| 形状、填充与注册表 | 内置形状，以及可扩展的形状、箭头、图案和路径生成器 |
| JSON IR 与 Scene 输出 | 面向持久化、AI 编辑和多 renderer 的可移植契约 |
| 多后端渲染（SVG / Canvas 2D） | 同一份 IR 可编译到 SVG 或 Canvas 2D 两种后端 |
| 动画 | 在 `<Layout>` 上声明动画，SVG / Canvas 双后端播放；可静态截帧用于 SSR 海报帧 |
| 交互、事件与水合 | 节点 / 路径事件与 hit-test；SSR 输出后在客户端水合 |
| 无框架 / SSR | `@retikz/vanilla` 的 `mountSvg` / `mountCanvas` 与 `renderToSvgString` |

数据驱动图表由新兴的 Tier 2 层 `@retikz/plot`（独立包，当前 alpha）承接；流程布局、codec 和更多渲染目标见[路线图](https://pionpill.github.io/retikz/about/releases/roadmap)。

## 架构

```text
React JSX / plain JS objects / future DSL / AI JSON
  -> retikz IR
  -> compileToScene()
  -> Scene primitives
  -> @retikz/render: SVG / Canvas 2D（react / vanilla 适配挂载）
```

关键设计选择是：React JSX 只是输入格式之一。图形一旦变成 IR，同一份数据就可以被保存、校验、由 LLM patch、编译，并交给任何兼容 adapter 渲染。

| 接入方式 | 状态 |
| --- | --- |
| 通过 `@retikz/react` 使用 React 组件 | 官方 API |
| 通过 `@retikz/vanilla` 无框架命令式挂载（含 SSR） | 官方 API |
| 原生 JavaScript 或 TypeScript IR 对象 | 可在 `@retikz/core` 边界接入 |
| SVG / Canvas 2D 渲染后端（`@retikz/render`） | 已提供 |
| Vue / Svelte / 其它框架 adapter | 架构上预留，尚未打包发布 |
| native / PDF renderer | 未来 renderer 方向 |

## 包

| 包 | 职责 | 运行时依赖 |
| --- | --- | --- |
| [`@retikz/core`](https://www.npmjs.com/package/@retikz/core) | 框架无关的 JSON IR、schema、纯 parser、IR 到 Scene 的编译器 | `zod` |
| [`@retikz/render`](https://www.npmjs.com/package/@retikz/render) | Scene 渲染后端命名空间：`./svg`（Scene → SVG descriptor / 字符串）、`./canvas`（Scene → Canvas 2D），以及动画与水合 runtime | `@retikz/core` |
| [`@retikz/react`](https://www.npmjs.com/package/@retikz/react) | 官方 React 组件、JSX 到 IR 的 builder，挂载 SVG / Canvas 双后端 | `@retikz/core`、`@retikz/render`，peer `react >=18` |
| [`@retikz/vanilla`](https://www.npmjs.com/package/@retikz/vanilla) | 官方无框架 runtime：命令式 `mountSvg` / `mountCanvas`、`renderToSvgString`（SSR）与具名 builder | `@retikz/core`、`@retikz/render` |

core / render / react / vanilla 四个 Tier 1 包按同一版本号 lockstep 发布。

## 项目状态

当前开发版本是 `0.3`：在 v0.2 stable 基础上加入了 `@retikz/render`（SVG / Canvas 2D 双后端）、`@retikz/vanilla`（无框架 runtime + SSR），以及动画与交互。上一条 stable npm 线是 `0.2.0`。

retikz 仍处于 pre-1.0 阶段，首个稳定大版本前 API 细节仍可能调整。破坏性变更会记录在[版本策略](https://pionpill.github.io/retikz/about/releases/versioning)和发布说明中。

## 开发

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm dev:docs
```

相关链接：

- [文档站](https://pionpill.github.io/retikz/)
- [简介](https://pionpill.github.io/retikz/core/introduction)
- [源码指南](https://pionpill.github.io/retikz/about/developer/source-code-guide)
- [路线图](https://pionpill.github.io/retikz/about/releases/roadmap)

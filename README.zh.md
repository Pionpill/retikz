# retikz

[English](./README.md) | 简体中文

> retikz 是一个 AI 原生、IR 优先的图形原语库。目前提供 React API，设计灵感来自 TikZ。

[![npm version](https://img.shields.io/npm/v/@retikz/react?label=npm)](https://www.npmjs.com/package/@retikz/react)
[![license](https://img.shields.io/npm/l/@retikz/react)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-online-2563eb)](https://pionpill.github.io/retikz/)
[![react](https://img.shields.io/badge/react-%3E%3D18-149eca)](https://react.dev/)
[![package size](https://img.shields.io/bundlephobia/minzip/@retikz/react?label=minzip)](https://bundlephobia.com/package/@retikz/react)

retikz 的核心是一份可持久化的 JSON IR，而不是某个单一 UI 框架。React 包是当前维护的官方 API；原生 JavaScript、Vue、Svelte 或其它运行时，也可以通过生成同一份 IR，或在 `@retikz/core` 之上构建薄 adapter 来接入。

它不是又一个图表模板库。更准确地说，retikz 是一个图形表达底座：适合关系图、技术解释图、几何示意图、带注释的文章配图，以及由 AI 生成或编辑的结构化图形。

## 为什么是 retikz？

<p align="center">
  <img src="./assets/readme/ir-centered.svg" alt="retikz 的 IR 居中架构" />
</p>

retikz 的架构从一份稳定的图形契约开始：Sugar JSX、Kernel JSX、未来的文本 DSL、原生 JavaScript 对象、Vue 或其它框架 adapter，以及 AI 输出，都可以在渲染前汇聚成同一份 JSON IR。

- **IR 是核心产品**：图形可以被持久化、按 schema 校验、之后重放，并通过任何兼容 adapter 渲染。
- **为 AI 设计**：LLM 可以生成受 schema 约束的 JSON IR，也可以 patch 现有图形，而不是拼容易出错的 JSX 字符串。
- **当前提供 React API，底层保持框架无关**：`@retikz/react` 是目前官方维护的书写入口；`@retikz/core` 不依赖 React 或 DOM。
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

可以从[快速开始](https://pionpill.github.io/retikz/core/get-start)一步步搭起这个例子，也可以直接看更完整的[示例](https://pionpill.github.io/retikz/core/examples/karl-circle)。

不想用 React 书写？稳定边界是 IR。你可以用原生 JavaScript 直接创建 JSON IR，也可以实现其它框架 adapter，让它输出同一份 IR，再交给 `@retikz/core` 编译。目前官方维护的高层组件 API 仍然是 React。

## 现在能画什么？

retikz v0.2 聚焦通用图形原语：

| 能力 | 作用 |
| --- | --- |
| 命名节点与坐标 | 给后续路径和编辑提供稳定引用 |
| 路径、step、箭头、边标签 | 关系线可以贴到 anchor，而不是粗暴连到文字中心 |
| Scope 与 transform | 分组、局部移动、旋转、缩放和样式继承 |
| 形状、填充与注册表 | 内置形状，以及可扩展的形状、箭头、图案和路径生成器 |
| JSON IR 与 Scene 输出 | 面向持久化、AI 编辑和未来 renderer 的可移植契约 |

数据驱动图表、流程布局、codec 和更多渲染目标见[路线图](https://pionpill.github.io/retikz/about/releases/roadmap)。

## 架构

```text
React JSX / plain JS objects / future DSL / AI JSON
  -> retikz IR
  -> compileToScene()
  -> Scene primitives
  -> React + SVG today, more adapters later
```

关键设计选择是：React JSX 只是输入格式之一。图形一旦变成 IR，同一份数据就可以被保存、校验、由 LLM patch、编译，并交给任何兼容 adapter 渲染。

| 接入方式 | 状态 |
| --- | --- |
| 通过 `@retikz/react` 使用 React 组件 | 当前官方 API |
| 原生 JavaScript 或 TypeScript IR 对象 | 可在 `@retikz/core` 边界接入 |
| Vue / Svelte / 其它框架 adapter | 架构上预留，尚未打包发布 |
| Canvas / native / PDF renderer | 未来 renderer 方向 |

## 包

| 包 | 职责 | 运行时依赖 |
| --- | --- | --- |
| [`@retikz/core`](https://www.npmjs.com/package/@retikz/core) | 框架无关的 JSON IR、schema、纯 parser、IR 到 Scene 的编译器 | `zod` |
| [`@retikz/react`](https://www.npmjs.com/package/@retikz/react) | 当前官方 React 组件、JSX 到 IR 的 builder、SVG renderer | `@retikz/core`，peer `react >=18` |

两个公开包通常使用同一版本号同步发布。

## 项目状态

当前仓库版本是 `0.2.0-rc.1`。这表示 v0.2 的公开 API 已冻结，正在验证安装、文档、示例和发布说明。上一条 stable npm 线是 `0.1.0`。

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

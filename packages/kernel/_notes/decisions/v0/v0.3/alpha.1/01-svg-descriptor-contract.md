# ADR-01：以 framework-neutral descriptor 为核心的 SVG 渲染

- 状态：Accepted（已实现）
- 决策日期：2026-05-29
- 关联：[ADR-02 Canvas renderer](./02-canvas-renderer-and-react-canvas-mode.md) · [ADR-03 Vanilla runtime](./03-vanilla-runtime-and-dependency-graph.md) · [ADR-05 renderer 重打包](./05-renderer-repackage.md)

## 背景

Scene 已是 renderer-agnostic 契约，原 React SVG 渲染层的属性摆放、资源表和 marker 去重逻辑几乎不依赖 React，却无法被 SSR、Vanilla 或其他框架复用。水合还要求 SSR 与客户端使用确定且一致的元素 id。

## 决策

SVG 后端以公开但非持久化的 `SvgNode` / `SvgAttrs` 描述树为核心：

- `buildSvgDocument(scene, { idPrefix })` 是唯一的 Scene → SVG 结构转换；`renderToSvgString` 与 React 分别将同一描述树序列化为字符串或 React elements
- descriptor 的属性名使用 SVG 真实拼写。字符串、Vanilla、SSR 逐字输出；React 仅将呈现属性的 kebab-case 映射为 camelCase，`viewBox`、`refX` 等结构属性保持原拼写
- `idPrefix` 由调用方注入，SSR 与客户端传入同一前缀即可得到一致 id。纯 React 调用未提供时沿用剥去冒号的 `useId()` 前缀，保持原有使用方式
- SVG 包只做无状态、确定性的 Scene 到描述映射，包括 marker 去重、属性/样式分流和文本行布局；不负责 memo、diff、生命周期、响应式或事件绑定
- 逐图元扩展能力通过稳定 id 关联，handler、动画和水合状态留在 runtime；函数不进入 descriptor 或 IR

`SvgNode` 是公开的 renderer descriptor，不是 IR，不写入持久化数据，也不依赖 React。框架适配器可以直接遍历它物化目标节点。

## 兼容性与实现结果

原独立 `@retikz/svg` 已并入 `@retikz/render/svg`，渲染设计不变。React 继续得到正常的 React element 树，原有 API 保持兼容，`idPrefix` 为 additive 能力。

## 遗留风险

非冒泡事件不能单靠根委托接收，后续水合需用冒泡事件合成 enter/leave 或提供局部绑定；descriptor 的局部 DOM patch 与渐进渲染不属于本决策。

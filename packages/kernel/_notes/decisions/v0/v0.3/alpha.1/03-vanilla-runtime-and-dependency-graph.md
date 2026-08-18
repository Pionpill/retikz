# ADR-03：Vanilla runtime 与 Kernel 依赖图

- 状态：Accepted（已实现；SVG 的字符串渲染、`mountSvg` 和 DOM 物化已闭环，Canvas runtime 入口后置到 alpha.4）
- 决策日期：2026-05-31
- 关联：[ADR-01 SVG descriptor](./01-svg-descriptor-contract.md) · [ADR-02 Canvas renderer](./02-canvas-renderer-and-react-canvas-mode.md) · [ADR-05 renderer 重打包](./05-renderer-repackage.md)

## 背景

无框架和 SSR 用户需要直接消费 IR/Scene，但不应自行复制 Scene 到 SVG/Canvas 的渲染逻辑。React 与 Vanilla 需要共享 renderer，同时保持 core 不认识框架或后端。

## 决策

依赖图收敛为：

```text
@retikz/core
   ├── @retikz/render   （./svg + ./canvas）
   ├── @retikz/vanilla  （core + render）
   └── @retikz/react    （core + render；react peer）
```

`@retikz/vanilla` 是无框架 runtime 门面：`renderToSvgString` 组合 SVG 后端，`mountSvg` 将 descriptor 物化到 DOM，且不依赖 React。render 子路径之间互不依赖；Canvas 侧不经 SVG。所有 renderer 依赖均为直接依赖，不使用 optional peer；未使用的后端由子路径和 tree-shaking 排除。

Vanilla runtime 契约如下：

- `mountSvg` 返回的 `view.root` 在 `update` 后保持同一 `<svg>` 元素 identity；update 只整图重物化，不承诺局部 patch 或子树 diff。`dispose` 移除 root，view 随后失效
- 模块顶层不得访问 `document`、`window` 或其他 DOM 全局；DOM 只能在 mount/view 操作时惰性访问。纯 Node 中导入包并调用 `renderToSvgString` 必须可用
- `idPrefix` 透传到 SVG builder，默认值为 `'r'`；多实例同页由调用方显式提供不同前缀。不会引入随机 id
- 输入已编译 Scene 时不需要测量；输入 IR 且未提供 `measureText` 时使用确定性、零 DOM 的 `fallbackMeasurer`，需要精确尺寸时由调用方注入 `TextMeasurer`
- `renderToSvgString` 可预留交互选项，但水合和 handler 注册属于独立 runtime；函数不进入 IR

## 兼容性与实现结果

原 `@retikz/svg` / `@retikz/canvas` 依赖统一为 `@retikz/render`，React 与 Vanilla 不互相依赖。SVG runtime 已按上述 SSR 安全、root 复用和测量规则实现；Canvas 入口另由后续 ADR 收口。

## 遗留风险

局部 DOM patch、浏览器精确测量、Canvas 服务端导出和 Canvas runtime 入口仍是后续能力；这些不改变当前一次性 SVG update 与确定性 fallback 契约。

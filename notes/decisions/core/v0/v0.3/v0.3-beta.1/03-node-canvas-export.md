# ADR-03：可选 Node Canvas 服务端导出入口——薄复用 `drawScene` + conditional exports 隔离 + optional peer 依赖

- 状态：Proposed
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) TODO-3 · **复用机制**：[v0.3-alpha.1 ADR-02 Canvas renderer](../v0.3-alpha.1/02-canvas-renderer-and-react-canvas-mode.md)（`drawScene(ctx, scene)` / `renderToCanvas`、meet-fit 映射）· [v0.3-alpha.5 ADR-03 Canvas 播放](../v0.3-alpha.5/03-canvas-playback.md)（`drawScene(ctx, scene, { time })` 单帧 = 截帧）

## 背景

v0.3 已有浏览器 Canvas renderer：`@retikz/render/canvas` 暴露 `drawScene` / `renderToCanvas`，`@retikz/vanilla` 提供 `mountCanvas` / `Figure.toCanvas`。v0.3 总计划把「Node Canvas / `@napi-rs/canvas` 服务端导出」列为 beta.1 候选：服务端直接产 PNG/JPEG/WebP buffer。

约束：服务端导出**不能污染默认浏览器安装路径**——`@napi-rs/canvas` 带平台原生二进制，体积与安装体验都比纯 runtime 重，必须作为**用户显式安装的可选能力**，且默认 bundle 不得静态引用它。

## 关键可行性支点：入口极薄，复用现有 `drawScene`

最重要的事实（codex 草案没点出）：**`@napi-rs/canvas` 的 2D context 结构兼容 `CanvasRenderingContext2D` 的绘制子集**。alpha.1 的 `drawScene(ctx, scene)` 只依赖标准 2D ctx 绘制接口（path / fill / stroke / transform / text draw 等），不碰 DOM。因此 Node 导出**不需要新渲染路径**，只是换一个 ctx 来源：

```ts
import { createCanvas } from '@napi-rs/canvas';
import { drawScene } from '@retikz/render/canvas'; // 既有，零改动

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
drawScene(ctx, scene);          // 同浏览器，alpha.5 时可传 { time } 截帧
return await canvas.encode('png'); // Buffer
```

入口本体就是「createCanvas → getContext → drawScene → encode」这几行；动画截帧天然支持（`drawScene(ctx, scene, { time })`，alpha.5 ADR-03 已定单帧 = 截帧）。

## 决策：新增隔离的 Node 导出子路径，dynamic import optional 依赖

### 1. 子路径与归属

落 `@retikz/render`（canvas 后端归属地），新增子路径入口：

```ts
import { renderSceneToImage } from '@retikz/render/canvas-node';

const png = await renderSceneToImage(scene, { width: 800, height: 600, format: 'png' });
```

render 层吃**已编译 Scene**（边界最小、与 `drawScene` 同层）。是否再在 `@retikz/vanilla` 包一层「吃 IR、内部 compile」的便捷入口（`@retikz/vanilla/node` 的 `renderToImageBuffer(ir, ...)`），以实现时导出边界最小为准、可后置。

### 2. package.json conditional exports + optional peer 依赖

- `@retikz/render` 的 `exports` 加 `"./canvas-node"` 子路径条目，与 `"./canvas"` 浏览器入口物理分文件。
- `@napi-rs/canvas` 作为 optional peer 声明：`peerDependencies` + `peerDependenciesMeta["@napi-rs/canvas"].optional = true`，catalog 统一版本，**不进 `dependencies` / `optionalDependencies`**。
- `canvas-node` 入口内部 `await import('@napi-rs/canvas')` **动态引入**——保证默认 `@retikz/render/canvas` / 浏览器 bundle 的静态依赖图里没有 napi。
- 未安装 optional 依赖时，动态 import 失败 → 抛**明确错误**，提示 `pnpm add @napi-rs/canvas`。

说明：`optionalDependencies` 也会被包管理器在默认安装时尝试安装，只是失败不阻断；这不满足「默认安装路径不拉 native 包」的约束，因此本 ADR 不采用 optional dependency 方案。若后续发布体验证明 optional peer 对用户提示不够友好，再考虑拆独立包（如 `@retikz/render-node`）。

### 3. 字体 / 文本度量（设计约束，不是文档脚注）

`@retikz/render/canvas-node` 的主入口吃**已编译 Scene**。在这个边界上，节点尺寸 / 换行 / 排版已经由 compile 阶段决定，注册 Node 字体不会重新影响布局；它只影响最终 Canvas 绘制出来的字形。若后置提供 `@retikz/vanilla/node` 这类吃 IR 的便捷入口，则必须在 compile 前接入 Node canvas 的测量函数。

因此入口必须：

- 文档与类型层面要求调用方先 `GlobalFonts.register(...)`（或 `registerFont`）注册字体；
- 明确 Scene-only 入口不负责重新测量布局；IR-level 便捷入口若提供，才负责把 Node measurer 传给 compile；
- 不承诺与浏览器逐像素一致——这是即时模式服务端渲染的固有限制，列入非目标。

理由：

1. **薄复用 = 最小新增面**——napi ctx 兼容标准 2D 接口，`drawScene` 零改动直接吃；不引入第二套渲染逻辑、不重写几何。
2. **物理隔离防污染**——子路径分文件 + optional peer + dynamic import 三重隔离，浏览器默认路径的依赖图、体积、安装 native 包体验完全不受影响。
3. **截帧天然到手**——alpha.5 `drawScene({time})` 单帧即截帧，服务端导出动画封面零额外成本。

## 影响范围

- `packages/core/render/package.json`（`exports["./canvas-node"]` + optional peer 声明）
- `packages/core/render/src/**`（新增 `canvas-node` 入口，dynamic import）
- 视方案触及 `packages/core/vanilla/package.json` / `src/**`（可选 IR 级便捷入口）
- `pnpm-workspace.yaml`（catalog 加 `@napi-rs/canvas`）
- docs renderer / vanilla 页面

## 非目标

- 不把 `@napi-rs/canvas` 变成默认 `dependency` 或 `optionalDependency`。
- 不支持浏览器没有的 Canvas-only Scene 特性（保两端能力同集）。
- 不承诺与浏览器逐像素一致（字体 / 文本度量差异为已知限制）。
- 不做 SVG → raster 主路径。
- 不承诺 PDF / Skia / WebGL 导出。

## 测试要求

- Node 入口在已装 optional 依赖时输出非空 buffer（png/jpeg/webp 各覆盖）。
- 默认 `@retikz/render/canvas` 入口的静态依赖图不含 napi（构建/import 分析验证）。
- 未装 optional peer 时报明确安装提示，不是裸 `MODULE_NOT_FOUND`。
- `drawScene(ctx, scene, { time })` 在 Node ctx 上能产指定时刻截帧。
- `@retikz/render/canvas` 既有浏览器测试全绿。

## 文档要求

- 写清安装可选依赖（`pnpm add @napi-rs/canvas`）。
- 写清 Node 导出与浏览器 `canvas.toBlob` 的边界与用途差异。
- 写清字体注册（`GlobalFonts.register`）与文本度量的服务端限制。

> 实现指针：最终入口名 / 子路径 / 选项以代码为准；上方 `renderSceneToImage` 为设计草案命名。

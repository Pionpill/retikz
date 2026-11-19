---
description: Node 导出入口消费已编译的 Scene，复用浏览器 Canvas 绘制语义，默认安装不引入原生依赖。
keywords: 'Node、Canvas、drawScene、conditional、exports、optional、peer、renderToCanvas'
---

# ADR-025：可选 Node Canvas 服务端导出入口——薄复用 `drawScene` + conditional exports 隔离 + optional peer 依赖

- 状态：Accepted
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) · [v0.3-ADR-002 Canvas renderer](./002-canvas-renderer-and-react-canvas-mode.md) · [v0.3-ADR-019 Canvas 播放](./019-canvas-playback.md)

## 决策

`@retikz/render/canvas-node` 通过 `renderSceneToImage` 输出 PNG、JPEG 或 WebP buffer。它使用与浏览器相同的 `drawScene`；指定时刻即可导出该帧，无需运行播放循环。

`@napi-rs/canvas` 是 optional peer，仅由 Node 子入口动态加载；浏览器入口不引用它，未安装时调用导出应明确提示安装。字体需在绘制前注册，只影响字形，不重新度量已编译的布局，也不保证跨平台逐像素一致。

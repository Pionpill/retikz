# v0.4 讨论草案：Pseudo-3D 视角层

> 说明：这是 v0.4 的讨论草案，不是正式总计划。正式开始 v0.4 时会重新 review 并决定是否纳入、如何拆分、与 plot / renderer / hydration 的边界如何划定。
>
> 关联：[`v0 roadmap`](../roadmap.md) · [`v0.3 renderer / runtime 专题`](../v0.3/roadmap.md) · [`plot-design.md`](../../../../architecture/plot-design.md)

## 讨论目标

本草案讨论一种伪三维能力：在二维 retikz 的基础上，引入一个可控视角，把三维坐标投影回二维 Scene，并允许根据深度派生透明度、缩放、z-order 等样式。

这不是完整 3D 渲染，也不是 Blender 式相机系统。它的目标是：

- 让 plot / diagram 里出现“看起来是三维”的几何表达；
- 仍然只输出二维 core IR / Scene；
- 后续连线、路径、标签等仍沿用既有二维逻辑；
- 把三维语义限制在 plot / coordinate scope / lowering 层，不污染 renderer。

v0.4 也会作为前一版本预留的 AI 增量渲染方向的正式优化窗口：如果 v0.3 已经把 renderer / runtime / hydration / plot 支撑的结构性条件留好，v0.4 可以开始设计更完整的 Progressive IR、JSON Patch stream、分层增量渲染和更细的 SVG / Canvas 更新策略。

## 核心想法

伪三维的基本形态可以理解成：

```text
[x, y, z] + view -> [screenX, screenY]
```

其中 `view` 代表观察参数，通常关注一个目标点，默认可以是原点。

可讨论的参数包括：

- `target`：关注点；
- `azimuth`：水平旋转角；
- `elevation`：俯仰角；
- `distance`：透视距离；
- `projection`：orthographic / perspective；
- `scale`：整体缩放。

## 深度派生

讨论中的另一条语义是：在三维投影之后，可以按深度派生一些二维样式。

候选项：

- 透明度；
- 缩放；
- z-order；
- strokeWidth；
- label emphasis。

这可以理解为：

```text
depth -> style
```

早期版本可以只做最小闭环：

1. 三维点投影成二维点。
2. 深度派生 opacity。
3. 深度派生 zIndex。
4. 连线仍按二维 path / step 逻辑处理。

## 语义边界

这类能力更像 plot 的坐标系扩展，而不是 core 的新渲染能力。

边界建议：

- **core** 继续只理解二维 Scene。
- **plot / coordinate system** 负责三维坐标投影与深度派生。
- **renderer** 仍然只画二维结果。
- **path / node / label** 的后续处理仍复用现有二维规则。

## 风险点

1. **过早膨胀**  
   如果把遮挡、光照、mesh、材质也纳入，会迅速从“伪三维投影”滑向完整 3D 系统。

2. **语义过重**  
   如果把三维直接塞进 core IR，后续 SVG / Canvas / SSR 的一致性会变差。

3. **图表边界模糊**  
   这更像 plot 的一个子方向，不适合作为 core 通用能力。

## 讨论结论倾向

当前倾向是把它放在 v0.4，而不是 v0.3。

理由是：

- v0.3 已经有 renderer 拆分、vanilla runtime、hydration、plot 支撑这些更底层的工作；
- pseudo-3D 需要一层更明确的坐标与样式派生语义；
- 它更接近 plot 的能力演进，而不是基础 runtime 的收尾。

## 待正式 review 的问题

1. 这个能力是否只属于 plot，还是应形成更通用的 coordinate system 扩展。
2. 视角参数的最小集合是什么。
3. 只做 orthographic，还是同时支持 perspective。
4. 深度派生哪些样式应该成为一等能力。
5. 连线、标签、guide 在深度语义下是否需要特殊处理。
6. 这项能力是否进入 v0.4 首批，还是作为后续 plot 子主题。

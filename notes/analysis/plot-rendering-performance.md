# plot 渲染性能分析 + GPU（WebGL/WebGPU）后端可行性

> 目的：回答「`@retikz/plot` 会不会撞性能墙、在哪里撞、要不要上 WebGL」。结论先行：plot 的图元随数据量 `O(N)` 增长，canvas 在 5k–10k 动画图元 / ~5 万静态图元处掉帧，**确会撞墙**；但 GPU 后端不是第一杠杆——canvas batching 与 plot 侧聚合更便宜、且能独立见效，真撞墙时再上 **hybrid GPU（数据层 GPU + 文字/轴留 2D）**。
> 日期：2026-06-07 · 关联：[`v0.3 roadmap`](../decisions/core/v0/v0.3/roadmap.md)（包拆分图已预留 `./webgl`）· [`plot-compare-analysis`](./plot-compare-analysis.md)（性能维度横向定位）· [`core-design.md`](../architecture/core-design.md)
> 说明：文中性能阈值为**工程经验量级，非实测**；正式立项前应补 benchmark 把拐点测准（见 §6）。

## 1. plot 的图元随数据量线性爆炸（O(N)，已确认）

探查 `packages/plot/plot/src/lower/mark.ts` 的下沉逻辑，每种 mark 把 N 个数据点下沉成的 Tier 1 节点 / 编译后 Scene primitive：

| mark | N 数据点 → Tier 1 | 编译后 Scene primitive | 量级 | 备注 |
|---|---|---|---|---|
| point / 散点 | N 个 `circle` Node | **N 个 `EllipsePrim`** | O(N) | `POINT_SIZE=10`；color encoding 仅分到 O(色数) 个 scope，图元仍 N |
| interval / 柱 | N 个 `rectangle` Node | **N 个 `RectPrim`** | O(N) | dodge/stack 总数仍 O(N) |
| sector / 饼 | N 个 `sector` Node | N 个 `PathPrim` | O(N) | N 通常很小（分片数），非性能点 |
| line / 折线 | 1 条 Path（N 步） | 1 个 `PathPrim`（N 段） | O(N) 步 | 多 series → S 条 path，步数合计仍 N |
| area / 面积 | 1 条 Path（2N+1 步） | 1 个 `PathPrim` | O(N) | 上沿 + 下沿回边 |
| **axis / grid / label** | O(ticks) | O(ticks) | **恒定** | **与 N 无关**——刻度线合并成 1 条 Path，标签 O(ticks) 个 text |

源：`lowerPoint` (`mark.ts:122`)、`lowerInterval` (`mark.ts:151`)、`lowerSector` (`mark.ts:231`)、`lowerLine` (`mark.ts:340`)、`lowerArea` (`mark.ts:392`)、guide `lowerCartesianGuide` (`guide.ts:80`)。

**关键洞察**：plot 的热点图元是 **点 / 矩形 / 折线**——恰好是 GPU instancing 最擅长的；而 WebGL 最大软肋 **文字** 落在 `O(ticks)` 的轴 / 标签层（十几个），**几乎不吃数据量**。对 plot 这个特定场景，GPU 的强项打在高基数数据层、弱项打在低基数 guide 层——比通用 diagram 场景（文字密集）划算得多。这是「plot 值得考虑 GPU、而 core diagram 不值得」的根本差异。

## 2. canvas 在哪里断

探查 `packages/core/render/src/canvas/drawScene.ts`：

```ts
export const drawScene = (ctx, scene, options) => {
  for (const primitive of scene.primitives) drawPrim(ctx, primitive, options, resources);
};
// drawPrim：每图元一对 ctx.save()/restore()，按 type 分发 beginPath→fill→stroke
```

特征：**纯顺序遍历、每图元独立 save/restore、零 batching、动画整帧全量重绘（无 dirty-rect）、hit-test 逐图元 `isPointInPath`**。由此：

| 场景 | 经验拐点 | 原因 |
|---|---|---|
| 静态一次性渲染 | ~5 万图元内可接受（几十 ms） | 只画一次 |
| 动画 / 交互 60fps | **~5k–10k 图元开始掉帧** | 每帧 N 次 save/restore + N 次 fill，16.6ms 预算耗尽 |
| hit-test（pointer 事件） | O(N) / 次 | 逆 z-order 逐图元 `isPointInPath`，高频事件叠加 |
| **IR 编译 / 序列化** | **N=10万 时 IR ≈ 5MB JSON** | `compileToScene` 走 O(N)；**这是独立的一道墙，换渲染后端不解决** |

最后一行最关键：**IR 体积 / 编译墙是 CPU 侧的、与渲染后端无关**——WebGL 救不了它，只有 plot 侧聚合能救（见 §3.2）。

## 3. 杠杆顺序：WebGL 排第三

撞墙是真的，但前面有两个更便宜、且能独立见效的杠杆。**别一上来就上 GPU。**

### 3.1 canvas batching（最高性价比，不动后端）

plot 的 color grouping 在 IR 层已把同色图元归到 `scope.nodeDefault`（`mark.ts:46` `colorGroupedScope`），但 canvas renderer 把 scope 摊平后**仍逐个 fill**。把同 style 的 `RectPrim` / `EllipsePrim` 合并成单次绘制（一个 `beginPath` + N 个子路径 + 一次 `fill` + 一次 `stroke`），经验上把 canvas 吞吐拉高 5–10×。

- 范围：`@retikz/render/canvas` 内部优化，**Scene 契约不变、SVG 路径不变、IR 不变**——属「行为等价的性能优化」，无需动文档。
- 风险：z-order 内同 style 才能合批；跨 style 边界要 flush。需保留逐图元 `id`（hit-test / 动画 per-id 用），合批是绘制层的事、不丢 id 映射。
- **这一步可能让你根本不需要 WebGL。** 应作为第一动作。

### 3.2 plot 侧聚合 / 抽稀（治本，治 IR 墙）

10 万点不该 emit 10 万个 Node。成熟库（datashader / deck.gl）在**数据层**做 binning / 密度聚合 / LTTB 抽稀，让图元数有上界。

- 同时干掉 §2 第二道 IR 序列化墙（这是 batching 救不了的）。
- 归属：`next-plot` 的 Tier 2 工作，**不进 core**（core 运行时只 zod，聚合算法是 plot 包依赖）。
- 与 [`plot-compare-analysis`](./plot-compare-analysis.md) 里「大数据性能非 retikz 目标维度」的定位一致——聚合是把「能画」的上限抬高，不是追 ECharts 的实时百万点。

### 3.3 hybrid GPU 数据层（真撞墙才上）

若 batching + 聚合后**仍有 60fps 墙**（如 10万+ 点的实时 pan/zoom），才上 GPU，且必为 **hybrid**：

- **GPU 只扛数据层**：instanced 点（EllipsePrim）/ 矩形（RectPrim）+ polyline（折线 PathPrim）。
- **轴 / 标签 / 文字留 SVG 或 Canvas 2D**（O(ticks) 低基数），叠一层在 GPU 画布之上。**彻底绕开 GPU 文字坑（SDF atlas）。**
- 技术选型：新立 GPU 后端**优先 WebGPU**（WebGL2 已 legacy、不再演进；WebGPU 在 Chrome/Safari 已可用、Firefox 跟进中），WebGL2 做 fallback 或暂不做。
- 包归属：`@retikz/render/webgpu`（roadmap 包拆分图已预留 `./webgl` seam）。消费同一 `Scene`，**无需改 Scene 契约**；降级路径回落 canvas。

## 4. GPU 友好度清单（若真做 hybrid 后端）

按 `packages/core/core/src/primitive/*.ts` 的 primitive 契约逐项评估（探查确认无任何现存 webgl/gpu 占位代码，仅 canvas/svg 两后端）：

| primitive | GPU 难度 | 方案 | plot 相关性 |
|---|---|---|---|
| Rect / Ellipse | 易 | instancing（pos/size/r + cornerRadius 走 SDF） | **数据层热点** |
| Path 折线（move/line） | 易 | indexed polyline | **数据层热点** |
| Linear gradient | 易 | 顶点插值 / LUT 纹理 | series 填充 |
| Path 贝塞尔（quad/cubic） | 中 | tessellation（CPU 抽稀线段 / Lyon / Pathfinder） | area 曲线、平滑线 |
| Path arc/ellipseArc | 中 | 中心参数化便于 GPU 逼近 | sector、polar |
| dash / linejoin / arrow | 中 | 屏幕空间 dash + 预生成 marker mesh | 网格虚线、箭头 |
| Radial gradient | 中 | fragment shader（Canvas 仅圆形，GPU 可椭圆） | 少用 |
| Clip：rect/circle | 易 | scissor / discard | panel 裁剪 |
| Clip：polygon | 中 | stencil buffer | 少用 |
| **Text** | **难** | SDF/MSDF atlas + 编译期字形收集 | **O(ticks) 不吃 N → hybrid 中留 2D，不上 GPU** |

要点：plot 的高基数图元全部落在「易」档，唯一的「难」档（文字）在 hybrid 架构里根本不进 GPU。这是结论 §3.3 成立的技术依据。

## 5. 与现有架构的契合

- **Scene 契约无需改**：GPU 后端与 canvas/svg 一样消费已编译 `Scene`（`packages/core/core/src/primitive/scene.ts`：`RectPrim | EllipsePrim | TextPrim | PathPrim | GroupPrim`）。编译期产物（gradient/pattern tile、marker primitives、文本度量）可复用。
- **core 不受影响**：渲染后端是 `@retikz/render` 子路径，core 仍零 React/DOM/GPU 依赖。
- **降级既有范式**：沿用 canvas「能力声明 + 可诊断降级、不静默」——GPU 不可用 / 不支持的 primitive 子集回落 2D，绝不丢图。与 alpha.5 动画的降级契约同一套思路。
- **分支流向**：batching（§3.1）属 core 组 → `next-core`；聚合（§3.2）属 plot → `next-plot`；GPU 后端（§3.3）属 render → `next-core`，plot 通过同一 Scene 受益，无需 plot 自造渲染路径（守 AGENTS.md「子组不绕开 core 自造平行机制」）。

## 6. 建议落地顺序

1. **先 benchmark**：用 point/interval mark 造 1k / 1万 / 10万 点的 fixture，分别测静态渲染、60fps 动画重绘、hit-test 延迟、IR 体积 + 编译耗时，把 §2 的经验拐点测成真数据。这是后续所有取舍的依据。
2. **canvas batching**（`next-core`）：同 style 图元合批；行为等价优化。多半就够日常 plot 用。
3. **plot 聚合 / 抽稀**（`next-plot`）：binning / LTTB，给图元数上界，治 IR 墙。
4. **仅当 1–3 后仍撞 60fps 墙**：立项 hybrid GPU 后端（优先 WebGPU + 数据层 only + 文字留 2D），届时走正式 spec（场景规模、目标后端、parity 范围、文字方案）。

## 7. 不做 / 边界

- 不为 core diagram 场景做 GPU（文字密集、图元数适中，GPU 渲染更糊更慢，无收益）。
- 不追 ECharts 式实时百万点全特性 parity；retikz 的性能目标是「在现有 Scene/Tier 2 架构下把能画的上限抬高」，非基准竞速。
- 不让 GPU 后端改 Scene 契约或在 plot 内自造脱离 IR 的渲染路径。
- `morph` / 数据过渡仍归 runtime + Tier 2（见 v0.3 roadmap §动画 B），与本文 GPU 议题正交。

## 附录：渲染技术背景（canvas / webgl / webgpu）

> 立项 hybrid GPU 后端前的概念地基。结论上承 §3.3（hybrid：数据层 GPU + 文字/轴留 2D）与 §4（GPU 友好度）。

### A. 三者的根本区别 = 抽象层级（你跟谁对话、谁负责变像素）

| | Canvas 2D | WebGL (1/2) | WebGPU |
|---|---|---|---|
| 抽象层级 | 高：命令式 2D 绘图 | 低：GPU 光栅化管线 | 低：现代 GPU 管线 |
| 你描述的是 | 「画一个圆 / 一段文字 / 一条贝塞尔」 | 「这堆三角形顶点 + 这段 shader」 | 同 WebGL，但管线/资源显式化 |
| 内建图形概念 | 有（圆/矩形/路径/**文字**/渐变均一等公民） | **无**（只有三角形/点/线，圆和文字都得自己造） | 无 |
| 可编程性 | 不可编程 | GLSL shader | WGSL shader + **真 compute** |
| 编程模型 | 状态机 + 即时命令，每帧重发 | 全局状态机 + 显式 buffer/texture/program | command encoder + pipeline state + bind group（CPU 开销低、可多线程录命令） |
| 底层 | 浏览器实现（多为 Skia，**可能本身就 GPU 加速**，对你透明） | OpenGL ES | Vulkan/Metal/D3D12，**不再基于 OpenGL** |
| 擅长 | 矢量质量、文字、中等图元数、开发简单 | 海量同质几何（instancing）、自定义效果、3D | 同 WebGL + 更低开销 + compute |

一句话：**canvas 2d 是「我描述要画的图形，浏览器负责怎么变像素」；webgl/webgpu 是「我直接驱动 GPU 管线，自己把一切表达成三角形和着色器」。** WebGPU 是 WebGL 的继任者（WebGL 已封顶不再演进）。

**关键澄清**：canvas 2d 不等于「软件渲染、没用 GPU」——现代浏览器 canvas2d 后端往往也走 GPU。区别不在「用不用 GPU」，而在「能不能控制 GPU 管线」：canvas2d 不能写 shader / 不能 instancing，画 10 万个独立图形时卡在**逐图元发命令的 CPU 开销**（正是 §2 canvas 掉帧的根因）；webgl/webgpu 能用一次 instanced draw call 画完 10 万个。这是 GPU 后端对 plot 数据层有效的根本机理。

### B. 三者输出都是位图（与 SVG 的矢量本质对立）

`<canvas>` 元素本质是一块**位图后备存储**；无论挂 2d / webgl / webgpu，最终都往这块像素缓冲写值。GPU 管线终点就是 framebuffer（一组像素），"光栅化"即把几何转成像素片段。故三者均为**分辨率相关的位图**：

| | 输出 | 缩放 | 可访问性/可选中 | 单元素可操作 |
|---|---|---|---|---|
| **SVG** | 矢量（DOM） | 无限清晰 | ✅ | ✅（每元素是 DOM） |
| canvas / webgl / webgpu | **位图** | 会糊 | ❌ | ❌ |

推论：retikz「印刷级矢量」身份的本命是 **SVG**；canvas/webgl/webgpu 都在位图侧，定位是「性能/规模/效果」而非矢量质量——这正是 §7「不为 core diagram 场景做 GPU」的依据。缓和手段：GPU 可用 **SDF/MSDF** 让文字/简单形状在一定缩放内"接近矢量清晰"（hybrid 中若在 GPU 上画文字的标准做法），但本质仍是位图近似，不是真矢量。

### C. hybrid 分层是业界主流，且有现成范本

分层结合三种方式：① **多 `<canvas>` DOM 层叠**（最常用：底层 webgl 画数据点、中层 canvas2d 画轴网格、顶层 SVG/DOM 画文字标签/tooltip，CSS 合成）；② 单 GPU canvas 多 pass / 离屏纹理合成；③ GPU 画几何 + HTML/DOM overlay 文字。动机即 §3.3：GPU 擅长海量几何但不擅文字/矢量，SVG/DOM/2D 擅长文字与交互，分层各取所长。

开源范本（按贴近 retikz 度排）：

| 项目 | 分层做法 | 对 retikz 的参考价值 |
|---|---|---|
| **Plotly.js** | **同图内：轴/标注/文字走 SVG，海量数据点走 WebGL**（`scattergl` vs `scatter`） | **最贴近的标杆**——几乎就是本文建议的 hybrid（数据层 GPU + 轴文字留矢量）的现成实现，立项前应精读其 `scattergl` |
| deck.gl (Uber) | Layer 架构：WebGL/WebGPU 画地理数据，文字走 SDF `TextLayer` 或 DOM | 「图层 = 不同渲染后端」的架构范式 |
| Mapbox GL / MapLibre | WebGL 底图+矢量瓦片 + DOM/canvas 叠加控件标签 | hybrid 的工业级稳态 |
| ECharts + ECharts-GL | 普通图走 zrender canvas，大数据/3D 走 WebGL 扩展 | 「按需分后端」思路 |
| Three.js + CSS2D/3DRenderer | 官方把 DOM 文字/HTML 叠加到 WebGL 3D 场景 | 文字 overlay 的官方范式 |
| sigma.js / cosmos / regl-scatterplot | GPU 数据层 + DOM/canvas 标签层 | 大规模图/散点的 hybrid |

结论：hybrid 不仅可行，是处理「海量数据 + 要文字」的**行业标准答案**；Plotly.js 已把「SVG 轴文字 + WebGL 数据点」走通。retikz 的 Scene 本就 renderer-agnostic，同一份 Scene 按图元类型/图层分流到不同后端，做同样分层在架构上更顺（不改 Scene 契约，见 §5）。

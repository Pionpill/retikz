# ADR-01：Scene `PathPrim` + `GroupPrim` 结构化（去 SVG 字符串）

- 状态：Proposed
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../../plans/v0/roadmap.md) · [v0.1.0-alpha.5 plan TODO-5 / TODO-6](../../../plans/v0/v0.1-alpha.5.md) · [DESIGN.md §4.5](../../../architecture/DESIGN.md)

## 背景

`packages/core/src/primitive/path.ts` 的 `PathPrim.d: string` 是 SVG path mini-language 字符串（`"M 0 0 L 10 0 A r r 0 1 0 ..."`）；`primitive/group.ts` 的 `GroupPrim.transform?: string` 是 SVG transform 字符串（`"translate(10 20) rotate(30)"`）。`compile/path.ts` 整段工作就是把结构化 IRStep 编译成 `d` 字符串。

这与 [DESIGN.md §4.5](../../../architecture/DESIGN.md) "Scene primitive 是矢量图形最大公约子集"原则冲突——`d` 字符串和 SVG transform 字符串本质都是 SVG mini-language，把它们当成"公约"等于让 SVG 渲染端的细节渗透到 core。后果：

- **Canvas adapter 进退两难**：要么自己 parse SVG path string（要写解析器），要么用浏览器 `new Path2D(d)`（Node / 非浏览器 canvas 没有 `Path2D`）
- **Skia / PDF / native adapter 同样要 parse SVG mini-language**——core 内部本来就有结构化数据，吐成字符串再让 adapter parse 回来是反向操作
- **SVG-only 细节渗到 core compile 层**——A 命令的 endpoint-parameterization、`large-arc-flag` / `sweep-flag` 计算被迫住在 `core/geometry/arc.ts::arcSvgFlags`，这玩意儿对 canvas / Skia / PDF 完全无意义
- **GroupPrim transform 同病**：canvas 的 `ctx.translate / rotate / scale` 是顺序调用，没有"transform 字符串"的概念

**TikZ 自身从不暴露"d 字符串"概念**——它的 path 操作（move / line / curve / arc）都是 high-level 命令，最终在不同 backend（dvips / pdftex / SVG output）走不同 lowering。retikz 应当复刻这种"core 持有结构化数据，backend 翻译为各自原生 API"的设计。

## 选项

### A. 全结构化（**推荐**）

`PathPrim.d: string` → `PathPrim.commands: Array<PathCommand>`；`GroupPrim.transform?: string` → `GroupPrim.transforms?: Array<Transform>`：

```ts
// packages/core/src/primitive/path.ts
type PathCommand =
  | { kind: 'move'; to: [number, number] }
  | { kind: 'line'; to: [number, number] }
  | { kind: 'quad'; control: [number, number]; to: [number, number] }
  | { kind: 'cubic'; control1: [number, number]; control2: [number, number]; to: [number, number] }
  | { kind: 'arc'; center: [number, number]; radius: number; startAngle: number; endAngle: number; counterClockwise?: boolean }
  | { kind: 'ellipseArc'; center: [number, number]; radiusX: number; radiusY: number; rotation?: number; startAngle: number; endAngle: number; counterClockwise?: boolean }
  | { kind: 'close' }

type PathPrim = {
  type: 'path'
  commands: Array<PathCommand>
  // stroke / fill / opacity 等字段不变
}

// packages/core/src/primitive/group.ts
type Transform =
  | { kind: 'translate'; x: number; y: number }
  | { kind: 'rotate'; degrees: number; cx?: number; cy?: number }
  | { kind: 'scale'; x: number; y?: number }

type GroupPrim = {
  type: 'group'
  transforms?: Array<Transform>   // 按数组顺序应用（与 SVG `transform` 多操作列表语义一致）
  children: Array<ScenePrimitive>
}
```

每个 adapter 在 render 时按各自原生 API 翻译：

| Adapter | path commands 翻译 | group transforms 翻译 |
|---|---|---|
| SVG (react) | 拼成 `d` 字符串（react/src/render/path-d-builder.ts） | 拼成 transform 字符串（react/src/render/transform-builder.ts） |
| Canvas | `ctx.moveTo / lineTo / quadraticCurveTo / bezierCurveTo / arc / ellipse / closePath` | `ctx.translate / rotate / scale` 顺序调用 |
| Skia / PDF | 同 canvas，调对应原生 API | 同 canvas |

### B. 保留字符串，在 core 提供 parser

`PathPrim.d: string` 不变，在 core 加 `parsePathD(d: string): Array<PathCommand>` 让 adapter 选择性使用。

- 优点：现有代码完全不动；adapter 自由选择"直接消费字符串还是结构化"
- 缺点：双源——字符串 + 结构化 / parser 之间维护成本；core 既要保证 d 字符串构造正确，又要保证 parser 与之兼容；SVG-only 细节（A 命令 flag）仍在 core 层（构造端 + parser 端两份）；不解决 GroupPrim 的同样问题

### C. 双源同步

`PathPrim` 同时携带 `d: string` 和 `commands: Array<PathCommand>`。

- 优点：adapter 可挑用任一形态
- 缺点：双源同步——两个表达必须一致，任何 emit / round trip 改动需要同时更新两边；测试面 ×2；core 仍依赖 SVG mini-language 知识

## 决策：A（全结构化）

理由：

1. **跨 adapter 是 retikz 第一原则**——B / C 都让 core 继续依赖 SVG mini-language 知识，背离 DESIGN.md §4.5 "core 不假定任何具体渲染端"
2. **双源是已知错误模式**——字符串 + 结构化双源同步问题在很多项目反复出现；保持单源（结构化）最稳
3. **`arcSvgFlags` 顺手清理**——A 让 SVG-only flag 计算自然落进 react adapter，`core/geometry/` 回归"跨平台纯数学"定位（[TODO-5](../../../plans/v0/v0.1-alpha.5.md) 同步落实）
4. **AI 友好性不削弱**——`PathPrim` / `GroupPrim` 是 Scene primitive，不是 IR；LLM 直接生成的是 IR（`<Path>` / `<Step>` 这一层），不会写 PathCommand[]。所以这层结构化对 LLM 输入面无影响

## 决策细节

> 选项 A 主决策之外，以下字段细节均按推荐方案拍板。下游 implement 阶段按此执行。

- **arc / ellipseArc 角度单位 = 度**：与 IR `ArcStep.startAngle` 一致，跨 adapter 兼容性最好（canvas `ctx.arc` 用弧度，由 adapter 内部转换）。`ellipseArc.rotation` 同样用度
- **arc 方向字段 = `counterClockwise: boolean`，缺省 `false`**：canvas / Skia / 多数非 SVG adapter 习惯；缺省 CW 与 SVG y-down 屏幕方向一致
- **`arc` 与 `ellipseArc` 分开**：不合并；与 canvas `ctx.arc` vs `ctx.ellipse` 一一对应；rx === ry 的退化检测在 SVG adapter 内做
- **`circlePath` / `ellipsePath` → 1 个 `ellipseArc` 全 sweep（不拆半弧）**：把"如何渲染整圆/椭圆"留给 adapter——SVG renderer 在需要时拆半弧避 A 命令 360° 退化，canvas 直接 `ctx.ellipse` 整圈不需要拆
- **SVG fast-path helper 不放 core**：core 不提供 `pathCommandsToSvgD(commands): string`；SVG 转换逻辑全部住 react adapter，避免 core 被 SVG 偏向
- **不 emit `boundsHint`**：path bbox 仍由 viewBox 计算阶段算出；性能优化超出本 ADR 范围，另开 ADR
- **`Transform.scale.y` 缺省等比缩放**：`{ kind: 'scale', x: 2 }` 等价于 `{ kind: 'scale', x: 2, y: 2 }`——意图通常是"整体放大"
- **`Transform.rotate.cx/cy` 缺省绕原点 `(0, 0)`**：与 SVG `rotate(deg)` 三参省略行为一致

## DSL 表面

React 用户**零感知**——IR / DSL / 组件 API 全不变。

```tsx
// 用户写法完全不变（alpha.4 现有 demo 任一段）
<Tikz>
  <Node id="A" position={[0, 0]}>A</Node>
  <Node id="B" position={[3, 1]}>B</Node>
  <Path>
    <Step kind="move" to="A" />
    <Step to="B" />
  </Path>
</Tikz>
```

变化在 **Scene primitive** 层（adapter 作者感知）：

```ts
// 旧 PathPrim
{ type: 'path', d: 'M 0 0 L 3 1', stroke: '#000' }

// 新 PathPrim
{
  type: 'path',
  commands: [
    { kind: 'move', to: [0, 0] },
    { kind: 'line', to: [3, 1] },
  ],
  stroke: '#000',
}
```

GroupPrim 同理：

```ts
// 旧
{ type: 'group', transform: 'rotate(30 0 0) scale(2 2)', children: [...] }

// 新
{
  type: 'group',
  transforms: [
    { kind: 'rotate', degrees: 30, cx: 0, cy: 0 },
    { kind: 'scale', x: 2, y: 2 },
  ],
  children: [...],
}
```

## 测试设计

`packages/core/tests/compile/path.test.ts`（已存在，cascade 更新断言从 d 字符串改为 commands 数组）+ `packages/core/tests/compile/node-style.test.ts`（旋转节点 transform 断言改 transforms 数组）+ `packages/react/tests/render/path-d-builder.test.tsx`（新）+ `packages/react/tests/render/transform-builder.test.tsx`（新）覆盖：

- **PathCommand 每种 kind 构造**：move / line / quad / cubic / arc / ellipseArc / close
- **PathCommand → SVG d 字符串转换**：每种 kind 单独 + 组合段
- **Transform → SVG transform 字符串转换**：translate / rotate / scale 单独 + 组合
- **空 commands / 空 transforms 退化**：空数组合法处理
- **arc 边界角度**：startAngle 0、endAngle 360、负角度 wrap
- **ellipseArc 退化 rx=ry**：仍按 ellipseArc 处理，不强制转 arc
- **rotate 带 cx/cy vs 不带**：SVG 字符串构造正确性
- **scale 带 y vs 不带 y**：缺省等比 vs 显式异比

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/primitive/path.ts`**：`PathPrim` 类型重定义（`d: string` 删 / `commands: Array<PathCommand>` 加）+ 新增 `PathCommand` union 导出
- **`packages/core/src/primitive/group.ts`**：`GroupPrim` 类型重定义（`transform?: string` 删 / `transforms?: Array<Transform>` 加）+ 新增 `Transform` union 导出
- **`packages/core/src/index.ts`**：公开 API 新增 `PathCommand` / `Transform` 导出
- **`packages/core/src/compile/path.ts`**：全面重写，所有 step kind 改为推 PathCommand[] 而非拼字符串；删除字符串拼接相关辅助函数
- **`packages/core/src/compile/node.ts`**：rotate 节点 emit 时从拼 transform 字符串改为推 transforms 数组
- **`packages/core/src/geometry/arc.ts`**：删 `arcSvgFlags`（移到 react adapter，配套 [TODO-5](../../../plans/v0/v0.1-alpha.5.md)）
- **`packages/react/src/render/path-d-builder.ts`**（新）：`Array<PathCommand>` → SVG d 字符串；内含原 `arcSvgFlags` 等价逻辑
- **`packages/react/src/render/transform-builder.ts`**（新）：`Array<Transform>` → SVG transform 字符串
- **`packages/react/src/render/renderPrim.tsx`**：path / group 渲染分别调用对应 builder
- **`packages/core/AGENTS.md`** "Scene 编译器" 段加一条："PathPrim / GroupPrim 用结构化 commands / transforms 而非 SVG 字符串；adapter 在 render 时转原生 API"
- ⚠️ **BREAKING**：消费 Scene primitive 的 adapter 作者（目前只有 `@retikz/react`）需同步更新；React 用户 / IR 用户 / LLM 生成端**零感知**
- 文档站不需要改——`PathPrim` / `GroupPrim` 是 adapter 内部契约，用户不感知

## 不在本 ADR 范围

- **其他 primitive 类型审计**：`RectPrim` / `EllipsePrim` / `TextPrim` 经审无 SVG 字符串 leakage（字段全是结构化数值 / 嵌套对象）
- **`boundsHint` 等性能优化字段**——超出范围，另开 ADR
- **canvas / Skia / PDF adapter 的实际实现**——本 ADR 只奠定基础，adapter 包是 v1+ 工作
- **TextPrim 多行 / `<tspan>` 表达**——TextPrim 已是结构化 `lines: Array<TextLine>`，无需改
- **IR 层 `IRStep.kind: 'arc' / 'circlePath' / 'ellipsePath'` 设计**——保持现状，本 ADR 只动 Scene primitive 表达

---

## 实现契约（必填）

### Level

`red`

判级依据：

- 动 `packages/core/src/primitive/**`（PathPrim / GroupPrim 类型定义）
- 动 `packages/core/src/compile/**`（path.ts 全重写、node.ts 局部）
- 动 `packages/core/src/index.ts`（公开 API 加 export）
- 跨级取最高 = red

### Schema 改动

Scene primitive 不用 zod schema（它们是 TS 类型）；本表是 TypeScript 类型契约。

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/primitive/path.ts` | 删 | `PathPrim.d` | `string` | — | 删除 SVG path d 字符串字段 |
| `packages/core/src/primitive/path.ts` | 加 | `PathPrim.commands` | `Array<PathCommand>` | — | 结构化 path 命令数组，按顺序绘制 |
| `packages/core/src/primitive/path.ts` | 新建类型 | `PathCommand` | discriminated union | — | move / line / quad / cubic / arc / ellipseArc / close 七种 kind |
| `packages/core/src/primitive/group.ts` | 删 | `GroupPrim.transform` | `string?` | — | 删除 SVG transform 字符串字段 |
| `packages/core/src/primitive/group.ts` | 加 | `GroupPrim.transforms` | `Array<Transform>?` | `undefined` | 结构化 transform 数组，按顺序应用 |
| `packages/core/src/primitive/group.ts` | 新建类型 | `Transform` | discriminated union | — | translate / rotate / scale 三种 kind |

### 文件 scope

允许触碰的文件白名单：

- `packages/core/src/primitive/path.ts`（修改）
- `packages/core/src/primitive/group.ts`（修改）
- `packages/core/src/primitive/index.ts`（barrel 加 export）
- `packages/core/src/index.ts`（公开 API 加 `PathCommand` / `Transform`）
- `packages/core/src/compile/path.ts`（重写）
- `packages/core/src/compile/node.ts`（rotate emit 分支局部改）
- `packages/core/src/geometry/arc.ts`（删 `arcSvgFlags`，与 TODO-5 同步）
- `packages/core/tests/compile/path.test.ts`（更新断言）
- `packages/core/tests/compile/node-style.test.ts`（更新 rotate 断言）
- `packages/core/tests/geometry/arc.test.ts`（删 `arcSvgFlags` 测试）
- `packages/react/src/render/path-d-builder.ts`（新）
- `packages/react/src/render/transform-builder.ts`（新）
- `packages/react/src/render/renderPrim.tsx`（修改）
- `packages/react/tests/render/path-d-builder.test.tsx`（新）
- `packages/react/tests/render/transform-builder.test.tsx`（新）
- `packages/react/tests/render/renderPrim.test.tsx`（如需更新 SVG 输出快照）
- `packages/core/AGENTS.md`（Scene 编译器段加一条）

偏离白名单的改动需要：

- 加新条目到本 ADR 的"实现契约 → 文件 scope"段，并自我注解"为什么扩展 scope"
- 或开新 ADR

### 测试象限

#### Happy path（≥ 3）

- `pathCommand_move_line_close_basic`：commands = `[move(0,0), line(10,0), close]` → SVG d = `"M 0 0 L 10 0 Z"`
- `pathCommand_cubic_curve_basic`：commands = `[move(0,0), cubic(c1=[3,3], c2=[7,-3], end=[10,0])]` → SVG d 含 `"C 3 3 7 -3 10 0"`
- `transform_translate_rotate_chain`：transforms = `[translate(10,20), rotate(30)]` → SVG transform = `"translate(10 20) rotate(30)"`
- `arc_ccw_half_circle`：commands = `[arc(center=[0,0], radius=5, startAngle=0, endAngle=180, counterClockwise=false)]` → SVG d 对应正确 A 命令 + flags

#### 边界（≥ 2）

- `pathCommand_empty_commands`：commands = `[]` → SVG d = `""`，PathPrim 仍可渲染（不抛错）
- `arc_full_sweep_circle`：arc startAngle=0 / endAngle=360 → SVG d 拆成两个半弧避 A 命令 360° 退化；canvas adapter 直接 `ctx.arc` 整圈
- `transform_empty_transforms`：transforms = `undefined` 或 `[]` → 不输出 transform 属性

#### 错误路径（≥ 2）

- `pathCommand_unknown_kind_throws`：未来扩展新 kind 时未识别 kind 应在 path-d-builder 抛错（防御性 exhaustive switch）
- `arc_negative_radius_rejected`：arc radius < 0 在 PathCommand 构造点拒绝（TS 类型上 `radius: number`，运行时 assert 由 compile/path.ts 把关，不允许负值进 PathCommand[]）

#### 交互（≥ 2）

- `node_rotated_emits_transforms_array`：旋转 node 的 GroupPrim 的 transforms 数组包含 rotate kind（而非 transform 字符串），与原 SVG transform 字符串渲染结果视觉等价
- `pathPrim_in_rotated_parent_group`：path 在 rotated group 内时整体渲染正确——commands 不动，group transforms 作用于整体
- `circlePath_emits_single_ellipseArc_full_sweep`：IR `<Step kind="circlePath" radius={5} />` 编译为单个 `ellipseArc` 全 sweep PathCommand（不再 emit 两个半弧）；SVG adapter 在 path-d-builder 内识别全 sweep 退化为两个半弧

### 依赖现有元素

- `packages/core/src/primitive/scene.ts` 的 `ScenePrimitive` union —— 引用：PathPrim / GroupPrim 类型在 union 内更新
- `packages/core/src/geometry/arc.ts` 的 `arcEndPoint` / `arcBoundingPoints` —— 引用：compile/path.ts 用于 bbox 计算 + path-d-builder 用于 A 命令端点计算时仍调用
- `packages/core/src/geometry/arc.ts` 的 `arcSvgFlags` —— **修改 / 移除**：本 ADR 显式删除并移到 `packages/react/src/render/path-d-builder.ts`
- `packages/react/src/render/renderPrim.tsx` —— 修改：path / group prim 分支接入新 builder
- `packages/core/src/compile/precision.ts` 的 `makeRound` —— 引用：path-d-builder / transform-builder 内做坐标精度截断

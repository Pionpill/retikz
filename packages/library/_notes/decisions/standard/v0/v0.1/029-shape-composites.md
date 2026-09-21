---
description: 将 React 专属形状 Sugar 迁为 Standard 的独立 Tier 2 形状，统一 JSON、Vanilla shape.xxx 与 React 入口，并区分节点形状扩展
keywords: 形状、shape、Circle、Ellipse、RegularPolygon、Sector、Tier2、Vanilla、lowering
---

# ADR-029：统一 Standard 形状 Tier 2 契约与多端入口

- 状态：Accepted（2026-09-19，人工接受并要求执行；不表示实现完成）
- 决策日期：2026-09-19
- 关联：[v0.1 roadmap](./roadmap.md) · [直接 Definition 接入](./021-direct-definition-loading.md) · [Core 与 Standard 边界](./023-core-minimal-builtins-and-standard-provider-entrypoints.md) · [节点 Sector](./025-sector-shape-unification.md) · [Standard 设计](../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景与目标

Circle、Ellipse、Rectangle、RegularPolygon、Star、Arc、Sector 当前是 Kernel React 的 Path Sugar。几何意图在 JSX 展开时就变成 Path steps，Vanilla 没有对应的具名作者入口，持久化 JSON 也无法保留“画圆”“画星形”等高层语义。参数转换和组合几何因而依附于 React，难以作为统一契约供 LLM、无框架作者和其它绘图组件消费。

将这七种形状统一为 Standard 的宿主无关 Tier 2 composite。JSON 保存作者的几何意图，Vanilla 与 React 使用相同输入语义，最终通过公开 Core composite 机制展开成普通 Path。Core 仍拥有路径、坐标引用、编译、Scene 与 renderer-neutral 输出；不增加 Core 顶层形状实体。

## 决策：形状家族拥有独立 composite，作者 API 按家族分组

`@retikz/standard` 拥有每种形状的 Source schema、factory、Definition、provider 与 lowering。形状家族与呈现家族同属 Standard 的 Tier 2 composites；形状算法不得继续由 React 或 Vanilla 分别实现。

每种形状使用独立的 `namespace: 'standard'` 与 `type`，直接复用 Core 的 `defineComposite`、registry、provider dependency graph 与 compile options。`shape` 是 Vanilla 的静态函数分组，不是新的 IR 判别层、运行时 registry 或动态加载器。

| 形状           | Composite type   | Vanilla 入口                      | React 入口       |
| -------------- | ---------------- | --------------------------------- | ---------------- |
| 圆             | `circle`         | `shape.circle(id, input)`         | `Circle`         |
| 椭圆           | `ellipse`        | `shape.ellipse(id, input)`        | `Ellipse`        |
| 矩形           | `rectangle`      | `shape.rectangle(id, input)`      | `Rectangle`      |
| 正多边形       | `regularPolygon` | `shape.regularPolygon(id, input)` | `RegularPolygon` |
| 星形           | `star`           | `shape.star(id, input)`           | `Star`           |
| 圆弧／椭圆弧   | `arc`            | `shape.arc(id, input)`            | `Arc`            |
| 扇形／环形扇区 | `sector`         | `shape.sector(id, input)`         | `Sector`         |

使用 `regularPolygon` 明确其正多边形约束，不提供暗示任意顶点输入的 `polygon` 别名。Vanilla 的 `@retikz/standard-vanilla/shape` 子入口只公开 `shape` 下的这些构造方法，不并行导出顶层 `circle()` 等同义入口。React 保持具名组件，由 `@retikz/standard-react/shape` 导出。

新增形状继续定义独立 composite，第三方使用同一 Core 扩展路径；不要求扩充封闭的 Core 形状枚举，也不向 `shape` 对象动态注册属性。

## 基础数据结构与公开契约

### 持久化与 authoring

每种形状沿用 Standard 的独立能力导出模式：例如 `CircleSchema`、`IRCircle`、`createCircle`、`CircleDefinition`、`CircleProvider` 从 `@retikz/standard/shape` 子入口导出，其余形状对应命名。三个包的根入口均不重复导出形状家族；节点形状扩展独立使用 `@retikz/standard/node-shape`，不保留旧入口别名。factory 接收省略 composite 判别字段的 Source 数据，保留紧凑输入，不提前生成路径步骤。

```ts
// 持久化 Source IR
const circle = {
  namespace: 'standard',
  type: 'circle',
  id: 'c1',
  center: [0, 0],
  radius: 40,
  style: { fill: 'lightblue' },
};

// 无框架 authoring
import { shape } from '@retikz/standard-vanilla';

shape.circle('c1', { center: [0, 0], radius: 40 });
shape.ellipse('e1', { center: [100, 0], radius: { x: 50, y: 30 } });
```

`InputCircle` 等 authoring 类型属于 Standard Vanilla；持久化 `IRCircle` 等类型从 Standard schema 派生，不另建 Input schema。Vanilla 返回沿用既有协议的 `InputEmbed`，对应 `CircleInputEmbedAdapter` 等 adapter 构造 Source IR 并贡献所需 provider；纳入既有 `StandardInputEmbedAdapters` authoring 集合。该集合不成为全量 compile preset。

React props 接入对应 Vanilla Input 和同一 InputEmbed adapter。`<Circle id="c1" center={[0, 0]} radius={40} />` 与上例具备相同的 Source 几何、最终 Path identity、Scene 和诊断；React 不直接拼 Path、不重新做几何转换。事件与 ref 等宿主对象仍由 adapter 消费，不写入 Source IR。

Vanilla 第一个 `id` 同时确定 embed identity 与形状公开 `id`，第二个参数不重复声明 `id`。React 使用显式 `id`，省略时沿用现有宿主 occurrence 规则，不把隐式 occurrence id 持久化为公开几何 id。

### 几何输入

每个形状接受以下互斥几何描述，不能混用多套尺寸后靠字段优先级猜测意图。所有形式均可由 JSON、Vanilla 与 React 表达。

| 形状           | 几何描述与默认                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Circle         | `center + radius`、`center + diameter`、直径端点 `from + to`、包围盒 `corner1 + corner2` 或 `box` 五选一；盒拟合 `fit` 缺省为 `contain`，`cover` 取较长边       |
| Ellipse        | `center + radius: { x, y }`、`center + diameterX + diameterY`、`corner1 + corner2` 或 `box` 四选一；按盒的两轴拟合                                              |
| Rectangle      | `corner1 + corner2`、`center + width + height`、`center + side` 或 `corner1 + width + height` 四选一；`cornerRadius` 缺省为零，圆角夹紧沿用 Core rectangle step |
| RegularPolygon | `center + sides` 加 `radius` 或 `sideLength` 二选一；`sides` 为至少 3 的整数，默认首顶点角为 −90°                                                               |
| Star           | `center + outerRadius + points` 加 `innerRadius` 或 `innerRatio` 二选一；两者均省略时比例为 0.5，`points` 为至少 2 的整数，默认首外顶点角为 −90°                |
| Arc            | `center + radius`，半径为数字或 `{ x, y }`；角度必填，`close` 缺省 `open`，还可为 `chord`、`sector`                                                             |
| Sector         | `center + radius`，角度必填；省略 `innerRadius` 为实心扇形，内半径与外半径同为数字或同为 `{ x, y }` 时表达环形扇区                                              |

Circle / Ellipse 的 `box` 接受 `{ x, y, width, height }` 或 `{ origin: [x, y], width, height }`。盒及盒对角点形式支持互斥的 `inset` / `outset`；其它形式不接受这两个字段。Circle 的 `fit` 也仅用于盒及盒对角点形式。调整量为有限非负数；调整后盒必须仍有正宽高。

角度使用度数、沿用 Core 的坐标与有向弧语义。`startAngle`、`endAngle`、`sweepAngle` 恰给两个；不取模改变 sweep 方向或圈数。Circle / Ellipse 也可不提供任何角度，此时绘制完整闭合轮廓；提供角度时 `closed` 缺省 `chord`，另可选 `open`、`sector`。无角度时不接受无效的局部闭合配置。Arc / Sector 必须提供角度组合。

半径、直径、边长和尺寸使用有限非负数，零值不被默认值替换；底层零长度路径的行为沿用 Core。Star 的内半径不得大于外半径，比例位于 `[0, 1]`；Sector 内半径逐轴不得大于外半径，零内半径按实心扇形处理，双轴一零一正的内椭圆不合法。正厚度环形扇区的内外弧方向相反；零厚度保持路径绘制语义，不套用节点 Sector 的特殊透明填充规则。

直接交给 Core 解析的坐标保留 `IRTarget`：Circle / Ellipse 的中心半径或直径形式、Rectangle 的双角点形式、Arc 的中心、实心 Sector 的中心。Ellipse 的中心在三端统一开放为 Core Target，不保留旧 React 类型允许而运行时拒绝的差异。

需要 Standard 自行计算坐标的输入限字面笛卡尔坐标：盒、直径端点、带宽高或边长的 Rectangle、RegularPolygon、Star、正内半径的 Sector。其它 Target 使用直接可表达该语义的 Core Path；不得偷偷从 DOM 或 renderer 反查节点位置。Vanilla 的 Target 便利写法通过既有 Vanilla 规范化进入 Core Source Target。

### 下层 Path 契约

每个形状输出一个普通 Stroke Path，几何步骤由该形状拥有，不接受用户 `children` 覆盖；`namespace`、`type` 为 composite 判别字段，不提供 Path `kind` / `kindOptions` 入口。自定义 Path kind 继续通过 Core Path 表达。

除此之外复用 Core Path 的公开实例、样式、描边、填充、箭头、marks、动画、圆角、缩放、标签和元数据语义，不以旧 Sugar 的局部字段白名单冻结公共能力。需要明确区分的两个语义保留如下：

- RegularPolygon / Star 的 `rotate` 是绕给定几何中心的首顶点角，缺省 −90°；该值只作用一次，不再作为 Path 包围盒旋转重复应用。其它形状的 `rotate` 沿用 Path 包围盒中心旋转；`scale` 均沿用 Path。
- Arc / Sector 的 `label` 属于圆弧段，Sector 的环形形式只标注外弧；其余形状的 `label` 使用 Path host label。Source 使用 Core JSON-safe label，Vanilla 便利形式由 adapter 转换。

Path 的显式 `id`、`meta`、`zIndex` 直接承接形状实例；不额外生成 Scope 或 Node，不赋予 Path 节点锚点、文字自适应或新的端点寻址能力。父 Scope 的 namespace、变换、样式继承、Theme、裁剪与重复 id 规则继续由 Core 解释。Composite 的 owner provenance 可保留其类型，但不另造一套几何索引或手动覆写用户 meta。

## 行为、失败语义与兼容性

- 直接编译 JSON 时显式提供所需 `XxxDefinition`；React / Vanilla 经现有 provider graph 贡献实际使用的依赖。导入 `shape` 不执行注册，不自动装配全部形状，不承诺对象分组必然能被所有 bundler 按方法 tree-shake。
- 缺失 Definition、provider 冲突、Target 未解析及下层编译错误沿用 Core 的诊断策略，不静默换成其它形状。外部 JSON 的字段、互斥组合和数值不变量由 Source schema 入口校验；内部仅检查上下文相关不变量。
- Standard 自身新建的语义错误使用包级 `RetikzStandardError`，携带形状与字段上下文；外部回调异常保持 cause。adapter 不重复建立语义校验及不同默认值。
- 当前正常有效输入迁移后保持几何与样式语义；多套几何同时输入、原来被忽略的无效字段和不合法半径关系改为明确拒绝。跨端差异以本 ADR 的统一 Source 契约为准。
- Kernel React 删除上述七个 Sugar 及专属 Props／helper 导出，消费者改从 Standard React 导入；不保留旧名转发、兼容 wrapper 或隐式安装。Core 原有 Path steps 与内置 Node shapes 保持归属不变。
- `@retikz/standard/node-shape` 的节点 ShapeDefinition 与本 ADR 的 composite 是两种契约；例如 `SectorShapeDefinition` 继续服务 Node，`SectorDefinition` 服务独立路径绘制。节点形状的尺寸、边界和 anchor 规则不由本 ADR 修改。
- 本 ADR 在落地时替代 ADR-025 中“Arc 保留在 Kernel React”的归属结论；ADR-025 的节点 Sector 统一契约继续有效。
- Standard 与 Kernel 分别使用既有 release group；入口移除与消费方依赖升级须作为同一次迁移闭环安排，不把当前 ADR 写入视为发布或实现完成。

## 文档组织

Standard 侧栏顺序为“展现 → 形状 → 扩展”。“形状”组包含圆／椭圆、矩形、正多边形、星形、圆弧／扇形五篇用法文档；圆弧与扇形合篇。每篇说明 JSON、Vanilla `shape.xxx` 与 React 的相同契约、默认值和必要交互示例。

现有“扩展 → 形状”改名为“节点形状”，继续负责 Node ShapeDefinition。Kernel Path 只保留底层路径能力及 Standard 链接，不再拥有独立“形状绘制”用法页；相关 Sugar API 参考和组合原理随 owner 迁移，Core steps 的参考和原理仍留在 Kernel。中英文导航、正文、示例和 LLM 文档索引保持一致。

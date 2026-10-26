---
description: 分离路径端点箭头与任意位置标记，箭头负责接触与截断，标记只放置基础图元并可复用已注册箭头
keywords: arrow、marks、MarkDefinition、端点截断、弧长、路径标记
---

# ADR-075：分离路径端点箭头与沿线标记

- 状态：Accepted
- 决策日期：2026-10-25
- 关联：[roadmap](./roadmap.md) · [绘图完备](../../../architecture/core-drawing-complete.md) · [基础图元](./070-marker-scene-primitives.md) · [宿主默认](./067-host-owned-defaults.md) · [绘制属性](./072-complete-drawing-property-propagation.md)
- 替代关系：替代 [v0.2/025](../v0.2/025-curve-transform-marking.md) 中仅允许箭头标记、按段参数定位的规定，[034](./034-path-endpoint-arrow-overlap.md) 中以 mark 承载端点重叠的输入形式，以及 [067](./067-host-owned-defaults.md) 中根据 mark 位置应用端点默认的规定；保留端点重叠几何及 [v0.2/023](../v0.2/023-arrow-definition.md) 的箭头注册与接触几何能力，并继续遵守 [070](./070-marker-scene-primitives.md) 的基础图元和资源契约

## 背景与目标

端点箭头与沿路径标记都能绘制箭头外观，但前者需要根据尖端、接触点及包络调整路径，后者只需在指定位置放置内容。通过标记的位置推断其是否为端点箭头，会使位置变化额外改变路径几何，并使同一位置多个标记的行为依赖声明顺序。

本决策将两者在 Source IR、schema 和作者 props 中分开。箭头只存在于起点与终点；标记可以位于包括两端在内的任意位置。标记能够复用任意已注册箭头的外观，但普通标记不自动获得箭头接触与截断能力。

## 决策：独立声明职责，组合共享外观

Path 使用 `arrow` 声明端点箭头，使用 `marks` 声明沿线标记。`arrow.start` 与 `arrow.end` 的存在分别启用起点与终点箭头，缺省不创建。`marks` 中的位置永远不用于推断端点箭头，不参与宿主路径截断或端点补偿。

Core 拥有两类输入、定义注册、定位及编译语义。Vanilla 和 React 等价暴露同一结构；Render 只执行编译后的基础图元和既有端点箭头结果，不接收定义回调或重新判断标记类别。

普通标记通过 `MarkDefinition` 输出局部坐标中的 `Iterable<ScenePrimitive>`。箭头定义组合该生成契约并增加端点接触与截断几何；已注册箭头自动进入标记名称空间，不要求第二次注册。所有标记按同一生成与放置流程消费，不通过 kind 区分内容。标记的位置、朝向及缩放由放置契约管理，内容中的几何、文字、样式、变换、动画与资源沿用基础图元语义。

端点和标记的 schema 独立组合真实共享的箭头外观、基础值域和绘制字段，再从 schema 派生 IR 类型。端点重叠只属于端点箭头；普通标记不携带接触点、后缘或截断参数。不存在通过继承整个箭头契约获得标记能力的要求。

## 基础数据结构与公开契约

### 路径声明

以下为新增或调整字段的最小形态；`IRArrowStyle` 继续代表箭头形状、尺寸和外观，`JsonObject` 代表既有 JSON 对象值域：

```ts
type IRPathArrow = {
  start?: IRArrowStyle & { endpointOverlap?: number };
  end?: IRArrowStyle & { endpointOverlap?: number };
};

type IRPathMark = {
  pos: number;
  rotate?: 'auto' | number;
  scale?: number;
  shape?: string;
  length?: number;
  width?: number;
  params?: JsonObject;
  // 其余共享外观字段由 IRMarkStyle 组合
};

// Path 独立字段
// arrow?: IRPathArrow
// marks?: Array<IRPathMark>
```

`pos` 为闭区间 `[0, 1]` 的有限数，表示整条定位路径的累计弧长比例。`rotate` 默认 `auto`，使局部正 x 方向沿路径前进切线；数值表示在路径局部坐标系中的固定角度，单位为度，随后仍随 Path 和 Scope 的整体变换。`scale` 为正有限数，默认 1，是放置层的统一缩放。

普通标记与箭头共享局部基准尺寸、长度、宽度、线宽缩放和空心处理规则，统一由 length / width、单一 scale 和宿主 strokeWidth 决定最终尺寸。普通标记的 anchor 默认位于基准正方形中心，也可显式指定；已注册箭头作为标记时，以尖端及轴线为锚点。箭头标记不会在路径起点自动反向；起点端点箭头仍按既有向外规则定向。需要反向的标记由内容定义或显式固定角度表达。

`endpointOverlap` 保持 `[0, 1]` 的既有端点重叠含义，默认 0，仅在 `arrow.start` / `arrow.end` 合法。两个端点各最多一个箭头；任意数量的普通标记可与端点箭头共存。

```ts
{
  arrow: { end: { shape: 'stealth' } },
  marks: [
    { pos: 0, shape: 'checkpoint' },
    { pos: 0.5, shape: 'customArrow' },
    { pos: 1, shape: 'checkpoint', params: { radius: 3 } },
  ],
}
```

### 普通标记定义

Core 内置 `times`、`plus`、`check` 与 `star` 四种普通标记，分别绘制叉号、加号、对勾和五角星。前三者以描边表达，星形以填充表达；均采用基准正方形中心锚点，复用普通标记的注册、样式与放置契约。形状不绑定业务状态或固定颜色，也不引入专属旋转规则。

```ts
type MarkEmitContext = {
  params: JsonObject;
  stroke: PaintValue;
  fill: PaintValue;
  lineWidth: number;
  // 共享描边字段：dashPattern、dashOffset、lineCap、lineJoin
  round: (value: number) => number;
};

type MarkDefinition = {
  name: string;
  baseSize?: number;
  anchor?: IRPosition;
  hollow?: boolean;
  defaultLength?: number;
  defaultWidth?: number;
  emit: (context: MarkEmitContext) => Iterable<ScenePrimitive>;
};

type ArrowDefinition = Omit<MarkDefinition, 'anchor'> & {
  backX: number;
  lineContactX: number;
  outerInset?: number;
  tipX?: number;
};
```

`defineMark` 提供该定义的类型化声明入口；`CompileOptions.marks` 接受 `Array<MarkDefinition>`。`context.params` 在 params 省略时为空对象，其领域含义由定义负责；JSON 入口保证值可序列化，定义负责解释自有参数并诊断领域错误。定义不进入 IR，IR 不保存回调、ReactNode 或完整 Scene 快照。

`stroke`、`fill`、`lineWidth` 及描边字段提供已解析的样式上下文，`round` 复用编译精度。定义可以消费上下文或返回固定样式；Core 不递归重涂其输出。文本必须满足已有基础文本图元的度量契约。本决策不新增文字布局服务或资源注册旁路。

端点箭头注册表仅包含 ArrowDefinition；标记注册表统一包含普通标记与已注册箭头的图元生成能力。名称在合并后的标记注册表中唯一，跨两类注册项重名也报错。所有实例均通过 shape 选择定义，不设置 kind，也不嵌套 mark 对象。普通标记不能用于端点箭头，未注册名称报错，不回退查找。

### 默认值与共享样式

`defaults.path.arrow` 保留公共箭头外观及 start/end 分支。公共外观用于端点箭头和显式声明的标记；start/end 分支只用于对应的端点箭头，标记位于 0 或 1 时也不读取端点分支。实例外观覆盖适用默认片段，再应用箭头已有的宿主颜色及静态默认规则。

端点重叠可随对应 start/end 默认片段提供，默认片段不能创建端点箭头。标记与箭头共享外观解析，params 由实例或适用默认字段提供，缺省为空对象，不新增通用 mark 样式通道。标记列表为实例内容，不通过 Scope defaults 生成；定义消费的 `contextStroke` 绑定最近的路径宿主。

## 行为、失败语义与兼容性

### 定位与几何

定位路径使用节点边界裁接、路由和倒角后的路径，位于箭头截短与标签断线之前，也位于 Path / Scope 整体变换之前。改变箭头大小或标签断线范围不移动标记；改变路由、倒角或节点几何则重新定位。非均匀整体缩放不会重新按屏幕弧长分布标记，标记与路径共同变换。

多个子路径按声明顺序累计实际绘制段弧长，移动命令的跳跃不计长度，闭合段计入长度。累计距离恰好位于内部段或子路径交界时使用后一非零长度段的起点和前进方向；`pos = 1` 使用最后非零长度段的终点及入射方向。零长度段不占弧长；曲线驻点使用沿前进方向的单侧切线，末端使用入射切线。整个路径没有非零长度时，非空 marks 无法定位，报告领域错误，不静默丢弃。

mark 内容不改变宿主路径命令，不为其遮挡、挖洞或截断。即使标记落在标签断线的空隙中，仍按定位路径绘制。宿主主线和端点箭头绘制后绘制 marks，marks 按列表顺序叠放，路径标签位于 marks 之上；内部图元保留自身既有顺序。

标记的完整变换后可视内容计入宿主布局边界，不能仅计入采样点。内容的裁剪、绘制资源、动画与嵌套图元遵循基础 Scene 契约，不增加标记专属图元联合。合法的渐变、Pattern 和裁剪引用复用当前 Scene 资源命名空间，不允许定义凭空引用未提供的资源。

### 宿主与后端

标记属于所在 Path，命中返回宿主目标；`pointerEvents: 'none'` 仍排除对应内容。内部 id/meta 不创建独立作者元素或可更新的编译节点。复用定义的多个标记实例各有独立图元实例，动画沿用宿主触发上下文；不同宿主的播放状态隔离，不能因复用定义共享可变动画状态。

Core 产出已定位的基础图元。SVG 和 Canvas 消费同一结果，不能用 SVG `marker-mid` 的顶点语义替代任意位置标记。完整编译与增量更新须在路径几何、标记参数或相关定义改变后发布同 revision 的路径、标记、资源及命中结果；无需引入标记专属运行时节点。

### 失败与迁移

外部输入的非法位置、尺寸、角度及多余结构或端点字段在 schema 边界拒绝。未注册名称、无可定位路径、缺失或错误种类的资源、依赖循环在 owner 边界诊断，包含宿主位置与标记下标，不返回部分成功 Scene。自定义回调抛错由 Core 错误包装并保留 cause。已类型化内部输出不重复执行结构解析。

这是公开 Source 与作者 API 的 breaking 调整：端点箭头迁入 `arrow.start` / `arrow.end`；删除根据 marks 位置推断端点的逻辑和 marks 上的 `endpointOverlap`。Vanilla / React 保留 `arrow="->"`、`arrow="<-"`、`arrow="<->"` 作为作者侧语法糖，分别归一化为 `{ end: {} }`、`{ start: {} }`、`{ start: {}, end: {} }`；转换由 Vanilla 唯一负责，Core IR 只接受端点对象。`arrowDetail` 与 `arrowPlacement` props 的内容并入端点对象，不保留独立旧字段。已有独立文本 parser 若支持箭头语法，仍由 parser 输出新的端点字段，不能重新生成端点 marks。

marks 项直接包含 pos、shape、尺寸、外观、rotate 和可选 params；删除 kind 与内层 mark，原 name 改为 shape。位置采用整条路径弧长比例，端点位置也不截断。普通定义与箭头定义共用 MarkEmitContext，参数通过 context.params 传入。端点箭头的接触、尺寸和绘制算法保持原能力。React、Vanilla 与 Direct IR 使用同一箭头和标记配置，注册项经过共享编译选项传入，React 不增加仅框架可用的内容类型。

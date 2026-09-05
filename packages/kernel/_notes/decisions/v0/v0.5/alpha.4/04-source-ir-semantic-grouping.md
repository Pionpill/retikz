# ADR-04：Source IR 浅层语义分组

- 状态：Proposed
- 决策日期：2026-09-04
- 修订日期：2026-09-05
- 关联：[alpha.4 roadmap](./roadmap.md) · [ADR-03](./03-json-undefined-field-contracts.md) · [v0.5 roadmap](../roadmap.md) · [Core 绘图完备设计](../../../../architecture/core-drawing-complete.md) · [包职能设计](../../../../../../../notes/architecture/package-responsibility-design.md)

## 背景与目标

Core 的 Node、Path 与 Scope Source IR 把结构、identity、几何、视觉覆盖、布局参数、继承默认值和外围元数据收进同一个根对象。同类视觉字段还会在元素、Scope 级联值和 every-X 默认值之间重复出现。现有绘图原子可以复用，但最终 Source 组合仍把不同关注点展开到根层；Scope 的四个默认通道也使用四个平行一级字段。

一级属性数量本身不能作为结构质量或 LLM 生成难度的机械阈值。单纯增加包装层同样会增加路径长度、嵌套选择与无意义空对象。真正的问题是同一个根层同时暴露多个关注点，导致字段归属、同名复用、默认值通道和后续扩展缺少稳定边界。

目标是让 Kernel 的持久化 Source IR 使用浅层、固定语义的一级分组：作者先选择关注点，再选择具体字段；discriminator、identity、主要领域事实和结构入口继续留在根层。分组改变持久化输入、authoring 和消费 Source 的公开接口；等价输入的视觉结果、继承规则、Scene 与 identity 保持稳定。

## 决策：按稳定关注点分组，核心领域事实保留在根层

Kernel Source IR 只在字段形成长期稳定关注点时增加一级分组，并采用全仓固定名称：

- `style`：当前实例的直接视觉覆盖
- `layout`：当前对象的尺寸、间距、内容排布与布局参数
- `theme`：可继承的视觉环境选择器，保持稀疏的 `style` / `mode` 契约
- `defaults`：容器向后代提供的具名默认值通道及其继承屏障

`presentation`、`encoding` 与 `routing` 由拥有对应事实的领域定义；Kernel 不创建无语义的包装对象。这里的 `style` 命名约束作用于 Node、Path 与 Scope 的实例覆盖入口，不借此次分组改写其它 owner 的 Theme、selector rules 或既有 `appearance` 契约。Core `theme` 继续选择视觉环境，`defaults` 继续提供后代默认值，两者不合并为整棵 Source 的稀疏副本。

分组不是封装所有字段的通用 `config`。下列内容继续位于对象根层：

1. `type`、内部 `kind`、`id` 与 provider 选择
2. `position`、`shape`、`boundary`、显式路径 `children`、Scope `children` 等主要绘图事实
3. `text`、`label`、`marks` 等声明内容与装饰结构入口
4. `meta`、`animations`、`zIndex` 等独立实例事实
5. 不属于布局策略的显式几何变换或路径几何参数

新增的关注点与默认通道保持浅层，例如 `style.fill`、`layout.padding`、`defaults.node.style`。既有 paint、font、spacing 等复合字段保留自身结构，不按总路径深度或字段数量继续拆分或扁平化。

理由：

1. `style`、`layout`、`theme` 与 `defaults` 对应作者不同的决策阶段，能减少同层字段竞争，又不会隐藏对象 identity 与主要绘图事实
2. 固定分组名使同义的实例覆盖与布局参数具有稳定路径，不再增加 `visual`、`config`、`options` 等平行入口
3. 浅层分组保留 JSON 可读性和路径可诊断性；机械限制一级字段数或递归拆分只会把复杂度转移到更深路径
4. Core 继续拥有 Kernel Source schema 与 resolve 语义；Vanilla 和 React 只负责等价 authoring 映射，不建立 LLM 专用或 adapter 专用的第二套持久化表示

## 基础数据结构与公开契约

Node 把直接视觉覆盖收进 `style`，把尺寸、间距和文本排布参数收进 `layout`。位置、形状、内容和实例事实仍在根层：

```ts
type IRNode = {
  type: 'node';
  id?: string;
  position: IRPosition | PolarPosition | IRAtPosition | IROffsetPosition | IRBetweenPosition | IRAnchorPosition;
  shape?: IRShapeValue;
  boundary?: IRBoundary;
  cornerRadius?: number;
  rotate?: number;
  scale?: number | IRAxisScale;
  text?: IRTextBlock;
  label?: IRNodeLabel | Array<IRNodeLabel>;
  style?: IRNodeStyle;
  layout?: IRNodeLayout;
  meta?: JsonObject;
  animations?: Array<IRAnimationTrack>;
  zIndex?: number;
};
```

`IRNodeStyle` 组合既有 graphic paint、opacity、stroke width、effects、`dashed` / `dotted` / `dashPattern` / `dashOffset`、`textColor` 与 `font`；`IRNodeLayout` 组合 `minimumSize`、`padding`、`margin`、`align`、`lineHeight` 与 `maxTextWidth`。Node 的 `shape`、`boundary`、`cornerRadius`、`rotate` 与 `scale` 仍是显式几何事实。`scale` 保留原有尺寸与连接点语义，不因影响布局而改成布局策略。

Path 把既有 graphic paint、opacity、effects、`strokeWidth`、`dashPattern`、`dashOffset`、`lineCap`、`lineJoin` 与 `fillRule` 收进 `style`。provider 选择、显式步骤、标签、marks、圆角和整体几何变换保持根层：

```ts
type IRPath = {
  type: 'path';
  kind?: string;
  kindOptions?: JsonObject;
  id?: string;
  children?: Array<IRStep>;
  style?: IRPathStyle;
  roundedCorners?: number;
  rotate?: number;
  scale?: IRPathScale;
  label?: IRGeometryLabel | Array<IRGeometryLabel>;
  marks?: Array<IRPathMarkPlacement>;
  meta?: JsonObject;
  animations?: Array<IRAnimationTrack>;
  zIndex?: number;
};
```

通用 Path host 保持 `children` 可选；是否需要步骤、如何解释 `kindOptions` 由所选 Path kind 的完整 subject 契约决定。内置 Stroke 仍要求步骤，不把它的约束提升为所有自定义 kind 的共同约束。

Scope 把当前级联视觉覆盖收进 `style`，把后代默认通道收进 `defaults`；Theme、命名空间、变换、放置、裁剪、包络与 children 继续表达独立容器事实：

```ts
type IRNodeDefault = Pick<IRNode, 'shape' | 'boundary' | 'cornerRadius' | 'rotate' | 'scale' | 'style' | 'layout'>;

type IRPathDefault = Pick<IRPath, 'style' | 'roundedCorners' | 'rotate' | 'scale'>;

type IRScopeDefaults = {
  node?: IRNodeDefault;
  path?: IRPathDefault;
  label?: IRLabelDefault;
  arrow?: IRArrowDefault;
  reset?: boolean | Array<StyleChannel>;
};

type IRScope = {
  type: 'scope';
  id?: string;
  theme?: IRTheme;
  style?: IRCascadingGraphicStyle;
  defaults?: IRScopeDefaults;
  localNamespace?: boolean;
  transforms?: Array<IRTransform>;
  placement?: IRScopePlacement;
  clip?: IRClip;
  boundingShape?: ScopeBoundingShapeValue;
  children: Array<IRChild>;
  meta?: JsonObject;
  animations?: Array<IRAnimationTrack>;
  zIndex?: number;
};
```

上述类型表示公开字段关系；持久化类型仍由各自 schema 派生。`IRNodeDefault` 与 `IRPathDefault` 复用元素的命名分组，只包含明确允许继承的视觉、布局与几何字段。`defaults.label` 与 `defaults.arrow` 保留既有小型契约，不增加单独的 `style` 包装，也不扩大默认值覆盖面。

Node、Path 的 `style` 字段集合各有边界；Scope `style` 只包含既有可级联的 `color`、`stroke`、`fill`、`strokeWidth`、`opacity`、`fillOpacity` 与 `strokeOpacity`，不因同名而接受完整 Node / Path 样式。

React `Layout` 同时是 Scene host，现有 `style` 表示宿主 CSS，不能改写为 Core graphic style。它通过一个明确的隐式根 Scope 输入承载分组后的级联值：

```ts
type LayoutProps = {
  rootScope?: Pick<InputScope, 'style' | 'defaults'>;
  style?: CSSProperties;
  // existing host and compile props
};
```

`rootScope` 是 React JSX authoring 的便利入口，直接复用 Vanilla `InputScope` 的字段，不新增框架私有的 Input 模型。Vanilla 使用等价的显式 Scope；完整 Direct IR 自行表达该 Scope，不增加 `Scene.rootScope`。`Layout` 同时提供完整 `ir` 与有效 `rootScope` 覆盖时，沿用完整 IR 优先、忽略 authoring 覆盖并在开发环境提示的行为。宿主 CSS `style` 继续独立生效。

React `Graph` 是显式语义容器，其 `style` 与 `defaults` 直接采用 Graph Source 的绘图契约，standalone 与 embedded 行为一致。移除原 `Graph.style` 的宿主 CSS 语义，不增加 `Graph.rootScope` 或其它平行覆盖入口；宿主 CSS 由外层 DOM 或 `Layout.style` 承担。Graph 自身仍下沉为一个 Scope，不因分组增加容器或改变 identity。

没有覆盖时不因 `rootScope` 包装产生新的 Scope 或 identity 层级：省略、空对象、只有空的分组或默认通道，以及只有 optional `undefined` 的覆盖都等价于没有提供；单独的 `reset: false` 或空 reset 通道数组也不建立隐式 Scope。已经显式声明的 Source Scope 保持其结构，不作空容器删除。font 等既有复合叶子是否产生覆盖仍遵循原契约，不递归清除空对象。

Scene 根保持现有字段集合。新 `style`、`layout`、`defaults` 分组使用闭合对象，允许空对象表示没有该类覆盖；空组不清除继承值。缺失与 optional 显式 `undefined` 的合法性遵循 owner Zod schema，解析结果直接进入后续阶段，不在 schema 前后增加通用 JSON 快照、清理、冻结或二次校验。拒绝未知字段与真实领域非法值的责任继续属于 owner schema。

## 继承与覆盖

分组是字段命名空间，不是新的覆盖单元。对 Node / Path，沿 Scope 层级先应用当前通道的继承屏障，再应用该层通用 `style` 与对应的 `defaults.node` / `defaults.path`，最后应用元素自己的字段。只定义 `style.fill` 不覆盖已经继承的 `style.stroke`；定义 `layout.padding` 不清除其它布局字段。缺失和 optional `undefined` 不覆盖父级值，`0`、`false` 与其它合法显式值继续按原字段语义处理。

新增分组内部按原字段独立决议，既有复合叶子保持原有覆盖粒度：Node 的 `font` 在 Node 默认通道与实例之间仍作为整体覆盖；label 实例字体与有效 label 默认字体继续逐字段补全。paint、shadow、spacing、scale、数组和判别联合不改为通用递归合并，主色派生、透明度与装饰默认值规则也不改变。

`defaults.reset` 只切断指定默认通道的祖先累计值：省略、`false` 或空数组不切断，`true` 切断全部四个通道，通道数组只切断所列通道。当前 Scope 自己的级联字段与默认值在屏障之后生效；Theme 环境不受该屏障重置。label 与 arrow 继续遵循自身通道和宿主主色规则，不复用 Node / Path 的全部覆盖字段。

## 行为、失败语义与兼容性

- 默认行为：省略分组等价于没有该类作者覆盖；字段的既有默认值、Theme / Scope cascade、every-X 优先级、Path provider 解析和 Node 布局结果保持不变
- Source 单一真源：Core schema 只接受分组后的 Source；不同时接受扁平字段和嵌套字段，不增加 alias、fallback、migration schema 或 LLM 专用表示
- resolve 边界：Core resolve 从分组后的 Source 确定有效 style、layout、Theme 与 defaults；Canonical / Resolution 可以按消费需要形成明确投影，但不得成为第二套持久化 schema。对外提供 Source subject 的接口继续保留 Source 形态，不用旧扁平投影伪装兼容
- Scene 边界：Scene primitive、spatial manifest、renderer descriptor、命中、动画与 identity 不增加分组语义；迁移后等价输入的结果保持一致，已有精确增量更新能力不因字段搬迁退化
- 失败与诊断：已迁移的旧扁平字段、错误分组、未知字段和越层字段由 owner schema 在实际 Source 路径上失败；诊断语义保持，字段位置改为新的嵌套路径，不承诺旧路径字符串不变。resolve 不重复校验已由 schema 保证的结构
- 兼容性 / breaking：Node、Path、Scope 及其默认通道的持久化 JSON、公开 Source 类型、直接派生的消费契约和 authoring 字段是 breaking change。迁移字段的旧入口直接删除，不保留兼容模式
- Path 扩展：Path kind definition 的完整 subject schema、`PathKindCompileContext.path` 与 `emitStroke` 输入同步采用分组 Source；`path` 保持源简写可见，`appearance` 保持已解析的宿主外观。内置与自定义共享同一 registry、校验与 dispatch，不能仅为内置 kind 保留旧字段处理
- Vanilla 等价性：Vanilla 仍是 authoring Input 到 Core Source IR 的唯一 normalize owner；schema-backed 视觉、布局与默认值输入映射到同名分组，既有 sugar 只能生成该 Source，不能恢复扁平持久化形态
- React 等价性：React 把 JSX、children、事件与宿主字段映射到 Vanilla Input；Node、Path 与 Scope 语义组件复用同一分组契约。`Layout.style` 继续表示宿主 CSS，隐式根 Scope 的覆盖统一进入 `rootScope: { style?, defaults? }`；旧的扁平 Scope style / every-X props 直接删除。宿主字段不进入 Core Source
- 跨包约束：直接组合 Core 字段的公开契约、Core Source producer 与 lowering 必须同步适配，并保留原 owner 的禁用字段与角色边界；不能因复用整组而开放原本禁止的字段。领域自己拥有的 IR 分组、Theme 稀疏同构与 selector rules 重设计另由对应 owner 决策，不借此次 Core 消费适配重塑领域能力

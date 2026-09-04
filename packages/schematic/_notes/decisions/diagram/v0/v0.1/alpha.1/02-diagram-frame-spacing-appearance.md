# ADR-02：Diagram Frame、Spacing 与 Appearance

- 状态：Accepted
- 决策日期：2026-08-29
- 关联：[Diagram v0.1 roadmap](../roadmap.md) · [ADR-01：Diagram Assembly 与 Presentation](./01-diagram-assembly-presentation.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

ADR-01 已确定完整 Diagram 由 title、description、drawing core 与 legend 固定槽位组成，所有存在区域进入同一 Scene、bounds、Inspect 与 export。它尚未决定这些区域如何物理排列，也未冻结完整外壳、padding、区块间距、Legend 方位、Diagram 专属 Theme、块级文字 appearance 与 Core Scope 的组合语义

如果把这些选择交给宿主，各入口仍会得到不同的完整图示；如果 Diagram 自建排版、Surface、文字或 Theme 基础机制，又会复制 Layout、Standard 与 Core。单一通用 gap 或含义不明的全局 align 也无法区分标题层级、主内容与 Legend 停靠关系。Diagram 因此需要拥有公共 Frame 与 appearance 契约，并把确定后的区域树下沉到现有 Layout、Surface 与 Core Text / Scope 能力

本决策冻结所有具体 Diagram 类型可复用的 Frame、spacing、Diagram Theme、Neutral baseline、文字继承、Surface / Scope 组合、内部 foundation 边界与失败语义。Flow drawing core 的 Graph 输入、公共 Source root、adapter、自动 layout / routing、结果与 artifact 仍由同一 alpha.1 的后续 ADR 负责

## 决策

### Frame 与 Theme 是长期共享 Diagram 契约

Presentation、Frame 与 Diagram Theme 使用 `IRDiagramPresentation`、`IRDiagramFrame` 与 `IRDiagramTheme` 长期共享名称，供后续具体 Diagram 类型复用。该长期公开身份不改变具体 Diagram root 建立前暂不导出的阶段边界。具体 Source root 仍由 drawing core 决定；本 ADR 的 Foundation 阶段不建立 `IRFlowDiagram`、接受任意 drawing body 的通用 `IRDiagram` 或可实例化的临时 Diagram composite

`frame` 保存本实例的结构事实及 Surface、spacing、overflow 显式覆盖；`diagramTheme` 保存可复用的 Frame 与 presentation text 稀疏默认。Core `theme` 继续拥有 mode、style 与共享颜色环境。Frame 不使用 `frame.surface`、任意 region 数组或自由 Grid，也不把字段铺成 FlowDiagram 顶层快捷属性

### 固定 heading 与 main 物理结构

完整 Diagram 派生两个物理区域：heading 由存在的 title、description 按顺序组成；main 由必有的 drawing core 与可选 Legend 组成。heading 始终位于 main 上方。Legend 支持 `top | right | bottom | left` 四边停靠，默认 `right`

main 的排列固定为：top 时 Legend 在 drawing core 上方，right 时 drawing core 在 Legend 左侧，bottom 时 Legend 在 drawing core 下方，left 时 Legend 在 drawing core 左侧。没有 Legend 时不建立空轨道、空 bounds 或无意义 wrapper

`legendAlign` 只控制 Legend 沿停靠边切线方向的 `start | center | end` 对齐，默认 `start`：left / right 沿垂直方向对齐，top / bottom 沿水平方向对齐。title、description 与 main 在交叉轴默认 stretch。title / description 的文字对齐由各自块级 appearance 控制；Standard Legend 的 content alignment、条目方向、换行和内部 gap 仍由 Legend 自己拥有。Diagram 不根据 Legend 方位改写 Legend 内部方向，也不支持 overlay、floating、任意坐标或自由区域布局

### 三种语义间距保持独立

Frame 使用三个非负物理距离：

- `titleDescriptionGap`：title 与 description 同时存在时的间距
- `headingMainGap`：至少存在 title 或 description 时，heading 与 main 的间距
- `drawingLegendGap`：drawing core 与 Legend 的间距，按 Legend 方位自动落到对应物理轴

缺失相邻区域时不产生对应 gap。三者直接复用 Layout 的非负 gap 契约，不与 Frame padding 或 drawing-core 内部节点 / 层级 spacing 合并，也不建立单一 `sectionGap` 后再由实现猜测边界

### 完整外壳直接复用 Standard Surface

Frame 的 `padding`、`background`、`border`、`cornerRadius` 与 `overflow` 精确复用 Standard Surface 的输入契约、refinement 与 lowering 语义。Diagram 始终生成一个 Surface；即使没有 Presentation，它也负责 drawing core 的完整外壳和 padding。Surface 尺寸由内容 allocation、padding 与父 Layout proposal 决定，Diagram 不新增 width / height

`overflow` 省略时为 `visible`。`clip` 时只把 Surface content 裁剪到实际圆角 border box，background 与 border 保留；corner radius 沿用 Surface 对实际宽高一半的上限。Diagram Core Scope 的 `clip` 仍裁剪包括 background、content 与 border 在内的完整输出；两层 clip 同时存在时按 Core 的实际交集执行

Surface allocation bounds 是完整 border box。存在区域、background、border 与溢出内容按现有 Layout / Core 规则贡献 allocation、visual 与 visible bounds；Diagram 不复制 bounds union、clip path 或 Surface artifact。父 proposal 无法容纳 padding 时沿用 Surface fail-loud，不压缩 padding或产生负内容区

### Diagram Theme 与 Core Theme 同名协作

Diagram 不建立第二个命名 style 选择器。省略 Core `theme.style` 时使用 Diagram Neutral baseline；显式 Core style 时必须存在同名 `DiagramThemeStyleDefinition`，否则 fail-loud。发布包只维护 Neutral baseline，Academic、Clean、Vibrant 等 reference style 由宿主通过同一 Definition / registry 注入

```ts
type DiagramThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => IRDiagramTheme;
}>;

declare const defineDiagramThemeStyle: (definition: DiagramThemeStyleDefinition) => DiagramThemeStyleDefinition;
```

Definition 是运行时扩展契约，不进入 IR；其输出仍按 `IRDiagramTheme` 的闭合、非空、JSON-safe 语义校验。内置与自定义 Definition 经过同一 `defineDiagramThemeStyle`、registry、lookup、输出校验和消费路径；重名、未注册、非法字段输出与回调失败都 fail-loud。Definition 长期通过 `DiagramDefinitionOptions.diagramThemeStyles` 注入，不建立全局 registry 或 Source enum。本 ADR 的实现可以在包内建立并消费同一 contract / registry，但在具体 Diagram root 形成真实公共消费者前不从 package public exports 暴露 Definition、options 或 registry

解析优先级固定为：

```text
Core effective Theme
→ Diagram Neutral baseline
→ 与 Core theme.style 同名的 registered Diagram Theme style
→ inline diagramTheme
→ frame 显式字段
→ TextBlock line / run 显式样式
```

Core Theme 拥有 mode、style、shared semantic / categorical colors；Diagram Theme 只拥有 Frame spacing、Surface appearance 及 presentation title / description 块级默认；Standard Legend 继续拥有内部 appearance / layout；具体 drawing core 继续拥有 Graph Theme、布局或其它领域外观。Theme 不得改变 Legend 方位、对齐、overflow、区域存在性或 drawing-core 布局

### Diagram Theme 使用 frame 与 presentation slices

`IRDiagramTheme` 是非空稀疏对象，包含可选且非空的 `frame` 与 `presentation` slices。frame slice 只接受 `padding`、三种 gap、`background`、`border` 与 `cornerRadius`；不接受 `overflow`、`legendPosition` 或 `legendAlign`。presentation 只接受可选且非空的 `title` 与 `description` 块级 appearance

title 与 description 使用同一个块级文本 appearance：`textColor`、`opacity`、`font`、`align`、`lineHeight` 与 `maxTextWidth`。这些字段精确复用 Core Node / Text 的同名契约

Theme 级联按 slice 内的直接字段合并：省略 `frame`、`presentation.title`、`presentation.description` 或其中某个字段时继承较低层值，提供某个直接字段时替换该字段的较低层值，不能因高层出现一个 slice 就整体删除该 slice 的其它字段。`font` 是唯一递归合并的直接字段，按 family、size、weight、style 逐字段继承；`padding`、`background` 与 `border` 等其它对象值均作为一个直接字段整体替换，不逐子字段合并

Neutral baseline 为：

| Slice                    | 字段                      | Light                             | Dark                              |
| ------------------------ | ------------------------- | --------------------------------- | --------------------------------- |
| frame                    | padding                   | 16                                | 16                                |
| frame                    | titleDescriptionGap       | 6                                 | 6                                 |
| frame                    | headingMainGap            | 16                                | 16                                |
| frame                    | drawingLegendGap          | 16                                | 16                                |
| frame                    | background / border       | 省略                              | 省略                              |
| frame                    | cornerRadius              | 0                                 | 0                                 |
| presentation.title       | textColor / opacity       | `#000000` / 1                     | `#ffffff` / 1                     |
| presentation.title       | font / align / lineHeight | size 18、weight 600 / start / 22  | size 18、weight 600 / start / 22  |
| presentation.description | textColor / opacity       | Core effective semantic guide / 1 | Core effective semantic guide / 1 |
| presentation.description | font / align / lineHeight | size 14、weight 400 / start / 20  | size 14、weight 400 / start / 20  |

Neutral 不设置字体 family，继续继承 Core compile 的字体环境；不设置 `maxTextWidth`，默认不主动换行；不设置 background 或 border，默认透明且无边框

### Presentation text 复用 Core Text 完整继承

title 与 description 各下沉为一个无可见 shape、零 padding / margin、无公共 id 的 Core text Node。派生文字位于重置 Node 默认通道的 Scope 中，避免 Diagram 根 `nodeDefault` 或宿主默认意外添加背景、边框、阴影或 padding；Core Theme 仍然生效，drawing core 仍正常消费 Diagram Scope 的默认通道

Diagram Theme 提供块级 textColor、opacity、font、align、lineHeight 与 maxTextWidth。TextBlock 的行级和 run 级 fill、opacity、font 保持 Core 原语义：颜色和字体按 run、line、block 逐字段继承，opacity 按 Core 规则与块级 opacity 相乘。align、lineHeight 与 maxTextWidth 只属于块级布局，不建立行级同义字段

字符串、多行、硬换行、自动换行、text / math runs、字体测量与 TeX lowering 全部走 Core 现有链路。缺少 TeX lowerer、非法数学内容或测量失败保留 Core 诊断；Diagram 不解析、重排或降级文字内容

### 有效 Core Theme 先于 Diagram resolution 与完整装配生效

具体 Diagram Source 的完整 Core Scope properties 必须先形成有效 Diagram Scope，再在该环境中解析 Diagram Theme、测量并组装 Surface。Source 自身的 theme mode / style 因而影响本 Diagram 的 Neutral 与 registered style，而不只是传给 drawing core 后代

本 ADR 的 foundation 只接收调用位置已经确定的有效 Core Theme 与不透明 drawing child，不拥有临时 Source Scope 或 identity。内部验证宿主可以用普通 Core Scope 提供 Theme、transform、placement、clip 与 bounds 环境，但该宿主不进入 Diagram schema、artifact 或 package exports

未来具体 Diagram root 的 id 只标识最外层完整 Scope；派生 Surface、Layout 与 presentation Node 不生成公共 identity 或额外 namespace。localNamespace、transforms、placement、clip、zIndex、meta、animations 与 boundingShape 对完整 Diagram 沿用 Core Scope 原语义。Surface overflow clip 位于该 Scope 内部，Scope clip 继续控制完整输出

## 基础数据结构与长期公开契约

长期最小结构为：

```ts
type IRDiagramFrame = Readonly<{
  legendPosition?: 'top' | 'right' | 'bottom' | 'left';
  legendAlign?: 'start' | 'center' | 'end';
  padding?: SurfaceInput['padding'];
  titleDescriptionGap?: number;
  headingMainGap?: number;
  drawingLegendGap?: number;
  overflow?: SurfaceInput['overflow'];
  background?: SurfaceInput['background'];
  border?: SurfaceInput['border'];
  cornerRadius?: SurfaceInput['cornerRadius'];
}>;

type IRDiagramTextAppearance = Readonly<{
  textColor?: IRNode['textColor'];
  opacity?: IRNode['opacity'];
  font?: IRNode['font'];
  align?: IRNode['align'];
  lineHeight?: IRNode['lineHeight'];
  maxTextWidth?: IRNode['maxTextWidth'];
}>;

type IRDiagramTheme = Readonly<{
  frame?: Omit<IRDiagramFrame, 'legendPosition' | 'legendAlign' | 'overflow'>;
  presentation?: Readonly<{
    title?: IRDiagramTextAppearance;
    description?: IRDiagramTextAppearance;
  }>;
}>;
```

这些类型由 Diagram schema 派生或由 schema-derived 类型组合；代码片段只冻结字段关系。Surface、Layout 与 Core Node / Text 字段直接复用对应 owner 的公开 schema，不复制 primitive refinement 或默认值。`IRDiagramFrame` 与 `IRDiagramTheme` 是后续具体 Diagram root 组合的公共片段，不因此建立通用 root

本 ADR 在 `@retikz/diagram` 包内实现并消费 Presentation / Frame / Theme schema、resolve 与 assembly，但在具体 Diagram root 建立前不从 package public exports 暴露 foundation schema、类型、resolver 或装配入口；`@retikz/diagram-vanilla` 与 `@retikz/diagram-react` 保持空壳。内部 drawing child 只作为装配依赖，不成为 Source `body` 字段、公开类型或可寻址 identity

未来具体 Diagram root 的 Direct IR `frame` 与 `diagramTheme` 是唯一持久化真源。Vanilla 的对应 Input 保持同形并组装同一 Source；React 接收同名对象 props 并通过 Diagram Vanilla normalize 产生相同 Source。三入口不提供顶层 padding、background、legendPosition 等快捷字段，也不增加 Frame / Theme JSX marker

Definition options 不进入 Source。未来 React 与 Vanilla 只把同一 `DiagramDefinitionOptions` 交给 Diagram provider 链；React context 或宿主收集只能作为 options authoring，不能建立另一个 registry、默认或覆盖顺序

## 行为、失败语义与兼容性

- Frame 与 Theme schema 为闭合对象；未知字段、空 frame、空 diagramTheme、空 slice、负 gap / padding、非法颜色、字体、border、cornerRadius 或 overflow 均 fail-loud
- `frame.legendPosition`、`frame.legendAlign` 或显式 `frame.drawingLegendGap` 出现但没有 Legend 时 fail-loud；Theme 中同类默认可以在区域缺失时暂不消费，因为 Theme 是可复用层
- `titleDescriptionGap` 或 `headingMainGap` 在相邻区域缺失时合法但不产生 gap；缺失区域不建立 Scene child、allocation、artifact 或空轨道
- 省略 Frame 字段时使用 resolved Diagram Theme；显式 0、`visible`、透明 paint 与其它合法 falsy 值必须保留，不得改用 truthy fallback
- 未注册 Diagram Theme style、Definition 重名、回调抛错或返回非法字段由 `RetikzDiagramError` 诊断并原样保留 cause；Diagram 不回退 Neutral 或静默忽略
- Surface proposal、Text / TeX、Legend、Layout 与 Core Scope / namespace 错误保留 owner 路径和诊断；Diagram adapter 不吞掉、改写或降级为 warning-only
- 未来 React 不拥有 Direct IR 无法表达的 Frame / Theme 能力，也不采用第一个生效、默认恢复或宿主 CSS 外挂。Direct IR、Vanilla 与 React normalization 后的 Source 必须逐字段等价
- Foundation 阶段不导出临时 Source root、任意 drawing body、占位字段或 package-public foundation API。同一 alpha.1 的具体 Diagram root 直接采用长期 Frame / Theme 契约，不提供 Flow 专属别名、旧名 re-export、migration、fallback 或双轨字段

## 实施结果

Alpha.1 的 Foundation 阶段已在 `@retikz/diagram` 包内建立 Frame、Diagram Theme、同名 style Definition / registry、Neutral baseline、级联解析与固定 heading / main 装配。最终装配直接下沉为 Layout Flex 与唯一 Standard Surface，沿用 Core Theme、Scene bounds、Surface overflow clip 与外层 Scope clip，不建立 Diagram 私有渲染或几何路径

这些能力继续保持 package-internal；drawing core、具体 root、公共 Definition options 与 adapter 接线仍由后续具体 Diagram 决策拥有

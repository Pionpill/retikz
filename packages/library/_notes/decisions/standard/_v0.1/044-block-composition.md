---
description: Standard 内部 Block 框架以 Header、Content、Footer 组合通用结构，仅由 ClassBlock 等上层封装对外暴露，复用 Surface 与 Layout
keywords: Block、Header、Content、Footer、Section、headless、内部框架、发布边界、Standard
---

# ADR-044：Block 内部结构框架

- 状态：Accepted
- 决策日期：2026-10-08
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../architecture/standard-library-design.md) · [Layout 设计](../../../architecture/layout-library-design.md) · [能力完备性](../../../../../../notes/architecture/capability-design.md) · [Surface](./022-arbitrary-child-surface.md) · [Graph 开放 Block](../../../../../schematic/_notes/decisions/graph/_v0.1/013-block-open-content.md)

## 背景与目标

类、对象、函数说明、服务和工作流节点共享外框、标题摘要、主体内容与结尾区域，但内部内容与领域事实不同。把字段、方法、输入输出或执行步骤固化为基础容器 grammar，会使公共结构与领域实体争夺数据真源；让每种实体直接拼装图元，又会重复相同的阅读结构。

Standard 建立内部 Block 框架，组织根容器与 Header、Content、Footer 等可组合区域。基础框架不对外发布；最终作者使用 ClassBlock 等上层封装，各封装保存自己的说明事实，并在包内组合统一框架。公共框架在此表示封装之间共享，不表示对外公共 API。

本设计借鉴 Card 的结构拆分与组合方式。headless 表示框架的内容、布局与编译不依赖 DOM、React 或特定 renderer，不表示没有默认布局或视觉，也不包含 Dialog 的焦点、弹层和关闭行为。

## 决策

### 内部框架与对外封装分离

Block 是 Standard 中上层结构呈现能力的内部底座。Block、BlockHeader、BlockContent、BlockFooter、BlockSection、标题、说明与辅助区都不是面向最终作者的组件；不导出它们的 schema、类型、factory、Definition、provider、React 组件或 Vanilla helper。

Standard 三包不增加基础框架的公共 /block 子入口，不从根 barrel 转手暴露，也不发布独立基础框架包。实现可以作为上层封装的必要依赖包含在发布产物中，但没有受支持的外部导入路径或稳定 API。源码目录可按 block 家族组织，目录组织不决定公共 exports。

未来只有 ClassBlock 等上层封装提供正式 schema、Source、Definition/provider、Vanilla Input 与 React 入口。它们的确切字段、公共子入口、默认内容和失败语义由各自 ADR 冻结；本决策不提前设计实体模型或创建没有消费者的公开封装入口。

直接消费内部框架的封装与框架处于同一 Standard owner。其它包只能消费已公开的上层封装或既有 Surface/Layout/Core 能力，不得 deep import 内部 Block，也不新增内部专用包子入口或转发导出。Standard 不反依赖 Graph、Diagram、renderer 或编辑器。

上层 Standard 封装只负责已结构化说明事实的呈现。源码解析、完整 UML 元模型校验、关系数据库、自动布局、执行和编辑状态仍由各自 owner 负责；后续实体设计必须分别验证 Standard 的准入边界，不能因为底座位于 Standard 就把所有代码或工作流能力移入。

### 组合只存在于封装内部

内部 Block 以唯一的有序内容树组织零个或多个内容，不维护另一份 header/content/footer 镜像。内容可以是任意合法 Core / Tier 2 child，也可以是同一框架产生的内部区域组合；内部组合在进入 Core child 编译前确定为既有下层能力。

Header、Content、Footer 都是必备的框架能力，但实例可以省略、重复、独立组合或嵌套。根按声明顺序纵向排列，不按区域类别重排、合并或补齐内容；没有区域时保持同一空盒语义。内部 authoring 顺序是排列的唯一依据，不根据文字名称或领域类型推断结构。

Content 是主体内容容器，不理解属性、方法、配置、输入输出或执行步骤。Section 是可选细分区域，其标题通过内容中的普通文字表达，不建立固定 rows grammar。键值对齐复用 Map/GridLayout，复杂排列通过显式 Layout 组合，不新增 Row、Cell 或列宽系统。

Header 的有序主体内容按 column 排列。可选 accessory 承载一个绘图 child，位于主体之后，与主体组成 row；主体占用扣除 accessory 自然宽度与 gap 后的可用宽度，accessory 不增长并保留自然宽度。辅助内容可以是类别标记、状态、图标或其它绘图，不具有默认交互行为。

Header 不从标题、说明、图标或其它 child 类型推断槽位；图标与标题需要左右排列时，在主体内显式组合 Layout。没有主体时不产生空文本区和对应间距，没有 accessory 时不产生其区域与横向间距；两者都为空时保持空盒语义。内部直接指定 accessory，不额外建立公开 JSX 标记或 slot Input。

Footer 是结尾内容的 row 容器，默认使用主轴 end 分布。它参与自然布局，不固定到底部、不浮动，也不自动承担 Output 语义。有限高度中的分布通过明确的 size、justifyContent 或嵌套 Layout 表达；较大输入输出区域仍可由上层组合在 Content 中。

### 不增加基础层持久化契约

基础框架的组合参数是 Standard 内部 TypeScript 契约，不是新的 Source IR。它复用 Surface、Layout、Core 的公开类型，不建立 IRBlock、基础 Zod schema、standard.block 等可被外部作者命名的 composite key，也不把内部组合树写入实体 Source。

每个未来上层实体只保存自身正式 Source 事实。区域、标题 Node、Layout items 与排版投影在消费时由实体事实确定，不在上层 Source 同时保存一份生成的 Block 树；大小与外观等字段只有经该实体公开契约明确允许时才对外开放，不机械暴露全部内部参数。

内部框架最终贡献既有合法 Core/Standard/Layout child，并消费其同一公开编译路径。上层 provider 自动声明实际下层依赖，不要求最终作者注入 Block provider，也不根据 child discriminator 猜测 provider；任意扩展 child 的贡献仍由明确的 authoring 或 Definition 协议携带。

内部文字角色是生成普通 Core Node 的组合能力，不建立 Title/Description IR、独立文字 schema 或专用测量。内部参数使用精确的 Core text 与 Node 字段类型，未类型化的外部输入只在上层实体 Source 或下层公开 parse 入口校验一次。

### 统一的盒模型与组合默认

内部容器完整消费 Core Scope 语义，包括 id、localNamespace、theme、defaults、transforms、placement、clip、boundingShape、meta、animations 和 zIndex。盒外观复用 Surface 的 padding、background、border、cornerRadius 与 overflow；size 精确复用 Layout 的双轴 content/fixed/fill 契约，包含容器 padding。省略尺寸时按内容确定，不继承旧 Graph Block 的固定最小宽度。

gap、justifyContent 和 alignItems 复用 Layout 的间距、Flex 分布与对齐语义。Block、Content、Section 固定 column，Footer 固定 row；Header 外层固定 row，主体固定 column，contentGap 只控制主体内相邻内容。其它排列通过嵌套 Layout 表达，不扩张为新的 solver。

内部组合默认有单一权威来源，上层与 adapter 不重复维护。来自 Surface/Layout/Core 的默认及 refinement 继续消费原 owner 的真源；仅内部框架自己的组合默认使用内部 TypeScript 契约，不为未持久化参数建立 Zod schema。显式 0、空数组与可选值不能被省略默认替换。

| 容器    | 内容排列               | padding | gap                  | justifyContent / alignItems              | 默认外框                                                 |
| ------- | ---------------------- | ------- | -------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Block   | column                 | 0       | 0                    | start / stretch                          | 无背景，currentColor、0.2 描边透明度、1 描边宽度，圆角 8 |
| Header  | 主体 column + 外层 row | 12      | 外层 8，contentGap 4 | start / center；主体固定 start / stretch | 无背景、无边框、圆角 0                                   |
| Content | column                 | 12      | 8                    | start / stretch                          | 无背景、无边框、圆角 0                                   |
| Footer  | row                    | 12      | 8                    | end / center                             | 无背景、无边框、圆角 0                                   |
| Section | column                 | 0       | 4                    | start / stretch                          | 无背景、无边框、圆角 0                                   |

这些是内部框架默认，不自动成为未来实体对作者承诺的默认；实体可以按自己的语义组合并替换。全部容器默认 overflow 为 visible，尺寸和间距沿用 Core/Layout user units。Surface appearance 按字段替换复合值，不进行任意深合并；border 的 stroke 为 none 时隐藏默认边框。

标题和说明生成普通 Core Node，默认无可见填充外壳与描边，padding、margin、minimumSize 为 0；标题使用 base 字号、bold，说明使用 xs 字号和 0.7 opacity，其余复用 Core 文字默认。上层显式文字配置按 Core 原字段粒度覆盖组合默认，不丢弃未覆盖的字体字段，也不修改普通 Node 独立使用的行为。

背景、描边与文字消费当前 Core 主题和公开颜色值。不新增 Block 主题 registry、variant selector、逐区域主题树或外部框架 callback；具体封装是否提供有限主题控制由自身 ADR 决定。

### Surface、Layout 与 Core 只执行一次

内部框架只组合公开 Surface/Layout/Core，不计算平行文字尺寸、排列结果、clip 路径或 Scene。size 表示含 padding 的外层 allocation，Surface 接收确定后的整体尺寸；gap 只作用于相邻有效项，padding 只消费一次。Header 的主体/accessory 与嵌套 child 都走同一公开 probe/replay、默认、refinement 与诊断路径。

每个内部容器保留稳定的 Surface/Scope 组合语义，全部内容在该根内。实体提供的根 Scope 字段只落实际身份根，不再复制到内部区域、Layout 包装或每个 child。上层实体 identity 只发布一次，内部区域只有上层契约明确要求的显式 identity 才公开，不从标题、成员名或数组下标生成公共 id。

Surface 保持背景、内容、边框三层以及 rounded overflow 规则。child zIndex 不穿透外框层，外层 Scope.clip 与内部 overflow 保持独立组合。allocation、visual、visible bounds 不混用，描边和内容溢出不反向扩大 authored size，不从 renderer 回读 bbox。

空内容仍接受确定的尺寸与 padding，保留相同组合根语义；零面积时的 prune 按 Core 原规则。嵌套 child 的 id、namespace、qualified spatial handle 和 provenance 保持原 owner 语义；重复 id、局部 namespace、NodeTarget、anchor 与 boundary 由 Core 裁决，内部 item key 不升级为公共身份。

Scope meta 不自动传播给 child，不覆写用户 meta，不保存第二份 endpoint、空间索引或测量缓存。下层公开 artifact 保真；上层公开 manifest/inspection 是否包含实体区域，由其自身契约定义，不对外承诺内部 Block 层次或私有区域标记稳定。

## 对外契约与入口等价性

对最终作者，公共边界是未来 ClassBlock 等实体，不是基础结构：

| 层次              | 对外提供                                                | 不对外提供                                                 |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| 宿主无关 Standard | 经各实体 ADR 确认的 schema、Source、Definition/provider | 基础 Block schema/IR/factory/provider 与内部参数           |
| Standard Vanilla  | 对应实体的 typed Input、normalize、authoring helper     | 基础 block/header/content/footer helper                    |
| Standard React    | 对应实体组件与 Props，经 Vanilla 调度                   | 基础 JSX 区域、Title/Description sugar 与 Accessory marker |
| 文档与持久化      | 实体用法、实体字段与公开结果                            | 基础框架使用教程、直接基础 JSON、独立基础 registry         |

本轮不建立实体公开接口。内部框架不依赖 adapter，未来三个实体入口通过同一实体 Source 与内部组合链路得到等价布局、Scene、引用和诊断；React 不重建基础框架，也不拥有其默认或 solver。

第三方可以消费已经公开的实体能力，或经 Core 公开 composite Definition 组合 Surface/Layout 等已有能力；本决策不提供外部自定义 Block 结构的接口。第三方 child 在某一实体允许的位置通过同一 Core provider/compile 路径消费，是否允许任意 child 由该实体定义，不因内部开放就自动成为公共能力。

## 行为、失败语义与兼容性

- Header、Content、Footer 全部作为内部框架能力提供；每个实体自行选择组合，基础框架不解释类、对象、函数或执行模型
- 不接受由最终作者声明的基础 Block Source，不增加相应公开 parser、导出或注册键；不会把既有泛型 Core composite 接受机制扩张为受支持的私有框架访问方式
- 上层外部数据由实体 strict schema 负责；下层合法状态由其原 owner 负责；typed 内部组合不为纯 JavaScript 调度维护重复校验或平行错误分支
- proposal、size、padding 或 child minimum 无法满足时保留 Layout/Core 的真实失败，不建立 content fallback、不缩放文字或裁掉数据伪装成功
- 未注册 child、provider 冲突、引用、主题和命名空间失败沿 Core/原 owner 诊断；Standard 主动创建的错误使用 RetikzStandardError，上层 callback 原异常保留 cause
- renderer 只消费相同 Scene，不识别基础 Block 或上层实体 discriminator；内部组合树不作为公开持久化格式或 inspection 稳定面
- 基础框架可以先完成内部能力验证，正式对外交付以第一个获批上层实体的端到端闭环为准；本轮不把内部实现可用等同于 ClassBlock 等已交付
- 后续替代旧 Graph Block 时同步迁移消费者、schema、入口与文档，再删除旧实现；不添加跨包私有导入、forwarding alias、fallback 或长期双轨。本决策不改变当前 Graph 行为，旧 ADR 在实际替代前仍有效

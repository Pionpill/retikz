# 通用视觉主题设计

> **状态：长期架构方向已确认。** 本文定义 renderer-neutral Theme 来源、稀疏 Source 默认片段、视觉人格、覆盖规则与跨包边界。当前公开 API 以各 owner 的 Accepted ADR、代码与用户文档为准；架构方向不代表所有领域已完成迁移。
>
> 适用范围：Core Theme 环境及 Standard、Graph、Diagram / Flow、Plot、Chart、Table 与未来视觉能力；宿主 CSS、站点 chrome 与应用设计系统由宿主维护。
>
> 关联：[能力完备性与模块边界](./capability-design.md) · [原子契约与组合设计](./atomic-contract-design.md) · [包拓扑](./package-topology.md)

## 1. 定位与效力

领域默认值与目标 Source 同构且稀疏；Theme 是这些默认值的一个来源。Theme 按视觉环境通过 definition 生成默认值，作者通过 `xxxDefaults` 显式指定默认值，实例通过自己的正式字段覆盖。三者复用字段契约，但来源、作用域与优先级不同。

长期架构维护模型、包边界、结构不变量与视觉人格。版本 ADR 冻结公开字段、行为、失败语义与兼容性；文件范围、测试 case、实施步骤与评审记录进入 ignored 镜像 plan。领域默认片段的精确字段由领域 owner 决定，不构建全仓巨型 Theme schema。

## 2. 问题与目标

主题与实例若各自维护字段词汇，会产生 token 到 Source 的重复映射、双入口优先级和 schema 漂移。把整个 Source 机械变成 DeepPartial 又会开放 identity、数据、成员列表与 provider 选择，并产生数组和判别联合的合并歧义。

目标是让作者在 xxxDefaults 与实例中使用同一套正式字段，同时保留内置风格、稀疏覆盖、JSON 持久化、可解释解析和 renderer 等价性。结构化本身不是目标；只有具有稳定语义的对象才分组，不按字段数量机械嵌套。

## 3. 环境、实例与领域默认

| 入口                            | 职责                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| Core `theme: { style?, mode? }` | Scene / Scope 视觉人格与明暗环境选择，按字段继承                 |
| 实例 `style`                    | 当前对象的直接视觉覆盖；Scope 只接受其既有可级联字段             |
| 实例 `layout`                   | 当前对象的尺寸、间距与内容排布                                   |
| 容器 `defaults`                 | 后代具名默认通道与既有继承屏障                                   |
| owner-local `xxxDefaults`       | 作者直接为领域目标指定稀疏默认，不执行具名 Theme 选择            |
| 领域 rules                      | 按真实语义选择目标后应用受限的 Source 覆盖                       |
| 已确定的 appearance             | resolve、manifest、inspection 等消费结果，不是作者输入的平行结构 |

Core 只持久化 style / mode selector，通过现有 style definition registry 产生 shared colors 并向 Composite 传递有效环境。领域 definition 接收环境并产生本地默认片段。Core 不静态引用领域 Theme 类型，不把领域配置放入 Scene / Scope 的环境对象。

领域入口采用复数 `graphDefaults`、`diagramDefaults`、`flowDefaults`、`plotDefaults`、`chartDefaults`、`tableDefaults`，按 owner 实际能力提供，不为无消费者的包预建入口。条件规则单独承载，例如 `graphRules`；不把规则数组塞入无条件 defaults。现有 Core `defaults` 仍专用于 node/path/label/arrow 等原通道，不新增 `defaults.graph` 或全仓领域 bag。`xxxDefault`、`xxxDefaultStyle`、同义 `xxxTheme` 和 flat tokens 不与新入口并存。

具名 Theme 通过 definition 扩展，既可内置也可由宿主注入，不是内置关键字白名单。需要按条件生成默认的 definition 可以返回分离的 defaults 与 rules；其中默认片段与 `xxxDefaults` 复用同一 schema，不再经 token 字典转译。普通作者直接配置默认值无需声明新 Theme 或运行 callback。

`defaults` 的既有几何默认、通道边界与 reset 行为继续成立；Theme 不替代它，reset 不重置 Theme 环境。裸 Core Node / Path 不因具名 Theme 自动获得新的 preset 行为。React Layout 的宿主 CSS 与绘图输入仍按各自 authoring 契约表达。

## 4. 稀疏 Source 片段

### 4.1 目标类型与片段同构

默认值对象外层按 entity、relation、axis、legend、cell 等实际消费目标选择片段，不复制 entities、relations、guides 等实例数组。一个目标片段里的每条路径都必须在对应正式 Source 或命名配置契约中存在，并保持同名、同层级、同值域与同语义。

例如 Entity Source 的 `style.font` 与 `layout.align` 分别对应 `graphDefaults.entity.style.font` 与 `graphDefaults.entity.layout.align`。Theme definition 生成同样的 entity 片段。目标类型是额外的默认作用域；它不声称与整个 Source 根对象逐路径相同。

片段从权威 owner schema 选择允许默认化的字段。预设、definition 输出、用户覆盖使用同一片段路径；允许字段可以因入口职责进一步收窄。已有小型叶子继续保留原结构，不为追求统一给 label、arrow 或所有 Guide 配置强加 style 包装。

### 4.2 可默认化边界

- 接受正式契约允许的 paint、font、stroke、opacity、效果和表现布局默认，如 padding、gap、对齐
- 不接受 identity、内容文本、数据绑定、encoding、成员列表、关系端点或决定语义结构的 provider / recipe 选择
- 已有 Axis 的 baseline、tick、grid、label 等表现部件可以拥有显式允许的可见性默认；Theme 不创建或删除 Axis、Legend、Mark、Relation、标题等语义实体
- 字段是否位于 style 或 layout 不是自动授权依据；布局方向、routing kind、拓扑与数据算法仍属于 Source 或正式领域配置
- palette 必须引用领域已有的颜色默认契约；不能因两者都是颜色数组而把 scale 数据语义与主题混为一谈
- Source 缺少可主题化片段时，由原 owner 先建立同名正式契约，再派生默认片段；不能从最终 appearance 反推平行 Source

presentation 的文本内容与区域格式应由同一正式区域对象表达；Theme 只选格式字段，省略内容不会创建该区域。Flow 文本排布进入 layout，自动路由进入 routing；Theme 不承载 routing 算法选择。

### 4.3 单一真源

持久化 `xxxDefaults` 使用闭合嵌套对象，复用正式片段 schema。Theme definition 生成的默认值使用相同路径和值域；只有输入来源不同，不新增平行 token schema。dotted path 仅用于诊断、inspection 或工具导出，不是第二套 authored token map。旧 flat token、同义 xxxTheme、别名和双向 projection 在对应 owner 迁移时删除，不保留双读兼容。

用户 Source 由 owner Zod 入口一次解析；不添加通用 JSON walker、undefined 清理、克隆、冻结或二次 schema 复核。运行时 definition 仍通过既有公开注入路径进入，不持久化函数。

## 5. 规则与覆盖

### 5.1 Rules

基础默认与 selector rules 是独立契约。Graph 按 role、kind、predicate、status、direction 等既有语义选择；Table 复用已有 Cell 规则；不为主题新增通用 selector 引擎。rule 的覆盖字段复用目标 Source，如 Entity rule 的 `style.color`，不建立同义 appearance 作者字段。

规则的匹配顺序、作用域与允许覆盖字段由 owner 冻结。状态规则可以只允许颜色而不开放布局；匹配语义不得变成对目标 role、status 或 direction 的赋值。基础默认与规则分开承载不改变既有内置语义状态能力。

### 5.2 分组与复合叶子

分组是字段命名空间，不是整体覆盖单元。覆盖 style.fill 保留缺省的 style.stroke，覆盖 layout.align 保留其它布局字段。缺失与 optional undefined 不参与覆盖；空分组表示无覆盖，合法的 0、false 与 null 依所属字段语义处理。

复合叶子沿用其正式契约：Node font 在默认通道与实例间整体覆盖；label font 逐字段补全。paint、shadow、spacing、数组和判别联合不做通用递归深合并；palette 显式数组整体替换且保留原值、顺序与长度。schema 稀疏化不等于递归解除联合判别和必填项。

Theme、rules、defaults、实例之间同一字段也遵循同一覆盖粒度，不能用 Theme 专用深合并改变字段含义。

### 5.3 级联

Core 先按 Scene、外到内 Scope 确定环境与 shared colors。领域用共享值建立 baseline，并经同名 style definition 生成主题默认，再应用作者 `xxxDefaults`，最后应用实例显式字段。shared categorical 没有领域显式覆盖时来自 Core；definition palette 高于共享 baseline，作者 defaults palette 再覆盖它，实例显式 range / scheme 最终胜出。

这条顺序只确定 Theme 生成值、作者领域默认、实例值三种来源的关系；不声称涵盖所有 Scope 通道。具名主题切换不能被当作清空作者 defaults 的操作，条件规则与嵌套 defaults 的具体作用域由 owner 明确冻结。`xxxDefaults` 仍是已有对象的受限表现默认，不因为名称不带 Theme 就开放内容、结构、provider 或 routing 策略。

领域规则遵守原 owner 的匹配与作用域；Theme 默认低于明确的实例覆盖。Core 的 Scope style、defaults 通道、reset 与元素字段仍按 Core 原契约处理，不把跨 owner 的级联压成一个全仓深合并顺序。领域必须冻结其规则与显式默认通道相遇时的优先级，不能让 lowering 新增的默认字段意外遮蔽作者输入。

## 6. 解析、扩展与消费

每个视觉 owner 维护闭合稀疏 defaults schema、Neutral baseline、现有 style definition registry 与领域 resolver。内置和宿主自定义 definition 消费同一公开契约与路径；缺少当前 style 的 owner definition 时 fail-loud，不静默改用 neutral。不新增跨 owner registry、自动发现或远程主题 loader。

解析结果按需求派生为 EffectiveXxxDefaults 或携带来源的 XxxResolution，不为非持久化消费态另建 Zod schema，也不要求所有字段机械 required。环境阶段可确定的必需默认应完整；依内容、尺寸或目标上下文才能确定的字段由目标 resolver 决议，不能伪造值填满对象。

同名主题不改变目标字段的消费者。领域 resolver 将默认应用到正式 Source / Canonical 配置，再经既有 Standard / Core lowering 到 Scene。实例分组进入 Core 的 style / layout / defaults；renderer 只执行物化结果，不按 Theme 名称分支。

## 7. 一个内置 preset 与三个参考 preset

`neutral` 是默认 style，`light` 是默认 mode；具体领域仍需为这个组合提供满足消费契约的默认片段。

| Preset     | 中文语义 | 稳定视觉人格                                         | 不应退化为                           |
| ---------- | -------- | ---------------------------------------------------- | ------------------------------------ |
| `neutral`  | 中性     | 安静的界面框架、清晰的内容层级、克制的数据色彩       | 无设计的浏览器默认值或纯灰阶数据     |
| `academic` | 学术     | 面向论文、出版与严肃分析；高可读、低干扰、适合打印   | 只换成衬线字体或机械复制某个库的主题 |
| `vibrant`  | 明快     | 清晰 panel、鲜明层级、高辨识度且受控的数据色彩       | 无限制高饱和、牺牲对比度或信息层级   |
| `clean`    | 极简     | 最大限度减少非数据装饰，让数据图元和必要标注成为主体 | 删除所有 guide、间距或可访问性线索   |

四个名称表达跨领域人格，不承诺与某个开源库像素一致。其中 Neutral 是发布包内置 preset，Academic、Vibrant、Clean 是宿主可通过公开 definition 组合的参考 preset。Vega / Vega-Lite、Plotly、Observable Plot、ggplot2、shadcn 等只作为设计参照；具体实现必须符合 retikz 的 owner、schema、renderer-neutral 与可访问性约束。

各领域为四个 preset 选择具体值时，应在至少一个典型内容和 light / dark 两种 mode 下核对：

- 内容层级是否符合该人格
- guide 与非数据装饰是否克制且可读
- categorical、sequential、diverging 与状态色是否可区分
- surface 与文字 / 线条是否具有足够对比
- SVG 与 Canvas 是否得到等价语义结果

## 8. Owner 与共享边界

| Owner          | 拥有                                                                       | 不拥有                                     |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| Core           | 环境、style registry、shared colors、通用绘图片段与默认通道                | 领域 Theme 字段和领域规则                  |
| Standard       | 去除领域词汇后的 presentation / drawing 能力及自身消费                     | Chart recipe、Table model、Plot scale 语义 |
| Graph          | Entity / Relation / Group / Block 默认片段与语义规则                       | Flow 布局与自动路由                        |
| Diagram / Flow | 外围 presentation、frame、Flow 受限片段与布局编排                          | 放宽 Graph 角色约束、复制 Graph resolver   |
| Plot           | Guide、Plot area、palette 等正式配置与主题解析                             | Chart shell 或 Table Cell 语义             |
| Chart          | shell / presentation 与精确 recipe 允许的视觉默认；转发 Plot 公开 defaults | Plot defaults 的平行词汇、复制 Plot merge  |
| Table          | Cell / table 默认、既有 Cell rules 与颜色默认                              | 将最终 manifest appearance 当作者 IR       |
| adapters       | 等价 authoring、definition 注入与生命周期                                  | 平行 Theme schema、级联与视觉默认          |
| renderer       | 执行统一 Scene                                                             | preset 选择、Theme 合并                    |
| host / docs    | CSS、产品 UI、公开 definitions 组成的参考风格                              | 改写领域 Source 或静默 fallback            |

无视觉职责的 Foundation、Math、Runtime、Data 不建立领域 Theme。Inspect 只消费有效 Core 颜色与已有 inspection 上下文，不复制 palette。

Core 保持 shared categorical 单一真源。受维护 palette 的长度、色相索引与 mode 连续性遵循主题公共契约；用户显式 palette 不重排、不补齐、不调色。

## 9. 自定义与 mode

用户可把 `xxxDefaults` 内联到 Source、保存为 JSON 或作为数据包共享；具名风格由实际消费的各 owner 同名 definition 注入。默认值数据本身不承担 Theme 选择、loader 或 registry 生命周期；不同时接受 Theme 名称、token 对象和结构化默认三种同义输入。

light / dark 与视觉人格正交，保持内容、语义对象、布局层级与装饰密度连续。默认只改变背景、前景、对比度、透明度及 palette 的明暗适配，不借 mode 切换改变轴、图例、布局方向或路由策略。风格可以控制已有对象中允许隐藏的装饰部件，不能撤销语义对象。

## 10. Diagnostics 与 inspection

诊断指向实际 owner 与嵌套 Source 路径，区分环境、definition 生成值、作者 xxxDefaults、规则及实例入口。不能因 defaults 与 definition 输出同形而混淆来源。未知字段、非法值、无效 palette、缺失 definition 与补全后的真实领域不变量由相应边界 fail-loud。

inspection 可展示有效值、实际消费者与来源；dotted path 只是结构化字段的定位投影。Core 现有 ThemeTokenSource 的 inherit / local 只表示共享值来源或本地构建，不表示完整优先级；结构迁移不自动重命名这一既有公共类型。不能通过值相等反推来源，也不伪造 Core 未提供的逐 Scope winning lineage。

## 11. 不变量

- 默认片段与目标 Source 路径及值契约一致；preset、definition 生成值与作者 xxxDefaults 无平行词汇
- 每个字段有实际 consumer；环境默认与内容相关的默认在各自阶段确定
- 未知字段由 owner schema 拒绝；不引入平行 Source 校验或通用深合并
- 合法显式值、空组、复合叶子、palette 替换和默认屏障行为稳定
- 切换 Theme 不改变数据、identity、成员关系和语义对象集合；表现布局可正常改变几何结果
- rules 只覆盖其允许字段，不重写选择条件所表达的语义
- 内置与自定义风格走同一 owner contract，缺少 definition 可诊断
- Direct IR、Vanilla、React 等价；SVG / Canvas 消费同一物化结果
- 原始 Core primitive 和 Scope defaults 不因领域 Theme 改造获得隐式新行为
- preset / mode 的可读性、分类辨识和视觉人格通过实际内容验收

具体行为、反例、最低测试层和验证证据进入 ignored 测试契约矩阵。

## 12. 演进边界

新增 Theme 字段先确认正式 Source 语义、默认化资格、owner、consumer 和覆盖粒度。字段移位必须同步目标 Source、xxxDefaults、rules、definition 与文档，不从当前 token 名反推新结构。

跨领域公共规范由架构与 Core 协议 ADR 承载；领域字段集合、规则优先级及 Source 扩展由对应 owner ADR 冻结。Core 协议落在 Kernel milestone 不表示领域包加入 Kernel lockstep，也不授权 Core 引入领域依赖。

旧 flat token 架构经各 owner breaking 迁移退出，当前实现与长期目标的差距必须明确记录。未迁移实现不构成双轨长期授权，历史 Accepted ADR 保留其版本事实。

本文不建立通用样式引擎、远程主题市场、CSS 真源、全仓 Theme bag，也不定义数据算法、完整布局系统或编辑交互状态机。

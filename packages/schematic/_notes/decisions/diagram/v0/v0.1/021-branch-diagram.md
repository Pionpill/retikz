---
description: Branch 分支图以节点目录和有序分支声明连接，支持共享节点与主线布局，复用 Core Node、Graph Relation 和 Diagram 公共装配
keywords: Branch、分支图、BranchDiagram、BranchNode、branches、mainBranch、主线、轨道、DAG
---

# ADR-021：Branch 分支图

- 状态：Accepted
- 决策日期：2026-10-04
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Diagram 装配](./001-diagram-assembly-presentation.md) · [Frame](./002-diagram-frame-spacing-appearance.md) · [Defaults 与 Theme](./008-theme-source-fragments.md) · [Schematic 能力域](../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

版本路线图、Git 提交历史和文档阅读关系都有有序主线、分叉、延续和汇合。作者主要声明一条分支上依次经过哪些节点，不应逐条重复声明相邻连接。节点沿连续轨道排列，并在旁边展示名称、版本、说明等内容；标记尺寸不应被外侧文字撑大。

Branch 表示一般分支结构，允许多个前驱汇合，因此不是严格的树。Git branch 是指向 commit 的引用，不能与绘图轨道或节点的唯一归属混同。日期与版本号属于内容，不自动成为等比例时间坐标。

Branch 与 Flow 是 Diagram 的并列 drawing core。Flow 表达流程实体和关系的布局；Branch 把有序推进和主线连续性作为专属契约，不通过 Flow 主题或业务 role 模拟分支图。

## 决策

### 三个公开作者元素

公开 `BranchDiagram`、`BranchNode` 与 `Branch`。Branch 是有序节点引用路径，相邻引用隐式连接；共享节点表达分叉与汇合，不提供独立 Fork / Merge 元素。第一版没有 `relations` 输入或 `BranchRelation` 组件，也不提供 Lane / Ref 声明组件和嵌套 Group / Layout。

`BranchDiagram` 拥有平级节点目录、有序分支和主分支引用及完整 Diagram 外层表达。`branches[].nodes` 是连接和顺序的唯一事实源，不另存 parents、children 或派生边集合。轨道是布局结果，不是分支身份或包含关系，不回写 Source。

### 节点直接复用 Core Node

`BranchNode` 的标记下沉为一个有 authored id 的 Core Node。形状、外观、标注、边界和目标寻址沿 Core 的公开契约；Branch 不引入 Graph Entity role，也不将版本、commit 或文章统一伪装成 event。

节点名称及说明使用节点外侧 `labels`。标记本体不包含用于撑开形状的 `text`；第一版不提供任意 child 卡片或独立正文布局。Core Node label 的可接受内容和样式保持原契约，不把它宣称为任意 React 内容。复杂文章卡片需要另行冻结组合契约。

节点的连接边界与包含标注的占位边界分离：连线连接标记，布局考虑标注、描边与可观察几何的完整占位。文字测量与最终绘制走同一下层能力，不能用字符数估算或由浏览器补测。

### 有序分支与共享节点

每条分支必填独立的 `id` 和非空有序 `nodes` 引用数组；字段名使用 `nodes`，不使用含义不明确的 `content`。一个节点可以被多条分支引用，但只定义、测量和绘制一次。分支是路径，不是节点容器，不在节点上增加唯一 branch 归属。

- 分支内相邻节点依次构成有向推进约束，单节点分支合法且不生成连线
- 同一分支不能重复引用节点；多分支合成的推进拓扑必须无环
- 多条路径可以在共享节点处离开或汇合，不复制共享节点来伪造连接
- 分支 id 与节点 id 属于不同的 Source 集合；只有节点 id 发布为 Core 连接目标，分支 id 用于作者路径与结果对应

派生连接消费 Graph Relation 的端点和路径能力，最终下沉到 Core Path。默认投影为 `association`、`direction: none`，不要求作者为普通相邻节点配置边。分支级 style 直接投影 Graph Relation style，覆盖 Graph Theme 的缺省外观，不以分支身份改变节点外观。

默认同轨相邻节点直连，分叉与汇合处使用圆角正交过渡线接入或离开轨道；分支连续不意味着所有节点必须共线。第一版不接受手工 route、跨分支任意连接或回指边。已有相邻段的样式 / 路由覆盖与新增独立连接属于不同能力，遇到真实需求时分别设计，不预留空 options 或平行 relations 输入。

两条分支重复声明同一有向相邻段时，有效外观相同则合并为一次绘制，各分支仍可通过自己的相邻段位置对应同一几何结果。有效外观不同时显式报错，不按遍历顺序选择胜出样式。共享端点的合法性不因此改变。

真实 Git parent DAG 由消费方转换为有序展示路径，Git branch / tag refs 仍是节点附属内容，不直接作为本模型的路径成员真源。文档第一版表达上下篇和有序延伸阅读支线，任意相关链接或回指不编码成会形成推进环的分支。

### 主线与顺序

`mainBranch` 是可选的分支 id，必须引用已声明分支。主线节点顺序直接来自该分支的 `nodes`，不另存 mainline 数组，也不生成隐式分支。

主线节点使用同一条轨道，并沿逻辑推进方向出现。它不要求拓扑序中只包含这些节点，支线节点可以位于主线相邻节点之间。与主线相接的分叉与汇合不能改变主线连续性。

不声明 mainBranch 时，没有被语义指定的主线；内置布局按分支约束与稳定输入顺序安排轨道，不把某个 Git 分支名或第一个节点推断为领域主线。互不可达节点按节点目录次序打破排序平局，分支声明次序作为其余等价布局选择的稳定依据；两种次序均不能覆盖分支路径定义的先后约束。

### 外层装配与运行时边界

复用 Diagram 的 `presentation`、`frame`、`diagramDefaults` 与 Diagram Theme；title、description、drawing 和 legend 同属一个 Scene，空区域与缺省语义沿既有装配契约。图例仍由作者显式提供。

Branch 属于 `@retikz/diagram`，React / Vanilla 只提供同一 Source 的作者入口。Graph 保留关系语义、Core 保留图形与引用、Layout / Standard 保留测量组合和外框装配。Branch 不读取 Git 仓库、不解释网页路由，也不拥有点击跳转、编辑器状态或历史列表虚拟化；消费方通过既有 identity / metadata 与宿主交互能力完成这些行为。

## 基础数据结构与公开契约

### Source

持久化根判别为 `namespace: 'diagram', type: 'branch'`，公开入口在 Diagram、Diagram Vanilla、Diagram React 三包对称使用 `./branch`，不从包根聚合具体图类型。

| 成员                                         | 语义                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `nodes`                                      | 非空平级节点数组，id 在本图内唯一；声明顺序提供并列排序依据                 |
| `branches`                                   | 非空分支数组；每项必填唯一 id 与非空有序 nodes 引用数组                     |
| `mainBranch`                                 | 可选分支 id，指定保持连续主线的已声明分支                                   |
| `layout`                                     | provider-neutral 排布意图：direction 缺省 right，nodeGap 与 laneGap 缺省 48 |
| `presentation` / `frame` / `diagramDefaults` | 复用 Diagram 公共输入                                                       |

节点必填 id；shape、style、layout 和 labels 复用 Core 对应公开结构，其中位置、局部 transforms / placement 与 Node.text 由 Branch 的自动排布契约排除。根级整体变换仍属于宿主支持的 Core Scope 能力，不应用为节点私有位移。节点 shape 缺省为 circle，默认标记直径 10；标签方位沿 Core 缺省值 top，不另外设一份 Branch 标签默认。nodeGap 与 laneGap 表示包含外侧标签占位后的净间距，不是节点中心距。节点 layout 只投影 width、minimumSize。

节点目录的每一项必须被至少一条分支引用；独立节点使用单节点分支表达，避免默默绘制或忽略未使用定义。分支必填 id 与 nodes，可选 style；不设置独立分支名称或任意配置包。

最小 Source 形态如下；省略字段的物化由正式 schema / resolve 契约负责：

```json
{
  "namespace": "diagram",
  "type": "branch",
  "nodes": [
    { "id": "v1", "labels": [{ "text": "v0.1", "position": "bottom" }] },
    { "id": "feature", "labels": [{ "text": "专题扩展", "position": "bottom" }] },
    { "id": "v2", "labels": [{ "text": "v0.2", "position": "bottom" }] }
  ],
  "branches": [
    { "id": "main", "nodes": ["v1", "v2"] },
    { "id": "feature", "nodes": ["v1", "feature", "v2"] }
  ],
  "mainBranch": "main",
  "layout": { "direction": "right" }
}
```

Direct IR 是持久化真源。Vanilla `branchDiagram()` 接受同一作者结构；React `BranchDiagram` 下的 `BranchNode` 和 `Branch` 是平级声明 marker，分别收集到 nodes、branches 数组。`Branch` 的 nodes 属性是有序 id 引用，不嵌套声明 BranchNode。数组内保持作者顺序，再调度同一 Vanilla 归一化路径；React 不建立私有边输入，第一版不引入批量 marker、tuple shorthand 或隐式 id。

### 布局扩展与结果

Branch 使用独立的 `BranchLayoutDefinition` / `defineBranchLayout` 与 registry；不把 Flow 的 compound scope、placement 和 routing 参数强加给 Branch。运行时 options 提供 `branchLayouts` 与 `defaultBranchLayout`，算法选择不写入 Source，内置与自定义走相同注册、查找、校验和消费链。

一个同步、确定的布局 callback 原子地产生节点位置和分支路径。输入保留有序分支与主分支意图，并消费已经解析的布局意图和测量几何，不接收 DOM、ReactNode、renderer 或原始主题解析职责。邻接关系可按需推导，不把并存的 branches 和边列表作为两套权威输入。输出不生成 Core / Graph IR，不包含已渲染 Scene；Promise 或事后回填结果不合法。

几何使用统一 drawing-local 坐标，节点按 authored id 对应；分支路径按分支 id 及其有序相邻段对应，不虚构用户未声明的 relation id。共享节点只有一份几何，可能关联多条分支轨道；不得给它强制写入唯一 branch / lane 归属。provider 不得改变节点尺寸、文字、分支成员、推进顺序或主线约束。相同输入和 definitions 必须给出相同结果。

正式 artifact 使用 Core composite artifact envelope，标识 `diagram.branch`。内容覆盖实际 frame / regions、节点 id 对应的标记与占位几何，以及分支 id 对应的参考路由与轨道结果。完整图示平移后使用统一 allocation-local 坐标，world-space 查询沿 Core spatial handles。绘制和 artifact 消费同一布局输出；artifact 保存参考点和圆角参数，边界裁剪与圆角展开由 Core 完成，最终绘制几何由 Scene 提供。Source 不保存派生几何缓存或 artifact 副本。

## 行为、失败语义与兼容性

- 未知字段、非法 Core / Graph 子结构在输入 schema 边界拒绝；节点或分支集合内重复 id、空分支、悬空节点引用、未使用节点、同一分支重复节点、合成推进环和不存在的 mainBranch 在 provider 调用前拒绝
- 相邻重复节点构成 self-loop，不能借单节点分支的合法性放行；多个分支以相反次序引用共享节点形成环时必须拒绝
- 多个根和不连通分量合法，不补虚拟业务节点或伪造连接
- 未注册或重名布局、无法测量、provider 抛错、缺失或多余几何、非有限坐标和约束违反必须显式失败，不退回 Flow、不删除节点或分支、不保留上一份成功 artifact
- Branch 主动错误统一使用 RetikzDiagramError，包含稳定 code、阶段、Source path 与相关 id；外部异常保留 cause，provider output path 与 Source path 区分
- SVG / Canvas、Direct IR / Vanilla / React 必须消费同一结果；日期、Git refs 和阅读链接不会触发 adapter 私有规则
- 新增 Branch 不改变已有 Flow 输入、默认布局或输出；不提供 Track 旧名、别名、迁移层或双入口

## 公开表面与布局协议

节点继承 Core 的 shape、boundary、cornerRadius、style、meta 和 labels（下沉为 Node.label）；id 必填。layout 只开放 width、minimumSize，缺省 minimumSize=10，内部 padding 和 margin 固定为 0。位置、旋转、缩放、正文、动画和别名不属于自动排列节点表面。形状沿 Core registry，外观沿 Core defaults 与节点 style，不增加 Branch 专属 Theme 或 defaults 通道。

Branch 除 id、nodes 外开放 Graph Relation 的 style。分支不另设名称标签，名称通过节点 labels 表达；不开放 role、kind、方向或 marker。连接始终 association/none，共享段按有效 Graph appearance 判断一致性。

布局意图支持 right、left、down、up；nodeGap、laneGap 为非负净距，缺省 48。内置布局名为 lanes。节点按稳定拓扑序逐个推进，主分支先分配同一轨道，其他分支按声明序为未分配节点分配轨道，共享节点保留已有位置。标签包络参与推进和轨道距离计算，保证节点占位不互相覆盖；不承诺跨轨连线的全局无交叉或避障。同轨直线，跨轨使用中间推进坐标转折的正交线，圆角半径为 8，短段钳制沿 Core 规则。

BranchLayoutDefinition 具有 name、description 与同步 layout callback，完整支持本模型为准入条件，不设置可选能力白名单。输入为已解析 layout、有序 branches、可选 mainBranch，以及节点 id、原点处 markerBounds、visualBounds；不重复传入派生边。输出 nodes 按 id 提供 position 和 lane，segments 以 source/target 节点 id 对提供唯一参考 points 与 cornerRadius。回调不得改变节点集合、拓扑、主线和尺寸；结果必须完整、有限且保持推进顺序、主线同轨与净间距。输入隔离，输出校验后才用于绘制和 artifact。

artifact 保存 frame/regions、nodes（id、position、lane、markerBounds、visualBounds）、segments（source、target、参考 points、cornerRadius）与 branches（id、相邻段索引）。索引只用于本 artifact 内引用，不充当 authored identity；共享段无重复几何。最终路径从 Scene 消费，不要求 composite 内读取最终命令，不扩展 Core。

失败使用现有 Definition 错误族，以及 Branch 的 reference、topology、shared-style、measurement、layout-output 和 materialization 错误码。details 区分 Source path 与 provider output path，外部 callback 异常保留 cause。schema 负责持久化结构，resolve 负责引用、拓扑与继承后的不变量。

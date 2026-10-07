---
description: Tree 通过 root 的文字叶节点和对象配置呈现静态树，共用圆形节点、父子连接与层级排布，不承担树操作与一般图算法布局
keywords: Tree、树、collection、root、字符串、对象配置、父子关系、节点、连接、空子槽
---

# ADR-042：Tree 树结构呈现

- 状态：Accepted
- 决策日期：2026-10-06
- 关联：[roadmap](./roadmap.md) · [039](./039-chain-presentation.md) · [041](./041-queue-presentation.md) · [Standard 设计](../../../../architecture/standard-library-design.md)

## 背景与决策

数据结构插图需要把一棵树的当前结构画成内容节点和父子连线。作者已经知道根与子节点，不需要组件推断关系、执行搜索或维护数据结构。Tree 与 Stack、Queue 同属 Standard collection 的静态结构呈现能力。

新增 standard.tree composite。Tree 拥有显式递归结构、节点呈现默认、由结构直接确定的连接以及固定层级排列；节点、路径、箭头、文字测量、空间引用和渲染复用 Core 公开能力。Standard 不依赖 Graph 或 Diagram，也不建立平行关系数据库、路径几何或 renderer 语义。

这里的排列是给定有序子树的自然尺寸组合，不提供一般图到树的推导、布局算法选择、紧凑树算法、自动避障或边路由引擎。BST、Heap、Trie 等结构的插入、删除、旋转、排序与合法性由使用者负责；Tree 只展示传入快照。此决策将架构中未区分静态树组件与算法布局的 Tree 非目标表述收窄为一般图算法布局。

## 输入与公开契约

TreeSchema 是 JSON-safe Source 真源，IRTree 从其输入派生，namespace 固定 standard，type 固定 tree。唯一结构入口 root 必填，接受字符串、节点对象或 null。所有结构明确来自有序 children，不从文字或普通 JSON 值推断父子关系，不引入额外边表。

```ts
type TreeItem =
  | string
  | {
      id?: string;
      content?: string;
      children?: Array<TreeItem | null>;
      node?: NodeOptions;
      connection?: false | ConnectionOptions;
    };
```

字符串是文字叶节点，与 { content: 同一字符串 } 等价。对象提供文字、显式身份、局部节点外观、进入连接及后代。children 可混用字符串与对象；省略 children 或空数组表示叶节点。内容原样显示，省略 content 或空字符串表示可见空节点；需要数值或 JSON 字面量时由调用方生成文字。

root:null 表示空树。children 中的 null 是空子槽，保留布局但不绘制、不连接、不产生身份；{} 与空字符串均是可见空节点，不等同于 null。Source 保留字符串简写与稀疏对象，不保存另一份展开树；factory 不预先展开或补默认，schema.parse 仅物化静态默认。

```tsx
<Tree
  root={{
    content: 'A',
    children: ['B', { content: 'C', children: [null, 'D'] }],
  }}
  connection={{ path: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] } }}
/>
```

数据树、符号树都可直接用 root 表达，不再提供 data、skeleton 或对应 Schema / 类型，不保留兼容转换。节点内容限文字；复杂 drawable、forest、多父节点、跨支路连边与回边不属于该输入。作者可在外层组合多个 Tree 或通过公开 id 增加独立 Core Path。

## 节点呈现

根 node 提供节点默认，单项 node 只覆盖该节点。NodeOptions 复用 Core Node 的 shape、style、layout 三组字段；不开放 position、children、type 或另一份 id。节点位置由树结构确定，身份来自 TreeItem.id。

默认 shape 为 circle，style 为 stroke=currentColor、strokeWidth=1、fill=none，文字颜色沿 Core。layout 默认 minimumSize=32、padding=2、margin=0，其余文字测量和自动尺寸采用 Core Node 语义。默认尺寸是最小尺寸，长内容可使节点增大，不静默裁切或缩小文字；circle 的实际轮廓与内容适配沿 Core shape 契约。自定义形状复用既有 Node Shape definition / registry 和依赖装配，不新增 Tree 专属形状注册体系。

单项稀疏配置优先于根 node；先合并作者显式配置，再应用默认。style 与 layout 按 Core 已有字段合并语义处理，数组替换而非拼接。单项覆盖不隐式传播至后代，所有后代仍从根 node 获取公共默认。

## 层级排列

layout.direction 默认 down，另支持 up、right、left；表示根到后代的生长方向。down/up 的子项始终按屏幕从左到右排列，right/left 的子项始终按屏幕从上到下排列；改变方向不改变输入顺序或身份。

levelGap 默认 32，siblingGap 默认 24，均为有限非负数，表示边界之间的净留白，不是中心距离。Tree 使用实际节点 allocation 尺寸排布。同深度节点的主轴中心对齐；相邻层依据该两层最大节点主轴尺寸保留 levelGap。节点自身宽高是物理尺寸，方向变化不交换字段含义。

兄弟子树以完整 allocation 包络在交叉轴并排，包络之间至少保留 siblingGap，保持每棵子树内部结构，不交错压紧。父节点中心对齐首个与末个直接子槽根节点中心的中点，null 子槽按占位中心参与；更深后代的包络不得直接决定父节点位置。父节点超出子树整体包络时扩展包络，并整体平移内部结构以保留非负局部坐标。只有一个实际子槽且没有 null 时，父子中心对齐。该确定规则接受较宽留白，不承诺最小面积或与紧凑树算法相同的坐标。

null 子槽以根 node 默认配置下空节点的自然尺寸保留一个叶位置，不继承相邻节点或父节点的单项外观覆盖。仅有空子槽时仍保留作者明确声明的空间；空树用 root:null 表示。

自然布局不因父容器提供额外空间而拉伸节点或改变间距；更大的 exact/range proposal 将剩余空间留在右侧和下侧，小于自然需求的约束沿现有 layout-aware 失败语义报错。描边、箭头、标签的视觉溢出进入可见范围，不作为避障或额外排列约束。

## 父子连接

每个非根实际节点恰有一条来自直接父节点的连接，顺序为父到子。根 connection 配置全部连接，子项 connection 仅覆盖进入该子项的一条边；根节点对象上的 connection 无进入边，属于无效配置并报错。false 隐藏对应连线而保留结构和排列；被根 false 隐藏时，子项显式对象可以重新开启该边。

ConnectionOptions 采用与 Chain 一致的 route/path 词汇。route 默认 straight；还支持 Core Fold 的 -|、|-、-|-、|-|，仅 -|- 与 |-| 接受 Core fraction，默认沿 Core 契约。Tree 不提供 Chain 的 auto 分支通道路由。

path 复用 Core Path 非结构属性，排除 type、id、children、kind、kindOptions。默认 stroke=currentColor、strokeWidth=1、fill=none、marks=[]，即可见连线且无箭头。作者用 path.marks 启用父到子箭头或其它 Core 标记，自定义箭头沿 Core 统一 registry。子项对象与根对象按稀疏配置合并，marks 显式数组替换，空数组清除继承标记。切换 route 时按最终 route 校验 fraction，不保留不适用字段。

连接与 Chain 共用 Core 的边界引用及路径能力，不直接照搬 Chain 的平行分支拓扑。直线沿父子中心连线在节点真实 shape 边界截断；折线将父子节点作为完整目标交给 Core fold 语义，依据首末线段方向在真实轮廓裁剪，不预先绑定生长方向的固定 anchor。箭头裁短和描边处理由 Core 负责。连线位于节点内容下方，不穿过节点中心；折线不保证绕开其它节点或连接，不静默切换路由。

## 身份、适配与失败

TreeItem.id 为可选显式身份，复用 Core namespace；不从文字、下标或结构路径推导公共 id。节点登记其 Core Node 边界，外部 NodeTarget 使用该 id 寻址真实节点轮廓，根 Tree id 表示整棵树容器。节点 id 不加 cell: 前缀，因为目标是具备形状语义的 Core Node，而非矩形 Cell。重复 id 沿有效命名空间规则失败；内部父子连线不要求作者为所有节点提供 id，也不暴露自动生成的公共身份。

Standard collection 提供 TreeSchema、TreeItemSchema、TreeNodeSchema、TreeLayoutSchema、TreeConnectionSchema、相应 IR 类型、createTree、TreeDefinition、TreeProvider。Vanilla 提供 tree、InputTree、TreeInputEmbedAdapter；React 提供 Tree、TreeProps。React 通过必填 root 属性接入，不另增 TreeItem JSX marker 或 children 结构入口，顶层 JSX children 不接受。Vanilla、React 与直接 Source 表达同一套结构、默认与失败语义。

Source 保留稀疏配置，不持久化展开节点表、父指针、边表或计算坐标。root 缺失、未知字段、非法结构、content 非字符串、非有限/负间距、无效形状/路径配置在相应 schema 或 definition 边界失败；带循环的 JavaScript 对象不属于 JSON-safe Source。节点测量、引用、缺失依赖和父约束错误沿 owner 诊断链路传播，失败不发布部分树。

Tree 是新增能力，不改变已有集合或 Chain 的公开默认、连接与布局。实现需同时提供直接 IR、Vanilla、React 和 SVG/Canvas 的等价行为，以及双语用法、Schema/API 参考和可观察的节点/连接/排列示例。Accepted 仅表示设计获批，不表示实现或发布完成。

---
description: Chain 用可嵌套的串并联结构呈现任意内容单元，支持有序分叉、重新汇合、两层对齐和正交连接，不建立任意图关系或自动避障模型
keywords: Chain、链、collection、串并联、分叉、汇合、对齐、正交连接
---

# ADR-039：Chain 串并联内容呈现

- 状态：Accepted
- 决策日期：2026-10-05
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../../architecture/standard-library-design.md) · [038](./038-matrix-presentation.md) · [Graph 001](../../../../../../schematic/_notes/decisions/graph/v0/v0.1/001-graph-package-family.md)

## 背景与决策

链表、处理链、算法说明与论文插图需要把任意内容按顺序连接，允许有序分叉，并在后续单元重新汇合。内容可能是文字、空单元、图形或嵌套集合；不同尺寸和不同长度的分支需要可预测的对齐。

Standard 新增 `standard.chain` composite，表达由作者明确给定的串并联结构。结构决定连接关系，排布与连接不各自保存一份节点／边模型。分叉是结构中的并行块，块内每条分支是一段序列，可以递归包含并行块；其前后单元分别是共同起点与汇合点。

Chain 不解释条件判断、流程执行、依赖、端口或图式角色。任意跨分支连边和回边不属于结构输入，Graph 保留关系语义，Diagram 保留由一般图关系推导布局和自动路由的职责。通用内容、测量、坐标、正交段、箭头、裁切与空间引用继续使用 Core / Layout 的公开能力；Standard 不反向依赖 Graph 或 Diagram。

本决策接受后，替代 roadmap 原先 Chain 不承担分支的限制；不恢复已被取代的 Standard Logic Diagram Profile，也不引入任意图算法。闭合链需要独立定义回边和通道，本契约不提供 `closed` 开关。

## 输入结构与内容

`ChainSchema` 是 JSON-safe Source 真源，`IRChain` 为输入类型，固定 `namespace: 'standard'`、`type: 'chain'`。三种内容入口恰好选择一种：

| 入口       | 形态                                     | 语义                                                   |
| ---------- | ---------------------------------------- | ------------------------------------------------------ |
| `items`    | `Array<string \| IRChainItem>`           | 显式串并联结构，支持任意 drawable 内容                 |
| `data`     | `ReadonlyArray<JsonValue>`               | 每个 JSON 值形成一个串联单元，不把数组或对象推断为分支 |
| `skeleton` | `{ count }`、`{ labels }` 或 `{ items }` | 无真实数据的线性或串并联骨架                           |

```ts
// 下列片段只展示结构字段；Cell 的内容、外观与尺寸复用现有集合契约
// IRChainItem 的 kind 为 cell 或 parallel
{
  namespace: 'standard', type: 'chain',
  items: [
    { kind: 'cell', id: 'a', content: 'A' },
    {
      kind: 'parallel',
      branches: [
        { items: ['B', 'C'] },
        { items: ['D'] },
      ],
      layout: { branchAlign: 'center', spacing: 'steps', justify: 'start' },
    },
    { kind: 'cell', id: 'e', content: 'E' },
  ],
}
```

`kind: 'cell'` 在既有 Cell 契约上增加判别字段，沿用 `content?`、`id?`、`style?`、`layout?`。字符串是文字单元的简写；省略 content 是空单元，显式空字符串仍是文字。drawable 为一个 Core child，多个图元先组合成一个 child；不限制内容组件种类，不要求内容自身必须是 Core Node。

`kind: 'parallel'` 拥有 `branches` 与可选 `layout`、`connection`。每条分支是 `{ items: Array<string | IRChainItem> }`，数组顺序决定横向链从上到下、纵向链从左到右的支路顺序。parallel 是结构块，不额外绘制节点或边框，不具有单元内容。

每个并行块必须有至少两条非空分支，每条分支首尾必须是 cell。并行块在所属序列中必须紧邻前后两个 cell；不允许位于序列首尾或连续出现两个并行块。嵌套分叉在分支内按相同规则表达。空支路、隐式直通支路及悬空分叉不在本契约中；需要可见空单元用空 cell，不用空数组代替。该约束使每次分叉和汇合都有唯一明确的内容单元。

根序列允许为空或只有一个 cell：空序列无连接、自然尺寸为零；单单元不产生连接。Source 不保存推导的边表、布局坐标、轨道或虚拟分叉节点。

`data` 沿集合 JSON 字面量与递归展开语义，`dataExpand: boolean | Array<'map' | 'array'>` 默认 true，仅可用于 data；嵌套对象与数组按配置展开为 Map / Array，不递归推断 Chain。

### 三种骨架表示

skeleton 保留 count 与 labels，并新增递归 items，三个闭合对象分支恰好选择一个，不可混用：

```ts
type ChainSkeletonItem = string | { branches: Array<Array<ChainSkeletonItem>> };
type ChainSkeleton =
  | { count: number; labels?: never; items?: never }
  | { labels: Array<string>; count?: never; items?: never }
  | { items: Array<ChainSkeletonItem>; count?: never; labels?: never };
```

- count 为非负安全整数，表示指定数量的线性空单元。
- labels 为字符串数组，表示线性符号单元；重复文字合法，空字符串表示无内容单元。
- items 中的字符串同样表示符号或空单元，`{ branches }` 明确表示有序并行块，每条分支为可递归嵌套的骨架项序列。

```ts
skeleton: {
  items: ['A', { branches: [['B', 'C'], ['D']] }, 'E'],
}
```

该骨架表示 A 分叉为 B → C 与 D，再汇合到 E。骨架并行块复用完整 items 的结构限制：至少两条非空支路，在所属序列中紧邻前后符号单元，支路首尾也必须是符号单元；空字符串是合法空单元，空数组不是直通支路。count 为零、labels 或 items 为空数组均表示空链。

骨架三种形式复用同一套排布、对齐、连接与错误语义；相同符号序列的 labels 与骨架 items 输出等价，count 为 n 与 n 个空字符串等价。骨架只保存作者所选表示，不持久化展开后的完整 items。所有骨架形式均不接受 dataExpand，文字原样显示，不解析 JSON 或公式。

骨架分支对象仅接受 branches，不允许逐单元 id、drawable、style、layout 或局部 connection；使用根配置控制整体对齐与连接。需要逐项外观、局部并行配置或内容图形时使用根级 items。这里的 skeleton.items 是骨架内部的第三种表示，不是根级第四种内容入口，React 与 Vanilla 均通过同名 skeleton 属性接入。

## 排布与两层对齐

根 `layout` 包含 Cell 的宽高、padding、overflow 默认与以下结构字段。单个 cell 的 layout 只含 Cell 字段，不能改变链方向或连接规则。

| 字段          | 可选值与默认                                                | 作用                                         |
| ------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `direction`   | `right / down`，默认 right                                  | 顺序推进方向；所有内部并行块继承同一方向     |
| `gap`         | 正有限数，默认 24                                           | 相邻串联项的主轴边界间距，同时为连接提供通道 |
| `branchGap`   | 正有限数，默认 24                                           | 相邻完整分支包围盒的交叉轴间距               |
| `branchAlign` | `start / center / end` 或 `{ branch: number }`，默认 center | 分支组相对分叉前单元的交叉轴位置             |
| `spacing`     | `independent / steps`，默认 steps                           | 各支路独立排布，或共享步骤轨道               |
| `justify`     | `start / center / end`，默认 start                          | 短分支在公共主轴跨度中的位置                 |

parallel 的 layout 可局部覆盖 `gap`、`branchGap`、`branchAlign`、`spacing`、`justify`，未提供字段逐级继承；不能改变 direction 或 Cell 外观默认。其 gap 同时用于该块内部的串联间距和该块与前后单元之间的间距，避免两套入口／出口间距互相冲突。

**主链基线**是单元交叉轴中心连成的参考线。普通序列的单元中心保持在该线上。并行块之后的汇合单元回到同一基线；汇合位置在整个并行块之后，并保留 gap，不由任意一个较短支路决定。

**分支组对齐**基于所有支路 allocation 的整体包围盒，包含嵌套块，不只看第一层单元。start / end 把该包围盒的交叉轴起端／末端与分叉前 cell 的对应边界对齐；center 把两者中心对齐。`{ branch: n }` 将第 n 条直属分支的主链基线与父序列基线重合，n 为零基有效分支下标。横向链的起端／末端是上／下，纵向链是左／右；不以文字阅读方向改变解释。

**内部对齐**与上述分支组位置独立：

- independent：每条支路使用自身内容自然尺寸与 gap，公共主轴跨度取最长支路；justify 把短支路放在跨度的起端、居中或末端。
- steps：同一并行块的直属分支共享步骤轨道，轨道数量取最多直属项数量。cell 或嵌套 parallel 各占一个步骤，嵌套 parallel 作为完整块测量，不把其后代步骤摊到父级。
- steps 下，start 从首轨道开始，end 从末轨道倒排；center 把较短支路前置 `floor((总轨道数 - 支路项数) / 2)` 个空轨道，多出的空位留在末端。各轨道主轴尺寸取所有占用项的最大需求，项在轨道主轴内居中；只有保留间距，没有拉伸单元或生成空节点。
- 父级的轨道对齐不改变嵌套并行块自身的对齐规则。内容尺寸变化后重新测量，支路次序不变；不自动排序或交换支路来减少交叉。

Cell 默认尺寸、padding、背景、边框与内容裁切沿现有集合契约；auto 按内容自然测量，固定尺寸不缩放内容。单元尺寸与主轴轨道尺寸分离。分支的布局边界不包含文字溢出、箭头尖端或阴影，overflow visible 的内容可覆盖连接，Chain 不执行视觉避障。

根遵守 Core / Layout proposal、Scope 变换、主题、defaults、命名空间及 clip 契约。自然布局不会为了容纳父约束而压缩 gap 或缩放内容；exact / range 无法容纳时按既有布局契约失败，多余空间留在末端。

## 正交连接与箭头

相邻 cell 自动连接；parallel 前的 cell 连向各支路第一个 cell，各支路最后一个 cell 连向 parallel 后的 cell。父级起点不直接跨过分支连接汇合点。嵌套连接只由其自身结构产生。

根 `connection` 为自动生成连接的默认配置，parallel.connection 逐字段覆盖并作用于该块的分叉、内部连接与汇合，嵌套块继续继承。配置含：

- `route: 'auto' | 'straight' | '|-' | '-|'`，默认 auto。
- `path?`：复用 Core Path 的非结构性呈现字段，包括 style、label、marks、变换及其它适用的 Path 配置；排除 type、id、children、kind、kindOptions，且不接受 namespace、way、steps 等字段。默认 stroke 为 currentColor，marks 为一个 pos=1 的 arrow mark。显式 marks（包括空数组）替换默认列表，可表达无箭头或双向箭头，其余默认与失败语义沿 Core Path。

结构拥有生成连接的身份、起点、终点和折点，因此不能通过 path 覆盖这些字段。该限制不裁剪 Core 路径样式能力；需要独立几何、任意端点或独立身份的线条，使用外部 Core Path 引用显式 cell id。

默认采用以下正交连接，普通同基线串联退化成直线：

| 主方向 | 分叉            | 汇合            |
| ------ | --------------- | --------------- |
| right  | `\|-`，先纵后横 | `-\|`，先横后纵 |
| down   | `-\|`，先横后纵 | `\|-`，先纵后横 |

端点使用 cell allocation 边界的主轴侧中点：right 使用源右侧、目标左侧，down 使用源下侧、目标上侧。内容自身的形状与 id 不改变 cell 的连接边界。

为避免正交折线贴着父单元边框展开，auto 连接在入口／出口 gap 中点预留公共折转线：分叉先沿主轴走到入口折转线，再用表中折角接入目标；汇合先用表中折角走到出口折转线，再沿主轴接入汇合单元。短支路仍通过整个并行块的入口／出口折转线连接，不能把折转线移进其它支路的内容区域。重复线段允许在共同干线上重合，仍是独立 Core Path；不额外生成圆点或可寻址分叉节点。

显式 straight、`|-`、`-|` 直接应用于各条连接的两个端点，不使用 auto 的公共折转线；作者承担可能穿过内容的结果。Core 拥有实际路径几何、箭头裁切、label、marker 与诊断。Chain 只提供结构所需的坐标和折角选择，不增加正交路由器、避障器或自定义 Scene primitive。

## 身份、组合与公开入口

根 id 沿 Core 容器语义；cell 显式 id 引用其实际 allocation，使用 `chain-cell` 空间角色与既有集合 owner-local identity，content 中的身份仍表示自身几何。重复 id、namespace、变换后的空间引用与 ownerPath 均沿 Core 契约。自动连接不要求作者提供 id，不生成可持久化的全局节点编号，也不提供位置生成 id 模式；外部引用使用显式 cell id。

根 label 沿现有集合容器标签契约，依附整个 Chain allocation，不参与单元排布。空 Chain 仍遵守根标签、强制 allocation 与 prune 的现有语义。

Standard 提供 `ChainSchema`、`IRChain`、`IRChainItem`、`createChain`、`ChainDefinition`、`ChainProvider`。Vanilla 提供 `chain()`、`InputChain` 与 `ChainInputEmbedAdapter`，drawable 内容通过既有 normalizeScene 接入；React 提供 `Chain`、`ChainCell`、`ChainParallel`、`ChainBranch` 及对应 props。

```tsx
<Chain layout={{ direction: 'right' }}>
  <ChainCell text="A" />
  <ChainParallel layout={{ branchAlign: 'center', spacing: 'steps' }}>
    <ChainBranch>
      <ChainCell text="B" />
      <ChainCell text="C" />
    </ChainBranch>
    <ChainBranch>
      <ChainCell>
        <Matrix skeleton={{ rows: 2, columns: 2 }} />
      </ChainCell>
    </ChainBranch>
  </ChainParallel>
  <ChainCell text="E" />
</Chain>
```

React children 只是 items 的 authoring 形式，不能与 items / data / skeleton 混用。ChainCell 的 text 与唯一 drawable children 互斥，均省略时为空单元。ChainParallel 只接受 ChainBranch；ChainBranch、根 Chain 的结构 children 只接受 ChainCell 或 ChainParallel，Fragment 和数组按既有 marker 规则透明展开。ChainBranch 只有结构 children，不独立拥有 id 或视觉边框。根不提供内容入口时表示空链，直接 IR 与 Vanilla 必须显式选择入口。

React／Vanilla 的 connection.path 额外接受既有 InputPath 的 arrow、arrowDetail、arrowPlacement 简写，复用公开 normalizePath 转成 marks；arrow=none 或显式 marks=[] 保留无箭头语义，Source 不保留箭头简写。

React 的 items 属性提供文字与文本 cell 的结构形式；drawable 用 children，与既有集合约定一致。直接 IR、Vanilla drawable 与 JSX 对等表达同一能力。所有结构默认和几何由 Standard 真源解释，adapter 不自行布局或连线。

Provider 通过 Core assembly 接入 Chain、Cell 裁切、箭头及任意内容的显式依赖；data 递归展开同时需要 Array / Map。直接 IR 作者按现有公开规则提供所需 provider。内置内容与第三方 drawable 走同一测量、编译和空间发布路径，无 renderer 特判。

## 失败语义与兼容性

入口混用、非法判别字段、未知字段、非 JSON 数据、骨架非法数量或非字符串单元、骨架 count／labels／items 混用、空支路、单支路并行块、没有前后单元的并行块、无效 branch 下标、非正或非有限间距在所属 Source／authoring 边界失败，诊断包含结构路径与分支位置。骨架递归结构与完整 items 使用相同的分支约束，不能把失败输入降级为空节点或线性链。尺寸和内容沿 Cell 契约校验。

缺失 definition、内容测量、父约束与底层路径错误保留所属错误及 cause；编译／更新失败不发布部分 Chain。Core 自身的 warning / skip 合同不被重新解释为成功占位，外部 Path 引用沿 Core 既有诊断规则。

Chain 是新增独立能力，不改变 Array、Map、Matrix 的输入、布局或数据展开语义。公开行为需覆盖 React、Vanilla、直接 IR 与 SVG / Canvas 的等价输出；双语文档应说明结构限制、两个对齐维度和默认正交通道。Accepted 表示设计获批，不代表实现或发布完成。

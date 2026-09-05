# ADR-05：Theme 来源与稀疏 Source 默认值协议

- 状态：Proposed
- 决策日期：2026-09-05
- 主责：Core 的跨包 Theme 协议；领域 Source、defaults 与规则由各领域 owner 持有
- 关联：[alpha.4 roadmap](./roadmap.md) · [ADR-04 Source 分组](./04-source-ir-semantic-grouping.md) · [Core 绘图完备设计](../../../../architecture/core-drawing-complete.md) · [视觉主题设计](../../../../../../../notes/architecture/visual-theme-design.md) · [原子契约设计](../../../../../../../notes/architecture/atomic-contract-design.md)

## 背景与目标

Source 已用 style、layout、defaults 区分实例视觉、布局与后代默认。领域 Theme 若继续把这些字段压平为 token 或 appearance，就会重复维护路径、值契约和覆盖规则；只更新字段引用不能解决这一差异。

目标是在 Core 环境与默认通道稳定的前提下，冻结所有 Theme consumer 共同遵守的 Source 片段协议。领域默认片段能够复用正式输入、参与现有解析链路并产生可解释结果，不把数据、内容、拓扑或领域算法配置引入视觉主题。

## 决策：目标类型选择默认作用域，片段保持 Source 形态

Core 的 Scene / Scope theme 继续只保存可继承的 style / mode selector。现有 Core style definition / registry 解析 shared colors，Composite 获取当前位置的有效环境。领域 Theme 不进入 Core 环境对象，Core 不引用领域 schema 或新增全仓 Theme registry。

领域默认值与目标 Source 同构且稀疏，Theme 是这些默认值的一个来源。`theme` 选择环境，由内置或宿主 definition 生成默认；作者用 `xxxDefaults` 直接指定稀疏默认，实例用正式字段覆盖。definition 生成值和作者默认采用同一片段契约，但来源、作用域和优先级独立，不经平行 token 字典转换。

默认值外层选择实际消费目标类型，片段内部复用对应 Source 的同名字段、分组、值域和覆盖语义。entity 片段对应 Entity Source，不对应 entities 数组的某个元素。具名 Theme 的 definition 仍可生成受限的条件规则；默认值与规则分别承载，不把条件匹配混入无条件默认。

理由：

1. 正式 Source 成为字段与覆盖语义的唯一真源，消除 token 与实例配置之间的同义映射
2. 目标作用域与实例结构分离，使主题不会替换 identity、内容、数据或关系成员
3. 原 owner 保持语义与扩展职责，Core 只提供已有环境和绘图底座
4. 覆盖粒度与 Source 一致，字段分组不引入隐式深合并

Core 协议归属不使领域包加入 Kernel 发布组。该 ADR 冻结共同协议；各领域精确 defaults 字段集合、规则作用域和与作者默认通道的优先级，由对应 owner ADR 冻结后实施。该过程不允许保留 flat / nested 双轨作为长期公共契约。

## 基础数据结构与公开契约

### 环境、默认通道与目标片段

领域显式默认入口统一使用复数 `xxxDefaults`，例如 graphDefaults、diagramDefaults、flowDefaults；不得并存同义 xxxTheme、xxxDefault、xxxDefaultStyle 或 flat tokens。独立规则使用其领域入口，例如 graphRules。Core 的裸 defaults 仍保留现有 node/path/label/arrow/reset，不成为领域默认值聚合容器。

Theme definition 的生成片段与 xxxDefaults 复用值契约；需要规则的 owner 可以在 callback 输出中分别返回 defaults 和 rules。callback 的生成结果不是第三套持久化配置入口。主题切换重新生成主题默认，不能被当作清空作者显式 defaults 的操作。

以下类型关系说明现有 Core 契约如何被领域选择复用，不新增自动作用于 Core primitive 的 Node Theme API：

```ts
type NodeDefaultsFragment = Pick<IRNode, 'style' | 'layout'>;
type PathDefaultsFragment = Pick<IRPath, 'style'>;
```

领域按自身语义进一步收窄：Graph Entity 不能因复用 Node layout 而获得角色禁止的 padding；Graph Relation 不能因复用 Path style 而开放 fill。默认片段允许的字段集合不会因为底层 Source 新增字段而自动扩大。

实例与默认片段的对应示例：

```json
{
  "entity": {
    "style": {
      "color": "#2563eb",
      "font": { "size": 14 }
    },
    "layout": {
      "align": "middle",
      "minimumSize": { "width": 100 }
    }
  }
}
```

对应 Entity 实例使用相同的 style、layout 子树。默认片段不包含该实例的 id、text、role、status、position 或关系引用。

Source 的主要事实不为 Theme 移入 style；既有小型 label、arrow、Guide 子契约也不机械增加分组。自动 routing 与布局算法选择继续由 Source 的正式领域配置表达，不能因属于默认值就进入 Theme。表现性尺寸和间距可主题化，但不承诺 Theme 切换后的几何坐标或尺寸不变。

Core Scope 的 style、defaults.node、defaults.path、defaults.label、defaults.arrow 与 defaults.reset 保持原能力。Theme 环境不代替 defaults，reset 不切断 Theme 环境。原始 Core Node / Path 不因环境选择自动应用领域 preset。

### 领域 Source 与可见性

领域的每个默认片段必须具有正式 Source 或命名配置目标。缺少目标表达时，由领域先冻结 Source，再派生 defaults；不得把最终 appearance 当持久化作者输入。

presentation 区域的内容与格式应共存于正式区域对象，默认片段只选择格式字段。Theme 不创建省略的标题、Axis、Legend、Mark 或 Relation；已有对象内的 baseline、grid、tick 或 label 装饰可按 owner 明确允许的字段隐藏。

Chart 只转发 Plot 的公开 defaults 片段，不能维护同义的 Plot token vocabulary 或复制其 resolver。Flow 复用 Graph 的受限输入与语义解析，不绕过角色限制。Table 的 Cell 默认与有条件的列头覆盖分别复用其正式输入和已有规则能力。

### 规则覆盖

无条件 xxxDefaults 与 selector rules 是独立契约，规则不放在 xxxDefaults 内部。规则保持目标 type 与 selector，作者覆盖使用对应 Source 字段，例如：

```json
{
  "type": "entity",
  "selector": { "status": "error" },
  "style": { "color": "#dc2626" }
}
```

规则允许字段可以窄于无条件 defaults。颜色状态规则不因此获得布局覆盖能力；selector 中的 status、role、direction 只是匹配条件，不成为赋值。现有语义状态默认与有序规则能力必须保留，规则容器的精确字段和作用域由领域 ADR 定义。已确定的 appearance 继续用于 resolve / manifest / inspection，不新增同义的作者 appearance 包装。

### 覆盖粒度与优先级

style / layout 是字段命名空间。只覆盖 style.fill 时保留 style.stroke，只覆盖 layout.align 时保留其它布局字段。缺失与 optional undefined 不参与覆盖；空组表示没有覆盖；0、false 和允许的 null 依对应字段语义生效。

复合叶子必须沿用 Source 契约，包括跨 Theme、规则、defaults 和实例入口：Node font 整体覆盖；label font 逐字段补全。paint、shadow、spacing、scale、数组与判别联合保留原粒度，不使用通用递归深合并。显式 palette 数组整体替换，保留用户顺序、长度与值。稀疏片段不递归解除复合叶子的判别字段或必填约束。

Core 先解析环境。领域从 shared colors 建立 baseline，经同名 style definition 生成主题默认，再应用作者 xxxDefaults，最后应用实例显式配置。缺省 categorical 来源是 Core；definition palette 高于共享 baseline，作者 defaults palette 再覆盖它，实例 scale range / scheme 最终胜出。规则的插入位置与嵌套作用域仍由领域冻结，不把三种来源的关系误当全仓唯一级联。

Scope style、defaults、reset 与元素字段仍按 Core 既有规则处理。领域需在自己的 ADR 冻结规则、局部默认和实例之间的完整次序；不得因 lowering 把主题默认物化成显式字段而改变作者优先级。该协议不新增全仓统一的跨 owner 合并函数。

### 解析结果与扩展

持久化片段由 owner schema 派生公开 IR 类型；内部有效结果由这些类型派生，不新增消费态 Zod schema。环境阶段可确定的必需字段由 Theme resolver 补齐，内容和目标上下文相关字段由目标 resolver 决定，不机械要求整个结果 required。

内置 Neutral 与宿主风格复用现有 owner-local style definition / registry 和解析入口。同名风格缺少消费 owner 的 definition 时明确失败，不回退 neutral。共享 categorical 仍以 Core 为单一真源，受维护色相索引与 mode 连续性契约不变。

领域最终把有效默认应用到正式 Standard / Core 输入，再产生 Scene。adapter 不定义另一份 Theme、renderer 不按 preset 名称补默认。既有 ThemeTokenSource 的 inherit / local 含义不因字段结构调整而改变；诊断和 inspection 使用真实嵌套路径，不把来源类别当作完整优先级或虚构 Scope lineage。

## 行为、失败语义与兼容性

- 默认行为：省略 xxxDefaults 或提供空片段表示无作者默认覆盖，继续使用有效环境生成的默认；环境与作者 defaults 都不生成省略的语义对象
- 校验边界：外部 Source 由 owner Zod 单次 parse，直接使用成功结果；不增加通用 JSON walker、undefined 清理、冻结或二次校验
- 失败语义：未知字段、错误分组、非法值和结构字段由 owner schema 在真实路径上拒绝；缺少 definition 和补全后的领域不变量由 owner resolver 诊断
- 合并结果：合法部分覆盖不清除无关字段；复合叶子行为保持 Source 语义，数组和 union 不按通用对象递归混合
- mode 行为：light / dark 保持语义对象集合、内容与数据不变，不借明暗模式改变布局方向、路由策略或 guide 的存在性
- 兼容性：领域迁移属于公开 Source breaking change；删除旧 flat token、同义 xxxTheme / appearance 作者入口、旧字段别名与双向 projection，不保留兼容 schema 或双读模式；具名 Theme environment 与 definition 机制继续存在
- Core 边界：环境、默认通道与原始 primitive 的行为保持稳定；不新增 Core 对领域 schema 的依赖、自动主题化或 renderer Theme 行为
- React / Vanilla 等价性：两者表达同一 owner Source 片段，Vanilla 承担 authoring 组装，React 调度同一输入；完整 Direct IR 不需要额外 adapter 转换
- 可观察结果：Theme 可改变允许的样式和表现布局，但不改变数据、identity、成员拓扑或语义对象集合；来源诊断分别保留主题生成、作者 defaults、规则与实例入口，不得依赖值相等猜测

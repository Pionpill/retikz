# 通用视觉主题设计

> **状态：长期架构方向已确认。** 本文定义 renderer-neutral 可视化主题的核心模型、token 治理、通用 preset 语义、跨包边界与演进原则；不冻结任一版本的精确 token key、色值、尺寸、schema 或实现文件。当前公开契约以各能力域 Accepted ADR、代码与用户文档为准。
>
> 适用范围：Chart、Plot、Table、Standard 与未来 Geo 等可视化能力。本文不约束 `apps/docs` 的 shadcn UI、CSS variables、站点 chrome，也不定义宿主应用自身的设计系统。
>
> 关联：[`能力完备性与模块边界`](./capability-design.md) · [`包拓扑`](./package-topology.md)

---

## 1. 定位与效力

视觉主题是可视化系统的公开表现性配置协议。它用一组稳定、可检查、可序列化的 token 描述 surface、排版、guide、数据色彩和领域表现性默认，再由各能力 owner 映射为正式 IR、schema、composite、provider 或 lowering 输入。

本文维护长期通用真源：

- theme 的核心模型与解析原则
- token vocabulary 的命名、分区和治理规则
- token 到 owner capability 的映射约束
- `neutral`、`academic`、`vibrant`、`clean` 四个 preset 的稳定视觉人格
- light / dark mode、自定义、诊断、测试和演进原则

版本 ADR 维护可执行真源：

- 当前能力域支持的精确 token key 与 value contract
- 每个 preset / mode 的具体色值、尺寸和图元参数
- schema、公开类型、resolver、consumer 与文件范围
- 与既有 shorthand / theme 字段的具体 merge 规则
- 本次实现、测试、文档与兼容性范围

长期文档不复制版本 ADR 的完整 token 表或常量值。若实现需要改变通用协议、preset 人格或 owner 边界，必须先更新本文；若只调整具体值、增减某个领域 token 或修改实现范围，只更新所属版本 ADR。

## 2. 问题与目标

Plot、Table、Chart 等能力都需要开箱即用的视觉默认，也需要让用户精确控制轴是否出现、线条颜色、tick 图元、字体、间距和数据 palette。若每个包分别维护不透明的 `theme` 对象、颜色数组和 renderer 特例，会产生四类问题：

1. preset 名称只能选整套外观，无法覆盖单个属性
2. light / dark 被误当成视觉人格，导致同一风格在不同底色下失去连续性
3. adapter、SVG、Canvas 或 CSS 各自补默认，最终结果无法跨宿主复现
4. Plot、Table、Standard 等 owner 的正式能力被另一套“样式系统”绕开

通用主题设计需要满足：

1. 用公开 token map 表达所有进入主题层的可配置属性
2. 用少量通用 preset 提供稳定、可辨认的视觉人格
3. 让明暗模式与视觉人格正交
4. 允许用户像覆盖 VS Code theme colors 一样稀疏覆盖 token
5. 保持 JSON-safe、renderer-neutral、可校验、可共享和可解释
6. 把每个 token 映射回语义 owner 的正式能力，不复制渲染、布局或领域语义
7. 允许不同领域逐步扩展自己的 token vocabulary，而不要求全仓一次性拥有巨型对象

## 3. Theme 核心模型

一个可视化主题由持久化环境与领域覆盖组成：

```text
theme environment = style + mode
domain theme = effective theme environment + token overrides
```

`style` 选择通用视觉人格，`mode` 选择明暗环境。两者由 Core Theme IR 统一表达，可写在 Scene 或 Scope；compile 按字段继承并把完整有效值交给 Composite。领域 token override 仍留在对应领域 spec，由领域 resolver 在有效环境之上解析。

### 3.1 Theme style

Theme style 定义视觉人格，例如信息层级、装饰密度、数据色彩倾向和默认 guide 呈现。Core 拥有四个闭合名称及其跨领域人格，领域 owner 负责把当前 style 解析为自己的完整、合法 resolved token map，不能在 consumer 中依赖未声明的隐式默认。

四个通用 style 名称与人格由本文维护。各领域可以使用不同 token vocabulary 和具体值实现同一人格；“通用”不表示所有包必须共享同一份物理 token object。

### 3.2 Theme mode

Mode 定义 canvas 明暗环境及相应的 paint、opacity、对比度和 palette 适配。基础 mode 为 `light` 与 `dark`。

Mode 不定义新的视觉人格。同一个 preset 切换 mode 时，应保持主要层级、排版、间距、guide 拓扑和装饰密度连续，只改变依赖明暗环境的值。对外语义等价于每个 preset 都能产出 light / dark 两份完整 map；内部可以用共享基线与 mode delta 减少重复，但不得把未解析 delta 暴露给 consumer。

### 3.3 Token overrides

用户以 sparse token map 覆盖 preset 与 mode 的结果。覆盖使用与内置主题相同的 canonical key 和 value contract，不建立“内置字段 + 自定义补丁”两套协议。

Theme 环境与领域输入必须共同无歧义地表达：

- 在 Scene / Scope 选择 style
- 在 Scene / Scope 选择 mode
- 提供 sparse token map
- 检查最终 complete resolved token map

## 4. Token vocabulary 与 namespace

### 4.1 基本契约

公开 token map 必须满足：

- **public**：key、value contract 和覆盖行为属于公开契约
- **strict**：只接受当前 schema 声明的 key，未知 key fail-loud
- **flat**：使用单层 object，不用开放式嵌套对象表达任意路径
- **dot-namespaced**：key 用点号分隔稳定语义 segment
- **JSON-safe**：value 只能是可序列化 plain data，不包含函数、ReactNode、class 实例或 renderer handle
- **typed**：每个 key 有独立且尽可能窄的 value contract，不把全部值退化为 `unknown`、任意字符串或 CSS 文本
- **semantic**：命名描述视觉角色和领域语义，不描述 SVG attribute、Canvas state、DOM class 或实现文件

例如，主题可以公开“axis baseline 是否绘制”“tick 使用何种合法图元”“categorical palette 是什么”，但不能公开只对某个 renderer 生效的 DOM selector 或 Canvas callback。

### 4.2 稳定 token family

全仓 vocabulary 按语义 family 演进。下列 family 是稳定分区，不是当前版本的精确 key 清单：

| Family           | 表达范围                                                       | 典型 owner / consumer                         |
| ---------------- | -------------------------------------------------------------- | --------------------------------------------- |
| `surface.*`      | canvas、panel、plot area 等表面 paint、border 与层级           | Standard / Core drawing                       |
| `layout.*`       | 主题可控制的 padding、gap、inset 与对齐默认                    | Standard layout / domain composition          |
| `typography.*`   | 全局或语义层级的字体、字号、字重、行高与 foreground            | Core text fragments / Standard presentation   |
| `axis.*`         | 默认轴、baseline、tick、tick label、title 与 grid 的表现性配置 | Plot / Geo guide resolution，Standard drawing |
| `legend.*`       | 默认 legend、title、entry、symbol / swatch 与间距              | Plot / Table / Geo guide resolution           |
| `data.palette.*` | categorical、sequential、diverging 与状态色序列                | domain scale / visual encoding                |
| `<domain>.*`     | 只在特定领域成立的表现语义，例如 `chart.*`、`table.*`、`geo.*` | 对应领域 owner                                |

token 的 owner 由它表达的语义决定，不能只根据字符串前缀或当前代码位置判断。只有去除领域词汇后仍成立、被多个领域复用且已有正式能力承接的 token，才应上移到共享 family；否则保留在领域 namespace。

### 4.3 Key 与 value 治理

- 一个 key 只表达一个稳定语义角色，不把多个不相干属性塞进不透明 bundle
- 合法图元、paint、spacing、font fragment 等应复用权威 owner 的 schema 或公开 fragment，不平行重写近似类型
- boolean token 可以控制可撤销的表现性默认，但不能撤销领域核心语义或结构不变量
- composite value 仅在其本身是稳定、闭合的语义值时使用，例如合法 tick glyph descriptor；不能借 object value 重新开放任意嵌套 theme
- preset 的完整 map 与用户 sparse map 必须从同一份 canonical field shape 派生
- 完整 map 不允许依靠字段 default 补回缺失 key；缺失 required token 必须被检测
- token 重命名、删除或 value contract 改变属于公开协议变更；新增 required token 同时要求补齐所有 built-in preset / mode

## 5. Token 到 owner capability 的映射

Theme resolver 只决定有效 token 值，不拥有这些值最终代表的绘图、布局或领域能力。每个领域必须维护显式 mapping，把 resolved token 投影到现有正式契约：

| Token 语义                  | 映射目标                                                           | 禁止做法                                        |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| surface paint / border      | Standard surface / frame composite，必要时复用 Core paint fragment | adapter 加 DOM 背景；SVG / Canvas 各写一套默认  |
| padding / gap / alignment   | Standard 或领域 owner 的正式 layout / composition 输入             | theme resolver 私算绝对几何                     |
| typography                  | Core text fragment 或 Standard presentation schema                 | renderer 私自选择字体和字号                     |
| axis / legend               | Plot、Table 或 Geo 的 guide resolver，再交给 Standard / Core 表达  | theme 直接生成 renderer 图元或绕过 domain guide |
| data palette                | 领域 scale、channel 或 visual encoding 的正式颜色解析              | renderer 按 series index 私选颜色               |
| Chart presentation          | Chart 展示语义解析，再消费 Standard composite                      | 把 title / source 等塞进 Plot 或宿主 HTML       |
| Table-specific presentation | Table semantic model、rule / presentation resolver 与正式 lowering | CSS class 成为唯一主题语义                      |

映射必须满足：

1. 同一 token 的语义只由一个 owner 定义，其他包只消费或投影
2. adapter 只负责 authoring、数据 / definition 注入和生命周期，不补主题默认
3. renderer 只消费统一 Scene / manifest，不按 preset 名称 dispatch
4. CSS 可以实现宿主 UI 或 renderer 的具体呈现，但不能成为可视化主题契约真源
5. 领域包可以消费 Standard / Core 的公开 fragment，不 deep import 或复制 schema
6. 若现有 owner 无法正式表达某个通用 token，先补 owner capability，再由主题映射消费；不能把缺口沉到 theme resolver

主题因此是一张公开 token 到正式能力的映射表，而不是新的 IR、renderer 或 style engine。

## 6. Preset 与 mode

### 6.1 通用解析要求

每个支持主题的领域都应提供：

- 自己的 strict token vocabulary
- 对 Core 四种 Theme style 的合法实现
- light / dark 两种完整解析结果
- sparse user override schema
- deterministic resolver
- token 到 owner capability 的 mapping

领域可以只实现与自己相关的 family。例如 Table 不必为了保持名称一致而接受无消费位置的 Plot axis token；Chart 也不应把所有未来 Geo token 放进自己的 strict schema。跨领域组合入口负责把各自 token map 交给对应 owner，而不是构造一个无人完整拥有的开放 object。

### 6.2 mode 连续性

从 light 切到 dark 时，允许变化的主要是：

- surface、foreground、stroke 与 fill
- opacity、contrast 与状态色
- categorical / sequential / diverging palette 的明暗适配
- 为可读性必须随背景变化的局部 paint

默认不应随 mode 变化的是：

- 轴、grid、legend 等表现性组件是否存在
- tick 图元种类
- 字号、字重、间距和布局层级
- preset 的装饰密度与视觉人格

若某领域确需让结构性表现随 mode 变化，必须在版本 ADR 中说明原因、可观察行为和测试，而不能把差异隐藏在 renderer。

## 7. 四个通用 preset

`neutral` 是默认 style，`light` 是默认 mode；具体领域仍需为这个组合提供完整合法的默认 token map。

| Preset     | 中文语义 | 稳定视觉人格                                         | 不应退化为                           |
| ---------- | -------- | ---------------------------------------------------- | ------------------------------------ |
| `neutral`  | 中性     | 安静的界面框架、清晰的内容层级、克制的数据色彩       | 无设计的浏览器默认值或纯灰阶数据     |
| `academic` | 学术     | 面向论文、出版与严肃分析；高可读、低干扰、适合打印   | 只换成衬线字体或机械复制某个库的主题 |
| `vibrant`  | 明快     | 清晰 panel、鲜明层级、高辨识度且受控的数据色彩       | 无限制高饱和、牺牲对比度或信息层级   |
| `clean`    | 极简     | 最大限度减少非数据装饰，让数据图元和必要标注成为主体 | 删除所有 guide、间距或可访问性线索   |

四个名称表达跨领域人格，不承诺与某个开源库像素一致。Vega / Vega-Lite、Plotly、Observable Plot、ggplot2、shadcn 等只作为设计参照；具体实现必须符合 retikz 的 owner、schema、renderer-neutral 与可访问性约束。

各领域为四个 preset 选择具体值时，应在至少一个典型内容和 light / dark 两种 mode 下核对：

- 内容层级是否符合该人格
- guide 与非数据装饰是否克制且可读
- categorical、sequential、diverging 与状态色是否可区分
- surface 与文字 / 线条是否具有足够对比
- SVG 与 Canvas 是否得到等价语义结果

## 8. 自定义与 cascade

### 8.1 通用优先级

主题只处理可撤销的表现性默认。环境先在 Core 绘图树中解析，再进入领域优先级：

```text
Core default neutral + light
  -> Scene theme
  -> outer-to-inner Scope theme
  -> domain preset tokens
  -> user token overrides
  -> domain shorthand / native theme
  -> explicit component config
```

其中：

- Scene / Scope theme 按字段继承并选定有效 style / mode
- domain preset tokens 为有效 style / mode 提供完整人格基线
- user token overrides 对 canonical key 做稀疏覆盖
- domain shorthand / native theme 是更贴近该领域既有结构的显式输入，例如颜色 shorthand 或 Plot theme
- explicit component config 是最具体的局部配置，例如某一条 axis、某个 legend 或单个 mark 的属性

后层只能覆盖它有权表达的表现性值，不能撤销 chart type 核心配方、Table 结构、Geo projection 等领域不变量。追加组件遵守所属 owner 的继承规则，不自动复制另一个组件的局部覆盖。

版本 ADR 必须列出 shorthand 与 token 的语义映射及冲突顺序，不能用通用 object spread 假装完成跨结构 merge。

### 8.2 公开自定义与共享

用户可以把合法 sparse token map：

- 内联写入 JSON-safe spec
- 作为 JSON 文件共享
- 作为 npm 数据包发布
- 在应用层组合为自己的命名主题目录

当前通用协议不要求 define-registry。token map 是闭合数据，不执行代码、不按名称 dispatch，也不拥有 provider 生命周期。自定义包必须声明目标领域与兼容的 token contract；strict consumer 对未知 key 继续 fail-loud。

若未来真实需求包括自定义主题命名、继承、动态加载、远程分发或按 capability 组合，再由独立 ADR 决定 registry / loader / manifest 契约。不得提前用开放 registry 规避 key 治理。

## 9. Owner 与 package 边界

| 层级 / 包                         | 拥有                                                                                                                | 不拥有                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 根架构                            | 通用 theme 模型、style 人格、token 治理、cascade 与跨包不变量                                                       | 具体 key、hex、尺寸、schema 和版本范围                   |
| Chart / Plot / Table / future Geo | 领域 token vocabulary、preset 具体值、领域 mapping、resolver 与诊断                                                 | Core drawing、Standard layout、renderer 私有默认         |
| `@retikz/standard`                | 去除领域词汇后的通用 presentation / layout / composite capability                                                   | Plot guide、Table model、Chart type 与数据 palette 语义  |
| `@retikz/core`                    | Theme style / mode 词汇、Scene / Scope Theme IR、继承与 Composite context，以及权威 drawing / text / paint fragment | 领域 token、preset 具体值、领域 mapping 与 token cascade |
| React / Vanilla adapters          | 同一 JSON-safe Scene / Scope Theme 的等价 authoring 表面                                                            | 新 token、不同默认、CSS-only 主题语义                    |
| SVG / Canvas renderer             | 对统一 Scene 的等价呈现                                                                                             | preset 解析、token merge 与领域 mapping                  |
| `apps/docs` / host application    | 站点或产品 UI 主题、CSS variables、chrome 与交互外壳                                                                | 改写可视化 spec 的主题契约或静默补可视化默认             |

一个应用可以同时使用 shadcn UI 主题和 retikz visual theme，但两者是相邻系统：宿主可以显式选择或桥接 style / mode / token，不能假定同名 CSS variable 自动成为 retikz 主题真源。

## 10. Diagnostics 与 inspection

主题解析必须可解释。每个领域应能在适合自己的公开或开发者 inspection 产物中提供：

- 实际采用的 style 与 mode
- 通过 required schema 的 complete resolved token map
- 每个领域 token 来自 effective Scene / Scope Theme 所选 preset、user token、domain shorthand 还是 local config
- token 映射到的正式 owner 配置或产物
- 无法消费、冲突或被更高优先级覆盖时的诊断

Core 的 `ResolvedTheme` 只携带完整有效的 style / mode，不公开逐字段 winning Scene / Scope 或 locator。领域 inspection 可以把 preset/token 来源归类为 effective Theme，但不能把未提供的字段级继承来源伪装成可追踪 lineage；若未来需要这类来源查询，应由独立 Core inspection contract 冻结。

未知 key、错误 value、缺失 required token、空 palette、非法图元与无法映射的 token 必须 fail-loud。错误至少应指出 token key、输入层和期望 contract；不得静默丢弃、回退为 renderer 默认或只在某个 adapter 打 warning。

具体 provenance schema、locator 路径、错误 code 与公开 inspect API 由各版本 ADR 冻结，根架构不维护第二份字段真源。

## 11. 测试不变量

每个领域的主题 ADR 与测试契约至少覆盖：

1. 四个 built-in preset 在 light / dark 下都能解析成 complete valid map
2. required map 删除任一 key 都失败，不能由字段 default 静默补齐
3. sparse override 接受全部合法 key并拒绝未知 key、错误 value 与开放嵌套对象
4. 相同输入得到确定、JSON-safe、无共享可变状态的 resolved map
5. mode 切换只改变声明为 mode-sensitive 的值，保持 preset 人格与结构连续
6. user token、domain shorthand 和 explicit local config 按冻结的 cascade 生效
7. theme 不能撤销领域核心语义或破坏结构不变量
8. 每个 token 都有实际 consumer，consumer 不读取 preset 名称分支
9. React、Vanilla 与手写 JSON 产生等价主题输入
10. SVG、Canvas 等 renderer 消费同一 lowering 结果，不维护各自的主题默认
11. inspection 能解释关键 token 的最终值、来源与 owner 映射
12. 四个 preset 在典型内容和两种 mode 下完成可读性、层级、数据区分度与对比度的视觉验收
13. Scene / Scope Theme 可 JSON 往返并按字段继承，嵌套 Composite 读取所在位置的同一有效 style / mode
14. Theme 变化不直接改变 Core primitive；只有消费 Theme 的 Composite 重新物化领域默认
15. Theme context 只承诺有效值；没有独立 lineage contract 时，consumer 不依赖 Core 私有 traversal 状态推断 winning Scope

覆盖率或快照数量不能替代行为、不变量、反例和最低测试层组成的 test-contract 矩阵。

## 12. 演进与非目标

### 12.1 演进规则

- 新 token 先确定语义 owner、正式 consumer、value contract 与 inspection，再进入 vocabulary
- 跨域重复需求先验证是否真的去除了领域词汇；只有形成稳定共享语义才上移
- 新增 required token 必须原子更新全部 built-in preset / mode、schema、mapping、测试和用户文档
- 具体 preset 值可以随版本调优，但不得让其稳定人格漂移；人格变化应新增 preset 或更新本文并说明迁移
- renderer 或 adapter 出现重复特例，视为 owner capability 或 mapping 缺口，不能沉淀为长期实现
- 0.x 阶段可以为正确设计破坏性调整 token，但不默认保留旧 key alias 或双读桥接

### 12.2 当前非目标

本文不定义：

- `apps/docs` 或产品 UI 的 CSS variable、组件主题与 chrome
- Chart type、Plot grammar、Table algebra、Geo projection 等领域核心语义
- renderer 专属 filter、shader、DOM selector 或 Canvas callback
- 完整布局系统、交互状态机、动画与 transition token
- 自定义主题 registry、继承、远程加载和 marketplace
- 设计工具格式、Figma token 标准或第三方主题文件的自动兼容
- 单一全仓巨型 token schema

这些需求只有在出现真实跨包用例、明确 owner 和端到端消费路径后，才由独立架构或 ADR 设计。

# Chart 封装完备设计

> **状态：当前能力准入清单。** 本文判断一个 Chart family、内建 chartType、mark 或基础能力是否在“精确 Source schema → package-internal Definition + concrete provider contribution + compile-bound active registry → recipe resolve → Plot canonical lowering → presentation”主链上闭环。Chart 不提供第三方 recipe / chartType Definition 注册入口；应用层负责动态 catalog 与 JSON 路由，非内建复杂图形直接使用 Plot。

## 1. 完备目标

Chart 封装完备要求：根字段形成稳定通用外壳；`type` 负责 family 分类，`recipe.chartType` 唯一决定 recipe；每个内建 chartType 拥有精确 JSON-safe schema、recipe theme 与 semantic mark；内建 chartType 使用同一 package-internal Definition、concrete provider contribution 与 compile-bound active registry 解析；Chart marks 只继承声明可消费的上下文；所有生成内容进入 Plot 正式主链；React、Vanilla 与 JSON 入口保持等价。应用层自管动态 family / chartType catalog 与 JSON 路由，非内建复杂图形直接使用 Plot。

## 2. Source IR 完备

- [ ] Chart 根固定包含 `namespace`、`type`、可选 `id` / `presentation` / `theme`、必需 `data`、可选 `layout`、必需 `recipe` 与可选 `plotExtension`
- [ ] `namespace` 精确为 `chart`
- [ ] `type` 是 family，不直接承担 recipe identity
- [ ] `recipe.chartType` 是全局唯一 recipe key，并唯一映射到一个 family
- [ ] `recipe` 必填且包含必需 `chartType` / `encodings`、可选 `properties` / `marks`
- [ ] `layout` 只包含 Chart 外部 `width` / `height`，不复制 Plot composition 或 coordinate
- [ ] `plotExtension` 只保存用户显式声明的 Plot-owned fragment，不包含 data、layout、Chart encodings / properties 或 recipe 生成值
- [ ] 最小合法 Chart Source IR 不包含 `plotExtension`，normalizer 不创建空 `plotExtension`
- [ ] 不保留公开 `type: 'base'` 特例；完全控制 Plot 时直接使用 Plot
- [ ] 所有 schema strict、JSON-safe、可 round-trip，未知字段 fail-loud
- [ ] Source IR 与 resolved `IRPlot` 可分别观察，recipe 生成结构不写回 Source IR

## 3. Family、Definition 与 active registry 完备

- [ ] `point`、`bar`、`line`、`relation` 等 family 直接作为 `src` 一级 owner；每个 family 闭合自己的 recipe、schema、Theme、scaffold、mark 与测试
- [ ] `_chart` 承载 Chart vocabulary、精确 Source schema、recipe / mark / Theme contract、已选 recipe 的 Chart resolve、presentation、完整 `IRPlot` 生成与 active provider aggregation
- [ ] `_chart/providers` 只合并当前 Core compile 边界显式贡献的具体 chartType provider，创建临时 active registry、精确 schema union 与 package-internal Chart composite Definition；应用层自行维护动态 family / chartType catalog，不由 Chart 维护全局 catalog
- [ ] 依赖方向为 `family -> _chart`；family 不运行时依赖具体 chartType 之外的组合根，应用层自行决定多个 provider 的组合
- [ ] 一级 family 只声明分类 key 与真实共享部分；每个内建具体 chartType 的 package-internal Definition 自己声明精确 schema、recipe Theme、semantic mark 与 concrete provider contribution
- [ ] 每个内建 chartType 的 package-internal Definition 声明唯一 key、精确 schema、recipe theme、semantic mark 与 Plot 依赖
- [ ] `chartType -> type` 映射唯一，family mismatch 在 Source schema / provider assembly 边界 fail-loud
- [ ] family 数量有限、语义稳定且每个 chartType 只有一个持久化主归属
- [ ] 仅内建具体 chartType 使用 package-internal Definition、concrete provider contribution、compile-bound active registry、精确 schema、resolve 与诊断路径；Chart 不提供第三方 recipe / chartType Definition 注册入口
- [ ] `OpenString` 只开放应用层路由选定且 active provider 已安装的 key，不让未知 payload 绕过精确 schema
- [ ] 内建 family / chartType / recipe mark 索引只从 module 与 binding 派生，不作为第二事实源写回公共契约；应用层 catalog 与 JSON 路由留在 Chart 之外
- [ ] 当前 active provider 边界中的未知 family / chartType、重复 chartType、跨 family 重复归属、缺失依赖与 Definition 冲突均有稳定错误路径
- [ ] unknown JSON 只在 Source schema / registry 边界 parse 一次，resolver 不重复 parse
- [ ] 应用层提供的 LLM schema 发现可以按 family → chartType → exact payload 渐进收窄，不依赖一个全量宽 union；Chart runtime 不维护全局 catalog 或全局 parse/router

## 4. Encodings 与 Properties 完备

- [ ] 每个 chartType 拥有独立 strict `XxxChartEncodingsSchema` 与 `XxxChartPropertiesSchema`
- [ ] encodings 只接受 field-bound 数据角色，不允许常量
- [ ] properties 只保存当前 recipe 的常量表现和行为，不接受数据字段绑定
- [ ] 原子契约按稳定语义、不变量与复用边界提取，不按字段机械拆分
- [ ] 不建立包含所有可选字段的宽 `SharedChartEncodingsSchema` / `SharedChartPropertiesSchema`
- [ ] 与 Plot 语义、值域完全一致的属性直接复用 Plot 权威原子；Chart 只拥有领域收窄、默认和组合
- [ ] 每个 encoding / property slot 都有明确 owner、consumer、目标语义和失败行为
- [ ] recipe 显式 consumer 列表贴近实际 resolver，不从 schema 全字段自动推导；空名称和重复名称在 active provider registry assembly fail-loud
- [ ] properties 与 encodings 映射到同一目标 slot 时，encoding 胜出
- [ ] 冲突按目标 slot 解析，不使用无约束 object spread 或全局 last-wins
- [ ] schema 接受但没有 scaffold、semantic mark 或 authored mark 消费的字段 fail-loud
- [ ] authored mark 的继承 binding 仅在该 mark 实际出现时成为 active consumer
- [ ] facet / track 由 composition owner 消费，不广播给普通 mark

## 5. Recipe 与 built-in semantic mark 完备

每个 chartType 必须同时闭合：

- [ ] shared scaffold 的 coordinate、axis、guide、facet、track 等结构及默认
- [ ] built-in semantic mark 的输入、顺序、lower target 与诊断
- [ ] semantic mark 可以确定性生成一个或多个 Plot mark，不被限制为单个 Plot mark
- [ ] 生成的 Point / Path / Interval 等进入 Plot 正式 schema、resolve、lowering、identity、provenance、lineage、locator 与 diagnostics 主链
- [ ] recipe fallback、named theme、inline theme、properties、encodings 的逐 slot 优先级唯一
- [ ] `false`、`0`、空数组和 schema 允许的空字符串不被 truthy fallback 吞掉
- [ ] recipe 的表现默认不能撤销 chartType 的结构不变量
- [ ] built-in mark、authored Chart marks 与 `plotExtension.marks` 的输出顺序确定
- [ ] 空数据、非法字段、冲突 id、重复 scale、空间根冲突与 lower dependency 缺失均可诊断

## 6. Chart mark 完备

- [ ] `recipe.marks` 是有序 Chart authoring mark，不是 `plotExtension.marks` 的别名
- [ ] 每个 mark Definition 只声明精确 payload 与到 Plot target 的显式映射，不反向列出 family 或 chartType
- [ ] 每个 recipe 通过有序 binding 单向声明允许的 mark 与可继承的 encoding / property slot
- [ ] 内建 Chart mark 通过同一 package-internal Definition / recipe binding / active registry 消费；Chart mark Definition 不是第三方扩展入口
- [ ] mark 自身显式值只覆盖自身继承结果，不改写 built-in semantic mark 或其它 mark
- [ ] authored marks 按数组顺序追加；身份冲突按正式 owner 规则 fail-loud
- [ ] 未被当前 mark 接受的 slot 不向该 mark 传播
- [ ] PointMark 等 Plot target 只有通过 Chart mark 入口时继承 Chart context
- [ ] `plotExtension.marks` 保持完全显式、相互独立，不读取 Chart encodings / properties
- [ ] Chart mark 不复制 Plot target 的 schema、scale、coordinate、lowering、identity、artifact 或 diagnostics

## 7. Plot 出口完备

- [ ] typed Chart 不裁剪 Plot 可达能力；完全底层 authoring 直接使用 Plot
- [ ] `plotExtension` 缺省不存在，只承载显式 transform、scale、coordinate / composition、guide、theme、spatial root、mark 与 meta
- [ ] Plot 单值结构按允许替换的字段规则处理
- [ ] Plot 具名集合按正式 identity 合并，重复且不可合并时 fail-loud
- [ ] `plotExtension.marks` 按 Plot 顺序追加，不参与 Chart mark 继承或逐 slot 覆盖
- [ ] coordinate 与 composition 保持唯一空间根
- [ ] recipe 生成 id 不与 authored Chart mark 或 Plot extension 冲突
- [ ] Chart 外层 identity 与 Plot provenance / spatial handle 连续

## 8. Presentation 完备

- [ ] `presentation` 只接受唯一 title、subtitle、note、source
- [ ] resolver 固定使用 title → subtitle → plot → note → source 顺序
- [ ] JSON 对象属性顺序、React marker 顺序与 Vanilla 对象构造顺序不改变结果
- [ ] 缺失内容直接省略，不创建空文本节点
- [ ] 当前不接受 authored order、position、任意 child 或多 Plot placeholder
- [ ] 文本、布局与 Surface 分别复用 Core / Standard / Layout 正式能力
- [ ] 后续自由组合必须新增显式有序契约，不读取对象属性顺序

## 9. Theme 完备

- [ ] `theme` 接受注册主题名，或带可选 base 的 authored token 输入
- [ ] inline tokens 按 `chart` / `plot` / `recipe` owner 分区
- [ ] Chart shell token 只拥有 canvas、padding、presentation 等跨 chartType 语义
- [ ] Chart shell 以稀疏 overrides schema 接收输入，以无默认值的完整 resolution schema 校验最终结果
- [ ] Chart 为每个 Core mode 提供显式完整 Chart shell fallback；Chart 不复制 Core / Plot categorical palette
- [ ] Plot token 直接复用 Plot schema、definition、preset 与 resolver，不由 Chart 复制
- [ ] recipe token 由当前 chartType Definition 提供精确 schema
- [ ] 注册 Theme Definition 使用 `{ name, base?, tokens? }`，可以保存多个 chartType recipe slice，Source IR 只消费当前 chartType 的 slice
- [ ] Core effective style 先消费同名 Chart Theme base chain；未注册同名 style fail-loud，不静默回退 Neutral
- [ ] 部分或完整 authored token mapping 使用同一字段形状；resolved token map 不写回 Source IR
- [ ] 对象形式至少包含 base 或一个非空 token slice；空主题对象 fail-loud
- [ ] Chart shell 的 `mode fallback < Core style chain < authored named/base chain < inline` 优先级稳定
- [ ] built-in slot 使用 recipe fallback，随后 Core style chain < authored named/base chain < inline tokens < properties < encodings；authored mark 再以自身显式 payload 覆盖继承结果
- [ ] named / inline slice 以顶层 token key 原子覆盖，最终 Chart shell 与 recipe token 分别通过完整 resolution schema
- [ ] 不同 owner 只共享 Core value atom，不合并领域 token key 或 resolver
- [ ] Plot slice 只作为 Plot owner 的 authored token 输入，位于 Plot Core style baseline 之后、显式 `plotExtension` fragment 之前
- [ ] 未注册主题、未知 recipe token 与 owner definition 冲突均 fail-loud；缺少 recipe slice 时稳定回退到 recipe fallback

## 10. React、Vanilla 与入口完备

- [ ] JSON、Vanilla 与 React 生成同一精确 Chart Source IR
- [ ] 具体组件 / factory 可以推断 family 与 chartType，但不建立平行持久化 shape 或默认逻辑
- [ ] Vanilla normalize 只组装 typed Input，不读取 registry、Theme、data、host 或 DOM
- [ ] React 只把 props、marker 与 children 映射为同一 Vanilla Input
- [ ] React presentation marker 顺序不改变固定 presentation 语义
- [ ] React Chart mark children 按 authored order 归一为 `recipe.marks`
- [ ] registry lookup、recipe resolve、Theme resolve 与 Plot lowering 只存在于领域 owner
- [ ] inspection、文档预览与序列化展示 Chart Source IR，不以 resolved Base / Plot IR 代替
- [ ] datasets、Theme definitions、Plot lower options 与宿主 Scope 保真传递

## 11. 文档与测试证据

- [ ] 中英文文档说明根 shell、family / chartType、`recipe` / `plotExtension` owner 与 Source / resolved 边界
- [ ] 每个 chartType 页面说明精确 encodings、properties、built-in mark、允许继承的 marks、Plot 扩展和不适用场景
- [ ] 文档说明 presentation 固定顺序且对象属性顺序无语义
- [ ] 文档说明 Chart shell、Plot、recipe Theme token owner
- [ ] schema、registry、mismatch、recipe、mark inheritance、Theme、error、identity、adapter 与 SSR 测试齐全
- [ ] public-surface 与 package-boundary 测试证明旧 `type: 'base'`、`config` 与旧兼容符号不存在

## 12. 反例

以下任一情况都表示封装未完备：

- `type` 仍直接表示具体 recipe，或 `chartType` 可以跨多个 family
- 通过宽 union、开放 record 或 `OpenString` 接受未注册 payload
- 为 chartType 建立绕过 active provider、精确 schema 与 resolve 主链的静态白名单或 patch 路径
- 让同一数据角色同时由多套平行 schema 拥有
- encoding 接受常量，或 property 接受字段绑定
- 按同名 key 向所有 mark 广播 encodings / properties
- 让 facet / track 作为普通 mark 属性传播
- 把 `recipe.marks` 与 `plotExtension.marks` 混成同一继承语义
- 只复用 Plot schema/type，却重新实现 lowering、identity、provenance 或 diagnostics
- 使用全局优先级 object spread 覆盖无关结构
- 根据 JSON 属性出现顺序排列 presentation
- 把所有 Chart / Plot / recipe token 汇总成开放巨型 Theme map
- adapter 根据 theme 名、chartType 或 mark type 私自选择默认或生成 Plot IR
- 把 resolved `IRPlot` 或 recipe 默认展开结果作为 Chart Source IR 返回
- 为旧 `type` / `config` / `chartThemeTokens` 保留别名、fallback 或新旧双轨

## 13. 准入结论

只有上述闭环都有源码、测试与文档证据时，一个内建 family、chartType、Chart mark 或 Theme recipe slice 的稳定 Source/schema/provider surface 才能进入公开入口；package-internal Definition 与 active registry 始终不作为第三方扩展 API。多 Chart composition、concat、repeat 与自由 presentation 顺序属于后续独立能力，不得借当前 schema 提前建立半成品字段或隐式语义。

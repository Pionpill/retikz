# chart v0.1-alpha.1 Roadmap：Scatter & Points

> 本 milestone 先建立所有 Chart family 共用的封装基础设施，再逐个加入点图 Canonical Type。每篇 ADR 在人工确认后进入实现，并在自身验收完成后独立 Accepted；milestone 只在全部退出条件满足后结束。
>
> 关联：[`chart v0.1 roadmap`](../roadmap.md) · [`Chart 总设计`](../../../../../architecture/chart-design.md) · [`Chart 封装完备设计`](../../../../../architecture/chart-encapsulation-complete.md) · [`Plot 可视化完备设计`](../../../../../architecture/plot-visualization-complete.md)

## 1. 目标

alpha.1 证明一条统一的 type-first 路径可以在不裁剪 Plot 能力的前提下封装 Scatter & Points：

1. 建立 `@retikz/chart`、`@retikz/chart-react`、`@retikz/chart-vanilla` 三包及封闭 type recipe 主链
2. 让 ChartSpec 保持 JSON-safe、单根 data、结构轴与 Plot 自洽，并可确定性解析为完整 PlotSpec
3. 提供默认 `neutral` 及 `academic` / `vibrant` / `clean` 四套 style preset、独立 light / dark mode、公开严格 `styleTokens`，并与 `colors`、Plot `theme`、显式 GoG 配置形成统一优先级
4. 用 Standard FlexLayout 组合可选 title、subtitle、caption、note、source、credit 与 Plot body
5. 按 `scatter`、`connected-scatter`、`regression`、`ranged-dot`、`strip` 顺序逐 type 建立闭环，并把 Bubble 作为 field-bound size 的 Scatter Pattern
6. 保持手写 JSON、React JSX、Vanilla builder 的 ChartSpec、完整 PlotSpec 与最终组合结果等价

alpha.1 不在任何中间 ADR 后发包。基础设施允许内部 fragment 与 resolver 先落地，但公开 `ChartSpecSchema` 只能随着首个 `scatter` variant 一起出现，禁止 schema 接受尚未实现的 type。

## 2. 固定链路

```text
ChartSpec
  -> closed recipe resolver
  -> core recipe + allowed override + explicit Plot extension
  -> complete PlotSpec
  -> optional presentation resolver
  -> owner-private content: PlotSpec | Standard FlexLayout<Core text nodes | PlotSpec>
  -> Standard surface(content)
  -> Standard / Plot composite expansion
  -> Core IR / Scene
```

Chart 不提供 `defineChart`、Chart registry 或自定义 type。官方 recipe 是 `@retikz/chart` 私有的封闭映射；所有 Mark、Transform、Scale、Coordinate、Guide 与 Channel 扩展继续使用 Plot definition / registry。

## 3. ADR 顺序

| ADR | 主题                             | 核心产出                                                                                                                         | 前置                                                             | 实现状态                  |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------- |
| 01  | Chart 基础设施与封闭 recipe 主链 | 可实施内部 schema / resolver / inspection / authoring normalizer；逐 type composite contract；首个公开入口在 ADR-04 原子接线     | 内部子集依赖 Plot v0.1、Data v0.1；公开 adapter 依赖 Kernel gate | 内部完成 / 公开接线受门控 |
| 02  | Style preset、mode 与 token      | `neutral` / `academic` / `vibrant` / `clean` × light / dark、公开严格 token、colors / theme / member 优先级、canvas surface gate | ADR-01、Standard arbitrary-child surface composite               | 待人工 Accept / 底座阻塞  |
| 03  | Presentation 与 Standard layout  | 六个可选展示槽位、owner-private content、最终 Standard surface canonical node 与当前 identity 边界                               | ADR-01、ADR-02、Standard FlexLayout + surface                    | 待人工 Accept / 底座阻塞  |
| 04  | Scatter                          | 首个公开 ChartSpec variant、Point 主 Mark、二维角色                                                                              | ADR-01–03、Plot size / legend capability                         | 待人工 Accept / 底座阻塞  |
| 05  | Connected Scatter                | Point + Path + 稳定 order                                                                                                        | ADR-04                                                           | 待人工 Accept             |
| 06  | Regression                       | Point + mark-local Smooth + Path                                                                                                 | ADR-05                                                           | 待人工 Accept             |
| 07  | Ranged Dot                       | 两端 Point + projected Relation                                                                                                  | ADR-06                                                           | 待人工 Accept             |
| 08  | Strip                            | 分类位置 + 数据驱动 offset + Point                                                                                               | ADR-07 + Plot offset capability                                  | **阻塞**                  |

实施是严格串行链。类型 ADR 必须把自己的 variant 加入同一个 `ChartSpecSchema` discriminated union 和同一个封闭 resolver，不复制 package、style、presentation、diagnostics 或 adapter 主链。

## 4. 共用 ChartSpec 结构轴

各 type variant 由相同 fragment 组合，字段语义固定如下：

| 字段                          | 语义                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| `namespace`                   | 固定为 `chart`                                                 |
| `type`                        | Canonical Type 判别值                                          |
| `id`                          | Chart 外层稳定 id；派生 Plot id 为 `${id}/plot`                |
| `data`                        | 单一 `DataReference`，实际 rows 由 runtime 注入                |
| `encoding`                    | type-specific 必需数据角色与可选视觉角色                       |
| `mark`                        | 隐式主 Mark 的无 `type` 稀疏 patch                             |
| `transform`                   | 在 type 核心 transform 之前执行的显式 Plot root transforms     |
| `scales`                      | 以 `name` 调整隐式 scale 或追加 Plot scale                     |
| `coordinate` / `composition`  | 与 Plot 同构；两者互斥，缺省使用 type coordinate               |
| `guides`                      | 显式存在时替换表现性 guide defaults                            |
| `style` / `themeMode`         | 视觉人格与独立明暗模式；默认 `neutral` / `light`               |
| `styleTokens`                 | 公开、JSON-safe、严格拒绝未知 key 的 flat token overrides      |
| `theme` / `layout` / `colors` | 直接复用 Plot theme、Plot layout 与 palette shorthand 语义     |
| `marks`                       | 追加正式 Plot marks，不替换隐式 recipe marks                   |
| `presentation`                | Chart-level 展示槽位及外层布局，不写入 PlotSpec                |
| `width` / `height` / `meta`   | 透传到 resolved PlotSpec；Chart meta 同时保留在外层 inspection |

具有多个隐式成员的 type 在自己的 ADR 中增加 `components`，使用稳定语义 key 调整次级成员。禁止暴露数组下标，也禁止 patch `type`、核心 encoding、保留 id 或必需 transform 的存在性。

保留 recipe id 使用 `__chart.` 前缀；显式 Plot extension 使用相同 id 时 fail-loud，不自动改名。

## 5. 默认与覆盖优先级

```text
Plot built-in defaults
  < Chart type presentational defaults
  < Chart built-in style tokens[style][themeMode]
  < ChartSpec styleTokens
  < ChartSpec colors
  < ChartSpec theme
  < explicit scale / guide / mark / component config
```

该顺序只覆盖可配置值。不可撤销的 type 核心 recipe 始终存在；任何层都不能删除、替换或关闭核心 Mark、必需 Transform、必需数据角色或维持 type 身份的结构。

## 6. Type recipe 摘要

| Type                | 必需角色                   | 核心成员                                                        | 稳定目标                                       |
| ------------------- | -------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| `scatter`           | `x`, `y`                   | Point                                                           | `mark.main`                                    |
| `connected-scatter` | `x`, `y`, `order`          | Point + Path                                                    | `mark.points`, `mark.connection`               |
| `regression`        | `x`, `y`                   | Point + mark-local Smooth + Path                                | `mark.points`, `transform.trend`, `mark.trend` |
| `ranged-dot`        | `category`, `start`, `end` | Point(start) + Point(end) + projected Relation                  | `mark.start`, `mark.end`, `mark.range`         |
| `strip`             | `category`, `value`        | independent jitter output + data-driven position offset + Point | `transform.jitter`, `mark.main`                |

Bubble 不单列 Canonical Type。`scatter` 的 `encoding.size` 绑定字段时，Plot 已按正式 size channel 自动使用 sqrt radius scale；该配置作为 Bubble Pattern 由 Scatter 文档发现，不进入 `ChartSpec.type`、独立 recipe 或稳定目标目录。

## 7. Strip capability gate

当前 Plot `JitterTransform` 只在数据单位中原地扰动连续 `xField` / `yField`；Plot 没有 `xOffset` / `yOffset` 等在 category band 内消费独立字段的位置 capability。Flint 的 Strip Plot 需要分类位置、数值位置和分类 band 内的 jitter offset 同时成立。

因此 ADR-08 只冻结 Chart-level roles 与延期边界，不授权实现或把 `strip` 加入公开 `ChartSpec.type`。以下 Plot owner 能力完成后，必须新建 Strip implementation ADR，补 exact recipe / version contract / `validateCore` / 测试矩阵，并从 Architecture Gate Round 1 重新开始：

- Jitter 能把结果写入独立输出字段，不覆盖原分类 / 数值角色
- position offset 能在坐标投影后、Mark lowering 前以数据驱动方式作用于 Point
- offset 对 Cartesian / Polar 等坐标保持坐标系无关，并沿 Plot channel / coordinate contract 消费
- schema、registry、lowering、provenance 与 React / Vanilla authoring 在 Plot 内闭环

该缺口属于 Plot 的纵向位置能力，不允许由 Chart 私造节点位移、renderer 特判或私有 channel pipeline 绕过。

## 8. Size channel / legend dependency gate

Scatter 的 field-bound size 直接复用 Plot size channel 与 sqrt scale，但当前 Plot 在全零或空集分支中会先返回退化 descriptor，跳过显式 scale 的存在性与类型校验；size descriptor 也没有携带实际 scale identity，无法让 legend 对同字段不同 scale 做确定性选择或冲突诊断。

因此 ADR-04 的 field-bound size 与 Bubble Pattern 公开前，需要 Plot owner 沿现有 channel / guide 主链补齐：

- 显式 size scale 在退化数据分支前完成存在性、sqrt 类型与契约校验
- field-bound size descriptor 携带显式或确定性合成的稳定 scale identity
- 未指定 legend scale 时，多种不同 scale identity fail-loud；指定 scale 时精确选择，重复 identity 只有契约等价时才能合并
- 上述诊断不随 rows 是否为空、全零或含正值改变

该 gate 未解除时，不公开接受 field-bound size 的 Scatter surface 或可执行 Bubble Pattern 文档。Chart 不复制 Plot scale validation、descriptor collection 或 legend selection。

## 9. Embeddable dependency gate

Chart presentation 的 canonical result 是 Standard FlexLayout 内含完整 PlotSpec。当前 React / Vanilla embeddable protocol 按 adapter namespace 分组 datasets 与 composite maker，无法让独立 Chart、Plot、Standard contributions 同时共享唯一 Plot dataset group、注册逐 type Chart definitions并确定性去重 Flex / Plot definitions。

因此 ADR-04 的公开 adapter 接线前，需要 Kernel adapter owner 通过独立 ADR 提供：

- contribution 显式声明 composite dependencies
- Chart datasets 可进入同一 Plot lowering group
- 相同 definition 确定性去重、不同实现冲突失败
- compile 前解析全部 declared dependencies；缺失项 fail-loud，并稳定标识 owner-qualified `namespace + type`
- React / Vanilla 同构

该 gate 未解除时只允许实现 Chart core 的 schema / resolver 与 standalone 显式 composite bundle 测试，不允许 Chart 私自提前 lower Plot 或复制 Standard solver。

## 10. Canvas surface dependency gate

`chart.canvas.fill` 与 `chart.padding` 必须覆盖完整 Chart，而不只是 Plot panel。当前 Standard Frame 只接受直接 Core Node；OverlayLayout 虽可承载任意 child，但没有按父 allocation 动态铺满的 renderer-neutral background child。

ADR-02 / ADR-03 因此等待 `@retikz/standard` owner 的独立 arbitrary-child surface/background composite。Core 只在 Standard ADR 证明缺少通用 layout-aware composite / primitive 底座时通过 dependency ADR 先行协作。该 gate 未解除时：

- 不允许 Chart 私造 layout / bbox / background primitive 主链
- 不允许 React / Vanilla 用 DOM / CSS 主题替代 JSON / Canvas 能力
- 不允许只实现 `plot.surface.fill` 就宣称完整 dark mode
- ADR-04 不公开带未消费 token 的 ChartSpec surface

## 11. Spatial transparency dependency gate

Chart presentation 会在 Plot 外增加 surface 与 layout，但公开入口不能把 Plot 变成只能观察整体 bbox 的黑盒。ADR-04 的公开 adapter 与 docs 接线前，需要 Core owner 的 qualified spatial handle / selector capability 满足：

- 稳定标识整个 Chart、Plot body 与每个实际存在的 presentation slot
- selector 可以从 Chart namespace 穿过 Plot body，继续定位 Plot 拥有的 view / track / facet / plotArea / axis / series / datum handle
- Standard probe / replay 改变 geometry 后不丢失或重命名上述 identity、payload、locator 与 provenance
- 多个 Chart 的局部 handle 经过 qualified namespace 后不冲突
- target 不存在或 namespace 越界时 fail-loud，不回退到整个 Chart

Chart 只提供外层 identity 与 delegation，不复制 Plot handle registry，也不预造 Core selector 语法或 index。

## 12. 统一测试门槛

每篇 ADR 的测试契约必须同时给出：

- ChartSpec schema accept / reject
- 精确 resolved PlotSpec
- type 核心 recipe 不可撤销
- 显式 Plot extension 与保留 id 冲突
- JSON / React / Vanilla parity
- presentation 缺省与显式组合
- inspection 能区分 `type-default`、`style-preset`、`user-override`、`plot-extension`
- Plot provenance / locator / lineage 在 Chart 包裹前后保持
- 四 preset × 两 mode 有对照测试；mode 切换不改变 guide topology 或 layout allocation
- 公开 token map 未知 key fail-loud，custom 与 built-in 走同一 schema / resolver / consumer

类型 ADR 至少覆盖一个非默认 Coordinate，证明 Point / Path / Relation recipe 不绑定笛卡尔 renderer 几何；不要求每个 type 重复穷举所有坐标系。

## 13. 退出条件

alpha.1 只有同时满足以下条件才可结束：

1. ADR-01–07 已 Accepted 并实现；ADR-08 的延期边界已确认，Plot capability gate 解除后新建的 Strip implementation ADR 也已 Accepted 并实现
2. 五个 type 都由同一封闭 resolver 展开，不存在 type-specific adapter 或 renderer 路径；Bubble 只作为 Scatter Pattern
3. ChartSpec、resolved PlotSpec、最终 Standard composition 与 inspection 均可单独观察
4. style、themeMode、styleTokens、colors、theme、显式成员的优先级有精确测试
5. 没有 presentation 时不生成可见文本；有 presentation 时 Plot 仍保持自己的 id、provenance、locator 与 lineage
6. 完整 Chart canvas 由 renderer-neutral Standard surface 覆盖裸 Plot与 presentation；若 Standard 依赖 Core 新底座，该 dependency 已先闭环；light / dark 切换不改变布局
7. docs 为已实现 Canonical Type 提供最小配置、核心 recipe、允许覆盖、Plot 混合与不适用场景；Style 页面提供四 preset × 两 mode gallery 与 token explorer；Strip 在独立 implementation ADR完成前只标记 planned
8. Kernel dependency preflight 与 Core spatial transparency gates 已解除；缺失 dependency、selector target 或 namespace 越界均 fail-loud
9. Plot size / legend gate 已解除；field-bound size 的 scale 校验与 legend descriptor identity 不随退化数据或多 descriptor 组合失真

若 Plot offset capability 不进入可消费版本，alpha.1 不以错误语义实现 `strip`；应由人工决定延期 `strip` 或延后整个 milestone 退出。

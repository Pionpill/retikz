# Standard v0.1 alpha.3 Roadmap：通用 Legend

> 状态：规划已确认，ADR-01 为 Proposed
>
> 主题：建立领域无关的 Standard Legend 呈现能力，让 Plot、Table 与直接作者复用同一 schema、布局、lowering 和 artifact 主链
>
> 关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard library design](../../../../../architecture/standard-library-design.md) · [alpha.2 Box Layout](../alpha.2/roadmap.md) · [Plot completeness](../../../../../../../viz/_notes/architecture/plot-visualization-complete.md) · [Table completeness](../../../../../../../viz/_notes/architecture/table-visualization-complete.md)

## 目标

alpha.3 把 Legend 拆成“领域解析”和“通用呈现”两段：Plot、Table 等领域 owner 保留 channel、scale、visual encoding、formatter、theme mapping、provenance 与交互意图，`@retikz/standard` 接收已经解析好的 JSON-safe Legend 输入并负责通用视觉结构、约束布局、Core lowering 与领域无关 artifact。

同一个 Standard Legend definition 必须同时服务：

- 直接以 Standard IR / React / Vanilla authoring 创建的 Legend
- Plot legend guide 解析后的呈现输入
- Table 条件视觉编码或 presentation 解析后的呈现输入

这三条路径不得复制 Legend schema、布局算法或 renderer 逻辑，也不得让 Standard 读取 Plot/Table 的领域 IR。

## 能力边界

Standard Legend 候选能力包括 title、离散 entries、swatch、ramp、symbol / size samples、方向、换行、gap、alignment、overflow、稳定 item key、bounds / anchor artifact 与 Core IR lowering。最终字段、默认值、form 判别、style token、可嵌入 `IRChild` 范围和诊断由后续 ADR 冻结。

Standard Legend 不拥有：

- Plot channel / scale 绑定、domain 训练、tick 生成、guide resolve 或 legend interaction
- Table field / selector / presentation rule、条件视觉 scale、formatter 或 theme override precedence
- 领域 provenance / lineage / locator 语义、过滤 / 选择行为或 adapter runtime 状态
- renderer 特判、DOM 测量、全局 registry 或跨 compile replay

## ADR 顺序

| ADR                                           | 主题                                   | 主要决策                                                                                           | 依赖                            | 初始状态 |
| --------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- | -------- |
| [01](./01-legend-ownership-and-dependency.md) | Legend 所有权与单向依赖                | 冻结 Standard 通用呈现、Plot/Table 领域解析、`plot / table -> standard -> core / math` 与迁移边界  | alpha.1 capability loading      | Proposed |
| 02                                            | Legend schema 与呈现 contract          | 冻结 form、entry / ramp / symbol、title、style、identity、diagnostics 与 JSON round-trip           | ADR-01；Plot/Table 真实输入审计 | 待启动   |
| 03                                            | 约束布局、lowering 与 artifact         | 冻结 Box Layout 组合、任意内容测量、wrap / overflow、item bounds / anchors 与 Core lowering        | alpha.2 Box Layout；ADR-02      | 待启动   |
| 04                                            | capability loading、adapter 与领域迁移 | 冻结 module / bundle 传递依赖、重复注册诊断、React / Vanilla authoring、Plot 迁移与 Table 首次消费 | ADR-01～03                      | 待启动   |
| 05                                            | 测试、文档与发布收口                   | 跨入口等价、Plot/Table 复用、交互边界、双语 docs、迁移说明与 package checks                        | ADR-01～04                      | 待启动   |

## 依赖与迁移顺序

```text
Core layout-aware composite
          │
          ▼
Standard alpha.2 Box Layout
          │
          ▼
Standard Legend contract / layout / artifact
          │
          ├────────▶ Plot legend guide resolution ──▶ Standard Legend
          │
          └────────▶ Table visual encoding resolution ──▶ Standard Legend
```

- Plot 当前 Legend 呈现继续作为已发布基线，直到 Standard Legend 与依赖加载闭环后再迁移；迁移不得改变既有 Plot guide 的领域语义和 locator 可观察结果，除非独立 Plot ADR 明确批准
- Table alpha.3 可以设计 legend descriptor 与领域解析，但通用 Legend 呈现必须等待本 milestone 可消费版本，不在 Table 内建立临时 renderer 或布局副本
- Standard 相对 Core 保持可选；Plot/Table 声明兼容版本依赖并显式组合所需 capability，不依赖 import 副作用或 Core 反向加载
- 同一 capability 被领域包传递引入且调用方也显式加载时，必须有确定的 module / definition 组合与冲突诊断；ADR-04 在现有 fail-loud 基线上决定是否需要按同一 module identity 幂等组合

## Architecture Gate

每份 ADR 从 Proposed 开始，先补 ignored `test-contract` 矩阵，再执行 `develop-completeness adr-gate` 并交人工确认。Gate 至少证明：

- 去除 Plot/Table 词汇后，Legend schema、layout 与 artifact 仍能被直接作者独立使用
- Plot/Table 只负责领域解析，不复制 Standard Legend 的视觉结构、布局或 lowering
- Standard 不依赖 Data、Plot、Table、adapter、renderer 或领域 runtime
- 领域 provenance、locator 与 interaction 可以跨 Standard composite 边界保持，而不写入通用 Legend schema
- capability module 的传递消费、直接消费和重复输入具有唯一、可诊断的结果
- React / Vanilla 与直接 IR 对同一 Standard Legend 输入产生等价 Core 语义

## 完成标准

- [ ] ADR-01～05 均完成测试契约、Architecture Gate 与人工确认
- [ ] Standard Legend 的 schema、definition、布局、lowering、artifact 与 capability module 形成闭环
- [ ] Plot 至少一条 legend guide 路径迁移到 Standard，且领域解析、provenance / locator 与交互意图仍由 Plot 拥有
- [ ] Table 至少一条 visual encoding / legend descriptor 路径消费 Standard，且不依赖 Plot
- [ ] 直接 IR、Standard React、Standard Vanilla、Plot 与 Table 的公共消费路径具有自动化证据
- [ ] Standard、Plot、Table 的双语 docs、迁移说明、package dependency 与 release-group 检查完成
- [ ] 无 Standard 到领域包的反向依赖、隐式注册、私有测量或 renderer 特判

## 不在 alpha.3 范围

- Plot scale、channel、guide resolve、axis / grid、legend interaction 或全局 decoration collision solver
- Table formatter、selector / rule、条件视觉 scale、theme precedence 或跨 Plot Cell guide 协调
- dashboard filter state、selection、history、viewport、DOM tooltip 或其它宿主 UI
- 为兼容 Plot 当前内部 helper 保留公开别名或双实现主链
- 未经真实消费证据扩展到 color picker、control panel、data grid UI 或任意业务 legend

# v0.5 路线总计划

> 状态：`v0.5.0-alpha.1` 已完成 ADR-01～07 的实现、测试、双语文档与 Accepted 收尾；alpha.2 / alpha.3 已进入 Proposed 设计，分别承接增量性能 + Standard Box Layout Core contract 与 Concurrent + generation；alpha.4 仅登记 Headless Interaction 候选边界。
>
> 每条 Proposed ADR 必须按 `flow-alpha` 独立完成能力完备性、包边界、define-registry、测试契约与端到端闭环检查，不能因共用同一 milestone 跳过 Gate。

## 版本边界

v0.5 继续补充跨图元、跨 adapter 或影响 IR / compile 的纵向机制。具体图形、领域布局和单一 renderer 特性仍不进入 Kernel。

下方索引、各节候选边界与进入条件保留 alpha.1 立项时的筛选记录。已交付能力的字段名、DSL 与公开契约以 Accepted ADR、公开类型和用户文档为准。

## 里程碑索引

| 方向                      | 解决的问题                                                               | 当前归属                                                                 |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Node 锚点对齐定位         | 基于真实 Node 布局把自身 anchor 对齐已完成实体 anchor                    | [ADR-01 Accepted](./alpha.1/01-node-anchor-position.md)                  |
| Scope 自身锚点与变换基点  | 放置、旋转或缩放子图时不再泄漏内部坐标                                   | [ADR-02 Accepted](./alpha.1/02-scope-anchor-and-transform-pivot.md)      |
| 单轴路径连接              | 只沿垂直或水平轴连接，不强制补齐正交折线的第二段                         | [ADR-03 Accepted](./alpha.1/03-single-axis-path-connection.md)           |
| Node 文本自动对比色       | 根据实际填充明度选择黑色或白色文字，保持可读性                           | [ADR-04 Accepted](./alpha.1/04-node-text-auto-contrast.md)               |
| Node label 包围盒间距     | 长标签按自身尺寸离开节点边界，避免左右标签与节点重叠                     | [ADR-05 Accepted](./alpha.1/05-node-label-box-spacing.md)                |
| TeX 数学语法兼容          | 正确解析 MathJax 支持的 TeX 语法并保留跨后端视觉语义                     | [ADR-06 Accepted](./alpha.1/06-tex-math-syntax-compatibility.md)         |
| 布局感知 Composite        | 让 Tier 2 在同次 compile 内测量、约束、replay 并返回 artifact            | [ADR-07 Accepted](./alpha.1/07-layout-aware-composite.md)                |
| Box Layout Composite 合同 | 让任意 child 接受双轴 slot、反馈真实占用并带外层 transform / clip replay | [alpha.2 ADR-06 Proposed](./alpha.2/06-box-layout-composite-contract.md) |
| 增量性能闭环              | 用 Diff、局部 compile 与 retained renderer 减少持续更新成本              | [alpha.2 Proposed](./alpha.2/roadmap.md)                                 |
| Concurrent 与渐进生成     | 可让出、取消地准备候选结果，并支持渐进物化与 generation                  | [alpha.3 Proposed](./alpha.3/roadmap.md)                                 |
| Headless Interaction      | 补齐 renderer-agnostic target、behavior、intent 与 ownership             | [alpha.4 候选](./alpha.4/roadmap.md)                                     |

## alpha.1 执行批次

| 批次 | ADR          | 目的                                                           | 进入条件                         |
| ---- | ------------ | -------------------------------------------------------------- | -------------------------------- |
| 0    | ADR-01       | 交付 Node anchor-to-anchor 定位                                | 已完成                           |
| 1    | ADR-02/03/05 | 先稳定 Scope 几何参照、单轴连接与 label 视觉盒间距             | 已完成                           |
| 2    | ADR-04/06    | 收口文本可读性与 TeX 语法 / 样式语义                           | 已完成                           |
| 3    | ADR-07       | 建立通用 child layout、compile-local replay 与 typed artifacts | 已完成；Table alpha.2 以此为前置 |

批次只规定设计与集成顺序，不授权实现、commit 或发布。单条 ADR 未通过 Gate 时保持 Proposed，不得以“同属 alpha.1”为由绕过。

Headless interaction 与 progressive compile 的 ADR、实现、测试与文档已于 2026-07-25 撤回。后续版本若重新承接，必须重新建立 Proposed ADR、测试契约并通过独立 Architecture Gate，不沿用本轮实现授权。

## 后续 Alpha 排期

| 版本    | 交付边界                                                                                        | 上位设计                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| alpha.2 | `sync + atomic + incremental`；补齐 Standard Box Layout 所需双轴 child layout / replay contract | [性能设计](../../../../../../notes/architecture/performance-design.md) · [ADR-06](./alpha.2/06-box-layout-composite-contract.md) |
| alpha.3 | `concurrent + atomic/progressive`：调度、取消、渐进物化、generation session                     | [性能与增量运行时设计](../../../../../../notes/architecture/performance-design.md)                                               |
| alpha.4 | Headless Interaction：事件、ownership routing、behavior、presentation、intent                   | [交互与增量运行时设计](../../../../../../notes/architecture/interaction-design.md)                                               |

三段共享 identity、revision、ownership、transaction 与 retained Scene，不建立平行 Runtime。alpha.2 的 transaction 即使只同步执行，也必须隔离候选 revision 与当前状态；alpha.3 在同一契约上增加调度能力；alpha.4 只消费基础契约，不反向重定义它们。

## Node 锚点对齐定位

### 根问题

上层 composite 需要按普通 Node 的真实文本、shape、padding、margin、scale 与 rotate 结果排列节点。现有 position 只能先解析内容盒中心；上层若自行估算 anchor，会复制 core 布局语义并在自定义 shape / boundary 或文本测量变化时漂移。

### 决策边界

- 只扩展 `Node.position`，用结构化 `IRAnchorPosition` 表达当前 Node anchor 与已完成目标 anchor 的对齐。
- 目标复用现有 `IRNodeTarget`，覆盖 Node、Coordinate 与 resolved Scope；target / self anchor 默认 center。
- Node 先完成自身几何布局，再整体平移；Scene 与 renderer 不新增字段。
- undefined、later、self 与正在布局的祖先 Scope 全部 fail-loud；已解析空 Scope 合法。
- 详细设计、测试矩阵与文件 scope 见 [alpha.1 ADR-01](./alpha.1/01-node-anchor-position.md)。

## Scope 自身锚点与变换基点

### 根问题

当前 Scope 的平移、旋转和缩放以局部 `[0, 0]` 或手写坐标为基准。复用子图时，调用方必须知道内部原点和内容尺寸，Scope 还不能像 Node 一样按自身中心或边界锚点放置。

### 立项候选边界（历史）

- 自身点至少覆盖局部 `origin`、`center`、四边、四角，并保留显式 `[x, y]` 逃生口。
- 平移类输入区分“外部目标参照点”和“Scope 自身对齐锚点”；例如把 `Scope.center` 放到某个极坐标目标，而不是把两者混入 `polar-translate.origin`。
- `rotate` / `scale` 可声明自身 pivot；缺省仍为局部 `origin`，不改变 v0.4 语义。
- 自身锚点复用 `scope.id` 的包络与 `boundingShape` 契约，不建立第二套边界计算；空 Scope 回退到局部原点。
- 立项时要求 ADR 解决“先算 children 包络还是先解析 transforms”的编译顺序，以及子元素位置与自身 transform 互相依赖时的循环诊断。

## 单轴路径连接

### 根问题

现有 `|-` / `-|` 表达完整正交折线：先沿一个轴，再沿另一个轴到达目标。用户只需要垂直连接时，`|-` 仍会追加水平段，只能手动计算投影点。

### 立项候选边界（历史）

- 提供“保持当前 x、只连接到目标 y”的纯垂直语义；同时评估是否应成对提供纯水平语义，避免单边特例。
- 优先作为 Path / Way 的语义 sugar lower 到现有 line / target 能力；只有现有 Kernel 无法完整表达时才扩展 IR。
- 不改变 `|-` / `-|` 的既有两段折线语义，也不在 renderer 增加特殊路径命令。
- 立项时要求 ADR 覆盖笛卡尔点、Node / anchor target、Scope transform、forward reference、零长度段，以及 React Way 与 Vanilla 写法的一致性。

## Node 文本自动对比色

### 根问题

`currentColor` 跟随主题或外层颜色，不能根据 Node 的实际填充判断文字是否清晰。深色填充需要白字、浅色填充需要黑字时，用户目前必须重复计算和配置。

### 立项候选边界（历史）

- 以显式 opt-in 能力提供，不改变 `currentColor` 与现有 `color` 默认语义。
- 对可解析的纯色 fill 计算相对明度，并在黑 / 白中选择对比度更高的文字颜色；算法与阈值必须在 Core 契约中固定，SVG / Canvas 不得各自判断。
- 明确透明色与背景的合成基准，以及渐变、pattern、image、CSS 变量等无法静态确定明度时的 fallback / 诊断策略。
- 只影响 Node 文本及明确纳入的 label 通道，不应意外改写 stroke、fill 或 Scope 的其它级联字段。
- 立项时要求 ADR 确认该能力进入持久化 IR，还是由 React / Vanilla 共享 authoring helper 展开；两条入口必须得到一致结果。

## Node label 包围盒间距

### 根问题

当前 Node label 的 `distance` 是“节点边界到 label 中心”的固定偏移，没有计入 label 自身尺寸。长文本放在节点左侧或右侧时，即使 `distance` 为正，label 仍可能大面积穿入节点；上下位置的实际边缘间距也会随字体高度变化，和用户设置的数值不一致。

该行为符合 v0.4 schema 对 center distance 的字面描述，因此改成视觉盒间距会改变既有 label 坐标、pin 长度与自动 viewBox，作为 v0.5 可见行为修正处理，不回灌已冻结的 v0.4 RC。

### 立项候选边界（历史）

- 将 `distance` 定义为节点边界与 label 视觉盒沿放置方向的间距，而不是到 label 中心的距离；默认值与非负约束可保持不变。
- 上下方向的中心偏移为 label 半高 + `distance`，左右方向为 label 半宽 + `distance`。对角 anchor、数值角度和 `{ boundary, fraction }` 统一使用旋转后 label OBB 在放置方向上的投影半径，避免维护轴向特例。
- Node label layout 保存统一的 `measuredWidth` / `measuredHeight`；纯文本、混排 / TeX、Scene `TextPrim`、bbox 与 pin 引线必须消费同一视觉盒，不能继续以 `fontSize` 代替整体高度。
- `placement: 'outside'` / `'inside'` 复用同一 box extent，只反转偏移方向；inside 只保证相对所选边界的定向间距，不承诺超大 label 完整容纳于节点内部。
- `position: 'center'` 继续直接落在节点中心；`keepUpright` 的 180° 翻转不改变 box extent。任意非凸 shape 的全局 label 碰撞避让不纳入本项。
- 立项时要求 ADR 覆盖长文本的 left / right、top / bottom、对角与数值角度、显式 / radial / tangent rotate、inside、混排 / TeX、旋转 Node、pin 端点、自动 viewBox，以及 `distance: 0` 的贴边语义。

## TeX 数学语法兼容

### 根问题

当前 `@retikz/tex` 只覆盖有限的 MathJax TeX 输入与单一路径 lowering，部分 LaTeX 数学语法无法启用，公式内部颜色等视觉语义也会在进入 Scene 前丢失。v0.5 需要把目标明确为兼容 MathJax 支持的 TeX 数学语法，而不是完整 LaTeX 文档编译器。

### 立项候选边界（历史）

- `@retikz/tex` 负责 MathJax 扩展的选择性加载及公式字形与样式 lowering；Core 继续拥有后端中立的 `LowerTex` / `LoweredTex` 与 Scene 契约。
- 立项时把具体 profile、扩展包集合、数据结构与兼容性取舍留给该 milestone 的 ADR 确认。
- 立项时要求 ADR 覆盖 SVG / Canvas 等后端的一致性、样式继承、无法表达的语法与样式诊断、浏览器包体与初始化成本，以及缓存键的完整性。

## 布局感知 Composite

> 2026-07-25：三轮 Architecture Gate 未取得自动 PASS 后，人工确认修订后的设计并授权实现与提交；实现、自测、双语文档和 changelog 完成后 ADR-07 转为 Accepted。该 override 不等同 Gate PASS，也不包含 push 或发布。

### 根问题

现有 `CompositeDefinition.expand()` 在完整 compile context 创建前做无上下文结构展开，无法让上层布局组件根据任意 `IRChild` 的真实测量、provider、引用和父级约束反馈求解，也不能复用已完成布局生成最终 Scene。Table alpha.2 若在自身复制 Core 测量或二次 lower，会形成平行布局语义。

### 决策边界

- 在现有 Composite registry 中增加与 `expand` 互斥的 `compile` 分支，不新增 registry。
- `layoutChild()` 支持 intrinsic / constrained layout，返回 allocation bounds、visual bounds 与 compile-local replay。
- 最终 replay 只提交与 emit，不重复 composite expansion、文字 / TeX 测量或 layout；discarded probe 无 namespace、resource、warning 或 artifact 副作用。
- `compileToScene()` 同次显式返回 Scene 与 typed artifacts；artifact 用 compile-local occurrence locator 标识，不进入 Scene，也不通过全局 Map 或 definition callback capture。
- `lowerIRToKernel()` 遇到 layout-aware composite 以 provider key + IR path fail-loud，不回退到不完整 lowering。
- 详细设计、测试矩阵与文件 scope 见 [alpha.1 ADR-07](./alpha.1/07-layout-aware-composite.md)。

## Standard Drawing Library

官方可选的跨领域绘图能力库已移交独立的 [`packages/library`](../../../../../library/_notes/architecture/standard-library-design.md) 分组。它不再是 Kernel lockstep 的 v0.5 候选；Core 继续拥有公开 extension 契约，Library 的 Standard 包家族由首个具体能力 ADR 建立独立 release group、package manifest 和 React / Vanilla 接入。

## 进入 alpha.1 实现的条件（历史）

1. 从真实示例确认最小用户语法，不以 controls 或单个 demo 反推公共 API。
2. 对照 `core-drawing-complete.md` 确认能力归属、包边界和下游闭环。
3. 每条 ADR 分别补齐实现契约和 ignored `test-contract` 矩阵。
4. 每条 ADR 分别完成 Alpha Architecture Gate；最多三轮，未通过则交人工决策。
5. ADR 明确公开契约、错误路径、测试象限和文档同步范围，并获得人工确认后，才进入实现。
6. 候选可以用 Gate PASS + 人工接受的 Deferred 结论关闭设计待办；这不表示能力已交付，不进入 implementation / docs 验收，未来只能由新 Proposed ADR 重开。

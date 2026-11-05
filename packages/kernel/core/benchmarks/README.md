# Core 性能基准

## 编译资源注册表

[resource-paint.bench.ts](./compile/resource-paint.bench.ts) 与 [resource-clip.bench.ts](./compile/resource-clip.bench.ts) 分别测量 Paint / Clip 一次独立注册表生命周期：创建注册表、处理 10 / 100 / 1000 次登记或导入、取得资源和引用结果。规模表示登记次数；重复输入最终只有一份资源，独立输入最终有同等数量资源。每个文件 24 个场景，共 48 个场景；独立资源引用校验 API 移除后，对应 6 个旧场景不再运行，历史报告仍保留。

绘制输入分为两色渐变和固定 8 图元 Pattern；裁剪分为矩形和固定 32 段路径。分别覆盖不同内容、重复实例、等值独立对象及导入已有资源。输入解析和导入源资源生成均在计时外；计时包含登记所需的 provider 执行、路径生成、快照、key 序列化、去重与输出分配。计数器用于核对 provider 次数，计数开销未扣除。

每场景预热 10 次、测量 100 次，核对资源数量、首尾引用、图元或命令数量，以及 provider 调用次数。Paint 重复登记只生成一次 Pattern；Clip 按输出路径去重，重复登记仍调用 lower；已有资源导入均不再调用 provider。

本组以 P90 消费预算评价结果，不启用 CI 耗时阻断。1000 是测量规模上限，不是运行时资源限制。登记与导入采用相同预算，复杂 Pattern 不放宽；预算来自局部编辑、普通更新和大批资源处理的阶段时间分配假设，不按实测倒推。

| 规模 | 注册表整批操作：警告 / 错误 |
| ---- | --------------------------- |
| 10   | 1 / 4ms                     |
| 100  | 4 / 8ms                     |
| 1000 | 8 / 16.6ms                  |

登记阶段在最大档接近一帧时间即有同步阻塞风险，其他编译与渲染阶段仍需单独留时。源码加载结果只用于本机探索，稳定历史回归基线尚未选定。最初无预算报告保留为历史记录，补预算后重新采样，不追溯声称旧报告采样前已设阈值。

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/resource-paint.bench.ts benchmarks/compile/resource-clip.bench.ts --fsModuleCache=false
```

## 编译文本

[text.bench.ts](./compile/text.bench.ts) 测量单行文本块布局（含分词与行槽准备）、文本块折行、既有布局的图元输出与最宽文本单元查询，共 24 个代表场景。每个样本只调用一次对应操作，不用外部循环增加调用量。fixture 集中在 [_text-workloads.ts](./_text-workloads.ts)

| 操作             | 形态与规模                                                    | 场景数 | P90 警告 / 错误：小档；大档 |
| ---------------- | ------------------------------------------------------------- | ------ | --------------------------- |
| 单行文本块布局   | 纯文字 / 公式混排，8 / 128 片段                               | 4      | 0.05 / 0.2ms；0.5 / 2ms     |
| 无自动折行文本块 | 32 / 1024 字符                                                | 2      | 均为 0.1 / 0.5ms            |
| 自动折行文本块   | 英文、中文、组合字素长词、跨词切换字重，128 / 2048 字符或字素 | 8      | 0.2 / 1ms；2 / 8ms          |
| 公式混排折行     | 8 / 64 片段                                                   | 2      | 0.2 / 1ms；2 / 8ms          |
| 文本块输出       | 纯文字 / 公式混排，4 / 64 物理行                              | 4      | 0.05 / 0.2ms；0.5 / 2ms     |
| 最宽文本单元     | 英文 / 中文，128 / 2048 字符                                  | 4      | 0.05 / 0.2ms；0.5 / 2ms     |

字符规模指 UTF-16 code unit 数；长词使用 `a\u0301` 组合字素，规模指字素数，实际 code unit 数为两倍。折行宽度固定为 80 user units，行槽为 14。单行与公式混排块的文字片段固定为 `ab`，公式固定为两个路径；输出场景每行含一个文字片段，可选一个公式片段。单元查询的英文词固定七字符，中文按单字测量

度量器用字符串长度和字号进行常量时间计算，不运行字体引擎或额外分词。公式回调返回预置结果；Core 对公式结果的快照仍计入布局。输入解析、fixture 构造、独立预期结果与断言均在计时外；输出场景直接使用手工构造的既有布局，不重新测量或降解。验证宽高、行数、基线、字素完整性、片段来源、颜色、透明度、公式路径及输入不变性

每场景预热 10 次、正式测量 100 次，共 110 次操作；整组共 2640 次操作、2400 个正式样本。预算为采样前的普通宿主更新与单个长内容编辑假设，具体消费频率和阶段分配见 [_budgets.ts](./_budgets.ts)，不代表业务硬上限或整帧保证，不启用耗时阻断，不自动更新历史基线

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/text.bench.ts --fsModuleCache=false
```

## 场景可见边界

[scene.bench.ts](./compile/scene.bench.ts) 测量一次完整的 `calculateBoundsOfPrimitives`，包括资源索引、路径保守包络、描边、可见箭头、分组裁剪及变换。六种输入为折线、三次贝塞尔、旋转椭圆弧、双端可见箭头、双端透明箭头、局部裁剪后平移，各16/1024条路径命令，共12场景。规模包含首条move；裁剪额外固定5条clip命令，箭头各固定一个小矩形marker

fixture及独立几何预期在 [_scene-workloads.ts](./_scene-workloads.ts) 构造，均不计时；验证边界四字段、冻结输出和输入不变性。单样本只调用一次汇总，不包含路径生成、完整编译或渲染，不用外包循环扩容。每场景10次预热、100次正式测量，共110次；全组1320次调用、1200正式样本

P90警告/错误预算：16命令0.05/0.2ms，1024命令0.5/2ms。消费频率是局部几何更新及Composite探测的规划假设，详见预算配置；不按箭头/曲线/裁剪复杂度放宽，不更新历史基线

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/scene.bench.ts --fsModuleCache=false
```

## 测量边界

当前覆盖 `src/providers`、`src/resolve`、`src/contract` 的代表操作，以及 `src/compile` 的资源注册表和文本操作，不调用 `compileToScene`。shape / arrow / mark 的 iterable 在计时内完整消费，包含该操作自身的计算与分配。

- Scene 图元生成属于编译计算；SVG 字符串生成、Canvas 绘制、DOM 更新、浏览器布局与绘制均不计入。
- 不接入 `@retikz/render`、React/Vanilla renderer 或浏览器。Runtime / Reconciler 调度、增量更新与生命周期不属于本目录。
- fixture 构造、正确性断言、报告生成及构建均在计时区间外。Provider 基准的参数 schema 解析在计时外；resolver 自身拥有的参数解析与默认化计入完整操作耗时。
- 编译文本场景使用确定性度量器和预置公式结果，不引入 DOM / Canvas 字体测量。

## 当前范围

| 文件                                               | 测量范围                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| [shape.bench.ts](./providers/shape.bench.ts)       | 三种形状的代表性外接几何、边界求交、圆包络与 emit；圆角只用于求交与 emit |
| [boundary.bench.ts](./providers/boundary.bench.ts) | tight / bounds 的代表性 fit 与连接点；固定正 gap                         |
| [visual.bench.ts](./providers/visual.bench.ts)     | 六种箭头、四种标记、三种 pattern 与矩形 clip                             |
| [registry.bench.ts](./providers/registry.bench.ts) | 各类 registry 构建、箭头转 mark、通用表创建和命中查找                    |
| [theme.bench.ts](./providers/theme.bench.ts)       | light / dark 默认颜色、稀疏覆盖与 palette 复制冻结                       |
| [path.bench.ts](./providers/path.bench.ts)         | stroke provider 委托、owner output 捕获与空返回分支                      |

默认代表性覆盖，发现热点后再细分。polygon 保留 6 边典型输入和 1024 边 schema 上限；pattern 周期保留 8 / 32 项；各 registry 用 8 个自定义项验证接入，规模增长集中在通用注册表的 8 / 128 项。较大档为探索负载，不代表已验证业务需求。固定形状不通过外部循环制造规模。

anchor、edge、关键点、参数缩放及等价参数组合不再独立采样；polygon 的轮廓生成路径通过 emit 保留观测。所有内置 arrow / mark 各保留一个显式样式输入，theme 保留明暗模式下的默认与稀疏覆盖。正确性边界、注册冲突与缺失名称仍由功能测试负责。此前 263 项报告保留为历史结果，不代表精简后的用例清单。

boundary 的上游 envelope 使用预置值；path 的宿主 emitter 使用固定结果，故这两类分别只反映 fit / gap 与委托开销，不代表几何计算或完整路径编译耗时。短操作可能接近计时及回调开销，结果需谨慎解释。本节仅列 provider 场景；资源、文本、contract 和 resolve 场景使用各自的测量边界。

复用根目录 `scripts/benchmarks` 的采样与报告工具：预热 10 次、正式采样 100 次；结果保留并在计时外校验。每个场景在采样前配置 P90 警告/错误预算；预算评价与用例执行成功分别报告，不启用 CI 耗时阻断。

## 运行

在仓库根目录串行执行：

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts
```

当前配置使用 Vite 源码加载，报告 artifact 为 `vite-source`。原生构建入口在加载 graphic schema 时出现枚举初始化错误，未进入采样；此问题不在 provider 优化范围内。源码结果用于探索，包含开发加载器开销，不能与原生 ESM 基线直接比较。mark 与通用 registry 使用包内入口，不扩大生产公共 API。基准不进入默认功能测试，默认单 worker 串行运行；执行性能采样需得到当前任务的明确授权。

共享 reporter 保存中文 Markdown 与原始 JSON 到已有 ignored 报告目录。可用 `RETIKZ_CORE_BENCH_BASELINE` 指定人工选择的基线、`RETIKZ_CORE_BENCH_RUNNER_ID` 标识运行环境；环境或输入不同的结果不直接比较。

## Resolve 范围

| 文件                                             | 单次操作与代表负载                                                          | 规模                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| [path.bench.ts](./resolve/path.bench.ts)         | 完整 Path 解析：绝对坐标、累积相对坐标、预置引用查询、步骤标签、smooth 点集 | 16 / 1k / 10k 步骤或点；smooth 为一个步骤                |
| [node.bench.ts](./resolve/node.bench.ts)         | 完整 Node 解析：简单节点、继承与局部覆盖、自动对比色、图案绑定、多标签      | 单节点；多标签场景含 16 个标签                           |
| [text.bench.ts](./resolve/text.bench.ts)         | 完整行解析：纯文本公式开关、美元公式混排、显式片段与相对字体                | 纯文本 32 / 1024 / 16384 字符；混排 16 / 256 / 2048 片段 |
| [defaults.bench.ts](./resolve/defaults.bench.ts) | 单层 Scope 默认值：直接继承、稀疏合并、node 通道 reset                      | 固定 node/path 两通道                                    |

共 35 个代表场景。Path 是逐路径解析，Node 是逐节点解析，Text 是节点正文、节点标签及路径标签共同使用的行解析；Scope 默认值合并是独立的继承操作。规模用于观察增长趋势，较大档的消费需求是显式规划假设，不表示已验证业务上限；不使用外部循环把多个节点或多次查询包装成一次操作。

registry、父级默认值、目标坐标 Map 和输入均在计时外准备。引用查询仅使用确定性的坐标 Map，不包含 compile 的引用索引、变换链与边界几何处理。文本不包含度量或 TeX 排版；图案仅绑定资源，不生成图元。结果断言验证坐标与目标数量、标签默认值、颜色、字体、通道继承及输入不变性，不以“不抛错”代替正确性。

Node/Path 已覆盖主要 style/resource 组合成本；position 的编译上下文成本、Composite 自定义 schema 的任意复杂度、theme 的 provider 配色与固定成本 spacing/helper 不另行铺测。相关语义边界继续由功能测试负责。包内 resolver 经所属 owner barrel 导入，不为基准扩大公共 API。

只运行 resolver 场景：

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/resolve --fsModuleCache=false
```

源码重排后可关闭模块缓存验证当前源码。源码加载的 export getter 开销会影响长路径结果；预算仍按消费需求设置，超限表示该测量环境未满足规划预算，不直接归因为生产算法问题。

## 运行前消费预算

所有当前场景均由 [_budgets.ts](./_budgets.ts) 在采样前指定 P90 警告/错误上限，单位为毫秒；预算不读取历史或当前测量值。调用频率是显式规划假设，非实测业务分布；运行后可依据需求或测量边界的证据提出调整，不能为消除超限而放宽。CI 阻断独立配置，当前为 false。

| 操作                                            | P90 警告 / 错误 |
| ----------------------------------------------- | --------------- |
| Shape / Boundary / Arrow / Mark / Clip 单次操作 | 0.01 / 0.04ms   |
| Pattern 单资源生成、Theme 单次配色              | 0.05 / 0.2ms    |
| Registry 构建                                   | 0.1 / 0.5ms     |
| Registry 查找、Path provider 委托               | 0.002 / 0.01ms  |
| Node 单节点解析                                 | 0.05 / 0.2ms    |
| Path 16 步骤或点                                | 0.05 / 0.2ms    |
| Path 1k 步骤或点                                | 1 / 4ms         |
| Path 10k 步骤或点                               | 4 / 16.6ms      |
| Text 普通行（至多1024字符或256片段）            | 0.05 / 0.2ms    |
| Text 长行（16384字符或2048片段）                | 0.5 / 2ms       |
| Scope 单层默认值                                | 0.01 / 0.05ms   |

预算基于操作用途、典型调用数量与阶段时间分配，详细消费位置及假设写在配置 rationale 中。单次阈值乘以调用次数只是规划时间分配，不是批量耗时实测，也不能将多个阶段预算相加宣称满足整帧。1024边多边形仍按单节点几何操作评价；高复杂度不能豁免预算。新增未配置的类别会显式报错，避免静默退回仅报告。

此前无预算的报告保留为历史采样；本轮首次为这些已有场景补齐消费预算并重新采样，不追溯宣称旧采样前已设预算。

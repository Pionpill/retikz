# Core 性能基准

## 测量边界

当前测 `src/providers` 与 `src/resolve` 的单次操作，不调用 `compileToScene`。shape / arrow / mark 的 iterable 在计时内完整消费，包含该操作自身的计算与分配。

- Scene 图元生成属于编译计算；SVG 字符串生成、Canvas 绘制、DOM 更新、浏览器布局与绘制均不计入。
- 不接入 `@retikz/render`、React/Vanilla renderer 或浏览器。Runtime / Reconciler 调度、增量更新与生命周期不属于本目录。
- fixture 构造、正确性断言、报告生成及构建均在计时区间外。Provider 基准的参数 schema 解析在计时外；resolver 自身拥有的参数解析与默认化计入完整操作耗时。
- 后续文本场景使用确定性的预置测量输入或纯计算测量器，不引入 DOM / Canvas 字体测量。

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

boundary 的上游 envelope 使用预置值；path 的宿主 emitter 使用固定结果，故这两类分别只反映 fit / gap 与委托开销，不代表几何计算或完整路径编译耗时。短操作可能接近计时及回调开销，结果需谨慎解释。未添加 compile、parse 或 contract 的独立基准。

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

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

## Scene 编译操作

[scene.bench.ts](./compile/scene.bench.ts) 测量一次完整的 `calculateBoundsOfPrimitives`，包括资源索引、路径保守包络、描边、可见箭头、分组裁剪及变换。六种输入为折线、三次贝塞尔、旋转椭圆弧、双端可见箭头、双端透明箭头、局部裁剪后平移，各16/1024条路径命令，共12场景。规模包含首条move；裁剪额外固定5条clip命令，箭头各固定一个小矩形marker

另有10项代表操作，与上述12项合计22场景：

| 操作             | 输入与规模                                                                     | 场景数 | P90警告/错误                |
| ---------------- | ------------------------------------------------------------------------------ | -----: | --------------------------- |
| 布局边界合并     | 单个16/1024点贡献，无/有方向性阴影，与已有边界合并                             |      4 | 小档0.05/0.2ms，大档0.5/2ms |
| Scene布局        | 固定自动边界加padding、显式viewBox，含precision2取整                           |      2 | 均0.01/0.05ms               |
| Marker放置与物化 | 自动/固定角度，8/128叶图元，固定3层嵌套组，含文字、描边色、透明度与id/meta剥离 |      4 | 小档0.05/0.2ms，大档0.5/2ms |

fixture及独立几何预期在 [_scene-workloads.ts](./_scene-workloads.ts) 或固定输入的setup中构造，均不计时。验证边界四字段、可见边界冻结、布局舍入、marker完整输出树及输入不变性。单样本只调用一次对应操作，不包含路径生成、完整编译或渲染，不用外包循环扩容。每场景10次预热、100次正式测量，共110次；全组2420次调用、2200正式样本

边界合并的规模为一次贡献的点数；marker规模为一个标记的叶图元数，包含等量矩形和文字，三层组不计入该数量。标记位置/切线和已编译定义预置，provider生成、曲线采样、预期构造及rounder工厂不计时，放置变换、递归复制和外观物化计时。消费频率为显式规划假设，规模不表示已验证业务上限

代表性覆盖不逐helper机械加case：负零归一和marker物化由完整消费操作覆盖；取整工厂、四角构造和简单汇总包装复用功能证据，不单列性能场景。新增场景改变完整fixture摘要，历史12项结果不直接用于回归判断

P90警告/错误预算：16命令0.05/0.2ms，1024命令0.5/2ms。消费频率是局部几何更新及Composite探测的规划假设，详见预算配置；不按箭头/曲线/裁剪复杂度放宽，不更新历史基线

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/scene.bench.ts --fsModuleCache=false
```

## 编译共享操作

[shared-transform.bench.ts](./compile/shared-transform.bench.ts) 测量变换链、矩阵合成与预合成矩阵消费；[shared-provider.bench.ts](./compile/shared-provider.bench.ts) 测量provider输出的完整快照及坐标快照。两个职责分别维护fixture，见[_shared-transform-workloads.ts](./_shared-transform-workloads.ts)与[_shared-provider-workloads.ts](./_shared-provider-workloads.ts)

| 操作                    | 输入与规模                                 | 场景数 | P90警告/错误                |
| ----------------------- | ------------------------------------------ | -----: | --------------------------- |
| 逐项正向/逆向变换       | 3/24项平移、带中心旋转、非均匀负缩放，单点 |      4 | 5/20μs                      |
| 完整变换合成            | 3/24项，正逆矩阵及累计旋转/尺度            |      2 | 10/50μs                     |
| 父级追加合成            | 21项父链结果与完整声明链预置，追加3项      |      1 | 10/50μs                     |
| 预合成矩阵正向/逆向投影 | 24项链矩阵预置，单点                       |      2 | 2/10μs                      |
| 图元快照与领域校验      | 8/128叶混合图元，固定3层组                 |      2 | 小档0.05/0.2ms，大档0.5/2ms |
| 长路径快照与领域校验    | 单条路径16/1024命令                        |      2 | 同上                        |
| 标记图元物化快照        | 8/128叶混合图元，固定3层组                 |      2 | 同上                        |
| Provider坐标快照        | 一个有限二维坐标                           |      1 | 2/10μs                      |

共16场景，每场景10预热+100正式样本、110调用；全组1760调用、1600正式样本。每个样本仅执行一次操作，不通过外包循环扩容。混合树包含等量rect/ellipse/path/text，固定合法资源引用、meta内非消费引用和对象可选undefined字段；叶数不含组节点。长路径规模包含首条move

输入构造、独立手算预期、父级/预合成矩阵准备、允许资源集合构造及断言均在计时外。变换执行、合成输出分配、iterable消费、递归JSON快照、有限值/资源/领域约束检查计时。完整输出、字段存在性、深层引用脱离、输入不变性及允许资源集合均校验；快照保留id/meta，不与Marker放置时的身份剥离混淆

预算来自1000点投影、100个Scope准备或100个普通provider输出的阶段分配假设，见[_budgets.ts](./_budgets.ts)，不表示已验证业务上限。只测Core拥有的纯操作，不测Reconciler的缓存命中、跨调用复用或链插入调度。通用JSON复制和非负断言由完整快照覆盖；错误构造及极端数值分支复用功能证据，不逐helper增加基准

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/shared-transform.bench.ts benchmarks/compile/shared-provider.bench.ts --fsModuleCache=false
```

## Boundary 与 Reference

[boundary.bench.ts](./compile/boundary.bench.ts)覆盖连接面完整消费，[reference.bench.ts](./compile/reference.bench.ts)覆盖位置、目标与引用求值；fixture分别位于[_boundary-workloads.ts](./_boundary-workloads.ts)、[_reference-workloads.ts](./_reference-workloads.ts)，混合变换复用既有Shared fixture

| 模块      | 操作与输入                                                | 场景数 | P90警告/错误                             |
| --------- | --------------------------------------------------------- | -----: | ---------------------------------------- |
| Boundary  | 零margin、旋转90°非对称margin外扩                         |      2 | 2/10μs                                   |
| Boundary  | 已准备24项链矩阵的完整布局投影，含contentCenter           |      1 | 5/20μs                                   |
| Boundary  | 已发布布局再投影：3/24项父链、非交换本层3项               |      2 | 10/50μs                                  |
| Boundary  | 视觉矩形、显式circle tight、ellipse bounds附着点          |      3 | 5/20μs                                   |
| Boundary  | 16/1024顶点折线，一半内部前缀、非中心线段出界             |      2 | 50/200μs、500/2000μs                     |
| Boundary  | 完整命名/角度/边比例锚点                                  |      3 | 5/20μs                                   |
| Boundary  | store创建+首次锚点、已准备缓存查询                        |      2 | 5/20μs、2/10μs                           |
| Reference | 无变换、预合成24项、内部合成24项的上下文创建              |      3 | 2/10μs、2/10μs、10/50μs                  |
| Reference | tuple、命名引用、at、offset、3/24层polar、between位置     |      7 | 简单2/10μs，相对5/20μs，递归polar10/50μs |
| Reference | 节点中心、预置命名/边比例锚点、显式连接面、1/4层between树 |      6 | 中心2/10μs，锚点5/20μs，between10/50μs   |
| Reference | 目标世界坐标，含世界offset                                |      1 | 5/20μs                                   |
| Reference | 坐标引用的已准备矩阵投影、3/24项父链下已发布坐标再投影    |      3 | 2/10μs、10/50μs                          |

共35场景（Boundary15、Reference20），每场景10预热+100正式、110次协议内调用，全组3850调用、3500正式样本。一次样本只求值一个完整输入，不把多个查询外包成批量。缓存为BoundaryStore公开拥有的能力，first包含创建与完整首次求值；hit显式在计时外准备，不评测Reconciler跨次缓存。其它锚点目标和circle包络也明确预置缓存，不让正式样本随首轮执行切换工作负载

已发布再投影使用不交换的父/本层矩阵，手算验证中心、内容中心和累计尺寸；位置与目标使用实际lookup/BoundaryStore/内置boundary resolver，验证局部点、世界点、原目标和直接引用身份，between不携带直接引用。4层between有16叶、31个表达式节点；polar为合法递归原点，不伪造嵌套offset。构造、参数解析、矩阵/缓存准备和结果断言在计时外，目标显式boundary的真实resolver解析属于该次目标求值并计时

预算基于1000次简单查询、100次布局/复杂位置或单条复杂折线的阶段分配假设；3/24层及16/1024顶点均为规划输入，不表示实测业务上限。Core入口现沿用Vite源码探索配置，不能与原生ESM/浏览器或历史不同fixture直接比较；命名空间、依赖追踪、Node/Scope/Path完整编译与renderer不在计时内

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/boundary.bench.ts benchmarks/compile/reference.bench.ts --fsModuleCache=false
```

## Node 编译与阶段复用

[node.bench.ts](./compile/node.bench.ts) 测量完整单节点编译、正文宽度求解、锚点布局、独立绘制和真实更新，共43项。输入与已准备阶段产物由[_node-workloads.ts](./_node-workloads.ts)在计时外通过真实resolver和编译链构造

| 操作         | 输入与复用组合                                                                                           | 场景数 | P90警告/错误               |
| ------------ | -------------------------------------------------------------------------------------------------------- | -----: | -------------------------- |
| 完整编译     | 1024纯文本字符、64混排片段各6档；16标签8档；空节点、正文32字符、混排8片段、1标签、固定宽度1024字符冷编译 |     25 | 小档0.1/0.5ms，大档0.5/2ms |
| 主体宽度求解 | 1024字符，Exact/Range/Minimum Intrinsic，各不复用/只准备形状                                             |      6 | 0.5/2ms                    |
| 锚点布局     | 主体已准备，真实目标right与自身left锚点，3/24项混合变换链                                                |      2 | 0.02/0.1ms                 |
| 独立绘制     | 64物理行、64混排片段、16旋转带pin标签、单个暖态渐变资源                                                  |      4 | 0.1/0.5ms                  |
| 更新对照     | 移动16标签节点、32字符换色、16标签只改一个，各完整重算/有效部分复用                                      |      6 | 换色0.1/0.5ms，其余0.5/2ms |

无标签节点比较不复用、仅正文、正文与形状、整体布局、整体布局与部分绘制、整体布局与整体绘制六档；16标签增加主体与一半/全部标签测量两档。部分绘制复用shape；有标签时再复用正文与一半标签绘制。标签测量与放置分开，移动不复用旧位置，改单标签不复用已变标签，换色只复用布局。不同档位比较最终布局、绘制和对齐线，不要求局部阶段字段完全相同

Core只消费调用方确认有效的prepared产物，不判断失效或持有跨次缓存；这些组合展示Core支持的复用效果，不能等同于当前Reconciler策略或Weave完整阶段命中。不传prepared表示关闭阶段产物复用，背景BoundaryStore和暖态资源保持一致。文字度量无额外Map缓存，使用每code unit宽字号一半的确定性回调；公式固定两个路径、宽10高12深3，不执行真实字体或TeX引擎

Exact/Range的allocation宽度为700，节点旋转30°、margin为上2右4下6左8；Minimum Intrinsic使用7字符英文词。固定视觉宽度为80。规模分别为字符、片段、标签、物理行或变换项，不是批量节点数。每样本只调用一次完整操作，计时包含自身计算与分配，resolve、输入/预期/缓存准备及断言不计时

每项10预热+100正式、110次协议内调用，43项共4730调用、4300正式样本，不含fixture在计时外的预期构造调用。独立手算宽高、行数、锚点位置、标签和公式图元，检查身份、元数据、资源引用及输入不变性；复用跳过哪些计算另经临时计数核实。消费预算在首次采样前固定，同输入各档相同，依据为规划假设，不启用CI阻断、不自动更新回归基线

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/node.bench.ts --fsModuleCache=false
```

正式命令沿用Vite源码加载，用于本机探索；原生ESM报告另记录当前源码叶入口构建、产物external与transform哨兵证据，不能跨加载环境直接计算收益

## Scope 编译与阶段复用

[scope.bench.ts](./compile/scope.bench.ts) 共44项，输入由[_scope-workloads.ts](./_scope-workloads.ts)通过真实resolver、位置上下文与裁剪资源表在计时外准备。测量Scope自身，不递归编译children，不包含Reconciler的依赖追踪、失效判断、排序或输出事务

| 操作           | 输入与复用组合                                                                            | 场景数 | P90警告/错误                                 |
| -------------- | ----------------------------------------------------------------------------------------- | -----: | -------------------------------------------- |
| 完整编译       | rectangle32/1024、circle128，各none/envelope/preparation/placement/layout/all             |     18 | 32项0.1/0.5ms，大档0.5/2ms                   |
| 裁剪编译       | rectangle32、128命令规范裁剪路径，none/clip/layout+clip/all                               |      4 | 0.1/0.5ms                                    |
| 空Scope        | 无layouts、变换或裁剪                                                                     |      1 | 0.1/0.5ms                                    |
| 子布局包络     | rectangle32/1024、circle16/128                                                            |      4 | 小档0.05/0.2ms，大档0.5/2ms                  |
| 放置准备与收尾 | 原点pivot准备、包络pivot最终放置，各3/24项含引用变换                                      |      4 | 0.02/0.1ms                                   |
| 发布布局       | 匿名32/1024子布局、命名单包络1项                                                          |      3 | 匿名小0.05/0.2ms，大0.5/2ms；命名0.01/0.05ms |
| 输出边界投影   | 普通32/1024贡献带shadow，装饰8/128贡献受真实clip裁剪                                      |      4 | 小0.05/0.2ms，大0.5/2ms                      |
| 真实更新       | 移动复用envelope、子布局平移复用preparation、动画收尾复用layout+clip，各完整重算/部分复用 |      6 | 0.1/0.5ms                                    |

固定布局顺序：前两个坐标(110,20)/(-90,20)支撑半径100的最小圆，其余坐标、6×8节点位于内部；节点带左右4、上下2的margin，部分旋转π/6。rectangle的极值由对跖坐标和上下旋转节点共同确定，使用独立角点展开及手算AABB验证；circle同时校验支撑直径与全部角点包含。16/128圆包络用于避免盲目扩大有序最小圆输入，不代表全部分布或复杂度上限

背景BoundaryStore与裁剪资源均在计时外准备为暖态；无prepared只关闭Core阶段复用。各档消费同一最终输入，有效部分产物来自真实编译，all只复用Core自身layout/emit，不代表Weave完整命中。空clip对象是有效无裁剪结果，资源恢复归调用方。动画收尾只复用layout/clip并输出当前动画，移动不复用旧放置，子布局变化不复用旧包络/pivot

一次样本调用一次完整操作。输入、resolve、预期、prepared构造与断言不计时，本操作拥有的循环、矩阵合成、分配和裁剪登记计时。命名发布仅投影1个包络，不将被忽略的子布局标为规模。普通bounds只变换并透传shadow，装饰bounds受clip约束

每项10预热+100正式、110协议调用；每轮4400正式样本、4840调用，两轮8800样本、9680调用；额外fixture准备调用不混算。预算首次采样前固定，是消费规划假设，未取得业务遥测，不启用CI阻断、不更新历史基线

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/scope.bench.ts --fsModuleCache=false
```

此命令使用Vite源码加载；原生ESM报告另记录当前源码叶入口构建、external与transform哨兵、源码/fixture/配置/产物指纹。不同加载环境不得直接比较

## 测量边界

当前覆盖 `src/providers`、`src/resolve`、`src/contract` 的代表操作，以及 `src/compile` 的资源注册表、文本、Scene、共享、Boundary、Reference、Node与Scope操作，不调用 `compileToScene`。shape / arrow / mark 的 iterable 在计时内完整消费，包含该操作自身的计算与分配。

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

## Path 编译与阶段复用

[path.bench.ts](./compile/path.bench.ts) 与 [path-stroke.bench.ts](./compile/path-stroke.bench.ts) 共59个代表场景，fixture集中在[_path-workloads.ts](./_path-workloads.ts)。每个样本执行一次完整Path操作，不通过外包循环累积多个路径；完整编译按同输入的“不复用/各档prepared”成组对照，不再单列无同组基准的reuse操作

| 操作             | 输入与规模                                                                           | 场景数 |
| ---------------- | ------------------------------------------------------------------------------------ | -----: |
| 普通折线对照     | 同一1024步骤输入：none、targets、geometry、layout、stroke、all                       |      6 |
| 断线标签对照     | 同一1024步骤/16标签输入：上述六档，加一半/全部标签测量、标签局部内容、布局与部分绘制 |     10 |
| 组合路径对照     | 同一1024步骤/16标签/16marks/双端箭头输入：上述十档，加marks放置、marks局部内容       |     12 |
| 其它完整编译     | 保留其它17个16/1024步骤或过点的原有输入，仅none，不扩展无实际产物的prepared组合      |     17 |
| 真实更新         | 16步骤换色、1024步骤改单标签/移动末端，各完整重算与有效部分复用                      |      6 |
| 自定义Definition | 8/128叶图元iterable、1024步骤同次两次emitStroke、16步骤派生物化与共享宿主/边界标签   |      4 |
| 目标绑定         | 16/1024真实引用，两端8×8矩形节点，平移坐标系                                         |      2 |
| 独立stroke阶段   | 1024步骤组合输入的layout与emit，绑定/布局在计时外准备                                |      2 |

步骤规模包含move；smooth规模只表示起始游标之后的过点数，实际声明只有move与smooth两步。装饰小档1个、大档16个标签或mark，箭头恒为双端；混合形状每12步重置子路径，圆角每8步有两个独立子路径。自定义iterable包含等量rect/text叶图元，一次性迭代器每次新建并由宿主消费、校验和快照

计时包含目标绑定、几何/采样、标签排版、装饰、provider调用、宿主包装和输出快照。完整编译与目标绑定每次新建真实目标解析器，包含该工厂及窄context组装成本，避免单次绑定缓存跨样本命中。Source resolve、注册表/引用布局、确定性fixture、prepared和独立预期在计时外；BoundaryStore与已登记paint资源保持相同暖态背景，登记查询仍计时。独立layout/emit不包含目标解析器创建；emit直接消费准备好的完整布局

文字使用固定字号10、每UTF-16 code unit宽字号一半的确定性回调，不运行真实字体或TeX引擎。断言独立已知的首尾点、相对/轴向游标、节点裁剪、曲线和闭合命令、标签文本/数量、断口、mark位置、双端箭头、资源引用、派生物化与输入不变性；复用和更新另与同输入完整编译比较最终输出

Core只消费调用方确认有效的prepared，不持有跨次缓存或判断失效。完整emit复用保持配套资源已恢复；换色复用layout，改单标签只保留未变标签及geometry/metrics，移动末端只复用标签排版/局部内容，重新计算目标、几何、断口和标签放置。当前Reconciler调用点未传入这些prepared，结果不能等同于Weave现有命中策略

同输入所有档位使用相同最终声明、资源暖态和预算。geometry含targets与基础几何/metrics；一半/全部标签测量在geometry之上只提供8/16个测量，不提供旧位置；标签局部内容再提供未放置内容。marks放置/局部内容分别在geometry之上提供16个放置、再加16个局部provider内容。drawing提供完整layout、主体和一半标签/marks的已放置图元，不提供完整stroke或Path输出。验证Core返回的原子产物引用确实来自prepared，并核对最终输出等价、prepared及旧结果不变性；不以空对象命名为复用

完整编译的场景ID按输入、规模、复用方式排列，报告维度为操作→输入与规模→中文复用档，确保同输入各档在默认排序中连续。结果验收报告另列三组输入的mean/P90及相对同次none的变化；对照是本次源码探索结果，不当作稳定优化收益或Weave实际命中效果

每场景10次预热、100个正式样本、110次协议内调用；59场景共6490次协议内调用、5900个正式样本。计时外额外执行65次完整编译准备预期（59个fixture各一次，6个更新场景各加一次最终输入），独立stroke两项另各一次目标绑定与provider解析，不将这些准备调用冒充计时样本。旧40场景报告保留为历史记录，不与改组后的完整fixture直接计算回归比例

采样前固定P90警告/错误：普通完整操作0.1/0.5ms，1024步骤或128叶图元复杂操作0.5/2ms；16目标绑定0.05/0.2ms，1024目标绑定0.5/2ms。消费依据、规划频率及限制见[_budgets.ts](./_budgets.ts)，不同复用档采用相同预算，不依复杂度放宽，不启用CI耗时阻断、不自动选择历史基线。沿用Vite源码探索环境，不与原生ESM、浏览器或不同fixture历史报告直接比较

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts benchmarks/compile/path.bench.ts benchmarks/compile/path-stroke.bench.ts --fsModuleCache=false
```

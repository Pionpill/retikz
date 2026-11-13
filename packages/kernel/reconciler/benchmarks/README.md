# Reconciler 全量、增量首屏与增量更新基准

所有入口只放一层 [reconciler/](./reconciler)，用 `full-`、`mount-`、`update-` 前缀分组，每组按 Node / Path / Scope / Scene 拆文件。这里测量从输入到完整 Scene 结果就绪的编译成本，不包含 SVG / Canvas 绘制、DOM、React / Vanilla adapter 或宿主 target。

场景注册和仅供该入口使用的更新配方直接写在 `.bench.ts` 中。`_` 辅助文件只保留跨入口复用的首次编译 workload、执行生命周期和增量对照协议，不为单个入口另建转发层。

## 测量组与计时边界

| 前缀    | 模式与操作                        | 计时包含                                     | 计时外                                               | 数量 |
| ------- | --------------------------------- | -------------------------------------------- | ---------------------------------------------------- | ---: |
| full-   | incremental:false，新会话首次编译 | new SceneReconciler、mount、结果返回         | fixture、断言、逐样本 dispose                        |   89 |
| mount-  | incremental:true，新会话首次编译  | new SceneReconciler、mount、结果返回         | fixture、断言、逐样本 dispose                        |   89 |
| update- | incremental:true，持久会话 update | 批次处理、依赖传播、计算、内部提交、结果返回 | 首次 mount、批次构造/选择、断言、trace、最终 dispose |   96 |

共 274 个计时场景。更新的 `auto` 与强制 `full` 使用独立持久会话，强制全量批次不是关闭增量的首次编译；不使用 replace 冒充增量更新。

首次编译两种模式共用同一配方和选项，每个样本新建会话，不跨样本保留缓存。这里的“首屏”指经过 JIT 预热后的新会话首次 Scene 就绪，不是冷启动或浏览器首次绘制。旧第一轮包含 dispose，ID 与计时边界均已变化，不能直接沿用旧数据作新协议回归基线。

## 首次编译配方

| 域    | 特征                                                                                                                                 | 每种模式用例数 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------: |
| Node  | 无/有 ID；rectangle、ellipse、circle、diamond、6/64边 polygon；16/256字符正文；固定宽度折行；1/8标签；共享/不同渐变                  |             28 |
| Path  | 直线、8/128段折线、cubic、16/256过点 smooth；绝对坐标与节点引用、锚点、跨Scope、ellipse/diamond边界；单/双端箭头；1/8标签与plus mark |             36 |
| Scope | 空Scope、无Scope对照、4/32平级或嵌套Scope、32层继承/平移/旋转缩放、Path/混合内容                                                     |             22 |
| Scene | 两层流程图，100/500/1000节点与1.2倍路径                                                                                              |              3 |

元素专项主体规模为100/1000。连接组另含2N支撑节点，不归因成纯Path耗时；Scope宽/深32对照拥有相同Scope数与叶数量，空Scope档位指容器数，混合内容为N节点＋N路径。Scope没有命名包络或裁剪能力覆盖。

专项使用固定文字度量：字号10时每UTF-16 code unit宽5，高10；不测真实字体或TeX。相同正文会命中本次编译的度量缓存；Circle使用80×80方形约束，其余空节点80×40，不能将耗时差完全归因于shape算法。整体流程图继续采用原有默认文字度量。两种模式之间选项一致。

输入构造和独立断言不进入计时。断言覆盖数量、几何、文字、资源引用、变换和输入不变性。

## 增量更新矩阵

每种变化使用100/1000主体规模，分别测auto和强制full，不做特征排列组合。

| 域    | 变化                                                                            | 配方数 | 计时场景数 |
| ----- | ------------------------------------------------------------------------------- | -----: | ---------: |
| Node  | 单节点填色、位置、尺寸、正文、标签、渐变资源；新对象等值提交                    |      7 |         28 |
| Path  | 单路径描边、8段折线、cubic、箭头、标签、mark、切换引用目标                      |      7 |         28 |
| Scope | 默认填色、平移、旋转缩放、32层继承传播、含10%节点的局部子树插入/删除            |      5 |         20 |
| Scene | 移动节点及连线、连续10%节点批量移动、Scope范围填色、插入/删除节点与连线、空批次 |      5 |         20 |

Node/Scope主体规模为节点数，Path为路径数（引用场景另有2N支撑节点），Scene为节点数（另有N−1条连线）；报告工作量表列出A/B实际作者元素数，包含Scope及支撑节点。Scope属性操作的直接变化元素数为1，不等于受影响后代数。

真实变化按A→B→A反复切换，插入/删除相互配对，不持续增长场景。等值用例每次构造新input对象并提交非空批次；空批次单独列出，不增加revision。二者不作为真实变化的加速收益。

每个更新场景先用非增量模式独立编译A/B作为输出参照，再在独立trace会话验证两个方向，最后建立无trace的计时会话。计时外校验前两轮预热与最后两轮正式样本，验证输出、revision及输入/批次不变性。真实变化的两个Scene结果必须不同，等值和空批次必须相同。

每场景计时更新110次，另有计时外2次独立trace更新和4次首次编译（A/B参照各一次、trace会话一次、计时会话一次）。JSON measurement.calls只计算计时回调调用；工作量来自独立trace，不能冒充计时过程中采集的样本。

## 采样、预算与执行条件

- 固定预热10次、正式100次；共享helper校验110次调用和100个保留样本，显式async:false。最多3个worker并行执行基准文件，每个文件内的场景仍串行；并行文件可能争用CPU与内存资源，本配置结果不直接与此前单worker串行结果比较。
- 首次编译的元素专项P90警告/错误预算：100主体4/8ms，1000主体25/50ms。Scene为100节点8/16.6ms、500节点25/50ms、1000节点50/100ms。两种模式同预算。
- 更新局部/等值/空批次P90预算4/8ms；1000主体的Scope或Scene范围/批量传播25/50ms。auto/full同预算。以上为同步消费规划假设，非已验证业务分布，不因复杂度或实测超限自动放宽。
- 单用例执行时限600秒，与单次操作P90预算独立；此前复杂路径110次执行超过120秒，不能据此减少采样或提高耗时预算。失败报告照常保留。
- 当前使用Vite源码加载，可能有export getter开销，不是原生ESM性能基线。自然GC、执行顺序及本机其它负载可能影响结果；独立策略按auto→full注册，不宣称随机化或ABBA实验。
- 无provenance显式捕获、宿主target或renderer。未显式捕获provenance不表示增量内部没有来源信息维护。
- 跨包测量涉及Reconciler/Core/Foundation/Math，运行时须记录实际源码快照及相关dirty状态，不能只凭Reconciler单包哈希判断整个编译链一致。

## 运行入口

在仓库根目录运行；性能采样需当前任务明确授权。独立运行只生成对应分组，缺失配对的对比列显示“—”，不自动读取其它轮次拼接。

```bash
# 全部274项
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts --fsModuleCache=false

# 关闭增量的首次编译89项
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts full- --fsModuleCache=false

# 开启增量的首次编译89项
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts mount- --fsModuleCache=false

# 持久会话更新96项
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts update- --fsModuleCache=false

# 只比较Node的两种首次编译模式
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts full-node mount-node --fsModuleCache=false
```

## 报告阅读

每轮在包内ignored `_notes/reports/benchmarks/` 创建独立目录，保存中文Markdown和原始JSON，不自动覆盖旧报告或更新回归基线。

主表按测量组→元素域→输入/变化→规模→策略展示均值、P50、P90、P99、预算和执行状态。附表从同一份JSON数据生成：

1. 首次模式对比：非增量/增量首屏的均值、P90、绝对差及倍率。
2. 更新策略对比：auto/full的均值、P90、差值及full/auto倍率。
3. 更新工作量：实际A/B元素数、直接变化元素数、批次操作数及正反向编译元素数。

配对任一侧缺失或失败不计算比值。trace的element-compile数量只表示实际编译工作量，不是遍历总数；不使用reused字段计算命中率。不将两个P90的差值解释为内部阶段耗时。

先通过这些场景判断首屏额外成本、依赖传播范围与少量编译仍耗时的问题；内部函数热点、阶段占比、临时埋点及优化需独立诊断授权。本次结构调整不代表已经运行新协议的性能采样。

# Reconciler 编译性能基准

本目录只测 Core IR 到完整编译结果的计算、组装及 Reconciler 内部事务，不包含 React/Vanilla normalize、SVG/Canvas 绘制、DOM 或真实宿主 target。

## 测量组

| 前缀     | 操作                   | 计时内                                       | 计时外                                            | 场景数 |
| -------- | ---------------------- | -------------------------------------------- | ------------------------------------------------- | -----: |
| full-    | 非增量新会话首次编译   | 创建、mount、返回结果                        | fixture、oracle、校验、逐样本dispose              |    105 |
| mount-   | 增量新会话首次编译     | 创建、mount、返回结果                        | fixture、oracle、校验、逐样本dispose              |    105 |
| replace- | 已挂载会话完整输入替换 | replace、完整重建和内部提交                  | 初始mount、输入准备、校验、dispose                |     12 |
| update-  | 增量持久会话批次更新   | 编辑、依赖传播、计算、完整输出组装、内部提交 | 初始mount、批次准备、oracle、校验、trace、dispose |    245 |

整体共467项，其中10000节点背景扩容有4项参考场景。会话基准在 `reconcile/`，Composite 工作负载独立放在 `composite/`。full表示非增量首次编译；update/.../full表示增量会话的强制全量批次，不是同一操作。

replace单列的原因是完整输入消费方并不自动转成Weave批次。首次编译结果不能代替已挂载完整替换，Weave update成绩也不能推导上层processing已获得同样收益。

## Composite 专项

组件全部在本包基准内定义，不依赖 Standard 或其他 Tier 2 包。每个规模有 8 个首屏场景（两种模式）和 11 个 auto 更新场景（不测强制全量更新）。三个规模共 57 项，计入整体总数。

| 结构            | N 的含义                                                                                | 更新 A ↔ B                                                                   |
| --------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| direct / replay | N 个独立 Cell 实例，分别直接展开或试算后重放；各自产生 artifact                         | 仅改中间实例，或改外部锚点颜色、移动锚点                                     |
| collection      | 一个实例生成 N 个 Scope，每项同时有 Node 和 Path；末项发布 Coordinate，外部 Path 引用它 | 等值替换、中间项改色、中间项改宽并移动后续项；用私有 memo 复用未变的图元声明 |
| layout          | 一个实例执行 N 次 layoutChild 并重放；只有中间节点依赖外部锚点                          | 中间节点改色、外部锚点移动                                                   |

全量首屏和增量首屏都计会话创建至 mount 返回；更新只计持久会话一次 update 至同步提交，不含 renderer。100 / 1000 档每项预热 10 次、正式测量 100 次；10000 档不预热、正式测量 10 次，仅报告。输入准备、全量结果对照及独立 trace 校验不计时。

## 工作负载

- 原有Node：有/无ID、矩形/椭圆/圆/菱形/多边形、正文长度、折行、1/8标签、共享/独立渐变
- 原有Path：直线、8/128段折线、cubic、16/256过点smooth、绝对/引用/锚点/跨Scope连接、箭头/标签/mark
- 路径定位：original/rounded几何上的length mark，位置变化、等值和曲线变化
- 原有Scope：平级/深层、继承、变换、Node/Path混合；Scene为确定性流程图及局部/10%批量/结构更新
- replace：同引用、新对象等值、位置变化，incremental开/关
- 拓扑：单生产者N连线的改色/移动/尺寸变化、中心锚点不变对照、有序坐标链、同批双生产者变化合流
- 结构与名称：头/中部/嵌套插删、重命名并更新引用、别名、命名空间开关、局部遮蔽解除、同目标同批连续修改
- Scope包络：后代尺寸变化后，命名Scope与外部连接共同更新
- Composite：轻量注册定义直接展开、layoutChild+replay；外部改色与移动分别检查复用与失效，包含显式artifacts
- 清洁背景：固定一次改色，100/1000/10000节点，各0/8标签，不将作者数等同输出图元数
- 资源/来源：最后渐变消费者移除、Scope clip更新，provenance开/关配对
- 诊断：N条缺失引用产生的预期诊断，无关节点更新后仍完整恢复并与全量oracle相同

常规规模为100/1000主体。连接场景另外包含支撑节点，Scope含容器，Composite主体指实例；JSON observations保存实际作者元素、输出叶图元、资源、批次及编译条目工作量。编译条目不是访问总数、命中率或内部阶段耗时。

## 正确性与状态

首次编译各样本新建会话。持久更新按A→B→A往返，插入与删除配对，不持续增长；等值提交仍为非空批次，空批次单列。

常规更新用独立非增量完整编译的A/B结果作参照；计时外trace会话核对两个方向。计时会话无trace，校验最初和最终样本，覆盖Scene、artifacts、canonical diagnostics、隔离异常、revision及输入/批次不变性。provenance比较稳定的父子/命名空间关系与发射归属，不比较单次编译的身份对象。

预期无诊断的配方必须断言diagnostics为空。明确的诊断配方只允许与oracle相同的诊断；onWarn抛错会被会话隔离，因此不能用回调抛错代替读取会话diagnostics验收。

10000背景参考档只执行3次被测update，不另做trace更新或同规模oracle重建。初始mount是前置状态；输出数量、颜色、资源、revision和输入不变性用独立已知不变量校验，同配方低规模仍通过完整oracle对照。

## 采样与报告

- 常规档固定10次预热+100次测量，显式async:false；参考档无预热、3次测量。共享helper核对真实调用数及样本数
- 文件串行、一个worker，避免文件间CPU/内存争用；不与旧三worker数据直接作回归判断
- 比较与消费预算统一P50，均值辅助，正文不展示P90/P99；JSON保留原始正式毫秒样本
- auto更新按消费预算验收；update/full仍执行并校验，但只报告，不用预算重分类冒充速度变化。首次full/mount和replace仍有独立消费预算
- 既有预算数值不因指标变化自动调整。新范围传播1000主体采用25/50ms假设；replace按100节点8/16.6ms、1000节点50/100ms规划。参考档仅报告，这些均不是已验证业务分布
- 单项执行时限600秒与单次操作预算分离。失败样本、超时、源码漂移均保留，不将执行通过称为性能达标
- 当前是Vite源码加载探索数据，不是原生ESM或浏览器基线。保留JIT、GC、顺序和本机负载的可比性限制
- 采样前后核对Reconciler/Core/Foundation/Math源码、fixture、配置与lockfile身份；漂移使本轮不能成为基线
- 报告保存在ignored `_notes/reports/benchmarks/`，历史和基线不自动覆盖。模式/策略对比从同一轮配对，不跨轮拼接或把总成本差当某阶段独占耗时

## Weave输入情况专项

weave目录有Coordinate/Node/Path/Scope的同引用、浅等值、嵌套等值、显式默认、真实变化和后续失效，共33项；Context再提供带标签改色、祖先平移、复杂变换下后代移动的1/100/1000规模，共9项。总计42项独立输入情况观察，不合入整体467项预算。

每个样本在计时外重建会话、mount并重放前置步骤，仅测当前一次完整update；与整体持久A/B会话是不同协议，不能直接混比。该专项仍仅报告，缓存行为由功能测试断言，不在性能基准重复建设命中率框架。

源码与配置在运行前后跨包签名，报告保存在ignored `_notes/reports/weave/`。passed只表示执行和正确性通过。

## 执行

性能运行需当前任务明确授权，并在任务专用隔离worktree中串行执行，不与构建、功能测试或其它基准并发。

```bash
# 整体完整编译/首屏/替换/更新
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts --fsModuleCache=false

# 只测 Composite（不包含其它 reconcile / weave 用例）
pnpm bench --workspace packages/kernel/reconciler benchmarks/composite/

# Weave输入情况专项，上一条完成后运行
pnpm --filter @retikz/reconciler bench:weave
```

可用full-、mount-、replace-、update-筛选分组。上层authoring、真实宿主提交与renderer应在所属owner另外评测；异步调度、Worker或渐进绘制等未落地能力不列入当前覆盖。

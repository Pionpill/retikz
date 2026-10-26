# Core Provider 性能基准

## 测量边界

当前只测 `src/providers` 的单次操作，不调用 `compileToScene`。shape / arrow / mark 的 iterable 在计时内完整消费，包含该操作自身的计算与分配。

- Scene 图元生成属于编译计算；SVG 字符串生成、Canvas 绘制、DOM 更新、浏览器布局与绘制均不计入。
- 不接入 `@retikz/render`、React/Vanilla renderer 或浏览器。Runtime / Reconciler 调度、增量更新与生命周期不属于本目录。
- fixture 构造、参数 schema 解析、正确性断言、报告生成及构建均在计时区间外。
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

boundary 的上游 envelope 使用预置值；path 的宿主 emitter 使用固定结果，故这两类分别只反映 fit / gap 与委托开销，不代表几何计算或完整路径编译耗时。短操作可能接近计时及回调开销，结果需谨慎解释。未添加 resolve、compile、parse 或 contract 的独立基准。

复用根目录 `scripts/benchmarks` 的采样与报告工具：预热 10 次、正式采样 100 次；结果保留并在计时外校验。初始仅报告，不设置耗时预算，不据此声明性能达标。

## 运行

在仓库根目录串行执行：

```bash
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts
```

当前配置使用 Vite 源码加载，报告 artifact 为 `vite-source`。原生构建入口在加载 graphic schema 时出现枚举初始化错误，未进入采样；此问题不在 provider 优化范围内。源码结果用于探索，包含开发加载器开销，不能与原生 ESM 基线直接比较。mark 与通用 registry 使用包内入口，不扩大生产公共 API。基准不进入默认功能测试，默认单 worker 串行运行；执行性能采样需得到当前任务的明确授权。

共享 reporter 保存中文 Markdown 与原始 JSON 到已有 ignored 报告目录。可用 `RETIKZ_CORE_BENCH_BASELINE` 指定人工选择的基线、`RETIKZ_CORE_BENCH_RUNNER_ID` 标识运行环境；环境或输入不同的结果不直接比较。

# Reconciler 完整执行与元素专项基准

[full.bench.ts](./reconciler/full.bench.ts) 测量一次 `SceneReconciler` 完整执行，包含实例创建、非增量挂载、结果读取与释放。编译过程覆盖 Core 原子阶段、遍历和输出组装，不收集 provenance。输入为 100 / 500 / 1000 个节点与固定比例路径，fixture 构造和结果检查在计时外。用例 ID 为 `reconciler/full/mixed/<节点数>`；预算、采样与计时范围保持不变，见 [_budgets.ts](./_budgets.ts)。

```bash
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts
```

## 元素专项

新增专项与整体流程图分开注册；各特征采用单项变化，不做维度排列组合。每个主体规模为 100 / 1000，单路径步骤和 Scope 数量另行标记

| 入口                                          | 特征                                                                                                                                                      | 用例数 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -----: |
| [node.bench.ts](./reconciler/node.bench.ts)   | 无 / 有 ID；rectangle、ellipse、circle、diamond、6 / 64 边 polygon；16 / 256 字符正文；固定宽度折行；1 / 8 标签；共享 / 不同渐变                          |     28 |
| [path.bench.ts](./reconciler/path.bench.ts)   | 直线、8 / 128 段折线、cubic、16 / 256 过点 smooth；绝对坐标与节点引用、锚点、跨 Scope、ellipse / diamond 边界；单 / 双端箭头；1 / 8 标签；1 / 8 plus mark |     36 |
| [scope.bench.ts](./reconciler/scope.bench.ts) | 空 Scope、无 Scope 对照、4 / 32 平级或嵌套 Scope、32 层继承 / 平移 / 旋转缩放、Path / 混合内容                                                            |     22 |
| [full.bench.ts](./reconciler/full.bench.ts)   | 保留现有整体流程图                                                                                                                                        |      3 |

共 89 条。连接组每 N 条路径包含 2N 支撑节点，并保留同样节点的绝对坐标对照；不得将总耗时归为纯 Path。Scope 的宽 / 深 32 对照具有相同 Scope 数和叶数量，空 Scope 档位表示容器数；混合内容有 N 节点和 N 路径。Scope 不带 ID，未测命名包络和裁剪等额外能力

每个样本新建协调器并释放，不跨样本复用缓存。专项使用确定性度量：字号 10 时每个 UTF-16 code unit 宽 5，高度 10；不测真实字体或 TeX。正文场景让相同文字命中本次编译自带的度量缓存，这不代表每个节点都调用宿主度量。Circle 使用 80×80 方形约束，其余空节点为 80×40；不能将二者的耗时差全部归为 shape 算法。不同渐变通过不同颜色产生，不依赖可被圆整合并的参数

输入构造与独立断言在计时外；断言覆盖主体 / 文本 / 标签 / mark 数量、路径首尾和命令、shape、箭头、继承色、变换、资源及输入不变性，不额外编译生成期望值。计时含创建、非增量 mount、结果读取与 dispose；不是单节点 / 单路径原子耗时，也不是内部阶段耗时

统一采样预热 10 次、正式 100 次；共享 helper 校验总调用 110 与保留样本 100。专项 P90 警告 / 错误预算为 100 主体元素 4 / 8ms、1000 主体元素 25 / 50ms，基于一次同步刷新规划；假设并非已验证业务数据。同规模各特征使用相同预算，不因复杂度提高阈值；整体保留旧预算，均不启用 CI 耗时阻断

仅运行专项：

```bash
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts benchmarks/reconciler/node.bench.ts benchmarks/reconciler/path.bench.ts benchmarks/reconciler/scope.bench.ts --fsModuleCache=false
```

性能采样需当前任务明确授权，默认串行。报告保存在包内 ignored `_notes/reports/benchmarks/`。当前使用 Vite 源码加载探索，不能与原生 ESM 历史基线直接比较；跨包源码身份需随报告补充。专项结果先定位特征，函数热点与阶段占比另行诊断，不对两个场景的 P90 相减推导阶段耗时。Core 的资源与领域原子基准仍在 [Core benchmarks](../../core/benchmarks/README.md)

# Reconciler 完整编译基准

[full.bench.ts](./compile/full.bench.ts) 测量一次 `SceneReconciler`，包含 Core 原子阶段、遍历和输出组装，不收集 provenance。输入为 100 / 500 / 1000 个节点与固定比例路径，fixture 构造和结果检查在计时外。预算与采样保持原完整编译基准配置，见 [_budgets.ts](./_budgets.ts)。

```bash
pnpm --filter @retikz/reconciler exec vitest bench --run --config vitest.bench.config.ts
```

性能采样须另行授权；本次仅迁移归属，未运行基准或调整预算。Core 的资源与领域原子基准仍在 [Core benchmarks](../../core/benchmarks/README.md)。

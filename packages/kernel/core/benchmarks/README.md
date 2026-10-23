# Core 编译性能基准

## 测量边界

Core **只测编译性能，不处理渲染，到计算完成即结束**。单个计时样本执行一次 `compileToScene(IR, options)`，包含该次调用拥有的解析、布局、几何计算、资源与 Scene 组装，返回编译结果后停止计时。

- Scene 图元生成属于编译计算；SVG 字符串生成、Canvas 绘制、DOM 更新、浏览器布局与绘制均不计入。
- 不接入 `@retikz/render`、React/Vanilla renderer 或浏览器。Runtime / Reconciler 调度、增量更新与生命周期不属于本目录。
- IR fixture 构造、结果遍历、正确性断言、报告生成及构建均在计时区间外。
- 后续文本场景使用确定性的预置测量输入或纯计算测量器，不引入 DOM / Canvas 字体测量。

## 当前范围

当前仅初始化基准配置与测量边界，不包含性能用例。后续按用户要求逐个添加用例，不预先扩展场景或规模。

复用根目录 `scripts/benchmarks` 的采样与报告工具：预热 10 次、正式采样 100 次；结果保留并在计时外校验。初始仅报告，不设置耗时预算，不据此声明性能达标。

## 运行

添加用例后，在仓库根目录串行执行；先从当前源码构建 Core 及其依赖，避免使用旧产物：

```bash
pnpm --filter @retikz/core... build
pnpm --filter @retikz/core exec vitest bench --run --config vitest.bench.config.ts
```

基准通过独立配置使用原生 ESM 构建产物，不进入默认功能测试。运行前确认没有并行构建或测试；执行性能采样需得到当前任务的明确授权。

共享 reporter 保存中文 Markdown 与原始 JSON 到已有 ignored 报告目录。可用 `RETIKZ_CORE_BENCH_BASELINE` 指定人工选择的基线、`RETIKZ_CORE_BENCH_RUNNER_ID` 标识运行环境；环境或输入不同的结果不直接比较。

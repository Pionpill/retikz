# @retikz/bench

Kernel 开发使用的 private 性能基准工具，不发布 npm 包。

- `pnpm dev:bench`：启动 React Performance Lab，供开发者本机 Inspect、Compare 与 Measure
- `pnpm bench:install-browser`：安装 lockfile 对应的 Chromium build
- `pnpm bench:check`：只读检查确定性预算与功能 oracle，不采集 timing runner 硬件环境
- `pnpm bench:report`：在固定 Node / Chromium 环境生成 ignored wall-clock 报告
- `pnpm bench:report -- --compare-timing-baseline`：仅在完整 fingerprint 匹配时执行 tracked timing gate；不匹配会明确输出 `timing gate skipped`并以非零退出
- `pnpm bench:update-baseline`：生成 ignored deterministic / timing baseline 候选，供人工审查后显式提交

Bench 开发服务默认使用端口 `6003`。每个 clone / worktree 可在被 Git 忽略的 `apps/bench/.env.local` 中通过 `RETIKZ_BENCH_PORT` 固定本地端口；进程环境变量优先于本地文件。开发服务与 browser runner 共用该配置，端口占用时不会自动递增。

固定环境声明在 `environment.json`。已审查的确定性基线保存在 `baselines/deterministic.json`，按完整环境 fingerprint 区分的 wall-clock 基线保存在 `baselines/timing/`；`results/` 只存 ignored 报告和待人工审查的候选，不作为正式门禁输入。

`bench:report` 与 `bench:update-baseline` 进入 timing 路径时才采集 runner 环境，并在同次命令及重跑中复用。完整 fingerprint 覆盖 expected Playwright、采样、viewport 等配置、实际 Node 与 browser 环境，以及 runner 的 identity、平台、架构、CPU model 集合、逻辑处理器数和总内存；browser 侧另记录 `hardwareConcurrency`。CI 或固定基准机应通过 `RETIKZ_BENCH_RUNNER_ID` 提供稳定 identity，未配置或只含空白时回退到 hostname。timing 路径任一必需硬件字段不可用都会 fail-loud，避免不同机器共享绝对 wall-clock baseline。

SVG与Canvas在真实Chromium中执行，Canvas oracle来自完整像素摘要；dispose预算还通过真实listener、handler、hit-test与image handler探针冻结`liveHandles=0`。timing candidate只收录ADR-05的12个tracked 5000场景，100/1000与direct full仅留在ignored report。median / p95使用tracked baseline `1.20×`护栏，update另与同次、同Runtime生命周期及同renderer factory的full p95比较；max超`2.00×`时只完整重跑一次，第二次fingerprint漂移会skip并以非零退出，连续两次unstable才阻断。

## Runtime policy A/B

SVG与Canvas各用同一5000实体fixture运行`static-full`、`retained-full`与`retained-auto`。三路都与独立full oracle对账；deterministic baseline额外冻结`execution`，其中static的`full`来自公共view mode，retained的`full`或`incremental`来自Runtime/Core/Render trace，漏报或重复outcome都会失败。

同名三组wall-clock场景只写入ignored report，便于开发者在同一机器手动比较Session开销、forced full和增量更新；它们不在`relativeGuards`内，也不修改tracked timing baseline。只有收集稳定样本并经独立审查后，才能另行批准进入timing gate。

## Performance Lab

根页面是面向开发者的交互式实验环境，首版聚焦 Kernel 当前的 `static-full`、`retained-full` 与 `retained-auto`。Inspect 会在真实 SVG / Canvas host 中执行所选策略，展示 Runtime trace、Scene Patch、diagnostics 与确定性工作量；Compare / Measure 使用同一 fixture 完成采样后再刷新图表，避免 React 重绘进入计时窗口。首版 Lab 尚未接入 runner 使用的生命周期探针，界面会明确显示该证据不可用，不会推断 mount、dispose 或 live handles 状态。

工作台参考 shadcn `sidebar-07` 组织模块、测试集、配置、预览与报告。Sidebar、Dropdown Menu、Sheet、Select、Tooltip 等基础组件由 shadcn CLI 下载到 Bench 自己的 `src/playground/components/ui`，业务组件只组合这些官方 vendored 原语。React Router 为 Kernel / Plot / Table 提供固定的 `/kernel`、`/plot`、`/table` 一级入口，左侧模块切换器直接导航对应路由；Header 提供高频运行配置，低频采样和环境信息收进详细配置 Sheet；运行成功后，结果在预览右侧作为可关闭、可重新打开的持久报告展示。首版只有 Kernel 测试集可运行，Plot 与 Table 可进入独立占位工作区但不会调用 Kernel runner。

界面沿用 `apps/docs` 的本地偏好方案：`react-i18next` 提供中文 / 英文，Zustand 持久化 light / dark 主题并把 `.dark` 同步到 `<html>`。Bench 使用独立的 `retikz-bench-lang` 与 `retikz-bench-theme` 存储键，不与文档站偏好互相覆盖。

报告中的策略对比图由 `@retikz/plot-react` 经 Plot lowering、Core 与 SVG renderer 绘制，Bench 不引入平行图表库。页面中的 wall-clock 数据只用于本机探索，不可替代固定环境报告，也不能写 tracked baseline。Playwright 正式 runner 使用独立的 `/runner.html`，因此 React、Tailwind、Plot 与面板 DOM 不会进入现有 timing 测量页面。确定性门禁仍以 `pnpm bench:check` 为准。

## Source boundaries

`src/benchmark`只负责 CLI、Playwright 调度与无界面的 browser benchmark 入口；`src/playground`只负责 React、shadcn、国际化、主题与可视化观测；`src/shared`保存两边共用的场景、测量、报告和 browser runtime 原语。Benchmark 与 Playground 只能依赖 Shared，不能互相导入。

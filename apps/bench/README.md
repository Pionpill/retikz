# @retikz/bench

Kernel 开发使用的 private 性能基准工具，不发布 npm 包。

- `pnpm bench:install-browser`：安装 lockfile 对应的 Chromium build
- `pnpm bench:check`：只读检查确定性预算与功能 oracle，不采集 timing runner 硬件环境
- `pnpm bench:report`：在固定 Node / Chromium 环境生成 ignored wall-clock 报告
- `pnpm bench:report -- --compare-timing-baseline`：仅在完整 fingerprint 匹配时执行 tracked timing gate；不匹配会明确输出 `timing gate skipped`并以非零退出
- `pnpm bench:update-baseline`：生成 ignored deterministic / timing baseline 候选，供人工审查后显式提交

固定环境声明在 `bench-environment.json`。`bench:report`与`bench:update-baseline`进入timing路径时才采集runner环境，并在同次命令及重跑中复用。完整 fingerprint覆盖expected Playwright/采样/viewport等配置、实际Node与browser环境，以及runner的identity、平台、架构、CPU model集合、逻辑处理器数和总内存；browser侧另记录`hardwareConcurrency`。CI或固定基准机应通过`RETIKZ_BENCH_RUNNER_ID`提供稳定identity，未配置或只含空白时回退到hostname。timing路径任一必需硬件字段不可用都会fail-loud，避免不同机器共享绝对wall-clock baseline。

SVG与Canvas在真实Chromium中执行，Canvas oracle来自完整像素摘要；dispose预算还通过真实listener、handler、hit-test与image handler探针冻结`liveHandles=0`。timing candidate只收录ADR-05的12个tracked 5000场景，100/1000与direct full仅留在ignored report。median / p95使用tracked baseline `1.20×`护栏，update另与同次、同Runtime生命周期及同renderer factory的full p95比较；max超`2.00×`时只完整重跑一次，第二次fingerprint漂移会skip并以非零退出，连续两次unstable才阻断。

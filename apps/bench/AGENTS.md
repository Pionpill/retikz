# @retikz/bench 工作指南

`@retikz/bench` 是 private app，只承载可复现性能 fixture、确定性预算和固定环境 wall-clock 报告，不发布 npm 包。

- 产品包提供 trace contract 与计数点；bench 只消费公共入口，不复制产品私有类型
- `bench:check` 只读 baseline，只以确定性工作量与功能 oracle 阻断
- `bench:report` 只写 ignored 时间报告，环境 fingerprint 不一致时不得比较
- `bench:update-baseline` 只生成 ignored 候选，不直接修改已审查 baseline
- 浏览器服务使用 `72xx`，缺省为 next 槽位的 `7201`；每个 clone / worktree 通过仓库根目录被忽略的 `.env.local` 配置 `RETIKZ_DEV_SLOT`，需要时可用 `RETIKZ_BENCH_PORT` 精确覆盖
- 浏览器服务固定端口并设置 `strictPort: true`、`open: false`
- 新 fixture identity 必须稳定，不使用 `Math.random()` 或当前时间构造输入

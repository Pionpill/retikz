# @retikz/bench

Kernel 开发使用的 private 性能基准工具，不发布 npm 包。

- `pnpm bench:install-browser`：安装 lockfile 对应的 Chromium build
- `pnpm bench:check`：只读检查确定性预算与功能 oracle
- `pnpm bench:report`：在固定 Node / Chromium 环境生成 ignored wall-clock 报告
- `pnpm bench:update-baseline`：生成 ignored baseline 候选，供人工审查

固定环境声明在 `bench-environment.json`。SVG 与 Canvas 在真实 Chromium 中执行，Canvas oracle 来自完整像素摘要；只有环境 fingerprint 完全相同的时间报告才可比较。

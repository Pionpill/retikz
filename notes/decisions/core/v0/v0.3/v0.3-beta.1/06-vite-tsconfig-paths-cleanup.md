# ADR-06：Vite tsconfig paths 原生化与依赖清理——先确认 Vite 8 原生选项可用，再统一替换 7 处 `vite-tsconfig-paths`

- 状态：Accepted
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) TODO-6

## 背景

测试输出提示：Vite 已原生支持 tsconfig paths resolution，可用原生选项替代 `vite-tsconfig-paths` 插件。封版前适合清掉这类不再必要的工程依赖，减噪、减维护面。

现状核对（避免按陈旧假设动手）：

- catalog 里 **Vite 已是 `^8.0.10`**——本条**不是 Vite 版本升级**，是「在已有的 Vite 8 上把插件换成原生选项」。
- `vite-tsconfig-paths: ^6.1.1` 被 **7 个 workspace** 的 `vite.config.ts` 使用：`packages/core/{core,render,react,vanilla}` + `packages/plot/{plot,react,vanilla}`。
- 这些 config 同时挂 `vite-plugin-dts`（产 `.d.ts`）——**本条不碰 dts**，只动 tsconfigPaths 这一项。
- tsconfigPaths 在这些 config 里同时服务两条路径：**build**（cross-package / 内部 alias 解析）与 **vitest test**（`@retikz/*` 跨包导入解析）。替换后两条都要继续工作。

## 决策：分两步、可回退

### 第一步：确认 Vite 8 原生选项确实可用且等价

落地前先验证 Vite 8 是否**稳定暴露** tsconfig paths 的原生解析选项（如 `resolve.tsconfigPaths` 或等价配置），并确认它对本仓的 `paths` 映射、子路径导入、vitest 解析行为与现插件**等价**。这一步是 gate——原生选项不稳定/不等价则不强推（见风险）。

### 第二步：7 处统一替换 + 移除依赖

- 在 7 个 `vite.config.ts` 里把 `tsconfigPaths()` 插件替换为 Vite 原生配置；**保留 `dts(...)` 不动**。
- 从 catalog 与各 `package.json` devDependencies 移除 `vite-tsconfig-paths`，更新 lockfile。
- **统一处理**——要么 7 处全换，要么全不换，不留「部分包仍加载旧插件、部分用原生」的混合态（否则 monorepo 解析行为分叉，更难维护）。

理由：

1. **不是版本升级、是配置收口**——Vite 已 8，风险面只在「插件 → 原生选项」的等价性，不牵动构建系统本体。
2. **统一性 > 局部清理**——7 包共用一致解析策略，混合态的隐性分叉比留着插件更糟。
3. **gate 在前、可回退**——原生选项不达标就停在第一步，不为「清依赖」牺牲解析正确性。

## 影响范围

- `pnpm-workspace.yaml`（catalog 移除 `vite-tsconfig-paths`）
- `packages/core/{core,render,react,vanilla}/vite.config.ts`
- `packages/plot/{plot,react,vanilla}/vite.config.ts`
- 各包 `package.json`（devDependencies）
- `pnpm-lock.yaml`

## 非目标

- 不借机重构整个构建系统 / rollup 输出策略。
- 不动 `vite-plugin-dts` 及 dts 产出。
- 不升级 Vite 大版本（已在 8）。
- 不切换测试框架（仍 vitest）。
- 不用会 emit 的 `tsc` / `tsc -b` 作类型检查方案（全仓硬规则）。

## 测试要求

- core / render / react / vanilla / plot×3 / docs 的 vitest 全绿（重点验证 `@retikz/*` 跨包导入解析未回归）。
- 受影响 library workspace 的 `vite build` 产物正常（cross-package alias 仍解析）。`apps/docs` 的 `build` 脚本当前包含 `tsc -b`，不作为本 ADR 的类型检查/验证命令；docs 侧以 `test:run`、dev server 冒烟和后续按规范改造后的非 emit 类型检查为准。
- 受影响 workspace 的 lint / `tsc --noEmit` 通过。
- 测试输出不再出现 `vite-tsconfig-paths` 相关提示。

## 风险

- Vite 原生 tsconfig paths 选项的**形态与稳定性与具体 Vite 8.x 子版本相关**；若原生选项在当前子版本不稳定或对本仓 `paths` 映射不等价，应停在第一步：仅消除提示噪音 / 锁定行为，**保留插件**，把「原生化」推迟到后续，不为清依赖引入解析风险。
- 7 处替换若行为出现分叉（某包测试解析失败），优先回退该包到插件、定位差异，而非全仓硬上。

> 实现指针：原生选项的确切配置键以落地时的 Vite 8.x 文档/类型为准；本 ADR 不钉具体 API 名。

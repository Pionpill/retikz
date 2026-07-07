---
name: package-publish
description: '发布或准备发布 retikz npm 包时使用。覆盖版本号 bump、结构化 changelog、roadmap 状态、验证、dry-run、tag / npm publish / push 授权、发版前 ADR 检查与预 bump。当前发布组以 scripts/release-groups.config.mjs 为准。'
---

# 发布 retikz 包

本 skill 用于 npm 发版。风险点是版本号、git tag、npm artifact、docs changelog、roadmap 必须可追溯一致。

## 硬门槛

- 先读根 `AGENTS.md`。commit、tag、push、npm publish 都必须拿到当前对话明确授权。
- 不替用户猜目标版本。版本号、发布组或 changelog 范围不清楚时先问。
- 目标版本必须先写入仓库、验证并提交，再 tag / publish。
- 必须按 npm registry 校验版本连续性；不要把仓库里的预 bump 开发版本当成已发布版本。
- `npm view` / login / dry-run / publish 都显式使用 `--registry https://registry.npmjs.org/`。

## 发布组

发布组真源是 `scripts/release-groups.config.mjs`。每个可发布包的 `package.json` 必须声明 `retikz.domain`、`retikz.releaseGroup`、`retikz.layer`、`retikz.publishable`。若下表、skill 文本与配置或 manifest 不一致，先修配置 / manifest / skill 并运行 `pnpm run check:release-groups`。

| 组     | 包                                                                                                  | 发布顺序                                          | tag               |
| ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------- |
| kernel | `@retikz/math`, `@retikz/core`, `@retikz/render`, `@retikz/vanilla`, `@retikz/react`, `@retikz/tex` | math -> core -> render -> vanilla -> react -> tex | `v<version>`      |
| data   | `@retikz/data`                                                                                      | data                                              | `data-v<version>` |
| plot   | `@retikz/plot`, `@retikz/plot-vanilla`, `@retikz/plot-react`                                        | plot -> plot-vanilla -> plot-react                | `plot-v<version>` |

不发布：`@retikz/docs`、`@retikz/eval` 是 private app。

同组 lockstep：同组所有 publishable package 必须写同一个 version 并同次发布。不同发布组版本线独立。目录只表达 domain，不表达发布组；例如 `packages/viz/data` 与 `packages/viz/plot` 同属 viz 领域，但发布组独立。

依赖范围表达版本耦合：

- 同发布组内部依赖用 `workspace:*`，发布时应解析为同组目标版本。
- 跨发布组内部依赖用 `workspace:^`，发布时应解析为兼容范围；只有依赖组发生不兼容变化且当前组需要适配时，才同时发布消费组。
- 功能发布组不能依赖其他功能发布组；共享能力应下沉到 `@retikz/data`、`@retikz/core` 或 `@retikz/math`。

## 输入确认

改文件前先向用户确认：

- 发布组：`kernel` / `data` / `plot`；
- 目标版本、npm dist-tag、git tag；
- 包列表与每个包的 `old -> target`；
- `apps/docs/src/modules/docs/data/changelog.ts` 的 release note 范围；
- 是否需要同步 module badge 或 roadmap milestone 状态。

## 版本连续性

定版本前查锚点包：

```bash
npm view @retikz/core versions --registry=https://registry.npmjs.org/
npm view @retikz/core dist-tags --registry=https://registry.npmjs.org/
npm view @retikz/data versions --registry=https://registry.npmjs.org/
npm view @retikz/data dist-tags --registry=https://registry.npmjs.org/
npm view @retikz/plot versions --registry=https://registry.npmjs.org/
npm view @retikz/plot dist-tags --registry=https://registry.npmjs.org/
```

规则：

- 同一 prerelease channel 只能 `alpha.N -> alpha.(N+1)` 这样递增 1。
- 升段从 `.1` 开始：`alpha.N -> beta.1`、`beta.N -> rc.1`、`rc.N -> stable`。
- 重发、回退、跳号必须停下让用户确认。
- alpha 用 `--tag alpha`；beta 用 `--tag beta`；rc 用 `--tag next`；stable 不带 prerelease dist-tag。

## 工作区改动

只做发布准备相关改动：

1. **包版本号**：发布组内每个包都改到目标版本。
2. **changelog 数据**：更新 `apps/docs/src/modules/docs/data/changelog.ts`，结构以 `apps/docs/src/modules/docs/data/types.ts` 为准；不要改旧 changelog MDX。
3. **模块徽章**：只有可见模块版本变化时才改 `apps/docs/src/modules/docs/data/module.ts`，例如 minor / major 切档或 alpha -> beta -> rc -> stable。
4. **roadmap**：按发布组当前 roadmap 的既有格式更新。
5. **ADR 检查**：确认本次发版覆盖的已完成 ADR 已在 `develop-wrapup` 阶段压缩并置为 `Accepted`；发现未压缩 ADR 时停下，先走 wrapup 修正。
6. **lockfile**：package metadata 或依赖图变化导致 lockfile 漂移时，运行 `pnpm install`。

Changelog 规则：

- zh 是 source of truth，en 结构同步。
- `PackageBlock.pkg` 必须来自 `PACKAGE_IDS`。
- 写用户可见行为、迁移说明、包级 release highlight。内部 docs / ADR / AGENTS 改动通常不进 npm changelog，除非影响用户入口或迁移说明。
- 保持既有排序约定：新 release / subVersion 在前。

## 验证

发版验证比日常局部改动更宽；任一步失败就停。

给用户申请授权前至少跑：

```bash
pnpm run check:full
pnpm run check:release-groups
pnpm run test:full
pnpm run build
```

然后按发布顺序 dry-run 发布组内每个包：

```bash
pnpm --filter @retikz/core publish --dry-run --no-git-checks --access public --tag <tag> --registry https://registry.npmjs.org/
```

逐包检查 dry-run 输出：

- tarball 只包含 `dist/`、`LICENSE`、`README.md`、`package.json`；
- `workspace:*` 依赖已解析为确切版本，`workspace:^` 依赖已解析为兼容范围；
- package name 和 version 正确；
- publishable 包没有 `"private": true`；
- 没有 `.js`、`.d.ts`、`.d.ts.map` 泄漏到 `packages/*/*/src`。

辅助检查：

```bash
rg '"private": true' packages/*/*/package.json
rg --files packages | rg 'packages/.*/src/.*\.(d\.ts|d\.ts\.map|js)$'
```

## 授权暂停点

验证后必须停下，向用户展示：

- 改动文件；
- 验证结果；
- 每个包的 dry-run 摘要；
- 目标版本、npm dist-tag、git tag；
- 需要授权的下一步：只 commit，还是 commit + tag + publish + push。

没有当前对话明确授权，不继续执行。

## Commit / Tag / Publish

获得授权后：

1. 只 stage 发布准备文件。
2. 按根 AGENTS 的 commit 格式提交，常用 `🔖 <scope>: 发布 <version>` 或 `🔖 <scope>: 准备发布 <version>`。
3. 确认 HEAD 中发布组每个包都是目标版本。
4. 确认 `git status --short` 没有意外发布文件改动。
5. 创建 tag：kernel 用 `v<version>`，data 用 `data-v<version>`，plot 用 `plot-v<version>`。
6. 确认 npm 登录：`npm whoami --registry=https://registry.npmjs.org/`。
7. 按组内顺序发布：

```bash
pnpm --filter @retikz/<pkg> publish --access public --tag <tag> --no-git-checks --registry https://registry.npmjs.org/
```

若 npm 要 OTP，加 `--otp=<code>`。OTP 时效短；遇到 `EOTP` 就停下要新码。部分包已发成功后，重试前先 `npm view <pkg>@<version>`，跳过已发布包。

8. publish 成功后再 push commit 和 tag，除非用户明确要求其它顺序。

不要手动合并 branch-sync PR；分支同步由 GitHub Actions 处理。

## 发布后

发布成功后：

1. 汇报 npm 包 URL、git tag、push 状态和安装命令。
2. 只有 roadmap 明确写出下一开发版本时，才把本发布组预 bump 到下一开发版本；不明确就问用户。这是独立工作区改动，需要单独提交授权。

## 快速清单

- [ ] 目标版本、发布组、dist-tag、git tag 已确认。
- [ ] 已按 npm registry 校验版本连续性。
- [ ] `scripts/release-groups.config.mjs`、`package.json` 的 `retikz` 元信息和目标发布组一致。
- [ ] 发布组内包版本全部等于目标版本。
- [ ] 用户可见行为变化已更新 `changelog.ts`。
- [ ] 只有需要改变可见徽章时才更新 `module.ts`。
- [ ] roadmap 已按既有格式更新。
- [ ] 发版范围内已完成 ADR 已压缩并为 `Accepted`。
- [ ] lockfile 可能漂移时已跑 `pnpm install`。
- [ ] `pnpm run check:full` 通过。
- [ ] `pnpm run check:release-groups` 通过。
- [ ] `pnpm run test:full` 通过。
- [ ] `pnpm run build` 通过。
- [ ] 发布组内每个包 dry-run 通过。
- [ ] 已检查 tarball、`workspace:*` 精确版本解析和 `workspace:^` 兼容范围解析。
- [ ] 当前对话已授权 commit / tag / publish / push。
- [ ] tag 前已确认 HEAD 版本。
- [ ] npm publish 使用官方 registry。
- [ ] 已完成发布后汇报。

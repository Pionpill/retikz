---
name: package-publish
description: 'Use when 发布或准备发布 retikz npm 包、核对发布版本与 git tag，或执行 alpha、beta、rc、stable 发版'
---

# 发布 retikz 包

本 skill 用于 npm 发版。风险点是版本号、git tag、npm artifact、docs changelog、roadmap 必须可追溯一致。

## 硬门槛

- 先读根 `AGENTS.md`。commit、tag、push、npm publish 都必须拿到当前对话明确授权。
- 不替用户猜目标版本。版本号、发布组或 changelog 范围不清楚时先问。
- 目标版本必须先写入仓库、验证并提交，再 tag / publish。
- 必须按 npm registry 校验版本连续性；不要把仓库里的预 bump 开发版本当成已发布版本。
- ADR 长期一致性审计是所有发布组不可跳过的前置门槛；必须逐篇阅读全文，不得以状态字段、roadmap 勾选或 commit message 代替。
- `npm view` / login / dry-run / publish，以及验证真实用户依赖闭包的 `pnpm install`，都显式使用 `--registry https://registry.npmjs.org/`；不得继承用户级镜像 registry。

## 发布组

发布组真源是 `scripts/release-groups.config.mjs`。每个可发布包的 `package.json` 必须声明 `retikz.domain`、`retikz.releaseGroup`、`retikz.layer`、`retikz.publishable`。若下表、skill 文本与配置或 manifest 不一致，先修配置 / manifest / skill 并运行 `pnpm run check:release-groups`。

| 发布单元 | 包                                                                                                                                                              | 发布顺序                                                                              | tag                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------- |
| kernel   | `@retikz/foundation`, `@retikz/math`, `@retikz/runtime`, `@retikz/core`, `@retikz/inspect`, `@retikz/render`, `@retikz/react`, `@retikz/vanilla`, `@retikz/tex` | foundation -> math -> runtime -> core -> inspect -> render -> react -> vanilla -> tex | `kernel-v<version>`   |
| layout   | `@retikz/layout`, `@retikz/layout-react`, `@retikz/layout-vanilla`                                                                                              | layout -> layout-react -> layout-vanilla                                              | `layout-v<version>`   |
| standard | `@retikz/standard`, `@retikz/standard-react`, `@retikz/standard-vanilla`                                                                                        | standard -> standard-react -> standard-vanilla                                        | `standard-v<version>` |
| graph    | `@retikz/graph`, `@retikz/graph-react`, `@retikz/graph-vanilla`                                                                                                 | graph -> graph-react -> graph-vanilla                                                 | `graph-v<version>`    |
| diagram  | `@retikz/diagram`, `@retikz/diagram-react`, `@retikz/diagram-vanilla`                                                                                           | diagram -> diagram-react -> diagram-vanilla                                           | `diagram-v<version>`  |
| data     | `@retikz/data`                                                                                                                                                  | data                                                                                  | `data-v<version>`     |
| plot     | `@retikz/plot`, `@retikz/plot-react`, `@retikz/plot-vanilla`                                                                                                    | plot -> plot-react -> plot-vanilla                                                    | `plot-v<version>`     |
| chart    | `@retikz/chart`, `@retikz/chart-react`, `@retikz/chart-vanilla`                                                                                                 | chart -> chart-react -> chart-vanilla                                                 | `chart-v<version>`    |
| table    | `@retikz/table`, `@retikz/table-react`, `@retikz/table-vanilla`                                                                                                 | table -> table-react -> table-vanilla                                                 | `table-v<version>`    |

不发布：`@retikz/docs`、`@retikz/eval` 是 private app。

Kernel 是统一发布单元：九个 publishable package 必须写同一个 version，按表中顺序一次性全部发布，不得拆包、漏包或为单个 Kernel 包单独发版。

其他发布单元仍按配置 lockstep：主包及其 React / Vanilla 适配包必须写同一个 version 并同次发布。不同发布单元版本线独立。目录只表达 domain，不表达发布单元；例如 `packages/viz/data` 与 `packages/viz/plot` 同属 viz 领域，但分别发布。

## Git tag 规范

- Kernel 统一使用 `kernel-v<version>`，九个 Kernel 包共享一个 tag。
- 其他发布单元使用主包名作为 tag 前缀：去掉 `@retikz/` scope 后写成 `<main-package>-v<version>`，例如 Plot 使用 `plot-v<version>`、Standard 使用 `standard-v<version>`。不得再叠加 domain 或其他分组前缀。
- 主包及其 React / Vanilla 适配包共享一个 tag；不得为 `plot-react`、`plot-vanilla` 等适配包分别打 tag。
- tag 必须对应 `scripts/release-groups.config.mjs` 中完整的发布单元；只有 `pnpm run check:release-groups` 通过后才能创建。
- 历史 Kernel 裸 `v<version>` tag 保持原样，不得迁移或补打同版本前缀 tag；新版本从本规范生效后改用 `kernel-v<version>`。
- 必须创建 annotated tag：`git tag -a <tag-prefix>-v<version> -m "<tag-prefix> <version>"`，不得创建 lightweight tag。
- tag 只指向已提交且工作树干净的发布提交；创建前确认组内版本、npm registry 连续性，以及本地和远端均不存在同名 tag。
- 已发布 tag 不得移动、复用、删除或强制覆盖；tag 名冲突时停止并让用户决定新版本。
- 汇报 tag 状态时必须分别说明本地是否存在、远端是否存在和各自指向；“本地已创建”不等于“已 push”。
- 创建 tag 与 push tag 分别获取授权；默认在 npm publish 全部成功后才 push commit 和 tag。

依赖范围表达版本耦合：

- 同发布组内部依赖用 `workspace:*`，发布时应解析为同组目标版本。
- 跨发布组内部依赖用 `workspace:^`，发布时应解析为兼容范围；只有依赖组发生不兼容变化且当前组需要适配时，才同时发布消费组。
- 功能发布组不能依赖其他功能发布组；共享能力应下沉到 `@retikz/data`、`@retikz/core` 或 `@retikz/math`。

## 输入确认

改文件前先向用户确认：

- 发布单元：以 `scripts/release-groups.config.mjs` 为准；
- 目标版本、npm dist-tag，以及按 Kernel 特例或主包名规则推导的 git tag；
- 包列表与每个包的 `old -> target`；
- `apps/docs/src/modules/docs/data/changelog/*.ts` 中对应 release 文件的 note 范围；
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
npm view @retikz/table versions --registry=https://registry.npmjs.org/
npm view @retikz/table dist-tags --registry=https://registry.npmjs.org/
npm view @retikz/standard versions --registry=https://registry.npmjs.org/
npm view @retikz/standard dist-tags --registry=https://registry.npmjs.org/
```

规则：

- 同一 prerelease channel 只能 `alpha.N -> alpha.(N+1)` 这样递增 1。
- 升段从 `.1` 开始：`alpha.N -> beta.1`、`beta.N -> rc.1`、`rc.N -> stable`。
- 重发、回退、跳号必须停下让用户确认。
- alpha 用 `--tag alpha`；beta 用 `--tag beta`；rc 用 `--tag next`；stable 不带 prerelease dist-tag。

## 工作区改动

只做发布准备相关改动：

1. **包版本号**：发布组内每个包都改到目标版本。
2. **changelog 数据**：更新 `apps/docs/src/modules/docs/data/changelog/*.ts` 中对应 release 文件，结构以 `apps/docs/src/modules/docs/data/types.ts` 为准；不要改旧 changelog MDX。
3. **模块徽章**：只有可见模块版本变化时才改 `apps/docs/src/modules/docs/data/module.ts`，例如 minor / major 切档或 alpha -> beta -> rc -> stable。
4. **roadmap**：按发布组当前 roadmap 的既有格式更新。
5. **ADR 检查**：按下方“ADR 长期一致性门禁”逐篇审计本次 milestone 的全部 ADR；发现混入施工细节、状态错误或契约不一致时停下，先走 `develop-wrapup` 修正。
6. **lockfile**：package metadata 或依赖图变化导致 lockfile 漂移时，运行 `pnpm install`。

### ADR 长期一致性门禁

全仓验证和 dry-run 前必须完成，适用于 kernel / data / plot / table / standard 全部发布组：

1. 从本次 milestone roadmap 枚举全部 ADR，并逐篇阅读全文。
2. 按 `develop-wrapup` 的“ADR 长期一致性”标准检查：ADR 从 Proposed 起只保留背景与目标、核心决策、基础数据结构 / 公开契约、行为、失败语义、兼容性和最终结果；功能与包边界、能力完备性、同类设计、被否决方案、测试策略和非目标属于 ignored plan，不得只检查状态、文件长度、roadmap 或提交说明。
3. 最终生效 ADR 必须为 `Accepted`；被替代记录必须为 `Superseded`，并明确链接替代 ADR 与被替代原因。
4. 对账 ADR 中的公开契约、类型示例、兼容性与最终实现、changelog、docs；任一陈旧描述都算阻断。
5. 确认设计检查材料、具体文件、私有命名、业务步骤、测试 case / 路径 / 命令、commit 切分和 review 记录没有留在 ADR；这些内容只属于 ignored plan，不要求在发布时提交或恢复。
6. 向用户逐篇汇报 ADR、状态、长期形态、契约一致性与结论。任一项未通过时停止发布流程，不进入全仓门禁、dry-run、commit、tag 或 publish。

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
pnpm run test:publish-artifacts
```

然后按发布顺序 dry-run 发布组内每个包：

```bash
pnpm --filter @retikz/core publish --dry-run --no-git-checks --access public --tag <tag> --registry https://registry.npmjs.org/
```

冻结目标 tarball 后，必须额外验证真实用户依赖闭包：只把本次目标包 override 到 frozen exact tarball，其余 `@retikz/*` 禁止使用 workspace 或本地 support tarball；在全新 consumer 中运行 `pnpm install --registry=https://registry.npmjs.org/`，保存 lockfile 并核对解析版本，再对全部公开 export 执行 ESM import 与严格 TypeScript smoke。若另有全 workspace tarball fixture，两者必须都通过；本地闭包通过不能替代官方 registry 闭包。

逐包检查 dry-run 输出：

- tarball 只包含 `dist/`、`LICENSE`、`README.md`、`package.json`；
- runtime 只位于 `dist/**/*.js`，declarations 只位于 `dist/types/**/*.d.ts` / `*.d.ts.map`；
- 不含 `dist/es`、`dist/lib` 或 `.cjs`，全部 package exports 与公开 subpath 已通过 packed ESM import；
- `workspace:*` 依赖已解析为确切版本，`workspace:^` 依赖已解析为兼容范围；
- package name 和 version 正确；
- publishable 包没有 `"private": true`；
- 没有 `.js`、`.d.ts`、`.d.ts.map` 泄漏到 `packages/*/*/src`。

辅助检查：

```bash
rg '"private": true' packages/*/*/package.json
rg --files packages | rg 'packages/.*/src/.*\.(d\.ts|d\.ts\.map|js)$'
```

若公开模块正常增长导致 artifact limits 需要调整，先完成构建，再显式运行 `pnpm run update:publish-artifact-limits`；逐包核对生成的文件数与 tarball bytes diff 后，重新运行普通 `pnpm run test:publish-artifacts`。普通验证命令不得改写 limits。

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
5. 再次确认本地和远端不存在同名 tag，按 Kernel 特例或主包名规则创建 annotated tag：`git tag -a <tag-prefix>-v<version> -m "<tag-prefix> <version>"`。
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

- [ ] 目标版本、发布单元、dist-tag、按 Kernel 特例或主包名规则生成的 git tag 已确认。
- [ ] release group 存在于 `scripts/release-groups.config.mjs`；未配置的发布组没有提前创建 tag。
- [ ] 已按 npm registry 校验版本连续性。
- [ ] `scripts/release-groups.config.mjs`、`package.json` 的 `retikz` 元信息和目标发布组一致。
- [ ] 发布组内包版本全部等于目标版本。
- [ ] 用户可见行为变化已更新对应 changelog 数据文件。
- [ ] 只有需要改变可见徽章时才更新 `module.ts`。
- [ ] roadmap 已按既有格式更新。
- [ ] 已从 milestone roadmap 枚举并逐篇阅读全文审计全部 ADR，未用状态、roadmap 或提交说明替代。
- [ ] 生效 ADR 从 Proposed 起保持长期形态并为 `Accepted`；被替代 ADR 为 `Superseded`，且替代关系明确。
- [ ] ADR 未混入具体文件、私有逻辑、逐项测试、命令、commit 或 review 过程；ignored plan 未被误提交。
- [ ] ADR 未保留包边界、完备性、同类设计、否决方案、测试策略或非目标等设计检查章节。
- [ ] ADR 公开契约、类型示例与最终实现、changelog、docs 一致。
- [ ] lockfile 可能漂移时已跑 `pnpm install`。
- [ ] `pnpm run check:full` 通过。
- [ ] `pnpm run check:release-groups` 通过。
- [ ] `pnpm run test:full` 通过。
- [ ] `pnpm run build` 通过。
- [ ] 发布组内每个包 dry-run 通过。
- [ ] 已检查 tarball、`workspace:*` 精确版本解析和 `workspace:^` 兼容范围解析。
- [ ] frozen exact tarball 已在显式官方 registry 的 clean consumer 中通过真实依赖闭包、ESM 与 TypeScript smoke；未继承镜像 registry。
- [ ] 当前对话已授权 commit / tag / publish / push。
- [ ] tag 前已确认 HEAD 版本。
- [ ] tag 为 annotated tag，本地和远端均无同名 tag，历史或已发布 tag 未被移动、复用或覆盖。
- [ ] tag 状态已分别汇报本地与远端指向。
- [ ] npm publish 使用官方 registry。
- [ ] 已完成发布后汇报。

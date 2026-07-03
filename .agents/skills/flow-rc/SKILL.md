---
name: flow-rc
description: Use when retikz release-candidate work needs API-freeze enforcement, bug convergence, docs completion, migration guidance, packaging validation, or rc/stable readiness checks.
---

# rc 发布候选流程

rc 是公开 API 冻结后的验收窗口。目标是让外部用户能从 npm 安装、按文档写图，并预期后续 patch 不破坏现有代码。

## 硬规则

- 不做破坏性改动：不改组件名、prop 名、IR 字段名、导出类型名、默认语义、公开函数签名。
- 不新增公开能力：不新增组件、IR 节点、schema union 分支、公开 prop、公开 export。
- 只修兼容 bug；若必须破坏兼容性，halt，交给人工决定回 beta、推迟到后续版本或放弃。
- 文档、示例、迁移指南、release notes、安装验收是 rc 主工作面。
- 发 rc / stable 包走 `package-publish`；发布前 package.json 目标版本必须已进入 HEAD。
- AI 不自行 commit / push / tag / publish，继承根 AGENTS 授权规则。

## 启动条件

调用前确认：

1. beta 已完成，或用户明确宣布进入 rc。
2. 目标版本形如 `0.x.y-rc.N`，npm dist-tag 为 `next`。
3. 当前任务属于 bugfix、docs、packaging、release notes、安装验收或迁移指南。

若用户要求“再改 API 名 / 换 schema 字段 / 加 prop”，立即 halt，并建议登记到后续 alpha / beta 窗口。

## 分级

| Level | 范围 | 允许程度 | 验证 |
| --- | --- | --- | --- |
| docs | `apps/docs/**`、导航、i18n、demo、changelog、迁移指南 | 主路径 | docs typecheck / build + 页面确认 |
| bugfix | 不改变公开契约的 core / react / plot bug 修复 | 允许 | 回归测试 + lint / tsc / test |
| packaging | metadata、exports、tarball、安装 smoke | 允许 | build + dry-run + 外部安装验证 |
| compat-risk | 可观察行为调整但声称兼容 | 谨慎，需人工裁定 | 回归测试 + changelog / 用户影响说明 |
| breaking | 公开 API / IR schema / 组件名 / prop 名 / export 变化 | 禁止 | halt |
| feature | 新公开能力 / 新 schema 字段 / 新 DSL 行为 | 禁止 | halt |

## 标准流程

### Stage 1 盘点

- bug：记录复现输入、期望、实际、影响面。
- docs：记录页面、用户路径、双语、demo 需求。
- packaging：记录目标包、版本、环境、包管理器、框架版本。
- 先看 `git status --short`，识别已有改动归属，不覆盖用户改动。

当前发布组路径以 `package.json` 为准。kernel 组在 `packages/kernel/{math,core,render,vanilla,react,tex}`；plot 组在 `packages/viz/{plot,plot-vanilla,plot-react}`。

### Stage 2 实施

- docs：读 `docs-doc-principle`，按页型再读 component / example / group / concept / blog skill。zh 是 source of truth，en 同步。
- bugfix：先补最小回归测试，再修实现，保持 public API 不变。
- packaging：从 packed tarball / npm 安装角度验证 exports、types、peer deps、workspace dependency rewrite。
- compat-risk：先写用户影响说明，再改代码；不得弱化测试断言。

### Stage 3 验证

默认验证受影响模块；RC 发布候选、跨包契约或用户要求时扩大到发布组 / 全仓。

普通结构化改动：

```bash
pnpm --filter @retikz/<pkg> exec eslint . --fix
pnpm --filter @retikz/<pkg> exec tsc --noEmit
pnpm --filter @retikz/<pkg> exec vitest run
```

docs 改动：

```bash
pnpm --filter @retikz/docs exec tsc --noEmit
pnpm --filter @retikz/docs build
```

packaging / rc 发布候选：

- 按依赖序 build 发布组。
- `pnpm --filter @retikz/<pkg> publish --dry-run --no-git-checks --access public --tag next --registry https://registry.npmjs.org/`
- 检查源码污染：`rg --files packages | rg "packages/.*/src/.*\.(d\.ts|d\.ts\.map|js)$"`
- 至少用独立项目 smoke：安装目标 tag / tarball、import、typecheck、渲染最小示例。

### Stage 4 用户验收

汇报：

- 改了哪些用户路径或 bug。
- 是否触碰公开契约；若触碰，为什么仍兼容。
- 跑过哪些验证。
- 是否需要用户手动浏览 docs 或在真实项目试用。

需要 commit 时，按逻辑块 stage，展示文件清单和建议 commit message，等待授权。

### Stage 5 发布

只有用户明确要求“发布 rc / publish rc / 发版”时才进入，细节走 `package-publish`。本 skill 只补 rc 约束：

- 版本形如 `0.x.y-rc.N`。
- npm dist-tag 使用 `next`。
- tag 形如 `v0.x.y-rc.N`；plot 组按发布 skill 的 tag 规则。
- 发布后从 npm registry 反查版本和 dist-tag。
- push commit / tag 仍需单独授权。

## rc 文档优先级

- 安装与第一个图。
- 核心 API 参考：`Layout`、`Node`、`Path`、`Step`、`Draw`、`Text`、`Coordinate`。
- Kernel / Sugar / IR / Scene 的概念关系。
- 坐标、anchor、relative step、path label 的心智模型。
- alpha / beta 到 rc 的迁移指南。
- 常见图例、changelog、versioning、中英文导航一致性。

## 完成标准

单条任务：

- 无破坏性改动。
- bugfix 有回归测试；docs 有中英同步和 build / 页面验证；packaging 有 dry-run / smoke 证据。
- 工作区改动按逻辑块 stage 或等待用户审阅。
- 用户明确 ack 后才 commit。

rc 阶段整体：

- 文档站核心路径可供新用户从零使用。
- API 参考与实现一致。
- 迁移指南覆盖 beta 阶段 breaking changes。
- npm `next` 包可在独立项目安装并运行。
- 剩余 TODO 均 non-blocking，并迁移到 stable 后或下一 minor 计划。

## 上下游

- 上游：`flow-beta` 完成并发布 beta 后进入。
- 下游：无 blocker 后走 `package-publish` 发布 stable；正式版不带预发布 dist-tag，默认 `latest`。
- 回退：若必须破坏 API 才能修设计问题，halt，人工决定发新 beta、推迟到下一 minor，或放弃改动。

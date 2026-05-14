---
name: flow-rc
description: retikz rc 期发布候选编排。用于 beta 完成后进入公开 API 冻结窗口：不再做破坏性改动，不再新增公开能力，保持可供用户长期使用的兼容性；主要处理 bug 收敛、npm 安装验收、文档站结构与内容补齐、迁移指南、示例质量、API 参考一致性、发布说明与最终 stable 前检查。适用于 v0.1.0-rc.N 到 stable 前的质量冻结流程。
---

# rc 发布候选流程

retikz rc 期的目标是把 beta 已经确定的 API 变成可长期依赖的用户入口。rc 不是最后一轮重命名窗口，而是冻结后的验收窗口。

## 阶段定位

| 维度 | beta | rc | stable |
| --- | --- | --- | --- |
| 公开 API | 允许破坏性改名 / schema 字段调整 | **冻结**，只允许 blocker 级修正 | 按 SemVer 守护 |
| 主要工作 | 重构、命名、破坏性整理、测试补强 | bug 收敛、文档站、安装验收、迁移说明 | 正式发布与维护 |
| 文档要求 | 用户可见改动同步文档 | **文档是主工作面** | 只修错漏 |
| npm dist-tag | `beta` | `next` | `latest` |

rc 的核心判断：外部用户能不能从 npm 安装、照着文档写出稳定可维护的图，并预期后续 patch 不会破坏现有代码。

## 硬规则

- **不再做破坏性改动**：不改组件名、prop 名、IR 字段名、导出类型名、默认语义、公开函数签名。
- **不新增公开能力**：不新增组件、IR 节点、schema union 分支、公开 prop、公开 export。确实需要新增时，记录到下一个 minor / alpha 窗口。
- **只修兼容 bug**：修复应保持旧写法继续可用；如果必须破坏兼容性，halt，交给人工裁定是否回退到 beta 或推迟到后续版本。
- **文档优先**：rc 的主要产物是 docs、示例、迁移指南、release notes、安装验收报告。
- **包版本先入库**：发 rc 包时必须先把 `packages/*/package.json` 写成目标版本并提交，再 tag / publish；具体走 [`package-publish`](../package-publish/SKILL.md)。
- **AI 不自行 commit / push / publish**：继承根 AGENTS.md。改完、验证、stage 后停下等用户当次授权。

## 启动条件

调用本 SKILL 前先确认：

1. beta 计划已经完成并发布，或者用户明确宣布进入 rc。
2. 当前目标版本是 `0.1.0-rc.N`，npm dist-tag 应为 `next`。
3. 当前任务属于以下范围之一：
   - bug fix
   - 文档站内容 / 信息架构 / 示例 / 迁移指南
   - npm 安装验收 / tarball / 类型导出 / 构建兼容性检查
   - release notes / changelog / versioning 文案

若任务要求“再改一个 API 名 / 再换一个 schema 字段 / 加一个 prop”，立即 halt，说明 rc 已冻结 API，并建议登记到后续版本计划。

## 任务分级

| Level | 范围 | 允许程度 | 必要验证 |
| --- | --- | --- | --- |
| **docs** | `apps/docs/**`、文档导航、i18n、demo、changelog、迁移指南 | rc 主路径 | docs build + 示例可运行 |
| **bugfix** | 不改变公开契约的 core/react bug 修复 | 允许 | 回归测试 + lint / tsc / test |
| **packaging** | package metadata、exports、tarball、安装 smoke test | 允许 | build + dry-run + 外部安装验证 |
| **compat-risk** | 可能影响用户代码但声称不破坏 API 的行为调整 | 谨慎，需人工裁定 | 回归测试 + changelog + 用户影响说明 |
| **breaking** | 公开 API / IR schema / 组件名 / prop 名 / 导出名变化 | 禁止 | halt |
| **feature** | 新公开能力、新组件、新 schema 字段、新 DSL 行为 | 禁止 | halt |

## 标准流程

### Stage 1 — 盘点

先明确任务来源与范围：

- bug 报告：记录复现输入、期望行为、实际行为、影响面。
- 文档任务：记录目标页面、目标用户路径、是否中英双语、是否需要 demo。
- packaging 任务：记录目标环境、包版本、包管理器、框架版本。

同时跑快速边界检查：

```bash
git status --short
node -e "const fs=require('node:fs'); for (const p of ['packages/core/package.json','packages/react/package.json']) { const j=JSON.parse(fs.readFileSync(p,'utf8')); console.log(j.name, j.version); }"
```

如果工作区不干净，先识别已有改动归属，不覆盖用户改动。

### Stage 2 — 实施

按 level 执行。

**docs**

- 优先走 [`docs-doc-write`](../docs-doc-write/SKILL.md)。
- zh 是 source of truth，en 同步；不要只改单语。
- 示例必须使用 rc API，不出现 beta 旧字段。
- 迁移指南应提供“旧写法 / 新写法 / 原因 / 影响范围”。
- 不把 ADR、内部 plan、agent 流程写成用户必须理解的前置知识。

**bugfix**

- 先补最小回归测试，证明现有行为失败。
- 修复实现，保持公开 API 不变。
- 不用 alias / deprecated 包装掩盖破坏性改动；rc 不做兼容层大迁移。

**packaging**

- 从 npm tarball / packed tarball 角度验证，而不是只依赖 workspace。
- 检查 `exports`、`main`、`module`、`types`、peer dependency、workspace dependency rewrite。
- 对 `@retikz/react` 至少验证一个最小 Vite React 项目可安装、可 import、可 typecheck。

**compat-risk**

- 先写用户影响说明，再改代码。
- 保持已有测试语义，不弱化断言。
- 必须在 changelog 或 release notes 里说明可观察行为变化。

### Stage 3 — 验证

按改动面选择验证，宁可多跑不漏跑。

通用守门：

```bash
pnpm lint
pnpm --filter @retikz/core exec tsc --noEmit
pnpm --filter @retikz/react exec tsc --noEmit
pnpm --filter @retikz/docs exec tsc --noEmit
pnpm test
```

文档改动：

```bash
pnpm --filter @retikz/docs build
```

包改动：

```bash
pnpm --filter @retikz/core build
pnpm --filter @retikz/react build
pnpm --filter @retikz/core publish --dry-run --access public --tag next
pnpm --filter @retikz/react publish --dry-run --access public --tag next
```

源码污染检查：

```bash
rg --files packages | rg "packages/.*/src/.*\.(d\.ts|d\.ts\.map|js)$"
```

该命令有输出时，按 AGENTS.md 清理误生成文件后重新验证。

### Stage 4 — 用户验收

输出本次改动摘要：

- 改了哪些用户路径或 bug。
- 是否触碰 core/react 公开契约；若是，应说明为什么仍兼容。
- 跑过哪些验证。
- 是否需要用户手动浏览 docs 页面或在真实项目试用。

若需要 commit，按逻辑块 stage，展示 stage 文件清单与建议 commit message，等待用户明确“提交”。

### Stage 5 — rc 发布

只有用户明确要求“发布 rc / publish rc / 发版”时才进入。发布细节走 [`package-publish`](../package-publish/SKILL.md)，本 SKILL 只补 rc 约束：

- 目标版本形如 `0.1.0-rc.N`。
- npm dist-tag 使用 `next`。
- tag 形如 `v0.1.0-rc.N`。
- 发布前确认 `package.json` 目标版本已经进入 HEAD。
- 发布后从 npm registry 反查版本与 dist-tag。
- push commit 与 tag；轻量 tag 必要时单独 `git push origin v0.1.0-rc.N`。

## rc 文档工作清单

rc 期优先补齐这些面：

- 安装与第一个图。
- `TikZ`、`Node`、`Path`、`Step`、`Draw`、`Text`、`Coordinate` API 参考。
- Kernel / Sugar / IR / Scene 的概念关系。
- 坐标、anchor、relative step、path label 的心智模型。
- alpha / beta 到 rc 的迁移指南。
- 常见图例：流程图、箭头关系图、label path、虚线样式、文本节点、基础几何。
- changelog 与 versioning 页面。
- 中英文导航、sidebar、页面标题、描述、代码示例一致。

## rc 安装验收清单

至少覆盖：

- `pnpm add @retikz/react@next`
- TypeScript 可解析 `@retikz/react` 与 `@retikz/core` 类型。
- Vite React 项目可渲染一个最小 `<TikZ>` 示例。
- React peer dependency 覆盖 React 18；如声明兼容 React 19，则也验证。
- tarball 不包含 `src/`、`tests/`、`node_modules/`、源码配置文件。
- `@retikz/react` 发布包内 `@retikz/core` 依赖不是 `workspace:*`，而是目标版本。

## 完成标准

单条任务完成标准：

- 没有破坏性改动。
- bugfix 有回归测试；docs 有中英同步与 build 验证；packaging 有 dry-run / smoke 证据。
- 工作区改动按逻辑块 stage 或等待用户审阅。
- 用户明确 ack 后才 commit。

rc 阶段整体完成标准：

- 文档站核心路径可供新用户从零使用。
- API 参考与代码实现一致。
- 迁移指南覆盖 beta 阶段所有 breaking change。
- npm `next` 包可在独立项目安装并运行。
- 剩余 TODO 都是 non-blocking，已迁移到 stable 后或下一 minor 计划。

## 与上下游衔接

- **上游**：`flow-beta` 完成并发布 beta 后进入本流程。
- **下游**：rc 无 blocker 后，走 [`package-publish`](../package-publish/SKILL.md) 发布 `0.1.0` stable；正式版不带预发布 dist-tag，默认进入 `latest`。
- **回退**：若发现必须破坏 API 才能修的设计问题，halt，人工决定是否发新的 beta、推迟到 `0.2`，或放弃该改动。

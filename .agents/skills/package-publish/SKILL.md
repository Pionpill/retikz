---
name: package-publish
description: 用于把 retikz 的 publishable 包（`@retikz/core` / `@retikz/react`）发布到 npm。一次发包 = 三处同步：版本号（`packages/<pkg>/package.json`）、文档站（`apps/docs/src/contents/reference/releases` + `i18n` 的 `versionTag`）、内部计划（`notes/plans/v0/roadmap.md` 勾选）。发布后预 bump packages 到下一开发版本（plan 有下一版本直接改、没有则问用户）。retikz 专用，其它项目可忽略。
---

# 发 retikz 到 npm

## 总览

retikz 一次发包 = **3 处同步改动 + 用户确认 + npm publish**。

| 改动面 | 内容 |
| --- | --- |
| **包元数据** | `packages/<pkg>/package.json` 的 `version` 字段 |
| **文档站** | `apps/docs/src/contents/reference/releases/changelog/{zh,en}.mdx` 加新条目 + `i18n/locales/{zh,en}.ts` 的 `versionTag`（仅 MINOR / MAJOR / 大里程碑变） |
| **计划文档** | `notes/plans/v0/roadmap.md` 勾掉对应小版本 checkbox |

漏一处的后果：

- 漏 `package.json` → 发版失败 / 发出旧版本
- 漏 changelog → 文档站不显示新版本说明
- 漏 `versionTag` → 文档站顶部右上还是旧版徽章
- 漏 roadmap 勾选 → 计划文档与现实脱节

**AI 助手不得自行 `git commit` / `git push` / `npm publish`**——根 AGENTS.md 硬规则。本技能在做完 working tree 改动后**停下来等用户授权**，授权后才执行提交与发布。

**版本写入硬规则：先把目标版本写进仓库并提交，再 tag / publish。** 不允许拿上一个版本的 `package.json` 去发布时临时改版本，也不允许 tag 指向一个还显示旧版本号的 commit。npm 包版本、git tag、仓库 `package.json` 必须三者一致；否则会造成“源码显示旧版本、npm 实际是新版本”的可追溯性断裂。

## 使用时机

- 用户说"发个 alpha"、"发版"、"发 npm"、"publish 0.1.0-alpha.X"
- v0.1 路线图里某个 alpha / beta / 0 已经写完代码并通过测试，要往 npm 推
- 任何"改完代码 → 让用户拿到 npm 上"的场景

不适用：

- 仅在文档站点（`apps/docs/`）改 mdx——文档不发 npm，走 GitHub Pages 自动部署
- 仅 bump 版本号但不发 npm——直接改 `package.json` 即可，无需本技能

## 项目里的可发布包

| 包名 | 路径 | 当前版本 | 备注 |
| --- | --- | --- | --- |
| `@retikz/core` | `packages/core/` | `0.1.0-alpha.0` | 框架无关，零 React / 零 DOM |
| `@retikz/react` | `packages/react/` | `0.1.0-alpha.0` | React adapter，peerDep `react >= 18` |
| ~~`@retikz/docs`~~ | `apps/docs/` | — | `private: true`，私有文档站不发 |

**默认两个包同版本一起发**——它们紧耦合（react adapter 依赖 core 的 IR / Scene 类型）。除非用户明确说"只发 core"。

## 版本节奏

参考 `notes/plans/v0/roadmap.md`。pre-stable（v1.0 之前）走 `-alpha.N` / `-beta.N` / `-rc.N`：

| 形态 | 示例 | npm dist-tag | 下游默认 install |
| --- | --- | --- | --- |
| 正常迭代 | `0.1.0-alpha.1` → `0.1.0-alpha.2` | `--tag alpha` | **拉不到**（latest 拉稳定版） |
| schema 冻结 | `0.1.0-beta.1` | `--tag beta` | 拉不到 |
| 候选发布 | `0.1.0-rc.1` | `--tag next` | 拉不到 |
| 正式版 | `0.1.0` | （默认 latest） | ✅ 拉得到 |

下游用户：

- `pnpm add @retikz/react` → 默认拉 latest
- `pnpm add @retikz/react@alpha` → 拉最新 alpha
- `pnpm add @retikz/react@0.1.0-alpha.1` → 钉死

**alpha 版必须带 `--tag alpha`，否则会污染 latest——这是新手最常踩的坑。**

## 用户给的输入

最少需要：

1. **目标版本号**（如 `0.1.0-alpha.1`）——技能不替用户决定，必须问清楚
2. **本次发布要包含的子包**（默认两个都发；用户可指定只发一个）
3. **本次新增能力的 changelog 文案**——可由用户先说一句"这次发了 X、Y、Z"，技能再扩成中英 mdx；或用户直接给好

可选：

- 是否同时打 git tag（默认是）
- 是否 push tag 到 remote（默认是）

## 全流程（6 阶段）

### 阶段 1 — 盘点 + 计划

技能开始时先报告，确认无误前不动手：

```
准备发布：
  - @retikz/core   0.1.0-alpha.0 → 0.1.0-alpha.1
  - @retikz/react  0.1.0-alpha.0 → 0.1.0-alpha.1
npm dist-tag: alpha
git tag: v0.1.0-alpha.1
本次变更：
  - <从 v0/roadmap.md alpha.1 段或用户说明摘要>
```

如果用户没说清楚版本号或变更点，**停下来问**，不要瞎猜。

### 阶段 2 — working tree 改动

按下面顺序做（可并行的并行做）。

#### 2.1 包版本号

直接改 `packages/<pkg>/package.json` 的 `"version"` 字段。两个包同版本号。

这是发版流程的第一性动作：目标版本（例如 `0.1.0-rc.1`）必须在 working tree 中显式出现，经过验证、commit，然后再创建 `v0.1.0-rc.1` tag 与 npm publish。不要在 publish 命令或临时脚本里动态覆盖版本号。

如果想用 CLI：

```bash
pnpm --filter @retikz/core version 0.1.0-alpha.1
pnpm --filter @retikz/react version 0.1.0-alpha.1
```

monorepo 子包跑 `version` 不会触发 git commit，安全。

#### 2.2 changelog mdx

在 `apps/docs/src/contents/reference/releases/changelog/{zh,en}.mdx` 顶部插入新 `<Update>` 块（紧跟 frontmatter，放在已有 `<Update>` 之上）：

````mdx
<Update label="2026.MM" tags={["@retikz/core", "@retikz/react"]}>

## v0.1.0-alpha.1

简短一句话总结本次变更（可选）。

### `@retikz/core`

- **改动点 1**：……
- **改动点 2**：……

### `@retikz/react`

- **改动点 1**：……

</Update>
````

约定：

- `label` 用 `YYYY.MM` 月份形式；同月多个发布按需聚合到同一 `<Update>` 还是新开一块（手动判断）
- `tags` 列**本次实际改动**的子包名（仅 `@retikz/core` / `@retikz/react` 两选一或全选），**不要写 `"docs"`**
- 子标题层级固定：`## v<完整版本号>` → `### \`@retikz/<包>\``
- **只写具体包的更新**——不开 `### docs` 段、不列文档站 / mdx / demo / ADR / AGENTS.md 改动；这些是项目内部演进，不影响下游 `pnpm add` 的体验
- 中英两份**结构对齐**（章节数、bullet 数一致），文案不要求逐字翻译；按 `docs-doc-principle` 技能"zh 是 source of truth、en 跟随"

#### 2.3 i18n `versionTag`（仅 MINOR / MAJOR 切档时改）

`apps/docs/src/i18n/locales/{zh,en}.ts` 里的 `versionTag` 是文档站顶部右上的版本徽章。

| 本次发布 | versionTag 改不改 |
| --- | --- |
| `0.1.0-alpha.0` → `0.1.0-alpha.1` | 不改（仍是 `v0.1 alpha`） |
| `0.1.0-alpha.4` → `0.1.0-beta.1` | **改**（`v0.1 alpha` → `v0.1 beta`） |
| `0.1.0-beta.2` → `0.1.0` | **改**（`v0.1 beta` → `v0.1`） |
| `0.1.0` → `0.2.0-alpha.1` | **改**（`v0.1` → `v0.2 alpha`） |

#### 2.4 roadmap checklist

`notes/plans/v0/roadmap.md` 末尾"v0.1 跟踪"区有 checkbox。本次发布对应版本前的 `[ ]` 改成 `[x]`：

```diff
- - [ ] v0.1.0-alpha.1
+ - [x] v0.1.0-alpha.1
```

整 v0.1.0 完结后，按 `notes/README.md` 约定**整篇删除 `v0/roadmap.md`**——但那是 v0.1.0 当次的事，不是每次 alpha 做的。

#### 2.5 lockfile 同步

```bash
pnpm install   # catalog 没变就基本无操作；版本字段变化也无影响（lockfile 不锁 workspace 包自己的版本）
```

### 阶段 3 — 验证 + 构建

发版前的发版守门，**任何一步报错都停下来——不带病发版**。根 AGENTS.md 红线。

#### 3.1 全仓 ESLint

```bash
pnpm lint   # 等价于 root 的 eslint . --cache
```

覆盖 `packages/**` + `apps/**` 全部 TS / TSX。`--cache` 命中时几秒内完成。**警告也算错**——AGENTS.md 不允许留 warning。

#### 3.2 全仓 TypeScript 类型检查

每个 workspace 跑一遍 `tsc --noEmit`：

```bash
pnpm --filter @retikz/core  exec tsc --noEmit
pnpm --filter @retikz/react exec tsc --noEmit
pnpm --filter @retikz/docs  exec tsc --noEmit
```

约束：

- **必须 `--noEmit`**，不准 `tsc -b` / `tsc`（不带参数）。原因：根 `tsconfig.json` 设了 `declaration: true` + `declarationMap: true` 又没设 `outDir`，emit 会污染 `src/` 目录。AGENTS.md §"改完代码后"硬规则
- 例外：`apps/docs` 自己的 `build` 脚本用 `tsc -b`，但**类型校验阶段仍走 `tsc --noEmit`**，build 脚本归阶段 3.4
- 出现 `*.d.ts` / `*.d.ts.map` / 编译产物洒到 `packages/*/src/` 的，按 AGENTS.md 给的命令清掉再继续：

  ```bash
  find packages -type f \( -name '*.d.ts' -o -name '*.d.ts.map' -o -name '*.js' \) \
    -not -path '*/node_modules/*' -not -path '*/dist/*' -delete
  ```

**不允许 `as any` / `@ts-ignore` / `@ts-expect-error` 绕过**（除非有不可避情况且同行注释写清原因）。

#### 3.3 测试

```bash
pnpm test   # 等价 pnpm -r --if-present run test:run（vitest run）
```

测试失败一律停。

#### 3.4 构建发布产物

```bash
pnpm --filter @retikz/core  build
pnpm --filter @retikz/react build
```

写到 `packages/<pkg>/dist/`。

#### 3.5 dry-run 看 tarball

```bash
pnpm --filter @retikz/core  publish --dry-run --access public --tag alpha
pnpm --filter @retikz/react publish --dry-run --access public --tag alpha
```

确认 tarball 只有 `dist/` + `README.md` + `LICENSE` + `package.json`，**没有** `src/` / `tests/` / `node_modules/` / `tsconfig.json` / `vite.config.ts` 等。控制者是 `packages/<pkg>/package.json` 的 `files` 字段。

### 阶段 4 — 暂停 → 等用户授权

**不能省。** 根 AGENTS.md 明令 AI 不得自行 commit / push / publish。

授权边界要说清楚：如果用户只说“提交”，只提交版本准备改动；如果用户说“发布 / publish / go”，才执行阶段 5。无论哪种授权，阶段 5 都必须保证 tag 之前目标版本已经在 HEAD 中。

技能输出：

```
✅ ESLint   通过（pnpm lint）
✅ tsc      通过（core / react / docs 三个 workspace）
✅ 测试     通过（pnpm test）
✅ build    完成（core / react 已写 dist/）
✅ dry-run  通过

working tree 改动汇总：
  M  packages/core/package.json
  M  packages/react/package.json
  M  apps/docs/src/contents/reference/releases/changelog/zh.mdx
  M  apps/docs/src/contents/reference/releases/changelog/en.mdx
  M  notes/plans/v0/roadmap.md
  ...

dry-run 关键行：
  - @retikz/core  v0.1.0-alpha.1  X files, Y kB
  - @retikz/react v0.1.0-alpha.1  X files, Y kB

请审阅。确认后我会执行：
  1. git commit -m ":bookmark: 准备 0.1.0-alpha.1 发布"（若已提交则跳过）
  2. 确认 HEAD 的 package.json 版本就是 0.1.0-alpha.1
  3. git tag v0.1.0-alpha.1
  4. pnpm publish (alpha tag)
  5. git push + git push tag
```

**停**。等用户给"可以发"、"publish"、"go"等明确指令再继续。

### 阶段 5 — 提交 + 标签 + 发布

用户授权后顺序执行：

```bash
# 1. commit 版本准备改动（按根 AGENTS.md 的 emoji 规范，发版用 :bookmark:）
git add -A
git commit -m ":bookmark: 准备 0.1.0-alpha.1 发布"

# 2. 确认 HEAD 已包含目标版本；如果仍是旧版本，halt，不能 tag / publish
node -e "const fs=require('node:fs'); for (const p of ['packages/core/package.json','packages/react/package.json']) { const j=JSON.parse(fs.readFileSync(p,'utf8')); if (j.version !== '0.1.0-alpha.1') throw new Error(`${j.name} version is ${j.version}`); }"
git status --short

# 3. tag（轻量 tag 即可；annotated tag 用 -a -m）
git tag v0.1.0-alpha.1

# 4. publish（按子包逐个发；--access public 首次必带）
pnpm --filter @retikz/core publish --access public --tag alpha
pnpm --filter @retikz/react publish --access public --tag alpha

# 5. push commit + tag；轻量 tag 不一定会被 --follow-tags 带上，必要时单独 push tag
git push
git push origin v0.1.0-alpha.1
```

如果阶段 4 之后用户已经单独授权并完成了“准备发布” commit，则阶段 5 跳过 commit，但仍必须执行版本确认；tag 必须打在包含目标版本号的 HEAD 上。

发完报告：

```
✅ 发布完成
  - https://www.npmjs.com/package/@retikz/core/v/0.1.0-alpha.1
  - https://www.npmjs.com/package/@retikz/react/v/0.1.0-alpha.1
git tag: v0.1.0-alpha.1（已 push）
下游拉法：pnpm add @retikz/react@alpha
```

### 阶段 6 — 发版后预 bump 到下一开发版本

发布成功后，把 `packages/{core,react}/package.json` 的 `version` 预 bump 到**下一个开发版本**——避免下次开工时仓库版本号还停在已发布版本，造成「源码版本 = npm 已发布版本」的歧义。

下一版本怎么定：

1. 查计划文档的版本跟踪 checkbox——v0.2 看 [`v0.2.md`](../../../notes/plans/v0/v0.2.md) 的「v0.2 跟踪」段，v0.1 看 [`roadmap.md`](../../../notes/plans/v0/roadmap.md)。
2. **plan 里明确有下一个未发布版本** → 直接把两个包 version 改成它。例：刚发 `0.2.0-alpha.2`、跟踪段下一行是 `- [ ] v0.2.0-alpha.3` → 两个包 version 改 `0.2.0-alpha.3`。
3. **plan 里没有明确的下一个版本**（刚发的是该 milestone 最后一个 alpha、下一步 beta / rc / 正式版未排期、或跟踪段已到末尾）→ **停下来问用户**下一个版本号，不要瞎猜。

约束：

- 只改 `version` 字段，**不**重新 build / publish / tag——这是下一轮开发的起点，不是新发布。
- 两个包同版本号（与发版规则一致）。
- bump 改动按根 AGENTS.md 红线**等用户授权再 commit**；emoji 用 `:bookmark:`，message 如 `:bookmark: 预 bump 到 0.2.0-alpha.3 开发版`。

## Quick Reference

| 任务 | 改动 |
| --- | --- |
| 发 alpha.N+1 | 包版本 × 2 + changelog mdx × 2 + roadmap 勾选 |
| 升 alpha → beta | 同上 + i18n `versionTag` × 2 |
| 升 beta → 0（正式） | 同上 + i18n `versionTag` × 2 + roadmap 整篇删（如已写完） |
| 撤回某版本 | `npm unpublish @retikz/<pkg>@<version>`（24h 内有效；超过只能 deprecate） |

## 常见错误

- **alpha 版没带 `--tag alpha`** —— 默认 `latest`，下游 `pnpm add @retikz/react` 会拉到 alpha，反向影响所有用户。**口诀：alpha → tag alpha**
- **作用域包没带 `--access public`** —— `@retikz/*` 是作用域包，npm 默认认作 paid private，发布失败
- **误把 `"private": true` 加回来** —— pnpm publish 直接拒绝，报 `package is private`。本仓 `@retikz/core` / `@retikz/react` 已确认无此字段；prepublish 检查里若发现立刻删掉
- **dist 里有 `src/`** —— `package.json` 的 `files` 字段没列对，或 build 没跑就发了
- **没 build 就 publish** —— 发出去的包指向 `src/index.ts` 而不是 `dist/lib/index.cjs`，下游装上但 import 解析不出。**所以必须按 §3 顺序：先 build，再 dry-run，再 publish**
- **catalog 改动忘记 `pnpm install`** —— lockfile 与 workspace.yaml 不一致，CI 报 `ERR_PNPM_OUTDATED_LOCKFILE`
- **AI 自己 commit / publish** —— 根 AGENTS.md 红线，必须等用户当次授权才动
- **tag 指向旧版本 commit** —— 先 tag / publish，后补 `package.json` 版本号，会让 npm、git tag、源码三方不一致。正确顺序是：改版本 → 验证 → commit → 确认 HEAD 版本 → tag → publish。
- **正式版 `0.1.0` 跑了 `--tag alpha`** —— 正式版反而进 alpha 通道，下游永远拉不到。正式版**不带** `--tag` 参数（默认 latest）
- **同月多发了几个 alpha 都新建 `<Update>` 块** —— 同月内可聚合到一个块（label 仍写 `YYYY.MM`），让 changelog 不至于太碎；但跨月必须分块

## 与其它流程的衔接

- **根 AGENTS.md commit 规则**：阶段 5 的 commit / push / publish 都需要用户**当次明确授权**。授权一次只覆盖本次发布，下次发版要再问一遍
- **`docs-doc-principle` 技能**：本技能里 changelog mdx 的写法是简版规范；如果要做更复杂的版本说明页（迁移指南、breaking changes 详解），改完后参考 `docs-doc-principle` 写正文
- **roadmap 完结**：v0.1.0 正式发布后，`notes/plans/v0/roadmap.md` 按 `notes/README.md` 约定**整篇删除**——临时方案完工即删，不留死文档

## 验证清单

走完阶段 3 后、给用户审阅前最后过一遍：

- [ ] `packages/<pkg>/package.json` 版本号正确
- [ ] 目标版本号已进入 working tree；阶段 5 tag 前必须确认它已经进入 HEAD
- [ ] 确认 publishable 包没有 `"private": true`（`grep '"private": true' packages/{core,react}/package.json` 应无输出）
- [ ] `pnpm lint` pass（含 0 warning）
- [ ] `tsc --noEmit` 在 core / react / docs 三个 workspace 全 pass
- [ ] `pnpm test` pass
- [ ] `dist/` 已重新构建（`ls -la packages/<pkg>/dist` 时间戳是新的）
- [ ] dry-run tarball 只含 `dist/` + `LICENSE` + `README.md` + `package.json`
- [ ] changelog mdx 中英两份都加了，`<Update>` 结构对齐
- [ ] `versionTag` 该改时已改（看版本节奏表）
- [ ] roadmap checkbox 已勾
- [ ] `pnpm install` 跑过，lockfile 没游离改动
- [ ] 没有 `*.d.ts` / `*.js` 误生成在 `packages/*/src/`

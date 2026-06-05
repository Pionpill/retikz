---
name: package-publish
description: 用于把 retikz 的 7 个 publishable 包发布到 npm——Tier 1 组（`@retikz/core` / `@retikz/render` / `@retikz/react` / `@retikz/vanilla`，lockstep 同版本）与 plot 组（`@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla`，独立版本线）。一次发包 = 三处同步：版本号（`packages/<group>/<pkg>/package.json`）、文档站结构化 changelog（`apps/docs/src/data/changelog.ts` + 必要时 `apps/docs/src/data/module.ts` 对应模块的 `version` 版本徽章）、内部路线（当前看 `notes/decisions/core/v0/v0.3/roadmap.md` 或 `notes/decisions/plot/v0/...`）。发布后先把本里程碑的 Accepted ADR 压缩成决策记录（删施工契约 / 待决策点两段），再预 bump packages 到下一开发版本（roadmap 有下一版本直接改、没有则问用户）。retikz 专用，其它项目可忽略。
---

# 发 retikz 到 npm

## 总览

retikz 一次发包 = **3 处同步改动 + 用户确认 + npm publish**。

| 改动面 | 内容 |
| --- | --- |
| **包元数据** | `packages/<pkg>/package.json` 的 `version` 字段 |
| **文档站** | `apps/docs/src/data/changelog.ts` 加结构化发布条目 + `apps/docs/src/data/module.ts` 对应模块条目的 `version`（顶栏版本徽章，仅 MINOR / MAJOR / 大里程碑变） |
| **路线文档** | 里程碑跟踪段勾掉对应小版本 checkbox（v0.2 看 `notes/decisions/core/v0/v0.2/roadmap.md`「v0.2 跟踪」段；v0.1 看 `notes/decisions/core/v0/v0.1/roadmap.md`） |

漏一处的后果：

- 漏 `package.json` → 发版失败 / 发出旧版本
- 漏 changelog → 文档站不显示新版本说明
- 漏 `module.ts` 的 `version` → 文档站顶栏左侧该模块还是旧版徽章
- 漏 roadmap 勾选 → 路线文档与现实脱节

**AI 执行 `git commit` / `git push` / `npm publish` 前必须先拿到用户在当前对话里的明确确认**（根 AGENTS.md）；用户可一次性授权本技能的提交序列，但 `push` / `tag` / `npm publish` 仍需明确点名。本技能做完 working tree 改动后**停下来等用户确认**，确认范围内的后续操作可由 AI 直接执行。一次确认≠永久授权。

**版本写入硬规则：先把目标版本写进仓库并提交，再 tag / publish。** 不允许拿上一个版本的 `package.json` 去发布时临时改版本，也不允许 tag 指向一个还显示旧版本号的 commit。npm 包版本、git tag、仓库 `package.json` 必须三者一致；否则会造成“源码显示旧版本、npm 实际是新版本”的可追溯性断裂。

## 使用时机

- 用户说"发个 alpha"、"发版"、"发 npm"、"publish 0.1.0-alpha.X"
- v0.1 路线图里某个 alpha / beta / 0 已经写完代码并通过测试，要往 npm 推
- 任何"改完代码 → 让用户拿到 npm 上"的场景

不适用：

- 仅在文档站点（`apps/docs/`）改 mdx——文档不发 npm，走 GitHub Pages 自动部署
- 仅 bump 版本号但不发 npm——直接改 `package.json` 即可，无需本技能

## 项目里的可发布包

**7 个可发布包，分两组、各自独立版本线**（当前版本以各 `package.json` 为准，不写死在本表）：

| 组 | 包名 | 路径 | 备注 |
| --- | --- | --- | --- |
| **Tier 1**（core 组，**lockstep 同版本同发**） | `@retikz/core` | `packages/core/core/` | 框架无关，零 React / 零 DOM |
| | `@retikz/render` | `packages/core/render/` | Scene → 后端，子路径 `./svg` / `./canvas` / `./hydration` |
| | `@retikz/react` | `packages/core/react/` | React adapter，peerDep `react >= 18` |
| | `@retikz/vanilla` | `packages/core/vanilla/` | framework-free runtime / SSR |
| **plot 组**（Tier 2，**lockstep 同版本同发**，版本线独立于 Tier 1） | `@retikz/plot` | `packages/plot/plot/` | Plot IR + lowerPlots，依赖 `@retikz/core` |
| | `@retikz/plot-react` | `packages/plot/react/` | `<Plot>` 组件 + 组合 DSL |
| | `@retikz/plot-vanilla` | `packages/plot/vanilla/` | `renderPlot` SSR |
| ~~`@retikz/docs`~~ | — | `apps/docs/` | `private: true`，私有文档站不发 |

**两组各自 lockstep**：core 组 4 包必须同版本一起发（紧耦合，互相依赖 IR / Scene / descriptor 类型）；plot 组 3 包同版本一起发。**两组版本线独立**（如 Tier 1 在 `0.3.0-alpha.x`、plot 在 `0.1.0-alpha.x`）。

**发布顺序按依赖**：core 组先（core → render → vanilla → react），plot 组后（plot → plot-vanilla → plot-react）——`workspace:*` 在发布时替换成确切版本，被依赖方必须先发。

**git tag 命名**：Tier 1 用 `v<version>`（如 `v0.3.0-alpha.3`）；plot 组因 repo 全局 tag 空间与旧 core 的 `v0.1.*` 冲突，用 **`plot-v<version>`**（如 `plot-v0.1.0-alpha.1`）。

## 版本节奏

参考 `notes/decisions/core/v0/roadmap.md`。pre-stable（v1.0 之前）走 `-alpha.N` / `-beta.N` / `-rc.N`：

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
2. **本次发布要包含的组**（core 组 4 包 / plot 组 3 包；默认按本次改动涉及的组整组发，用户可指定）
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

直接改本组各 `packages/<group>/<pkg>/package.json` 的 `"version"` 字段。**同组所有包同版本号**（core 组 4 包，或 plot 组 3 包）。

这是发版流程的第一性动作：目标版本（例如 `0.3.0-rc.1`）必须在 working tree 中显式出现，经过验证、commit，然后再创建 tag 与 npm publish。不要在 publish 命令或临时脚本里动态覆盖版本号。

如果想用 CLI（发 core 组示例，4 包同版本）：

```bash
for p in core render react vanilla; do pnpm --filter @retikz/$p version 0.3.0-alpha.4; done
# plot 组：for p in plot plot-react plot-vanilla; do pnpm --filter @retikz/$p version 0.1.0-alpha.2; done
```

monorepo 子包跑 `version` 不会触发 git commit，安全。

#### 2.2 结构化 changelog 数据

在 `apps/docs/src/data/changelog.ts` 中更新对应 minor / package / subVersion。changelog 页已改为数据驱动渲染，不再维护 `contents/**/changelog/index.{zh,en}.mdx` 或 `<Update>` 块。

```ts
{
  version: 'alpha.1',
  date: 'YYYY-MM-DD',
  summary: {
    zh: '简短一句话总结本次变更。',
    en: 'One concise sentence summarizing this release.',
  },
  items: [
    {
      label: { zh: '改动点 1', en: 'Change 1' },
      content: { zh: '……', en: '...' },
    },
  ],
}
```

约定：

- `Release.minor` 用 `v0.3` 这种中版本 key（plot 组用独立 key 如 `plot-v0.1`，避免与 core 版本线串台）；`PackageBlock.pkg` 只写本次实际影响的包（7 个发布包之一 / 必要时 `docs`）。`PACKAGE_IDS` + `PACKAGE_LABEL` 在 `changelog.types.ts`，新包要先在那里登记才能进 changelog 与筛选 chips。
- `SubVersion.version` 写预发布后缀（如 `alpha.1` / `beta.1` / `rc.1`）；正式版 patch 可写 `0` / `1` 等项目既有形态。
- `items` 用 `label` + `content` 双语对象；zh 是 source of truth，en 跟随，结构必须对齐。
- npm 发布条目主要写下游可感知的包行为；文档站 / mdx / demo / ADR / AGENTS.md 改动只在它们影响用户入口、迁移说明或发布说明本身时写入 `docs` 包块。
- 更新后保持 `changelog` 数组倒序、同一 package block 下 `subVersions` 倒序，并跑 changelog data 测试（若存在）。

#### 2.3 module `version` 徽章（仅 MINOR / MAJOR 切档时改）

`apps/docs/src/data/module.ts` 里每个模块条目的 `version` 是文档站顶栏左侧的版本徽章，**按模块独立**（core / plot 各自一份；blog / about 无）。发哪个包就改哪个模块的 `version`（发 `@retikz/core` 改 `core`，发 `@retikz/plot` 改 `plot`）。

| 本次发布 | version 改不改 |
| --- | --- |
| `0.1.0-alpha.0` → `0.1.0-alpha.1` | 不改（仍是 `v0.1 alpha`） |
| `0.1.0-alpha.4` → `0.1.0-beta.1` | **改**（`v0.1 alpha` → `v0.1 beta`） |
| `0.1.0-beta.2` → `0.1.0` | **改**（`v0.1 beta` → `v0.1`） |
| `0.1.0` → `0.2.0-alpha.1` | **改**（`v0.1` → `v0.2 alpha`） |

#### 2.4 roadmap checklist

里程碑跟踪段有 checkbox（v0.2 在 `notes/decisions/core/v0/v0.2/roadmap.md`「v0.2 跟踪」段、v0.1 在 `notes/decisions/core/v0/v0.1/roadmap.md` 末尾"v0.1 跟踪"区）。本次发布对应版本前的 `[ ]` 改成 `[x]`：

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

每个 workspace 跑一遍 `tsc --noEmit`（7 个发布包 + docs，**不要漏 render / vanilla / plot**）：

```bash
for p in core render react vanilla plot plot-react plot-vanilla; do pnpm --filter @retikz/$p exec tsc --noEmit; done
pnpm --filter @retikz/docs exec tsc --noEmit
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

按依赖序构建本次要发的包（写到各 `dist/`）：

```bash
# core 组：for p in core render vanilla react; do pnpm --filter @retikz/$p build; done
# plot 组：for p in plot plot-vanilla plot-react; do pnpm --filter @retikz/$p build; done
```

写到 `packages/<pkg>/dist/`。

#### 3.5 dry-run 看 tarball

```bash
# 对本次要发的每个包 dry-run（示例 core 组；plot 组同理换包名 + --tag alpha）
for p in core render vanilla react; do pnpm --filter @retikz/$p publish --dry-run --no-git-checks --access public --tag alpha --registry https://registry.npmjs.org/; done
```

确认两点：
1. tarball 只有 `dist/` + `README.md` + `LICENSE` + `package.json`，**没有** `src/` / `tests/` / `node_modules/` / `tsconfig.json` / `vite.config.ts` 等。控制者是 `package.json` 的 `files` 字段。
2. **`workspace:*` 已被替换成确切版本**——pack 一个依赖最多的包（如 plot-react）解出 `package.json` 看 `dependencies`，应是 `@retikz/react: "0.3.0-alpha.x"` 这种确切版本，不是 `workspace:*`。被依赖包必须先发，否则下游装不上。

### 阶段 4 — 暂停 → 等用户授权

**不能省。** 根 AGENTS.md：commit / push / publish 前必须先拿到用户当次确认；确认后 AI 才执行。

授权边界要说清楚：如果用户只说“提交”，只提交版本准备改动；如果用户说“发布 / publish / go”，才执行阶段 5。无论哪种授权，阶段 5 都必须保证 tag 之前目标版本已经在 HEAD 中。

技能输出：

```
✅ ESLint   通过（pnpm lint）
✅ tsc      通过（7 个发布包 + docs）
✅ 测试     通过（pnpm test）
✅ build    完成（本次要发的包已写 dist/）
✅ dry-run  通过（workspace:* 已解为确切版本）

working tree 改动汇总（示例 core 组）：
  M  packages/core/{core,render,react,vanilla}/package.json
  M  apps/docs/src/data/changelog.ts
  ...

dry-run 关键行：
  - @retikz/core … 0.3.0-alpha.x  X files, Y kB
  - …（本次每个包一行）

请审阅。确认后我会执行：
  1. git commit -m ":bookmark: 准备 0.3.0-alpha.x 发布"（若已提交则跳过）
  2. 确认 HEAD 的 package.json 版本就是目标版本
  3. git tag（Tier 1 `v<version>`；plot 组 `plot-v<version>`）
  4. 按依赖序 pnpm publish 本次每个包 --tag alpha（2FA 加 --otp，见下「OTP 临发临用」）
  5. git push + git push tag
```

**停**。等用户给"可以发"、"publish"、"go"等明确指令再继续。

### 阶段 5 — 提交 + 标签 + 发布

用户授权后顺序执行：

```bash
# 1. commit 版本准备改动（按根 AGENTS.md 的 emoji 规范，发版用 :bookmark:）；只 add 本次版本相关文件，别 git add -A 裹进无关改动
git commit -m ":bookmark: core 组 bump 到 0.3.0-alpha.x（<主题>）"

# 2. 确认 HEAD 已包含目标版本；如果仍是旧版本，halt，不能 tag / publish（示例 core 组 4 包）
node -e "const fs=require('node:fs'); for (const p of ['core','render','react','vanilla']) { const j=JSON.parse(fs.readFileSync(`packages/core/${p}/package.json`,'utf8')); if (j.version !== '0.3.0-alpha.4') throw new Error(`${j.name} version is ${j.version}`); }"
git status --short

# 3. tag（Tier 1 用 v<version>；plot 组用 plot-v<version>，避开旧 core 的 v0.1.* tag 空间）
git tag v0.3.0-alpha.4

# 4. publish——前置：登录官方源（默认 registry 可能是镜像）
#    npm whoami --registry=https://registry.npmjs.org/   # 报 401 先 npm login --registry=https://registry.npmjs.org/
#    按依赖序逐包发，--access public 首次必带，2FA 加 --otp=<6位码>（见下「OTP 临发临用」）。
for p in core render vanilla react; do
  pnpm --filter @retikz/$p publish --access public --tag alpha --no-git-checks --otp=<OTP> --registry https://registry.npmjs.org/
done

# 5. push commit + tag；轻量 tag 不被 --follow-tags 带上时单独 push（plot 组连 plot-v<version> 一起）
git push
git push origin v0.3.0-alpha.4
```

**OTP 临发临用（2FA 必读，踩过坑）**：

- OTP（TOTP）30s 时效。**拿到就立刻跑**，别先做 whoami / 一堆 dry-run 把窗口耗掉——执行时已过期会报 `EOTP`。
- **一个新鲜 OTP 可在其窗口内连发多包**：首包成功后 npm 会短暂缓存该 OTP，后续包复用同一码即可，7 包一气呵成。所以**先备好新码、再一口气循环发**。
- **别用过期/将过期的 OTP 重试**：连续多次 `EOTP` 会触发 npm 的 `E429 rate limited otp`，账号被短暂限流（等 ~1 分钟冷却）。中途窗口过期就**停下来要一个新码**再续发剩余包（逐包先 `npm view <pkg>@<version>` 跳过已发的，避免 `EPUBLISHCONFLICT`）。
- **首发 scoped 包读端点有传播延迟**：刚 publish 成功（输出 `+ @retikz/xxx@version`）后，`npm view` 偶尔几十秒内仍 404，属 CDN 传播、不是没发成功。别据此重发，等一会儿再核。

如果阶段 4 之后用户已经单独授权并完成了“准备发布” commit，则阶段 5 跳过 commit，但仍必须执行版本确认；tag 必须打在包含目标版本号的 HEAD 上。

发完报告：

```
✅ 发布完成
  - https://www.npmjs.com/package/@retikz/core/v/0.3.0-alpha.x （本次每个包一行）
  - …
git tag: v0.3.0-alpha.x（已 push；plot 组为 plot-v<version>）
下游拉法：pnpm add @retikz/react@alpha（plot：pnpm add @retikz/plot-react@alpha）
```

### 阶段 6 — 发版后：清理本里程碑 ADR + 预 bump 到下一开发版本

#### 6.1 清理本里程碑 ADR 的施工指令（bump 前必做，平时也可主动发起）

刚发布的里程碑已封板，其 ADR 全部 Accepted、代码 + 测试已是真源——**bump 到下一版本前**，把该里程碑目录下的 ADR 从「施工蓝图」压缩成「决策记录」。这是 ADR 生命周期的封口动作（模板 §header「ADR 生命周期」、`_template.md` 里标 🔻 的两段）。

**压缩目的 = 去噪、不是删历史**：删掉完工后会变噪声的无效内容（前瞻施工指令 / 已拍板的待决策点 / 现状快照 / 临时过渡话），**保留设计思路、具体决策、未来兼容性考虑**——这三类是「只有 ADR 能告诉你的 WHY」，删了就再也回不来（代码只记录 WHAT）。判不准就保留。

**API 已定型 → 路径引用代码、不重复粘贴**：该阶段 schema / 类型 / 枚举 / 函数签名多已在代码里定稿，ADR 里再贴一份只会随代码漂移。改成指向 `path/to/file.ts` 的指针即可；代码块**仅当「字面形态本身就是决策」**（命名取舍、字段语义、判别串选择等代码读不出的意图）才留**最小片段** + 一句为什么。

**为什么在 bump 前做、而非 develop-wrapup 翻 Accepted 时**：刚 Accept 的那一版，紧接着的修补 / 跟进窗口里施工契约还可能被翻看；真正「不会再回头施工」的封板点是切下一版。所以把清理收在版本 bump 这一刻批量做。

> **bump 不是唯一时机**：压缩是幂等的纯文档操作，任何时候发现某条已 Accepted 的 ADR 还挂着施工脚手架 / 过期过渡文本，都可**主动发起**单独清（用户说「压缩 xx ADR」即可），不必等下次发版。bump 前那一遍是兜底——保证没有里程碑漏掉。

**目标文件**：刚发布版本对应的里程碑目录，例：发 `0.3.0-alpha.3` → `notes/decisions/core/v0/v0.3/v0.3-alpha.3/*.md`（plot 同理在 `notes/decisions/plot/...`）。只清状态已 `Accepted` 的；仍 `Proposed`（跨版本未完工）的不动。

**逐个 ADR 的压缩规则**（完整原文永久留在该 ADR 的 Proposed/实现期 commit，`git show <commit>:<path>` 可捞回，故零信息损失）：

| 段 | 处理 |
|---|---|
| 标题 / 状态行 / 决策日期 / 关联 | **保留**（状态行已是 Accepted + 完工摘要） |
| 背景 | **压成几条「塑造决策的硬约束」**，删 / 去腐 `file.ts:行号` 现状快照（行号随重构 rot）与逐项「摸底」流水，只留 WHY |
| 决策 / 设计思路 / 被否决选项 + 理由 / **未来兼容性考虑** | **保留**（决策记录核心、不可再生的 WHY）；代码块改成**代码路径引用**，只在「字面形态即决策」（命名 / 字段语义）时留最小片段 + 一句为什么 |
| DSL 表面 | **删或缩成一行指向文档站**——用户侧示例已在 reference / 组件页，文档站是更好真源 |
| 落地分布 / 各包分工 / 影响 | **并进「实现指针」一行**；只把 breaking / 跨包 lockstep 这种真·决策性影响留在正文 |
| 不在本 ADR 范围 | **保留**（真延后项 + 从「待决策点」挪来的悬而未决项） |
| **待决策点 🔻** | 实现期已拍板项并进「决策」段或删；真正悬而未决的挪「不在本 ADR 范围」并注明；整段无残留则删 |
| **实现契约 🔻**（Level / Schema 改动表 / 文件 scope / 测试象限 / 依赖现有元素） | **整段折成一行指针**，例：<br>`> 实现见 commit \`<range>\`；测试见 \`packages/.../tests/...\`；最终 schema / 行为以代码（\`IRxxx\` 类型）为准。完整施工契约见本 ADR Proposed commit \`<hash>\`。` |

**临时性过渡文本一并删**：完工后语境消失的措辞——「受限于 xxx，暂…」「待 xxx 处理 / 待后续」「目前先…」「评审 P1.x」这类指向「写时未决 / 当时受限」的过渡话——若所指的事已落地，删掉；若指向真延后项，挪「不在本 ADR 范围」。它们只在 in-flight 期有意义，留着会让人误以为还有未尽事项。

压缩是纯文档改动（`:pencil:`），与版本 bump 同属「封板 / 起新版」语义，可与 6.2 的 bump 同一 commit，也可单独成一个 `:pencil: 压缩 <milestone> ADR 为决策记录` commit——按根 AGENTS.md 红线**等用户授权再 commit**。

**封板溯源行（压缩 commit 落地后补，整批一个 commit）**：压缩把施工蓝图删成决策记录，正文「实现指针」已泛指「完整原文见 git 历史」；为让日后溯源**不必翻历史靠猜**，压缩 commit 落地后给本批每篇压缩稿**末尾追加一行**，注明它的封板压缩 commit——

```
> 🔖 封板压缩 commit `<hash>`；压缩前完整施工蓝图 = `git show <hash>^:<path>`。
```

`<hash>` = 该文件所在里程碑的压缩 commit；**`<hash>^`（父提交）即压缩前全文**，`git show <hash>^:<path>` 一条命令取回。因 hash 要等压缩 commit 落地才知道，这是压缩之后的一道补充步骤：所有里程碑压完后，按「里程碑目录 → 其压缩 commit」映射一次性给全批追加溯源行，**整批统一一个** `:pencil: ADR 封板溯源行` commit（同样等用户授权）。

> AI 自动压缩时**只删 🔻 两段 / 施工脚手架 / 过期过渡文本 + 压背景 + 去腐 file:line**，不得改写「决策 / 被否决理由」的实质内容（那是人工拍的板）；拿不准某条「待决策点」是否真已拍板、或某句过渡文本所指是否已落地 → 保留并标注，呈人工裁。

#### 6.2 预 bump 到下一开发版本

发布成功后，把本次所发组各包 `package.json` 的 `version` 预 bump 到**下一个开发版本**——避免下次开工时仓库版本号还停在已发布版本，造成「源码版本 = npm 已发布版本」的歧义。

下一版本怎么定：

1. 查路线文档的版本跟踪/进度段——Tier 1 看 [`v0.3/roadmap.md`](../../../notes/decisions/core/v0/v0.3/roadmap.md)，plot 看 [`plot/v0/v0.1/roadmap.md`](../../../notes/decisions/plot/v0/v0.1/roadmap.md)。
2. **plan 里明确有下一个未发布版本** → 直接把本组所有包 version 改成它。例：刚发 Tier 1 `0.3.0-alpha.3`、下一段是 alpha.4 → core 组 4 包 version 改 `0.3.0-alpha.4`。
3. **plan 里没有明确的下一个版本**（刚发的是该 milestone 最后一个 alpha、下一步 beta / rc / 正式版未排期）→ **停下来问用户**下一个版本号，不要瞎猜。

约束：

- 只改 `version` 字段，**不**重新 build / publish / tag——这是下一轮开发的起点，不是新发布。
- 同组所有包同版本号（与 lockstep 规则一致）；只 bump 本次实际发布的那一组，另一组不动。
- bump 改动按根 AGENTS.md 红线**等用户授权再 commit**；emoji 用 `:bookmark:`，message 如 `:bookmark: 预 bump core 组到 0.3.0-alpha.4 开发版`。

## Quick Reference

| 任务 | 改动 |
| --- | --- |
| 发 alpha.N+1 | 本组各包版本（core 组 ×4 / plot 组 ×3）+ `apps/docs/src/data/changelog.ts` + roadmap 勾选 |
| 升 alpha → beta | 同上 + `module.ts` 对应模块 `version` |
| 升 beta → 0（正式） | 同上 + `module.ts` 对应模块 `version` + roadmap 整篇删（如已写完） |
| 撤回某版本 | `npm unpublish @retikz/<pkg>@<version>`（24h 内有效；超过只能 deprecate） |

## 常见错误

- **alpha 版没带 `--tag alpha`** —— 默认 `latest`，下游 `pnpm add @retikz/react` 会拉到 alpha，反向影响所有用户。**口诀：alpha → tag alpha**
- **作用域包没带 `--access public`** —— `@retikz/*` 是作用域包，npm 默认认作 paid private，发布失败
- **误把 `"private": true` 加回来** —— pnpm publish 直接拒绝，报 `package is private`。本仓 7 个发布包已确认无此字段；prepublish 检查里若发现立刻删掉
- **dist 里有 `src/`** —— `package.json` 的 `files` 字段没列对，或 build 没跑就发了
- **没 build 就 publish** —— 发出去的包指向 `src/index.ts` 而不是 `dist/lib/index.cjs`，下游装上但 import 解析不出。**所以必须按 §3 顺序：先 build，再 dry-run，再 publish**
- **catalog 改动忘记 `pnpm install`** —— lockfile 与 workspace.yaml 不一致，CI 报 `ERR_PNPM_OUTDATED_LOCKFILE`
- **未经确认就 commit / publish** —— 根 AGENTS.md：commit / push / publish 前都要用户当次确认；用户可授权本轮技能的提交序列，但 publish / push 必须被明确点名。一次确认≠永久授权，确认后 AI 可自己执行授权范围内的操作
- **tag 指向旧版本 commit** —— 先 tag / publish，后补 `package.json` 版本号，会让 npm、git tag、源码三方不一致。正确顺序是：改版本 → 验证 → commit → 确认 HEAD 版本 → tag → publish。
- **正式版 `0.1.0` 跑了 `--tag alpha`** —— 正式版反而进 alpha 通道，下游永远拉不到。正式版**不带** `--tag` 参数（默认 latest）
- **还在改旧 changelog mdx / `<Update>` 块** —— changelog 已数据化，入口是 `apps/docs/src/data/changelog.ts`；旧 `contents/**/changelog/index.{zh,en}.mdx` 不再存在
- **没带 `--registry` 发去了镜像 / 登录到了镜像** —— 本机默认 registry 可能是淘宝镜像（`registry.npmmirror.com`，只读、发不出去）。**登录也必须显式指官方源**：`npm login --registry=https://registry.npmjs.org/`——否则 token 落到镜像源、`~/.npmrc` 里官方源的 `_authToken` 还是旧的，publish 会报 E401（whoami 401）/ E404（PUT scoped 包 not found）。publish / dry-run 一律带 `--registry=https://registry.npmjs.org/`；发前用 `npm whoami --registry=https://registry.npmjs.org/` 确认确实登录到了官方源（不是镜像）
- **账号开了 2FA 报 `EOTP`** —— OTP 在命令执行时已过期。详见阶段 5「OTP 临发临用」：拿到新码立刻一口气循环发完本组所有包（首包成功后同码缓存可复用）；别先 whoami / dry-run 耗窗口。
- **连续 `EOTP` 后报 `E429 rate limited otp`** —— 用过期码反复重试触发了 npm 的 OTP 限流，账号被短暂锁。**停手等 ~1 分钟冷却**，要个新码再续发（逐包先 `npm view <pkg>@<version>` 跳过已发的，避免 `EPUBLISHCONFLICT`）。本质是 7 包别用一个旧码串发。
- **首发 scoped 包 `npm view` 报 404 但其实已发** —— publish 输出了 `+ @retikz/xxx@version` 即成功；读端点 CDN 传播有延迟（几十秒），别据此重发。

## 与其它流程的衔接

- **根 AGENTS.md commit 规则**：阶段 5 的 commit / push / publish 都需要用户**当次明确授权**。授权一次只覆盖本次发布，下次发版要再问一遍
- **`docs-doc-principle` 技能**：本技能里 changelog 数据写法是简版规范；如果要做更复杂的版本说明页（迁移指南、breaking changes 详解），改完后参考 `docs-doc-principle` 写正文
- **milestone roadmap 完结**：正式发布后，按 `notes/README.md` 约定精简或删除对应 milestone 的 `roadmap.md`；major / minor 的 `roadmap.md` 保留作长期路线索引。
- **ADR 封板压缩**（阶段 6.1）：发版后、bump 前把本里程碑 Accepted ADR 从「施工蓝图」压成「决策记录」（删 🔻 待决策点 / 实现契约两段、折成指针）。规则与生命周期定义见 `notes/decisions/core/_template.md` header「ADR 生命周期」段。

## 验证清单

走完阶段 3 后、给用户审阅前最后过一遍：

- [ ] `packages/<pkg>/package.json` 版本号正确
- [ ] 目标版本号已进入 working tree；阶段 5 tag 前必须确认它已经进入 HEAD
- [ ] 同组所有包版本号一致（core 组 4 包 / plot 组 3 包 lockstep）
- [ ] 确认 publishable 包没有 `"private": true`（`grep -r '"private": true' packages/*/*/package.json` 应无输出）
- [ ] `pnpm lint` pass（含 0 warning）
- [ ] `tsc --noEmit` 在 7 个发布包 + docs 全 pass
- [ ] `pnpm test` pass
- [ ] `dist/` 已重新构建（本次每个包 `dist` 时间戳是新的）
- [ ] dry-run tarball 只含 `dist/` + `LICENSE` + `README.md` + `package.json`，且 `workspace:*` 已解为确切版本
- [ ] `apps/docs/src/data/changelog.ts` 已加入目标版本条目，zh / en 字段结构对齐
- [ ] `module.ts` 对应模块 `version` 该改时已改（看版本节奏表）
- [ ] roadmap checkbox 已勾
- [ ] `pnpm install` 跑过，lockfile 没游离改动
- [ ] 没有 `*.d.ts` / `*.js` 误生成在 `packages/*/src/`

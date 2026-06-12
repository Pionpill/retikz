---
name: package-publish
description: 发布 retikz 的 7 个 publishable npm 包：core 组 4 包与 plot 组 3 包分别 lockstep、版本线独立。覆盖版本号、结构化 changelog、模块徽章、roadmap 跟踪、验证、tag/publish 授权边界；发布后按当前 roadmap 预 bump 下一开发版本。retikz 专用。
---

# 发 retikz 到 npm

## 总览

retikz 一次发包 = **3 处同步改动 + 用户确认 + npm publish**。

| 改动面 | 内容 |
| --- | --- |
| **包元数据** | `packages/<pkg>/package.json` 的 `version` 字段 |
| **文档站** | `apps/docs/src/data/changelog.ts` 加结构化发布条目 + `apps/docs/src/data/module.ts` 对应模块条目的 `version`（顶栏版本徽章，仅 MINOR / MAJOR / 大里程碑变） |
| **路线文档** | 按当前发布组对应 roadmap 的既有格式更新里程碑跟踪（通常是勾选版本 checkbox；core 参考 `notes/decisions/core/v0/v0.3/roadmap.md`，plot 参考 `notes/decisions/plot/v0/...`） |

漏一处的后果：

- 漏 `package.json` → 发版失败 / 发出旧版本
- 漏 changelog → 文档站不显示新版本说明
- 漏 `module.ts` 的 `version` → 文档站顶栏左侧该模块还是旧版徽章
- 漏 roadmap 勾选 → 路线文档与现实脱节

**AI 执行 `git commit` / `git push` / `npm publish` 前必须先拿到用户在当前对话里的明确确认**（根 AGENTS.md）；用户可一次性授权本技能的提交序列，但 `push` / `tag` / `npm publish` 仍需明确点名。本技能做完 working tree 改动后**停下来等用户确认**，确认范围内的后续操作可由 AI 直接执行。一次确认≠永久授权。

**版本写入硬规则：先把目标版本写进仓库并提交，再 tag / publish。** 不允许拿上一个版本的 `package.json` 去发布时临时改版本，也不允许 tag 指向一个还显示旧版本号的 commit。npm 包版本、git tag、仓库 `package.json` 必须三者一致；否则会造成“源码显示旧版本、npm 实际是新版本”的可追溯性断裂。

## 使用时机

- 用户说"发个 alpha"、"发版"、"发 npm"、"publish 0.1.0-alpha.X"
- 对应 roadmap 里某个 alpha / beta / rc / stable 已经写完代码并通过测试，要往 npm 推
- 任何"改完代码 → 让用户拿到 npm 上"的场景

不适用：

- 仅在文档站点（`apps/docs/`）改 mdx——文档不发 npm，走 GitHub Pages 自动部署
- 仅 bump 版本号但不发 npm——直接改 `package.json` 即可，无需本技能

## 项目里的可发布包

**7 个可发布包，分两组、各自 lockstep，同组同版本同发；两组版本线独立。当前版本以各 `package.json` 为准。**

| 组 | 包名 | 路径 | 备注 |
| --- | --- | --- | --- |
| core 组 | `@retikz/core`, `@retikz/render`, `@retikz/react`, `@retikz/vanilla` | `packages/core/{core,render,react,vanilla}/` | Tier 1，互相依赖 IR / Scene / descriptor 类型 |
| plot 组 | `@retikz/plot`, `@retikz/plot-react`, `@retikz/plot-vanilla` | `packages/plot/{plot,react,vanilla}/` | Tier 2，依赖 core |
| 不发 | `@retikz/docs` | `apps/docs/` | `private: true` |

**发布顺序按依赖**：core 组先（core → render → vanilla → react），plot 组后（plot → plot-vanilla → plot-react）——`workspace:*` 在发布时替换成确切版本，被依赖方必须先发。

**git tag 命名**：Tier 1 用 `v<version>`（如 `v0.3.0-alpha.3`）；plot 组因 repo 全局 tag 空间与旧 core 的 `v0.1.*` 冲突，用 **`plot-v<version>`**（如 `plot-v0.1.0-alpha.1`）。

## 版本节奏

参考当前发布组的 roadmap（core 通常在 `notes/decisions/core/v0/v0.3/roadmap.md`，plot 在 `notes/decisions/plot/v0/...`）。pre-stable（v1.0 之前）走 `-alpha.N` / `-beta.N` / `-rc.N`：

| 形态 | 示例 | npm dist-tag | 下游默认 install |
| --- | --- | --- | --- |
| 正常迭代 | `0.1.0-alpha.1` → `0.1.0-alpha.2` | `--tag alpha` | **拉不到**（latest 拉稳定版） |
| schema 冻结 | `0.1.0-beta.1` | `--tag beta` | 拉不到 |
| 候选发布 | `0.1.0-rc.1` | `--tag next` | 拉不到 |
| 正式版 | `0.1.0` | （默认 latest） | ✅ 拉得到 |

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

技能开始时先报告：发布组、每个包 `old → target`、npm dist-tag、git tag 名、本次变更摘要。确认无误前不改文件。

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

里程碑跟踪段通常在当前发布组的 roadmap 里：core 看 `notes/decisions/core/v0/v0.3/roadmap.md` 或当前活跃版本目录，plot 看 `notes/decisions/plot/v0/...`。按 roadmap 既有格式更新本次发布对应版本；若是 checkbox，就把 `[ ]` 改成 `[x]`：

```diff
- - [ ] v0.1.0-alpha.1
+ - [x] v0.1.0-alpha.1
```

整个 minor / milestone 完结后的 roadmap 压缩或归档按 `notes/README.md` 约定处理；那是里程碑完结当次的事，不是每次 alpha 都做。

#### 2.5 lockfile 同步

```bash
pnpm install   # catalog 没变就基本无操作；版本字段变化也无影响（lockfile 不锁 workspace 包自己的版本）
```

### 阶段 3 — 验证 + 构建

发版守门：任一步报错都停下。

| 步骤 | 命令 / 检查 |
| --- | --- |
| lint | `pnpm lint`，warning 也算失败 |
| 类型 | `for p in core render react vanilla plot plot-react plot-vanilla; do pnpm --filter @retikz/$p exec tsc --noEmit; done` + `pnpm --filter @retikz/docs exec tsc --noEmit` |
| 测试 | `pnpm test` |
| build | core：`core render vanilla react`；plot：`plot plot-vanilla plot-react`，按依赖序 `pnpm --filter @retikz/$p build` |
| dry-run | `pnpm --filter @retikz/$p publish --dry-run --no-git-checks --access public --tag <tag> --registry https://registry.npmjs.org/` |

关键红线：

- 类型检查只用 `tsc --noEmit`；docs build 脚本可另跑，但不能替代类型检查。
- 不用 `as any` / `@ts-ignore` / `@ts-expect-error` 绕过。
- 若 emit 污染 `packages/*/*/src/`，先列出确认：`rg --files packages | rg 'packages/.*/src/.*\.(d\.ts|d\.ts\.map|js)$'`，再用当前 shell 安全删除。
- dry-run tarball 只能有 `dist/` + `README.md` + `LICENSE` + `package.json`，且 `workspace:*` 必须解成确切版本。

### 阶段 4 — 暂停 → 等用户授权

**不能省。** 根 AGENTS.md：commit / push / publish 前必须先拿到用户当次确认；确认后 AI 才执行。

授权边界要说清楚：如果用户只说“提交”，只提交版本准备改动；如果用户说“发布 / publish / go”，才执行阶段 5。无论哪种授权，阶段 5 都必须保证 tag 之前目标版本已经在 HEAD 中。

给用户的暂停点必须包含：

- 验证结果：`pnpm lint`、7 个发布包 + docs 的 `tsc --noEmit`、`pnpm test`、build、dry-run。
- 改动汇总：版本文件、changelog、module badge、roadmap、lockfile。
- dry-run 摘要：本次每个包的版本、文件数、是否已把 `workspace:*` 解成确切版本。
- 待授权动作：commit、确认 HEAD 版本、tag、publish、push（分别说明需要用户当前对话明确授权）。

然后**停下**，等用户给“可以发 / publish / go”等明确指令再继续。

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

**OTP 临发临用**：

- OTP 30s 时效；拿到新码后立刻跑 publish 循环，不要先做其它命令。
- 首包成功后 npm 会短暂缓存该 OTP，窗口内后续包可复用同一码。
- 出现 `EOTP` 就停下要新码；连续重试会触发 `E429 rate limited otp`。
- 续发前先 `npm view <pkg>@<version>` 跳过已成功发布的包，避免 `EPUBLISHCONFLICT`。
- scoped 包刚发完 `npm view` 可能短暂 404；以 publish 输出 `+ @retikz/xxx@version` 为准，等传播后再核。

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

#### 6.1 清理本里程碑 ADR（bump 前必做）

刚发布的里程碑已封板，代码和测试是真源；bump 到下一开发版本前，把对应里程碑目录下已 `Accepted` 的 ADR 从“施工蓝图”压成“决策记录”。仍 `Proposed` 的 ADR 不动。

目标目录示例：发 `0.3.0-alpha.3` → `notes/decisions/core/v0/v0.3/alpha.3/*.md`；plot 同理在 `notes/decisions/plot/...`。

| 内容 | 处理 |
| --- | --- |
| 决策、设计思路、被否决选项、未来兼容性 | 保留，不改写实质判断 |
| 背景 | 压成塑造决策的硬约束；删 `file.ts:行号` 这类会腐化的快照 |
| DSL 示例 / API 代码块 | 已落地的改成文档站或代码路径指针；只有“字面形态就是决策”时留最小片段 |
| 落地分布 / 测试 / 文件 scope | 折成实现指针 |
| 待决策点 🔻 | 已拍板的并进决策或删；真延后项挪到“不在本 ADR 范围” |
| 实现契约 🔻 | 整段删除，保留一行指向实现 commit / 测试 / 最终 schema |
| 临时过渡话 | 已落地就删；未落地就挪到延后项 |

每篇压缩稿末尾追加溯源行，指向压缩前的父提交蓝图：

```
> 🔖 本文件压缩前完整施工蓝图 = `git show <BLUEPRINT>:<path>`（封板全文）。
```

`<BLUEPRINT>` 用压缩 commit 的父提交（压缩前全文还在），不要引用压缩 commit 自己。压缩是纯文档改动，commit 仍需当前对话授权。

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

| 错误 | 处理 |
| --- | --- |
| alpha 版没带 `--tag alpha`，或正式版误带 `--tag alpha` | alpha 用 `--tag alpha`；正式版不带 tag，默认 latest |
| 作用域包没带 `--access public` | `@retikz/*` publish 一律带 `--access public` |
| `"private": true` 回到发布包 | prepublish 用 `rg '"private": true' packages/*/*/package.json` 检查 |
| 没 build / tarball 混入 `src/` | 按阶段 3 顺序：build → dry-run → publish；检查 `files` 字段 |
| catalog 改动后 lockfile 漂移 | 跑 `pnpm install` |
| 未经授权 commit / tag / push / publish | 严格等当前对话明确授权 |
| tag 指向旧版本 commit | 改版本 → 验证 → commit → 确认 HEAD 版本 → tag → publish |
| 还在改旧 changelog mdx / `<Update>` | changelog 入口是 `apps/docs/src/data/changelog.ts` |
| registry 指到镜像 | login / dry-run / publish 都显式带 `--registry=https://registry.npmjs.org/` |
| OTP 过期或限流 | 见阶段 5；新码立刻发，`EOTP` 后停下换码，`E429` 等冷却 |
| 首发 scoped 包 `npm view` 短暂 404 | 以 publish 输出 `+ @retikz/xxx@version` 为准，等传播后再核 |

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
- [ ] 确认 publishable 包没有 `"private": true`（`rg '"private": true' packages/*/*/package.json` 应无输出）
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

# Changelog 界面重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **本仓约定:** 每个 commit 步骤执行前需向用户当次确认(见记忆 `feedback_no_auto_commit`);确认后由执行者自己跑 `git commit`。源码注释 / 测试标题不出现 `ADR-NN` 等历史阶段引用。

**Goal:** 把文档站 changelog 从纯 MDX 散文改为结构化数据驱动的三栏界面(左时间线 / 中按包分块 / 右多选包筛选),预发布默认折叠。

**Architecture:** 内容落进类型化 TS 数据模块 `src/data/changelog.ts`(双语 markdown 字段);纯逻辑(筛选 / markdown 序列化)单独成文件并 TDD;UI 组件读数据 + 一个 zustand 筛选 store;`DocPage` 对 changelog 这一页分支——中栏渲染 `<ChangelogView>`、aside 渲染 `<ChangelogFilter>`,替代 `MdxContent` / `MdxToc`。

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind 4 + zustand + react-i18next + vitest(node 环境)。文本走现有 `InlineMdx` 渲染 markdown。

**测试约束:** `apps/docs` 的 vitest 跑在 `environment: 'node'`,无 jsdom / testing-library。因此**只对纯逻辑做单测**(数据校验、`changelogToMarkdown`、`filter`);store 与组件靠 `tsc -b` + `build` + 手动 dev 验证,**不要**为此引入 jsdom。

**命令速查(均可在仓库根运行,无需 cd):**
- 单测某文件:`pnpm --filter @retikz/docs exec vitest run tests/changelog/<file>.test.ts`
- 全部单测:`pnpm --filter @retikz/docs test:run`
- 类型检查:`pnpm --filter @retikz/docs exec tsc -b`
- Lint:`pnpm --filter @retikz/docs lint`
- 构建:`pnpm --filter @retikz/docs build`
- 手动 dev:`pnpm --filter @retikz/docs dev`(开 `/about/releases/changelog`)

**git 推导的日期表(写数据时用):**

| 里程碑 | stableDate | 预发布(version : date) |
|---|---|---|
| v0.2 | `null`(开发中) | alpha.1:2026-05-21 · alpha.2:2026-05-22 · alpha.3:2026-05-23 · alpha.4:2026-05-23 |
| v0.1 | 2026-05-20 | alpha.0:2026-05-08 · alpha.1:2026-05-09 · alpha.2:2026-05-09 · alpha.3:2026-05-10 · alpha.4:2026-05-12 · alpha.5:2026-05-13 · beta.1:2026-05-13 · beta.2:2026-05-14 · rc.1:2026-05-16 · rc.2:2026-05-19 |
| v0.0 | 2025-04-30(近似) | rc.0–rc.3(旧单包 `retikz`,精确日期不可考,合并为一个 subVersion `rc.0–rc.3`:2025-04-30) |

---

## File Structure

**新建**
- `apps/docs/src/data/changelog.types.ts` — 类型 + `PACKAGE_IDS` / `PackageId` / `PACKAGE_LABEL`
- `apps/docs/src/data/changelog.ts` — `changelog: Release[]` + `changelogPageDescription: Localized`
- `apps/docs/src/components/shared/changelog/filter.ts` — 纯筛选逻辑
- `apps/docs/src/components/shared/changelog/changelogToMarkdown.ts` — 数据→markdown 序列化
- `apps/docs/src/components/shared/changelog/ChangelogItems.tsx` — 递归 ChangeItem 列表
- `apps/docs/src/components/shared/changelog/ChangelogSubVersions.tsx` — 展开后的逐版明细
- `apps/docs/src/components/shared/changelog/ChangelogPackageBlock.tsx` — 单个包块
- `apps/docs/src/components/shared/changelog/ChangelogRelease.tsx` — 单个里程碑
- `apps/docs/src/components/shared/changelog/ChangelogTimeline.tsx` — 左时间线 rail
- `apps/docs/src/components/shared/changelog/ChangelogFilter.tsx` — 右筛选 aside
- `apps/docs/src/components/shared/changelog/ChangelogView.tsx` — 中栏容器
- `apps/docs/src/components/shared/changelog/index.ts` — 桶导出
- `apps/docs/src/store/useChangelogFilterStore.ts` — 筛选 store
- `apps/docs/tests/changelog/filter.test.ts`
- `apps/docs/tests/changelog/changelogToMarkdown.test.ts`
- `apps/docs/tests/changelog/data.test.ts`

**修改**
- `apps/docs/src/layout/doc-layout/DocPage.tsx` — changelog 分支
- `apps/docs/src/components/shared/mdx-content/components.tsx` — 注销 `Update`
- `apps/docs/src/i18n/locales/zh.json` + `en.json` — 加 `changelog` 文案组

**删除**
- `apps/docs/src/contents/about/releases/changelog/index.zh.mdx`
- `apps/docs/src/contents/about/releases/changelog/index.en.mdx`
- `apps/docs/src/components/shared/update/`(整个目录:`Update.tsx` + `index.ts`)

---

## Task 1: 类型与常量

**Files:**
- Create: `apps/docs/src/data/changelog.types.ts`

- [ ] **Step 1: 写类型文件**

```ts
/** 双语文本:zh / en 各一份 markdown 字符串 */
export type Localized = { zh: string; en: string };

/** 一条变更:加粗 label + markdown content,可嵌套 */
export type ChangeItem = {
  label: Localized;
  content: Localized;
  children?: Array<ChangeItem>;
};

/** 一个预发布 / patch */
export type SubVersion = {
  /** 'alpha.4' | 'rc.2' | 'beta.1' | '1'(patch)| 'rc.0–rc.3'(旧单包合并) */
  version: string;
  /** 'YYYY-MM-DD',git 推导 */
  date: string;
  /** 该预发布一句话定位(可选) */
  summary?: Localized;
  items: Array<ChangeItem>;
};

/** 一个包在某中版本里程碑下的整块内容 */
export type PackageBlock = {
  pkg: PackageId;
  /** 该包在此里程碑的中版本,如 'v0.2' */
  version: string;
  /** ≤200 字符中版本级摘要 */
  description: Localized;
  /** 常驻精选(单独撰写,2–4 条) */
  highlights: Array<ChangeItem>;
  /** 逐预发布明细(默认收起) */
  subVersions: Array<SubVersion>;
};

/** 一个中版本里程碑 = 一个时间线节点 */
export type Release = {
  /** 'v0.2',时间线 key */
  minor: string;
  /** stable 发布日;null ⇒ 开发中 */
  stableDate: string | null;
  packages: Array<PackageBlock>;
};

/** 全部可能的包标识(筛选 chips 由数据中实际出现者派生) */
export const PACKAGE_IDS = ['@retikz/core', '@retikz/react', 'docs', 'retikz'] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

/** 包标识 → 展示名(多数包名两语一致,docs 例外) */
export const PACKAGE_LABEL: Record<PackageId, Localized> = {
  '@retikz/core': { zh: '@retikz/core', en: '@retikz/core' },
  '@retikz/react': { zh: '@retikz/react', en: '@retikz/react' },
  docs: { zh: '文档站', en: 'Docs' },
  retikz: { zh: 'retikz', en: 'retikz' },
};
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过(此文件无消费方,仅验证语法/类型)。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/data/changelog.types.ts
git commit -m ":sparkles: changelog 数据类型 + 包标识常量"
```

---

## Task 2: 纯筛选逻辑(TDD)

**Files:**
- Create: `apps/docs/src/components/shared/changelog/filter.ts`
- Test: `apps/docs/tests/changelog/filter.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import type { Release } from '@/data/changelog.types';
import { allPackageIds, filterReleases } from '@/components/shared/changelog/filter';

const fixture: Array<Release> = [
  {
    minor: 'v0.2',
    stableDate: null,
    packages: [
      { pkg: '@retikz/core', version: 'v0.2', description: { zh: '', en: '' }, highlights: [], subVersions: [] },
      { pkg: 'docs', version: 'v0.2', description: { zh: '', en: '' }, highlights: [], subVersions: [] },
    ],
  },
  {
    minor: 'v0.0',
    stableDate: '2025-04-30',
    packages: [
      { pkg: 'retikz', version: 'v0.0', description: { zh: '', en: '' }, highlights: [], subVersions: [] },
    ],
  },
];

describe('allPackageIds', () => {
  it('按 PACKAGE_IDS 顺序返回数据中实际出现的包', () => {
    expect(allPackageIds(fixture)).toEqual(['@retikz/core', 'docs', 'retikz']);
  });
});

describe('filterReleases', () => {
  it('只保留选中包的块,并丢弃无可见块的里程碑', () => {
    const out = filterReleases(fixture, new Set(['@retikz/core']));
    expect(out).toHaveLength(1);
    expect(out[0]?.minor).toBe('v0.2');
    expect(out[0]?.packages.map(p => p.pkg)).toEqual(['@retikz/core']);
  });

  it('空选集返回空数组', () => {
    expect(filterReleases(fixture, new Set())).toEqual([]);
  });

  it('全选返回结构等价的全部里程碑', () => {
    const out = filterReleases(fixture, new Set(['@retikz/core', 'docs', 'retikz']));
    expect(out.map(r => r.minor)).toEqual(['v0.2', 'v0.0']);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/docs exec vitest run tests/changelog/filter.test.ts`
Expected: FAIL —— 模块 `filter` 不存在 / 函数未定义。

- [ ] **Step 3: 写实现**

```ts
import { PACKAGE_IDS, type PackageId, type Release } from '@/data/changelog.types';

/** 数据中实际出现的包标识,按 PACKAGE_IDS 的固定顺序 */
export const allPackageIds = (releases: Array<Release>): Array<PackageId> => {
  const present = new Set<PackageId>();
  for (const release of releases) {
    for (const block of release.packages) present.add(block.pkg);
  }
  return PACKAGE_IDS.filter(id => present.has(id));
};

/** 按选中包过滤:逐里程碑筛包块,丢弃过滤后无块的里程碑;不修改入参 */
export const filterReleases = (releases: Array<Release>, selected: ReadonlySet<PackageId>): Array<Release> =>
  releases
    .map(release => ({ ...release, packages: release.packages.filter(block => selected.has(block.pkg)) }))
    .filter(release => release.packages.length > 0);
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @retikz/docs exec vitest run tests/changelog/filter.test.ts`
Expected: PASS(4 个用例)。

- [ ] **Step 5: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/filter.ts apps/docs/tests/changelog/filter.test.ts
git commit -m ":white_check_mark: changelog 筛选逻辑 filterReleases / allPackageIds"
```

---

## Task 3: markdown 序列化(TDD)

供 AI 上下文 / 复制按钮把结构化数据还原成 markdown。

**Files:**
- Create: `apps/docs/src/components/shared/changelog/changelogToMarkdown.ts`
- Test: `apps/docs/tests/changelog/changelogToMarkdown.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import type { Release } from '@/data/changelog.types';
import { changelogToMarkdown } from '@/components/shared/changelog/changelogToMarkdown';

const fixture: Array<Release> = [
  {
    minor: 'v0.2',
    stableDate: null,
    packages: [
      {
        pkg: '@retikz/core',
        version: 'v0.2',
        description: { zh: '核心摘要', en: 'core summary' },
        highlights: [
          { label: { zh: '形状注册', en: 'Shape registry' }, content: { zh: '可注册', en: 'registrable' } },
        ],
        subVersions: [
          {
            version: 'alpha.3',
            date: '2026-05-23',
            items: [{ label: { zh: '开放 string', en: 'open string' }, content: { zh: 'shape 字段', en: 'shape field' } }],
          },
        ],
      },
    ],
  },
];

describe('changelogToMarkdown', () => {
  it('按里程碑→包→highlights→预发布序列化中文', () => {
    const md = changelogToMarkdown(fixture, 'zh');
    expect(md).toContain('## v0.2（开发中）');
    expect(md).toContain('### @retikz/core v0.2');
    expect(md).toContain('核心摘要');
    expect(md).toContain('- **形状注册：** 可注册');
    expect(md).toContain('#### alpha.3 — 2026-05-23');
    expect(md).toContain('- **开放 string：** shape 字段');
  });

  it('英文走 en 字段 + 英文“开发中”', () => {
    const md = changelogToMarkdown(fixture, 'en');
    expect(md).toContain('## v0.2 (in development)');
    expect(md).toContain('- **Shape registry:** registrable');
  });

  it('有 stableDate 时标题带日期', () => {
    const md = changelogToMarkdown(
      [{ minor: 'v0.1', stableDate: '2026-05-20', packages: [] }],
      'zh',
    );
    expect(md).toContain('## v0.1（2026-05-20）');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/docs exec vitest run tests/changelog/changelogToMarkdown.test.ts`
Expected: FAIL —— 函数未定义。

- [ ] **Step 3: 写实现**

```ts
import type { Lang } from '@/i18n';
import type { ChangeItem, Release } from '@/data/changelog.types';

const DEV_LABEL: Record<Lang, string> = { zh: '开发中', en: 'in development' };
/** label 与 content 之间的分隔:中文全角冒号,英文半角冒号 */
const SEP: Record<Lang, string> = { zh: '：', en: ':' };

const itemLines = (items: Array<ChangeItem>, lang: Lang, depth: number): Array<string> => {
  const lines: Array<string> = [];
  const indent = '  '.repeat(depth);
  for (const item of items) {
    lines.push(`${indent}- **${item.label[lang]}${SEP[lang]}** ${item.content[lang]}`);
    if (item.children?.length) lines.push(...itemLines(item.children, lang, depth + 1));
  }
  return lines;
};

/** 里程碑标题的日期后缀:有 stable 显日期,否则显“开发中” */
const releaseHeading = (minor: string, stableDate: string | null, lang: Lang): string => {
  const suffix = stableDate ?? DEV_LABEL[lang];
  return lang === 'zh' ? `## ${minor}（${suffix}）` : `## ${minor} (${suffix})`;
};

/** 结构化 changelog → markdown(当前语言),用于 AI 上下文与复制 */
export const changelogToMarkdown = (releases: Array<Release>, lang: Lang): string => {
  const blocks: Array<string> = [];
  for (const release of releases) {
    const parts: Array<string> = [releaseHeading(release.minor, release.stableDate, lang)];
    for (const pkg of release.packages) {
      parts.push(`### ${pkg.pkg} ${pkg.version}`, pkg.description[lang]);
      if (pkg.highlights.length) parts.push(itemLines(pkg.highlights, lang, 0).join('\n'));
      for (const sub of pkg.subVersions) {
        parts.push(`#### ${sub.version} — ${sub.date}`);
        if (sub.summary) parts.push(sub.summary[lang]);
        if (sub.items.length) parts.push(itemLines(sub.items, lang, 0).join('\n'));
      }
    }
    blocks.push(parts.join('\n\n'));
  }
  return blocks.join('\n\n');
};
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @retikz/docs exec vitest run tests/changelog/changelogToMarkdown.test.ts`
Expected: PASS(3 个用例)。

- [ ] **Step 5: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/changelogToMarkdown.ts apps/docs/tests/changelog/changelogToMarkdown.test.ts
git commit -m ":white_check_mark: changelog → markdown 序列化"
```

---

## Task 4: 撰写 changelog 数据

把现有 mdx 内容迁进结构化数据。**源文件**(迁移期间仍在,Task 13 才删):`apps/docs/src/contents/about/releases/changelog/index.zh.mdx` + `index.en.mdx`。

**迁移规则:**
- 现有每个 `## vX.Y.Z`(如 `## v0.2.0-alpha.3`)→ 归到对应中版本 `Release`(`v0.2`)下、对应包 `PackageBlock` 的一个 `SubVersion`(version 取 `alpha.3`,date 查上方日期表)。
- 现有每个 `### @retikz/core` / `### @retikz/react` / `### 文档站`(在某 `## vX.Y.Z` 内)→ 该 SubVersion 在对应包块下的 `items`(`docs` 包对应「文档站」)。
- `description`(≤200 字符)与 `highlights`(2–4 条精选)是**新撰写**的中版本级摘要:从该包在整个中版本里的变更里提炼;descriptions 可参考各 `## vX.Y.Z` 开头的「定位句」。
- 文本字段写 markdown:站内链接用 `[文字](/core/...)`,行内代码用反引号。`content` 里的 `<Tag>` 照写(`InlineMdx` 会自动转义裸 `<`)。
- `Release` 数组**倒序**(v0.2 在前);每个 `PackageBlock.subVersions` 也**倒序**(alpha.4 在前)。

**Files:**
- Create: `apps/docs/src/data/changelog.ts`

- [ ] **Step 1: 写数据骨架 + v0.2 完整范例**

下面是 v0.2 的**完整可用范例**(core / react / docs 三块,含 highlights 与 subVersions)。照此把 v0.1、v0.0 补全。

```ts
import type { Localized, Release } from './changelog.types';

/** changelog 页副标题(替代原 mdx frontmatter description) */
export const changelogPageDescription: Localized = {
  zh: 'retikz 历版发布记录,按中版本聚合、倒序排列。左侧时间线标 stable 日期,右侧按包筛选;预发布默认折叠。',
  en: 'retikz release history, grouped by minor version, newest first. Stable dates on the left timeline, filter by package on the right; pre-releases collapsed by default.',
};

export const changelog: Array<Release> = [
  {
    minor: 'v0.2',
    stableDate: null,
    packages: [
      {
        pkg: '@retikz/core',
        version: 'v0.2',
        description: {
          zh: 'Scope 升级为样式默认值挂点、形状可注册第三方注入,并补齐 zIndex / label rotate 等 emit 层能力。',
          en: 'Scope becomes a style-default host, shapes are registrable / third-party injectable, plus emit-layer additions like zIndex and label rotate.',
        },
        highlights: [
          {
            label: { zh: '形状注册', en: 'Shape registry' },
            content: {
              zh: 'ShapeDefinition 四方法,内置 4 形状改注册项,可发第三方形状库 [自定义形状](/core/reference/extending/shape-registry)',
              en: 'Four-method ShapeDefinition; the 4 built-ins become registry entries; third-party shape libs possible [shape registry](/core/reference/extending/shape-registry)',
            },
          },
          {
            label: { zh: '样式继承', en: 'Style inheritance' },
            content: {
              zh: '主色级联 + 四类默认样式(`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`)+ `resetStyle` 屏障',
              en: 'Primary-color cascade + four default channels (`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`) + a `resetStyle` barrier',
            },
          },
          {
            label: { zh: '显式 zIndex', en: 'Explicit zIndex' },
            content: {
              zh: 'Node / Path / Scope 栈序覆盖,补 SVG 无 z-index 的能力',
              en: 'Node / Path / Scope stacking override, filling SVG’s lack of z-index',
            },
          },
        ],
        subVersions: [
          {
            version: 'alpha.4',
            date: '2026-05-23',
            summary: {
              zh: 'compile IR 顺序回归 + emit 层增强(zIndex / 文本 Node 包 g / label rotate)。',
              en: 'compile IR-order regression + emit-layer enhancements (zIndex / wrap text nodes in g / label rotate).',
            },
            items: [
              {
                label: { zh: '显式 zIndex', en: 'Explicit zIndex' },
                content: {
                  zh: '`Node` / `Path` / `Scope` 加可选 `zIndex`,compile 末端按 `zIndex ?? 0` 稳定排序、同值保持 IR 顺序',
                  en: '`Node` / `Path` / `Scope` gain optional `zIndex`; compile does a stable sort by `zIndex ?? 0`, ties keep IR order',
                },
              },
              {
                label: { zh: '带文本 Node 包 g', en: 'Text nodes wrapped in g' },
                content: {
                  zh: '有文本或有 rotate 的 Node emit 成单层 `GroupPrim`,给语义节点稳定的 DOM / stacking 边界',
                  en: 'Nodes with text or rotate emit as a single `GroupPrim`, giving semantic nodes a stable DOM / stacking unit',
                },
              },
              {
                label: { zh: 'Node label rotate', en: 'Node label rotate' },
                content: {
                  zh: '`NodeLabelSchema` 加 `rotate`(`none` / `radial` / `tangent` / 数字度数)+ `keepUpright`',
                  en: '`NodeLabelSchema` gains `rotate` (`none` / `radial` / `tangent` / numeric degrees) + `keepUpright`',
                },
              },
            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-23',
            summary: {
              zh: 'Shape Registry——node 形状从内置 4 种推进到可注册、可第三方注入。',
              en: 'Shape Registry — node shapes go from 4 built-ins to registrable / third-party injectable.',
            },
            items: [
              {
                label: { zh: 'ShapeDefinition 扩展面', en: 'ShapeDefinition surface' },
                content: {
                  zh: '四方法 `circumscribe` / `boundaryPoint` / `anchor` / `emit`,统一操作外接 `Rect`',
                  en: 'Four methods `circumscribe` / `boundaryPoint` / `anchor` / `emit`, all over a bounding `Rect`',
                },
              },
              {
                label: { zh: 'shape 字段开放为字符串', en: 'shape field opened to string' },
                content: {
                  zh: '`NodeSchema.shape` 由闭合枚举改 `z.string().min(1)`,未注册名 compile 期 throw',
                  en: '`NodeSchema.shape` changes from a closed enum to `z.string().min(1)`; unregistered names throw at compile',
                },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-22',
            summary: {
              zh: '把 Scope 升级为样式默认值挂点:主色级联 + 四类默认样式。',
              en: 'Scope becomes a style-default host: primary-color cascade + four default channels.',
            },
            items: [
              {
                label: { zh: '主色 color', en: 'Primary color' },
                content: {
                  zh: 'Scope / Node / Path 上的 `color`(TikZ `color=`),stroke / fill / 文字 / 箭头 / 标注未单设则随它',
                  en: '`color` on Scope / Node / Path (TikZ `color=`); stroke / fill / text / arrow / label follow it unless set individually',
                },
              },
              {
                label: { zh: '四类默认样式', en: 'Four default channels' },
                content: {
                  zh: '`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`,按元素类型分发',
                  en: '`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`, dispatched by element type',
                },
              },
            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-21',
            summary: {
              zh: '引入 IR 层 `<Scope>` 分组容器,承接 TikZ `\\begin{scope}` 的分组 + 局部 transform。',
              en: 'Introduce an IR-level `<Scope>` container for TikZ `\\begin{scope}` grouping + local transform.',
            },
            items: [
              {
                label: { zh: '新增 Scope IR 容器', en: 'New Scope IR container' },
                content: {
                  zh: '`IRScope` 作为第 4 类 IRChild,支持任意深度嵌套,compile 下沉为 `GroupPrim`',
                  en: '`IRScope` as a 4th IRChild, arbitrarily nestable, lowered to a `GroupPrim` at compile',
                },
              },
            ],
          },
        ],
      },
      {
        pkg: '@retikz/react',
        version: 'v0.2',
        description: {
          zh: '透传 core 新增能力:Scope 样式 props、自定义 shapes、zIndex / label rotate。',
          en: 'Pass through new core capabilities: Scope style props, custom shapes, zIndex / label rotate.',
        },
        highlights: [
          {
            label: { zh: '<Scope> 样式 props', en: '<Scope> style props' },
            content: { zh: '加 12 个样式 props + `resetStyle`', en: '12 style props + `resetStyle`' },
          },
          {
            label: { zh: '<TikZ shapes>', en: '<TikZ shapes>' },
            content: { zh: '透传 `CompileOptions.shapes`,自定义 shape 端到端可用', en: 'Pass through `CompileOptions.shapes`; custom shapes work end to end' },
          },
        ],
        subVersions: [
          {
            version: 'alpha.4',
            date: '2026-05-23',
            items: [
              {
                label: { zh: 'zIndex / label rotate 透传', en: 'zIndex / label rotate passthrough' },
                content: {
                  zh: '`<Node>` / `<Path>` / `<Scope>` 加 `zIndex`;`<Node label>` 的 `rotate` / `keepUpright` 透传',
                  en: '`zIndex` on `<Node>` / `<Path>` / `<Scope>`; `rotate` / `keepUpright` on `<Node label>` passthrough',
                },
              },
            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-23',
            items: [
              {
                label: { zh: '<TikZ shapes>', en: '<TikZ shapes>' },
                content: { zh: '透传自定义 shapes;`<Node shape>` 接受任意字符串名', en: 'pass custom shapes; `<Node shape>` accepts any string name' },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-22',
            items: [
              {
                label: { zh: 'Scope 样式 props', en: 'Scope style props' },
                content: { zh: '`<Scope>` 加 12 个样式 props;`<Node>` / `<Path>` 加主色 `color`', en: '12 style props on `<Scope>`; primary `color` on `<Node>` / `<Path>`' },
              },
            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-21',
            items: [
              {
                label: { zh: '<Scope> Kernel 组件', en: '<Scope> kernel component' },
                content: { zh: '接收 `transforms` / `id` / `localNamespace` / children', en: 'takes `transforms` / `id` / `localNamespace` / children' },
              },
            ],
          },
        ],
      },
      {
        pkg: 'docs',
        version: 'v0.2',
        description: {
          zh: 'Scope 样式继承章节、自定义形状参考页,API 词典补 zIndex / label rotate。',
          en: 'Scope style-inheritance chapter, a custom-shape reference page, and API dictionary entries for zIndex / label rotate.',
        },
        highlights: [
          {
            label: { zh: '自定义形状参考页', en: 'Custom-shape reference page' },
            content: {
              zh: '注入 / 覆盖 / 未知名行为 + hexagon live demo [自定义形状](/core/reference/extending/shape-registry)',
              en: 'inject / override / unknown-name behavior + a hexagon live demo [shape registry](/core/reference/extending/shape-registry)',
            },
          },
        ],
        subVersions: [
          {
            version: 'alpha.4',
            date: '2026-05-23',
            items: [
              {
                label: { zh: 'API 补 zIndex / rotate', en: 'API: zIndex / rotate' },
                content: { zh: 'Node / Path / Scope 参考加 `zIndex`;Node label 文档加 `rotate` / `keepUpright`', en: '`zIndex` on Node / Path / Scope refs; `rotate` / `keepUpright` in Node label docs' },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-22',
            items: [
              {
                label: { zh: 'Scope 样式继承章节', en: 'Scope style-inheritance chapter' },
                content: { zh: '主色级联 / 四通道 every-X / resetStyle 屏障 + 优先级链,配 3 个 demo', en: 'primary cascade / four every-X channels / resetStyle barrier + priority chain, with 3 demos' },
              },
            ],
          },
        ],
      },
    ],
  },

  // TODO(执行者): 按同样结构补 v0.1 与 v0.0(从现有 mdx 迁移,日期查上方日期表)。
  //  - v0.1: stableDate '2026-05-20';core / react / docs 三包;subVersions 覆盖 alpha.0–rc.2(见日期表),
  //    含 v0.1.0-alpha.5 的 BREAKING 项与 beta 系列的命名收敛。
  //  - v0.0: stableDate '2025-04-30';单包 pkg 'retikz';subVersions 合并为一个 version 'rc.0–rc.3'(2025-04-30)。
];
```

> ⚠️ 上面 `Release` 数组里 v0.1 / v0.0 是 `TODO` 注释占位——**这是本任务必须完成的实质工作**:照 v0.2 的结构、用迁移规则把 v0.1(core/react/docs,subVersions = alpha.0…rc.2)与 v0.0(单包 retikz)从现有 mdx 完整搬过来。完成后删掉那段 TODO 注释。

- [ ] **Step 2: 补全 v0.1 / v0.0 数据**

按 Step 1 的 TODO 完成 v0.1、v0.0 两个 `Release`。完成判据:`changelog` 含 3 个 Release;`grep -c "TODO" apps/docs/src/data/changelog.ts` 输出 0。

- [ ] **Step 3: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 4: 提交**(执行前确认)

```bash
git add apps/docs/src/data/changelog.ts
git commit -m ":sparkles: changelog 结构化数据(v0.2 / v0.1 / v0.0)"
```

---

## Task 5: 数据校验测试(TDD)

用 zod 在测试侧校验数据不变量(不进运行时 bundle)。

**Files:**
- Test: `apps/docs/tests/changelog/data.test.ts`

- [ ] **Step 1: 写测试**

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { changelog } from '@/data/changelog';
import { PACKAGE_IDS } from '@/data/changelog.types';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const Localized = z.object({ zh: z.string().min(1), en: z.string().min(1) });
const ChangeItem: z.ZodType = z.lazy(() =>
  z.object({ label: Localized, content: Localized, children: z.array(ChangeItem).optional() }),
);
const SubVersion = z.object({
  version: z.string().min(1),
  date: z.string().regex(DATE),
  summary: Localized.optional(),
  items: z.array(ChangeItem),
});
const PackageBlock = z.object({
  pkg: z.enum(PACKAGE_IDS),
  version: z.string().min(1),
  description: z.object({ zh: z.string().min(1).max(200), en: z.string().min(1).max(200) }),
  highlights: z.array(ChangeItem),
  subVersions: z.array(SubVersion),
});
const Release = z.object({
  minor: z.string().min(1),
  stableDate: z.string().regex(DATE).nullable(),
  packages: z.array(PackageBlock),
});

describe('changelog data', () => {
  it('符合 schema(含 description ≤200 / 合法 pkg / YYYY-MM-DD)', () => {
    expect(() => z.array(Release).parse(changelog)).not.toThrow();
  });

  it('里程碑非空', () => {
    expect(changelog.length).toBeGreaterThan(0);
  });

  it('每个里程碑的 subVersions 日期倒序', () => {
    for (const release of changelog) {
      for (const block of release.packages) {
        const dates = block.subVersions.map(s => s.date);
        const sorted = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
        expect(dates, `${release.minor} ${block.pkg}`).toEqual(sorted);
      }
    }
  });
});
```

- [ ] **Step 2: 跑测试**

Run: `pnpm --filter @retikz/docs exec vitest run tests/changelog/data.test.ts`
Expected: PASS。若 FAIL,按报错修 `changelog.ts`(常见:description 超 200 字符、日期未倒序)。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/tests/changelog/data.test.ts
git commit -m ":white_check_mark: changelog 数据 schema 校验"
```

---

## Task 6: 筛选 store

**Files:**
- Create: `apps/docs/src/store/useChangelogFilterStore.ts`

- [ ] **Step 1: 写 store**(仿 `useTocStore` 的 persist 写法)

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { PACKAGE_IDS, type PackageId } from '@/data/changelog.types';

/** changelog 包筛选状态:选中的包标识集合,默认全选 */
export type ChangelogFilterState = {
  /** 当前选中的包(顺序无关,渲染时按 PACKAGE_IDS 排) */
  selected: Array<PackageId>;
  /** 切换某个包的选中态 */
  toggle: (pkg: PackageId) => void;
  /** 是否选中 */
  isSelected: (pkg: PackageId) => boolean;
};

export const useChangelogFilterStore = create<ChangelogFilterState>()(
  persist(
    (set, get) => ({
      selected: [...PACKAGE_IDS],
      toggle: pkg =>
        set(state => ({
          selected: state.selected.includes(pkg)
            ? state.selected.filter(p => p !== pkg)
            : [...state.selected, pkg],
        })),
      isSelected: pkg => get().selected.includes(pkg),
    }),
    { name: 'retikz-changelog-filter' },
  ),
);
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/store/useChangelogFilterStore.ts
git commit -m ":sparkles: changelog 包筛选 store"
```

---

## Task 7: 递归条目组件 `ChangelogItems`

highlights 与逐版 items 共用。文本走 `InlineMdx`,把 `label` + `content` 合成一行 markdown。

**Files:**
- Create: `apps/docs/src/components/shared/changelog/ChangelogItems.tsx`

- [ ] **Step 1: 写组件**

```tsx
import type { FC } from 'react';

import { InlineMdx } from '@/components/shared/mdx-content';
import type { Lang } from '@/i18n';
import type { ChangeItem } from '@/data/changelog.types';

const SEP: Record<Lang, string> = { zh: '：', en: ': ' };

export type ChangelogItemsProps = {
  items: Array<ChangeItem>;
  lang: Lang;
};

/** 递归渲染变更条目:每条 `**label：** content`(markdown),children 缩进嵌套 */
export const ChangelogItems: FC<ChangelogItemsProps> = ({ items, lang }) => (
  <ul className="ml-5 list-disc space-y-1.5">
    {items.map((item, i) => (
      <li key={i} className="leading-relaxed">
        <InlineMdx source={`**${item.label[lang]}${SEP[lang]}** ${item.content[lang]}`} />
        {item.children?.length ? <ChangelogItems items={item.children} lang={lang} /> : null}
      </li>
    ))}
  </ul>
);
```

> 说明:`InlineMdx` 输出 `<p>`,放进 `<li>` 时首段无上边距(其样式 `[&:not(:first-child)]:mt-6`),视觉正常。`source` 里若含 `<Tag>` 会被自动转义。

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/ChangelogItems.tsx
git commit -m ":sparkles: changelog 递归条目组件"
```

---

## Task 8: 逐版明细组件 `ChangelogSubVersions`

**Files:**
- Create: `apps/docs/src/components/shared/changelog/ChangelogSubVersions.tsx`

- [ ] **Step 1: 写组件**

```tsx
import type { FC } from 'react';

import { InlineMdx } from '@/components/shared/mdx-content';
import type { Lang } from '@/i18n';
import type { SubVersion } from '@/data/changelog.types';

import { ChangelogItems } from './ChangelogItems';

export type ChangelogSubVersionsProps = {
  subVersions: Array<SubVersion>;
  lang: Lang;
};

/** 展开后的逐预发布明细:版本号(mono)+ 日期 + 可选 summary + items */
export const ChangelogSubVersions: FC<ChangelogSubVersionsProps> = ({ subVersions, lang }) => (
  <div className="mt-3 space-y-4 border-l-2 border-border pl-4">
    {subVersions.map(sub => (
      <div key={sub.version}>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-mono font-medium">{sub.version}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{sub.date}</span>
        </div>
        {sub.summary ? <InlineMdx source={sub.summary[lang]} className="mt-1 text-sm text-muted-foreground" /> : null}
        {sub.items.length ? (
          <div className="mt-1.5 text-sm">
            <ChangelogItems items={sub.items} lang={lang} />
          </div>
        ) : null}
      </div>
    ))}
  </div>
);
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/ChangelogSubVersions.tsx
git commit -m ":sparkles: changelog 逐版明细组件"
```

---

## Task 9: 包块组件 `ChangelogPackageBlock`

**Files:**
- Create: `apps/docs/src/components/shared/changelog/ChangelogPackageBlock.tsx`

- [ ] **Step 1: 写组件**

```tsx
import { ChevronRight } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InlineMdx } from '@/components/shared/mdx-content';
import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL, type PackageBlock } from '@/data/changelog.types';

import { ChangelogItems } from './ChangelogItems';
import { ChangelogSubVersions } from './ChangelogSubVersions';

export type ChangelogPackageBlockProps = {
  block: PackageBlock;
  lang: Lang;
};

/** 单个「包 × 中版本」块:包名+版本徽章 + 描述 + highlights + 可展开逐版明细 */
export const ChangelogPackageBlock: FC<ChangelogPackageBlockProps> = ({ block, lang }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = block.subVersions.length;

  return (
    <div className="border-b border-border/60 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-base font-semibold">{PACKAGE_LABEL[block.pkg][lang]}</span>
        <span className="rounded-md border px-1.5 text-xs text-muted-foreground">{block.version}</span>
      </div>
      <InlineMdx source={block.description[lang]} className="mt-1.5 text-muted-foreground" />
      {block.highlights.length ? (
        <div className="mt-3">
          <ChangelogItems items={block.highlights} lang={lang} />
        </div>
      ) : null}
      {count > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="mt-3 flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
            {open ? t('changelog.collapse') : t('changelog.prereleaseCount', { count })}
          </button>
          {open ? <ChangelogSubVersions subVersions={block.subVersions} lang={lang} /> : null}
        </>
      ) : null}
    </div>
  );
};
```

- [ ] **Step 2: 类型检查**(`t('changelog.*')` 此刻 i18n 还没补,但 `t` 接受任意 string,tsc 不会报)

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/ChangelogPackageBlock.tsx
git commit -m ":sparkles: changelog 包块组件(含折叠)"
```

---

## Task 10: 里程碑组件 `ChangelogRelease`

**Files:**
- Create: `apps/docs/src/components/shared/changelog/ChangelogRelease.tsx`

- [ ] **Step 1: 写组件**

```tsx
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { Release } from '@/data/changelog.types';

import { ChangelogPackageBlock } from './ChangelogPackageBlock';

/** 时间线锚点 id(供左 rail 点击滚动 / scroll-spy 定位) */
export const releaseAnchorId = (minor: string): string => `release-${minor.replace(/[^\w.-]/g, '-')}`;

export type ChangelogReleaseProps = {
  release: Release;
  lang: Lang;
};

/** 一个中版本里程碑:锚点 section + 各包块 */
export const ChangelogRelease: FC<ChangelogReleaseProps> = ({ release, lang }) => (
  <section id={releaseAnchorId(release.minor)} className="scroll-mt-24 space-y-6">
    {release.packages.map(block => (
      <ChangelogPackageBlock key={block.pkg} block={block} lang={lang} />
    ))}
  </section>
);
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/ChangelogRelease.tsx
git commit -m ":sparkles: changelog 里程碑组件 + 锚点"
```

---

## Task 11: 左时间线 `ChangelogTimeline`

**Files:**
- Create: `apps/docs/src/components/shared/changelog/ChangelogTimeline.tsx`

- [ ] **Step 1: 写组件**(节点=日期/开发中 + 各包名+版本;点击滚动;scroll-spy 高亮)

```tsx
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL, type Release } from '@/data/changelog.types';

import { releaseAnchorId } from './ChangelogRelease';

/** sticky header 高度 + 留白 */
const SCROLL_OFFSET = 80;

export type ChangelogTimelineProps = {
  /** 已按筛选过滤后的里程碑(节点内的包行也只显示可见包) */
  releases: Array<Release>;
  lang: Lang;
};

/** 左侧时间线 rail:每个里程碑一个节点 */
export const ChangelogTimeline: FC<ChangelogTimelineProps> = ({ releases, lang }) => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (releases.length === 0) return;
    const ids = releases.map(r => releaseAnchorId(r.minor));
    const update = () => {
      let current = ids[0] ?? '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - SCROLL_OFFSET <= 0) current = id;
        else break;
      }
      setActiveId(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [releases]);

  const scrollTo = (minor: string) => {
    const el = document.getElementById(releaseAnchorId(minor));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="hidden @[48rem]:block">
      <ul>
        {releases.map(release => {
          const id = releaseAnchorId(release.minor);
          const active = activeId === id;
          return (
            <li key={release.minor} className="relative mb-6 pl-5 last:mb-0">
              <span
                className={cn(
                  'absolute left-0.5 top-1.5 size-2.5 rounded-full bg-foreground',
                  active && 'ring-4 ring-foreground/15',
                )}
              />
              <button
                type="button"
                onClick={() => scrollTo(release.minor)}
                className="block cursor-pointer text-left"
              >
                <span className={cn('text-sm font-semibold tabular-nums', !release.stableDate && 'font-medium italic text-muted-foreground')}>
                  {release.stableDate ?? t('changelog.inDevelopment')}
                </span>
                <span className="mt-1 flex flex-col gap-0.5">
                  {release.packages.map(block => (
                    <span key={block.pkg} className="font-mono text-[11px] text-muted-foreground">
                      {PACKAGE_LABEL[block.pkg][lang]} <span className="opacity-80">{block.version}</span>
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/ChangelogTimeline.tsx
git commit -m ":sparkles: changelog 左时间线 rail(scroll-spy + 点击定位)"
```

---

## Task 12: 右筛选 `ChangelogFilter`

**Files:**
- Create: `apps/docs/src/components/shared/changelog/ChangelogFilter.tsx`

- [ ] **Step 1: 写组件**

```tsx
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL } from '@/data/changelog.types';
import { changelog } from '@/data/changelog';
import { useChangelogFilterStore } from '@/store/useChangelogFilterStore';

import { allPackageIds } from './filter';

export type ChangelogFilterProps = {
  lang: Lang;
};

/** 右侧多选包筛选(替代 TOC) */
export const ChangelogFilter: FC<ChangelogFilterProps> = ({ lang }) => {
  const { t } = useTranslation();
  const selected = useChangelogFilterStore(s => s.selected);
  const toggle = useChangelogFilterStore(s => s.toggle);
  const packages = allPackageIds(changelog);

  return (
    <nav>
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('changelog.filterPackages')}
      </p>
      <ul className="space-y-1.5">
        {packages.map(pkg => {
          const on = selected.includes(pkg);
          return (
            <li key={pkg}>
              <button
                type="button"
                onClick={() => toggle(pkg)}
                aria-pressed={on}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1 font-mono text-xs transition-colors',
                  on ? 'border-foreground font-semibold text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span className={cn('size-2 rounded-[3px] bg-foreground transition-opacity', on ? 'opacity-70' : 'opacity-25')} />
                {PACKAGE_LABEL[pkg][lang]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。

- [ ] **Step 3: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/ChangelogFilter.tsx
git commit -m ":sparkles: changelog 右侧多选筛选"
```

---

## Task 13: 中栏容器 `ChangelogView` + 桶导出

**Files:**
- Create: `apps/docs/src/components/shared/changelog/ChangelogView.tsx`
- Create: `apps/docs/src/components/shared/changelog/index.ts`

- [ ] **Step 1: 写 `ChangelogView`**(2 列 grid:时间线 + 发布列表;空筛选态;窄屏时间线降级为内联头)

```tsx
import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { changelog } from '@/data/changelog';
import { useChangelogFilterStore } from '@/store/useChangelogFilterStore';

import { ChangelogRelease } from './ChangelogRelease';
import { ChangelogTimeline } from './ChangelogTimeline';
import { filterReleases } from './filter';

/** changelog 中栏:左时间线 rail + 右发布列表 */
export const ChangelogView: FC = () => {
  const { i18n, t } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const selected = useChangelogFilterStore(s => s.selected);
  const visible = useMemo(() => filterReleases(changelog, new Set(selected)), [selected]);

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('changelog.emptyFilter')}</p>;
  }

  return (
    <div className="@container grid grid-cols-1 gap-8 @[48rem]:grid-cols-[150px_1fr]">
      <aside className="@[48rem]:sticky @[48rem]:top-20 @[48rem]:self-start">
        <ChangelogTimeline releases={visible} lang={lang} />
      </aside>
      <div className="min-w-0 space-y-12">
        {visible.map(release => (
          <ChangelogRelease key={release.minor} release={release} lang={lang} />
        ))}
      </div>
    </div>
  );
};
```

> 说明:`ChangelogTimeline` 内部已用 `hidden @[48rem]:block` 控制窄屏隐藏;此处 grid 在窄屏退为单列。窄屏的「日期+包/版本」内联头可在后续 polish 加(本次范围以 rail 为主,窄屏直接看内容块的包名+版本徽章即可)。

- [ ] **Step 2: 写桶导出 `index.ts`**

```ts
export { ChangelogView } from './ChangelogView';
export { ChangelogFilter } from './ChangelogFilter';
export { changelogToMarkdown } from './changelogToMarkdown';
```

- [ ] **Step 3: 类型检查 + 构建**

Run: `pnpm --filter @retikz/docs exec tsc -b`
然后: `pnpm --filter @retikz/docs build`
Expected: 均通过(组件链路完整,无 import 缺失)。

- [ ] **Step 4: 提交**(执行前确认)

```bash
git add apps/docs/src/components/shared/changelog/ChangelogView.tsx apps/docs/src/components/shared/changelog/index.ts
git commit -m ":sparkles: changelog 中栏容器 + 桶导出"
```

---

## Task 14: i18n 文案

`zh.json` / `en.json` 结构必须保持一致(`en` 由 `I18nResources` 类型强制对齐)。在两文件顶层加一个 `changelog` 对象(放在 `about` 之后即可)。

**Files:**
- Modify: `apps/docs/src/i18n/locales/zh.json`
- Modify: `apps/docs/src/i18n/locales/en.json`

- [ ] **Step 1: zh.json 加文案组**

在 `"about": { ... }` 这一块之后插入:

```json
  "changelog": {
    "filterPackages": "筛选包",
    "inDevelopment": "开发中",
    "prereleaseCount": "共 {{count}} 个预发布",
    "collapse": "收起预发布",
    "emptyFilter": "没有匹配所选包的内容,请在右侧勾选至少一个包。"
  },
```

- [ ] **Step 2: en.json 加同结构文案组**

在对应位置插入:

```json
  "changelog": {
    "filterPackages": "Filter packages",
    "inDevelopment": "In development",
    "prereleaseCount": "{{count}} pre-releases",
    "collapse": "Collapse pre-releases",
    "emptyFilter": "Nothing matches the selected packages. Pick at least one package on the right."
  },
```

- [ ] **Step 3: 类型检查**(验证 zh/en 结构对齐,`en: I18nResources` 不报错)

Run: `pnpm --filter @retikz/docs exec tsc -b`
Expected: 通过。若报 `en` 不可赋值给 `I18nResources`,说明两边 key 不一致——对齐它们。

- [ ] **Step 4: 提交**(执行前确认)

```bash
git add apps/docs/src/i18n/locales/zh.json apps/docs/src/i18n/locales/en.json
git commit -m ":globe_with_meridians: changelog 界面文案(zh / en)"
```

---

## Task 15: DocPage 接入

让 `DocPage` 在 changelog 页用 `<ChangelogView>` / `<ChangelogFilter>` 替代 mdx 与 TOC,并用 `changelogToMarkdown` 喂 AI 上下文。

**Files:**
- Modify: `apps/docs/src/layout/doc-layout/DocPage.tsx`

参考现状:`DocPage` 用 `useDocLocation()` 得 `loc`(含 `moduleId` / `sectionId` / `pageId`);中栏渲染 `<MdxContent source={stableSource} .../>`;aside 渲染 `<MdxToc source={stableSource} />`;AI 上下文在一个 `useEffect` 里 `setAiChatCurrentPage({ title, mdx: stableSource, ... })`。

- [ ] **Step 1: 顶部加判定 + 引入**

在 import 区加:

```tsx
import { ChangelogView, ChangelogFilter, changelogToMarkdown } from '@/components/shared/changelog';
import { changelog } from '@/data/changelog';
```

在组件内、`const { source, notFound, resolvedLang } = useMdxSource();` 之后加:

```tsx
  /** changelog 页走数据驱动渲染,不走 mdx 管线 */
  const isChangelog = loc?.moduleId === 'about' && loc.sectionId === 'releases' && loc.pageId === 'changelog';
```

- [ ] **Step 2: AI 上下文按 changelog 分支**

把现有喂 AI 上下文的 `useEffect`(`setAiChatCurrentPage({ ... mdx: stableSource ... })`)里的 `mdx` 值改为按 `isChangelog` 取:mdx 页用 `stableSource`,changelog 页用序列化结果。即在该 effect 内计算:

```tsx
    const mdx = isChangelog ? changelogToMarkdown(changelog, aiChatLang) : stableSource;
```

并把 `setAiChatCurrentPage` 调用里的 `mdx: stableSource` 改成 `mdx`;同时把 effect 的早退条件 `stableSource == null` 放宽为 `!isChangelog && stableSource == null`(changelog 页没有 stableSource 也要喂上下文),并把 `isChangelog` / `aiChatLang` 加进依赖数组。

- [ ] **Step 3: 中栏渲染分支**

把中栏这段:

```tsx
            {notFound ? (
              <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
            ) : (
              <MdxContent source={stableSource} onFrontmatter={setFrontmatter} />
            )}
```

改为:

```tsx
            {isChangelog ? (
              <ChangelogView />
            ) : notFound ? (
              <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
            ) : (
              <MdxContent source={stableSource} onFrontmatter={setFrontmatter} />
            )}
```

- [ ] **Step 4: aside 渲染分支**

把 aside 里这段:

```tsx
          {stableSource != null && <MdxToc source={stableSource} />}
```

改为:

```tsx
          {isChangelog ? <ChangelogFilter lang={aiChatLang} /> : stableSource != null ? <MdxToc source={stableSource} /> : null}
```

- [ ] **Step 5: 页描述按 changelog 分支**

`DocPage` 用 `frontmatter.description` 作副标题(`<InlineMdx source={description} .../>`)。changelog 没有 frontmatter,需改用数据模块导出的描述。在 `const description = ...` 处改为:

```tsx
  const description = isChangelog
    ? changelogPageDescription[aiChatLang]
    : typeof frontmatter.description === 'string'
      ? frontmatter.description
      : null;
```

并在 import 区补:`import { changelog, changelogPageDescription } from '@/data/changelog';`(与 Step 1 合并为一条 import)。

> 注意:`aiChatLang` 在组件里定义于 AI 上下文段(`const aiChatLang: 'zh' | 'en' = ...`)。确保 `description` 的计算位置在 `aiChatLang` 之后;若顺序不便,可在组件顶部附近提前定义 `aiChatLang`(它只依赖 `i18n.resolvedLanguage`),再供后续复用。

- [ ] **Step 6: 类型检查 + 构建 + lint**

Run: `pnpm --filter @retikz/docs exec tsc -b`
然后: `pnpm --filter @retikz/docs build`
然后: `pnpm --filter @retikz/docs lint`
Expected: 均通过。

- [ ] **Step 7: 手动验证**

Run: `pnpm --filter @retikz/docs dev`,开 `http://localhost:5173/about/releases/changelog`,核对:
- 左时间线 3 节点(v0.2 显「开发中」,v0.1/v0.0 显日期),点击滚动定位、滚动高亮
- 中栏按包分块,描述 + highlights 常驻,「共 N 个预发布」可展开/收起、展开见逐版日期
- 右侧多选筛选,取消某包即时隐藏其块;全不选见空态
- 切换中英,文案与内容随之切换
- 站内链接(如 `/core/reference/...`)可点

- [ ] **Step 8: 提交**(执行前确认)

```bash
git add apps/docs/src/layout/doc-layout/DocPage.tsx
git commit -m ":sparkles: DocPage 接入 changelog 数据驱动渲染 + 包筛选 aside"
```

---

## Task 16: 清理旧物

确认新版生效后,删除旧 mdx 与 `<Update>`。

**Files:**
- Delete: `apps/docs/src/contents/about/releases/changelog/index.zh.mdx`
- Delete: `apps/docs/src/contents/about/releases/changelog/index.en.mdx`
- Delete: `apps/docs/src/components/shared/update/Update.tsx` + `index.ts`(整个 `update/` 目录)
- Modify: `apps/docs/src/components/shared/mdx-content/components.tsx`

- [ ] **Step 1: 注销 `Update`**

在 `components.tsx`:删 `import { Update } from '../update';`,并从 `mdxComponents` 对象里删 `Update,` 这一项。

- [ ] **Step 2: 删文件**

```bash
git rm apps/docs/src/contents/about/releases/changelog/index.zh.mdx \
       apps/docs/src/contents/about/releases/changelog/index.en.mdx \
       apps/docs/src/components/shared/update/Update.tsx \
       apps/docs/src/components/shared/update/index.ts
```

- [ ] **Step 3: 确认无残留引用**

Run: `pnpm --filter @retikz/docs exec tsc -b`
再全局搜:确认没有别处再 import `update` 或 `<Update`(预期只有刚改的 `components.tsx`,且已清干净)。
Expected: tsc 通过、无悬空引用。

- [ ] **Step 4: 构建 + 全量单测**

Run: `pnpm --filter @retikz/docs build`
然后: `pnpm --filter @retikz/docs test:run`
Expected: build 通过;单测全绿(filter / changelogToMarkdown / data 三组 + 既有 smoke/walker/registry/parser 不受影响)。

- [ ] **Step 5: 提交**(执行前确认)

```bash
git add -A
git commit -m ":fire: 删旧 changelog mdx + <Update> 组件"
```

---

## Task 17: 收尾验证

- [ ] **Step 1: 全链路检查**

```
pnpm --filter @retikz/docs lint
pnpm --filter @retikz/docs exec tsc -b
pnpm --filter @retikz/docs test:run
pnpm --filter @retikz/docs build
```
Expected: 四项全过。

- [ ] **Step 2: 手动复核**(同 Task 15 Step 7 清单)+ 验证 AI 面板:在 changelog 页打开 AI 聊天,确认「当前页上下文」为序列化后的 changelog markdown(非空)。

- [ ] **Step 3:**(可选)若 `notes/plans/v0/roadmap.md` 或 README 有「changelog 重做」类条目,勾掉并提交。

---

## Self-Review(已核对)

- **spec 覆盖**:数据模型(Task 1/4)、组件结构(7–13)、DocPage 接入+共享 store(6/15)、时间线/筛选行为(11/12)、日期来源(Task 4 日期表)、删旧物+i18n(14/16)、响应式(11/13 grid)、测试(2/3/5)、非目标(搜索未纳入)——逐条有对应任务。
- **占位符**:仅 Task 4 的 v0.1/v0.0 为受控 TODO(有完整迁移规则 + v0.2 范例 + 日期表),Step 2 明确「补全并删 TODO」为完成判据;其余步骤均含完整代码/命令。
- **类型一致**:`filterReleases(releases, Set<PackageId>)`、`changelogToMarkdown(releases, lang)`、`releaseAnchorId(minor)`、`PACKAGE_LABEL[pkg][lang]`、`ChangelogItems`/`ChangelogSubVersions`/`ChangelogPackageBlock`/`ChangelogRelease`/`ChangelogTimeline`/`ChangelogFilter`/`ChangelogView` 的 props 在各任务间一致;store `selected: PackageId[]` 与 `new Set(selected)` 消费一致;i18n key `changelog.{filterPackages,inDevelopment,prereleaseCount,collapse,emptyFilter}` 在组件与文案任务间一致。

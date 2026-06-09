# ADR-05：文档与包描述当前能力面刷新——清掉「只提供 React adapter」「v0.1 core」「仅 SVG」等陈旧表述

- 状态：Proposed
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) TODO-5 · **联动**：[本批 ADR-01](./01-stealth-hollow-arrow-parity.md)（schema `.describe()` 内置箭头清单也属当前能力面）

## 背景

v0.3 已从「core + react」扩成四个 core 相关包：`@retikz/core`、`@retikz/render`（SVG + Canvas 2D 双后端，子路径导出）、`@retikz/react`（SVG + Canvas 双 renderer）、`@retikz/vanilla`（无框架 runtime：`mountSvg` / `mountCanvas` / `hydrate` / SSR string / 动画）。

但多处文档与包描述仍停在旧能力面。封版前扫到的**具体陈旧字符串**（不会致代码错误，但伤封版观感与 npm 第一印象）：

| 位置 | 现状（陈旧） | 问题 |
|---|---|---|
| `packages/core/core/package.json` | `"retikz v0.1 core: ..."` | 版本标签停在 v0.1 |
| `packages/core/react/package.json` | `"...Kernel/Sugar JSX components and SVG renderer."` | 只提 SVG，漏 Canvas |
| `packages/core/vanilla/package.json` | `"...mount Scene/IR to SVG DOM, or render to SVG string for SSR."` | 漏 `mountCanvas` / `hydrate` / 动画 |
| `apps/docs/.../source-code-guide/index.zh.mdx:15` | 「目前官方只提供 React adapter……Canvas / SSR…交由社区或后续推进」 | render 已出 Canvas、vanilla 已出 SSR，表述自相矛盾 |
| `.../source-code-guide/index.en.mdx:15` | "Only the React adapter is officially provided today. … Canvas / SSR / … left to the community" | 同上（en/zh 同步错） |

注：`@retikz/render` 的 description 当前是准确的（`SVG (descriptor / string) and Canvas 2D. Subpath exports per backend`），无需改——避免「为改而改」。

## 决策

在 beta.1 把上述当前能力面的陈旧描述刷成与 v0.3 实际包边界一致。**只改「当前态」描述，不动历史版本段落**：

- `@retikz/core` description 去掉 `v0.1` 版本标签（描述能力，不钉版本号）。
- `@retikz/react` description 写明 SVG / Canvas 双 renderer。
- `@retikz/vanilla` description 补 `mountCanvas` / `hydrate` / SSR / 动画现状。
- Source Code Guide（zh source of truth + en 同步）的包表更新为 core / render / react / vanilla 四包，删掉「只提供 React adapter / Canvas/SSR 待社区」的过时定性，保留「IR 是 universal、新 adapter 成本在 render+measurer 层」这条仍成立的论述。

zh 是真源，en 同步（docs 双语硬规则）。

## 影响范围

- `packages/core/core/package.json`、`packages/core/react/package.json`、`packages/core/vanilla/package.json`（description）
- `packages/core/*/README.md`（若 README 复述了同样的陈旧能力面）
- `apps/docs/src/contents/about/developer/source-code-guide/index.{zh,en}.mdx`
- 视扫描结果可能触及 docs introduction / renderer 页面（凡硬列「仅 SVG」「仅 React」的句子）

## 非目标

- 不做 changelog 全量润色（roadmap 已定后续人工统一优化）。
- 不重写历史版本段落 / 旧 ADR。
- 不改任何实际导出 API。
- 不动 `@retikz/render` 已准确的 description。

## 测试要求

- docs test 通过。
- 改动的 `package.json` 仍可正常 parse。
- 全仓搜索不再出现「官方只提供 React adapter」/「only the React adapter is officially provided」这类当前态错误表述。
- `@retikz/core` description 不再含 `v0.1` 版本标签。

## 文档要求

- Source Code Guide 包表 = core / render / react / vanilla，能力面与实际导出一致。
- React 包描述含 SVG / Canvas 双 renderer。
- Vanilla README / description 含 `mountCanvas` / `hydrate` / SSR / 动画现状。
- en / zh 两版同步。

> 这是纯文案/描述刷新，不涉行为；判断标准：用户读完描述对「这个包能干什么」的预期，要与 v0.3 实际导出一致。

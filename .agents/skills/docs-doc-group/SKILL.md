---
name: docs-doc-group
description: retikz 文档站「分组落地页」写法——带 children 的分组节点（如 components/node、components/draw、reference/schema、reference/runtime）自己的 index.{zh,en}.mdx。结构：介绍分组作用 + 可选配图 + 职责表（组件家族用 类型 Sugar/Kernel 列；参考家族换成 主题/何时查阅）+ LinkedCard 子页索引。分组页是家族视角 / 导航 hub，不复述子页（overview 等）的完整 API。通用规则见 docs-doc-principle，配图走 docs-figure-draw。retikz 专用。
---

# 分组落地页写法

## 何时用本 skill

- 给一个**带 children 的分组节点**（`data/<module>.ts` 里有 `children` 的 Page / SubPage）写它自己的落地页：`contents/<module>/<...>/<group>/index.{zh,en}.mdx`
- 现有分组：`components/node`、`components/draw`、`reference/schema`、`reference/runtime`
- 动手前**先读** [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿通用规则；配图细节走 [`docs-figure-draw`](../docs-figure-draw/SKILL.md)

分组页是新手的导航入口，不是维护者的目录索引。导言先解释“这一组帮你解决哪类问题、应该从哪页开始读”，再列成员职责；不要默认读者已经知道 Kernel / Sugar / Reference / runtime 这些分层术语。

## 机制：分组现在有自己的页面

分组节点（`data/<module>.ts` 里带 `children`）**有自己的 `index.{zh,en}.mdx`**，放在分组目录根：

```
contents/core/components/node/
  index.{zh,en}.mdx            # 分组落地页（本 skill）
  overview/index.{zh,en}.mdx   # 子页（叶子，走 docs-doc-component）
  text/ ...
  coordinate/ ...
```

- 侧栏**点分组主体** → 进落地页；**点右侧 chevron** → 展开 / 收起子项（不导航）
- H1 由 DocPage 用 i18n label 渲染；frontmatter `description` 渲染在 H1 下当导言
- URL `/<module>/<section>/<group>`（3 段），路由已支持

> 新行为：分组不再「重定向到首个子项」。principle 里若还写着「分组没有 mdx / 重定向」以本 skill 为准。

## 定位：家族视角，不复述子页

分组页回答**「这一组是什么、几块怎么协作、从哪开始读」**；子页（overview / 各组件 / 各 schema）回答**「完整 props、全部用法、字段表」**。

- 分组页 = 家族视角 / 概念总览 / 导航 hub
- **不要把子页 overview 的完整 API 搬上来**——会重复。两者撞概念时，分组页讲「家族怎么配合」，overview 讲「单组件全部」
- 不放可复制学习的用法 demo（那是子页的事）；分组页的图是**叙述性插图**（`hideCode`）

## 结构（导言 + 可选配图 + 职责表 + 卡片）

按顺序：

| 段 | 必需 | 内容 |
| --- | --- | --- |
| 导言 | ✅ | frontmatter `description`（一句话定位，渲染在 H1 下）+ 一段正文：这一组在整体里负责什么 |
| 配图 | 可选（组件家族建议有） | 一张 `<ComponentPreview ... hideCode />` 叙述性插图，展示家族成员 / 关系 / 管线 |
| `## 职责一览` | ✅ | 一张表，逐个子项说职责（见「两类表」） |
| `## 章节内容` | ✅ | `<LinkedCard>` 网格，每个子页一张卡 |

frontmatter `title` + `description` 始终在；正文不写 `# 标题`（H1 走 DocPage）。

## 两类分组：表格列不同

**Sugar/Kernel 只对组件成立**，参考类没有这个轴，表要换。

### 组件家族（`components/*` 下的分组，如 node / draw）

列：`组件 | 类型 | 职责 | 适合场景`（en：`Component | Type | Responsibility | Use it when`）

- `类型` 填 **Sugar / Kernel**，权威来源是 `concepts/layers`：
  - Kernel：`TikZ` / `Node` / `Coordinate` / `Path` / `Step`
  - Sugar：`Draw` / `Text` / `Way`(DrawWay) / 相对坐标字符串
- 不是严格组件的子项照实标：`Way` 归 Sugar（Draw 的 way 写法），`Arrow` 标「通用 / Shared」（Path、Draw 共用的箭头配置）

### 参考家族（`reference/*` 下的分组，如 schema / runtime）

不是组件，Sugar/Kernel 不适用。列换成：`主题 | 职责 | 何时查阅`（en：`Topic | Responsibility | Reach for it when`），并在导言后加一句参考层提示：

```mdx
> 这里是参考层，不是组件文档；写图请从 [组件](/core/components/tikz) 开始。
```

## LinkedCard 子页索引

每个 child 一张卡，`LinkedCard` 是注册过的 MDX 元素：

```mdx
## 章节内容

<div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
  <LinkedCard href="/core/components/node/overview">
    <span className="font-semibold">Node</span>
    <span className="mt-1 text-center text-sm text-muted-foreground">形状、文字、样式、定位与标签的完整用法</span>
  </LinkedCard>
  {/* ……每个子页一张 */}
</div>
```

- `href` 指向子页真实路径（`/` 开头走 react-router）；改子页 id 时一起改
- 卡内：第一行 `font-semibold` 子页名（与 sidebar i18n label 对齐），第二行 `text-sm text-muted-foreground` 一句话定位
- 一行两列（`sm:grid-cols-2`）

## 配图思路

| 分组 | 图 |
| --- | --- |
| 组件家族（node / draw） | 家族 / 解剖图：成员（及 Sugar→Kernel 关系）画在一张图上，灰色备注在下方点注 |
| 参考家族（runtime） | 管线示意：`JSX → IR → Scene → 渲染目标`，灰注各 API 在哪起作用 |
| 参考家族（schema） | 可省；schema 是数据形状，表 + 卡足够 |

图一律走 [`docs-figure-draw`](../docs-figure-draw/SKILL.md)：`hideCode`、备注灰色（关键字 `gray`）且置于被标注元素**下方**、强调色用 `orange`、纯技术 label 用单文件。

## Common Mistakes

- **把子页 overview 的完整 API 抄进分组页** —— 分组页只讲家族视角，API 留在子页
- **参考家族硬套 Sugar/Kernel 列** —— schema/runtime 不是组件，用 `主题 | 职责 | 何时查阅`
- **配图放 demo 源码** —— 分组页的图是叙述性插图，必须 `hideCode`
- **LinkedCard href 不跟子页 id 同步** —— 改子页路径时一起改，否则断链
- **正文又写 `# 标题`** —— H1 走 DocPage

## 验证

```bash
pnpm --filter @retikz/docs dev   # 点分组主体进落地页、点 chevron 展开、卡片链接都通
```

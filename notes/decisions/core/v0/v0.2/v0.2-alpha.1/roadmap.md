# v0.2.0-alpha.1 实施待办：`<Scope>` IR 容器 + 局部 transform

> 写于 2026-05-16。alpha.1 计划与 ADR 在 next 分支起草；v0.1.0 出关后再开实施代码。完工后保留留档（摘要见 v0.2.md 跟踪段）。
>
> 关联：[`v0.2 总计划`](./v0.2.md) · [`v0 roadmap §v0.2 预备`](./roadmap.md) · [`alpha.1 ADRs`](../../adr/v0/v0.2-alpha.1/)

## 背景与定位

alpha.1 是 v0.2 第一段：引入 IR 层的 `<Scope>` 容器，承接 TikZ `\begin{scope}` 用户语义——分组 + 局部 transform；样式继承（`nodeDefault` / `pathDefault`）放到 alpha.2 单独闭环，alpha.1 **只做容器本身 + transform + 跨 scope anchor/nodeIndex 解析**。

Q2 决策：retikz 只引入 `<Scope>` 一个 IR 一等基元，Scene Tier 3 `GroupPrim` 不动（compile 时 IRScope 下沉到 GroupPrim）。`<Group>` 不在 IR 公开。

## 进度看板

| # | 标题 | 状态 | 工作量 | 优先级 |
|---|---|---|---|---|
| 1 | [Scope IR schema + compile 下沉到 GroupPrim](../../adr/v0/v0.2-alpha.1/01-scope-ir-and-compile.md)（含 `scope.id` 字段 + PolarTranslate 第 4 transform 变体） | ✅ Accepted | 大 | P0 |
| 2 | [nodeIndex / anchor 跨 scope 解析](../../adr/v0/v0.2-alpha.1/02-node-index-anchor-resolution.md)（id 冲突共享命名空间 + 前向引用） | ✅ Accepted | 中 | P0 |
| 3 | [scope.id 注册 synthetic bbox layout](../../adr/v0/v0.2-alpha.1/03-scope-id-bounding-box.md)（scope 作为整体引用目标，对应 TikZ `local bounding box`） | ✅ Accepted | 中 | P0 |
| 4 | [scope 下相对定位语义](../../adr/v0/v0.2-alpha.1/04-relative-position-in-scope.md) | ✅ Accepted | 中 | P0 |

---

## TODO-1 — Scope IR schema + compile 下沉

详 [`ADR-01`](../../adr/v0/v0.2-alpha.1/01-scope-ir-and-compile.md)。要点：

- 加 `IRScope = { type: 'scope', id?: string, transforms?: IRTransform[], children: IRChild[] }`，作为 IRChild 第 4 类 discriminator（已有 node / path / coordinate）
- 嵌套：children 含 IRScope 自己 → 任意深度
- IR 层 `Transform` 4 变体：translate / **polar-translate**（新增，对应 TikZ `[shift={(angle:radius)}]`）/ rotate / scale；polar-translate compile 展平为 Cartesian 再下沉 Scene `GroupPrim`
- `scope.id` 可选——设值则 scope 注册为 synthetic rectangle layout 供外部引用（具体语义详 ADR-02）
- compile 时 IRScope 下沉到 GroupPrim（一层 IRScope = 一层 GroupPrim，transforms 展平后透传）

## TODO-2 — nodeIndex / anchor 跨 scope 解析

详 [`ADR-02`](../../adr/v0/v0.2-alpha.1/02-node-index-anchor-resolution.md)。要点：

- **nodeIndex 全局扁平**：scope 内 node 仍可被外层 path 通过 `id` 引用（与 v0.1 行为一致，不引入 scope 局部命名空间）
- **anchor 坐标投影**：scope 内 node 的 layout 在局部坐标系；外层引用 `.north` / `.30` 时由 transform 链投影到全局
- ID 唯一性：跨 scope 不允许 id 重复（含 node / coordinate / **scope.id** 共享命名空间），id 冲突 compile 抛错 `DUPLICATE_NODE_ID`
- 前向引用规则：scope 内 / 跨 scope 的引用全部沿用 v0.1 规则（被引用者必须先定义）

## TODO-3 — scope.id 注册 synthetic bbox layout

详 [`ADR-03`](../../adr/v0/v0.2-alpha.1/03-scope-id-bounding-box.md)。要点：

- scope.id 设值时 Pass 1 结束后算 scope 子树的 axis-aligned 全局 bbox
- 注册为 synthetic rectangle NodeLayout 进 nodeIndex（shape='rectangle', rect.rotate=0）
- 外层 path / position 用 `scope-id` / `scope-id.north` / `scope-id.30` 引用 → 走与普通 rectangle Node 完全一致 anchor 路径
- 不发 Scene primitive（synthetic layout 仅为引用目标，不参与渲染）
- 空 scope 设 id → bbox 退化为 0×0 占位点

## TODO-4 — scope 下相对定位语义

详 [`ADR-04`](../../adr/v0/v0.2-alpha.1/04-relative-position-in-scope.md)。要点：

- `Node.position = { of, direction, distance? }`（AtPosition）/ `{ of, offset }`（OffsetPosition）/ `{ origin, angle, radius }`（PolarPosition）在 scope 下的语义
- 关键决策：relative 部分在**当前 scope 局部坐标系**度量；referent 坐标取全局；末端 apply 当前 scope transform chain 投影回全局
- scope chain 传到 `resolvePosition` 时已是 Cartesian-only 3 变体（polar-translate 由 ADR-01 在 chain 累积前展平）

---

## 文档结构调整（alpha.1 顺手做）

- 现 `apps/docs/src/contents/core/components/tikz/` 是叶子页（`index.{en,zh}.mdx` + 2 demo 直接平铺）
- alpha.1 落地时同步重构成组：
  - `tikz/overview/` ← 现有 `tikz/{index.{en,zh}.mdx, tikz-basic.demo.tsx, tikz-from-ir.demo.tsx}` 全部迁入
  - `tikz/scope/` ← 新建 Scope 文档（4 篇 ADR 涉及的 demo + 双语 mdx）
- 此调整对齐 `node/` 现有模式（`node/overview` + `node/coordinate` + `node/text`）；公开文档 URL 形态变化，rc 之前可改

## 验收（alpha.1 闭环）

- 四个 ADR 全部 Accepted
- 实施代码出关：`<Scope>` 能嵌套；transform 数组按 outside-in 复合正确
- 跨 scope 命名引用 anchor 解析正确
- 测试 ≥ 30 个新 case（按 ADR 测试象限累计）
- mdx 文档 `apps/docs/src/contents/core/components/tikz/scope/index.{en,zh}.mdx` 新建（双语 + demo）
- AGENTS.md 加 Scope 章节
- 无破坏 v0.1 已有测试

## 待 alpha.1 实施前再决议（不进 ADR，先记此）

- **空 Scope 行为**（ADR-01 决策细节 7 已拍但实施期再确认）：children 空 + transforms 空 + id 缺省 → 省略 GroupPrim emit；任一非空 → 仍处理
- **transform 顺序约定**：`<Scope transforms={[t1, t2]}>` 内 children 看到的坐标系是先 t1 后 t2 还是相反？参 Scene `GroupPrim` 现有约定（数组顺序应用，ADR-01 决策细节 6 已锁）
- **polar-translate kind 字面量名**：`'polar-translate'`（限定词在前）vs `'translate-polar'`（限定词在后）；ADR-01 倾向前者，实施期再确认

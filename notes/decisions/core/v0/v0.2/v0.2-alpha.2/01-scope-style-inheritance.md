# ADR-01：Scope 样式继承（扁平 every-X 默认 + 主色 color + resetStyle 屏障）

- 状态：Accepted（已实现）
- 决策日期：2026-05-21
- 关联：[v0 roadmap §v0.2](../../roadmap.md) · [v0.2 总计划 §alpha.2 设计预想](../roadmap.md#alpha2-设计预想scope-样式子集) · [core-design.md §1.2 AI 一等公民](../../../../../architecture/core-design.md) · [alpha.1 ADR-01 Scope 容器](../v0.2-alpha.1/01-scope-ir-and-compile.md) · [alpha.1 ADR-02 inside-out lookup](../v0.2-alpha.1/02-node-index-anchor-resolution.md)

## 背景

alpha.1 落了 `<Scope>` IR 容器但**只做容器本身**（分组 + 局部 transform + 跨 scope anchor 解析），样式继承显式留给 alpha.2。

塑造方案的硬约束 —— 对照 TikZ 的样式继承，它靠两套**正交**机制（不是一棵通道树）：

1. **`every X` 每类默认样式**（扁平、按元素）：`every node` / `every path` / `every label` …。label is-a node，唯一的"父子"是 element-is-a、不是按方面（没有 `every text`，文字是 node 的选项）。
2. **主色 `color=` + 分项覆盖**：`color=red` 设**当前色**，stroke / fill / **文字** 全默认成它；`draw=` / `fill=` / `text=` 各自只覆盖一项；箭头随描边色。"label / arrow 跟线同色"本质是它们都读同一个当前色 —— `color=red` 跟、`draw=red` 不跟。

retikz 现状缺第 2 套：只有 `stroke` / `fill` / `textColor` 分项、**没有主色**，所以颜色跟随一直要靠补丁（ADR-02 早稿的"段级 stroke 推导"即补丁，且不 TikZ：`draw=red` 时 TikZ label 不变色，我们却让它变）。本 ADR 把这两套机制补齐。

## 决策：扁平 every-X 四通道 + 主色 color

`color` 主色加到 Scope（级联）+ Node + Path + 各 default map + LabelDefault（StepLabel 用 `textColor`）；四通道 every-X 默认 `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` 各从对应 schema `.omit()` 派生、独立无父子、全 optional 禁 `.default()`；`resetStyle` 作继承屏障。完整 schema 见 `core/src/ir/scope.ts`，解析在 `core/src/compile/scope.ts`。

理由：

1. **最贴 TikZ**：扁平 every-X + 主色与 `every node/path/label` + `color=` 一一对应；LLM 对 `color=` 烂熟。
2. **一个机制解决颜色跟随**：label / arrow / 文字跟色 = 读同一已解析主色，不需 host 回退树，且修掉 ADR-02"跟 stroke"的偏离（`draw=` 不跟、`color=` 跟，与 TikZ 一致）。
3. **扁平 < 树**：四通道独立、无父子轴 + 无实例 host 轴，merge 只剩 model A 一条轴。
4. **复用 alpha.1**：嵌套 fold 与 ADR-02 inside-out 同方向；compile 解析进具体 primitive，保持 renderer-neutral。

### 决策细节（拍板的 WHY）

- **优先级链**（每个色 / 样式分项，就近）：`元素显式分项 > 元素 color > every-X 分项 > every-X color > scope 级联分项 > scope color > 内置`（scope 那几档沿 scope 链就近、内层整体压外层）。即元素自身意图整体优先于外层任何来源，每个来源内分项盖主色。非色字段（strokeWidth / shape / font / dash / minimum* …）不参与主色，只走 `元素显式 > every-X > scope 级联(若共享字段) > 内置`。
- **主色展开**：同源内若某分项色（stroke/fill/textColor，arrow 的 color）未在同源显式给，取该源的 `color`（同源内分项覆盖主色）。
- **颜色级联**（= TikZ current color）：容器已解析 `color` 下传子元素色默认 —— node.color → 内部文字 + 边 label；path.color → stroke + arrow + step label。
- **级联 graphic state 字段集**（7）：`color + stroke + fill + strokeWidth + opacity + fillOpacity + drawOpacity` 级联到全部元素。node 形状专属（shape / minimum* / inner* / outer* / scale / 文本类）只进 `nodeDefault`，path 专属（dashPattern / lineCap …）只进 `pathDefault`。dash 因 node 与 path 命名不同不进级联、各走自己 default。
- **per-field 合并**：按存在性 merge（`!== undefined`），缺省让位、显式 `none`/`0`/`false` 截断；内置默认 fold 末尾补；禁 schema `.default()`。
- **opacity 替换不复合**（TikZ 默认）：逐元素解析，compile 不落 scope `<g opacity>`；元素内 label×元素 opacity 相乘是另一轴。
- **`resetStyle`**（`boolean | ('node'|'path'|'label'|'arrow')[]`）：只切 **scope 继承轴**（外层级联 graphic state + every-X 默认）、只朝外，正交于 transforms / localNamespace / scope.id bbox。**不碰实例-host 轴** —— label / arrow 仍跟随**所属 path/node 的已解析颜色**（结构关系、非 scope 继承），避免脱离其线/节点成"孤岛"。`resetStyle=true` 把 scope 通道归零后 host-following 照常流动归零值（线 baseline 黑、label/arrow 跟着黑、仍不孤岛）；想让 label 真脱离线色 → 元素级显式 `textColor`（或未来 `'initial'`），不归 resetStyle。
- **arrow 跟色**：`arrow.color ← 宿主 path 已解析 color`（端点级，元素显式 `arrowDetail.color` 仍最高）；`shape/scale/length/width` 无 path 对应、只 `arrowDefault > 内置`。`arrow.lineWidth ← path.strokeWidth` / `arrow.fill ← arrow.color` 的主色映射本 alpha 推迟（render 端按现有兜底继承 path stroke）。
- **`labelDefault` 单通道双宿主**：node-label→node.color、step-label→path.color（细节 ADR-02）。
- **未知 key**：`.strict()` 严拒，错误信息列合法字段集。

### 被否决的选项

- **B：通道树（node→text、draw→{label, arrow}）+ host 回退** —— 直觉上"label 属于 draw"，但 **TikZ 没有这结构**（扁平 every-X + 正交主色）；"label/arrow 跟线"本质是主色共享、不是通道回退。通道树要叠"通道父子 + 实例 host"两条轴，比"扁平 + 主色"复杂，且 `text` 拆出无 TikZ 先例（文字是 node 选项）。
- **C：命名 style（`mystyle/.style` + `[mystyle]`）** —— 跨 IR 引用的具名样式包，v0.2 §范围外（YAGNI）。

## 不在本 ADR 范围

- **StepLabel `textColor`/`opacity`/`font` + label 继承顺序** → [ADR-02](./02-step-label-style.md)。
- **per-field `'initial'` / `'inherit'` 哨兵** → 未来。
- **命名 style / 形状特化 every** → v0.2 §范围外。
- **transparency group（组级半透明）** → 未来 opt-in。

---

> **实现指针**：level `red`（动 `ir/**` + `compile/**` + 包 index 公开导出；Node/Path 加 `color` 亦红）、additive 非 breaking（新增字段全 optional）。真源以代码为准 —— `ScopeSchema` 4 派生 schema + 级联 graphic state + 四通道 + `resetStyle`（`core/src/ir/scope.ts`）、`NodeSchema.color`（`core/src/ir/node.ts`）、`PathSchema.color`（`core/src/ir/path/path.ts`）、主色展开 + 颜色级联 + 四通道 fold + resetStyle（`core/src/compile/scope.ts` 与 `compile/node.ts` / `compile/path/*`）、React 双向（`react/src/kernel/{Scope,builder,unbuilder}`）；测试在 `core/tests/ir/scope-style.schema.test.ts` 与 `core/tests/compile/scope-style-inheritance.test.ts`。完整原文（Schema 改动表 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

> 🔖 封板压缩 commit `5d1ed4ca`；压缩前完整施工蓝图 = `git show 5d1ed4ca^:notes/decisions/core/v0/v0.2/v0.2-alpha.2/01-scope-style-inheritance.md`。

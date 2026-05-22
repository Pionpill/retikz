# ADR-01：Scope 样式继承（扁平 every-X 默认 + 主色 color + resetStyle 屏障）

- 状态：Accepted
- 决策日期：2026-05-21
- 关联：[v0 roadmap §v0.2](../../../plans/v0/roadmap.md) · [v0.2 总计划 §alpha.2 设计预想](../../../plans/v0/v0.2.md#alpha2-设计预想scope-样式子集) · [v0.2-alpha.2 plan](../../../plans/v0/v0.2-alpha.2.md) · [DESIGN.md §1.2 AI 一等公民](../../../architecture/DESIGN.md) · [alpha.1 ADR-01 Scope 容器](../v0.2-alpha.1/01-scope-ir-and-compile.md) · [alpha.1 ADR-02 inside-out lookup](../v0.2-alpha.1/02-node-index-anchor-resolution.md)

## 背景

alpha.1 落了 `<Scope>` IR 容器，但**只做容器本身**——分组 + 局部 transform + 跨 scope anchor/nodeIndex 解析；样式继承显式留给 alpha.2。

**TikZ 怎么做样式继承**（对照后定方案）：靠两套**正交**机制，不是一棵通道树。

1. **`every X` 每类默认样式**（扁平、按元素）：`every node` / `every path` / `every label` / `every edge` …。label is-a node，所以 `every node` 先应用、`every label` 再细化——唯一的"父子"是 element-is-a，不是按方面（没有 `every text`，文字是 node 的选项）。嵌套是整体替换 / 追加。
2. **主色 `color=` + 分项覆盖**：`color=red`（或裸色 `red`）设**当前色**，stroke / fill / **文字** 全默认成它；`draw=` / `fill=` / `text=` 各自只覆盖一项；箭头随描边色。**"label / arrow 跟线同色"就是它们都读同一个当前色**——`color=red` 跟、`draw=red` 不跟。

retikz 现状缺第 2 套：只有 `stroke` / `fill` / `textColor` 分项，**没有主色**。所以颜色跟随才一直要靠各种补丁（ADR-02 早稿的"段级 stroke 推导"即是补丁，且不 TikZ：`draw=red` 时 TikZ label 不变色，我们却让它变）。本 ADR 把这两套机制都补齐。

**AI 一等公民校验**（DESIGN.md §1.2）：新增字段全 JSON 可序列化；`color` 是 TikZ 最基础词汇、LLM 烂熟；每类 default map 复用既有字段名，零额外心智；扁平结构比通道树更易 LLM 生成 / 编辑。

## 选项

### A. 扁平 every-X 四通道 + 主色 color（**推荐**）

```ts
// packages/core/src/ir/scope.ts —— 四通道各从对应 schema .omit() 派生，单一真源
export const NodeDefaultSchema  = NodeSchema.omit({ type: true, id: true, position: true, text: true, label: true }).strict();
export const PathDefaultSchema  = PathSchema.omit({ type: true, children: true, arrow: true, arrowDetail: true }).strict();  // arrow 走独立 arrowDefault
export const LabelDefaultSchema = z.object({ color: z.string().optional(), textColor: z.string().optional(), opacity: z.number().min(0).max(1).optional(), font: FontSchema.optional() }).strict();
export const ArrowDefaultSchema = ArrowDetailSchema;                                                  // shape/scale/length/width/color/fill/opacity/lineWidth

export const ScopeSchema = z.object({
  // …alpha.1 既有：type / id / localNamespace / transforms / children
  // ① 级联 graphic state（cascade 到全部元素；= TikZ scope option）
  color: z.string().optional(),          // 主色
  stroke: z.string().optional(),
  fill: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  drawOpacity: z.number().min(0).max(1).optional(),
  // ② every-X 每类默认（扁平、独立、无父子）
  nodeDefault:  NodeDefaultSchema.optional(),
  pathDefault:  PathDefaultSchema.optional(),
  labelDefault: LabelDefaultSchema.optional(),
  arrowDefault: ArrowDefaultSchema.optional(),
  // ③ 继承屏障
  resetStyle: z.union([z.boolean(), z.array(z.enum(['node', 'path', 'label', 'arrow']))]).optional(),
});

// 主色也加到元素本身（贴 TikZ 元素级 color=）
// NodeSchema += color?；PathSchema += color?；StepLabel 用 textColor（label 专属色）
```

**主色展开**：在每个样式来源（元素显式 / 每个 scope 的 nodeDefault / scope 级联）内，若某分项色（stroke/fill/textColor，arrow 的 color）**未在同源显式给**，则取该源的 `color`。即同源内 **分项覆盖主色**。

**颜色级联**（= TikZ current color）：容器已解析的 `color` 下传给子元素的色默认——node.color → 内部文字 + 边 label；path.color → stroke + arrow + step label。

**优先级链**（每个色 / 样式分项，model A 就近）：

```
元素显式分项 > 元素 color > 对应 every-X 分项 > every-X color > scope 级联分项 > scope color > 内置
（scope 那几档沿 scope 链就近优先：内层整体压外层）
```

非色字段（strokeWidth / shape / font / dash / minimum* …）不参与主色，只走 `元素显式 > every-X > scope 级联(若是共享字段) > 内置`。

### B. 通道树（node→text、draw→{label, arrow}）+ host 回退

把通道做成两族父子树，子通道回退父通道 + 实例 host。

- 优：直觉上"label 属于 draw"
- 缺：**TikZ 没有这结构**。TikZ 是扁平 every-X + 正交主色；"label/arrow 跟线"本质是主色共享，不是通道回退。通道树要叠"通道父子 + 实例 host"两条轴，比"扁平 + 主色"复杂；且 `text` 拆出无 TikZ 先例（文字是 node 选项）。

### C. 命名 style（`mystyle/.style` + `[mystyle]`）

跨 IR 引用的具名样式包。**v0.2 §范围外**（YAGNI）。

## 决策：A

理由：

1. **最贴 TikZ**（用户问的就是这个）：扁平 every-X + 主色,与 `every node/path/label` + `color=` 一一对应；LLM 对 `color=` 烂熟。
2. **一个机制解决颜色跟随**：label / arrow / 文字跟色 = 读同一已解析主色,不需要 host 回退树,也修掉 ADR-02"跟 stroke"的偏离（`draw=` 不跟、`color=` 跟,与 TikZ 一致）。
3. **扁平 < 树**：四通道独立,无父子轴 + 无实例 host 轴,merge 只剩 model A 一条轴。
4. **复用 alpha.1**：嵌套 fold 与 ADR-02 inside-out 同方向；compile 解析进具体 primitive,保持 renderer-neutral。

## 决策细节

1. **四通道扁平**：`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`,各 `.omit()` 派生,独立无父子,全 `.optional()`、**禁 `.default()`**。
2. **主色 `color`**：加到 Scope（级联）+ Node + Path + 各 default map + LabelDefault；StepLabel 用 `textColor`。同源内分项覆盖主色。
3. **scope 级联 graphic state**：`color` + 跨类共享分项（stroke / fill / strokeWidth / opacity / fillOpacity / drawOpacity）级联到全部元素；node 形状专属（shape / roundedCorners / minimum* / inner* / outer* / padding / margin / scale / rotate / 文本类）只进 `nodeDefault`；path 专属（dashPattern / lineCap / lineJoin / fillRule / thickness）只进 `pathDefault`。
4. **颜色级联**：容器已解析 color 下传子元素色默认（node→文字/边label；path→stroke/arrow/step-label）。
5. **优先级链**：见选项 A；model A 就近优先,同层分项 > 主色,跨层内 > 外。
6. **per-field 合并 + 按存在性 merge（`!== undefined`）+ 内置默认 fold 末尾补**：缺省让位、显式 `none`/`0`/`false` 截断；禁 schema `.default()`。
7. **opacity 替换、不复合**（TikZ 默认,见 [plan §opacity](../../../plans/v0/v0.2-alpha.2.md)）；逐元素解析,compile 不落 scope `<g opacity>`；元素内 label×元素 opacity 相乘是另一轴。
8. **`resetStyle`**：`boolean | ('node'|'path'|'label'|'arrow')[]`,只切**scope 继承轴**（外层级联 graphic state + every-X 默认），只朝外；正交于 transforms / localNamespace / scope.id bbox。**不碰实例-host 轴**——label / arrow 仍跟随**所属 path/node 的已解析颜色**（结构关系,非 scope 继承）,避免脱离其线/节点成"孤岛"。即 `resetStyle=['label']` 只忽略外层 `labelDefault`、label 仍属它的线/节点；`resetStyle=['arrow']` 仍跟线色；`resetStyle=true` 把 scope 通道归零后 host-following 照常流动归零值（线 baseline 黑、label/arrow 跟着黑,仍不孤岛）。想让 label 真脱离线色 → 元素级显式 `textColor`（或未来 `'initial'`），不归 resetStyle。
9. **未知 key**：`.strict()` 严拒,错误信息列合法字段集。
10. **shape 作默认值**：scope/nodeDefault 的 shape 子节点未给则继承。
11. **分项 vs 主色 跨源序**：`元素显式分项 > 元素 color > 外层 every-X 分项 > every-X color > scope 级联分项 > scope color > 内置`——元素自身意图（显式分项、其次主色）整体优先于外层任何来源；每个来源内分项盖主色（every-X 分项 > every-X color、scope 分项 > scope color）。即 `<Node color="blue">` 在 `<Scope nodeDefault={{stroke:"green"}}>` 内最终 stroke=blue（元素 color > every-X 分项）。
12. **级联 graphic state 字段集**：`color + stroke + fill + strokeWidth + opacity + fillOpacity + drawOpacity`（7）。dash 因 node（dashed/dotted/dashArray）与 path（dashPattern）命名不同,不进级联、各走自己 default。
13. **arrow 跟色映射**：`arrow.color ← 宿主 path 已解析 color`（端点级——宿主主色清掉 arrowDefault 来源的 `start`/`end.color` 让端点回退主色，元素显式 `arrowDetail`(.start/.end).color 仍最高）；`shape/scale/length/width` 无 path 对应,只 `arrowDefault > 内置`。`arrow.lineWidth ← path.strokeWidth` / `arrow.fill ← arrow.color` 的主色映射**本 alpha 推迟**（render 端仍按现有兜底继承 path stroke）。
14. **主色 `color` 上 Scope + Node + Path**：元素级 `color=` 贴 TikZ,且 ADR-02 的 path color→label 需要 path.color。
15. **`pathDefault` 排除 `arrow` / `arrowDetail`**：arrow 走独立 `arrowDefault` 通道,免双入口。
16. **`labelDefault` 单通道双宿主**：一个 labelDefault；host 按 label 种类分——node-label→node.color、step-label→path.color（细节 ADR-02）。

## 待决策点

> 本轮已全部拍板（见决策细节 11-16）。仅余推迟项见 §不在本 ADR 范围（per-field `'initial'` 哨兵 / transparency group / 命名 style）。

## DSL 表面

```tsx
import { Layout, Scope, Node, Path, Step } from '@retikz/react';

// 主色级联：整片蓝——线、节点边、文字、箭头、标注都蓝（= TikZ \begin{scope}[color=blue]）
<Scope color="blue">
  <Node position={[0, 0]}>A</Node>
  <Path arrow="->"><Step kind="move" to="A" /><Step to={[40, 0]} label={{ text: 'e' }} /></Path>
</Scope>

// 分项覆盖主色：底色蓝，描边单独红
<Node color="blue" stroke="red" position={[0, 0]}>红边蓝字蓝填</Node>

// every node（扁平）：含文本 / 形状默认（直接写 color= 染不到 shape，得 nodeDefault）
<Scope nodeDefault={{ shape: 'circle', fill: 'lightblue', font: { size: 12 } }}>
  <Node position={[0, 0]}>圆/浅蓝/12号</Node>
</Scope>

// 颜色跟随 = 主色：path color=红 → 标注、箭头都红（draw= 只染线则不跟）
<Path color="crimson" arrow="->">
  <Step kind="move" to={[0, 0]} />
  <Step to={[80, 40]} label={{ text: 'sin' }} />   {/* 标注 crimson、箭头 crimson */}
</Path>

// every arrow / every label（扁平独立）
<Scope arrowDefault={{ shape: 'stealth', scale: 1.5 }} labelDefault={{ font: { size: 10 } }}>
  <Path arrow="->"><Step kind="move" to={[0,0]} /><Step to={[50,0]} label={{ text: 'x' }} /></Path>
</Scope>

// resetStyle 屏障：切外层、本层值仍生效
<Scope color="red">
  <Scope resetStyle color="white"><Node position={[0, 0]} /></Scope>   {/* 白,非红 */}
</Scope>
```

## 测试设计

`packages/core/tests/ir/scope-style.schema.test.ts`（新建）+ `packages/core/tests/compile/scope-style-inheritance.test.ts`（新建）覆盖：四通道独立解析；主色展开 + 分项覆盖；颜色级联（scope→element→child）；优先级链；缺省/显式 none；resetStyle 四通道；opacity 替换不复合；正交 transforms/localNamespace。具体见实现契约 § 测试象限。

## 影响

- `ir/scope.ts`：4 派生 schema + ScopeSchema 加级联 graphic state + 4 通道 + resetStyle
- `ir/node.ts` / `ir/path/path.ts`：各加 `color?`（主色；**较宽 red 改动**——动既有元素 schema）
- `ir/index.ts` / `index.ts`：导出
- `compile/**`：主色展开 + 颜色级联 + 四通道 fold + resetStyle
- `react/src/kernel/{Scope,builder,unbuilder}`：新 props 双向
- 文档 + ZodSchema reference：scope 样式继承 + 主色章节
- 对外 API：Scope 加约 12 字段、Node/Path 各加 `color`,全 optional,**零破坏**

## 不在本 ADR 范围

- **StepLabel `textColor`/`opacity`/`font` + label 继承顺序（跟宿主 path 主色）+ `compile/path/label.ts`** → [ADR-02](./02-step-label-style.md)
- **per-field `'initial'` / `'inherit'` 哨兵** → 未来
- **命名 style / 形状特化 every** → v0.2 §范围外
- **transparency group（组级半透明）** → 未来 opt-in

---

## 实现契约（必填）

### Level

`red`（动 `ir/**` + `compile/**` + `index.ts`；Node/Path 加 color 亦红）

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/scope.ts` | 新建 schema | `NodeDefaultSchema` | `NodeSchema.omit{type,id,position,text,label}.strict()` | — | every node 默认（含文本/形状/间距/scale/rotate/color） |
| `ir/scope.ts` | 新建 schema | `PathDefaultSchema` | `PathSchema.omit{type,children,arrow,arrowDetail}.strict()` | — | every path 默认；arrow 走独立 arrowDefault 通道 |
| `ir/scope.ts` | 新建 schema | `LabelDefaultSchema` | `z.object({color?,textColor?,opacity?,font?}).strict()` | — | every label 默认 |
| `ir/scope.ts` | 新建 schema | `ArrowDefaultSchema` | `ArrowDetailSchema` | — | every arrow 默认（shape/scale/length/width/color/fill/opacity/lineWidth） |
| `ir/scope.ts` | 新建字段 | `ScopeSchema.color` | `z.string().optional()` | undefined | 主色；级联；stroke/fill/textColor/arrow 色未单设则随它 |
| `ir/scope.ts` | 新建字段 | `ScopeSchema.{stroke,fill,strokeWidth,opacity,fillOpacity,drawOpacity}` | 各 optional | undefined | scope 级联 graphic state（跨类共享分项） |
| `ir/scope.ts` | 新建字段 | `ScopeSchema.{nodeDefault,pathDefault,labelDefault,arrowDefault}` | 各 `*DefaultSchema.optional()` | undefined | 四通道 every-X 默认 |
| `ir/scope.ts` | 新建字段 | `ScopeSchema.resetStyle` | `z.union([z.boolean(), z.array(z.enum(['node','path','label','arrow']))]).optional()` | undefined | 继承屏障；切外层对应通道 |
| `ir/node.ts` | 新建字段 | `NodeSchema.color` | `z.string().optional()` | undefined | 节点主色；stroke/fill/textColor 未单设则随它 |
| `ir/path/path.ts` | 新建字段 | `PathSchema.color` | `z.string().optional()` | undefined | path 主色；stroke/arrow/step-label 色未单设则随它 |

### 文件 scope

- `packages/core/src/ir/scope.ts`（修改：4 派生 schema + ScopeSchema 扩字段）
- `packages/core/src/ir/node.ts`（修改：加 `color`）
- `packages/core/src/ir/path/path.ts`（修改：加 `color`）
- `packages/core/src/ir/index.ts` / `packages/core/src/index.ts`（导出）
- `packages/core/src/compile/scope.ts`（修改：主色展开 + 颜色级联 + 四通道 fold + resetStyle）
- `packages/core/src/compile/node.ts` / `compile/path/*.ts`（修改：最终样式取解析后值）
- `packages/core/tests/ir/scope-style.schema.test.ts`（新建）
- `packages/core/tests/compile/scope-style-inheritance.test.ts`（新建）
- `packages/react/src/kernel/{Scope.tsx,builder.ts,unbuilder.ts}`（修改）
- `packages/react/tests/kernel/builder.test.tsx`（扩 case）
- `apps/docs/src/contents/core/components/tikz/scope/index.{en,zh}.mdx` + `*.demo.tsx`（修改/新建）
- `apps/docs/src/contents/core/reference/schema/**`（修改）
- `AGENTS.md` / `packages/core/AGENTS.md`（修改）

### 测试象限

#### Happy path（≥ 3）

- `scope_color_cascades_all`：`<Scope color="blue">` → 内 node 边 / 文字 / path stroke / arrow / label 全蓝
- `node_default_applies`：`nodeDefault={{shape:'circle', fill:'lightblue'}}` → 子 node 圆 + 浅蓝
- `path_color_follows_to_label_arrow`：`<Path color="crimson" arrow="->">` + label → label 与 arrow 均 crimson
- `arrow_default_applies`：`arrowDefault={{shape:'stealth', scale:1.5}}` → 子 path 箭头 stealth 1.5×

#### 边界（≥ 2）

- `specific_overrides_master_same_source`：`<Node color="blue" stroke="red">` → stroke red、fill/text blue
- `missing_falls_through_to_outer`：外层 color=white ⊃ 内层无 → 继承 white
- `whole_chain_silent_builtin`：全链无色 → currentColor
- `empty_default_no_effect`：`nodeDefault={{}}` → 无变化

#### 错误路径（≥ 2）

- `default_unknown_key_rejected`：`nodeDefault={{nope:1}}` → `.strict()` 拒
- `default_excluded_field_rejected`：`nodeDefault={{position:[0,0]}}` → 拒
- `reset_style_invalid_channel_rejected`：`resetStyle={['nope']}` → 拒
- `opacity_out_of_range_rejected`：`opacity:1.5` → 拒

#### 交互（≥ 2）

- `explicit_none_overrides_outer`：外 color=white ⊃ node stroke="none" → stroke none（显式截断）
- `nested_inner_color_beats_outer`：S1 color=red ⊃ S2 color=blue ⊃ node → blue（就近）
- `node_default_beats_scope_cascade`：`<Scope stroke="red" nodeDefault={{stroke:"green"}}>` → node green（every-X > 级联）
- `reset_style_cuts_outer_keeps_own`：S1 color=red ⊃ S2 resetStyle color=white → node white、其余回内置
- `reset_style_arrow_keeps_host_color`：`<Path color="red">` 内 `resetStyle={['arrow']}` → 外层 arrowDefault 被切,但箭头仍跟宿主 path 红（host 轴不切）；node/path/label 仍继承
- `reset_style_label_keeps_host_color`：`<Scope labelDefault={{textColor:'gray'}}>` ⊃ `<Scope resetStyle={['label']}>` ⊃ `<Path color="red">` + label → label 红（切外层 labelDefault 灰、仍跟宿主线红,非孤岛）
- `opacity_per_element_no_compound`：S1 opacity .5 ⊃ S2 opacity .5 ⊃ node → 0.5（不复合）
- `style_orthogonal_to_transforms`：scope transforms + 样式 → strokeWidth 不随 scale 缩放
- `style_orthogonal_to_local_namespace`：`<Scope localNamespace color="red">` → 样式照常级联

### 依赖现有元素

- `ir/node.ts` `NodeSchema` —— **修改**（加 color）+ **引用**（派生 NodeDefaultSchema）
- `ir/path/path.ts` `PathSchema` —— **修改**（加 color）+ **引用**（派生 PathDefaultSchema）
- `ir/path/arrow.ts` `ArrowDetailSchema` —— **引用**：ArrowDefaultSchema = 它
- `ir/font.ts` `FontSchema` —— **引用**：LabelDefault.font
- `ir/scope.ts` `ScopeSchema`（alpha.1） —— **修改**：加级联 + 四通道 + resetStyle
- `compile/scope.ts`（alpha.1） —— **修改**：加主色展开 + 颜色级联 + 四通道 fold
- `compile/node.ts` / `compile/path/*.ts` —— **修改**：取解析后样式
- `react/src/kernel/builder.ts` / `unbuilder.ts` —— **修改**：新字段双向

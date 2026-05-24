# v0.2.0-alpha.2 实施待办：样式继承（扁平 every-X + 主色 color）+ StepLabel 样式扩展

> 写于 2026-05-21。v0.2 第二段；plan 与 ADR 在 next 分支起草，alpha.1 出关后再开实施代码。完工后保留留档（摘要见 v0.2.md 跟踪段）。
>
> 关联：[`v0.2 总计划 §alpha.2 设计预想`](./v0.2.md#alpha2-设计预想scope-样式子集) · [`v0 roadmap §Step label 自定义样式提案`](./roadmap.md#step-label-自定义样式提案) · [`v0.2-alpha.1.md`](./v0.2-alpha.1.md)（Scope 容器地基）· alpha.2 ADRs（`notes/adr/v0/v0.2-alpha.2/` 已起草：[ADR-01](../../adr/v0/v0.2-alpha.2/01-scope-style-inheritance.md) / [ADR-02](../../adr/v0/v0.2-alpha.2/02-step-label-style.md)）

## 背景与定位

alpha.1 落了 `<Scope>` IR 容器——分组 + 局部 transform + 跨 scope anchor/nodeIndex 解析，但**只做容器本身**，样式继承显式留给 alpha.2。

alpha.2 把 Scope 升级为"样式默认值挂点"，**贴 TikZ 的两套正交机制**（不是一棵通道树）：

1. **主色 `color=` + 分项覆盖** —— `color` 设当前色，stroke/fill/文字/箭头未单设则随它；`draw=`/`fill=`/`text=` 各自只覆盖一项。**"label / arrow / 文字跟线同色"就是它们读同一主色**（`color=` 跟、`stroke=` 不跟，与 TikZ 一致）。retikz 现状缺主色，本段补上。
2. **`every X` 每类默认样式（扁平）** —— `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`，四通道独立、无父子树。对应 TikZ `every node/path/label/...`。

StepLabel 同窗口补 `textColor` / `opacity` / `font`（见 ADR-02）。

**依赖关系**：依赖 alpha.1（Scope 是挂点）。**可与 alpha.3（ShapeRegistry）并行**（文件 scope 不交叉）。

**衡量标准**：alpha.2 完工后 retikz 能等价表达 TikZ 的 `color=` 颜色跟随 + `every <X>/.style` 每类默认；彩色线配标注用 `<Path color=...>` 即同色，不再被 `currentColor` 锁死。

## 范围（Scope 的样式表面）

Scope 上有三组样式表面 + 一个屏障：

| 组 | 字段 | 作用 |
|---|---|---|
| **① 级联 graphic state** | `color`（主色）+ 跨类共享分项 `stroke` / `fill` / `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity` | 级联到 scope 内**全部元素**（= TikZ scope option / current color） |
| **② 四通道 every-X** | `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` | 按元素类型分发默认（= TikZ every X），扁平独立 |
| **③ 屏障** | `resetStyle: boolean \| ('node'\|'path'\|'label'\|'arrow')[]` | 切外层对应通道继承 |

主色 `color` 同时加到 **Node / Path** 元素本身（贴 TikZ 元素级 `color=`；ADR-02 的"path color=红 → label 红"需要 `path.color`）。

**为什么不是"Scope 直挂 Node 样式窄子集"**（早稿方案，已弃）：那把 node 形状字段（shape/minimum*）也铺到 Scope，且没法表达"颜色跟随"。TikZ 的真实模型是**主色（跟随）+ every-X（每类默认）两套正交**——node 形状专属字段进 `nodeDefault`，跨类共享的色 / 线宽走级联，颜色跟随归主色。详见 [ADR-01 §背景](../../adr/v0/v0.2-alpha.2/01-scope-style-inheritance.md)。

## 样式继承机制

### 四通道派生（单一真源，禁手抄）

```
NodeDefaultSchema  = NodeSchema.omit{type,id,position,text,label}.strict()   // every node
PathDefaultSchema  = PathSchema.omit{type,children,arrow,arrowDetail}.strict() // every path（arrow 走 arrowDefault）
LabelDefaultSchema = { color?, textColor?, opacity?, font? }.strict()        // every label
ArrowDefaultSchema = ArrowDetailSchema                                       // every arrow
```

四通道**扁平独立、无父子**；全 `.optional()`、**禁 `.default()`**（否则缺省字段被填值、永远覆盖、继承失效）；内置默认在 fold 末尾补。

### 主色 color：展开 + 分项覆盖 + 级联

- **同源展开**：每个样式来源内，分项色（stroke/fill/textColor、arrow.color）未在同源显式给 → 取该源 `color`。即**同源内分项覆盖主色**。
- **颜色级联**（= TikZ current color）：容器已解析 `color` 下传子元素色默认——node.color → 内部文字 + 边 label；path.color → stroke + arrow + step label。
- 跟随的是**主色**不是 stroke：`<Path color="red">` 标注 / 箭头红；`<Path stroke="red">`（只染线）标注不跟（与 TikZ `draw=` 一致）。

### 优先级链（每分项，model A 就近）

```
元素显式分项 > 元素 color > 对应 every-X 分项 > every-X color > scope 级联分项 > scope color > 内置
（scope 各档沿 scope 链就近优先：内层整体压外层）
```

非色字段（strokeWidth / shape / font / dash / minimum* …）不参与主色，只走 `元素显式 > every-X > scope 级联(若共享) > 内置`。

### 嵌套解析（compile 维护 style frame 栈）

收敛成一次 **inside-out per-field 解析**（与 alpha.1 ADR-02 anchor lookup 同方向）：

```
for S in stack 外→内：
    if S.resetStyle(channel): eff[channel] = {}      # 屏障：丢外层累积
    展开主色(S 级联); merge(eff, S 级联)
    展开主色(S.<channel>Default); merge(eff, S.<channel>Default)
展开主色(元素); merge(eff, 元素显式)
补内置默认（仍 undefined 的）
```

**就近优先（模型 A）**：内层整体压外层。**per-field 合并、非整对象替换**（≈ TikZ `.append style`；文档须明示与 TikZ 字面 `.style=` 替换的差异）。

### 「缺省」vs「显式 none」（按存在性判定）

合并按 `value !== undefined`（**绝不按真假值**，否则 `0` / `false` / `"none"` 被误当未设）。缺省 = 让位向外查；显式（含 `"none"` / `0` / `false`）= 本层截断。例：外 `color="white"` ⊃ 内层无 → white；内层 `stroke="none"` → none。

### resetStyle —— 朝外的继承屏障（形态 B）

`resetStyle` 只切**scope 继承轴**（外层级联 graphic state + every-X 默认），回内置基线；本 scope 自己的值 + 内层照常生效。只朝外切，正交于 `transforms` / `localNamespace` / `scope.id` bbox。**不碰实例-host 轴**——label / arrow 仍跟随所属 path/node 的已解析颜色（结构关系），不成"孤岛"：`resetStyle={['label']}` 只忽略外层 labelDefault、label 仍属它的线；`resetStyle={['arrow']}` 仍跟线色；`resetStyle=true` 归零 scope 通道后 host-following 照常流动归零值。

### opacity：替换、不复合（TikZ 默认）

`opacity` 走覆盖 fold——TikZ 默认按 group **替换**（嵌套 0.5/0.5 → 各 0.5，不是 0.25），相乘只在显式 `transparency group`（= SVG `<g opacity>`）下发生。compile 把解析后 opacity 落到**各元素**、**不**发 scope `<g opacity>`。组级半透明留未来 `transparencyGroup` opt-in。唯一保留的相乘是**元素内** label × 元素 opacity（NodeLabel 已定，StepLabel 镜像）。

## IR / schema 改动清单

| 改动 | 文件 | Level | 说明 |
|---|---|---|---|
| 4 派生 schema（NodeDefault / PathDefault / LabelDefault / ArrowDefault） | `ir/scope.ts` | **red** | 各从对应 schema `.omit()` 派生（单一真源） |
| `ScopeSchema` 加级联 graphic state（color + stroke/fill/strokeWidth/opacity/fillOpacity/drawOpacity） | `ir/scope.ts` | **red** | 级联到全部元素；全 optional、禁 `.default()` |
| `ScopeSchema` 加 `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` | `ir/scope.ts` | **red** | 四通道 every-X，扁平独立 |
| `ScopeSchema` 加 `resetStyle: boolean \| ('node'\|'path'\|'label'\|'arrow')[]` | `ir/scope.ts` | **red** | 朝外继承屏障 |
| `NodeSchema` / `PathSchema` 加 `color` | `ir/node.ts` / `ir/path/path.ts` | **red** | 主色；分项未单设则随它（动既有元素 schema，较宽） |
| `StepLabelSchema` 加 `textColor` / `opacity` / `font` | `ir/path/step.ts` | **red** | 加在 `text`/`position`/`side` 后；零破坏（ADR-02） |
| 主色展开 + 颜色级联 + 四通道 fold + resetStyle | `compile/**` | **red** | 编译期解析每元素最终样式 |
| label 渲染回退链 | `compile/path/label.ts` | **red** | `fill: 'currentColor'` 改 `textColor ?? labelDefault ?? 宿主 path 主色 ?? currentColor`；font 回退链 |
| ZodSchema reference 同步 | `apps/docs/.../reference/schema/**` | **green** | Scope 新字段 + Node/Path `color` + 8 step variant `label.*` 描述 |

**判级**：跨级取最高 = **red**，走 Spec-First TDD。绿色文档独立 commit、走 stage 4 简化路径。

**AST 白名单 / system prompt**：`<Scope>` 已在 alpha.1 进白名单；alpha.2 只加 props。system prompt 顺手补"Scope 支持样式继承 + 主色 color"（green，非阻塞）。

## 实现拆分

1. **schema**（packages/core）：`scope.ts` 4 派生 schema + 级联字段 + 四通道 + resetStyle；`node.ts` / `path.ts` 加 `color`；`step.ts` StepLabel 加 3 字段。全 `.optional()`、禁 `.default()`。
2. **compile 继承解析**：style frame 栈（enter push / exit pop）；每源主色展开 → per-field fold（按 `!== undefined`）；颜色级联下传子元素；遇 `resetStyle` 丢通道；内置默认 fold 末尾补；opacity 逐元素覆盖、不落 scope `<g opacity>`。
3. **label 回退链**：`compile/path/label.ts` fill / font 改回退链（消费 labelDefault + 宿主 path 主色）。
4. **测试**（Spec-First，red）：见 ADR-01/02 测试象限——主色级联 / 分项覆盖 / 四通道 / 就近优先 / 缺省-none / resetStyle / opacity 不复合 / label 跟宿主主色 / 零破坏。
5. **ZodSchema reference**（green）+ **system prompt**（green）同步。

## 文档

- `apps/docs/.../components/tikz/scope/index.{zh,en}.mdx`：加"样式继承"章节——主色 `color` + 级联 + 四通道 every-X + 优先级链 + 嵌套 + resetStyle；配 demo
- `apps/docs/.../components/draw/step/index.{zh,en}.mdx`：StepLabel 新字段 + 彩色线同色标注（用 `<Path color=...>`）
- Node / Path 文档补 `color` 主色说明（与 stroke/fill 的关系）
- 双语一致；AGENTS.md / `packages/core/AGENTS.md` 补 Scope 样式继承 + 主色一节

## 验收

- **主色级联**：`<Scope color="blue">` → 内 node 边 / 文字 / path stroke / arrow / label 全蓝
- **分项覆盖主色**：`<Node color="blue" stroke="red">` → stroke red、fill/text blue
- **颜色跟随**：`<Path color="crimson">` → 标注 / 箭头 crimson；`<Path stroke="crimson">` → 标注 currentColor（不跟，与 TikZ 一致）
- **四通道 every-X**：nodeDefault/pathDefault/labelDefault/arrowDefault 各自独立生效
- **就近优先**：嵌套内层压外层；同层 every-X 压级联
- **缺省 vs 显式**：缺省继承外层；显式 `none`/`0`/`false` 截断
- **resetStyle**：切外层 scope 继承轴（级联+every-X）、本层值仍生效、内层从屏障继承；按通道切；**不碰 host 轴**——`resetStyle={['label']}`/`['arrow']` 后 label/arrow 仍跟所属线/节点色（非孤岛）
- **opacity**：嵌套不复合（各 0.5）；元素内 label×元素相乘
- **StepLabel**：textColor 落地 + font 回退链 + 不给时 currentColor（零破坏 karl-circle / unit-circle snapshot）
- ZodSchema reference 含新字段；零破坏 v0.1 / alpha.1 既有测试

## 待定（ADR 阶段敲定）

> **全部拍板**（本轮收敛）：扁平四通道 every-X、主色 `color`（上 Scope+Node+Path）、级联 graphic state（color + stroke/fill/strokeWidth/opacity/fillOpacity/drawOpacity）、按存在性 merge + 禁 `.default()`、就近优先（模型 A）、per-field 合并、`resetStyle` 形态 B（4 通道）、opacity 替换不复合、`.strict()` 严拒、shape 继承、label 跟宿主 path 主色（非 stroke）。

跨源序定为 `元素显式分项 > 元素 color > 外层 every-X 分项 > every-X color > scope 级联分项 > scope color > 内置`；arrow 跟色 `color←path 主色 / lineWidth←strokeWidth / fill←arrow.color`；`pathDefault` 排除 arrow（走 arrowDefault）；`labelDefault` 单通道双宿主（node-label→node、step-label→path）。

仅余推迟项（非本 alpha）：per-field `'initial'` 哨兵、transparency group 组级半透明、命名 style。**下一步** = red ADR 多 LLM 评估 → commit。

## 设计 ADR

已起草（`notes/adr/v0/v0.2-alpha.2/`，状态 Proposed）：

### [ADR-01 — Scope 样式继承（扁平 every-X + 主色 color + resetStyle）](../../adr/v0/v0.2-alpha.2/01-scope-style-inheritance.md)

四通道派生 + 主色 `color`（Scope/Node/Path + default map）+ 级联 graphic state + resetStyle；优先级链 + 主色展开 + 颜色级联；model A 就近、per-field 合并、按存在性 merge、opacity 替换、strict 严拒、shape 继承；compile renderer-neutral 解析进 primitive。

### [ADR-02 — StepLabel 样式扩展](../../adr/v0/v0.2-alpha.2/02-step-label-style.md)

`StepLabelSchema` 加 `textColor` / `opacity` / `font`；继承顺序 `label 显式 > scope.labelDefault > 宿主 path 主色 color > currentColor`（跟主色不跟 stroke，修正早稿）；`compile/path/label.ts` fill / font 回退链；opacity 元素内相乘、跨 scope 不复合。

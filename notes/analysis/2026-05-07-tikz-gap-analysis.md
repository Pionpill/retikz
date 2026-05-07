# retikz Node / Path 与 TikZ 能力差距分析

> 基于 `@retikz/core` v0.1.0-alpha 现状（仅 `move` / `line` step、矩形 node），对照 TikZ 完整能力盘点缺失项，按优先级分类。
>
> 关联文档：[`architecture/DESIGN.md`](../architecture/DESIGN.md) · [`packages/core/AGENTS.md`](../../packages/core/AGENTS.md)

---

## 0. 现状速查

### IRNode（`packages/core/src/ir/node.ts`）

```ts
{
  type: 'node',
  id?: string,
  position: Position | PolarPosition,
  rotate?: number,
  text?: string,
  fill?: string,
  stroke?: string,
  strokeWidth?: number,
  padding?: number,
  margin?: number,
  fontSize?: number,
}
```

**形状只支持矩形**。

### IRPath（`packages/core/src/ir/path/path.ts`）

```ts
{
  type: 'path',
  stroke?: string,
  strokeWidth?: number,
  strokeDasharray?: string,
  children: Array<IRStep>,  // min 2
}
```

### IRStep（`packages/core/src/ir/path/step.ts`）

```ts
{ type: 'step', kind: 'move', to: IRTarget }
{ type: 'step', kind: 'line', to: IRTarget }

// IRTarget = Position | PolarPosition | string  (string = node id 引用)
```

**仅 `move` / `line`**；无折角、无曲线、无闭合、无箭头、无路径中段标注。

---

## 1. Node 缺的能力

| 能力 | TikZ 写法 | 缺失影响 | 优先级 |
|---|---|---|---|
| **shape 多态**（circle / ellipse / diamond / rounded rectangle / regular polygon / cloud / cylinder / star / chamfered…） | `[circle]` / `[diamond]` / `[regular polygon, regular polygon sides=6]` | 当前所有 node 只能是矩形——流程图、UML、电路、思维导图全画不了。**最大短板** | **P0** |
| **anchor 命名锚点**（除 8 方位外还有 `text` / `base` / `mid` / `angle anchor=30` / 各 shape 特有 anchor） | `(A.north east)` / `(A.30)` | path 端点目前只能"node id"→ 走 `boundaryPoint` 算朝向；用户没法精确指定"从 A 的 east 出"。`<Anchor>` 在 DESIGN.md §4.1 已列入 kernel | **P0** |
| **相对定位**（`above of=A` / `right=2cm of A` / `at (A.south)`） | `(B) [right of=A]` | 现在只有 polar `origin` 是替代，但缺 "above/below/left/right + node distance" 语义糖 | **P1** |
| **minimum width / height / size**（强制最小尺寸） | `[minimum size=1cm]` | 让多个 node 视觉对齐时必须 | **P1** |
| **rounded corners**（圆角矩形 / 任意 shape 圆角） | `[rounded corners=2pt]` | 现代图表必备 | **P1** |
| **draw / line style**（dashed / dotted / dash dot / very thick / ultra thin） | `[dashed, very thick]` | path 已经有 `strokeDasharray`，node 没有；语义档位（thin/thick）也都没有 | **P1** |
| **font 完整描述**（family / weight / italic / `\Large`） | `[font=\bfseries\Large]` | 只有 `fontSize: number`；粗体 / 斜体 / 字族都没法表达 | **P1** |
| **text color** / **text opacity** / **fill opacity** / **draw opacity** | `[text=red, opacity=.5]` | 完全缺，不透明度跨平台都要支持 | **P1** |
| **align / text width**（多行文字对齐 + 自动换行宽度） | `[align=center, text width=3cm]` | `text` 现在是 `string`，多行 / 换行 / 对齐全部缺；`measureText` 只算单行 | **P1** |
| **inner sep / outer sep**（语义比 `padding/margin` 更精确） | `[inner sep=2pt, outer sep=0pt]` | 现有 `padding/margin` 接近，但还缺 "inner xsep / inner ysep" 分轴 | **P2** |
| **scale / xscale / yscale** | `[scale=1.5]` | 仅有 `rotate`，缺缩放 | **P2** |
| **label / pin**（在 node 边挂额外文字 / 引脚） | `[label=above:foo, pin=right:bar]` | 想给节点边加备注就得拆成两个 node + path | **P2** |
| **double border**（双线） | `[double, double distance=2pt]` | UML / 电路图常见 | **P3** |
| **clip**（裁剪子内容） | `[clip]` | 高级特性 | **P3** |

---

## 2. Path 缺的能力

| 能力 | TikZ 写法 | 缺失影响 | 优先级 |
|---|---|---|---|
| **箭头**（`->` `<-` `<->` `>=Latex` / `>=Stealth` / `>={Triangle[scale=1.5]}`） | `\draw[->, >=Stealth]` | **绘图最常见的需求**。当前 path 只能画无箭头线段，流程图 / 网络图 / UML 全废 | **P0** |
| **折角 step**（`-\|` / `\|-`） | `(A) -\| (B)` | DESIGN.md §1.7 / AGENTS.md 都列为优先项；流程图刚需 | **P0** |
| **`cycle` 闭合** | `(A) -- (B) -- (C) -- cycle` | 当前 `move/line` 闭合需要手动重复起点 | **P0** |
| **贝塞尔 / curve / cubic**（`to[bend left]` / `.. controls (a) and (b) ..`） | `(A) to[bend left=30] (B)` | AGENTS.md 已列；UML / 关系图 / 流图常用 | **P0** |
| **arc / circle / ellipse / rectangle 形状指令**（path-level 而非 node） | `(0,0) arc[start=0,end=90,radius=1]` / `(0,0) circle[radius=1]` | 画"几何示意图"无法直接用 path 画弧 / 圆 | **P1** |
| **fill / filldraw / 路径 action**（仅描边 vs 仅填充 vs 同时） | `\fill[red] (...) ;` | 现在 path 只有 stroke 没有 fill / fillRule，闭合后也填不了色 | **P1** |
| **相对坐标**（`+(1,0)` / `++(1,0)`） | `(A) -- +(1,0)` | AGENTS.md 已列（`'rel'`）；写"链式平移"很冗长 | **P1** |
| **路径上挂 node**（`-- node[midway, above] {label}`） | `(A) -- node[above] {x=1} (B)` | 边标注（流程图 / UML 关系名）刚需，目前只能再开一个 path child 模拟 | **P1** |
| **line cap / line join** | `[line cap=round, line join=miter]` | 没法控制线端 / 拐角形态，跨 SVG/Canvas 一致性也需要明确化 | **P2** |
| **stroke 语义档位** | `[thick]` / `[ultra thick]` / `[loosely dashed]` | 只有数字 `strokeWidth` + 字符串 `strokeDasharray` | **P2** |
| **opacity 全套** | `[opacity / draw opacity / fill opacity=...]` | 跨平台都好支持 | **P2** |
| **路径变换** | `[rotate=30, shift={(1,2)}]` | 整条 path 旋转 / 平移 | **P3** |
| **decorations**（snake / coil / brace） | `decorate[decoration={snake}]` | 高级，靠 path effect 重写 d 字符串实现 | **P3** |
| **intersections**（取两线交点） | `(intersection of A--B and C--D)` | 高级目标点 | **P3** |
| **markings**（路径中段标记） | `decoration={markings, mark=at position .5 with {...}}` | 高级 | **P3** |

---

## 3. 顶层 / 共有缺失

| 能力 | 影响 |
|---|---|
| **`<Coordinate>`**（只命名一个点，不画任何东西，给 path 引用） | 想"在某处定义锚点供后续路径引用"现在必须 fake 成空 node。DESIGN.md 提到了，但 IR 里没 |
| **`<Scope>` / `<Group>`**（嵌套样式继承 + 局部 transform） | 没法写"这一块都用红色 + 旋转 30°"。`GroupPrim` 在 primitive 层有，但 IR 层没 group / scope |
| **样式继承 / 默认值**（`every node/.style={...}` / `every path/.style={...}`） | TikZ 的"主题"机制 |
| **`label` / `pin` 子结构**（节点附属标签） | 同 Node 表 |
| **`\useasboundingbox`** | 自定义 viewBox（当前 `computeViewBox` 自动算，没逃生口） |
| **TikZ libraries 概念**（`shapes.geometric` / `arrows.meta` / `positioning` / `calc` / `decorations.*`） | 当前所有能力是平铺的；以后多了得有 lib 划分机制 |

---

## 4. 优先级建议：P0 闭环

按"画一张可看的流程图所需的最小集"倒推，**P0 应该一起做**：

1. **Path 箭头**（`arrow: 'none' | '->' | '<-' | '<->'`，先做最常见三种就能解锁 80% 流图）
2. **Path 折角**（`Step.kind: 'step'`，`via: '-|' | '|-'`）
3. **Node shape 多态**（至少先加 `circle` / `ellipse` / `diamond` 三种）
4. **Anchor 命名**（`Target` 字符串扩展为 `'A' | 'A.north' | 'A.30'`）
5. **Path `cycle` + `fill`**（让闭合区域能填色）

这五点做完，retikz 就能画出"教科书级流程图 + UML 类图 + 简单几何图"，AI 友好的样本范围会从"线框图"扩展到 TikZ 主流用例的大头。

---

## 5. 优先级图例

| 标记 | 含义 |
|---|---|
| **P0** | 阻塞主流用例（流程图 / UML / 几何图）；缺失即库无法落地 |
| **P1** | 高频需求；缺了用户体验差但还能凑合 |
| **P2** | 中频需求；典型主题 / 风格化诉求 |
| **P3** | 低频 / 高级特性；可以拖到后期 |

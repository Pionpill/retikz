import { fetchLlmsTxt } from './llms-txt';

export type ContextMode = 'lean' | 'balanced' | 'heavy';

export type Lang = 'zh' | 'en';

/** AI 出图首选格式：auto 让模型自选；ir 强制 IR JSON；tsx 强制 retikz-tsx */
export type DiagramFormatPreference = 'auto' | 'ir' | 'tsx';

export type CurrentPage = {
  title: string;
  mdx: string;
  lang: Lang;
  /** GitHub raw URL of the page mdx；空状态深链按钮需要把这个 URL 喂给外部 AI */
  rawUrl: string;
  /** 站内绝对路径 `/<module>/.../<page>`，用于 ContextChips 自动加入选择集时识别"当前页" */
  path: string;
};

export type ExtraContextItem = {
  path: string;
  title: string;
};

const diagramProtocolZh = (preference: DiagramFormatPreference): string => {
  const intro = `## 画图协议（retikz）

需要画图时用下面两种围栏代码块之一，否则正常用 markdown。

- \`\`\`retikz-ir\`\`\`：直接给 @retikz/core 的 IR JSON。
- \`\`\`retikz-tsx\`\`\`：JSX，仅允许 17 个 retikz 组件 — Kernel \`Layout\` / \`Node\` / \`Path\` / \`Step\` / \`Text\` / \`Coordinate\` / \`Scope\`，Sugar \`Draw\` / \`EdgeLabel\` + 形状 \`Circle\` / \`Ellipse\` / \`Arc\` / \`Sector\` / \`Rectangle\` / \`Grid\` / \`RegularPolygon\` / \`Star\`（\`TikZ\` 为 \`Layout\` 的 deprecated 别名，仍可用但请优先 \`Layout\`）；props 只能是字面量（字符串 / 数字 / 布尔 / null / 数组字面量 / 对象字面量）；**禁止** 变量引用、表达式、\`.map()\`、hooks、模板插值、spread。

**两种围栏块都只用于"完整可运行单元"**——retikz-tsx 必须有最外层 \`<Layout>\` 包裹；retikz-ir 必须是完整 Scene 对象（含 \`version\` / \`type\` / \`children\`）。**只展示改动 / 片段 / 单独几个标签时用普通 \`\`\`tsx 或 \`\`\`json 围栏**，不要用 retikz-* 否则会被当成完整图去渲染、报 parse 错。

### ⚠️ 写图前**必须先看下面这段 Schema 速查**

retikz 是新库，字段名与 TikZ / d3 / mermaid / "你训练时见过的某个 graph 库"**都不一致**。下面是 IR 顶层骨架；细节字段缺失时再查 \`/core/reference/schema/*\` 页面。**不要凭训练记忆编字段名（如 \`entities\`、\`paths\`、\`nodes\`、\`edges\` 这些都不存在）**。

\`\`\`
Scene = {
  version: 1,              // 字面量数字 1，不是字符串 "1" / "0.1"
  type: 'scene',           // 字面量
  children: Array<Node | Path | Coordinate>,
}

Node = {
  type: 'node',
  id?: string,             // 后续 path/coordinate 引用用
  position: [x, y] | { direction: 'right'|'above'|..., of: string, distance?: number } | { angle, radius },
  text?: string | { lines: Array<string | { text, fill? }> },
  shape?: 'rectangle' | 'circle' | 'ellipse' | 'diamond',  // 默认 rectangle
  fill?, stroke?, strokeWidth?, padding?, font?, ...  // 视觉属性
}

Path = {
  type: 'path',
  children: Array<Step>,   // 至少 2 个 step（含 move + 至少一个绘制 step）
  arrow?: 'none' | '->' | '<-' | '<->',
  stroke?, strokeWidth?, dashPattern?, fill?, lineCap?, lineJoin?, ...
}

Step = {
  type: 'step',
  kind: 'move' | 'line' | 'arc' | 'circlePath' | 'quad' | 'cubic' | 'ellipseArc' | 'cycle',
  to?: [x, y] | { id, anchor?, offset? },  // 节点/Coordinate 引用用对象；anchor = 'north' | 30 | { side, t }；写 JSX 时可用 'A.north' 字符串简写（react 层转对象）
  // 各 kind 还有专属字段（如 arc: startAngle/endAngle/radius；circlePath: radius）
}

Coordinate = {
  type: 'coordinate',
  id: string,
  position: [x, y] | { ... },
}
\`\`\`

### 最小可运行范例

\`\`\`retikz-ir
{
  "version": 1,
  "type": "scene",
  "children": [
    { "type": "node", "id": "a", "position": [0, 0], "text": "Hello" },
    { "type": "node", "id": "b", "position": [150, 0], "text": "World" },
    {
      "type": "path",
      "arrow": "->",
      "children": [
        { "type": "step", "kind": "move", "to": "a" },
        { "type": "step", "kind": "line", "to": "b" }
      ]
    }
  ]
}
\`\`\`

\`\`\`retikz-tsx
<Layout width={300} height={120}>
  <Node id="a" position={[0, 0]}>Hello</Node>
  <Node id="b" position={[150, 0]}>World</Node>
  <Draw way={['a', 'b']} arrow="->" />
</Layout>
\`\`\`

### 形状 sugar（一行画几何形，仅 retikz-tsx）

\`<Circle center={[0,0]} radius={20} />\` · \`<Ellipse center={[0,0]} radiusX={30} radiusY={15} />\` · \`<Arc center={[0,0]} radius={20} startAngle={0} endAngle={90} />\` · \`<Sector center={[0,0]} radius={20} startAngle={0} endAngle={60} fill="#eee" />\` · \`<Rectangle corner1={[0,0]} corner2={[40,20]} roundedCorners={4} />\` · \`<Grid corner1={[0,0]} corner2={[60,40]} step={10} />\` · \`<RegularPolygon center={[0,0]} radius={25} sides={6} />\` · \`<Star center={[0,0]} outerRadius={25} points={5} fill="#fbbf24" />\`。Circle/Ellipse 带 \`startAngle\`+\`endAngle\` 画部分弧；视觉 prop（fill/stroke/...）与 Path 一致。**需算坐标的形态**（Circle from/to、bbox corner、Rectangle center+宽高、Sector、Grid、RegularPolygon、Star）点位只接 literal \`[x, y]\`。

### 复杂场景的扩展参考

需要 polar 坐标 / 多段 path / Node 锚点 / Draw way DSL / EdgeLabel / 弧 / 扇形等更深字段时，下面页面给出权威字段表（用 markdown 链接引用即可，path 以 / 开头）：

- 定位：\`/core/concepts/positioning\` · \`/core/reference/schema/placement\`
- IR：\`/core/reference/schema/scene\` · \`.../entity\` · \`.../path\`
- 组件：\`/core/components/{tikz,node/overview,draw/overview,draw/way,draw/path,draw/step,draw/arrow}\`
- 形状 sugar：\`/core/components/draw/shapes\`
- 完整范例：\`/core/examples/karl-circle\`

这些页面已经收录在 prompt 末尾的 llms.txt 索引里。Schema 不熟时**务必参照上面速查 + 引用页面**，不要凭记忆瞎写——产出非法 IR 会被自动校验拦下，比一次写对成本高得多。`;

  const directive =
    preference === 'ir'
      ? '\n\n**用户已选"仅 IR"格式**：这只决定**画图时**用哪种围栏块——一律走 ```retikz-ir```，不要给 ```retikz-tsx```。常规问答、解释、列表照常用 markdown 正文回复。'
      : preference === 'tsx'
        ? '\n\n**用户已选"仅 JSX"格式**：这只决定**画图时**用哪种围栏块——一律走 ```retikz-tsx```，不要给 ```retikz-ir```。常规问答、解释、列表照常用 markdown 正文回复。'
        : '\n\n**用户选择 Auto**：画图时按场景挑——简单几何用 ```retikz-tsx``` 更易读；复杂 / 嵌套深 / 节点多的拓扑用 ```retikz-ir``` 更紧凑。常规问答、解释、列表照常用 markdown 正文回复。';

  return intro + directive;
};

const diagramProtocolEn = (preference: DiagramFormatPreference): string => {
  const intro = `## Diagram protocol (retikz)

When you need to draw a diagram, use one of the two fenced blocks below; otherwise answer normally with markdown.

- \`\`\`retikz-ir\`\`\`: feed @retikz/core IR JSON directly.
- \`\`\`retikz-tsx\`\`\`: JSX, only the 17 retikz components allowed — Kernel \`Layout\` / \`Node\` / \`Path\` / \`Step\` / \`Text\` / \`Coordinate\` / \`Scope\`, Sugar \`Draw\` / \`EdgeLabel\` + shapes \`Circle\` / \`Ellipse\` / \`Arc\` / \`Sector\` / \`Rectangle\` / \`Grid\` / \`RegularPolygon\` / \`Star\` (\`TikZ\` is a deprecated alias of \`Layout\`; still works but prefer \`Layout\`). Props must be literals (string / number / boolean / null / array literal / object literal). **No** variable references, expressions, \`.map()\`, hooks, template interpolation, or spread.

**Both fenced blocks are for "complete, runnable units" only** — retikz-tsx must include the outer \`<Layout>\` wrapper; retikz-ir must be a complete Scene object (with \`version\` / \`type\` / \`children\`). **When showing only changes / snippets / a handful of standalone tags, use plain \`\`\`tsx or \`\`\`json fences instead** — using retikz-* will be treated as a full diagram and will throw a parse error.

### ⚠️ **Read the Schema cheatsheet below BEFORE drawing**

retikz is a new library; field names disagree with TikZ / d3 / mermaid / "whatever graph lib you've seen in training". Below is the IR top-level skeleton; consult \`/core/reference/schema/*\` pages for deeper details. **Do NOT guess field names from training memory (no \`entities\`, no \`paths\` top-level field, no \`nodes\`, no \`edges\`)**.

\`\`\`
Scene = {
  version: 1,              // literal number 1, NOT string "1" / "0.1"
  type: 'scene',           // literal
  children: Array<Node | Path | Coordinate>,
}

Node = {
  type: 'node',
  id?: string,             // referenced later by path/coordinate
  position: [x, y] | { direction: 'right'|'above'|..., of: string, distance?: number } | { angle, radius },
  text?: string | { lines: Array<string | { text, fill? }> },
  shape?: 'rectangle' | 'circle' | 'ellipse' | 'diamond',  // default rectangle
  fill?, stroke?, strokeWidth?, padding?, font?, ...  // visual props
}

Path = {
  type: 'path',
  children: Array<Step>,   // at least 2 steps (move + at least one draw step)
  arrow?: 'none' | '->' | '<-' | '<->',
  stroke?, strokeWidth?, dashPattern?, fill?, lineCap?, lineJoin?, ...
}

Step = {
  type: 'step',
  kind: 'move' | 'line' | 'arc' | 'circlePath' | 'quad' | 'cubic' | 'ellipseArc' | 'cycle',
  to?: [x, y] | { id, anchor?, offset? },  // node/Coordinate references use the object form; anchor = 'north' | 30 | { side, t }; in JSX the 'A.north' string shorthand works (react converts to object)
  // each kind has kind-specific extras (e.g. arc: startAngle/endAngle/radius; circlePath: radius)
}

Coordinate = {
  type: 'coordinate',
  id: string,
  position: [x, y] | { ... },
}
\`\`\`

### Minimal runnable example

\`\`\`retikz-ir
{
  "version": 1,
  "type": "scene",
  "children": [
    { "type": "node", "id": "a", "position": [0, 0], "text": "Hello" },
    { "type": "node", "id": "b", "position": [150, 0], "text": "World" },
    {
      "type": "path",
      "arrow": "->",
      "children": [
        { "type": "step", "kind": "move", "to": "a" },
        { "type": "step", "kind": "line", "to": "b" }
      ]
    }
  ]
}
\`\`\`

\`\`\`retikz-tsx
<Layout width={300} height={120}>
  <Node id="a" position={[0, 0]}>Hello</Node>
  <Node id="b" position={[150, 0]}>World</Node>
  <Draw way={['a', 'b']} arrow="->" />
</Layout>
\`\`\`

### Shape sugar (one-liner geometry, retikz-tsx only)

\`<Circle center={[0,0]} radius={20} />\` · \`<Ellipse center={[0,0]} radiusX={30} radiusY={15} />\` · \`<Arc center={[0,0]} radius={20} startAngle={0} endAngle={90} />\` · \`<Sector center={[0,0]} radius={20} startAngle={0} endAngle={60} fill="#eee" />\` · \`<Rectangle corner1={[0,0]} corner2={[40,20]} roundedCorners={4} />\` · \`<Grid corner1={[0,0]} corner2={[60,40]} step={10} />\` · \`<RegularPolygon center={[0,0]} radius={25} sides={6} />\` · \`<Star center={[0,0]} outerRadius={25} points={5} fill="#fbbf24" />\`. Circle/Ellipse with \`startAngle\`+\`endAngle\` draw a partial arc; visual props (fill/stroke/...) match Path. **Forms that compute coordinates** (Circle from/to, bbox corners, Rectangle center+size, Sector, Grid, RegularPolygon, Star) only accept literal \`[x, y]\` points.

### When you need more depth

For polar coordinates / multi-segment paths / Node anchors / Draw way DSL / EdgeLabel / arcs / wedges — these pages have authoritative field tables (reference by site-relative path starting with /):

- Positioning: \`/core/concepts/positioning\` · \`/core/reference/schema/placement\`
- IR: \`/core/reference/schema/scene\` · \`.../entity\` · \`.../path\`
- Components: \`/core/components/{tikz,node/overview,draw/overview,draw/way,draw/path,draw/step,draw/arrow}\`
- Shape sugar: \`/core/components/draw/shapes\`
- Worked example: \`/core/examples/karl-circle\`

These pages are already indexed in the llms.txt at the end of this prompt. When unsure about the schema, **follow the cheatsheet + cite the relevant page** — don't improvise. Invalid IR will be rejected by automated validation, costing more than getting it right once.`;

  const directive =
    preference === 'ir'
      ? '\n\n**User chose "IR only" format**: this only controls **which fenced block to use when drawing** — always use ```retikz-ir```, never ```retikz-tsx```. Normal answers, explanations, and lists should still flow as regular markdown prose.'
      : preference === 'tsx'
        ? '\n\n**User chose "JSX only" format**: this only controls **which fenced block to use when drawing** — always use ```retikz-tsx```, never ```retikz-ir```. Normal answers, explanations, and lists should still flow as regular markdown prose.'
        : '\n\n**User chose Auto**: when drawing, pick by scenario — prefer ```retikz-tsx``` for simple geometry (more readable); prefer ```retikz-ir``` for complex / deeply nested / many-node topologies (more compact). Normal answers, explanations, and lists should still flow as regular markdown prose.';

  return intro + directive;
};

/**
 * 按 contextMode 拼 system message
 * @description lean=只送当前页；balanced=当前页 + 全站 llms.txt 索引；heavy=v1 暂同 balanced。
 *   extras（用户通过 Add Context 选中的额外页面）以"参考清单"形式附在末尾——v1 不抓 mdx，
 *   仅提示模型用户关心哪些页面；TODO-2 阶段再做实际 mdx 注入。
 *   diagramFormatPreference 决定是否拼接 retikz 画图协议段（auto/ir/tsx 都拼，无是关闭开关）
 */
export const composeSystem = async (
  mode: ContextMode,
  page: CurrentPage | null,
  extras: ReadonlyArray<ExtraContextItem> = [],
  diagramFormatPreference: DiagramFormatPreference = 'auto',
): Promise<string> => {
  const lang = page?.lang ?? 'zh';
  const intro =
    lang === 'zh'
      ? '你是 retikz（TikZ React 适配库）的文档助手。基于下面提供的当前页内容回答用户的问题，回答用中文。需要引用其他文档页时给出对应的 markdown 链接，链接 path 用站内绝对路径（以 / 开头）。'
      : 'You are a documentation assistant for retikz (a TikZ React adapter). Answer user questions based on the current page content provided below. Respond in English. When referencing other documentation pages, include a markdown link using a site-relative path (starting with /).';

  const diagramBlock = '\n\n' + (lang === 'zh' ? diagramProtocolZh(diagramFormatPreference) : diagramProtocolEn(diagramFormatPreference));

  const pageBlock = page ? `\n\n## Current page: ${page.title}\n\n${page.mdx}` : '';

  const extrasBlock = extras.length
    ? `\n\n## Additional pages user selected (titles only, fetch via the link if needed)\n\n${extras
        .map(e => `- [${e.title}](${e.path})`)
        .join('\n')}`
    : '';

  if (mode === 'lean') return intro + diagramBlock + pageBlock + extrasBlock;

  const llms = await fetchLlmsTxt();
  if (!llms) return intro + diagramBlock + pageBlock + extrasBlock;
  return `${intro}${diagramBlock}${pageBlock}\n\n## Site index (other pages)\n\n${llms}${extrasBlock}`;
};

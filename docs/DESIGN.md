# retikz 重写设计文档

> 本文档是 retikz 下一版重写的**架构设计稿**——只写框架与底层建设：分层模型、IR/DSL/Renderer 概念、AI 优先原则、跨平台策略、domain 包架构、生态规划。
>
> 具体的 core 包重构方案（zod schema 字段、Kernel 组件签名、Sugar parser 实现、模块目录结构、迁移步骤等）见 [`CORE-REFACTOR.md`](./CORE-REFACTOR.md)。
>
> 文档分为三类内容：**已决策**（拍板）、**待决策**（重写时再细聊）、**明确反对**（绝不做）。
> 每条决策都附带"为什么"——后续遇到边界场景时按"为什么"判断，而不是按字面规则套用。

---

## 1. 项目定位

### 1.1 一句话

> **AI-native 的 TikZ 风格通用绘图库**：以"AI 友好"为第一设计目标，用 React 组件写图元、JSON IR 持久化、LLM 直接生成与编辑。比 Recharts 粒度更低、比 react-flow 通用、比 Mermaid 表达力强。

### 1.2 第一设计原则：AI 友好优先（核心竞争力）

**"AI 友好"不是 retikz 的功能之一，是 retikz 存在的理由。** 所有架构决策必须先通过 AI 友好性这一关，再考虑其他维度。

为什么把 AI 放第一位：

1. **市场窗口**：现有图表库（Recharts / ECharts / Highcharts / Chart.js）全是"补"AI 能力——它们的 API 不是为 LLM 设计的，AI 输出 React/config 都磕磕绊绊。retikz 是**生来就为 AI**，这是未来 3–5 年最大的差异化机会。
2. **技术红利**：模型已经具备 structured output、tool use、JSON Schema 强约束输出能力。围绕这些能力设计的库今天就能解锁 prompt → 图、patch 编辑、视觉模型读图、AI 增量构造图等能力，老牌库**改造成本是重写级**。
3. **产品定位**：retikz 的目标用户是"用图描述思想的人"——技术写作者、研究者、文档作者、教师。这些人本来就在大量用 AI；让他们用自然语言或 AI 助理生成图，比让他们学一套 React API 体验好得多。

**判定原则**：当架构决策出现取舍时，按以下顺序判断：

1. **是否削弱 AI 友好性？** 削弱了就否决，无论其他维度收益多大
2. 是否削弱 IR 居中 / 跨平台 / 持久化能力？（这些都是 AI 友好的支柱）
3. 是否削弱 React 组合 / 开发体验？
4. 是否削弱性能？

具体落地见 §7「AI 友好性（一等公民）」。

### 1.3 核心价值主张（按优先级）

1. **AI 原生绘图基座**：LLM 通过 JSON IR 直接生成、编辑、解释图；vision 模型读截图输出 IR；MCP / function calling 增量构造图——这些是 retikz 出生即支持的能力，不是后期补的
2. **真 TikZ in browser**：text DSL 直接采用 **TikZ 原生语法**（兼容子集），而不是自创"TikZ-lite"。技术写作 / 学术 / 论文配图人群可以把现有 `.tex` 中的 TikZ 代码搬进浏览器即用，反向也能从浏览器导出可直接贴进 LaTeX 论文的 TikZ 源码
3. **通用 diagram 库**：超越 react-flow 的几何/路径/anchor 表达力，对标 drawio 但是 React + AI 友好
4. **diagram-as-code 下一代**：Mermaid 的痛点是表达力受限、视觉死板、自定义 DSL 学习成本；retikz 提供更深可控性 + 仍 AI 友好 + **直接复用 TikZ 二十年沉淀的语法/示例/教程生态**

**不押 chart 赛道**——硬刚 ECharts/Highcharts 是不现实的。chart 能力（`@retikz/plot`）作为副产品在 v2.x 提供。

### 1.3 灵感来源与差异

| 库 | 借鉴 | 差异 |
|---|---|---|
| Recharts | React 组件 = 图元的思路 | 粒度更低，做通用图元而非 chart 元 |
| TikZ | 命名节点 / 路径动作 / anchor 体系 | 浏览器原生，无 LaTeX |
| Vega-Lite | DSL → IR → renderer 三段式 | DSL 用 JSX 而非 JSON |
| react-flow | React-first + 节点/边持久化 | 通用图元 + 跨框架 |
| D3 | 平台底层，让 domain 包开花 | 提供组件式 API，不强求命令式 |

---

## 2. 整体架构

### 2.1 IR 居中模型

```
   Sugar JSX  ─┐                          ┌─→ React + SVG（浏览器交互）
   Kernel JSX ─┼─→  IR (JSON)  ─→  Scene ─┼─→ pure SVG 字符串（SSR / 静态生成）
   Text DSL*  ─┤      ↑↓                  ├─→ Canvas（原生路径，浏览器/Node）
   AI / LLM  ──┘   持久化 / 编辑           │      └─→ canvas.toBlob ⇒ PNG/JPEG/WebP
                  (DB / file / patch)     ├─→ Native (Skia/RN)
                                          └─→ PDF (via pdfkit / Canvas)
                                          （可选导出器：IR → TikZ / Mermaid）

  * Text DSL 在 v0/v1 不做，远期再考虑
```

**所有 renderer 都直接从 Scene 渲染，互相之间不转换**。Canvas 不通过 SVG 中转，PNG 也不通过 SVG → resvg 中转——原生路径性能与质量都优于二次转换。

**核心原则：IR 是宇宙唯一真相**。所有输入方式（DSL、AI）最终都变 IR；所有输出方式（renderer）都从 IR 出发。

**AI 在架构中的位置不是"附加输入"，而是与人类 DSL 平起平坐的一等输入**。这是 retikz 区别于其他图表库的根本结构差异：传统库的 AI 接入是"AI 输出 React 代码或 config 字符串再二次解析"；retikz 是 AI 直接吐 IR JSON、拿 IR JSON 作 patch 编辑——零翻译、零歧义、强校验。

### 2.2 三个层

| 层 | 责任 | 形态 |
|---|---|---|
| **Kernel** | 用户能用的最底层 React 原语，与 IR 一一对应 | `<Path>`、`<Step>`、`<Node>`、`<Anchor>`、`<Scope>` |
| **Sugar** | Kernel 的语法糖，render 时纯函数展开为 Kernel 树 | `<Draw way={[...]} />` |
| **持久化** | 不是单独一层，是 IR 的固有属性 | JSON 序列化 IR |

**关键约束：Sugar 不引入新能力**。任何 Sugar 能表达的，Kernel 都能表达。这条线一旦破了，分层就假了。

### 2.3 与现有图表库的架构对比

| 库 | 通用图元 | DSL+IR 分层 | JSON 持久化 | React 组合 | 跨框架 | AI 原生 |
|---|---|---|---|---|---|---|
| Recharts | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Visx | ✅ 部分 | ❌ | ❌ | ✅ | ❌ | ❌ |
| Highcharts / ECharts / Chart.js | ❌ | ❌ | ✅ | 第三方包 | ✅ | 中 |
| Vega-Lite | ✅ | ✅ | ✅ | 第三方包 | ✅ | 高 |
| Mermaid | ❌ | ✅ | DSL 即持久化 | ❌ | ✅ | 高 |
| react-flow | ✅ 节点-边 | 部分 | ✅ | ✅ | ❌ | 中 |
| drawio | ✅ | ✅ XML | ✅ | ❌ | ✅ | 中 |
| D3 | ✅ 极底层 | ❌ | ❌ | ❌ | ✅ | 低 |
| **retikz** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

最后一行能填满的库目前不存在。这是先进性所在，也是项目压力所在——架构干净需要持续投入才能兑现。

---

## 3. 核心概念

### 3.1 IR (Intermediate Representation)

**IR 是给机器存/传/算的**：结构化、无歧义、JSON 序列化、不依赖任何框架。

特征：
- 每个概念有且仅有一种表达
- 完整：能恢复语言全部语义
- 与运行时解耦

来自编译器领域。LLVM IR 让 N 种源语言 × M 种目标架构 = N+M 个翻译器。retikz 的 IR 让 N 种 DSL × M 种 renderer = N+M 个组件。

### 3.2 DSL (Domain Specific Language)

**DSL 是给人写的**：可以有歧义（多种等价写法）、可以省略、可以有糖。

retikz 的 DSL 有三种（kernel JSX / sugar JSX / 未来 text），都翻译到同一份 IR。

> 一句话：**DSL 有很多种，IR 只有一种**。

### 3.3 Renderer

**Renderer 是 IR → 输出的纯函数**。React adapter 内部用 React JSX 实现，是 renderer 的实现工具，**不是 DSL**。

---

## 4. 核心层 `@retikz/core` 设计

### 4.1 Kernel 原语

Kernel 是用户能用的最底层 React 原语，与 IR 一一对应。约 5–8 个组件，覆盖 TikZ 能表达的所有图元结构。

#### 架构层面已决策

- **单 `<Step>` 组件**统一所有路径动作（move / line / step / curve / cubic / rel / close 等），通过 `kind` discriminated union 区分。理由：组件数量越少，学习成本越低、文档越短、bug 面积越小，与 TikZ "所有动作走一种 path operation grammar" 的哲学一致
- **`kind` 默认 `'line'`**——line 是压倒性高频，省一个字符的代价对应每行代码视觉负担显著降低
- **Kernel 组件不直接渲染 SVG/Canvas**，只负责把自己描述成 IR 节点；具体如何画由 Scene 编译器 + 各 adapter 决定

#### 实施层面待拍板项（重写启动前在 [`CORE-REFACTOR.md`](./CORE-REFACTOR.md) §3 拍板）

- 折角语法（via vs first）
- Target 表达方式（字符串 / 结构化 / ref / 组合）
- anchor 表达方式（嵌入字符串 / 独立 prop / 独立组件）
- `<Step>` 最终命名
- 组件 → IR 的写入机制（children 扫描 / builder context / 薄壳）

这些是落地细节，不影响架构正确性。

### 4.2 Sugar 层 / Text DSL

#### 总原则

- **渲染时 parser，不走构建期插件**。理由：引入 babel/SWC 插件 = 维护多个打包器的版本 = 巨大成本；runtime parser 5–10KB 可接受；CodeSandbox / playground / 试用门槛为零
- **Sugar 不引入新能力**——任何 Sugar 表达的，Kernel 都能表达。这是分层模型的硬骨头

Sugar 层的具体组件设计（`<Draw>` 签名、way 数组规范、`parseWay` 实现、等价性单测策略）见 [`CORE-REFACTOR.md`](./CORE-REFACTOR.md) §4。

#### Text DSL 形态（v3.x+，已决策语法）

**Text DSL 直接采用 TikZ 原生语法（兼容子集）**，不自创"TikZ-lite"。理由见 §1.3 与 §13。

```tsx
// tagged template
{tikz`
  \node (A) at (0,0) {Hello};
  \node (B) at (3,1) {World};
  \draw[->, dashed] (A) -| (B);
`}

// 或以字符串属性传入
<Tikz src={`
  \\node (A) at (0,0) {Hello};
  \\draw[->] (A) -- (B);
`} />
```

支持范围由"TikZ-Browser 兼容子集规范"约束（v3.x 启动时定义），核心要求：
- **正向兼容**：retikz 支持的 TikZ 代码，粘贴到 LaTeX `\begin{tikzpicture}...\end{tikzpicture}` 中能直接编译
- **反向导出**：`@retikz/codec` 提供 IR → TikZ 源码导出，用户可以在浏览器画完直接贴进论文
- **明确不支持的**：依赖 LaTeX 运行时的功能（`\foreach` + 宏、自定义 `\newcommand`、`calc` 库高级表达式、需要 LaTeX 字体引擎的精确文本度量）会清晰报错或降级
- **数学公式**：`$x^2$` 这类内容委托给 KaTeX/MathJax 渲染，不自己实现

具体支持/不支持清单留到 v3.x 开工时再细化，**本文档只锁定"语法采用 TikZ 而不是自创"这一根本决策**。

### 4.3 IR Schema

#### 已决策

- **Schema 形状：混合**（树形为主，跨引用用 id）
  - 写代码 / 读代码 / LLM 生成 / Git diff 都偏好树
  - 跨引用 O(1) 通过加载时建 `Map<id, IRNode>` 解决，不用为此付扁平的代价
- **JSON Schema 是一等公民**：**用 zod 定义 IR**，作单一来源同时产出 TS 类型 + JSON Schema（通过 `zod-to-json-schema`），喂给 LLM 作 system prompt / tool definition

#### 示例 IR

```json
{
  "version": 1,
  "type": "scene",
  "children": [
    {
      "type": "node", "id": "A", "position": [0, 0], "fill": "lightblue",
      "children": [{ "type": "text", "value": "Hello" }]
    },
    {
      "type": "node", "id": "B", "position": [3, 1],
      "children": [{ "type": "text", "value": "World" }]
    },
    {
      "type": "path", "stroke": "black", "strokeType": "dashed",
      "children": [
        { "type": "step", "kind": "move", "to": "A" },
        { "type": "step", "kind": "step", "via": "-|", "to": "B",
          "children": [
            { "type": "label", "at": "midway", "above": true, "text": "edge" }
          ]
        }
      ]
    }
  ]
}
```

#### 容纳边界（架构层面已决策）

- **IR 只装声明性数据**：禁止函数、ref、closure、React children 中的 React 组件
- **行为通过 id 注册**：`{ onClick: '#handler:foo' }`，运行时查表
- **版本字段必备**：`version: 1` 是 IR 的强制顶层字段；迁移函数体系预留但 v1 暂不实现

具体的 zod schema 字段细节、版本迁移函数注册机制、组件→IR 写入实现见 [`CORE-REFACTOR.md`](./CORE-REFACTOR.md) §2 与 §3。

#### 明确反对

- ❌ 不在 IR 类型里塞 `ReactNode`、`Ref`、function children——一旦塞了，跨框架 / SSR / Canvas / 跨语言全部封死
- ❌ 不用 XML 当持久化格式（SVG 已经是 XML，会和"输出 SVG"混淆；JSON 更适合 LLM、TS、DB）
- ❌ 不用纯扁平（normalized）schema 当默认形态；只在多人协作 v3.x 才考虑展平

### 4.4 Scene 编译器（关键架构资产）

```ts
function compileToScene(ir: IR): Scene { /* 纯函数 */ }

type Scene = {
  primitives: ScenePrimitive[];
  viewBox: { x, y, width, height };
};

type ScenePrimitive =
  | { type: 'rect',  x, y, width, height, fill, stroke, ... }
  | { type: 'text',  x, y, content, fontSize, measuredWidth, measuredHeight, ... }
  | { type: 'path',  d, stroke, fill, ... }
  | { type: 'group', transform, children };
```

**Scene 是 IR 之后、各 renderer 之前的"第二个 IR"**。把语义概念（node / step / anchor）下放成几何原语（矩形 / 文本 / 路径），坐标算好。

为什么需要这层？**所有 adapter 共享代码的最深处**。布局、anchor 计算、stroke 转换、文本测量全部在这里完成。写一次，所有平台受益。

#### Scene 设计原则：渲染目标无关

Scene 必须是**矢量图形的最大公约子集**，不向任何特定 renderer（SVG / Canvas / Skia / PDF）倾斜：

- ✅ **可表达的**：rect / circle / ellipse / line / path / text / group / transform / 基础 stroke/fill/opacity
- ⚠️ **需在 Scene 层抽象的**：渐变（SVG 用 `<linearGradient>`，Canvas 用 `createLinearGradient()`）、阴影、裁剪、blend mode——Scene 描述意图，各 renderer 翻译为各自 API
- ❌ **禁止的**：SVG-only 特性（`<filter>` 复合、`<marker>`、`<defs>` 共享）、Canvas-only 特性（`getImageData`、复杂合成）。这些一旦进 Scene，**Canvas / SVG / PDF 任意一条 renderer 路径就废了**

**关键约束：文本必须在 Scene 编译阶段完成度量**。SVG 可以靠浏览器 `<text>` 自动布局，但 Canvas / Node SSR 不能。所以 `text` primitive 携带 `measuredWidth / measuredHeight`，靠 §6.3 的字体度量注入接口算出。这样所有 renderer 拿到的都是已布局好的文本，行为一致。

---

## 5. 包结构

### 5.1 v0/v1 阶段（重写起步）

```
@retikz/core    primitives + IR types + JSON schema + compileToScene + 字体度量接口
                零依赖、零 React、纯 TypeScript
@retikz/react   React adapter（peerdep: react）
                只负责把 Scene primitives 翻译成 React elements，应该在 50–100 行级别
```

**强制约束**：
- `@retikz/core` 内 `import` 任何 React 相关代码 = bug
- CI 加一条：`node -e 'require("@retikz/core")'` 在零 React 环境必须能加载
- React adapter 写完发现超过 100 行 → 说明 Scene 抽象不够下沉，回 core 补

### 5.2 v1.x（生态扩展）

```
@retikz/ssr        纯函数 SVG 字符串 renderer（验证 core 真的脱离浏览器）
@retikz/vue        Vue adapter
@retikz/flow       第一个 domain 包：流程图组件 + DAG 布局（dagre/elkjs）
```

### 5.3 v2.x+（生态成熟）

```
@retikz/canvas     Canvas adapter（Scene → Canvas 原生绘制）
                   - 浏览器：interactive Canvas + canvas.toBlob 导出 PNG/JPEG/WebP
                   - Node：依赖 @napi-rs/canvas，服务端直接出 PNG/JPEG/WebP buffer
                   - 不通过 SVG 中转；不依赖 resvg / sharp 这种栅格化库
@retikz/svelte     Svelte adapter（社区驱动）
@retikz/solid      Solid adapter（社区驱动）
@retikz/plot       chart 组件 + scale/data binding（这是另一个重量级项目）
@retikz/codec      IR ↔ TikZ 源码（与 LaTeX 双向互通）、IR ↔ Mermaid
```

**为什么 Canvas 不通过 SVG 中转？**
- 性能：原生 Canvas 调用 `ctx.fillRect / ctx.stroke / ...` 远快于解析 SVG 字符串再翻译
- 质量：SVG → Canvas 转换器（如 canvg）在文字、渐变、滤镜上有微妙差异，二次转换会放大问题
- 能力：原生 Canvas 才能用 `getImageData` / hit-testing / 高频动画 / blend mode 等 Canvas 特有能力
- 一致性：和 SVG renderer 共享的不是 SVG 字符串，而是 Scene——这是更高阶、更稳定的契约

**PNG / JPEG / WebP 如何生成？** 通过 Canvas 原生导出：

```ts
// 浏览器
import { renderToCanvas } from '@retikz/canvas';
const canvas = renderToCanvas(ir, { width: 800, scale: 2 });
canvas.toBlob(blob => download(blob, 'diagram.png'), 'image/png');

// Node
import { renderToCanvas } from '@retikz/canvas/node';
const canvas = renderToCanvas(ir, { width: 800 });
const pngBuffer = canvas.toBuffer('image/png');
```

**SVG → resvg → PNG 这条路径不进入主路**。仅作为"用户已经有 SVG 字符串、不想引 Canvas 依赖"的备选方案，在文档里提一下，不出独立包。

### 5.4 v3.x+（远期想象）

```
@retikz/native     React Native / Skia
@retikz/edit       基于 IR 的可视化编辑器（独立于 renderer）
@retikz/uml        UML 图
@retikz/mind       思维导图
@retikz/network    图论可视化 + force layout
text DSL           parse / format / lezer 语法定义
```

---

## 6. 多平台与跨框架

### 6.1 adapter 模式

参考 Floating UI / TanStack Query / Tiptap / Lexical：core + 各框架薄 adapter。

```ts
// @retikz/react
const Tikz = ({ ir }) => {
  const scene = useMemo(() => compileToScene(ir), [ir]);
  return <svg>{scene.primitives.map(renderPrim)}</svg>;
};

// @retikz/vue
defineComponent({
  setup(props) {
    const scene = computed(() => compileToScene(props.ir));
    return () => h('svg', scene.value.primitives.map(renderPrim));
  }
});

// @retikz/ssr
function renderToSVGString(ir: IR): string {
  const scene = compileToScene(ir);
  return `<svg>${scene.primitives.map(primToString).join('')}</svg>`;
}
```

每个 adapter 极薄（50 行级），不重复布局，不计算坐标。

### 6.2 一致性的三层

| 层 | 怎么保证 |
|---|---|
| **语义一致**：同 IR → 同 Scene | 所有 adapter 共享 `compileToScene`，自动保证 |
| **视觉一致**：同 SVG → 同像素 | SVG 标准严格，跨平台 99% 一致 |
| **像素级一致**：含文字测量 | 字体度量是真问题，见 6.3 |

### 6.3 文字测量问题（重要）

文字尺寸依赖字体引擎，浏览器有 / Node 没有 / Canvas 与 SVG 略不同。

**方案：core 提供字体度量注入接口**

```ts
// core 提供默认 fallback（基于平均字宽估算，不准但不为零）
type TextMeasurer = (text: string, font: FontSpec) => { width: number; height: number };

// 各 adapter 注入精确实现
// 浏览器：用 canvas measureText
// SSR：用 opentype.js / fontkit
// 完美主义者：可以预先生成所有用到的文字尺寸缓存进 IR
```

这是 Vega 走过的路，工业上验证可行。

### 6.4 框架自己的 DSL

**短期**：非 React 框架只接受 IR / sugar string，不提供组件 DSL：

```vue
<Tikz :ir="myIR" />
<Tikz src="node A at (0,0); draw A -| B" />
```

**中期**：如果某框架社区呼声高，再做 `@retikz/<framework>-components`（比如 Vue SFC 形式的 `<RtkPath>`）。

**约束**：DSL 因平台而异是合理的；IR 必须是 universal 的。

### 6.5 明确反对

- ❌ 不允许"框架专属 IR"——只有一份 IR
- ❌ 不允许 core 依赖 React / DOM / 任何 runtime-specific API
- ❌ 不允许 adapter 自己重做布局（必须用 Scene）

---

## 7. AI 友好性（第一设计目标 / 核心竞争力）

> 见 §1.2「第一设计原则」。本节展开 AI 友好性如何具体落地。
>
> **本节不是"附加章节"。它是 retikz 立项的根本理由，是其他所有架构决策必须服务的最高优先级目标。** 任何破坏本节能力的设计变更都需要反复推敲后才能引入。

### 7.1 AI 接口走 IR，不走 DSL

LLM 输出 JSX 是文本生成（容易出错、无法校验）；输出 JSON 可以走 OpenAI Structured Outputs / Anthropic Tool Use 强制 schema 校验，**100% 合法**。

→ **所有 AI workflow 的输入输出都是 IR JSON，不是 JSX**。

### 7.2 JSON Schema 是契约

- **用 zod 作为 IR 的单一来源**，同时产出 TS 类型（`z.infer`）和 JSON Schema（`zod-to-json-schema`）
- JSON Schema 喂给 LLM 作 system prompt / tool definition / structured output schema
- 字段必须加 `.describe(...)`（LLM 会读，影响生成质量）
- runtime 校验也用同一份 zod schema：`Schema.parse(unknownIR)`，单一来源 = 类型/校验/文档/AI 接口永不漂移
- 选 zod 而非 typebox / valibot / ajv 的核心理由：**AI 生态默认选**——Vercel AI SDK、Anthropic TS SDK、MCP TS SDK 全部以 zod 为一等公民，retikz 的工具/MCP server 接入是顺水推舟

### 7.3 增量编辑用 JSON Patch (RFC 6902)

```json
[
  { "op": "replace", "path": "/children/2/stroke", "value": "red" },
  { "op": "add", "path": "/children/-", "value": { "type": "node", "id": "C", ... } }
]
```

让 LLM 输出 patch 比让它重写整个 IR 便宜得多，且不破坏其他部分。**JSX 完全做不到这点**——你不能 patch JSX。

### 7.4 MCP / function calling 友好

未来可以暴露 IR 操作为 MCP tools / LLM functions：

```ts
const tools = [
  { name: 'addNode', schema: { ... } },
  { name: 'connectNodes', schema: { ... } },
  { name: 'addLabel', schema: { ... } },
];
```

让 LLM 多轮调用工具，逐步构造 IR，每步可视化、可撤销。

### 7.5 标准示例库

IR 文档里附 20–50 个标准例子（流程图、状态机、UML、电路、思维导图……），既给人看，也给 LLM 做 few-shot prompt。

### 7.6 TikZ 语法是 AI 友好的额外加分项

text DSL 采用 TikZ 原生语法（§4.2 / §1.3）对 AI 而言是**白送的能力**：

- **TikZ 是 LLM 训练数据中体量极大的图形描述语言**——arXiv、教材、Stack Overflow、个人博客二十年的积累。所有主流 LLM 都对 TikZ 有原生熟悉度，零样本生成能力远超任何自创 DSL
- **LLM 可以直接消化用户已有的 `.tex` 文件做迁移**：用户喂一段 LaTeX 论文中的 TikZ 代码，LLM 调用 retikz 工具一键转 IR
- **双向转换降低 AI 出错代价**：AI 生成的 TikZ 不正确时，retikz parser 会精确报错，用户能反馈给 AI 修；与"AI 生成自创 DSL → 静默失败"的体验差异巨大
- **生态借力**：用户问 ChatGPT/Claude "怎么用 TikZ 画 X"得到的答案大概率能直接喂给 retikz，retikz **不需要从零教育市场**

→ 这条价值在自创 DSL 的方案下完全不存在。这是"采用 TikZ 语法"决策的隐藏 AI 红利。

### 7.7 schema 设计的 AI 加分项

- discriminated union 用清晰 `type` 字段
- 关键字段在 schema description 里写清含义（保留 TikZ 词汇 `via='-|'` + 文档解释）
- 避免顺序敏感的隐式数组（用 dict + id，或显式 `order` 字段）
- 避免 polymorphic 同字段两种类型
- 避免 magic literal（`-1` 表示"最后一个"这种）

---

## 8. Domain 包架构

### 8.1 已决策

#### 必须编译到 core IR

```
@retikz/flow   ─┐
@retikz/plot   ─┼─→  core IR (JSON)  ─→  renderer
@retikz/uml    ─┘
```

不允许 domain 包搞自己的 IR 或自己的 renderer。

理由：
- 持久化只有一份格式
- renderer 自动支持所有 domain
- 跨包互操作免费（flow 里嵌 plot 是 trivial）
- AI 只学一份 schema

#### IR 节点带 `meta` 扩展点保留 domain 语义

```json
{
  "type": "node", "id": "d1",
  "position": [3, 2],
  "meta": {
    "domain": "flow",
    "kind": "decision",
    "branches": { "true": "n2", "false": "n3" }
  }
}
```

- 不认识 flow 的 renderer 当普通 node 画
- 认识 flow 的工具能还原高层语义
- core 不理解 meta 内容，只保证存进 / 读出不丢失

参考：MDX、Slate、ProseMirror 的扩展节点模式。

#### Layout 算法住在 domain 包

| domain | 典型布局 |
|---|---|
| flow | dagre / elkjs（DAG） |
| plot | d3-scale |
| mind | d3-hierarchy |
| network | d3-force |

**core 只提供"给坐标我画"的能力**，dagre / elkjs 这种重量级依赖绝不能进 core。

### 8.2 第一个 domain 包：flow（v1.x）

为什么先做 flow 不先做 plot：
- 直接对应 TikZ 招牌能力（流程图）
- 范围有界（5–10 种节点形状 + DAG 布局覆盖 80%）
- 验证 meta 扩展点设计
- plot 涉及数据绑定 / scale / 数十种 mark / 动画 / 交互——是另一个重量级项目

### 8.3 框架无关性

domain 包尽量是纯函数（输出 IR），不绑 React。需要框架组件时再各自包一层：

```
@retikz/flow         核心：纯函数 + IR 输出
@retikz/flow-react   React 组件包装（短期里可以合并）
@retikz/flow-vue     Vue 组件包装
```

短期合并 OK，**核心逻辑必须是纯函数**，将来才能拆。

---

## 9. 演进路线

### v0.x：重写起步（只做 core + react adapter）

里程碑：
- [ ] 用 zod 定义 IR schema（单一来源），导出 TS 类型 + JSON Schema
- [ ] 拍板 4.1 的待决项（via / target / step naming）
- [ ] kernel 组件 `<Path>` `<Step>` `<Node>` `<Anchor>` `<Scope>`
- [ ] sugar 组件 `<Draw>` + `parseWay`
- [ ] `compileToScene` 纯函数
- [ ] `@retikz/react` adapter（≤100 行）
- [ ] 几何 / 路径 / line / anchor 等纯函数模块加单测
- [ ] CI 加 "core 在零 React 环境可加载" 的检查
- [ ] 文档站迁移（`apps/docs`）

不做：
- ❌ 多框架
- ❌ SSR
- ❌ domain 包
- ❌ text DSL
- ❌ 编辑器
- ❌ animation / interactivity / a11y（这些 v2.x 系统性设计）

### v1.x：生态扩展

- [ ] `@retikz/ssr`（验证 core 真的脱离浏览器）
- [ ] `@retikz/vue`（验证 adapter 模式 + DSL 边界）
- [ ] `@retikz/flow`（第一个 domain 包，验证 meta 扩展点）
- [ ] 字体度量注入接口
- [ ] AI 工具集：JSON Schema 导出 / few-shot 示例库 / JSON Patch 支持

### v2.x：生态成熟

- [ ] `@retikz/canvas`
- [ ] `@retikz/plot`（chart domain，比 flow 重数倍）
- [ ] `@retikz/codec`（IR ↔ TikZ 源码 / Mermaid）
- [ ] animation / interactivity / a11y 系统
- [ ] MCP server

### v3.x+：远期

- React Native / Skia
- 可视化编辑器
- **text DSL（采用 TikZ 原生语法子集）**：parser + format + Lezer 语法定义；与 `@retikz/codec` 联动实现 LaTeX 双向兼容
- UML / mind / network 等长尾 domain
- 协作编辑（CRDT，需要时再扁平化 IR）

---

## 10. 已决策清单

| 决策 | 内容 | 节 |
|---|---|---|
| **第一设计原则** | **AI 友好优先于其他所有维度，是 retikz 的核心竞争力** | **1.2** |
| 项目定位 | AI-native + TikZ 风格通用绘图，非 chart 库 | 1 |
| IR 居中 | 所有 DSL / AI 输入翻 IR；所有 renderer 读 IR | 2 |
| Sugar 不引入新能力 | 否则分层假 | 2 |
| 单 `<Step>` 组件 | 不拆 `<Move>` `<Line>` `<Close>` | 4.1 |
| `kind` 默认 `'line'` | 高频默认 | 4.1 |
| Sugar 是 render-time parser | 不走 babel 插件 | 4.2 |
| **Text DSL 采用 TikZ 原生语法（兼容子集）** | 不自创 TikZ-lite，复用 TikZ 二十年生态 + LLM 训练数据红利 | 4.2 |
| IR schema 形态：混合 | 树为主，需要时挂 id | 4.3 |
| **Schema 工具选 zod** | 同时产 TS 类型 + JSON Schema；AI SDK 生态默认选 | 4.3 / 7.2 |
| JSON Schema 一等公民 | 同源生成 TS 类型 + Schema | 4.3 |
| Core 必须零依赖、零框架 | 跨平台前提 | 5.1 |
| Adapter 模式 | core + 各框架 50 行 adapter | 6.1 |
| **Canvas 走原生路径** | 直接 Scene → Canvas，不经 SVG 中转；PNG/JPEG/WebP 由 canvas.toBlob 导出 | 5.3 |
| **Scene 是渲染目标无关的最大公约子集** | 不向 SVG / Canvas 任一方倾斜；SVG-only / Canvas-only 特性禁止进入 Scene | 4.4 |
| AI 走 IR 不走 DSL | structured output 友好 | 7.1 |
| 增量编辑用 JSON Patch | LLM 友好 | 7.3 |
| Domain 包编译到 core IR | 不搞 domain-IR | 8.1 |
| IR 节点带 `meta` 扩展点 | 保留 domain 语义 | 8.1 |
| Layout 算法住 domain 包 | dagre/elkjs 不进 core | 8.1 |
| 先做 flow 不先做 plot | flow 范围有界，plot 是另一个重量级项目 | 8.2 |
| Text DSL 远期再做 | v0/v1 不做 | 4.2 |

## 11. 待决策清单（架构层面）

本文档层面没有未决的架构问题。所有架构决策（IR 居中、AI 优先、混合 schema、zod、TikZ 语法、Canvas 原生路径、domain 包模式等）均已落定。

具体实施层面的待拍板项（折角语法、Target 表达、anchor 表达、Step 命名、组件→IR 写入机制等）见 [`CORE-REFACTOR.md`](./CORE-REFACTOR.md) §3。这些是落地细节，不影响架构正确性，重写启动前在那个文档中拍板。

## 12. 明确反对清单

| 反对 | 原因 | 节 |
|---|---|---|
| ❌ IR 类型里塞 `ReactNode` / `Ref` / 函数 children | 跨平台、SSR、Canvas、跨语言全封死 | 4.3 |
| ❌ 用 XML 做持久化 | LLM / TS / DB 都不友好；和 SVG 混淆 | 4.3 |
| ❌ 默认用纯扁平 IR | 人/LLM/Git 都偏好树 | 4.3 |
| ❌ Sugar 引入新能力 | 分层立刻假 | 2.2 |
| ❌ Domain 包搞自己的 IR | 持久化 / renderer / AI 接入全部碎裂 | 8.1 |
| ❌ Core 依赖 React / DOM / runtime API | 跨平台前提 | 5.1 |
| ❌ Adapter 自己做布局 | Scene 抽象目的就是消除这种重复 | 6.1 |
| ❌ Canvas renderer 通过解析 SVG 字符串实现 | 性能差、二次转换损失质量、丧失 Canvas 原生能力 | 5.3 |
| ❌ PNG/JPEG/WebP 通过 SVG → resvg/sharp 管道做主路 | 应通过 Canvas 原生 toBlob 导出；SVG → 栅格化只作备选 | 5.3 |
| ❌ Scene 携带 SVG-only 或 Canvas-only 特性 | 一旦进入，对应 renderer 路径就废了 | 4.4 |
| ❌ Babel 插件做 sugar 编译 | 维护多打包器版本成本巨大 | 4.2 |
| ❌ 短期硬刚 ECharts | 生态成熟度差距是数量级的 | 1.2 |

---

## 13. 设计权衡的"为什么"备忘

> 后续遇到边界场景时按这些"为什么"判断。

- **为什么 AI 友好是第一优先级，不是其中之一？** 因为这是 retikz 在已有图表库生态中**唯一无法被快速复制**的差异化。Recharts / ECharts / Highcharts 哪一家想加新 chart 类型、加 React 组合，工程上都做得到；但要把它们的核心架构重做成"AI 一等输入、IR 居中、JSON Schema 强校验"，等于推倒重来。这扇窗只对新项目开放，retikz 必须从第一行代码就守住。
- **为什么 text DSL 采用 TikZ 原生语法而不是自创？** 三个互相加强的理由：(1) **生态借力**——TikZ 二十年沉淀的语法、教材、StackOverflow 答案、个人博客示例全部直接为 retikz 所用，省下"教育市场"成本；(2) **AI 友好放大器**——LLM 对 TikZ 的训练数据量极大，零样本生成质量远超任何自创 DSL，与 §1.2 的第一原则强协同；(3) **真实迁移路径**——用户可以把已有 `.tex` 论文中的 TikZ 直接搬进浏览器，反向也能从浏览器导出贴回论文，形成与 LaTeX 生态的双向桥梁。代价是 parser 复杂度更高、需要明确支持的子集边界，但收益远大于成本。**反过来想**：如果自创 DSL，则 (1) 失去整个 TikZ 生态、(2) AI 帮助下降一个数量级、(3) 永远无法和 LaTeX 双向互通——三条都是结构性损失。
- **为什么不允许 IR 装函数？** 因为函数不能序列化，一旦放进去，"持久化 / SSR / 跨语言 / AI" 这些能力一刀切。代价是用户写交互稍麻烦（id 注册），收益是整个架构开放。**注意这条规则的根因来自 AI 友好性**——AI 输出的 JSON 不可能含函数。
- **为什么 Sugar 不能引入新能力？** 因为 Sugar 是 IR 的语法表面之一。如果某个能力只能用 Sugar 写，那它就**不在 IR 里**——那它持久化、跨平台、AI 接入怎么办？这条规则是分层模型的硬骨头。
- **为什么不让 Domain 包做自己的 IR？** 因为如果 flow 自己定义 IR，那么：保存 flow 图和保存 plot 图用不同 JSON 格式 → 用户的"我的图集"系统要写 N 套 → renderer 也要写 N 套 → AI 要学 N 套 schema。3 个月内你会想合并它们。一开始就别分。
- **为什么不上 Babel 插件？** 不是技术原因，是维护成本。Babel + SWC + Vite + Rspack + Webpack + esbuild 各一份插件，每个都要追上游版本。你是个人/小团队项目，扛不住。
- **为什么先做 flow 不做 plot？** flow 是 TikZ 招牌能力（流程图）+ 范围有界 + 验证你的架构。plot 是数据绑定 + scale + 数十种 mark + 动画交互，本质是另一个重量级项目（recharts 自己就是一整个项目）。先做 flow 把架构 v1 跑通，再说。
- **为什么 IR 用 JSON 不用 XML？** JSON 对 LLM 友好（输出质量、structured output 支持），TS 类型派生方便（zod/typebox），数据库索引天然（Postgres JSONB），且**不会和 SVG 输出在视觉上混淆**。
- **为什么文字测量要做注入接口？** 因为浏览器 / Node / RN / Canvas 各家文字引擎都不同，硬绑死任何一家都让某些场景出错。注入接口让默认场景零成本（fallback），需要精度的人自己付成本。
- **为什么 Canvas 不通过 SVG 中转？** "原生支持更好"是核心理由：(1) **性能**——直接 `ctx.fillRect` 远快于解析 SVG 字符串再转换；(2) **质量**——SVG → Canvas 转换器在文字 / 渐变 / 滤镜上有不可避免的差异，且会被二次累积；(3) **能力**——只有原生 Canvas 才能用 `getImageData` / hit-testing / 高频动画 / blend mode 等独有特性；(4) **架构对称**——SVG renderer 和 Canvas renderer 应该是平级兄弟，共享上游的 Scene，而不是父子关系（一个依赖另一个的输出）。同理 PNG/JPEG/WebP 也走 Canvas 原生 toBlob，不走 SVG → resvg 栅格化管道。
- **为什么 Scene 必须是渲染无关的最大公约子集？** Scene 是所有 renderer 平等服务的契约。一旦掺入 SVG-only（如 `<filter>` 复合、`<marker>`、`<defs>` 共享）或 Canvas-only（如 `getImageData`、复杂合成模式）特性，对应另一边的 renderer 就崩了。需要类似能力时，先看能否用最大公约表达（如阴影 = `shadowProps` 抽象，各 renderer 翻成自己的 API），不能就推迟该特性，不能为短期方便破坏 Scene 中立性。
- **为什么不做编辑器？** v3.x+ 才考虑。编辑器是另一个产品，不是图形库。先把图形库做扎实。

---

## 14. 项目可行性评估

| 维度 | 评分 | 注释 |
|---|---|---|
| 架构先进性 | 🟢 9/10 | 业内罕见的完整分层，理论最优 |
| 解决问题真实性 | 🟢 8/10 | "通用图元 + React + 持久化"市场空白真实 |
| 技术可实现性 | 🟢 8/10 | 全是组合已知方案，无需发明 |
| chart 赛道竞争力 | 🟡 4/10 | 难赢 ECharts/Highcharts |
| diagram 赛道竞争力 | 🟢 7/10 | drawio 老旧、react-flow 不通用，有空间 |
| AI 赛道竞争力 | 🟢 8/10 | 起跑线接近 Mermaid，潜在更强 |
| 生态成熟度 | 🔴 2/10 | 起步阶段 |
| 个人/小团队可执行性 | 🟡 5/10 | 必须严格控范围 |

**结论：架构先进真，市场不确定真。是高潜力高风险项目，需要 3–5 年持续投入才能兑现。**

---

## 15. 重写动手前必读

- 本文档（DESIGN.md）：通读，理解所有架构决策与"为什么"
- [`CORE-REFACTOR.md`](./CORE-REFACTOR.md)：通读 §3 把待拍板项定完，按 §8 顺序动手
- AI 协作时把两份文档都喂进上下文，每次开会话提醒对方读过

---

*本文档来自 2026-04-26 的架构讨论。后续如有重大架构调整，请更新本文档而不是另起新文。具体实施细节的演进记录在 `CORE-REFACTOR.md`。*

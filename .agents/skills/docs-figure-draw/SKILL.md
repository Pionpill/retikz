---
name: docs-figure-draw
description: 在 retikz 文档站用 retikz 自身画叙述性插图（架构图、流程图、概念示意）——dogfood 优先于 ASCII / Mermaid / 截图。本 skill 给出配图惯例：默认 `stroke="none"` 当文字锚点、`hideCode` 当配图工具、y 轴朝下、宽度搭配 `maxWidth:100%` 自适应、按需 `size` 收紧高度。仅 retikz 项目相关。
---

# 文档站用 retikz 画配图

## 何时用本 skill

- 文档（`apps/docs/src/contents/**/*.mdx`）里需要插一张架构 / 流程 / 概念示意图
- 原稿是 ASCII 框图、Mermaid、截图、外站绘图——一律改成 retikz 自绘
- 演示组件用法的 demo（用户复制源码学法）**不走本 skill**，走 `docs-doc-principle` 的 `<ComponentPreview>` 默认模式

判断：用户想"复制源码学怎么写"→ 例子 demo（`hideCode=false`）；想"看懂这张图说啥"→ 叙述性插图（本 skill）。

## 总览

retikz 文档既是教材也是 retikz 的活体演示——叙述性插图也必须 dogfood。一张配图 = **一个 `.demo.tsx` + 一行 `<ComponentPreview hideCode />`**：

```
contents/<...>/<page>/
  <figure-name>.demo.tsx     # 单语共用；或拆 .zh / .en（仅当 label 含本地化文本时）
  index.zh.mdx               # <ComponentPreview name="<figure-name>" hideCode />
  index.en.mdx               # 同上
```

## 配图风格：学术、简约

retikz 文档配图追求**学术论文式的简约**——配图是为了传递结构，不是展示样式能力。一张好的概念配图应该像教科书插图：干净、克制、信息密度高。

- **节点一般不描边**：默认 `stroke="none"`，节点是文字锚点不是 UI 框（见下「硬规则」）。只有当「框」本身是概念的一部分（演示 boundary / bbox / 节点形状）时才上描边。
- **克制用色**：默认 `currentColor` / `gray`；只有需要强调或区分时才上彩色，且优先单一强调色 `darkorange`。一张图里彩色越少越好——颜色用来「指出重点」，不是铺底装饰（配色档位见下「配色」）。
- **不堆装饰**：不加圆角、阴影、渐变、字号特效、背景块。这些对「讲清结构」零贡献，只稀释信息。
- **留白与对齐**：节点对齐到规整的行 / 列，间距均匀；宁可少画一个节点，也不要挤。

自检：把图想象成灰度打印，结构是否依然一眼可读？彩色是否只落在真正的重点上？两条都「是」才算合格。

## 硬规则（不可绕）

| 规则 | 原因 |
| --- | --- |
| **所有 Node 默认 `stroke="none"`** | 配图里的 Node 是文字锚点，不是视觉框；外框抢戏且把 Draw 线和文字搅在一起 |
| **`<ComponentPreview hideCode />`** | 叙述性插图不需要源码 / IR Tab；显源码反而模糊"这是图"语义 |
| **`default export FC`，不能用 hooks** | `ComponentPreview` 会调一次 `Component({})` 算 IR；hooks 在非渲染路径触发 React 错误 |
| **连线靠 id，不写绝对坐标** | `Draw way={['from_id', 'to_id']}` 由 Node 的 bbox 自动贴边；写坐标会跟节点宽度脱节，加字就破图 |

## 节点：当文字锚点用

```tsx
<Node id="ir" position={[0, 0]} stroke="none">
  IR (JSON)
</Node>
```

- `stroke="none"`：去外框；文字直接落在画布上
- `id`：给后面的 `Draw way={[...]}` 引用
- `position={[x, y]}`：笛卡尔；**y 轴朝下**（SVG 惯例，y=100 在 y=0 下方）
- children 写显示文字；多行用字符串数组或 `<Text>`（参见 `core/components/node/text`）

**短标签优先**——配图节点不是表格行，能砍字就砍。"IR (JSON)" 比 "Intermediate Representation (JSON 格式)" 强百倍。

**描述性 / 次要文字用灰**——caption、标注、模块来源等说明性文字用 `textColor="gray"`，跟主节点的默认色（继承 `currentColor`）拉开层次。配色细则见下「配色」。

**备注 / caption 放被标注元素下方**——说明文字默认置于元素**下方**（y 更大），用箭头朝上指向元素；多个 callout 时在底部排成一行。读者先看图、再读注，注不压图。

## 配色

配图颜色**优先用常见 CSS 关键字**，不要写十六进制随手值——关键字语义清晰、跨主题稳定、好记。默认主强调色用 `darkorange`；只有一张图里需要两个以上并列示例，或明确要做对比时才用 `dodgerblue`；若同图已经用了 `darkorange` + `dodgerblue` 仍需要第三个强调色，再用 `darkviolet`。`red` / `green` 只保留给错误 / 成功语义；中性色只保留 `gray` / `lightgray` / `dimgray`，并尽量不用 `black` / `white`。

- **默认 `currentColor` / `gray`**：描述性 / 次要文字、辅助标记优先用 `currentColor` 或 `gray`
- **需要强调 / 区分时上彩色，默认 `darkorange`**；需要并列对比两个以上示例时用 `dodgerblue`；第三强调色用 `darkviolet`
- **浅弱视觉**：背景、网格、边框优先 `lightgray`
- 主节点文字不染色，保持默认 `currentColor`（继承主题前景色）

## 连线：贴边 + 箭头语义

```tsx
<Draw way={['ir', 'scene']} arrow="->" />
<Draw way={['ir', 'persist']} arrow="<->" />
<Draw way={['geometry', 'compile']} arrow="->" strokeDasharray="4 3" />
```

| 形态 | 用途 |
| --- | --- |
| `arrow="->"` | 单向数据 / 调用流（默认箭头） |
| `arrow="<-"` | 反向，少用——一般翻 `way` 顺序 |
| `arrow="<->"` | 双向，如 IR ↔ 持久化 / 编辑 |
| `strokeDasharray="4 3"` | 虚线，表示**工具依赖**（如 geometry 被 compile 调用，不是独立数据通道） |

实线 = 数据流；虚线 = 调用 / 工具关系。混着用会让读者分不清"信息流向哪里"。

**箭头上的文字（edge label）至少比常规文字小 2 号**——边标注是给箭头加注释，不是主体，必须从字号上退到背景层。label 默认字号 14，配图里一律写 `font={{ size: 12 }}`（或更小）压下去，并配 `textColor="gray"`：

```tsx
<Draw way={['a', { label: { text: 'anchors', side: 'above', textColor: 'gray', font: { size: 12 } } }, 'b']} arrow="->" />
```

`{ label: {...} }` 作为 `way` 的中间元素插在两个 target 之间，渲染在该段箭头中点；`side` 控制在线的上/下方。

## 坐标系与排版

- **y 轴朝下**：position `[x, y]` 中 y 越大越靠下
- **节点中心 = `position`**：bbox 由文字 + `padding`（默认 8）自动算
- **常见排版**：
  - 水平流水线：节点同 y，x 递增
  - 纵向流水线：节点同 x，y 递增
  - 漏斗 / fan-in-fan-out：左列竖排输入 → 中央节点 → 右列竖排输出
  - 上下两层标注：顶行流水线 + 底行模块来源（如 reading-guide 的 data-flow）

## Layout 容器：响应式 + size 档位

```tsx
<Layout width={520} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
  ...
</Layout>
```

- `width` / `height` 给**逻辑像素**——SVG 内部坐标系上限
- `style={{ maxWidth: '100%', height: 'auto' }}`：窄屏自动缩放，不破容器
- 文档正文最大宽度 **640px**（`max-w-160`），ComponentPreview 内部还有 `p-6 sm:p-10` 内边距——**Layout 实际可视宽度 ≤ ~560px**
- 实在放不下：先压缩内容（短标签 / 砍多余节点 / 拆 PNG 等"二级输出"成独立节点偏移）；再考虑换纵向排版

`<ComponentPreview>` 的 `size` 档位控制**渲染区高度**（不影响 Layout 内部坐标）：

| size | 适用 |
| --- | --- |
| `xs` | 极简两三个节点的小图 |
| `sm` | 单行或两行的扁横向图（如 data-flow） |
| `md`（默认） | 中等复杂度（如 ir-centric） |
| `lg` / `xl` | 高密度概念图、流程图 |

## 双语 demo：仅当 label 含本地化文字才拆

`ComponentPreview` 的 demo 解析按**先语言版后无后缀**回退：

| 文件 | 用途 |
| --- | --- |
| `<name>.demo.tsx` | 单语共用——所有 label 都是技术词 / 文件路径 / 英文术语 |
| `<name>.zh.demo.tsx` + `<name>.en.demo.tsx` | 拆双语——存在 label 中含纯中文 / 纯英文（如 "持久化 / 编辑" vs "persistence / edit"） |

绝大多数架构图的 label 是 `IR`、`Scene`、`@retikz/react` 这类技术词——**用单文件**。能不拆就不拆，拆了维护翻倍。

## 模板：横向流水线 + 模块来源（reading-guide data-flow 同款）

```tsx
import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={660} height={150} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 顶行：数据管线 */}
    <Node id="a" position={[-300, 0]} stroke="none">A</Node>
    <Node id="b" position={[-100, 0]} stroke="none">B</Node>
    <Node id="c" position={[100, 0]} stroke="none">C</Node>

    <Draw way={['a', 'b']} arrow="->" />
    <Draw way={['b', 'c']} arrow="->" />

    {/* 底行：模块来源 */}
    <Node id="b_src" position={[-100, 90]} stroke="none">src/b/*</Node>
    <Node id="c_src" position={[100, 90]} stroke="none">src/c/*</Node>

    <Draw way={['b_src', 'b']} arrow="->" />
    <Draw way={['c_src', 'c']} arrow="->" />
  </Layout>
);

export default Demo;
```

mdx：

```mdx
<ComponentPreview name="data-flow" size="sm" hideCode />
```

## 模板：漏斗（fan-in → 中心 → fan-out）

```tsx
const Demo: FC = () => (
  <Layout width={520} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 左列输入 */}
    <Node id="in1" position={[-160, -48]} stroke="none">Input 1</Node>
    <Node id="in2" position={[-160, -16]} stroke="none">Input 2</Node>
    <Node id="in3" position={[-160, 16]} stroke="none">Input 3</Node>
    <Node id="in4" position={[-160, 48]} stroke="none">Input 4</Node>

    {/* 中心 */}
    <Node id="hub" position={[-30, 0]} stroke="none">Hub</Node>
    <Node id="next" position={[60, 0]} stroke="none">Next</Node>

    {/* 右列输出 */}
    <Node id="out1" position={[200, -48]} stroke="none">Out 1</Node>
    <Node id="out2" position={[200, -16]} stroke="none">Out 2</Node>
    <Node id="out3" position={[200, 16]} stroke="none">Out 3</Node>
    <Node id="out4" position={[200, 48]} stroke="none">Out 4</Node>

    {[1, 2, 3, 4].map(i => (
      <Draw key={`in-${i}`} way={[`in${i}`, 'hub']} arrow="->" />
    ))}
    <Draw way={['hub', 'next']} arrow="->" />
    {[1, 2, 3, 4].map(i => (
      <Draw key={`out-${i}`} way={['next', `out${i}`]} arrow="->" />
    ))}
  </Layout>
);
```

mdx：`<ComponentPreview name="hourglass" hideCode />`（用默认 md 档位）。

## 一个角色一套编码，全页一致

图里每种「角色」——某条数据 / 调用流、结构里的某一层、某类参考点、某种状态——**固定一套视觉编码（颜色 + 实/虚线型 + 填充 vs 描边），并在同一页所有图里复用同一套映射**。读者会跨图比对，编码一致才对得上；别按单张图随手配色。

- 先定「角色 → 编码」映射、全页照抄；同一角色不能 A 图一种色、B 图换一种。
- **强调色属于「被指的那个元素」本身**，给它命名的标注文字退回 `gray`——强调留给元素，文字别抢色。
- 沿用既有约定：某个填充 / 颜色在别处已表示某物，本图就别拿它表示别的。

## 一个标记只承担一个概念

别让一个图形替两个概念——把 A 当成 B 来画，会编码出**错误的几何 / 关系**，比「画得丑」更糟。两个相关但不同的东西（哪怕在常见情形下重合）也各画各的标记，需要时再用文字说明它们何时重合；不要靠一个标记把它们糊在一起。

## 叠加几何要算准，别目测

图里叠在真实元素之上的**派生几何**（外层框、轮廓、参考点、命中区、连线落点……）要算准：照搬真源公式，或起一个一次性 vitest 用 `compileToScene` 读真实坐标再写死——目测的叠加层和真实渲染对不齐就露馅。

- **语义参考点可能 ≠ 视觉中心**（元素带 offset 时）：按真实偏移补偿摆位 / 叠点，别默认居中。
- 一次性量法量完即删，别把临时 test / 中间产物留仓里。
- 闭合折线用 `DrawWay.Cycle` 收尾，别复制首顶点。

## 跨图对齐：字号 / 尺寸

一页多图并排，读者会下意识比较，视觉量纲要统一。

- **字号按 viewBox 宽换算**：屏幕上字号 ≈ `font.size × 容器宽 / viewBox 宽`。两张图同一个 `size` 档但 viewBox 宽不同，字号看起来就不一样。要和某张姊妹图字号一致：本图 `font.size ≈ 姊妹图字号 × (本图 viewBox 宽 / 姊妹图 viewBox 宽)`。
- **适配更小的 `size` 档靠压高宽比，不是等比缩小**：`size` 定渲染高度、图按 viewBox 高宽比铺满宽度；等比缩小内容 + viewBox 不改高宽比、对 fit 没用。要塞进更小档就**收紧纵向**降低 `viewBox 高/宽`，对齐一张已知能放下的姊妹图。
- **一个主题只画一张图**：别为同一主题做两张只换标注的图；合成一张，把两套标注并进去。

## 标注克制

- **一个标注一条引线**：一条垂直 / 水平箭头说得清，就别画两条斜的。
- **多图共享同一元素**：标注放**中间**、向两侧各引一条，一处覆盖多图。
- **对照「改 A 只动 B、不动其它」**：把不变的部分在各图里画得**一模一样**，用视觉等同证明「没变」。
- **只画能体现该机制的对象**：硬塞不符合的会误导。

## Common Mistakes

- **Node 留默认外框** —— 一定 `stroke="none"`，配图是文字不是 UI 框
- **忘了 `hideCode`** —— 配图下面冒出"View Code"按钮，读者以为是 demo
- **demo 用 hooks 或 Layout 之外的副作用** —— `Component({})` 算 IR 时炸
- **写绝对坐标连线** —— `Draw` 一律用 id；改一处文字就要重算所有坐标
- **Layout 宽度硬码 700+** —— 文档区窄；超过 ~560 在窄屏会破版（哪怕加了 maxWidth）。先想能不能砍节点 / 短标签
- **纯技术 label 拆双语 demo** —— `IR` `Scene` `@retikz/react` 不需要翻译，单文件就够
- **配色用了十六进制随手值**——一律用关键字 `gray` / `lightgray` / `dimgray` / `red` / `green` / `darkorange` / `dodgerblue` / `darkviolet`；默认 `gray`，强调色 `darkorange` 优先
- **箭头上的文字没缩小**——edge label 至少比常规小 2 号（默认 14 → 写 `font={{ size: 12 }}`）并配 `textColor="gray"`；与常规文字同号会喧宾夺主
- **过度装饰**——填色 / 圆角 / 阴影 / 给主节点做字号特效强调对配图没价值；配图传递结构，不展示样式能力（edge label 缩小是层次需要，不算装饰）
- **图替代不了文字**——架构含义必须在配图前后的段落 / 标题里讲清；图是辅助，不是主体
- **一个标记替两个概念**——一图一概念；把 A 当 B 画会编码出错误的几何 / 关系
- **强调色染到标注文字**——强调色只给被指的元素，标注文字一律 `gray`
- **按单图随手配色**——「角色 → 编码」先定一套、全页所有图复用
- **叠加层目测**——派生几何按公式算或 `compileToScene` 量；语义点带 offset 要补偿
- **等比缩小想塞进小 size**——改的是高宽比不是绝对大小；压纵向降 aspect、对齐姊妹图
- **同一主题画两张图**——合并成一张带两套标注
- **一个标注两条箭头**——一条够了；多图共享元素就中间标注、向两侧各引一条

## 验证

加完插图之后跑：

```bash
pnpm --filter @retikz/docs dev
```

浏览器打开页面，检查：

- [ ] 配图渲染、节点位置不重叠、连线方向 / 虚线语义正确
- [ ] 窄屏（< 600px）能正确缩放，不横向滚动
- [ ] 中英两版（如有拆）label 都对得上
- [ ] 没有遗留的 ASCII / Mermaid / 截图

## 与 doc-skill 的分工

| 任务 | skill |
| --- | --- |
| 加 / 改文档页（结构、双语、注册） | `docs-doc-principle`（按页型再读 `docs-doc-component` / `docs-doc-example`） |
| 给已有页面加一张**叙述性插图** | 本 skill |
| 给组件页加**演示用法的 demo** | `docs-doc-principle`（默认 `<ComponentPreview>`） |

两个 skill 协作：先按 `docs-doc-principle` 把页面骨架立起来，再按本 skill 把"图"这部分填上。

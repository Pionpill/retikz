---
name: docs-figure-contract
description: Use when drawing or reviewing architecture, flow, concept, schema, API, or implementation-explanation figures in retikz apps/docs; covers dogfood, ComponentPreview hideCode, file shape, visual vocabulary, responsive layout, node/edge conventions, and validation. Specialized figure skills such as docs-figure-logic must read this first.
---

# Draw Figure Contract

本文是 retikz 文档站所有**叙述性插图**的基础契约，只写所有图都必须遵守的方法论与硬约束。具体插图任务、实现逻辑图风格、页面写作结构交给更具体的 docs / figure skill。

## 适用边界

使用本 skill 当页面需要一张帮助读者理解结构、流程、关系或机制的图：

- 架构图、流程图、概念示意、schema / API 关系图、功能实现逻辑图。
- 原稿是 ASCII 框图、Mermaid、截图或外部绘图时，优先改成 retikz 自绘。
- 用户要“看懂这段解释”时使用叙述性插图；用户要“复制源码学组件怎么写”时使用普通 `<ComponentPreview>` demo，不走本 skill。

## 基本形态

叙述性插图必须 dogfood retikz：

```text
contents/<...>/<page>/
  <figure-name>.demo.tsx
  index.zh.mdx
  index.en.mdx
```

MDX 中使用：

```mdx
<ComponentPreview files="<figure-name>" hideCode />
```

规则：

- demo 默认 `export default FC`，不要用 hooks 或渲染外副作用；`ComponentPreview` 会直接调用组件生成 IR。
- 技术 label 可用单文件 `<name>.demo.tsx`；只有 label 含本地化文本时才拆 `<name>.zh.demo.tsx` / `<name>.en.demo.tsx`。
- 图不能替代正文。图前后必须用段落或小节标题解释读者应看什么。

## 视觉语言

叙述图追求学术、克制、可打印，而不是展示样式能力。

- 每张图根据表达需要选择一种节点边界模式：需要呈现分类、分组、容器或复杂流程边界时使用统一有框节点；内容清晰简洁且没有分类或容器语义时可以使用统一无框节点。边框必须承担语义，不作为默认装饰；同一张图不混用两种模式。
- 不用随手十六进制色值，不堆圆角、阴影、渐变、背景块、字号特效。
- 一页多图时，先定“角色 -> 视觉编码”映射，并在全页复用。

颜色只用常见 CSS 关键字。默认从高优先级开始选，只有语义需要时才下探到更低优先级。

| 颜色           | 使用场景                                           | 优先级      |
| -------------- | -------------------------------------------------- | ----------- |
| `currentColor` | 主节点文字、普通结构文字、继承文档前景色的默认内容 | P0 默认     |
| `gray`         | 次要说明、caption、edge label、辅助标注文字        | P0 默认     |
| `lightgray`    | 浅边界、分组框、参考线、弱化的派生几何             | P1 辅助     |
| `dimgray`      | 需要比 `gray` 更稳的中性边界或非主路径文字         | P1 辅助     |
| `darkorange`   | 第一语义类别，如数据契约                           | P2 类别色   |
| `dodgerblue`   | 第二语义类别，如运行时依赖                         | P2 类别色   |
| `darkviolet`   | 第三语义类别，仅当同图必须区分三类角色时使用       | P2 类别色   |
| `red`          | 错误、失败、拒绝、危险路径                         | P5 语义专用 |
| `green`        | 成功、通过、完成路径                               | P5 语义专用 |

颜色只标记角色类别：同色节点必须属于同一稳定类别，无关角色使用中性色或不同语义色。单行同级节点的当前重点可用 `font={{ weight: 'bold' }}` 标出，不借复用强调色表达；双行节点统一加粗标题只表达信息层级，不等同于当前重点。

自检：灰度打印后结构仍一眼可读；去掉颜色后仍能靠文字、字重、线型和位置看出重点与关系。

## 节点与文字

```tsx
<Node
  id="ir"
  position={[0, 0]}
  stroke="darkorange"
  fill="darkorange"
  fillOpacity={0.08}
  cornerRadius={4}
  font={{ weight: 'bold' }}
>
  IR (JSON)
</Node>
```

- `id` 用于连线引用。
- `position={[x, y]}` 中 y 轴向下。
- 有框模式中的常规 `Node` 统一使用矩形小圆角 `cornerRadius={4}`，包括辅助输入；不要插入 `stroke="none"` 的注释节点。
- 无框模式中的所有 `Node` 都使用 `stroke="none"` 且不填充；不要单独给某个节点补框。
- 标签短于完整句子，优先技术名词、文件名、模块名。
- 次要说明、caption、edge label 使用 `textColor="gray"`。
- 有框模式需要备注时，优先改成 edge label 或移入正文；无框模式的备注放在被标注元素下方，用少量引线指回元素。

### 双行节点

一个角色同时需要稳定名称和简短职责 / 实现锚点时，使用两级文字，不拆成连续流程节点：

- 第一行是角色标题，默认 `14px`、加粗。
- 第二行是职责、输入输出或实现锚点，默认 `12–13px`、常规灰色。
- 文件路径、目录名和实现位置默认放第二行；它们不是下游阶段，不单独连接箭头。
- 同一图的双行节点统一字号、行距和最小高度；空间不足时先缩短说明或调整布局，不单独缩小某一项。
- 双行节点标题全部加粗属于结构层级；需要强调当前角色时，优先依靠主链位置和正文指认，不再增加临时颜色。

### 分组边界与标题

分组框只表达一组节点共同所属的 layer、runtime、adapter 或其它职责范围，不作为流程步骤。

- apps/docs 中的语义分组统一使用 `LogicFigureFrame` + `LogicFigureFrameTitle`，从 `@/modules/docs/components/logic-figure` 导入；不要再用空的低透明虚线 `Node` 手绘边界，也不要用独立 `Node` 模拟标题。
- `LogicFigureFrame` 只用于 layer、runtime、adapter、package、职责范围等语义分组。Standard `Frame` 教学示例以及 viewBox、margin、bbox、clip、连接面等几何 / 参考边界保持原组件和画法。
- 边界按内部标题与节点的实际包围盒紧密包裹，只增加一致的小内边距；不要用明显大于内容的 `minimumSize` 制造空白。
- 框内预留一行紧凑标题区，内容节点从标题下方开始；标题同时贴近上边界与首行内容，不要用标题行制造额外纵向空白。
- 标题放在框内左上角的固定内边距位置，使用 `gray`、常规字重和普通字号；不要使用类别色、粗体或外置 `label`。
- 标题是分组标识，不是角色节点；使用 `LogicFigureFrameTitle` 作为 `LogicFigureFrame` 的直接子元素，不要让箭头连接标题。
- 边界默认样式由 `LogicFigureFrame` 提供；只有语义确实需要时才显式覆盖，视觉权重始终低于内部节点。
- 多个同级分组复用相同的标题位置、标题行高度、内边距与边界样式。
- 跨分组连线以及连接分组外节点的 `Draw` 默认放在 `LogicFigureFrame` 外部，继续通过稳定节点 id 表达关系。

```tsx
import { Draw, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

<LogicFigureFrame id="core-group">
  <LogicFigureFrameTitle>@retikz/core</LogicFigureFrameTitle>
  <Node id="compile" position={[0, 0]}>
    compileToScene
  </Node>
</LogicFigureFrame>
<Node id="render" position={[160, 0]}>
  render
</Node>
<Draw way={['compile', 'render']} arrow="->" />
```

## 连线语义

连线优先靠 id，不写绝对坐标：

```tsx
<Draw
  way={[
    'source',
    {
      label: {
        text: 'resolve',
        position: 'midway',
        side: 'top',
        sloped: false,
        textColor: 'gray',
        font: { size: 12 },
      },
    },
    'target',
  ]}
  arrow="->"
/>
```

约定：

- 实线表示数据流、控制流或主调用链。
- 虚线表示工具依赖、辅助关系、派生关系，不表示主数据通道。
- 点线表示控制柄、投影、测量等几何参考线；使用 `dashPattern={[1, 4]}` + `lineCap="round"`，不要复用 Node / 分组边框的虚线样式。
- `arrow="->"` 表示单向；`arrow="<->"` 表示双向同步 / 可逆关系；少用反向箭头，优先调换 `way` 顺序。
- 每个 step / edge label 都显式设置 `position`、`side` 和 `sloped`，不依赖默认值。
- 水平主链 label 保持水平，默认使用 `position: 'midway'`、`side: 'top'`、`sloped: false`。
- 竖向依赖 label 也优先水平显示，默认使用 `position: 'midway'`、`side: 'right'`、`sloped: false`，避免读者旋转视线。
- 斜线或曲线只有在沿线排版能更明确地绑定关系时才使用 `sloped: true`；此时按旋转后的文字包围盒留空间，并显式选择 `side`。
- edge label 比常规文字至少小 2 号，通常 `font={{ size: 12 }}` 且 `textColor="gray"`。
- shape 专属 anchor 使用对象形态 `{ id, anchor: 'tip-0' }`，不要写 `'id.tip-0'` 这类字符串 shorthand。

## Layout 与响应式

```tsx
<Layout width={520} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
  ...
</Layout>
```

- `width` / `height` 是 SVG 内部逻辑坐标，不是页面硬宽。
- 必须加 `style={{ maxWidth: '100%', height: 'auto' }}`，避免窄屏横向滚动。
- docs 正文区域、preview padding 和 render pane 的 `max-width` / `max-height` 会共同缩放 SVG；选择能保持文字可读的最小 `<ComponentPreview size>`，不要预先强套 `xs` / `sm`。
- 完成节点排布后按实际内容包围盒反推 `Layout` 宽高，只保留稳定外边距；不要沿用明显大于内容的逻辑画布。
- 在真实页面渲染后读取 preview、render pane 与 SVG 的实际 `getBoundingClientRect()`，再选择 `<ComponentPreview size>`；源码中的逻辑宽高和静态 SVG 不能替代页面结果。常规状态下图与预览区四边各保留约 `12px`。
- 存在主题 / 样式切换等顶部悬浮控件时，在 `12px` 基础上额外增加 `40px` 顶部间距，即顶部约 `52px`；其余三边仍约 `12px`。
- 节点间距按节点宽度、path label 和箭头共同占用的视觉空间分配，不机械等分节点中心。相邻两条边只有一侧带 label 时，中间节点可以向无 label 一侧小幅偏移，为 label 留出空间，同时确保另一侧不显拥挤。
- 同级角色保持一致的正文文字字号；空间不足时先调整位置、缩短 label、换行或压缩逻辑跨度，不要单独缩小某个节点文字来塞入布局。
- sloped label 按旋转后的真实文字包围盒预留空间；空间不足时优先拉开节点或延长边。`label.distance` 只用于微调文字离当前边的距离，盲目增大会把文字推向相邻节点。
- 调整节点坐标或图的纵横跨度后，同步检查并匹配 `<ComponentPreview size>`；桌面和 `< 600px` 窄屏都不能裁切、贴边或留下失衡空白。
- 窄屏放不下时依次删减节点、缩短 label、压缩逻辑跨度、改成纵向布局，最后才缩小字号。

## 几何与标注

- 派生几何、边界、参考点、命中区必须按真实公式或 `compileToScene` 量准，不要目测。
- 一个标记只承担一个概念。两个概念即使常见情况下重合，也要分别画或在正文说明重合条件。
- 一个标注尽量只用一条引线。多图共享元素时，标注放中间并向两侧引线。
- 对照图中不变部分必须画得一模一样，用视觉等同表达“未变化”。

## 验证

按改动范围选择验证：

- 只改正文说明：`pnpm exec prettier --write <changed-files>` + `git diff --check`。
- 新增 / 修改 `.demo.tsx` 插图：`pnpm --filter @retikz/docs exec tsc --noEmit`。条件允许（本地页面可访问，且浏览器或截图能力可用）时，必须打开真实文档页面，必要时获取整图与窄屏截图做视觉检查；不要只依赖源码审阅或类型检查。

Codex Node REPL 提供 Playwright 时，导入 [`scripts/check-figure-preview.mjs`](scripts/check-figure-preview.mjs) 并传入页面 URL 与中英文 H2；脚本会检查四种组合并把临时截图写到 `notes/reports/figure-preview/`。运行时没有 Playwright 时，手动执行同一检查矩阵，不安装新的仓库依赖。

视觉检查必须覆盖 `zh / en × 桌面 / 窄屏`。桌面使用约 `1440px` viewport（正文约 `800px`），窄屏固定使用 `500px` viewport；条件允许时对目标 preview 截图并记录实际尺寸。

- preview 容器满足 `scrollWidth === clientWidth`，没有横向滚动。
- SVG、render pane 与 preview 的实际包围盒匹配；不能只检查 `<Layout width/height>`。
- 图能渲染，节点不重叠，连线方向和虚实语义正确。
- 节点、文字、连线、箭头和 path label 没有非预期重合、遮挡或裁切。
- 节点位置对齐，层级与阅读顺序清楚；常规四边留白约 `12px`，有顶部悬浮样式控件时顶部约 `52px`；图内疏密均衡，label 不贴近节点或箭头。
- 根据真实渲染结果确认图没有过大或过小，`<ComponentPreview size>` 与内容包围盒匹配。
- 分组框紧贴标题与内容，标题位于框内左上角的预留标题行，使用灰色常规字重。
- 图的逻辑宽高贴合实际内容，分组两侧的入口 / 出口箭头只保留清晰可辨的安全长度，没有无意义长边。
- 同级节点字号一致，没有为了布局而单独缩小某个标签。
- 同图节点边界模式统一；有框常规节点均为 4px 小圆角。
- 同色节点属于同一角色类别；双行节点的标题 / 说明层级稳定，单行节点的当前重点才使用额外加粗。
- step / edge label 根据路径方向显式设置 `position`、`side` 和 `sloped`；竖向依赖标签默认保持水平。
- 窄屏 `< 600px` 能缩放，不横向滚动。
- 中英 demo 拆分时 label 对得上。
- 没有遗留 ASCII、Mermaid、截图或外部图。

## 与其它 skill 的分工

| 任务                              | skill                                            |
| --------------------------------- | ------------------------------------------------ |
| 页面结构、双语、注册、正文写法    | `docs-doc-principle` 及页型 skill                |
| 所有叙述性插图的底层契约          | `docs-figure-contract`                           |
| 功能实现细节、逻辑与流程说明图    | `docs-figure-logic`                              |
| 组件用法 demo，给用户复制源码学习 | `docs-doc-principle` 的默认 `<ComponentPreview>` |

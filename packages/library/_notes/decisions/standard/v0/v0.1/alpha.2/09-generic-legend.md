# ADR-09：通用 Legend 的已解析呈现契约

- 状态：Accepted
- 决策日期：2026-08-02
- 关联：[alpha.2 roadmap](./roadmap.md) · [Standard v0.1 roadmap](../roadmap.md) · [Presentation lower reuse](./10-presentation-composite-reuse.md) · [Core complete Scope output](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/11-layout-aware-scope-output.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [能力完备性总纲](../../../../../../../../notes/architecture/capability-design.md) · [Plot completeness](../../../../../../../viz/_notes/architecture/plot-visualization-complete.md) · [Table completeness](../../../../../../../viz/_notes/architecture/table-visualization-complete.md)
- 协作边界：Legend 保持 Standard owner，并只组合 [Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) 的 `/compose`；本 ADR 继续 Accepted

## 背景

Plot 已经可以根据 channel、scale 与 guide 解析 color、size、opacity、shape 等 Legend，并把解析结果排版为 swatch、ramp 或 symbol。Table 也已经能从条件视觉编码产出与实绘同源的 ramp / swatch descriptor。未来 Standard 的逻辑组件还需要解释领域无关的视觉约定，例如实线、虚线与点线分别表示 flow、dependency 或 optional relation。

这些领域的来源语义不同，但最终都需要把“一个已经确定的视觉样本对应什么含义”组织成标题、条目、连续样本和标签，并在有限空间内完成确定布局。该问题去除 Plot、Table、field、channel、scale、Cell 与 Connector 等领域词汇后仍然成立，且至少存在直接作者、Plot、Table 与逻辑图四类独立消费场景，符合 Standard 准入条件。

同类项目提供了三种主要路径：

- Vega、Vega-Lite 与 AntV G2 把 Legend 设计为非空间 scale 的可视化，自动生成能力强，但根模型仍依赖数据通道与 scale
- Matplotlib 以 handle + label 建模，并允许 proxy artist 或 handler 生成任意 legend key，能自然表达线型、marker 与组合样本，但运行时对象和 callback 不适合 JSON IR
- PlantUML 允许所有图类型插入自由 Legend 文本，跨领域但缺少结构化条目、稳定 identity、约束布局与 artifact

Standard 因此不能把 Plot guide 提升为公共模型，也不能用自由文本或封闭的 swatch / line / symbol 枚举限制未来 Tier 2。它需要保留结构化 Legend 语义，同时把视觉样本开放到 Core 已有的通用绘图表达。

alpha.2 尚未发布，且已经具备任意 `IRChild` 的双轴 probe、Box Layout、replay 与 typed artifact 底座。本能力直接进入 alpha.2，取代原先单独安排的 alpha.3 Legend milestone。Legend 的流式排版复用 Standard FlexLayout 的纯计算语义，连续 ramp 的定位复用 OverlayLayout 的 positioned 语义；这两者都是内部布局来源，不改变 Legend 的高层 authoring 形态。

## 目标

1. 建立可持久化、可 diff、可由 LLM 生成的领域无关 Legend composite
2. 同时覆盖离散条目与连续样本，并允许线、面、symbol、节点或任意注册 Tier 2 composite 作为视觉样本
3. 让直接 IR、Standard React、Standard Vanilla、Plot、Table 与未来 Tier 2 进入同一 schema、布局、compile 与 artifact 主链
4. 保持领域解析、formatter、provenance、locator 与交互意图在各自领域 owner 内
5. 只复用 Core Composite registry、Standard 共享 Box/Flex/Overlay 布局语义，不新增 renderer 分支、私有测量或 Legend sample registry

## 核心决策

### 1. Legend 是已解析呈现，不是 scale guide

`@retikz/standard` 拥有已经解析好的 Legend 呈现。它不从数据、channel、scale、Table rule 或逻辑关系推导条目，而是接收调用方已经生成的 JSON-safe visual sample、label 与 normalized tick。

依赖方向固定为：

```text
Plot / Table / Logic / 未来 Tier 2
          │ 解析领域语义、格式和值
          ▼
   Standard Legend input
          │ 约束布局与 compile
          ▼
 Standard Box/Flex/Overlay Layout / Core
```

Plot 继续拥有 channel / scale 绑定、domain、ticks、formatter、theme 映射、guide resolve、provenance / locator 与交互意图。Table 继续拥有 visual encoding、selector / rule、formatter、theme precedence、Cell lineage 与 descriptor。逻辑组件继续拥有 relation role、style resolution 与语义 identity。

### 2. 内容使用结构化 form，视觉样本使用任意 IRChild

Legend 顶层是 `standard.legend` composite，内容以 `kind` 区分离散条目和连续样本：

```ts
type LegendInput = IRScopeProps & {
  title?: IRChild;
  titleGap?: number;
  contentAlign?: 'start' | 'center' | 'end';
  size?: LayoutSizeInput;
  padding?: number | IRBoxSpacing;
  overflow?: 'visible' | 'clip';
  content: LegendItemsContentInput | LegendRampContentInput;
};

type LegendItemsContentInput = {
  kind: 'items';
  direction?: 'vertical' | 'horizontal';
  wrap?: 'nowrap' | 'wrap';
  gap?: number | { row: number; column: number };
  sampleGap?: number;
  sampleAlign?: 'start' | 'center' | 'end';
  items: Array<LegendItemInput>;
};

type LegendItemInput = {
  key: string;
  sample: IRChild;
  label?: IRChild;
};

type LegendRampContentInput = {
  kind: 'ramp';
  direction?: 'vertical' | 'horizontal';
  sample: IRChild;
  sampleGap?: number;
  ticks: Array<LegendTickInput>;
};

type LegendTickInput = {
  key: string;
  offset: number;
  label?: IRChild;
};
```

以上是允许省略固定 discriminator 与默认字段的持久化 author input 最小公开结构；`IRScopeProps` 的字段在 root 上扁平出现，不再额外包一层 `scope` 对象。实际类型由 strict schema 推导，不维护手写平行类型。`createLegend()` 与 Vanilla 接收 `LegendInput`，React 则把组合式 JSX authoring 同步转换为同一输入；三者统一注入 `namespace: 'standard'` / `type: 'legend'` 并解析。schema 解析后的 canonical `IRLegend` 必须显式包含固定 discriminator、Core Scope props 的规范化值、`titleGap`、`contentAlign`、`size.x / size.y`、`padding`、`overflow`，items form 必须包含 `direction`、`wrap`、canonical `gap: { row: number; column: number }`、`sampleGap`、`sampleAlign`，ramp form 必须包含 `direction` 与 `sampleGap`；输入层的 `gap` 允许标量 shorthand，解析时将其复制到两个物理轴；只有 `title`、item / tick 的 `label` 继续可省略。直接 IR authoring 接受完整 canonical `IRLegend`；factory、React 与 Vanilla 产生该 parsed output，持久化、diff、compile 与 parity 都以它为真值，不能由 adapter 决定是否保留默认字段。

`sample` 可以是 Node、Path、Scope 或任意已注册 Composite。实线、虚线与点线直接使用具有对应 stroke 的 Path；色块或 symbol 使用 Node；连续颜色或透明度使用相应 Core child；未来 Stage、Decision、Connector 等能力可以直接提供自己的 composite sample。

Standard 不新增 `swatch | line | symbol` 之类封闭 sample discriminator，也不建立 `LegendSampleDefinition`。视觉扩展继续经过 Core `CompositeDefinition` registry；Legend 只把 sample 当作不透明、可布局的 `IRChild`。

### 3. sample 保持 Core 的引用与 namespace 语义

Legend 把 sample 作为不透明 `IRChild` 交给同一次 Core compile：

- 可以使用 Core 当前允许的 id、anchor、resource、Scope 与 nested composite 引用
- 所有引用都按当前 compile environment 的 Core namespace contract 解析；未解析引用在 probe 中失败，同一 namespace frame 的重复 id 保持 Core warning + last-wins 语义
- 不得包含函数、ReactNode、class instance、renderer 对象或 callback
- custom composite 所需 definition 必须由同一次 compile environment 显式提供

Standard 不新增 reference sandbox、不阻断合法 ancestor reference，也不建立第二套 resolver。每个 title、sample 与 label 都通过 Core `layoutChild` probe；缺失 definition、未解析引用、非法资源与 child layout failure 形成带 provider key 与 occurrence 的 failed probe，Legend 必须通过 Core `raise` 提升，不能退化为普通顶层 composite 的 warning + skip。duplicate id warning 必须与 probe/replay 保持同一 Core last-wins 结果，Legend 不把它升级为私有“歧义”错误。若 Legend 又被外层 layout probe，外层只能按 Core 既有 candidate failure 合同处理或继续提升，Standard 不捕获后改用占位图形，也不从 primitive 类型反推替代样本。

为了让同一 Legend input 可跨宿主和位置复用，领域 resolver 应优先构造内部闭合的 sample；这是 portability 建议，不是 Standard 复制 Core 引用校验的理由。

### 4. 离散条目与连续样本具有不同布局合同

Legend 的 `title`、`body` 与离散 `items` 的顺序流使用与公开 FlexLayout 相同的纯 line formation、主轴分配、交叉轴 placement、proposal 和 overflow 语义。Legend 负责把 sample + label 映射为内部 Flex item，并把 `contentAlign`、`sampleAlign`、`titleGap` 与领域 artifact 投影接回自身契约；它不在运行时嵌套调用 `FlexLayoutDefinition`，也不把 synthetic Flex key 暴露为 authored identity。`ramp` 的 normalized tick 是以 sample slot 为参照的 positioned child，使用 OverlayLayout 的 positioned placement 语义；它不被伪造成普通 Flex 顺序项。

title 始终位于 body 上方；只有 title 与非空 body 同时存在时才插入 `titleGap`。`contentAlign` 沿物理 x 轴控制 title slot 与 body structural block 在最终 content box 内的独立对齐，可取 `start | center | end`，默认 `start`。两个区域分别按自身 resolved structural width 对齐，因此 start 共享左边缘、center 共享中心线、end 共享右边缘；它不改变 title child 自己的文字或内部图元对齐，也不改变 body 内部的 sample / label 排列。title-only 与 body-only 仍使用同一 content-box 对齐规则；title 与 body 都不存在时 content 为原点处的零矩形，minimum / natural contribution 只包含 resolved padding，最终 container allocation 仍由 content / fixed / fill 与父 proposal 共同决定。`items` form 负责一组 sample + label 映射：

- `direction` 默认 `vertical`
- `wrap` 默认 `nowrap`
- `gap` 的 `row` 与 `column`、`sampleGap` 与 `titleGap` 默认均为 8 user units；标量 `gap` shorthand 同时设置两个物理轴，gap 只出现在两个实际存在的相邻区域之间，不形成首尾留白
- `contentAlign` 只分配 content box 与 title / body structural width 之间的物理 x 轴剩余空间，不引入 stretch、space-between 或逐 item 对齐语义
- 每个 item 内部固定为 sample 在左、可选 label 在右；label 存在时由 `sampleGap` 分隔，`sampleAlign` 沿物理 y 轴对齐两者且默认 `center`
- vertical 模式沿 y 轴按声明顺序排列 item；同一 wrap column 内使用最大的 natural sample slot width，使 label 从同一物理 x 起点开始
- horizontal 模式沿 x 轴按声明顺序排列 item；每个 item 的 label 跟随自身 sample，不对不同 item 建立共享 sample 列
- 开启 wrap 时只依据 size policy / 父 proposal 解析出的 content-box budget 与真实 intrinsic contribution，按 authored order 使用 greedy line formation：horizontal 超出 resolved width 时形成新 row，vertical 超出扣除 title 后的 resolved body height 时形成新 column；加入当前 line 前先计入相邻物理 gap，超限则从该 item 开新 line，不回溯、不均衡
- wrap budget 始终取 resolved content-box 主轴尺寸；单个 item 自身超过该 budget 时独占一条 line，保留真实 allocation / visual overflow，不拆分或缩放；canonical `gap.row` 与 `gap.column` 始终按物理轴解释
- sample 保持自身 intrinsic geometry，Legend 不因 primitive kind 自动改写颜色、stroke、半径或比例

`ramp` form 负责一个连续视觉样本及其 normalized ticks：

- `direction` 默认 `vertical`
- `sampleGap` 默认 8 user units
- offset 必须位于闭区间 `[0, 1]` 并按声明顺序非递减
- horizontal 的 0/1 分别对应样本最终 slot 的左/右物理端；tick label 的水平中心对齐 anchor，顶部位于 sample slot 底部加 `sampleGap`
- vertical 的 0/1 分别对应样本最终 slot 的上/下物理端；tick label 的垂直中心对齐 anchor，左边缘位于 sample slot 右侧加 `sampleGap`
- tick anchor 只使用 sample slot，不因 visual overflow 移动；`sampleGap` 仅在至少一个 label 存在时形成 label region，声明密集造成的重叠保持可观察且不自动避让
- ramp sample 在主轴上的最终 slot size 必须大于 0；零主轴尺寸以带 provider key 与 occurrence 的 layout failure 拒绝
- Standard 不解释 offset 对应的 domain value，也不执行 formatter；调用方可以通过反转 sample 或 offset 表达相反领域方向

根级 `size` 直接复用 Standard `IRLayoutSize`，默认 x / y 两轴均为 `{ kind: 'content' }`；`padding` 默认 0，`overflow` 默认 `visible`。Legend 不新增 `width` / `height` shorthand 或自己的 fill 语义。每个物理轴独立遵循共享 Box 的求值合同：

| size policy | intrinsic proposal                                                                         | finite range proposal                                                                                                                                                 | exact proposal                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `content`   | `minimum` / `natural` 分别使用该模式下的真实 Legend contribution，再应用作者 `min` / `max` | 以 parent / authored finite `max` 形成 provisional main budget，得到结构 contribution 后由共享 resolver 钳制到作者边界与父 range 的交集；父 `min` 可以扩张 allocation | container allocation 采用 exact size，再应用作者 `min` / `max`；无交集时保留作者硬边界并显式暴露 slot / allocation 差异 |
| `fixed`     | 始终采用作者 `value`                                                                       | 始终采用作者 `value`                                                                                                                                                  | 始终采用作者 `value`                                                                                                    |
| `fill`      | 因没有 finite parent allocation 而 fail-loud                                               | 采用 finite `max` 后应用作者 `min` / `max`；没有 finite `max` 时 fail-loud                                                                                            | 采用 exact size 后应用作者 `min` / `max`                                                                                |

Legend 的 minimum / natural contribution 都来自相同 authored structure 与对应 child intrinsic probe。`wrap` form 的 main-axis minimum contribution 是一个 authored item 能占用的最大 minimum outer size，natural contribution 是所有 item natural outer size 与真实相邻 gap 之和；`nowrap` 的 minimum / natural 都保持单 line 结构。title 与 body 的 intrinsic contribution 先按“上方 title + 可选 titleGap + body”组合，再计入 padding。

root allocation 与内部布局按以下单向顺序求值，不做 child-result 驱动的隐式 fixed point：

1. 所有 title、sample 与 label 分别取得 intrinsic minimum / natural result，只把 allocation / slot contribution 用于结构求值，不 replay
2. items main axis 先以未换行的 minimum / natural profile 调用共享 resolver 得到 preliminary allocation，再以每个 item 的 natural outer size 和真实 gap 对其 content-box main size执行一次 authored-order greedy line formation。每条已形成 line 同时保存 minimum / natural profile。`content` 在非 exact proposal 下以形成后的 line profile 再次调用同一 resolver 得到 final main allocation；`fixed`、`fill` 与任意 exact proposal 保持 preliminary allocation，不做 shrink-to-fit
3. content 的第二次求值只替换 body main-axis profile，继续使用同一 title、padding、size policy 与父 proposal，不再次成行。intrinsic minimum 使用形成后最宽 line 的 minimum profile；intrinsic natural 与 range 使用最宽 line 的 natural profile。因而 natural/range shrink-to-fit 后仍容纳已形成 line，intrinsic minimum 可以小于 natural structural slot并显式形成 allocation overflow；父 `min` 可以扩张 final allocation。若作者边界与父 proposal 无交集，仍按共享 Box 合同保留作者硬边界并让 overflow 可见
4. horizontal items 先完成 x 的 preliminary → rows → final 顺序，再在 final content width 下 probe title，并以 rows cross contribution、final title height、effective titleGap 与 padding 求 y allocation
5. vertical items 先按单 column 与 title intrinsic width 求 preliminary x、在该 content width 下 probe title，再按 title + 单 column profile 求 preliminary y；以 `max(0, contentHeight - titleHeight - effectiveTitleGap)` 成 column，并按第 3 步得到 final y。全部 column 的 structural cross extent——各 column structural width 之和加真实相邻 `gap.column`——随后只用于 x 轴 reconciliation：`content` 在非 exact proposal 下以该 extent、既有 title width、padding、作者边界与同一父 proposal再次调用共享 resolver；`fixed`、`fill` 与任意 exact proposal保持 preliminary x。reconciled x 不触发 title re-probe 或 column reflow；若完整 columns extent 宽于保留的 allocation，只按 `contentAlign` 形成 structural overflow
6. ramp 不形成 line，也不从 container available 反推 sample slot；它先由 sample 与全部 tick label 的 intrinsic natural `slotSize` 建立并规范化 body structural bounds，再依次求 root x、title final probe 与 root y

wrap 的唯一 main-axis budget 是 preliminary container allocation 减去 padding，并在 vertical 方向继续扣除 title 与 effective `titleGap` 后的非负 body size。content、fixed、fill 在 intrinsic / range / exact 下都使用这个规则：默认 natural content 的 preliminary allocation 本身可以容纳单 line，因此通常不换行；intrinsic minimum、authored `max`、fixed、finite range / fill 或 exact 产生更小 allocation 时可以换行；unbounded range 的 content 使用 natural contribution，fill 仍 fail-loud。作者 `max` 既限制 preliminary allocation，也因此形成 wrap budget，不存在“只 clamp allocation 但按更大父空间排版”的第二语义。content shrink-to-fit 发生在 line formation 后；fixed / fill / exact 不收缩，任何 final allocation 都不触发第二次换行。

`effectiveTitleGap` 仅在 title 与非空 body 同时存在时等于完整 authored `titleGap`，否则为 0。即使 title 加 gap 已超过 content height，也不压缩或删除 gap：body budget 钳为 0，title 从 content top 放置，body 从 `title allocation bottom + titleGap` 开始。vertical items 中每个非空 item 都按超限规则独占一 column 并形成 allocation overflow；horizontal items 仍只按 width 形成 row。ramp sample 继续使用自身 intrinsic natural structural slot，不因零 body budget缩成零；只有 sample 自身的 intrinsic natural 主轴 slot 为 0 才触发零主轴 layout failure。以上不足空间都由 container overflow / clip 与 artifact 观察，不改变 resolved allocation。

最终 container content box 始终由 resolved allocation 减去 padding 得到；物理 y 轴的额外 allocation 保留在下侧，不做隐式 center、stretch 或 distribution。物理 x 轴只在 `contentAlign` 显式要求时分配 title / body structural block 两侧的剩余空间；当某个 structural block 宽于 content box 时，start 保持左边缘，center 产生对称负向 / 正向 overflow，end 保持右边缘并把 overflow 留在左侧。`nowrap` 永不换行；单个 child 或 body 超出 content box 时保留真实 allocation，并形成 container overflow。

ramp 的 structural slot 与 anchor 逐方向固定：sample slot 的 width / height 等于 sample intrinsic natural `slotSize`；每个 tick-label slot 的 width / height 等于该 label intrinsic natural `slotSize`。先在 provisional body-local space 把 sample slot 放在 `(0, 0)`。horizontal anchor 为 `sample.left + offset × sample.width` / `sample.bottom`，label slot 的水平中心对齐 anchor 且 top 为 `sample.bottom + sampleGap`；vertical anchor 为 `sample.right` / `sample.top + offset × sample.height`，label slot的垂直中心对齐 anchor 且 left 为 `sample.right + sampleGap`。

无 label 时不建立 label region；有 label 时先求 sample 与全部 label slot 的 provisional union。若端点 label 产生负向 overhang，必须把 sample slot、全部 label slot 与 anchors 一起平移 `(-union.x, -union.y)`，使规范化后的 structural union 精确为 `(0, 0, union.width, union.height)`；不得保留 sample 在 body origin 后把负向 slot 当 overflow。该规范化 structural union 再整体放到 container content box 的 body origin：x 由 `contentAlign` 根据 content width 与 normalized body structural width 求得，y 等于 title allocation bottom + effective titleGap。titleGap 因此只位于 title structural allocation 与 normalized body top 之间，不被 endpoint overhang 穿过。

root x 使用 title intrinsic width与 normalized body structural width求值，title final probe 后，root y 使用 final title height、effective titleGap 与 normalized body structural height 求值；resolved body budget只决定 over/underflow，不拉伸、截短或重算 sample / label slot。title slot 与 normalized body 分别以各自 structural width 应用同一 `contentAlign`，final exact probe、replay translation 与 artifact 中的 sample slot、label slot和 anchor都包含对应的最终 placement translation；final allocation / visual bounds 不反写对齐、slot、anchor、root allocation 或 structural body bounds。若 final child allocation 超出已解析 structural slot，只记录为 allocation / visual overflow，不重新对齐或规范化 body。

最终 child proposal 固定如下：title 使用上述有限 x range 或 intrinsic natural；每个 item sample / label、ramp sample 与 tick label 都接收与其 resolved structural slot 相同的双轴 exact proposal。exact 只确定父级 slot，不表示 primitive scale；child 的最终 `allocationBounds` 可以小于或大于 slot。line formation、container allocation 与 tick anchor 只使用 intrinsic contribution 和 resolved structural slot，不被 final allocation 或 `visualBounds` 反向改写；final allocation / visual bounds 只进入 placed-child geometry、body bounds、overflow、clip 与 artifact。任一 contribution 或 final probe 失败都通过 Core `raise` 提升，只有所有最终结果成功后才 replay。

`overflow: 'clip'` 始终只以最终 resolved container allocation 裁剪可见结果；不会因 body、label 或 visual overhang 改写 clip box。Legend 不按文本、primitive 或 composite kind 建立私有 proposal 规则。

title、item label 与 tick label 都是可独立 probe/replay 的 `IRChild`；普通文字由调用方提供包含 `IRTextBlock` 的 Core Node，因此文字 padding、style inheritance、reflow、allocation 与 visual bounds 完全由该显式 child 决定。存储契约不接受裸字符串或 `IRTextBlock`，Standard 也不创建带隐式外壳的文本节点。sample 同样只按自身公开 layout contract 响应 proposal；“不自动缩放”表示 Legend 不施加 transform 或按 sample kind 改写尺寸，不阻止 child 自己响应 bounded / exact proposal。

`items` 可以为空，形成 title-only 或零内容 Legend；`ramp.ticks` 可以为空，形成无标签的连续样本。是否完全省略空 Legend 由领域 owner 决定，Standard 不根据数据状态隐藏输入。

### 5. identity 与 artifact 只保存通用呈现语义

Legend root 复用 Core authored Scope identity，`id` 可选并直接注册到父 namespace；Core `CompileOccurrenceLocator` 仍独立标识一次 compile occurrence。两者不是第二身份通道，而是不同生命周期的 Scope identity 与编译定位。同一 Legend 中的 item key 必须唯一，tick key 也必须唯一；item key 与 tick key 各自在自身 form 内建立稳定 authored identity，不复用数组 index，也不要求等于 sample 内部 id。React / Vanilla 的 host occurrence、React element key 与 builder handle 不得替代 Legend root `id`。

Legend root 的 `theme`、graphic cascade、四个 default channel、`resetStyle`、`transforms`、`placement`、`clip`、`zIndex`、`meta` 与 `animations` 使用 Core ADR-11 的完整 Scope contract。Legend 的 `overflow: 'clip'` 另外产生内部 allocation-coordinate clip；它与 authored root `clip` 都保留，前者不覆盖后者。root props 不复制到 item / tick child，也不改变 item / tick key 或 nested sample artifact 的 owner。

Legend compile 产出以下 strict、JSON-safe typed artifact；所有矩形与 anchor 都使用 Legend allocation coordinate，`visibleBounds` 在 clip 后无正面积时为 `null`：

```ts
type LegendArtifactGeometry = {
  allocationBounds: LayoutArtifactRect;
  visualBounds: LayoutArtifactRect;
  visibleBounds: LayoutArtifactRect | null;
};

type LegendPlacedChildArtifact = LegendArtifactGeometry & {
  slotBounds: LayoutArtifactRect;
  translation: { x: number; y: number };
  overflow: LayoutArtifactOverflow;
};

type LegendArtifact =
  | {
      kind: 'items';
      container: LayoutArtifactContainer;
      title: LegendPlacedChildArtifact | null;
      bodyBounds: LayoutArtifactRect | null;
      items: Array<{
        key: string;
        sourceIndex: number;
        geometry: LegendArtifactGeometry;
        sample: LegendPlacedChildArtifact;
        label: LegendPlacedChildArtifact | null;
      }>;
    }
  | {
      kind: 'ramp';
      container: LayoutArtifactContainer;
      title: LegendPlacedChildArtifact | null;
      bodyBounds: LayoutArtifactRect;
      sample: LegendPlacedChildArtifact;
      ticks: Array<{
        key: string;
        sourceIndex: number;
        anchor: { x: number; y: number };
        label: LegendPlacedChildArtifact | null;
      }>;
    };
```

`items` 与 `ticks` 数组严格保持 authored order；key 用于 identity 与 join，不改写数组顺序，也不转成以用户字符串为属性名的 map。Legend root Scope identity 不写入 item / tick artifact；`container`、placed child 与 overflow 语义直接复用 Standard Box/Flex/Overlay layout artifact vocabulary。内部 allocation / replay Scope 不产生公开 authored identity，也不成为 artifact item。

几何 union 口径固定为：

- `items[].geometry.allocationBounds` 是该 item 的 sample 与非空 label allocation union；`visualBounds` 与 `visibleBounds` 分别对两者的对应 bounds 做 union
- items form 的 `bodyBounds` 是所有 final item allocation bounds 与结构 line / column gap 跨越区域的外包矩形；空 items 时为 `null`
- ramp form 的 `bodyBounds` 是 sample 与所有非空 tick label allocation bounds 的外包矩形；端点 label 相对 sample slot 的 allocation overhang 会扩张 body bounds 并形成 allocation overflow，不计为 visual overflow，也不反向扩张 container allocation
- `container.allocationBounds` 只等于共享 size resolver 得到的 `(0, 0, width, height)`，不被 final child allocation 或 visual overhang 反向扩张；content sizing 只消费先前的 intrinsic / structural contribution，fixed / fill / exact 始终保留各自 resolved allocation
- `container.visualBounds` 可以继续包含 child visual overflow；final child allocation 超出 structural slot 或 container 时记录为 allocation overflow，`overflow: 'clip'` 只据 container allocation 裁剪并写入 `visibleBounds`

title 与 body artifact 使用 `contentAlign` 解析后的最终结构位置；final child allocation 或 visual overhang 可以扩张对应 artifact bounds，但不能反向移动 title / body、扩张 resolved container allocation或改变 tick anchor。

artifact 中不保存 field、channel、scale、datum、Cell、relation role、formatter、selection 或任意领域 payload。领域包通过自身 occurrence、descriptor / encoding identity 与 Legend item/tick key 建立 provenance / locator join；不得要求 Standard 复制领域 lineage。

sample 自身产生的 nested typed artifact 继续作为独立 Core artifact envelope 返回，不复制进 Legend artifact。本版本不承诺从 item/tick key 关联到 nested sample artifact，也不得从内部 probe / replay index 反推该关联；未来确需跨 artifact join 时先补 Core 通用 occurrence 关联合同。

### 6. direct definition loading 保持显式

Legend 通过 `LegendDefinition` 接入 Core `CompileOptions.composites`、React static adapter 与 Vanilla adapter。调用方只把当前 compile 所需的 definitions 显式传给 Core，不经过 Standard 的组合层

领域包需要 Legend 时显式提供同一个 public `LegendDefinition` object，不依赖 import side effect、全局 registry 或 Core 反向发现。definition 直接进入 Core 唯一 registry；调用方又显式提供同一 definition 时，重复 composite key 继续由 Core fail-loud 诊断：

- 重复输入不会被 Standard 静默去重
- 不同 object 但相同 composite key 的输入继续由 Core 诊断
- 缺失 sample 所需 definition 时保留明确的 provider key 与 occurrence diagnostic

LegendDefinition 只贡献 Legend 自身 definition。它复用 Standard 已有 Box、Flex 与 Overlay 的纯布局语义以及 Core layout-aware contract，但不要求调用方同时提供 FlexLayout、GridLayout 或 OverlayLayout definition，也不自动收集 sample 所需的未知 Tier 2 capability。内部 engine 不改变 Definition loading 边界，也不把 nested layout implementation identity 写入 Legend artifact

### 7. React 使用无头组合 authoring，Vanilla 保持 plain-data authoring

直接 IR、Standard React 与 Standard Vanilla 必须构造同一个 `IRLegend`，但可以使用符合各自宿主习惯的 authoring surface。Vanilla 没有组件树，继续接收 plain-data `LegendInput`；React 使用平级 named exports `Legend`、`LegendTitle`、`LegendItem`、`LegendRamp` 与 `LegendTick`，不建立 `Legend.Xxx` namespace：

```tsx
<Legend kind="items" direction="vertical">
  <LegendTitle>
    <Node position={[0, 0]} text="关系类型" />
  </LegendTitle>
  <LegendItem
    itemKey="direct"
    sample={
      <Path dashed>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[24, 0]} />
      </Path>
    }
  >
    <Node position={[0, 0]} text="直接关系" />
  </LegendItem>
</Legend>
```

```tsx
<Legend kind="ramp" direction="horizontal">
  <LegendTitle>
    <Node position={[0, 0]} text="强度" />
  </LegendTitle>
  <LegendRamp>
    <Rectangle corner1={[0, 0]} corner2={[120, 12]} />
  </LegendRamp>
  <LegendTick tickKey="minimum" offset={0}>
    <Node position={[0, 0]} text="低" />
  </LegendTick>
  <LegendTick tickKey="maximum" offset={1}>
    <Node position={[0, 0]} text="高" />
  </LegendTick>
</Legend>
```

`Legend` props 是以显式 `kind` 判别的联合，并与 Core authored Scope props 共用同一 root surface；React 入口对这些 root props 的表达必须与直接 IR / Vanilla 等价。两种 form 共用 `titleGap`、`contentAlign`、`size`、`padding` 与 `overflow`；`items` form 把 `direction`、`wrap`、`gap`、`sampleGap` 与 `sampleAlign` 提升为容器 props，`ramp` form 把 `direction` 与 `sampleGap` 提升为容器 props。React 不根据 children 推断 form，也不继续接受 plain-data `content` 或 `title` prop。

`Legend` 最多接受一个 `LegendTitle` marker；省略 marker 表示没有 title，marker 一旦出现，其 children 就是 required title slot。`LegendItem` 以必填 `itemKey` 与 required `sample` prop 声明离散项，并以可选 children 声明 label；ramp form 必须且只能包含一个 `LegendRamp` marker，其 children 是 required continuous sample slot；`LegendTick` 以必填 `tickKey`、`offset` 与可选 label children 声明连续刻度。`itemKey` 与 `tickKey` 分别映射 canonical `key`，避免与 React 保留的元素 `key` 混淆。title、item sample 与 ramp sample 必须各同步转换为恰好一个 JSON-safe `IRChild`；item / tick label 可以省略或只包含 React empty node，此时 canonical label 缺省，提供任意非空内容时必须转换为恰好一个 `IRChild`。

marker 不复制文字、样式或对齐 props。标题与标签的字重、字号、字体、颜色和内部文字对齐由其实际 child 持有；`contentAlign` 仍只负责 Legend title slot 与 body structural block 的容器级物理 x 轴对齐。React controls 可以编辑 child props，但不能把这些展示字段提升为第二套 Legend schema。

这些子组件是只由 `Legend` 静态读取的 authoring marker，不进入 IR、layout 或 render 栈。`Legend` 在直接 marker 列表中透明展开数组与 `Fragment`，把 `null`、`undefined` 与 boolean 按 React empty node 处理，并拒绝其余所有非 marker leaf；item 与 tick 保持 authored order。其它直接 child、重复 title、缺失或重复 ramp、form 与 marker 不匹配、以及 marker 脱离 `Legend` 使用都 fail-loud。

每个 title、sample 或 label slot 使用同一严格 authoring 边界：先透明展开该 slot 直属的数组与 `Fragment`，只移除 React empty node；剩余 leaf 必须全部是 React element，并且 required slot 必须恰好一个，optional label slot 可以是零个或恰好一个。字符串、数字、宿主元素、未知对象包装元素，以及与合法元素混合出现的任意非空直接 sibling 都必须在转换前拒绝，不能因通用 JSX 转换器忽略直接 slot 输入而被接受。通过该边界的单一 element 再交给现有 React → IR 转换路径，且转换结果仍必须恰好一个 `IRChild`；函数式 Sugar 的内部展开继续遵循该组件与公共转换路径的既有契约，不属于 Legend marker 的 sibling grammar，Legend 不重写其 builder。

上述严格 slot grammar 由 `@retikz/standard-react` 拥有，因为它约束的是 Legend marker 的局部组合方式；本 ADR 不扩张 `@retikz/react` 的通用 children 语义，也不复制其 Kernel / Sugar 转换。该 React sugar 不建立私有 schema、registry、layout 或 capability discovery；nested Tier 2 sample 仍须由同一次 compile environment 显式提供 definition。

React adapter 把 marker tree 同步转换为 `LegendInput` 后，必须调用同一 factory 获得 canonical `IRLegend`。Vanilla builder 只构造同一 canonical output，不维护独立 sample 类型、layout solver 或 registry。相同语义输入与 compile environment 在两种 adapter 下得到等价的 Core 语义与 Legend artifact；领域 React / Vanilla adapter 只负责把领域 authoring 送入领域 resolver，再生成 Standard Legend input，不得复制通用 Legend layout 或 renderer。

## 用户可观察行为与失败语义

- strict schema 拒绝未知字段、非 JSON 值、空白 key、重复 key、负 spacing、非法 `contentAlign`、非法 overflow、非法 Core Scope props 与 form 不匹配字段
- React 拒绝旧 `content` / `title` props、未知或 form 不匹配的 marker、重复 title、空 `LegendTitle`、缺失或重复 ramp、空 required sample、slot 中的非空非 element / 混合 sibling，以及不能转换为恰好一个 `IRChild` 的非空 title / sample / label；只有可选 label slot 中的 `null`、`undefined` 与 boolean 可以共同表示缺省，其它 slot 只把它们作为基数计算前的 React empty node，不会让 required slot 变为可选
- 根 `size` 默认两轴 content；content / fixed / fill 对 intrinsic、range 与 exact proposal 的 allocation、无界 fill 失败、有限空间 wrap 与 overflow 均沿用共享 Box 合同
- ramp offset 非有限、超出 `[0, 1]` 或逆序时在输入校验阶段拒绝
- title/sample/label custom composite 未注册、引用未解析或者 probe/replay 失败时形成 Core failed probe 并由 Legend 提升，不产生 warning + skip 或 placeholder；root / nested duplicate id 保持 Core 的既有 identity 诊断，不由 Legend 或 adapter 自动改名
- constrained space 下 content alignment、wrap、overflow 与 clip 只根据 Core proposal、structural slot、真实 allocation / visual bounds 与 Standard Box contract 决定，不使用文字宽度估算或 renderer 回读
- sample 的自然尺寸、stroke、fill、opacity、dash、shape 与 nested artifact 保持原样；Legend 只负责放置
- 相同输入、capability 与 proposal 产生相同 child 顺序、bounds、artifact 与 diagnostics

## 迁移与兼容性

Standard alpha.2 尚未发布，本 ADR 可以直接新增公共能力；Definition 重复注册继续由 Core 统一诊断。Legend 新增扁平的 Core authored Scope surface 与可选 root `id`，并把 layout-aware output 固定为 authored root Scope + 内部 allocation / replay Scope；不保留把这些字段塞进 replay wrapper 的兼容别名。React 直接移除接受 plain-data `content` / `title` 的旧 props，不保留双入口、兼容 alias 或 deprecation bridge；`LegendInput`、canonical `IRLegend` 与 Vanilla authoring 不受该 React surface 调整影响。

Plot 当前 `IRPlotLegendGuide`、Table 当前 Legend descriptor 与未来逻辑组件仍是各自领域真源。本 ADR 不直接修改这些领域 API；它们迁移时只把解析后的呈现段改为构造 `IRLegend`，并保持自己的默认值、locator、provenance 与交互契约。

原 alpha.3 Legend ownership ADR 被本 ADR 取代，不再作为后续公开契约真源。Plot/Table 的实际迁移仍由各自 milestone 与 ADR 负责，不阻塞 Standard alpha.2 先发布可消费的通用组件。

## 被否决的方案

- **把 Legend 固定为 scale guide**：直接作者与逻辑图没有 scale，Standard 还会反向理解 Plot/Table 领域模型
- **封闭 swatch / line / symbol / size union**：每个新 Tier 2 视觉样本都要求扩张 Standard，并复制 Core style vocabulary
- **只接受完全自由的 IRChild 列表**：连续 tick、稳定 key、label layout 与 artifact 会被各领域重复实现
- **使用 callback / render template / handler registry**：破坏 JSON round-trip、确定 compile 与跨 adapter 等价性
- **使用自由富文本 Legend**：无法稳定定位 item、测量 sample、生成 artifact 或由工具链安全修改
- **自动扫描 Scene 或领域 IR 生成 Legend**：依赖 lowering 结果反推语义，无法保留 formatter、领域 identity 与确定顺序
- **由 Legend 自动打包所有 sample capability**：需要反向发现未知 Tier 2 definition，破坏显式 loading 与依赖方向
- **React 继续接收完整 plain-data `content`**：使 JSX 作者必须离开组件树拼装 sample / label，并让 controls 与条件组合维护第二套对象结构
- **通过 React Context 运行时注册 marker**：引入 render 时机、SSR 与顺序依赖，而同步静态读取已足以确定生成同一 JSON-safe 输入
- **从 marker children 自动推断 `items | ramp`**：条件 children 会让 form 与错误边界隐式漂移，也无法让 controls 直接切换稳定 discriminator
- **将 Legend 下沉 Core**：Legend 是可选的高层解释性绘图结构，不是 Drawing Complete 的基础图元；Core 只提供完整 Scope output、probe / replay 与 lower child contract

## 能力完备性检查

- **所属能力域与能力面**：Drawing Complete 在 Core 之上的可选通用 Tier 2 呈现；依赖 Core ADR-11 的完整 authored Scope output；协作 Visualization Complete 与 Tabular Visualization Complete
- **解决的问题**：让多个领域把已经解析好的视觉解释结构复用为同一持久化 schema、约束布局、compile 与 artifact
- **主责包与协作包**：Standard 主责 Legend 呈现；Plot/Table/逻辑组件主责领域解析、formatter、provenance / locator 与交互；Core/Math 提供 IR、text、measurement、replay 与 registry；adapters 等价暴露
- **是否可由现有能力组合**：Core ADR-11 的完整 Scope output、Core layout-aware composite 与 Standard 共享 Box/Flex/Overlay 布局语义提供机制；本 ADR 只扩展 Legend 持久化语义、Definition 与 artifact，不在 Legend 中补 Scope / replay 旁路
- **是否需要下沉到依赖能力域**：不下沉 Legend；若任意 IRChild 仍无法沿当前 reference、probe / replay 合同布局，只补 Core 通用机制，不在 Standard 建旁路
- **内部表达链路**：strict Legend schema + Core authored Scope props → layout-aware CompositeDefinition → Standard shared Flex/Overlay engine + Core probe-replay → authored Scope + typed artifact
- **外部扩展链路**：视觉 sample 直接使用 Core IR 或任意注册 CompositeDefinition；不新增 Legend 专用 provider family
- **define-registry**：Legend 自身沿用 Core CompositeDefinition registry；sample 开放性也由同一 registry 提供，因此新的 LegendSampleDefinition / registry 不适用
- **下游执行 / adapter 等价性**：renderer 不认识 Legend 私有类型；React marker 只作为同步 authoring sugar 降为同一 `LegendInput`，直接 IR、React、Vanilla 与领域 adapters 复用同一 compile 主链
- **不支持边界与诊断**：不拥有 scale / channel / Table rule / relation model、formatter、interaction、自动 placement 或 renderer measurement；非法输入、缺失 capability、引用错误与布局失败均 fail-loud
- **本轮结论**：扩展 Standard，复用 Core ADR-11、Core registry 与 Standard shared Flex/Overlay engine；领域包单向依赖，不在 Core 或领域包建立平行 Legend

## 不在范围

- Plot、Table 或其它 Tier 2 的实际产品迁移与已发布行为调整
- Legend hover、selection、filter、visibility toggle、tooltip 或宿主 UI
- Chart / Table 外围自动停靠、axis/plotArea collision、全局 decoration solver 或分页 / 滚动容器
- formatter、locale、timezone、domain/tick 推导、scale registry 或 theme precedence
- HTML / DOM Legend、render callback、自定义 React template 或 renderer-specific content
- 自动从 Scene、mark、Cell 或逻辑关系反向生成 Legend

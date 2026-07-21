# v0.5 路线总计划（候选）

> 状态：候选草案。v0.4 已进入 RC 与公开 API 冻结；本文件只登记下一版本方向，不代表已排期、已完成 ADR 或可以开始实现。
>
> 进入任一 Alpha milestone 前，必须先建立 Proposed ADR，并按 `flow-alpha` 完成能力完备性、包边界、define-registry 与端到端闭环检查。

## 版本边界

v0.5 继续补充跨图元、跨 adapter 或影响 IR / compile 的纵向机制。具体图形、领域布局和单一 renderer 特性仍不进入 Kernel。

候选能力只有在根问题、长期 owner、公开契约、React / Vanilla 入口和 Scene / renderer 消费链路明确后，才能进入正式 milestone。当前阶段不冻结字段名或 DSL 语法。

## 候选索引

| 方向                      | 解决的问题                                             | 当前状态 |
| ------------------------- | ------------------------------------------------------ | -------- |
| Scope 自身锚点与变换基点  | 放置、旋转或缩放子图时不再泄漏内部坐标                 | 待 ADR   |
| 单轴路径连接              | 只沿垂直或水平轴连接，不强制补齐正交折线的第二段       | 待 ADR   |
| Node 文本自动对比色       | 根据实际填充明度选择黑色或白色文字，保持可读性         | 待 ADR   |
| Node label 包围盒间距     | 长标签按自身尺寸离开节点边界，避免左右标签与节点重叠   | 待 ADR   |
| TeX 数学语法兼容          | 正确解析 MathJax 支持的 TeX 语法并保留跨后端视觉语义   | 待 ADR   |
| Headless interaction      | 补齐 renderer-agnostic 的 target / intent / manifest   | 待启动   |
| Progressive IR / 增量编译 | 评估 AI step、局部重编译与 SVG / Canvas 更新的共同契约 | 待证据   |

## Scope 自身锚点与变换基点

### 根问题

当前 Scope 的平移、旋转和缩放以局部 `[0, 0]` 或手写坐标为基准。复用子图时，调用方必须知道内部原点和内容尺寸，Scope 还不能像 Node 一样按自身中心或边界锚点放置。

### 候选边界

- 自身点至少覆盖局部 `origin`、`center`、四边、四角，并保留显式 `[x, y]` 逃生口。
- 平移类输入区分“外部目标参照点”和“Scope 自身对齐锚点”；例如把 `Scope.center` 放到某个极坐标目标，而不是把两者混入 `polar-translate.origin`。
- `rotate` / `scale` 可声明自身 pivot；缺省仍为局部 `origin`，不改变 v0.4 语义。
- 自身锚点复用 `scope.id` 的包络与 `boundingShape` 契约，不建立第二套边界计算；空 Scope 回退到局部原点。
- ADR 必须解决“先算 children 包络还是先解析 transforms”的编译顺序，以及子元素位置与自身 transform 互相依赖时的循环诊断。

## 单轴路径连接

### 根问题

现有 `|-` / `-|` 表达完整正交折线：先沿一个轴，再沿另一个轴到达目标。用户只需要垂直连接时，`|-` 仍会追加水平段，只能手动计算投影点。

### 候选边界

- 提供“保持当前 x、只连接到目标 y”的纯垂直语义；同时评估是否应成对提供纯水平语义，避免单边特例。
- 优先作为 Path / Way 的语义 sugar lower 到现有 line / target 能力；只有现有 Kernel 无法完整表达时才扩展 IR。
- 不改变 `|-` / `-|` 的既有两段折线语义，也不在 renderer 增加特殊路径命令。
- ADR 需覆盖笛卡尔点、Node / anchor target、Scope transform、forward reference、零长度段，以及 React Way 与 Vanilla 写法的一致性。

## Node 文本自动对比色

### 根问题

`currentColor` 跟随主题或外层颜色，不能根据 Node 的实际填充判断文字是否清晰。深色填充需要白字、浅色填充需要黑字时，用户目前必须重复计算和配置。

### 候选边界

- 以显式 opt-in 能力提供，不改变 `currentColor` 与现有 `color` 默认语义。
- 对可解析的纯色 fill 计算相对明度，并在黑 / 白中选择对比度更高的文字颜色；算法与阈值必须在 Core 契约中固定，SVG / Canvas 不得各自判断。
- 明确透明色与背景的合成基准，以及渐变、pattern、image、CSS 变量等无法静态确定明度时的 fallback / 诊断策略。
- 只影响 Node 文本及明确纳入的 label 通道，不应意外改写 stroke、fill 或 Scope 的其它级联字段。
- ADR 需确认该能力进入持久化 IR，还是由 React / Vanilla 共享 authoring helper 展开；两条入口必须得到一致结果。

## Node label 包围盒间距

### 根问题

当前 Node label 的 `distance` 是“节点边界到 label 中心”的固定偏移，没有计入 label 自身尺寸。长文本放在节点左侧或右侧时，即使 `distance` 为正，label 仍可能大面积穿入节点；上下位置的实际边缘间距也会随字体高度变化，和用户设置的数值不一致。

该行为符合 v0.4 schema 对 center distance 的字面描述，因此改成视觉盒间距会改变既有 label 坐标、pin 长度与自动 viewBox，作为 v0.5 可见行为修正处理，不回灌已冻结的 v0.4 RC。

### 候选边界

- 将 `distance` 定义为节点边界与 label 视觉盒沿放置方向的间距，而不是到 label 中心的距离；默认值与非负约束可保持不变。
- 上下方向的中心偏移为 label 半高 + `distance`，左右方向为 label 半宽 + `distance`。对角 anchor、数值角度和 `{ boundary, fraction }` 统一使用旋转后 label OBB 在放置方向上的投影半径，避免维护轴向特例。
- Node label layout 保存统一的 `measuredWidth` / `measuredHeight`；纯文本、混排 / TeX、Scene `TextPrim`、bbox 与 pin 引线必须消费同一视觉盒，不能继续以 `fontSize` 代替整体高度。
- `placement: 'outside'` / `'inside'` 复用同一 box extent，只反转偏移方向；inside 只保证相对所选边界的定向间距，不承诺超大 label 完整容纳于节点内部。
- `position: 'center'` 继续直接落在节点中心；`keepUpright` 的 180° 翻转不改变 box extent。任意非凸 shape 的全局 label 碰撞避让不纳入本项。
- ADR 需覆盖长文本的 left / right、top / bottom、对角与数值角度、显式 / radial / tangent rotate、inside、混排 / TeX、旋转 Node、pin 端点、自动 viewBox，以及 `distance: 0` 的贴边语义。

## TeX 数学语法兼容

### 根问题

当前 `@retikz/tex` 只覆盖有限的 MathJax TeX 输入与单一路径 lowering，部分 LaTeX 数学语法无法启用，公式内部颜色等视觉语义也会在进入 Scene 前丢失。v0.5 需要把目标明确为兼容 MathJax 支持的 TeX 数学语法，而不是完整 LaTeX 文档编译器。

### 候选边界

- `@retikz/tex` 负责 MathJax 扩展的选择性加载及公式字形与样式 lowering；Core 继续拥有后端中立的 `LowerTex` / `LoweredTex` 与 Scene 契约。
- 保留现有默认行为、自定义 engine 与 lowerer 的兼容路径；具体 profile、扩展包集合和数据结构留到该 milestone 的 ADR 再确认。
- ADR 需覆盖 SVG / Canvas 等后端的一致性、样式继承、无法表达的语法与样式诊断、浏览器包体与初始化成本，以及缓存键的完整性。

## Standard Drawing Library

官方可选的跨领域绘图能力库已移交独立的 [`packages/library`](../../../../../library/_notes/architecture/standard-library-design.md) 分组。它不再是 Kernel lockstep 的 v0.5 候选；Core 继续拥有公开 extension 契约，Library 的 Standard 包家族由首个具体能力 ADR 建立独立 release group、package manifest 和 React / Vanilla 接入。

## 进入正式 milestone 的条件

1. 从真实示例确认最小用户语法，不以 controls 或单个 demo 反推公共 API。
2. 对照 `core-drawing-complete.md` 确认能力归属、包边界和下游闭环。
3. 涉及 IR / schema / compile 的候选完成 Alpha Architecture Gate；最多三轮，未通过则交人工决策。
4. ADR 明确迁移影响、错误路径、测试象限和文档同步范围后，才分配 `alpha.N`。

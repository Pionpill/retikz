# 叙述图契约

用于架构、流程、概念、Schema/API 关系与实现说明图；可复制组件用法 demo 使用 [预览契约](component-preview.md)，不因用了流程组件就变成叙述图。

## 文件与渲染

- 使用 retikz 自绘，同级 `<name>.tsx` 与 `<name>.i18n.ts`；单份默认导出 FC 接收 `lang?: Lang`，可见文案来自同名字典，不新建两份语言图。
- 静态图保持可直接派生 IR，不使用 hook 或渲染外副作用；交互图按 [Controls](controls.md) 的源码派生路径处理。
- MDX 使用 `<ComponentPreview files="..." hideCode type="..." />`。FlowDiagram / FlowLayout / FlowEntities / FlowRelations 的叙述图为 `flow`，其它为 `illustration`。
- 算法控制流复用现有 Flow 能力，不手写平行流程布局。数据结构图强调组织、嵌套、引用与读写，按 [逻辑图](figure-logic.md#数据结构图) 复用 List / Map；当前预览 type 仍使用 `illustration`。
- 图前指出观察对象，图后解释结论；不用截图、Mermaid 或外部绘图代替站内功能图。

## 视觉编码

| 对象                       | 编码                                                |
| -------------------------- | --------------------------------------------------- |
| 普通文字、主节点内容       | currentColor                                        |
| 辅助说明、边标签           | 12px gray                                           |
| 普通 Draw 连线             | 沿用默认颜色，不主动覆盖 stroke                     |
| 需要区分的类别             | darkorange、dodgerblue；第三类才用 darkviolet       |
| 错误 / 成功                | red / green，仅承载对应状态                         |
| 实际不存在的几何教学辅助   | gray dotted，`dashPattern={[1, 4]}` + round lineCap |
| 真实辅助依赖 / 边界        | dashed；主数据流保持实线                            |

同色对应同一类别，不用强调色表达每个当前步骤。不在消费图复制主题色值；复用站点 vocabulary。中性线文字不用 lightgray/dimgray 等易消失的固定颜色，opacity 通常 0.6–1；不要对整个分组降透明度而弱化正文。明暗背景下均核对可辨性。

## 节点与分组

- 先用分区、阅读方向和对齐表达关系，再决定形状与配色；卡片按内容自然定尺寸，同级统一内边距、字号与标题基线。仅需行列对齐时按当前组内容匹配宽高，不给全图或多张图套固定 minimumSize 撑大卡片。
- 普通内容优先统一小圆角卡片；特殊形状只保留能帮助阅读的真实语义，如条件判断。不得为统一形状篡改 role，也不为每类名词增加 role；参数和实现锚点优先放次行或附注，数据结构按实际条目绘制。
- 一张图默认以中性色组织内容，强调色聚焦关键机制；第二种强调色须表达必要对比，不把每个阶段都设为重点。
- 常规节点采用一致边界模式：边框表达分类、容器或流程角色时保留；无此含义时可统一无框、无填充。普通有框矩形用 4px 小圆角，角色专用形状按真实语义选择。
- 双行节点：标题通常 14px 常规字重，次行职责或实现锚点 12–13px gray。同级字号一致，不单独缩小长标签。Flow 使用 TextBlock 数组分层，不把全部文字染灰。
- 卡片优先短标题加一行补充；多项独立步骤或输入不塞成三行以上的大卡片。收紧尺寸先去掉无必要的宽高下限，不缩小字号或整图比例。
- 文件路径、职责补充放次行或正文，不画成伪下游节点。
- 语义分组使用 `LogicFigureFrame` + 直接子元素 `LogicFigureFrameTitle`，从 `@/modules/docs/components/logic-figure` 导入。边界紧包内容，内部左上角留灰色常规标题行；不靠巨大 minimumSize 撑空白。
- 只有一个分组时不加 Group，直接保留内部 Layout；公共背景说明放图前正文。多个有意义的阶段或职责需要区分时才添加分组边界。
- Group 不加背景填充，只保留必要边框与标题；组件默认带底色时显式设置 `background={{ fill: 'none' }}`。此规则不移除 Entity 或数据单元格有语义的填色。
- Flow 内使用其支持的 `FlowGroup` 与 caption 表达同类边界，不将 Graph/Core 分组组件塞入 Flow marker 树；沿用紧包内容、小圆角、弱边界和左上标题的规则。
- 跨组连线放分组外，通过稳定 id 连接实际角色；不连接分组标题。
- Frame 组件教学、viewBox、bbox、clip、连接面等几何边界不套语义分组规则。
- Map 行、Array 槽位、栈 frame 与对象记录属于数据结构边界，按结构绘制；职责分组仍使用 LogicFigureFrame，不把两者混用。
- Secondary 可用无描边中性底色表达真实辅助层级，不强迫主节点跟随它变无框。

## 连线与标签

优先按 id 连线；专属 anchor 用 `{ id, anchor: 'tip-0' }`，不写字符串 shorthand。每条箭头有可命名关系；双向箭头只表示真实双向同步或可逆关系。

关系文字使用 Path / Draw 的 label，不额外手写文字 Node。边标签统一 12px gray；position、side、sloped、distance 与默认一致时省略，仅为真实布局需要覆盖。竖向连线按需指定 right / left；斜标签按旋转后的 bounds 留空间，先调整结构位置与路径，不盲目增大 distance。

## 布局与几何

- Layout 输出响应式限制为 `maxWidth: '100%', height: 'auto'`；width/height 决定输出尺寸，viewBox 决定坐标范围，不能混为一谈。
- 按实际内容 bounds 收紧画布。先调整间距、标签换行和布局，再考虑整体缩放；同级节点保持一致字号。
- Flow 优先省略 `gap`、`rowGap`、`columnGap`，沿用默认间距与标签空间预留；仅在真实页面出现重叠或关系不清时局部覆盖，不为制造留白统一加大间距。
- 纵向 FlowLayout 内同组并列 Entity 用 `itemWidth="match-largest"`，不逐项硬编码宽度，也不跨嵌套 Layout 扩散。
- 派生几何与参考边界用真实公开计算能力、公式或 compileToScene 核对；对照图保持不变部分、比例与参照一致。
- size、留白、control 空间按 [尺寸测量](preview-sizing.md)；节点或间距收紧后重新测量预览档位，避免保留过大的外部留白。源码逻辑尺寸不能代替真实页面。

## 验证

检查 zh/en × 桌面约 1440px，布局变化再检查窄屏和相关主题。读取 preview、render pane、SVG 实际 bounds，确认无横向滚动、非预期重叠、裁切或失衡空白；图型、颜色与线型须符合正文语义。

已有 Playwright 环境可使用 [check-figure-preview.mjs](../scripts/check-figure-preview.mjs)，截图写入 ignored 的 notes/reports/figure-preview/；先读模块导出与参数再调用。缺少运行环境时手动检查同一矩阵，不为此安装新仓库依赖。未做视觉检查就报告未做。

绘制中发现公开能力缺口或误导性属性说明时，附最小证据和影响反馈；不在画图任务中顺带扩展底层契约。

# 叙述图契约

用于架构、流程、概念、Schema/API 关系与实现说明图；可复制组件用法 demo 使用 [预览契约](component-preview.md)，不因用了流程组件就变成叙述图。

## 文件与渲染

- 使用 retikz 自绘，同级 `<name>.tsx` 与 `<name>.i18n.ts`；单份默认导出 FC 接收 `lang?: Lang`，可见文案来自同名字典，不新建两份语言图。
- 静态图保持可直接派生 IR，不使用 hook 或渲染外副作用；交互图按 [Controls](controls.md) 的源码派生路径处理。
- MDX 使用 `<ComponentPreview files="..." hideCode type="..." />`。FlowDiagram / FlowLayout / FlowEntities / FlowRelations 的叙述图为 `flow`，其它为 `illustration`。
- 真正执行或数据先后的流程复用现有 Flow 能力，不手写平行布局与连线。其它关系图按 [逻辑图](figure-logic.md) 选择组件。
- 图前指出观察对象，图后解释结论；不用截图、Mermaid 或外部绘图代替站内功能图。

## 视觉编码

| 对象                       | 编码                                                |
| -------------------------- | --------------------------------------------------- |
| 普通文字、主节点内容       | currentColor                                        |
| 辅助说明、普通连线、边标签 | gray                                                |
| 需要区分的类别             | darkorange、dodgerblue；第三类才用 darkviolet       |
| 错误 / 成功                | red / green，仅承载对应状态                         |
| 实际不存在的几何教学辅助   | gray dotted，`dashPattern={[1, 4]}` + round lineCap |
| 真实辅助依赖 / 边界        | dashed；主数据流保持实线                            |

同色对应同一类别，不用强调色表达每个当前步骤。不在消费图复制主题色值；复用站点 vocabulary。中性线文字不用 lightgray/dimgray 等易消失的固定颜色，opacity 通常 0.6–1；不要对整个分组降透明度而弱化正文。明暗背景下均核对可辨性。

## 节点与分组

- 常规节点采用一致边界模式：边框表达分类、容器或流程角色时保留；无此含义时可统一无框、无填充。普通有框矩形用 4px 小圆角，角色专用形状按真实语义选择。
- 双行节点：标题通常 14px 常规字重，次行职责或实现锚点 12–13px gray。同级字号一致，不单独缩小长标签。Flow 使用 TextBlock 数组分层，不把全部文字染灰。
- 文件路径、职责补充放次行或正文，不画成伪下游节点。
- 语义分组使用 `LogicFigureFrame` + 直接子元素 `LogicFigureFrameTitle`，从 `@/modules/docs/components/logic-figure` 导入。边界紧包内容，内部左上角留灰色常规标题行；不靠巨大 minimumSize 撑空白。
- 跨组连线放分组外，通过稳定 id 连接实际角色；不连接分组标题。
- Frame 组件教学、viewBox、bbox、clip、连接面等几何边界不套语义分组规则。
- Secondary 可用无描边中性底色表达真实辅助层级，不强迫主节点跟随它变无框。

## 连线与标签

优先按 id 连线；专属 anchor 用 `{ id, anchor: 'tip-0' }`，不写字符串 shorthand。每条箭头有可命名关系；双向箭头只表示真实双向同步或可逆关系。

每个边标签显式设置 position、side、sloped：水平主链通常 midway/top/false，竖向依赖 midway/right/false；只有沿线更易识别时才 sloped。标签通常 12px gray，斜标签按旋转后的 bounds 留空间，不能盲目加 distance 把文字挤到邻居。

## 布局与几何

- Layout 输出响应式限制为 `maxWidth: '100%', height: 'auto'`；width/height 决定输出尺寸，viewBox 决定坐标范围，不能混为一谈。
- 按实际内容 bounds 收紧画布。先调整间距、标签换行和布局，再考虑整体缩放；同级节点保持一致字号。
- 纵向 FlowLayout 内同组并列 Entity 用 `itemWidth="match-largest"`，不逐项硬编码宽度，也不跨嵌套 Layout 扩散。
- 派生几何与参考边界用真实公开计算能力、公式或 compileToScene 核对；对照图保持不变部分、比例与参照一致。
- size、留白、control 空间按 [尺寸测量](preview-sizing.md)；源码逻辑尺寸不能代替真实页面。

## 验证

检查 zh/en × 桌面约 1440px，布局变化再检查窄屏和相关主题。读取 preview、render pane、SVG 实际 bounds，确认无横向滚动、非预期重叠、裁切或失衡空白；图型、颜色与线型须符合正文语义。

已有 Playwright 环境可使用 [check-figure-preview.mjs](../scripts/check-figure-preview.mjs)，截图写入 ignored 的 notes/reports/figure-preview/；先读模块导出与参数再调用。缺少运行环境时手动检查同一矩阵，不为此安装新仓库依赖。未做视觉检查就报告未做。

绘制中发现公开能力缺口或误导性属性说明时，附最小证据和影响反馈；不在画图任务中顺带扩展底层契约。

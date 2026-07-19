---
name: docs-doc-control
description: retikz 文档站带 controls 面板的 ComponentPreview 规范。用于新增、合并、修改或评审 `*.controls.ts`、消费 `usePreviewControls` 的 demo、`PreviewControlContract`、playground 取景与交互视觉语义；也用于把同一稳定场景下的重复样式 demo 合并为可操作面板。retikz 专用。
---

# ComponentPreview Controls 规范

## 前置规则

先读 [`docs-doc-principle`](../docs-doc-principle/SKILL.md)，再按页面类型读取组件页、扩展页、示例页或分组页 skill。本 skill 只补充带 controls 的 `ComponentPreview` 规则。

## 先定义试验场

写代码前明确四件事：

1. **任务**：用户通过操作要理解哪一个公开能力
2. **主体**：哪一个对象是观察重点
3. **不变量**：位置、参考物、连接关系、取景或 JSX 结构中哪些必须固定
4. **变量**：哪些公开 API 由 controls 改变，变化是否肉眼可辨

同一任务、主体和结构下的连续参数、闭合集合与通用样式，优先合并为一个 playground。controls 很少也可以使用 panel；不要为了字段少而制造额外静态 demo。不同 JSX 结构、组合关系、职责边界、错误行为或编译机制仍保留独立案例。

## 面板组织

- 默认使用 `presentation: 'panel'`；面板便于后续继续扩展字段
- 按能力所有者、职责层级或视觉对象分 section，不按字段类型机械分组
- 双节点、多层对象分别分组，如“节点 A / 节点 B”“主体 / 标签 / 阴影”
- 用 `visibleWhen` 隐藏当前分支无效的字段；不要让用户操作没有效果的 control
- label 简短，直接使用公开 API 名或用户能判断的中文，不重复括号说明
- 范围覆盖有意义的最小值、最大值和代表性极值；默认值保持可读、可比较
- 复杂组件允许较多 controls，但所有字段必须可滚动到达，源码栏不得遮挡面板

## 稳定文档契约

每个 controls 模块显式导出 `previewControlContract`，不要依赖 registry 从任意命名导出推断：

```ts
import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

export const previewControlContract = {
  controls: exampleControls,
  canonicalValues: { distance: 80 },
  relatedApis: ['Node.position'],
} satisfies PreviewControlContract;
```

- `canonicalValues` 是截图、测试、Reset 与无交互环境的稳定基线；列出全部字段
- `relatedApis` 只列 controls 直接解释的公开 API，不列宿主 actions 或间接实现
- `presets` 只收录有用户语义的完整状态，不把任意排列包装成 preset
- zh / en 的 id、kind、默认值、范围、option value、条件和 canonical 状态保持一致；只本地化 title、section、label 与 preset label
- demo 同时显式导出注册回退，并关闭动态 IR 派生：

```ts
export const previewControls = exampleControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;
```

## 视觉层级

用视觉语义区分主体、真实关系和教学辅助，不让颜色与线型互相抢职责：

| 元素                   | 规则                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 主要对象               | 一般采用当前页面的主题色；同一 demo 只保留一个主强调色                                                        |
| 次要但真实的关系       | 灰色、常规线宽、实线；例如不是教学重点的连接边                                                                |
| 实际不存在的辅助线     | 浅灰 dotted：`dashPattern={[1, 4]}` + `lineCap="round"`；例如坐标轴、投影、控制柄、测量线和 boundary 辅助轮廓 |
| 不关键但真实存在的对象 | 灰色 dashed 边框；例如仅提供参照的节点或分组边界                                                              |
| 文字                   | 主体文字保持默认色；辅助标注用灰色，颜色不承担第二套分类语义                                                  |

补充约束：

- dotted 只表示“教学辅助、实际不存在”；dashed 表示“真实但降级”，两者不可混用
- 连接线不是主题时使用 `stroke="gray"` 与常规粗细，不使用主题色或加粗
- 优先复用 CSS 颜色关键字和当前 demo 已确定的主题色；不要为相同语义散落近似 hex
- 需要比较多个真实类别时，可以增加颜色，但必须在正文或图内说明映射
- Node 位置关系 demo 的引用 id 用大写 `A/B/C`，可见标签用小写 `a/b/c`

## 取景与尺寸

- 会改变位置、尺寸、旋转、阴影、滤镜、描边或其它包围盒的 playground 使用固定 `viewBox`
- 操作 controls 时，相机、主体中心和不变量不得漂移；变化只发生在目标属性上
- 用最小值、最大值和组合极值验证主体与效果边界不被裁切
- 在 800px 正文宽度的真实页面选择显式 `<ComponentPreview size>`；常规内容四边约 12px，有顶部悬浮控件时顶部约 52px
- controls playground 先尝试 `size="sm"`，再选择能够完整、清晰展示主体与面板的最小档位
- 内容低矮、字段很少且缩小后仍清晰时使用 `xs`；主体、文字或多分组面板在 `sm` 下难以辨认时使用 `md`；`lg` 及以上只用于确有纵向空间需求的复杂场景，并在真实页面确认必要性
- `size` 只解决预览区的纵向高度；横向拥挤、主体缩放或位置漂移应调整 `Layout width`、固定 `viewBox`、构图或右侧输出宽度
- 不按组件重要性、源码中的 `width` / `height` 或 controls 数量机械决定档位；以真实页面中的主体可读性、留白和面板可操作性为准
- controls playground 右侧内容的显式输出宽度优先控制在 `400px` 或以下，一般不超过 `600px`；超过 `400px` 时验证拖拽面板分隔线前后主体没有缩放
- controls 较多并导致主体或关键字段被挤压时优先增加高度档位，不缩小主体或裁掉面板字段

## 说明文字

需要解释“操作什么、观察什么或哪些线只是辅助”时，使用 `ComponentPreview` 的 `caption` 属性，让说明紧跟在预览正下方。不要在 MDX 中另写灰色 `span` 模拟说明。

caption 只补充读图线索，不重复上一段正文，也不塞 API 参考或长教程。

## 验证

1. 比较 zh / en controls 契约，确认除文案外结构一致
2. 操作每个职责层级至少一个字段，并验证条件字段显示与隐藏
3. 验证默认、最小、最大、组合极值与语义 presets，再 Reset 回 canonical 状态
4. 比较固定 viewBox、主体 bounds 与完整效果 bounds，确认不漂移、不裁切
5. 打开真实页面检查面板滚动、源码栏、caption、显式 size、右侧输出宽度与 800px 宽度下的留白；拖拽面板分隔线时主体不得缩放
6. 运行 docs `tsc --noEmit`、相关 Vitest、Prettier 与 `git diff --check`

## 常见错误

- controls 改了值，但 demo 没有消费该字段
- 使用自动取景，造成用户误以为 position 或尺寸变化
- 用多种强调色、粗连接线或高对比辅助线抢走主体注意力
- 把 dotted 与 dashed 都当作普通“虚线”
- 只导出命名 controls，缺少显式 contract 或 demo 的 `previewControls` 回退
- 每个参数各放一个 demo，导致正文重复且无法直接比较
- 用 controls 隐藏不同结构、错误路径或扩展链路

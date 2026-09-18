---
name: docs-doc-control
description: Use when a retikz ComponentPreview has controls, a *.controls.ts contract, usePreviewControls, presets, or a playground that replaces repeated parameter-only demos.
---

# ComponentPreview Controls 规范

## 前置规则

先读 [`docs-doc-principle`](../docs-doc-principle/SKILL.md)、[`ComponentPreview 按需契约`](../docs-doc-principle/references/component-preview.md) 与 [`Demo 视觉语义`](../docs-doc-principle/references/demo-visual-language.md)，再按页面类型读取组件页、扩展页、示例页或分组页 skill。本 skill 只补充 controls 特有规则。

## 先定义试验场

写代码前明确四件事：

1. **任务**：用户通过操作要理解哪一个公开能力
2. **主体**：哪一个对象是观察重点
3. **不变量**：位置、参考物、连接关系、取景或 JSX 结构中哪些必须固定
4. **变量**：哪些公开 API 由 controls 改变，变化是否肉眼可辨

基础用法先按 [docs-doc-usage](../docs-doc-usage/SKILL.md) 展示无 controls 的最小源码示例，再引入交互试验场；不要用 playground 替代首个入门 demo。

后续同一任务、主体和结构下的连续参数、闭合集合与通用样式，优先合并为一个 playground。controls 很少也可以使用 panel；不要为了字段少而制造额外静态 demo。不同 JSX 结构、组合关系、职责边界、错误行为或编译机制仍保留独立案例。

## 面板组织

- demo 为展示效果覆盖 API 默认值时，在正文或 caption 明示；主体参数与辅助显示参数按职责分组
- 默认使用 `presentation: 'panel'`；面板便于后续继续扩展字段
- 按能力所有者、职责层级或视觉对象分 section，不按字段类型机械分组
- 双节点、多层对象分别分组，如“节点 A / 节点 B”“主体 / 标签 / 阴影”
- controls 包含只读 `table` 数据时，数据 section 默认作为首个 section，先展示输入再操作绑定、变换或样式
- Plot demo 使用行数据绘图时，默认在 controls 首个 section 展示只读 `table`；没有可写字段时也使用仅含数据表的 panel。叙述图或无需数据即可理解的固定示意除外
- Plot demo 的行数据放在同级 `*.data.ts`，由 demo 与 controls 共用，并在 `<ComponentPreview files>` 中列出
- 数据只是不变量或观察背景时，数据 section 设置 `defaultCollapsed: true`；理解绑定、排序或分组必须依赖原始数据时保持展开
- `table` 滚动视口默认完整展示 5 行正文，header 不计入；更多行继续滚动，渲染行数上限单独控制
- 用 `visibleWhen` 隐藏当前分支无效的字段；不要让用户操作没有效果的 control
- 中文页面的 controls 面板必须提供完整中文文案：title、section、字段 label、option label、preset label 与帮助文字都使用中文；API 名可按需作为补充，但不得充当唯一 label。双语 demo 的这些可见文案与图内文本统一放同级 `<name>.i18n.ts`，controls 只按当前 `Lang` 读取，不维护 `*.en.controls.ts` 等平行翻译文件
- API、枚举和数据字段的 `value` 保持原值；只本地化用户可见 label，不翻译代码中的标识符
- label 简短，让用户能直接判断控制目标，不重复括号说明
- 范围覆盖有意义的最小值、最大值和代表性极值；默认值保持可读、可比较
- 复杂组件允许较多 controls，但所有字段必须可滚动到达，源码栏不得遮挡面板

## 稳定文档契约

每个 controls 模块显式导出 `previewControlContract`，不要依赖 registry 从任意命名导出推断。双语 controls 则显式导出按 `Lang` 读取同级 i18n 字典的 contract 工厂，由预览器按当前文档语言调用；字段 id、默认值、范围、canonicalValues 与 relatedApis 仍保持语言无关：

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
- zh / en 的 id、kind、默认值、范围、option value、条件和 canonical 状态保持一致；本地化 title、section、字段与 option label、preset label 及帮助文字
- demo 同时显式导出注册回退；使用 `defineControlledPreview` 复用一份 JSX，交互视图读取实时值，IR / Vanilla 源码视图读取 canonical 状态：

```tsx
import { defineControlledPreview } from '@/modules/docs/preview';

export const previewControls = exampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout>{/* 使用 values */}</Layout>
));

export const previewSource = controlledPreview.source;
export default controlledPreview.Component;
```

- 只有无法共享渲染函数的 hook / Effect demo 才手写 `deriveIR: false`，并按需导出 `previewIR` 或 Vanilla override

## 取景与尺寸

- 会改变位置、尺寸、旋转、阴影、滤镜、描边或其它包围盒的 playground 使用固定 `viewBox`
- 默认以自然尺寸展示：数值 `width` / `height` 分别等于 `viewBox.width` / `viewBox.height`，保持 1 user unit 对应 1 CSS px；禁止用更大的输出尺寸配更小的 viewBox 无意放大主体
- 操作 controls 时，相机、主体中心和不变量不得漂移；变化只发生在目标属性上
- 用最小值、最大值和组合极值验证主体与效果边界不被裁切
- 在 800px 正文宽度的真实页面选择显式 `<ComponentPreview size>`；常规内容四边约 12px，有顶部悬浮控件时顶部约 52px
- controls playground 先尝试 `size="sm"`，再选择能够完整、清晰展示主体与面板的最小档位
- 内容低矮、字段很少且缩小后仍清晰时使用 `xs`；主体、文字或多分组面板在 `sm` 下难以辨认时使用 `md`；`lg` 及以上只用于确有纵向空间需求的复杂场景，并在真实页面确认必要性
- `size` 只解决预览区的纵向高度；横向拥挤、主体缩放或位置漂移应调整 `Layout width`、固定 `viewBox`、构图或右侧输出宽度
- 不按组件重要性、源码中的 `width` / `height` 或 controls 数量机械决定档位；以真实页面中的主体可读性、留白和面板可操作性为准
- ComponentPreview 尺寸测量脚本先按每个 `size` 的真实图形 bounds 确定最小可完整容纳图形高度加 40px 留白的档位，再在该档位采集 controls 的实测数据：field / section 数量、item / section gap、列数、滚动视口高度、完整 `scrollHeight`、剩余溢出和 `requiredWorkspaceHeight`。不要用 controls 数量或源码 `width` / `height` 猜测结果
- 脚本同时在 25% 与 50% 控制面板宽度采样。以图形最小档位的 `remainingOverflow / workspaceHeight` 作为高度差比例：不超过 50% 时，先仅通过 `size` 尝试适配；`md` 及以下最多提升两档，`lg` 及以上最多一档。无论差距大小，50% 宽度只在图形实际宽度不超过 workspace 一半时可用；差距较大时优先检查它。两种调整可组合；在允许范围仍不能完整展示时，输出最大允许的 size / 面板宽度及剩余溢出，不追加其它启发式
- `check:figure-size` 的 JSON 必须保留每个 size、两种面板宽度和上述原始观测值，以及 `heightGapRatio`、rule、推荐 size、`defaultSize: 50` 与剩余溢出。脚本负责确定性计算，LLM 只决定是否把建议应用到某一个已核验的 demo；不得批量修改现有 demo。仅在 zh / en 都建议 50% 且真实页面确认图不会被压缩时，才手动为该 demo 采用 `defaultSize: 50`
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
6. 运行 docs `tsc --noEmit`、相关 Vitest、Oxfmt 与 `git diff --check`

## 常见错误

- controls 改了值，但 demo 没有消费该字段
- 使用自动取景，造成用户误以为 position 或尺寸变化
- 用多种强调色、粗连接线或高对比辅助线抢走主体注意力
- 把 dotted 与 dashed 都当作普通“虚线”
- 只导出命名 controls，缺少显式 contract 或 demo 的 `previewControls` 回退
- 每个参数各放一个 demo，导致正文重复且无法直接比较
- 用 controls 隐藏不同结构、错误路径或扩展链路

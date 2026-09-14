# ComponentPreview 按需契约

仅在页面实际使用 `<ComponentPreview>`、源码视图、多文件或数据文件时读取。带 controls 的 demo 还必须读 `docs-doc-control`；controls 的字段、取景和交互规则不在这里重复。

## 文件与入口

- 主 demo 与 MDX 同目录。新建且含本地化展示文本的图统一使用 `<name>.tsx` + `<name>.i18n.ts`，不要为 zh / en 复制两份图组件；图内与同级 controls 的全部可见文案共用该 i18n 字典，不在 controls 中维护第二套翻译
- `<name>.tsx` 默认导出接收 `lang?: Lang` 的 React FC，并用 `const i18n = <name>I18n[lang ?? 'zh']` 读取文案；`<name>.i18n.ts` 导出 `<name>I18n: Record<Lang, ...>`。`I18n` 已表达字典职责，不追加 `Labels` 等后缀
- MDX 始终用 `<ComponentPreview files="<name>" />`；宿主按当前文档语言传入 `lang`
- `<name>.demo.tsx` 与 `<name>.zh.demo.tsx` / `<name>.en.demo.tsx` 仅为既有 demo 的兼容结构，不为新图创建；解析顺序为单文件图、单文件旧 demo、当前语言旧 demo
- `files` 数组第一项是主 demo，其余是源码附属文件；只有需要 `diffFrom` 时使用对象形式
- 叙述图使用 `hideCode`，可复制组件用法保留默认源码视图
- `hideCode` 的 demo 不写注释（包括 JSDoc 与 JSX 注释）；保留源码视图的 demo 如需注释，统一使用英文
- `size` 必须在 800px 正文的真实页面按内容留白选择，不能只看源码的逻辑宽高

## React、IR 与 Vanilla

静态 demo 默认由源码管线执行并派生 IR，再从 IR 生成 Vanilla 代码。展示的 IR 与 Vanilla 配置必须是最上层、精简的 Source IR / authoring 语义，不得暴露 lower 后的 `base` 或完整解析结果；canonical runtime IR 仅供校验、渲染与生成结果验证。不要额外手写等价 IR / Vanilla 文件，除非自动结果不适合教学。

controls demo 使用 `defineControlledPreview(previewControlContract, render)` 复用同一渲染函数：可见组件读取实时 controls，源码视图以 definition 默认值与 `canonicalValues` 合并后的稳定状态派生 IR / Vanilla：

```tsx
import { defineControlledPreview } from '@/modules/docs/preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout>{/* 使用 values */}</Layout>
));

export const previewSource = controlledPreview.source;
export default controlledPreview.Component;
```

其它使用 hook、Effect、组件状态或 Preview Context 且无法共享纯渲染函数的 demo 不能在 React 外静态执行，必须导出：

```ts
export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;
```

这类 demo 默认只保留 React；确需 IR Tab 时导出 `previewIR` 或提供 `<name>.ir.json`。需要更地道的 Vanilla 写法时提供 `<name>.vanilla.ts`。Tier 2 composite 仅在 ComponentPreview 已注册对应转换器时自动生成 Vanilla 源码与真实 runtime 预览；未注册能力必须显示明确诊断。

## 数据与附属源码

数据与取数逻辑不内联到大型图组件，放在同级 `.data` 文件并列入 `files`：

| 场景           | 文件                                               |
| -------------- | -------------------------------------------------- |
| 单数据集       | `<demo>.data.ts`                                   |
| 多数据集       | `<demo>.<dataset>.data.ts`                         |
| React 远程取数 | React hook 放 `.data.ts`；Vanilla 另写非 hook 文件 |

每个 demo 默认拥有自己的 data 文件；只有确实讲同一数据集时才跨 demo 共享。示例页的渐进式多文件和 diff 规则由 `docs-doc-example` 拥有。

## 宿主能力边界

renderer、主题、全屏、重置、代码视图等是 Preview 宿主通用能力，不在每篇组件文档重复做静态 demo 或 controls。只有页面本身讲 Preview 宿主，或该选项会改变当前能力语义时才展开。

## 新文件验证

新增 demo 文件后，用新启动的 `pnpm dev:docs` 或 docs build 验证。已有 Vite session 可能保留旧 eager registry，刷新页面并不保证新 demo 可发现；看到 `Demo ... not found` 先重启 dev server，再判断文件名或 registry 是否错误。

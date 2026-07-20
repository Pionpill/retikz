# ComponentPreview 按需契约

仅在页面实际使用 `<ComponentPreview>`、源码视图、多文件或数据文件时读取。带 controls 的 demo 还必须读 `docs-doc-control`；controls 的字段、取景和交互规则不在这里重复。

## 文件与入口

- 主 demo 与 MDX 同目录，命名 `<name>.demo.tsx`；有本地化展示文本时用 `<name>.zh.demo.tsx` / `<name>.en.demo.tsx`
- demo 默认导出 React FC，MDX 用 `<ComponentPreview files="<name>" />`
- `files` 数组第一项是主 demo，其余是源码附属文件；只有需要 `diffFrom` 时使用对象形式
- 叙述图使用 `hideCode`，可复制组件用法保留默认源码视图
- `size` 必须在 800px 正文的真实页面按内容留白选择，不能只看源码的逻辑宽高

## React、IR 与 Vanilla

静态 demo 默认由源码管线执行并派生 IR，再从 IR 生成 Vanilla 代码。不要额外手写等价 IR / Vanilla 文件，除非自动结果不适合教学。

使用 hook、Effect、组件状态或 Preview Context 的 demo 不能在 React 外静态执行，必须导出：

```ts
export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;
```

这类 demo 默认只保留 React；确需 IR Tab 时导出 `previewIR` 或提供 `<name>.ir.json`。需要更地道的 Vanilla 写法时提供 `<name>.vanilla.ts`。

## 数据与附属源码

数据与取数逻辑不内联到大型 `.demo.tsx`，放在同级 `.data` 文件并列入 `files`：

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

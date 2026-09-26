# DocTabs / DocSteps

## 适用场景

- `DocTabs` 用于同一任务的替代方案；共同安装、限制和比较放在外部；宿主专属依赖放对应 Tab 内，包管理器仍用 `PackageManagerInstall`
- `DocSteps` 用于有顺序且每步含说明或代码的接入操作；简单短步骤用普通有序列表
- 两者可独立使用或组合；不要多层嵌套方案 Tab。API 参考例外：「属性」页签内可用一层 DocTabs 切换具名联合分支，规则见 [API 参考](../../docs-doc-reference/references/api.md)
- 基础、专题与扩展用法页的首个“接入方式”按下述四栏规则；后续示例先检查 ComponentPreview 源码，已覆盖的完整用法不再重复 DocTabs，正文只补关键差异。
- 总入口对照 React / Vanilla × API / IR 时，使用四个 DocTab：React + JSX、React + IR、Vanilla API、Vanilla + IR；value 分别为 `react-jsx`、`react-ir`、`vanilla-api`、`vanilla-ir`。四种写法展示同一结果及真实调用入口，不用 ComponentPreview 的 React 派生 Vanilla 源码代替原生 IR 接入
- “接入方式”依次放说明文字、无 controls 且 `hideCode` 的最小 ComponentPreview、四种接入 Tab。预览只展示共同结果，源码由 Tab 承担。只有单宿主或无宿主差异的 TypeScript API 时展示真实支持的入口，不虚构 React/Vanilla 或 IR 能力

## 组合契约

正文使用 `DocTabs > DocTab` 与 `DocSteps > DocStep`，不使用 `items[].content`。四个组件均已注册到 MDX。

- `DocTabs`：`defaultValue` 指定默认方案，直接子元素为 `DocTab`
- `DocTab`：`value` 为组内唯一标识，`label` 为标签，children 为 MDX 正文
- `DocSteps`：直接子元素为 `DocStep`，每组自动从 1 编号，全部展开，无完成状态
- `DocStep`：`title` 为步骤标题，不进入页面目录，children 为 MDX 正文；不手写序号

仅含 `react`、`vanilla` 两项的 Tab 在同篇文档内共享局部选择。打开文档或刷新时按全局“接入方式”（初始 React）初始化；页内切换只同步本篇 Tab，不修改全局偏好；菜单切换更新全局偏好及当前文档。其他方案由 `defaultValue` 初始化并保持独立。zh/en 保持 value 一致，翻译 label、title 和正文。

React / Vanilla 接入以“导入内容”和“接入渲染”为基本结构，均包含说明和必要代码，但不固定步骤数量。共享安装不能代替 import；接入示例须到初始化、注入或调用及最终渲染结果。步骤左侧竖线包括最后一步。

- “导入内容”先用文字说明本页关键能力由哪些包或子入口导出、各自用途，再展示对应 import；只列主题相关导出，不因下一步会用到就加入普通绘图或渲染工具
- “接入渲染”提供完整可运行示例，在这里补齐场景、图元、渲染函数等辅助导入
- 按读者的独立操作目标拆步，不按段落或代码块数量拆步。同一目标的解释留在当前步；具有独立用途、选择条件和示例的替代写法或可选配置可另起一步，并标明“可选”，避免被误读为必须连续执行；步骤数量以最小接入闭环和真实阅读负担决定

## MDX 正文

块级标签与 Markdown 之间保留空行，正文直接使用段落、列表、行内代码和代码围栏。整篇 MDX 统一编译，不为步骤单独编译字符串，不写手工 HTML 段落或带 `\\n` 的代码字符串。

````mdx
<DocTabs defaultValue="react">
<DocTab value="react" label="React">
<DocSteps>
<DocStep title="导入内容">

从 `@retikz/react` 导入组件。

```tsx
import { Layout, Node } from '@retikz/react';
```

</DocStep>
<DocStep title="接入渲染">

使用组件生成图形。

```tsx
const Diagram = () => (
  <Layout>
    <Node position={[0, 0]}>Hello</Node>
  </Layout>
);
```

</DocStep>
</DocSteps>
</DocTab>
<DocTab value="vanilla" label="Vanilla">

此处同样使用 DocSteps，按独立操作目标组织，直接写 Markdown 与代码围栏。

</DocTab>
</DocTabs>
````

代码围栏复用站点高亮、复制和自动行号；仅特殊代码展示使用 `CodeBlock`。不假定 runtime 支持任意本地 MDX import。步骤只用 title，不在隐藏分支添加会产生无效 TOC 的页面标题。

格式化后检查默认分支、切换、步骤编号、代码缩进与复制、行号及窄屏溢出。

源码入口：`apps/docs/src/modules/docs/components/mdx-content/{doc-tabs,doc-steps}/`；示例：`apps/docs/src/modules/docs/contents/kernel/packages/tex/index.{zh,en}.mdx`。

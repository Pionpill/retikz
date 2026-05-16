import { fetchLlmsTxt } from './llms-txt';

export type ContextMode = 'lean' | 'balanced' | 'heavy';

export type Lang = 'zh' | 'en';

/** AI 出图首选格式：auto 让模型自选；ir 强制 IR JSON；tsx 强制 retikz-tsx */
export type DiagramFormatPreference = 'auto' | 'ir' | 'tsx';

export type CurrentPage = {
  title: string;
  mdx: string;
  lang: Lang;
  /** GitHub raw URL of the page mdx；空状态深链按钮需要把这个 URL 喂给外部 AI */
  rawUrl: string;
  /** 站内绝对路径 `/<module>/.../<page>`，用于 ContextChips 自动加入选择集时识别"当前页" */
  path: string;
};

export type ExtraContextItem = {
  path: string;
  title: string;
};

const diagramProtocolZh = (preference: DiagramFormatPreference): string => {
  const intro = `## 画图协议（retikz）

需要画图时用下面两种围栏代码块之一，否则正常用 markdown。

- \`\`\`retikz-ir\`\`\`：直接给 @retikz/core 的 IR JSON。
- \`\`\`retikz-tsx\`\`\`：JSX，仅允许 8 个 retikz 组件 — \`TikZ\` / \`Node\` / \`Path\` / \`Step\` / \`Text\` / \`Coordinate\` / \`Draw\` / \`EdgeLabel\`；props 只能是字面量（字符串 / 数字 / 布尔 / null / 数组字面量 / 对象字面量）；**禁止** 变量引用、表达式、\`.map()\`、hooks、模板插值、spread。

**具体 schema（坐标 / Step kind 枚举 / Node props / Path props / Draw way DSL / 单位与画布等）以站内文档为准，不要凭训练记忆猜**。retikz API 仍在迭代，过去 TikZ 经验或类似库的字段名常与之不一致——先查再写：

- 坐标 / 定位形式：\`/core/concepts/positioning\` · \`/core/reference/schema/placement\`
- IR Scene / Entity / Path：\`/core/reference/schema/scene\` · \`.../entity\` · \`.../path\`
- 各组件 props：\`/core/components/tikz\` · \`.../node/overview\` · \`.../draw/{overview,way,path,step,arrow}\`
- 完整范例：\`/core/examples/karl-circle\`

上面这些页面已经收录在系统 prompt 末尾的 llms.txt 索引里，你能直接看到 URL；按需引用页面 path（以 / 开头）。
不要回避——schema 不熟时务必先索引、再生成，比猜错后再修一次更省 token。`;

  const directive =
    preference === 'ir'
      ? '\n\n**用户已选"仅 IR"**：只输出 ```retikz-ir```，不要给 retikz-tsx。'
      : preference === 'tsx'
        ? '\n\n**用户已选"仅 JSX"**：只输出 ```retikz-tsx```，不要给 retikz-ir。'
        : '\n\n**用户选择 Auto**：简单几何用 ```retikz-tsx``` 更易读；复杂 / 嵌套深 / 节点多的拓扑用 ```retikz-ir``` 更紧凑。';

  return intro + directive;
};

const diagramProtocolEn = (preference: DiagramFormatPreference): string => {
  const intro = `## Diagram protocol (retikz)

When you need to draw a diagram, use one of the two fenced blocks below; otherwise answer normally with markdown.

- \`\`\`retikz-ir\`\`\`: feed @retikz/core IR JSON directly.
- \`\`\`retikz-tsx\`\`\`: JSX, only the 8 retikz components allowed — \`TikZ\` / \`Node\` / \`Path\` / \`Step\` / \`Text\` / \`Coordinate\` / \`Draw\` / \`EdgeLabel\`. Props must be literals (string / number / boolean / null / array literal / object literal). **No** variable references, expressions, \`.map()\`, hooks, template interpolation, or spread.

**Concrete schema (coordinates / Step kind enum / Node props / Path props / Draw way DSL / units & canvas, etc.) comes from the docs — do NOT guess from training memory.** The retikz API is still evolving; prior TikZ knowledge or similar libraries' prop names often disagree. Look it up before writing:

- Positioning forms: \`/core/concepts/positioning\` · \`/core/reference/schema/placement\`
- IR Scene / Entity / Path: \`/core/reference/schema/scene\` · \`.../entity\` · \`.../path\`
- Per-component props: \`/core/components/tikz\` · \`.../node/overview\` · \`.../draw/{overview,way,path,step,arrow}\`
- Worked example: \`/core/examples/karl-circle\`

These pages are already in the llms.txt index appended to this system prompt — you can see the URLs there. Reference them by site-relative path (starting with /).
Don't dodge it — when you're unsure about the schema, index → generate is cheaper than guess → fix later.`;

  const directive =
    preference === 'ir'
      ? '\n\n**User chose "IR only"**: only output ```retikz-ir```, never retikz-tsx.'
      : preference === 'tsx'
        ? '\n\n**User chose "JSX only"**: only output ```retikz-tsx```, never retikz-ir.'
        : '\n\n**User chose Auto**: prefer ```retikz-tsx``` for simple geometry (more readable); prefer ```retikz-ir``` for complex / deeply nested / many-node topologies (more compact).';

  return intro + directive;
};

/**
 * 按 contextMode 拼 system message
 * @description lean=只送当前页；balanced=当前页 + 全站 llms.txt 索引；heavy=v1 暂同 balanced。
 *   extras（用户通过 Add Context 选中的额外页面）以"参考清单"形式附在末尾——v1 不抓 mdx，
 *   仅提示模型用户关心哪些页面；TODO-2 阶段再做实际 mdx 注入。
 *   diagramFormatPreference 决定是否拼接 retikz 画图协议段（auto/ir/tsx 都拼，无是关闭开关）
 */
export const composeSystem = async (
  mode: ContextMode,
  page: CurrentPage | null,
  extras: ReadonlyArray<ExtraContextItem> = [],
  diagramFormatPreference: DiagramFormatPreference = 'auto',
): Promise<string> => {
  const lang = page?.lang ?? 'zh';
  const intro =
    lang === 'zh'
      ? '你是 retikz（TikZ React 适配库）的文档助手。基于下面提供的当前页内容回答用户的问题，回答用中文。需要引用其他文档页时给出对应的 markdown 链接，链接 path 用站内绝对路径（以 / 开头）。'
      : 'You are a documentation assistant for retikz (a TikZ React adapter). Answer user questions based on the current page content provided below. Respond in English. When referencing other documentation pages, include a markdown link using a site-relative path (starting with /).';

  const diagramBlock = '\n\n' + (lang === 'zh' ? diagramProtocolZh(diagramFormatPreference) : diagramProtocolEn(diagramFormatPreference));

  const pageBlock = page ? `\n\n## Current page: ${page.title}\n\n${page.mdx}` : '';

  const extrasBlock = extras.length
    ? `\n\n## Additional pages user selected (titles only, fetch via the link if needed)\n\n${extras
        .map(e => `- [${e.title}](${e.path})`)
        .join('\n')}`
    : '';

  if (mode === 'lean') return intro + diagramBlock + pageBlock + extrasBlock;

  const llms = await fetchLlmsTxt();
  if (!llms) return intro + diagramBlock + pageBlock + extrasBlock;
  return `${intro}${diagramBlock}${pageBlock}\n\n## Site index (other pages)\n\n${llms}${extrasBlock}`;
};

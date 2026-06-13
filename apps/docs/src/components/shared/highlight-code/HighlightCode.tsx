import { useThemeStore } from '@/store/use-theme-store';
import type { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import type { DiffLineKind } from '../component-preview/_shared';

export type HighlightCodeProps = {
  /** Prism 语言名（来自围栏 `language-*`），未知值 prism 会回落为不高亮 */
  lang: string;
  /**
   * 代码原文
   * @description 调用方自己裁尾换行：ComponentPreview 的截断切片可能合法地以空行结尾，自动裁会吃掉那一行
   */
  code: string;
  /** 是否显示左侧行号；不传则按行数自动判断（超过 10 行打开） */
  showLineNumbers?: boolean;
  /**
   * 每行的 diff 种类（与 `code.split('\n')` 长度严格对齐）
   * @description 非空时启用 `wrapLines` + 按行 `lineProps`：added 浅绿底 + 左侧 `+` 字符，removed 浅红底 + 左侧 `-` 字符，context 仅占齐左 padding 不染色；空数组 / 未传 = 关闭整段染色路径（避免 wrapLines 无谓开销）
   */
  lineKinds?: ReadonlyArray<DiffLineKind>;
};

const lineNumberOverride = {
  color: 'var(--muted-foreground)',
  fontStyle: 'normal',
  fontWeight: 'normal',
};

// 行 wrapper 用 `display: block` 即可——bg 跨视口需要靠 `<code>` 自己变 inline-block + min-w-full（见 codeTagProps），
// 这样所有 block 子行共享"最宽行内容"的宽度，短行 bg 也会延伸到最宽内容右沿；
// `pl-5` 给左侧 `+`/`-` 字符留固定 1.25rem 列宽，context 行也吃同一缩进，避免字符列错位
const LINE_BASE_CLASS = 'block relative pl-5';
const LINE_KIND_CLASS: Record<DiffLineKind, string> = {
  context: LINE_BASE_CLASS,
  added: `${LINE_BASE_CLASS} bg-emerald-500/15 before:content-['+'] before:absolute before:left-1 before:text-emerald-600 dark:before:text-emerald-400`,
  removed: `${LINE_BASE_CLASS} bg-red-500/15 before:content-['-'] before:absolute before:left-1 before:text-red-600 dark:before:text-red-400`,
};

export const HighlightCode: FC<HighlightCodeProps> = props => {
  const { lang, code, showLineNumbers, lineKinds } = props;

  const theme = useThemeStore(state => state.theme);
  const baseStyle = theme === 'dark' ? oneDark : oneLight;
  const style = {
    ...baseStyle,
    linenumber: { ...baseStyle.linenumber, ...lineNumberOverride },
  };
  const shouldShowLineNumbers = showLineNumbers ?? code.split('\n').length > 10;

  const hasDiff = lineKinds !== undefined && lineKinds.length > 0;
  const wrapLines = hasDiff;
  const lineProps = hasDiff
    ? (lineNumber: number) => ({
        className: LINE_KIND_CLASS[lineKinds[lineNumber - 1] ?? 'context'],
      })
    : undefined;

  return (
    <SyntaxHighlighter
      language={lang}
      style={style}
      showLineNumbers={shouldShowLineNumbers}
      wrapLines={wrapLines}
      lineProps={lineProps}
      lineNumberStyle={{
        minWidth: '2.5em',
        paddingRight: '1em',
        textAlign: 'right',
        userSelect: 'none',
      }}
      customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
      codeTagProps={{
        // diff 模式下让 `<code>` 自己变 inline-block + min-w-full:
        // 普通模式 code 是 inline 元素，块级子行的"100% 宽度"只算到 pre 可视区域;
        // 改为 inline-block 后 code 宽 = max(最宽行内容, 容器宽)，所有 block 子行才会共享同一宽度，短行 bg 延伸到最宽行右沿
        style: hasDiff
          ? { background: 'transparent', display: 'inline-block', minWidth: '100%' }
          : { background: 'transparent' },
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

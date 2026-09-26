import type { CoreDependencyProvider, IRChild } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';
import type { IRCell } from '@retikz/standard/container';
import { ListProvider, MapProvider, RetikzStandardError, RetikzStandardErrorCode } from '@retikz/standard/container';
import type { InputChild, InputEmbedAdapter } from '@retikz/vanilla';

/** 单元格接受纯文本或根 Scene 的统一 authoring 输入；字符串保留到 Standard IR */
export type InputCell<TCell extends { content: string | IRChild } = IRCell> = Omit<TCell, 'content'> & {
  content: string | InputChild;
};

/** JSON 数据可交替嵌套两种结构，根入口装配依赖而不使 provider 相互依赖 */
export const dataCellDependencies = {
  roots: [ListProvider.key, MapProvider.key],
  providers: [ListProvider, MapProvider, PathClipProvider],
};

/** 归一化每格的唯一 child，并保留其依赖与 authoring sites */
export const normalizeCells = <TCell extends { content: string | InputChild }>(
  cells: Array<TCell>,
  context: Parameters<InputEmbedAdapter<unknown>['lower']>[1],
  provider: CoreDependencyProvider,
) => {
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined)
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'List / Map requires Kernel Vanilla normalizeScene.',
      details: { operation: 'normalizeCells' },
    });
  const normalized = cells.map(cell =>
    typeof cell.content === 'string' ? undefined : normalizeChildren([cell.content]),
  );
  const output: Array<Omit<TCell, 'content'> & { content: string | IRChild }> = cells.map((cell, index) => {
    if (typeof cell.content === 'string') return { ...cell, content: cell.content };
    const children = normalized[index]!.children;
    if (children.length !== 1)
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.AuthoringInvalid,
        message: 'Each cell must contain exactly one drawable child.',
        details: { cell: index, childCount: children.length },
      });
    return { ...cell, content: children[0] };
  });
  return {
    cells: output,
    providerDependencies: {
      roots: [provider.key, ...normalized.flatMap(child => child?.providerDependencies.roots ?? [])],
      providers: [
        provider,
        PathClipProvider,
        ...normalized.flatMap(child => child?.providerDependencies.providers ?? []),
      ],
    },
    authoringSites: normalized.flatMap(child => child?.authoringSites ?? []),
  };
};

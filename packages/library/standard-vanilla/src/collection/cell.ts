import type { CoreDependencyProvider, IRChild } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';
import type { IRCell } from '@retikz/standard/collection';
import { ArrayProvider, MapProvider, RetikzStandardError, RetikzStandardErrorCode } from '@retikz/standard/collection';
import type { InputChild, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

/**
 * 单元格接受纯文本或根 Scene 的统一 authoring 输入；字符串保留到 Standard IR
 * @template TCell 原始单元格类型，除 content 外的字段保持不变；默认使用 IRCell
 */
export type InputCell<
  TCell extends {
    /** 单元格的文本或单个可归一化绘制子内容 */
    content?: string | IRChild;
  } = IRCell,
> = Omit<TCell, 'content'> & {
  /** 单元格的文本或单个可归一化绘制子内容 */
  content?: string | InputChild;
};

/** JSON 数据可交替嵌套两种结构，根入口装配依赖而不使 provider 相互依赖 */
export const dataCellDependencies = {
  roots: [ArrayProvider.key, MapProvider.key],
  providers: [ArrayProvider, MapProvider, PathClipProvider],
};

/**
 * 归一化每格的唯一 child，并保留其依赖与 authoring sites
 * @template TCell 待归一化的单元格类型，除 content 外的字段保留到结果中
 */
export const normalizeCells = <TCell extends { content?: string | InputChild }>(
  cells: Array<TCell>,
  context: Parameters<SynchronousInputEmbedAdapter<unknown>['lower']>[1],
  provider: CoreDependencyProvider,
) => {
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined)
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Collection cells require Kernel Vanilla normalizeScene.',
      details: { operation: 'normalizeCells' },
    });

  const normalized = cells.map(cell =>
    cell.content === undefined || typeof cell.content === 'string' ? undefined : normalizeChildren([cell.content]),
  );
  const output: Array<Omit<TCell, 'content'> & { content?: string | IRChild }> = cells.map((cell, index) => {
    if (cell.content === undefined) {
      const { content, ...empty } = cell;
      void content;
      return empty;
    }

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

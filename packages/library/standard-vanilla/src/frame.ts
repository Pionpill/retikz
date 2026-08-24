import type {
  FrameDescriptionInput,
  FrameInput,
  FrameTitleInput,
  IRFrameDescription,
  IRFrameTitle,
} from '@retikz/standard';
import type { InputChild, InputEmbed, InputEmbedAdapter, InputEmbedContribution, InputNode } from '@retikz/vanilla';

import {
  createFrame,
  FrameDescriptionSchema,
  FrameProvider,
  FrameTitleSchema,
  RetikzStandardError,
  RetikzStandardErrorCode,
} from '@retikz/standard';

import { StandardFrameEmbedKind } from './constants';

/** React Frame marker 在 Vanilla 中延后归一化的 Node-like header 输入 */
export type InputFrameHeaders = Readonly<{
  /** React FrameTitle 组装的 Node authoring 输入 */
  title?: InputNode;
  /** React FrameDescription 组装的 Node authoring 输入 */
  description?: InputNode;
}>;

/** Vanilla Frame 输入可显式指定持久化 Scope id */
export type InputFrame = Omit<FrameInput, 'id' | 'children'> & {
  /** 要持久化到 Frame IR 的显式身份 */
  id?: string;
  /** 在根 Scene traversal 中归一化的 Frame body children */
  children: ReadonlyArray<InputChild>;
  /** React marker 提供、等待同次 traversal 归一化的 header 输入 */
  headers?: InputFrameHeaders;
};

/** 判断 Frame body child 是否为直接 Core Node */
type FrameNode = Extract<InputEmbedContribution['node'], { type: 'node' }>;

const isFrameNode = (child: InputChild): child is FrameNode => child.type === 'node' && !('namespace' in child);

/** 将已归一化的 Node 转换为 Frame header input */
const headerInputOf = (child: FrameNode): FrameTitleInput | FrameDescriptionInput => {
  const { type: _type, position: _position, ...header } = child;
  void _type;
  void _position;
  return header as FrameTitleInput | FrameDescriptionInput;
};

/** 创建 JSON-safe 的 Frame 主标题输入 */
export const frameTitle = (input: FrameTitleInput): IRFrameTitle => FrameTitleSchema.parse(input);

/** 创建 JSON-safe 的 Frame 辅助说明输入 */
export const frameDescription = (input: FrameDescriptionInput): IRFrameDescription =>
  FrameDescriptionSchema.parse(input);

/** Standard Frame 的 InputEmbed adapter */
export const FrameInputEmbedAdapter: InputEmbedAdapter<InputFrame> = {
  kind: StandardFrameEmbedKind,
  lower: (props, context) => {
    const { children, headers, id, ...input } = props;
    const normalizeChildren = context.normalizeChildren;
    if (normalizeChildren === undefined) {
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.AuthoringInvalid,
        message: 'Standard Frame inputs require Kernel Vanilla normalizeScene.',
        details: { operation: 'FrameInputEmbedAdapter' },
      });
    }
    const normalizedChildren = normalizeChildren(children);
    if (!normalizedChildren.children.every(isFrameNode)) {
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.AuthoringInvalid,
        message: 'Standard Frame only accepts direct Node children.',
        details: { childCount: normalizedChildren.children.length },
      });
    }
    const frameChildren = normalizedChildren.children.filter(isFrameNode);
    const title =
      headers?.title === undefined
        ? input.title
        : (() => {
            const normalized = normalizeChildren([headers.title]);
            if (normalized.children.length !== 1 || !isFrameNode(normalized.children[0])) {
              throw new RetikzStandardError({
                code: RetikzStandardErrorCode.AuthoringInvalid,
                message: 'Standard Frame title must normalize to exactly one Core Node.',
                details: { childCount: normalized.children.length, header: 'title' },
              });
            }
            return headerInputOf(normalized.children[0]);
          })();
    const description =
      headers?.description === undefined
        ? input.description
        : (() => {
            const normalized = normalizeChildren([headers.description]);
            if (normalized.children.length !== 1 || !isFrameNode(normalized.children[0])) {
              throw new RetikzStandardError({
                code: RetikzStandardErrorCode.AuthoringInvalid,
                message: 'Standard Frame description must normalize to exactly one Core Node.',
                details: { childCount: normalized.children.length, header: 'description' },
              });
            }
            return headerInputOf(normalized.children[0]);
          })();
    return {
      node: createFrame({
        ...input,
        ...(id === undefined ? {} : { id }),
        children: frameChildren,
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
      }),
      providerDependencies: {
        roots: [FrameProvider.key, ...normalizedChildren.providerDependencies.roots],
        providers: [FrameProvider, ...normalizedChildren.providerDependencies.providers],
      },
      ...(normalizedChildren.authoringSites.length === 0 ? {} : { authoringSites: normalizedChildren.authoringSites }),
    };
  },
};

/** 创建由 FrameInputEmbedAdapter 下沉的 Standard Frame embed */
export const frame = (id: string, input: InputFrame): InputEmbed<InputFrame> => ({
  type: 'embed',
  kind: StandardFrameEmbedKind,
  id,
  props: input,
});

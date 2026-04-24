import { Draw, Node, PathNode, Scope, TikZ } from '@retikz/core';
import type { MDXComponents } from 'mdx/types';
import type { PropsWithChildren } from 'react';
import type { MdxProps } from './MdxCode';
import MdxCode from './MdxCode';
import type { MdxAlertProps } from './MdxAlert';
import MdxAlert from './MdxAlert';
import type { CodeSpaceProps } from './CodeSpace';
import CodeSpace from './CodeSpace';
import type { MdxTableProps } from './MdxTable';
import MdxTable from './MdxTable';

TikZ.displayName = 'TikZ';
Draw.displayName = 'Draw';
Node.displayName = 'Node';
PathNode.displayName = 'PathNode';
Scope.displayName = 'Scope';

export const MDX_ID_PREFIX = 'mdx:';
const getTocAnchor = (name: unknown) => MDX_ID_PREFIX + String(name).replace(/[\s`]+/g, '');

const mdxComponents = {
  TikZ,
  Draw,
  Node,
  PathNode,
  Scope,
  h1: (props: PropsWithChildren) => (
    <h1 className="text-3xl font-bold mb-6" id={getTocAnchor(props.children)} {...props} />
  ),
  h2: (props: PropsWithChildren) => (
    <h2 className="text-2xl font-bold mt-12 mb-5" id={getTocAnchor(props.children)} {...props} />
  ),
  h3: (props: PropsWithChildren) => (
    <h3 className="text-xl font-bold mt-7 mb-4" id={getTocAnchor(props.children)} {...props} />
  ),
  h4: (props: PropsWithChildren) => (
    <h3 id={getTocAnchor(props.children)} className="text-lg font-bold mt-4 mb-4" {...props} />
  ),
  p: (props: PropsWithChildren) => <p className="mt-4" {...props} />,
  a: (props: PropsWithChildren<{ href?: string }>) => (
    <a
      className="text-blue-400 hover:text-blue-500 transition-all"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props: PropsWithChildren) => (
    <blockquote className="w-full py-3 pl-6 border-l-2 mt-4 opacity-80" {...props} />
  ),
  code: (props: MdxProps) => <MdxCode {...props} />,
  ul: (props: PropsWithChildren) => <ul className="my-4 pl-10 list-disc" {...props} />,
  li: (props: PropsWithChildren) => <li className="relative" {...props} />,
  Alert: (props: MdxAlertProps) => <MdxAlert {...props} />,
  CodeSpace: (props: CodeSpaceProps) => <CodeSpace {...props} />,
  Table: (props: MdxTableProps) => <MdxTable {...props} />,
} as MDXComponents;

export default mdxComponents;

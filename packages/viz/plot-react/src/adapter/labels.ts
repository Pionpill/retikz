import type { IRPlotLabel } from '@retikz/plot';
import type { TextProps } from '@retikz/react';
import type { ReactElement, ReactNode } from 'react';

import { Fragment, isValidElement } from 'react';

import type { CaptionLabelProps, TitleLabelProps } from '../components';
import type { PlotAuthoringDeclaration, PlotLabelTextBlock } from './contracts';

const CORE_TEXT_DISPLAY_NAME = '@retikz/Text';

type TextPlotLabel = Extract<IRPlotLabel, { type: 'text' }>;
type PlotLabelLine = Extract<PlotLabelTextBlock, Array<unknown>>[number];
type StyledPlotLabelLine = Extract<PlotLabelLine, { text: string }>;

const displayNameOf = (element: ReactElement): string | undefined => {
  const type = element.type as { displayName?: string } | string;
  if (typeof type === 'string') return type;
  return type.displayName;
};

const isEscapedAt = (text: string, index: number): boolean => {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i -= 1) slashCount += 1;
  return slashCount % 2 === 1;
};

const splitLabelChildTextLines = (text: string): Array<string> => {
  const lines: Array<string> = [];
  let start = 0;
  let inDisplayTex = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '$' && text[i + 1] === '$' && !isEscapedAt(text, i)) {
      inDisplayTex = !inDisplayTex;
      i += 1;
      continue;
    }
    if (text[i] === '\n' && !inDisplayTex) {
      lines.push(text.slice(start, i));
      start = i + 1;
    }
  }
  lines.push(text.slice(start));
  return lines;
};

const textElementToLabelLine = (element: ReactElement): PlotLabelLine | undefined => {
  const props = element.props as TextProps;
  const textChild = Array.isArray(props.children) && props.children.length === 1 ? props.children[0] : props.children;
  if (typeof textChild !== 'string' && typeof textChild !== 'number') return undefined;
  const text = String(textChild);
  if (props.fill === undefined && props.opacity === undefined && props.font === undefined) return text;
  const line: StyledPlotLabelLine = { text };
  if (props.fill !== undefined) line.fill = props.fill;
  if (props.opacity !== undefined) line.opacity = props.opacity;
  if (props.font !== undefined) line.font = props.font;
  return line;
};

const collectLabelChildLines = (children: ReactNode): Array<PlotLabelLine> => {
  const out: Array<PlotLabelLine> = [];
  let buffer = '';
  let bufferActive = false;
  const flush = (): void => {
    if (bufferActive && buffer.trim().length > 0) out.push(buffer);
    buffer = '';
    bufferActive = false;
  };
  const append = (chunk: string): void => {
    buffer += chunk;
    bufferActive = true;
  };
  const visit = (node: ReactNode): void => {
    if (typeof node === 'string') {
      if (node.trim().length === 0) return;
      const parts = splitLabelChildTextLines(node);
      append(parts[0] ?? '');
      for (let i = 1; i < parts.length; i += 1) {
        flush();
        append(parts[i] ?? '');
      }
      return;
    }
    if (typeof node === 'number') {
      append(String(node));
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (isValidElement(node)) {
      if (node.type === Fragment) {
        visit((node.props as { children?: ReactNode }).children);
        return;
      }
      if (displayNameOf(node) === CORE_TEXT_DISPLAY_NAME) {
        const line = textElementToLabelLine(node);
        if (line !== undefined) {
          flush();
          out.push(line);
        }
        return;
      }
    }
  };
  visit(children);
  flush();
  return out;
};

/** 把 React label children 归一化为 JSON-safe 文本块 */
export const labelTextBlockFromChildren = (children: ReactNode): PlotLabelTextBlock | undefined => {
  const lines = collectLabelChildLines(children);
  if (lines.length === 0) return undefined;
  if (lines.length === 1 && typeof lines[0] === 'string') return lines[0];
  return lines;
};

/** 从根级标签 props 构造规范文本标签并校验文本来源唯一性 */
export const plotTextLabelOf = (
  props: TitleLabelProps | CaptionLabelProps,
  role: NonNullable<TextPlotLabel['role']>,
  displayName: string,
): TextPlotLabel => {
  const { children, text, ...style } = props;
  const childText = labelTextBlockFromChildren(children);
  if (text !== undefined && childText !== undefined) {
    throw new Error(`buildPlotSpec: <${displayName}> cannot use both text and children`);
  }
  const content = text ?? childText;
  if (content === undefined) {
    throw new Error(`buildPlotSpec: <${displayName}> requires text or children`);
  }
  return {
    type: 'text',
    role,
    text: content,
    ...style,
  };
};

/** 从 JSON-safe declaration 恢复 Plot-root label，并保留原有冲突诊断 */
export const plotTextLabelFromDeclaration = (
  declaration: PlotAuthoringDeclaration,
  role: NonNullable<TextPlotLabel['role']>,
  displayName: string,
): TextPlotLabel => {
  const props = declaration.props as Omit<TitleLabelProps | CaptionLabelProps, 'children'>;
  if (declaration.labelChildText === undefined) return plotTextLabelOf(props, role, displayName);
  if (props.text !== undefined) {
    throw new Error(`buildPlotSpec: <${displayName}> cannot use both text and children`);
  }
  const { text: _text, ...style } = props;
  void _text;
  return {
    type: 'text',
    role,
    text: declaration.labelChildText,
    ...style,
  };
};

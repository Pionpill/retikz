import type { IR, PathKindDefinition } from '@retikz/core';
import type { FC, ReactElement, ReactNode } from 'react';

import { convertReactNodeToIR, Layout, Scope } from '@retikz/react';
import { createElement, isValidElement } from 'react';

const COMPONENT_EXPANSION_LIMIT = 16;

type PreviewRootProps = {
  children?: ReactNode;
  ir?: IR;
  viewBox?: IR['viewBox'];
};

type FunctionComponentProps = Record<string, unknown> & {
  children?: ReactNode;
};

const resolvePreviewRootElement = (
  node: ReactNode,
  depth = COMPONENT_EXPANSION_LIMIT,
): ReactElement<PreviewRootProps> | null => {
  if (!isValidElement(node)) return null;
  const element = node as ReactElement<FunctionComponentProps>;
  if (element.type === Layout || typeof element.type !== 'function' || depth <= 0) {
    return element as ReactElement<PreviewRootProps>;
  }
  const component = element.type as (props: FunctionComponentProps) => ReactNode;
  return resolvePreviewRootElement(component(element.props), depth - 1);
};

const LAYOUT_OWN_PROPS = new Set([
  'children',
  'ir',
  'width',
  'height',
  'viewBox',
  'className',
  'style',
  'nodeDistance',
  'shapes',
  'arrows',
  'patterns',
  'pathGenerators',
  'pathKinds',
  'ribbonWidthProfiles',
  'animate',
  'animations',
  'easings',
  'animationProperties',
]);

/** ComponentPreview 派生出的 IR 渲染信息。 */
export type PreviewIR = {
  ir: IR;
  width?: number | string;
  height?: number | string;
  pathKinds?: ReadonlyArray<PathKindDefinition>;
};

/** 从 React demo 派生 preview IR。 */
export const buildPreviewIR = (Component: FC): PreviewIR => {
  const rootElement = resolvePreviewRootElement(Component({}));
  const props = (rootElement?.props ?? {}) as PreviewRootProps & Record<string, unknown>;
  let childNode = props.children;
  if (props.ir === undefined) {
    const styleProps = Object.fromEntries(
      Object.entries(props).filter(([key, value]) => !LAYOUT_OWN_PROPS.has(key) && value !== undefined),
    );
    if (Object.keys(styleProps).length > 0) {
      childNode = createElement(Scope, styleProps, props.children);
    }
  }
  const base = props.ir ?? convertReactNodeToIR(childNode);
  const isLayout = rootElement?.type === Layout;
  const viewBox = isLayout ? rootElement.props.viewBox : undefined;
  const rootAnimations = isLayout ? (props.animations as IR['animations'] | undefined) : undefined;
  let ir = base;
  if (viewBox !== undefined) ir = { ...ir, viewBox };
  if (rootAnimations !== undefined) ir = { ...ir, animations: rootAnimations };
  const width = isLayout ? (props.width as number | string | undefined) : undefined;
  const height = isLayout ? (props.height as number | string | undefined) : undefined;
  const pathKinds = isLayout ? (props.pathKinds as ReadonlyArray<PathKindDefinition> | undefined) : undefined;
  return { ir, width, height, pathKinds };
};

const nodeHasComposite = (node: unknown): boolean => {
  if (typeof node !== 'object' || node === null) return false;
  if ('namespace' in node) return true;
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) && children.some(nodeHasComposite);
};

/** 判断 IR 是否包含 composite 节点。 */
export const irHasComposite = (ir: IR): boolean => ir.children.some(nodeHasComposite);

const nodeHasAnimations = (node: unknown): boolean => {
  if (typeof node !== 'object' || node === null) return false;
  const record = node as { animations?: unknown; children?: unknown };
  if (Array.isArray(record.animations) && record.animations.length > 0) return true;
  return Array.isArray(record.children) && record.children.some(nodeHasAnimations);
};

/** 判断 IR 是否包含动画。 */
export const irHasAnimations = (ir: IR): boolean =>
  (Array.isArray(ir.animations) && ir.animations.length > 0) || ir.children.some(nodeHasAnimations);

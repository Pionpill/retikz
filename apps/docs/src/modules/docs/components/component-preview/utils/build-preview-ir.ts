import type { AnyPathKindDefinition, CoreProviderContribution, IRScene } from '@retikz/core';
import { createInputScene, isEmbeddableMarked, Layout, wrapRootScope } from '@retikz/react';
import type { LayoutProps } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import type { FC, ReactElement, ReactNode } from 'react';
import { createElement, isValidElement } from 'react';

import type { Lang } from '@/i18n';

import type { ComponentPreviewDemoComponent } from '../types';
import { buildPreviewSourceIR, collectPreviewChartSources } from './build-preview-source-ir';
import { previewEmbedPropsOf, previewHostDimensionsOf } from './preview-embed';

const COMPONENT_EXPANSION_LIMIT = 16;

type PreviewRootProps = {
  rootScope?: LayoutProps['rootScope'];
  children?: ReactNode;
  ir?: IRScene;
  viewBox?: IRScene['viewBox'];
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
  if (element.type === Layout || isEmbeddableMarked(element.type) || typeof element.type !== 'function' || depth <= 0) {
    return element as ReactElement<PreviewRootProps>;
  }
  const component = element.type as (props: FunctionComponentProps) => ReactNode;
  return resolvePreviewRootElement(component(element.props), depth - 1);
};

/** ComponentPreview 派生出的 IR 渲染信息。 */
export type PreviewIR = {
  /** 供 renderer 与动画检测使用的 runtime canonical IR */
  ir: IRScene;
  /** 供 IR / Vanilla 源码展示使用的高层 Source IR */
  sourceIr: IRScene;
  contributions: Array<CoreProviderContribution>;
  width?: number | string;
  height?: number | string;
  pathKinds?: ReadonlyArray<AnyPathKindDefinition>;
};

/** 从 React demo 派生 preview IR。 */
export const buildPreviewIR = (Component: ComponentPreviewDemoComponent, lang: Lang = 'zh'): PreviewIR => {
  const rootElement = resolvePreviewRootElement(Component({ lang }));
  const props = (rootElement?.props ?? {}) as PreviewRootProps & Record<string, unknown>;
  const isEmbeddableRoot = isEmbeddableMarked(rootElement?.type);
  const EmbeddableRoot = rootElement?.type as FC<Record<string, unknown>> | undefined;
  let childNode =
    isEmbeddableRoot && EmbeddableRoot !== undefined
      ? createElement(EmbeddableRoot, previewEmbedPropsOf(EmbeddableRoot, props))
      : props.children;
  if (rootElement?.type === Layout && props.ir === undefined) {
    childNode = wrapRootScope(props.children, props.rootScope ?? {});
  }
  const normalized =
    props.ir === undefined
      ? (() => {
          const input = createInputScene(childNode);
          const runtime = normalizeScene(input.scene, { adapters: input.adapters });
          return {
            ...runtime,
            sourceIr: buildPreviewSourceIR(input.scene, runtime.ir, collectPreviewChartSources(childNode)),
          };
        })()
      : {
          ir: props.ir,
          sourceIr: props.ir,
          contributions: [] as Array<CoreProviderContribution>,
        };
  const isLayout = rootElement?.type === Layout;
  const viewBox = isLayout ? rootElement.props.viewBox : undefined;
  const rootAnimations = isLayout ? (props.animations as IRScene['animations'] | undefined) : undefined;
  let ir = normalized.ir;
  let sourceIr = normalized.sourceIr;
  if (viewBox !== undefined) {
    ir = { ...ir, viewBox };
    sourceIr = { ...sourceIr, viewBox };
  }
  if (rootAnimations !== undefined) {
    ir = { ...ir, animations: rootAnimations };
    sourceIr = { ...sourceIr, animations: rootAnimations };
  }
  const hostDimensions =
    rootElement !== null && (isLayout || isEmbeddableRoot) ? previewHostDimensionsOf(rootElement.type, props) : {};
  const pathKinds = isLayout ? (props.pathKinds as ReadonlyArray<AnyPathKindDefinition> | undefined) : undefined;
  return {
    ir,
    sourceIr,
    contributions: [...normalized.contributions],
    ...hostDimensions,
    pathKinds,
  };
};

const nodeHasComposite = (node: unknown): boolean => {
  if (typeof node !== 'object' || node === null) return false;
  if ('namespace' in node) return true;
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) && children.some(nodeHasComposite);
};

/** 判断 IR 是否包含 composite 节点。 */
export const irHasComposite = (ir: IRScene): boolean => ir.children.some(nodeHasComposite);

const nodeHasAnimations = (node: unknown): boolean => {
  if (typeof node !== 'object' || node === null) return false;
  const record = node as { animations?: unknown; children?: unknown };
  if (Array.isArray(record.animations) && record.animations.length > 0) return true;
  return Array.isArray(record.children) && record.children.some(nodeHasAnimations);
};

/** 判断 IR 是否包含动画。 */
export const irHasAnimations = (ir: IRScene): boolean =>
  (Array.isArray(ir.animations) && ir.animations.length > 0) || ir.children.some(nodeHasAnimations);

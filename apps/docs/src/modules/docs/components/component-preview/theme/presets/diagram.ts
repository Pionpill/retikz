import type { FlowDiagramDefinitionOptions, FlowThemeStyleDefinition } from '@retikz/diagram/flow';

import { defineFlowThemeStyle } from '@retikz/diagram/flow';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

type DiagramThemeStyleDefinition = NonNullable<FlowDiagramDefinitionOptions['diagramThemeStyles']>[number];

const diagramThemeOf = (style: ReferenceStyle): ReturnType<DiagramThemeStyleDefinition['resolve']> => {
  if (style === PreviewThemeStyle.Academic) return { frame: { padding: 16, cornerRadius: 0 } };
  if (style === PreviewThemeStyle.Vibrant) return { frame: { padding: 18, cornerRadius: 12 } };
  return { frame: { padding: 16, cornerRadius: 8 } };
};

/** docs 维护的三个 Diagram Framework reference Theme definitions */
export const PreviewDiagramThemeStyles: ReadonlyArray<DiagramThemeStyleDefinition> = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => ({ name: style, resolve: () => diagramThemeOf(style) }));

/** docs 维护的三个 Flow reference Theme definitions */
export const PreviewFlowThemeStyles: ReadonlyArray<FlowThemeStyleDefinition> = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineFlowThemeStyle({ name: style, resolve: () => ({}) }));

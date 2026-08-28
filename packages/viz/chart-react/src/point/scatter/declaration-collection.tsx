import type { IRTextBlock } from '@retikz/core';
import type { ReactNode } from 'react';

import type { ChartDeclarationPath, CollectedChartDeclaration, CollectedChartDeclarations } from '../../shared';
import type { ScatterEncodingsProps } from './ScatterEncodings';
import type { ScatterChartMark, ScatterMarkProps } from './ScatterMark';
import type { ScatterPropertiesProps } from './ScatterProperties';

import { RetikzChartReactError } from '../../error';
import { collectChartDeclarations, splitPresentationMarkers } from '../../shared';
import { ScatterEncodings } from './ScatterEncodings';
import { ScatterMark } from './ScatterMark';
import { ScatterProperties } from './ScatterProperties';

/** ScatterChart direct-child declarations 的完整收集结果 */
export type CollectedScatterChartDeclarations = CollectedChartDeclarations &
  Readonly<{
    encodings: CollectedChartDeclaration<ScatterEncodingsProps>;
    properties?: CollectedChartDeclaration<ScatterPropertiesProps>;
    marks: Array<ScatterChartMark>;
    presentation: Partial<Record<'title' | 'subtitle' | 'note' | 'source', IRTextBlock>>;
  }>;

const duplicateDeclarationError = (name: string, path: ChartDeclarationPath): RetikzChartReactError =>
  new RetikzChartReactError(`chart react: ${name} may appear at most once at ${JSON.stringify(path)}`);

/** 收集 ScatterChart 的公共与具体类型 direct-child declarations */
export const collectScatterChartDeclarations = (children: ReactNode): CollectedScatterChartDeclarations => {
  const presentationSplit = splitPresentationMarkers(children);
  let encodings: CollectedChartDeclaration<ScatterEncodingsProps> | undefined;
  let properties: CollectedChartDeclaration<ScatterPropertiesProps> | undefined;
  const marks: Array<ScatterChartMark> = [];
  const common = collectChartDeclarations(presentationSplit.chartChildren, (element, path) => {
    if (element.type === ScatterEncodings) {
      if (encodings !== undefined) throw duplicateDeclarationError('ScatterEncodings', path);
      encodings = { props: element.props as ScatterEncodingsProps, path };
      return true;
    }
    if (element.type === ScatterProperties) {
      if (properties !== undefined) throw duplicateDeclarationError('ScatterProperties', path);
      properties = { props: element.props as ScatterPropertiesProps, path };
      return true;
    }
    if (element.type === ScatterMark) {
      marks.push({ ...(element.props as ScatterMarkProps), kind: 'scatter' });
      return true;
    }
    return false;
  });
  if (encodings === undefined) {
    throw new RetikzChartReactError('chart react: ScatterEncodings must appear exactly once');
  }
  return {
    ...common,
    encodings,
    ...(properties === undefined ? {} : { properties }),
    marks,
    presentation: presentationSplit.presentation,
  };
};

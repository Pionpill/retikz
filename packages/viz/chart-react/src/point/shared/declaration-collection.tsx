import type { IRTextBlock } from '@retikz/core';
import type { FC, ReactNode } from 'react';

import type { ChartDeclarationPath, CollectedChartDeclaration, CollectedChartDeclarations } from '../../shared';

import { RetikzChartReactError } from '../../error';
import { collectChartDeclarations, splitPresentationMarkers } from '../../shared';

/** 具体 Point chartType direct-child declarations 的共享收集结果 */
export type CollectedPointChartDeclarations<TEncodings, TProperties, TMark> = CollectedChartDeclarations &
  Readonly<{
    encodings?: CollectedChartDeclaration<TEncodings>;
    properties?: CollectedChartDeclaration<TProperties>;
    marks?: Array<TMark>;
    presentation: Partial<Record<'title' | 'subtitle' | 'note' | 'source', IRTextBlock>>;
  }>;

type PointDeclarationCollectionOptions<TEncodings, TProperties, TMarkProps, TMark> = Readonly<{
  encodingsComponent: FC<TEncodings>;
  encodingsName: string;
  propertiesComponent: FC<TProperties>;
  propertiesName: string;
  markComponent: FC<TMarkProps>;
  createMark: (props: TMarkProps) => TMark;
}>;

const duplicateDeclarationError = (name: string, path: ChartDeclarationPath): RetikzChartReactError =>
  new RetikzChartReactError(`chart react: ${name} may appear at most once at ${JSON.stringify(path)}`);

/** 收集具体 Point chartType 的公共与私有 direct-child declarations */
export const collectPointChartDeclarations = <TEncodings, TProperties, TMarkProps, TMark>(
  children: ReactNode,
  options: PointDeclarationCollectionOptions<TEncodings, TProperties, TMarkProps, TMark>,
): CollectedPointChartDeclarations<TEncodings, TProperties, TMark> => {
  const presentationSplit = splitPresentationMarkers(children);
  let encodings: CollectedChartDeclaration<TEncodings> | undefined;
  let properties: CollectedChartDeclaration<TProperties> | undefined;
  const marks: Array<TMark> = [];
  const common = collectChartDeclarations(presentationSplit.chartChildren, (element, path) => {
    if (element.type === options.encodingsComponent) {
      if (encodings !== undefined) throw duplicateDeclarationError(options.encodingsName, path);
      encodings = { props: element.props as TEncodings, path };
      return true;
    }
    if (element.type === options.propertiesComponent) {
      if (properties !== undefined) throw duplicateDeclarationError(options.propertiesName, path);
      properties = { props: element.props as TProperties, path };
      return true;
    }
    if (element.type === options.markComponent) {
      marks.push(options.createMark(element.props as TMarkProps));
      return true;
    }
    return false;
  });
  return {
    ...common,
    ...(encodings === undefined ? {} : { encodings }),
    ...(properties === undefined ? {} : { properties }),
    ...(marks.length === 0 ? {} : { marks }),
    presentation: presentationSplit.presentation,
  };
};

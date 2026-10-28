import { defineComposite } from '@retikz/core';
import type { CoreDependencyProvider } from '@retikz/core';

import type { ShapeProperties } from '../shared';
import { lowerEllipse } from './pipeline';
import { EllipseSchema } from './schema';
import type { IREllipse } from './types';

/** Ellipse 的 Core composite 注册项 */
export const ellipseDefinition = defineComposite({
  namespace: 'standard',
  type: 'ellipse',
  schema: EllipseSchema,
  compile: (source: IREllipse) => ({ children: [lowerEllipse(source)] }),
});

/** 创建保留几何意图的 Ellipse Source */
export const createEllipse = (input: ShapeProperties<IREllipse>): IREllipse => ({
  ...input,
  namespace: 'standard',
  type: 'ellipse',
});

/** Ellipse 的按需依赖贡献 */
export const ellipseProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'ellipse' }),
  makeDefinition: () => ellipseDefinition,
});

import { createOpenStringSchema } from '@retikz/foundation';

import { DataTransform, ReducerOperationKind, SelectorOperationKind } from './constants';

/** Data transform operation kind：保留内置提示并允许注册自定义 Definition key */
export const DataTransformKindSchema = createOpenStringSchema(DataTransform).describe(
  'Built-in transform kind or a custom registered transform kind',
);

/** Statistics reducer operation kind：保留内置提示并允许注册自定义 Definition key */
export const ReducerOperationKindSchema = createOpenStringSchema(ReducerOperationKind).describe(
  'Built-in reducer kind or a custom registered reducer kind',
);

/** Row selector operation kind：保留内置提示并允许注册自定义 Definition key */
export const SelectorOperationKindSchema = createOpenStringSchema(SelectorOperationKind).describe(
  'Built-in selector kind or a custom registered selector kind',
);

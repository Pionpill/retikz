import type { IRTransform } from '@retikz/core';
import type { z } from 'zod';

import { expectTypeOf, it } from 'vitest';

import type {
  DataFieldTypeMap,
  DataFieldTypeValue,
  DataSourceIdentityModeValue,
  ExternalDatasets,
  ExternalRow,
  FieldFormatValue,
  IRDataAnnotateSelector,
  IRDataAnnotateTransform,
  IRDataBuiltinTransform,
  IRDataFieldDefinition,
  IRDataModel,
  IRDataOrderBy,
  IRDataOutsideQuantileBandSelectorOperation,
  IRDataQuantileBandReducerOperation,
  IRDataReducerMetrics,
  IRDataReducerOperation,
  IRDataReference,
  IRDataScalarValue,
  IRDataSelectorOperation,
  IRDataSelectTransform,
  IRDataSortTransform,
  IRDataSummarizeTransform,
  IRDataTransform,
} from '../../src';
import type {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  BuiltinTransformSchema,
  DataModelSchema,
  DataReferenceSchema,
  FieldDefinitionSchema,
  OrderBySchema,
  OutsideQuantileBandSelectorOperationSchema,
  QuantileBandReducerOperationSchema,
  ReducerMetricsSchema,
  ReducerOperationSchema,
  ScalarValueSchema,
  SelectorOperationSchema,
  SelectTransformSchema,
  SortTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from '../../src';

it('exports owner-qualified data IR types from their schema truth', () => {
  expectTypeOf<IRDataFieldDefinition>().toEqualTypeOf<z.infer<typeof FieldDefinitionSchema>>();
  expectTypeOf<IRDataModel>().toEqualTypeOf<z.infer<typeof DataModelSchema>>();
  expectTypeOf<IRDataReference>().toEqualTypeOf<z.infer<typeof DataReferenceSchema>>();
  expectTypeOf<IRDataScalarValue>().toEqualTypeOf<z.infer<typeof ScalarValueSchema>>();
  expectTypeOf<IRDataSortTransform>().toEqualTypeOf<z.infer<typeof SortTransformSchema>>();
  expectTypeOf<IRDataReducerOperation>().toEqualTypeOf<z.infer<typeof ReducerOperationSchema>>();
  expectTypeOf<IRDataReducerMetrics>().toEqualTypeOf<z.infer<typeof ReducerMetricsSchema>>();
  expectTypeOf<IRDataQuantileBandReducerOperation>().toEqualTypeOf<
    z.infer<typeof QuantileBandReducerOperationSchema>
  >();
  expectTypeOf<IRDataSelectorOperation>().toEqualTypeOf<z.infer<typeof SelectorOperationSchema>>();
  expectTypeOf<IRDataOutsideQuantileBandSelectorOperation>().toEqualTypeOf<
    z.infer<typeof OutsideQuantileBandSelectorOperationSchema>
  >();
  expectTypeOf<IRDataOrderBy>().toEqualTypeOf<z.infer<typeof OrderBySchema>>();
  expectTypeOf<IRDataSummarizeTransform>().toEqualTypeOf<z.infer<typeof SummarizeTransformSchema>>();
  expectTypeOf<IRDataSelectTransform>().toEqualTypeOf<z.infer<typeof SelectTransformSchema>>();
  expectTypeOf<IRDataAnnotateSelector>().toEqualTypeOf<z.infer<typeof AnnotateSelectorSchema>>();
  expectTypeOf<IRDataAnnotateTransform>().toEqualTypeOf<z.infer<typeof AnnotateTransformSchema>>();
  expectTypeOf<IRDataBuiltinTransform>().toEqualTypeOf<z.infer<typeof BuiltinTransformSchema>>();
  expectTypeOf<IRDataTransform>().toEqualTypeOf<z.infer<typeof TransformSchema>>();
});

it('keeps core and data transform owners distinct without import aliases', () => {
  expectTypeOf<IRTransform>().not.toEqualTypeOf<IRDataTransform>();
});

it('keeps runtime-only and value vocabulary outside the IRData naming family', () => {
  expectTypeOf<ExternalRow>().toEqualTypeOf<Record<string, unknown>>();
  expectTypeOf<ExternalDatasets>().toEqualTypeOf<Record<string, Array<ExternalRow>>>();
  expectTypeOf<DataFieldTypeMap>().toEqualTypeOf<Map<string, DataFieldTypeValue>>();
  expectTypeOf<FieldFormatValue>().toEqualTypeOf<string>();
  expectTypeOf<DataSourceIdentityModeValue>().toEqualTypeOf<'summary' | 'full'>();
});

import { ScalarValueSchema } from '@retikz/data';
import { z } from 'zod';

import { TableCellSourceKind } from '../../shared';
import { TableCellAppearanceSchema } from '../appearance';
import { TableCellLocationSchema, TableCellPayloadKind, TableCellRoleSchema } from '../cell';
import { TableFormatterRefSchema } from '../formatter';
import { TablePresentationRefSchema } from '../presentation';
import { TableValueCompareOperator, TableValuePredicateKind } from './constants';

const uniqueArray = <T extends z.ZodType>(item: T, message: string) =>
  z
    .array(item)
    .min(1)
    .superRefine((values, context) => {
      const seen = new Set<unknown>();
      values.forEach((value, index) => {
        if (seen.has(value)) context.addIssue({ code: 'custom', path: [index], message });
        seen.add(value);
      });
    });

const ComparableScalarSchema = z.union([z.string(), z.number()]);

export const TableValueEqualPredicateSchema = z
  .strictObject({
    kind: z.literal(TableValuePredicateKind.Equal).describe('Discriminator for strict scalar equality.'),
    value: ScalarValueSchema.describe('JSON scalar compared without coercion.'),
  })
  .describe('Strict equality predicate over one JSON scalar.');

export const TableValueOneOfPredicateSchema = z
  .strictObject({
    kind: z.literal(TableValuePredicateKind.OneOf).describe('Discriminator for strict scalar membership.'),
    values: uniqueArray(ScalarValueSchema, 'duplicate scalar predicate value').describe(
      'Nonempty unique JSON scalars compared without coercion.',
    ),
  })
  .describe('Strict membership predicate over unique JSON scalars.');

export const TableValueComparePredicateSchema = z
  .strictObject({
    kind: z.literal(TableValuePredicateKind.Compare).describe('Discriminator for ordered scalar comparison.'),
    operator: z.enum(TableValueCompareOperator).describe('Relational comparison operator.'),
    value: ComparableScalarSchema.describe('String or number operand compared only with a raw value of the same type.'),
  })
  .describe('Same-type relational predicate over a raw string or number.');

export const TableValueBetweenPredicateSchema = z
  .strictObject({
    kind: z.literal(TableValuePredicateKind.Between).describe('Discriminator for an ordered inclusive range.'),
    min: ComparableScalarSchema.describe('Lower string or number bound.'),
    max: ComparableScalarSchema.describe('Upper string or number bound of the same type as min.'),
    includeMin: z.boolean().optional().describe('Whether the lower bound is inclusive. Omitted fields use true.'),
    includeMax: z.boolean().optional().describe('Whether the upper bound is inclusive. Omitted fields use true.'),
  })
  .superRefine((predicate, context) => {
    if (typeof predicate.min !== typeof predicate.max) {
      context.addIssue({ code: 'custom', path: ['max'], message: 'max must have the same scalar type as min' });
      return;
    }
    if (predicate.min > predicate.max) {
      context.addIssue({ code: 'custom', path: ['max'], message: 'max must be greater than or equal to min' });
    }
  })
  .describe('Same-type ordered range predicate over a raw string or number.');

export const TableValueNullPredicateSchema = z
  .strictObject({
    kind: z.literal(TableValuePredicateKind.Null).describe('Discriminator for null or non-null selection.'),
    isNull: z.boolean().optional().describe('Whether to select null. Omitted fields use true.'),
  })
  .describe('Predicate selecting null or every non-null JSON scalar.');

export const TableValuePredicateSchema = z
  .discriminatedUnion('kind', [
    TableValueEqualPredicateSchema,
    TableValueOneOfPredicateSchema,
    TableValueComparePredicateSchema,
    TableValueBetweenPredicateSchema,
    TableValueNullPredicateSchema,
  ])
  .describe('Closed predicate evaluated against a canonical raw Cell scalar.');

const selectorShape = {
  cellIds: uniqueArray(z.string().min(1), 'duplicate Cell id').optional().describe('Cell identity membership.'),
  rowIds: uniqueArray(z.string().min(1), 'duplicate row id').optional().describe('Origin row identity membership.'),
  columnIds: uniqueArray(z.string().min(1), 'duplicate column id')
    .optional()
    .describe('Origin column identity membership.'),
  rowIndices: uniqueArray(z.number().int().nonnegative(), 'duplicate row index')
    .optional()
    .describe('Origin row index membership.'),
  columnIndices: uniqueArray(z.number().int().nonnegative(), 'duplicate column index')
    .optional()
    .describe('Origin column index membership.'),
  locations: uniqueArray(TableCellLocationSchema, 'duplicate Cell location')
    .optional()
    .describe('Canonical Cell location membership.'),
  roles: z
    .strictObject({
      any: uniqueArray(TableCellRoleSchema, 'duplicate any-role')
        .optional()
        .describe('At least one listed role must be present.'),
      all: uniqueArray(TableCellRoleSchema, 'duplicate all-role')
        .optional()
        .describe('Every listed role must be present.'),
    })
    .refine(roles => roles.any !== undefined || roles.all !== undefined, {
      message: 'roles must declare any or all',
    })
    .describe('Any-role and all-role conditions over canonical Cell roles.')
    .optional(),
  sourceKinds: uniqueArray(z.enum(TableCellSourceKind), 'duplicate Cell source kind')
    .optional()
    .describe('Canonical Cell source discriminator membership.'),
  fields: uniqueArray(z.string().min(1), 'duplicate source field')
    .optional()
    .describe('Field-source name membership; generated sources never match.'),
  payloadKinds: uniqueArray(z.enum(TableCellPayloadKind), 'duplicate payload kind')
    .optional()
    .describe('Canonical value/content payload discriminator membership.'),
  value: TableValuePredicateSchema.optional().describe('Predicate over the canonical raw value payload.'),
  negate: z.boolean().optional().describe('Whether to negate the combined conditions inside their evaluation domain.'),
};

const SELECTOR_CONDITION_FIELDS = [
  'cellIds',
  'rowIds',
  'columnIds',
  'rowIndices',
  'columnIndices',
  'locations',
  'roles',
  'sourceKinds',
  'fields',
  'payloadKinds',
  'value',
] as const;

export const TableCellSelectorSchema = z
  .strictObject(selectorShape)
  .superRefine((selector, context) => {
    const hasCondition = SELECTOR_CONDITION_FIELDS.some(field => selector[field] !== undefined);
    if (!hasCondition) context.addIssue({ code: 'custom', message: 'selector must declare at least one condition' });
    if (
      selector.value !== undefined &&
      selector.payloadKinds !== undefined &&
      (selector.payloadKinds.length !== 1 || selector.payloadKinds[0] !== TableCellPayloadKind.Value)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['payloadKinds'],
        message: 'payloadKinds must be exactly ["value"] when a value predicate is present',
      });
    }
  })
  .describe('Flat JSON-safe selector over canonical Table Cell metadata and raw values.');

export const TableCellRuleSchema = z
  .strictObject({
    selector: TableCellSelectorSchema.describe('Canonical Table Cell selection conditions.'),
    formatter: TableFormatterRefSchema.optional().describe('Formatter override for matching value Cells.'),
    presentation: TablePresentationRefSchema.optional().describe('Presentation override for matching value Cells.'),
    appearance: TableCellAppearanceSchema.optional().describe('Appearance patch for matching Cells.'),
  })
  .refine(rule => rule.formatter !== undefined || rule.presentation !== undefined || rule.appearance !== undefined, {
    message: 'rule must declare formatter, presentation, or appearance',
  })
  .describe('Ordered formatter, presentation, and appearance override for matching Cells.');

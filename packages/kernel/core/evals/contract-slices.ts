import type { JsonValue } from '@retikz/foundation';
import { ZodObject } from 'zod';
import type { ZodType } from 'zod';

import { inspectSchemaEvalCoverage, gradeSchemaAnswer, isJsonObject } from '../../../../scripts/evals';
import type { SchemaEvalCase } from '../../../../scripts/evals';

/** 离线切片只从已验收的完整宿主题中取数据，路径约束语义位置，不在任意 JSON 中试配 schema */
type SliceRule = { owners: string; paths: string; schemas: string; pick?: boolean };
const rules: Array<SliceRule> = [
  {
    owners: 'node',
    paths: 'position',
    schemas: 'AnchorPosition AbsoluteTarget AtPosition BetweenPosition PolarPosition Vector2',
  },
  {
    owners: 'coordinate',
    paths: 'position position.between.* position.between.*.between.* position.of position.origin',
    schemas: 'AbsoluteTarget AtPosition BetweenPosition PolarPosition Vector2',
  },
  {
    owners: 'path',
    paths: 'children.*.to children.*.from children.*.center children.*.points.*',
    schemas: 'Target AbsoluteTarget AxisLineTarget',
  },
  { owners: 'scope', paths: 'position.target transforms.*.between.*', schemas: 'ScopePositionTarget AbsoluteTarget' },
  {
    owners: 'node coordinate path scope',
    paths:
      'position.selfAnchor position.target.anchor position.between.*.anchor transforms.*.pivot children.*.to.anchor',
    schemas: 'AnchorRef ScopeSelfPoint BoundaryAnchorRef',
  },
  { owners: 'node', paths: 'shape shape.type', schemas: 'ShapeValue ShapeName ShapeRef' },
  { owners: 'node', paths: 'layout.padding layout.margin', schemas: 'BoxSpacing BoxSpacingValue' },
  { owners: 'node', paths: 'layout.minimumSize', schemas: 'BoxSize' },
  { owners: 'node', paths: 'scale', schemas: 'AxisScale' },
  { owners: 'node', paths: 'label.position label.*.position', schemas: 'NodeLabelSidePosition' },
  { owners: 'node', paths: 'label.pin label.*.pin', schemas: 'NodeLabelPin' },
  { owners: 'node', paths: 'label label.*', schemas: 'NodeLabelConfig', pick: true },
  {
    owners: 'path',
    paths: 'children.*',
    schemas:
      'Step MoveStep LineStep AxisLineStep FoldStep CycleStep CurveStep CubicStep BendStep ArcStep CirclePathStep EllipsePathStep RectangleStep SmoothStep',
  },
  { owners: 'path', paths: 'children.*.bendAngle', schemas: 'BendAngle' },
  { owners: 'path', paths: 'children.*.outAngle', schemas: 'BendOutAngle' },
  { owners: 'path', paths: 'children.*.inAngle', schemas: 'BendInAngle' },
  { owners: 'path', paths: 'children.*.looseness', schemas: 'BendLooseness' },
  { owners: 'path', paths: 'children.*.tension', schemas: 'SmoothTension' },
  { owners: 'path', paths: 'arrow.start.shape arrow.end.shape', schemas: 'ArrowShape' },
  { owners: 'path', paths: 'label label.* children.*.label', schemas: 'PathLabel' },
  { owners: 'path', paths: 'marks.*', schemas: 'PathMarkPlacement' },
  { owners: 'scope', paths: 'defaults.path.label', schemas: 'PathLabelDefault' },
  { owners: 'path', paths: '$', schemas: 'PathStructure PathGeometry PathDecoration', pick: true },
  { owners: 'scope', paths: '$', schemas: 'ScopeProps', pick: true },
  { owners: 'scope scene', paths: 'children.* children.*.children.*', schemas: 'Child' },
  {
    owners: 'node path',
    paths: 'style',
    schemas: 'GraphicStroke GraphicStyle GraphicEffects GraphicPaint GraphicOpacity GraphicElementOpacity GraphicFill',
    pick: true,
  },
  { owners: 'node', paths: 'style', schemas: 'NodeStyle NodeStroke TextVisual', pick: true },
  { owners: 'path', paths: 'style', schemas: 'PathStyle PathStroke', pick: true },
  { owners: 'scope', paths: 'defaults.style', schemas: 'CascadingGraphicStyle' },
  { owners: 'node path', paths: 'style.shadow', schemas: 'DropShadow' },
  { owners: 'node path', paths: 'style.opacity', schemas: 'GraphicOpacityValue' },
  {
    owners: 'node path',
    paths: 'style.fill style.stroke',
    schemas: 'PaintValue Paint LinearGradientPaint ConicGradientPaint RadialGradientPaint PatternPaint',
  },
  { owners: 'node', paths: 'style.fill.shape style.stroke.shape', schemas: 'PatternShapeName' },
  { owners: 'node', paths: 'style.fill.stops.* style.stroke.stops.*', schemas: 'GradientStop' },
  { owners: 'node', paths: 'style.fill.lineStyleCycle style.stroke.lineStyleCycle', schemas: 'PatternLineStyleCycle' },
  {
    owners: 'node',
    paths: 'style.fill.lineStyleCycle.overrides.* style.stroke.lineStyleCycle.overrides.*',
    schemas: 'PatternLineStyleOverride',
  },
  {
    owners: 'node',
    paths:
      'style.fill.horizontalStyle style.fill.verticalStyle style.fill.lineStyleCycle.overrides.*.style style.stroke.horizontalStyle style.stroke.verticalStyle',
    schemas: 'PatternLineStyle',
  },
  {
    owners: 'node boundary-label',
    paths: 'font style.font label.font text.*.font text.*.segments.*.font',
    schemas: 'Font',
  },
  { owners: 'node', paths: 'style.font.weight label.font.weight text.*.font.weight', schemas: 'FontWeight' },
  { owners: 'node', paths: 'text.*', schemas: 'TextLine' },
  { owners: 'node', paths: 'text.*.segments.*', schemas: 'MathSegment TextSegment' },
  { owners: 'node scene drawable', paths: 'animations.*.keyframes.*', schemas: 'Keyframe' },
  { owners: 'boundary-label', paths: '$', schemas: 'LabelVisualStyle', pick: true },
];
type Source = { owner: string; id: string; value: JsonValue; rejectsChange: (path: string) => boolean };
/** 按声明的输入路径取实际题目事实；通配符只遍历数组 */
const select = (value: JsonValue, path: string) => {
  let items = [{ value, path: '$' }];
  if (path === '$') return items;
  for (const field of path.split('.')) {
    items = items.flatMap(item => {
      if (field === '*')
        return Array.isArray(item.value)
          ? item.value.map((element, index) => ({ value: element, path: item.path + '[' + index + ']' }))
          : [];
      return isJsonObject(item.value) && Object.hasOwn(item.value, field)
        ? [{ value: item.value[field], path: item.path + '.' + field }]
        : [];
    });
  }
  return items;
};
/** 命名片段使用原题号和实际宿主路径；只有完整契约校验且实际判分通过的样本才能提供证据 */
export const inspectContractSlices = (name: string, schema: ZodType, contract: object, sources: Array<Source>) => {
  const samples: Array<SchemaEvalCase<JsonValue>> = [];
  const paths = new Map<string, { base: string; source: Source }>();
  for (const rule of rules.filter(candidate => candidate.schemas.split(' ').includes(name.replace(/Schema$/, '')))) {
    for (const source of sources.filter(candidate => rule.owners.split(' ').includes(candidate.owner))) {
      for (const path of rule.paths.split(' '))
        for (const item of select(source.value, path)) {
          let value = item.value;
          if (rule.pick && schema instanceof ZodObject && isJsonObject(value)) {
            value = Object.fromEntries(Object.entries(value).filter(([k]) => Object.hasOwn(schema.shape, k)));
            if (!Object.keys(value).length) continue;
          }
          if (!schema.safeParse(value).success) continue;
          const id = source.id + '@' + item.path;
          if (paths.has(id)) continue;
          paths.set(id, { base: item.path, source });
          samples.push({ id, task: '', expected: value });
        }
    }
  }
  const report = inspectSchemaEvalCoverage(contract, samples, (item, answer) =>
    gradeSchemaAnswer(item, answer, {
      validate: input => (schema.safeParse(input).success ? [] : ['invalid']),
      project: input => input,
      isDiscriminator: path => /\.(kind|type|property)$/.test(path),
    }),
  );
  for (const entry of report.entries)
    entry.witnesses = entry.witnesses.map(w => {
      const { base, source } = paths.get(w.caseId)!;
      return {
        caseId: source.id,
        inputPath: base + w.inputPath.slice(1),
        assertionPaths: w.assertionPaths.map(path => base + path.slice(1)).filter(path => source.rejectsChange(path)),
      };
    });
  for (const entry of report.entries) if (!entry.witnesses.some(w => w.assertionPaths.length)) entry.status = 'gap';
  return report;
};

import type { ArrowDefinition, MarkDefinition, MarkEmitContext, PathCommand, PathPrimitive } from '../contract';
import { defineMark } from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import { BuiltinMarkShape } from '../schemas';
import { createProviderRegistry } from './registry';

/** 生成响应描边样式的开放标记线条 */
const strokeMarkPath = (context: MarkEmitContext, commands: Array<PathCommand>): PathPrimitive => ({
  type: 'path',
  commands,
  fill: 'none',
  stroke: context.stroke,
  strokeWidth: context.lineWidth,
  lineCap: context.lineCap,
  lineJoin: context.lineJoin,
  dashPattern: context.dashPattern,
  dashOffset: context.dashOffset,
});

/** 叉号标记 */
const timesMark = defineMark({
  name: BuiltinMarkShape.Times,
  hollow: true,
  emit: context => [
    strokeMarkPath(context, [
      { kind: 'move', to: [1, 1] },
      { kind: 'line', to: [9, 9] },
      { kind: 'move', to: [1, 9] },
      { kind: 'line', to: [9, 1] },
    ]),
  ],
});

/** 加号标记 */
const plusMark = defineMark({
  name: BuiltinMarkShape.Plus,
  hollow: true,
  emit: context => [
    strokeMarkPath(context, [
      { kind: 'move', to: [1, 5] },
      { kind: 'line', to: [9, 5] },
      { kind: 'move', to: [5, 1] },
      { kind: 'line', to: [5, 9] },
    ]),
  ],
});

/** 对勾标记 */
const checkMark = defineMark({
  name: BuiltinMarkShape.Check,
  hollow: true,
  emit: context => [
    strokeMarkPath(context, [
      { kind: 'move', to: [1, 5] },
      { kind: 'line', to: [4, 8] },
      { kind: 'line', to: [9, 2] },
    ]),
  ],
});

/** 五角星标记 */
const starMark = defineMark({
  name: BuiltinMarkShape.Star,
  emit: context => {
    const commands: Array<PathCommand> = [];
    for (let index = 0; index < 10; index++) {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 4.5 : 2;
      commands.push({
        kind: index === 0 ? 'move' : 'line',
        to: [context.round(5 + Math.cos(angle) * radius), context.round(5 + Math.sin(angle) * radius)],
      });
    }
    commands.push({ kind: 'close' });
    return [
      {
        type: 'path',
        commands,
        fill: context.fill,
        stroke: context.stroke,
        lineCap: context.lineCap,
        lineJoin: context.lineJoin,
        dashPattern: context.dashPattern,
        dashOffset: context.dashOffset,
      },
    ];
  },
});

/** 内置普通标记注册项 */
const BUILTIN_MARKS: ReadonlyMap<string, MarkDefinition> = new Map([
  [timesMark.name, timesMark],
  [plusMark.name, plusMark],
  [checkMark.name, checkMark],
  [starMark.name, starMark],
]);

/** 注册时检查标记静态几何 */
const assertMarkGeometry = (definition: MarkDefinition): void => {
  const baseSize = definition.baseSize ?? 10;
  if (!Number.isFinite(baseSize) || baseSize <= 0)
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Mark '${definition.name}' has invalid baseSize; expected a finite positive number.`,
    );
  const anchor = definition.anchor;
  if (anchor !== undefined && !anchor.every(Number.isFinite))
    throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, `Mark '${definition.name}' has a non-finite anchor.`);
};

/** 合并普通标记定义并诊断重复名称 */
export const resolveMarkRegistry = (
  marks: ReadonlyArray<MarkDefinition> | undefined,
  arrows: ReadonlyMap<string, ArrowDefinition>,
): ReadonlyMap<string, MarkDefinition> => {
  /** 箭头外观按尖端锚点加入标记注册表，不传递截断几何 */
  const arrowMarks = new Map<string, MarkDefinition>();
  for (const [name, arrow] of arrows) {
    const { backX, lineContactX, outerInset, tipX, ...visual } = arrow;
    void backX;
    void lineContactX;
    void outerInset;
    const baseSize = arrow.baseSize ?? 10;
    arrowMarks.set(name, { ...visual, anchor: [tipX ?? baseSize, baseSize / 2] });
  }
  return createProviderRegistry({
    capability: 'mark',
    builtins: createProviderRegistry({
      capability: 'mark',
      builtins: BUILTIN_MARKS,
      custom: Array.from(arrowMarks.values()),
      keyOf: definition => definition.name,
    }),
    custom: marks,
    keyOf: definition => {
      assertMarkGeometry(definition);
      return definition.name;
    },
  });
};

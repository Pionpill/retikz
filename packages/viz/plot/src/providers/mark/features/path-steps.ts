import type { IRAxisLineTarget, IRStep, IRTarget } from '@retikz/core';

import type { CoordinateFrame, MarkInstance, MarkLoweringContext } from '../../../contract';
import { mapPositionInput } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotPathMark, IRPlotPathStepTarget, IRPlotPositionEncoding } from '../../../schemas';

/** 投影数据位置并将完整步骤交给 Core，构造参数保持绘图空间语义 */
export const lowerPathSteps = (
  mark: IRPlotPathMark,
  instance: MarkInstance,
  frame: CoordinateFrame,
  context?: MarkLoweringContext,
): Array<IRStep> => {
  const project = (position: IRPlotPositionEncoding): [number, number] => {
    const mapped = frame.roles.map(role => {
      const scale = frame.roleScales?.[role];
      const input = position[role as keyof IRPlotPositionEncoding];
      if (scale === undefined || input === undefined) throw new RetikzPlotError(`Missing path step role ${role}`);
      return mapPositionInput(input, scale, instance.kind === 'row' ? instance.row : undefined);
    });
    const projected = mapped.every(Number.isFinite) ? frame.projectMappedRoles?.(mapped) : undefined;
    if (projected == null || !projected.every(Number.isFinite))
      throw new RetikzPlotError('Invalid path step projection');
    return projected;
  };
  return (mark.encodings.steps ?? []).map((step, index): IRStep => {
    const target = (value: IRPlotPathStepTarget, role: string): IRTarget => {
      if ('x' in value) return project(value);
      if (!('mark' in value)) return value;
      if (context?.targets === undefined) throw new RetikzPlotError('Mark target resolution requires a plot view');
      return context.targets.reference(value, instance, {
        markType: mark.type,
        markId: mark.id,
        markIndex: context.markIndex,
        role: `steps.${index}.${role}`,
        ...(instance.kind === 'row'
          ? { kind: 'row', transformedIndex: instance.transformedIndex }
          : { kind: 'single' }),
      });
    };
    try {
      switch (step.kind) {
        case 'cycle':
        case 'circlePath':
        case 'ellipsePath':
          return { type: 'step', ...step };
        case 'curve':
          return {
            type: 'step',
            ...step,
            to: target(step.to, 'to'),
            control: 'x' in step.control ? project(step.control) : step.control,
          };
        case 'cubic':
          return {
            type: 'step',
            ...step,
            to: target(step.to, 'to'),
            control1: 'x' in step.control1 ? project(step.control1) : step.control1,
            control2: 'x' in step.control2 ? project(step.control2) : step.control2,
          };
        case 'arc': {
          const { center, ...arc } = step;
          return {
            type: 'step',
            ...arc,
            ...(center === undefined ? {} : { center: target(center, 'center') }),
          };
        }
        case 'generator': {
          const { to, ...generator } = step;
          return { type: 'step', ...generator, ...(to === undefined ? {} : { to: target(to, 'to') }) };
        }
        case 'rectangle':
          return { type: 'step', ...step, from: target(step.from, 'from'), to: target(step.to, 'to') };
        case 'smooth':
          return {
            type: 'step',
            ...step,
            points: step.points.map((point, pointIndex) => target(point, `points.${pointIndex}`)),
          };
        case 'axis-line':
          return { type: 'step', ...step, to: target(step.to, 'to') as IRAxisLineTarget };
        default:
          return { type: 'step', ...step, to: target(step.to, 'to') };
      }
    } catch (cause) {
      throw new RetikzPlotError(
        `Path mark "${mark.id ?? context?.markIndex}" step ${index} row ${instance.kind === 'row' ? instance.transformedIndex : 'single'} failed`,
        { cause },
      );
    }
  });
};

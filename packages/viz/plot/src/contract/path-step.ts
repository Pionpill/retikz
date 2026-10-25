import type { IRPlotPathStep, IRPlotPathStepTarget } from '../schemas';

/** 枚举步骤实际消费的位置槽，不读取生成器参数或标签 */
export const pathStepTargets = (step: IRPlotPathStep): Array<{ role: string; target: IRPlotPathStepTarget }> => {
  switch (step.kind) {
    case 'cycle':
    case 'circlePath':
    case 'ellipsePath':
      return [];
    case 'arc':
      return step.center === undefined ? [] : [{ role: 'center', target: step.center }];
    case 'generator':
      return step.to === undefined ? [] : [{ role: 'to', target: step.to }];
    case 'smooth':
      return step.points.map((target, index) => ({ role: `points.${index}`, target }));
    case 'curve':
      return [
        { role: 'to', target: step.to },
        { role: 'control', target: step.control },
      ];
    case 'cubic':
      return [
        { role: 'to', target: step.to },
        { role: 'control1', target: step.control1 },
        { role: 'control2', target: step.control2 },
      ];
    case 'rectangle':
      return [
        { role: 'from', target: step.from },
        { role: 'to', target: step.to },
      ];
    default:
      return [{ role: 'to', target: step.to }];
  }
};

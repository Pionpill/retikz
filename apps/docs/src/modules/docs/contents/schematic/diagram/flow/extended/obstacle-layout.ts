import { LayeredFlowLayoutDefinition, routeFlowRelations } from '@retikz/diagram/flow';
import type { FlowLayoutDefinition } from '@retikz/diagram/flow';

/** 示例布局固定端点，仅改变参与路由计算的障碍中心 */
export const createObstacleLayout = (x: number, y: number, orthogonal = false): FlowLayoutDefinition => ({
  ...LayeredFlowLayoutDefinition,
  name: 'obstacle-playground',
  description: 'Fixed endpoints and an authored obstacle center with built-in Flow routing.',
  layout: (input, context) => {
    if (input.elements.some(element => element.kind !== 'leaf'))
      return LayeredFlowLayoutDefinition.layout(input, context);

    const elements = input.elements.map(element => {
      if (element.kind !== 'leaf') throw new Error('The obstacle playground accepts leaf entities only');

      const centerX = element.id === 'a' ? 60 : element.id === 'b' ? 460 : x;
      const centerY = element.id === 'a' ? (orthogonal ? 20 : 100) : element.id === 'b' ? (orthogonal ? 140 : 100) : y;

      return {
        id: element.id,
        bounds: { x: centerX - element.size.width / 2, y: centerY - element.size.height / 2, ...element.size },
      };
    });

    return { elements, relations: routeFlowRelations(input, elements, context) };
  },
});

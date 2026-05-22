import { BUILTIN_SHAPES, type ShapeDefinition } from '@retikz/core';
import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 多 primitive 自定义 shape：子程序框（外框 + 左右两道竖条）
 * @description emit 返回 Iterable<ScenePrimitive>——一个 shape 出 3 个 primitive（rect body + 2 条 path 竖条）；
 *   circumscribe / boundaryPoint / anchor 直接复用内置 rectangle（外框即矩形）。纯技术 label，单文件双语共用。
 */
const subroutine: ShapeDefinition = {
  circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
  boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
  anchor: BUILTIN_SHAPES.rectangle.anchor,
  *emit(rect, style, round) {
    const hw = rect.width / 2;
    const hh = rect.height / 2;
    const inset = 8;
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? 1;
    const sharedStrokeStyle = {
      stroke,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
    };
    yield {
      type: 'rect',
      x: round(rect.x - hw),
      y: round(rect.y - hh),
      width: round(rect.width),
      height: round(rect.height),
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      cornerRadius: style.roundedCorners,
      ...sharedStrokeStyle,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - hw + inset), round(rect.y - hh)] },
        { kind: 'line', to: [round(rect.x - hw + inset), round(rect.y + hh)] },
      ],
      ...sharedStrokeStyle,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x + hw - inset), round(rect.y - hh)] },
        { kind: 'line', to: [round(rect.x + hw - inset), round(rect.y + hh)] },
      ],
      ...sharedStrokeStyle,
    };
  },
};

const Demo: FC = () => (
  <TikZ width={320} height={130} shapes={{ subroutine }}>
    <Node id="p" shape="subroutine" position={[0, 0]} text="f(x)" fill="#f3f0ff" stroke="#7048e8" strokeWidth={2} padding={16} />
  </TikZ>
);

export default Demo;

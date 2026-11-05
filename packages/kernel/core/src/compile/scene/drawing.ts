import type {
  ScenePrimitive,
  ScenePrimitiveBase,
  ScenePrimitiveFill,
  ScenePrimitiveStroke,
  ScenePrimitiveOpacity,
  ScenePrimitiveEffects,
  TextLine,
  CompiledArrowEnd,
} from '../../contract';

/** 图元最终外观及身份；按图元结构树的先序遍历顺序对应 */
export type CompiledPrimitiveStyle = ScenePrimitiveBase &
  ScenePrimitiveFill &
  ScenePrimitiveStroke &
  ScenePrimitiveOpacity &
  ScenePrimitiveEffects & {
    /** 物理行的最终颜色与透明度 */
    lines?: Array<Pick<TextLine, 'fill' | 'opacity'>>;
    /** 起点箭头的最终透明度 */
    arrowStart?: Pick<CompiledArrowEnd, 'opacity'>;
    /** 终点箭头的最终透明度 */
    arrowEnd?: Pick<CompiledArrowEnd, 'opacity'>;
  };

/** 保留递归内容并移除外观字段的最终 Scene 图元结构 */
export type CompiledPrimitiveStructure =
  | Omit<Extract<ScenePrimitive, { type: 'rect' }>, keyof CompiledPrimitiveStyle>
  | Omit<Extract<ScenePrimitive, { type: 'ellipse' }>, keyof CompiledPrimitiveStyle>
  | (Omit<Extract<ScenePrimitive, { type: 'group' }>, keyof CompiledPrimitiveStyle | 'children'> & {
      children: Array<CompiledPrimitiveStructure>;
    })
  | (Omit<Extract<ScenePrimitive, { type: 'text' }>, keyof CompiledPrimitiveStyle> & {
      lines: Array<Omit<TextLine, 'fill' | 'opacity'>>;
    })
  | (Omit<Extract<ScenePrimitive, { type: 'path' }>, keyof CompiledPrimitiveStyle | 'arrowStart' | 'arrowEnd'> & {
      arrowStart?: CompiledDrawingArrow;
      arrowEnd?: CompiledDrawingArrow;
    });

/** 箭头的最终尺寸与局部图元结构 */
export type CompiledDrawingArrow = Omit<CompiledArrowEnd, 'marker' | 'opacity'> & {
  /** 箭头内部的最终图元结构 */
  marker: Array<CompiledPrimitiveStructure>;
};

/** 不含 Definition 的最终绘制结果，图元结构和外观各保留一个事实源 */
export type CompiledDrawing = {
  /** 按绘制顺序排列的图元结构树 */
  structure: Array<CompiledPrimitiveStructure>;
  /** 与图元结构先序遍历对应的外观 */
  style: Array<CompiledPrimitiveStyle>;
};

const STYLE_KEYS = [
  'id',
  'meta',
  'pointerEvents',
  'animations',
  'fill',
  'stroke',
  'strokeWidth',
  'dashPattern',
  'dashOffset',
  'lineCap',
  'lineJoin',
  'opacity',
  'fillOpacity',
  'strokeOpacity',
  'shadow',
  'blendMode',
] as const;

/** 将已物化的 Scene 图元按计算结果拆分，保留任意自定义多图元与箭头 */
export const splitCompiledDrawing = (primitives: ReadonlyArray<ScenePrimitive>): CompiledDrawing => {
  const styles: Array<CompiledPrimitiveStyle> = [];
  const split = (primitive: ScenePrimitive): CompiledPrimitiveStructure => {
    const structure = { ...primitive };
    const style: CompiledPrimitiveStyle = {};
    for (const key of STYLE_KEYS) {
      if (!Object.hasOwn(primitive, key)) continue;
      Reflect.set(style, key, Reflect.get(primitive, key));
      Reflect.deleteProperty(structure, key);
    }
    styles.push(style);
    if (primitive.type === 'group')
      return { ...structure, children: primitive.children.map(split) } as CompiledPrimitiveStructure;
    if (primitive.type === 'text') {
      style.lines = primitive.lines.map(line => ({
        ...(Object.hasOwn(line, 'fill') ? { fill: line.fill } : {}),
        ...(Object.hasOwn(line, 'opacity') ? { opacity: line.opacity } : {}),
      }));
      return {
        ...structure,
        lines: primitive.lines.map(({ fill, opacity, ...line }) => {
          void fill;
          void opacity;
          return line;
        }),
      } as CompiledPrimitiveStructure;
    }
    if (primitive.type === 'path') {
      const arrow = (end: CompiledArrowEnd, key: 'arrowStart' | 'arrowEnd'): CompiledDrawingArrow => {
        const { opacity, marker, ...arrowStructure } = end;
        style[key] = Object.hasOwn(end, 'opacity') ? { opacity } : {};
        return { ...arrowStructure, marker: marker.map(split) };
      };
      return {
        ...structure,
        ...(primitive.arrowStart === undefined ? {} : { arrowStart: arrow(primitive.arrowStart, 'arrowStart') }),
        ...(primitive.arrowEnd === undefined ? {} : { arrowEnd: arrow(primitive.arrowEnd, 'arrowEnd') }),
      };
    }
    return structure;
  };
  return { structure: primitives.map(split), style: styles };
};

/** 从最终图元结构和外观组装 Scene，不读取 canon 或重新执行 provider */
export const emitCompiledDrawing = (drawing: CompiledDrawing): Array<ScenePrimitive> => {
  let cursor = 0;
  const emit = (structure: CompiledPrimitiveStructure): ScenePrimitive => {
    const { lines, arrowStart, arrowEnd, ...style } = drawing.style[cursor++];
    if (structure.type === 'group') return { ...structure, ...style, children: structure.children.map(emit) };
    if (structure.type === 'text')
      return {
        ...structure,
        ...style,
        lines: structure.lines.map((line, index) => ({ ...line, ...lines?.[index] })),
      } as ScenePrimitive;
    if (structure.type === 'path') {
      const arrow = (
        end: CompiledDrawingArrow,
        appearance: Pick<CompiledArrowEnd, 'opacity'> | undefined,
      ): CompiledArrowEnd => ({ ...end, ...appearance, marker: end.marker.map(emit) });
      return {
        ...structure,
        ...style,
        ...(structure.arrowStart === undefined ? {} : { arrowStart: arrow(structure.arrowStart, arrowStart) }),
        ...(structure.arrowEnd === undefined ? {} : { arrowEnd: arrow(structure.arrowEnd, arrowEnd) }),
      };
    }
    return { ...structure, ...style };
  };
  return drawing.structure.map(emit);
};

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

/** 图元最终外观及身份；按几何树的先序遍历顺序对应 */
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

/** 保留递归内容并移除外观字段的最终 Scene 几何 */
export type CompiledPrimitiveGeometry =
  | Omit<Extract<ScenePrimitive, { type: 'rect' }>, keyof CompiledPrimitiveStyle>
  | Omit<Extract<ScenePrimitive, { type: 'ellipse' }>, keyof CompiledPrimitiveStyle>
  | (Omit<Extract<ScenePrimitive, { type: 'group' }>, keyof CompiledPrimitiveStyle | 'children'> & {
      children: Array<CompiledPrimitiveGeometry>;
    })
  | (Omit<Extract<ScenePrimitive, { type: 'text' }>, keyof CompiledPrimitiveStyle> & {
      lines: Array<Omit<TextLine, 'fill' | 'opacity'>>;
    })
  | (Omit<Extract<ScenePrimitive, { type: 'path' }>, keyof CompiledPrimitiveStyle | 'arrowStart' | 'arrowEnd'> & {
      arrowStart?: CompiledDrawingArrow;
      arrowEnd?: CompiledDrawingArrow;
    });

/** 箭头的最终尺寸与局部几何 */
export type CompiledDrawingArrow = Omit<CompiledArrowEnd, 'marker' | 'opacity'> & {
  /** 箭头内部的最终几何 */
  marker: Array<CompiledPrimitiveGeometry>;
};

/** 不含 Definition 的最终绘制结果，几何和外观各保留一个事实源 */
export type CompiledDrawing = {
  /** 按绘制顺序排列的几何树 */
  geometry: Array<CompiledPrimitiveGeometry>;
  /** 与几何先序遍历对应的外观 */
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
  const split = (primitive: ScenePrimitive): CompiledPrimitiveGeometry => {
    const geometry = { ...primitive };
    const style: CompiledPrimitiveStyle = {};
    for (const key of STYLE_KEYS) {
      if (!Object.hasOwn(primitive, key)) continue;
      Reflect.set(style, key, Reflect.get(primitive, key));
      Reflect.deleteProperty(geometry, key);
    }
    styles.push(style);
    if (primitive.type === 'group')
      return { ...geometry, children: primitive.children.map(split) } as CompiledPrimitiveGeometry;
    if (primitive.type === 'text') {
      style.lines = primitive.lines.map(line => ({
        ...(Object.hasOwn(line, 'fill') ? { fill: line.fill } : {}),
        ...(Object.hasOwn(line, 'opacity') ? { opacity: line.opacity } : {}),
      }));
      return {
        ...geometry,
        lines: primitive.lines.map(({ fill, opacity, ...line }) => {
          void fill;
          void opacity;
          return line;
        }),
      } as CompiledPrimitiveGeometry;
    }
    if (primitive.type === 'path') {
      const arrow = (end: CompiledArrowEnd, key: 'arrowStart' | 'arrowEnd'): CompiledDrawingArrow => {
        const { opacity, marker, ...arrowGeometry } = end;
        style[key] = Object.hasOwn(end, 'opacity') ? { opacity } : {};
        return { ...arrowGeometry, marker: marker.map(split) };
      };
      return {
        ...geometry,
        ...(primitive.arrowStart === undefined ? {} : { arrowStart: arrow(primitive.arrowStart, 'arrowStart') }),
        ...(primitive.arrowEnd === undefined ? {} : { arrowEnd: arrow(primitive.arrowEnd, 'arrowEnd') }),
      };
    }
    return geometry;
  };
  return { geometry: primitives.map(split), style: styles };
};

/** 从最终几何和外观组装 Scene，不读取 canon 或重新执行 provider */
export const emitCompiledDrawing = (drawing: CompiledDrawing): Array<ScenePrimitive> => {
  let cursor = 0;
  const emit = (geometry: CompiledPrimitiveGeometry): ScenePrimitive => {
    const { lines, arrowStart, arrowEnd, ...style } = drawing.style[cursor++];
    if (geometry.type === 'group') return { ...geometry, ...style, children: geometry.children.map(emit) };
    if (geometry.type === 'text')
      return {
        ...geometry,
        ...style,
        lines: geometry.lines.map((line, index) => ({ ...line, ...lines?.[index] })),
      } as ScenePrimitive;
    if (geometry.type === 'path') {
      const arrow = (
        end: CompiledDrawingArrow,
        appearance: Pick<CompiledArrowEnd, 'opacity'> | undefined,
      ): CompiledArrowEnd => ({ ...end, ...appearance, marker: end.marker.map(emit) });
      return {
        ...geometry,
        ...style,
        ...(geometry.arrowStart === undefined ? {} : { arrowStart: arrow(geometry.arrowStart, arrowStart) }),
        ...(geometry.arrowEnd === undefined ? {} : { arrowEnd: arrow(geometry.arrowEnd, arrowEnd) }),
      };
    }
    return { ...geometry, ...style };
  };
  return drawing.geometry.map(emit);
};

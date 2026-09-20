import type { IRCell, IRCellStyle, IRCellLayout } from '../../composites/presentation/shared/schemas';
import {
  CellDefaultsSchema,
  CellLayoutDefaultsSchema,
  KeyCellDefaultsSchema,
} from '../../composites/presentation/shared/schemas';
import type { CanonicalCell } from './types';

/** 只合并显式字段；字体子字段保留先前继承值 */
const mergeStyle = (styles: Array<IRCellStyle | undefined>): IRCellStyle => {
  const result: IRCellStyle = {};
  for (const style of styles) {
    if (style === undefined) continue;
    for (const key of Object.keys(style) as Array<keyof IRCellStyle>) {
      const value = style[key];
      if (value === undefined || key === 'font') continue;
      Object.assign(result, { [key]: value });
    }
    if (style.font !== undefined) {
      result.font = { ...result.font };
      for (const key of Object.keys(style.font) as Array<keyof NonNullable<IRCellStyle['font']>>) {
        const value = style.font[key];
        if (value !== undefined) Object.assign(result.font, { [key]: value });
      }
    }
  }
  return result;
};

/** 在整体、角色、单元格合并后才应用权威字段默认 */
export const resolveCell = (
  source: string | IRCell,
  overallStyle?: IRCellStyle,
  roleStyle?: IRCellStyle,
  layout?: IRCellLayout,
  isKey = false,
  roleLayout?: IRCellLayout,
): CanonicalCell => {
  const cell = typeof source === 'string' ? { content: source } : source;
  const style = mergeStyle([overallStyle, roleStyle, cell.style]);
  const width = cell.layout?.width ?? roleLayout?.width ?? layout?.width;
  const height = cell.layout?.height ?? roleLayout?.height ?? layout?.height;
  const fixed = typeof width === 'number' || typeof height === 'number';
  return {
    ...cell,
    content:
      typeof cell.content === 'string'
        ? {
            type: 'node',
            position: [0, 0],
            text: cell.content,
            style: { fill: 'none', stroke: 'none' },
            layout: { padding: 0, margin: 0 },
          }
        : cell.content,
    style: {
      ...style,
      fill: style.fill ?? CellDefaultsSchema.shape.fill.parse(undefined),
      fillOpacity:
        style.fillOpacity ?? (isKey ? KeyCellDefaultsSchema : CellDefaultsSchema).shape.fillOpacity.parse(undefined),
      stroke: style.stroke ?? CellDefaultsSchema.shape.stroke.parse(undefined),
      cornerRadius: style.cornerRadius ?? CellDefaultsSchema.shape.cornerRadius.parse(undefined),
    },
    layout: {
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
      padding:
        cell.layout?.padding ??
        roleLayout?.padding ??
        layout?.padding ??
        CellLayoutDefaultsSchema.shape.padding.parse(undefined),
      overflow:
        cell.layout?.overflow ??
        roleLayout?.overflow ??
        layout?.overflow ??
        (fixed ? 'clip' : CellLayoutDefaultsSchema.shape.overflow.parse(undefined)),
    },
  };
};

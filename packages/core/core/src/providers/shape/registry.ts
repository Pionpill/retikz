import type { BuiltinShapeName } from '../../schemas/node';
import { contour } from '../../contract/shape';
import type { ShapeDefinition } from '../../contract/shape';
import { arc } from './arc';
import { ellipse } from './ellipse';
import { polygon } from './polygon';
import { rectangle } from './rectangle';
import { sector } from './sector';
import { star } from './star';
import type { CompileWarning } from '../../compile/constant';
import { CompileWarningCode } from '../../compile/constant';

/** 内置 shape 注册项（circle / diamond 已收为 preset，不占独立项）；与 `CompileOptions.shapes` 合并时被同名注入覆盖 */
export const BUILTIN_SHAPES: Record<Exclude<BuiltinShapeName, 'circle' | 'diamond'> | 'sector' | 'arc' | 'polygon' | 'star' | 'contour', ShapeDefinition> = {
  rectangle,
  ellipse,
  sector,
  arc,
  polygon,
  star,
  contour,
};

export const resolveShapeRegistry = (
  shapes: Record<string, ShapeDefinition> | undefined,
  onWarn: (warning: CompileWarning) => void,
): Record<string, ShapeDefinition> => {
  if (!shapes) return BUILTIN_SHAPES;
  for (const name of Object.keys(shapes)) {
    if (Object.prototype.hasOwnProperty.call(BUILTIN_SHAPES, name)) {
      onWarn({
        code: CompileWarningCode.ShapeOverridesBuiltin,
        message: `Injected shape '${name}' overrides the built-in shape of the same name.`,
        path: `options.shapes.${name}`,
      });
    }
  }
  return { ...BUILTIN_SHAPES, ...shapes };
};

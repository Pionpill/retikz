import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { ThemeDefinition } from '../../contract';
import type { ProviderRegistry } from '../../providers';
import type { IRScope } from '../../schemas';
import { ScopePropsSchema, ScopeBoundingShape } from '../../schemas';
import { resolveNodeShape } from '../node';
import { resolveAbsoluteTarget, resolvePolarPosition } from '../position';
import { resolveClip } from '../resource';
import { resolveScopeDefaults } from '../style';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../theme';
import type { CanonicalScope, CanonicalScopeInheritance, ScopeResolveContext } from './types';

/** 确定作用域向子元素传递的默认配置与主题，不编译子元素或聚合几何 */
export const resolveScopeInheritance = (
  scope: Pick<IRScope, 'defaults' | 'theme'>,
  themeRegistry: ProviderRegistry<ThemeDefinition>,
  parent?: CanonicalScopeInheritance,
  irPath: PropertyPath = [],
  themePath = formatPropertyPath([...irPath, 'theme']),
): CanonicalScopeInheritance =>
  Object.freeze({
    defaults: resolveScopeDefaults(scope.defaults, parent?.defaults),
    theme: resolveTheme(parent?.theme ?? DEFAULT_RESOLVED_THEME, scope.theme, themePath, themeRegistry),
  });

/** 在子树执行前确定继承、包络能力及分组配置 */
export const resolveScope = (input: Omit<IRScope, 'children'>, context: ScopeResolveContext): CanonicalScope => {
  const {
    id,
    meta,
    zIndex,
    localNamespace = false,
    boundingShape = ScopeBoundingShape.Rectangle,
    transforms = [],
    clip,
    animations = [],
    position: inputPosition,
  } = input;
  const { parent, themeRegistry, shapeRegistry, clipRegistry, irPath, themePath, nodeDistance } = context;
  const position = inputPosition ?? ScopePropsSchema.shape.position.parse(undefined);
  const shape = resolveNodeShape({
    node: {
      shape:
        boundingShape === ScopeBoundingShape.Circle
          ? { type: 'ellipse', params: { circumscribe: 'equal' } }
          : 'rectangle',
    },
    shapeRegistry,
    scaleX: 1,
    scaleY: 1,
    irPath,
  });
  return {
    inheritance: resolveScopeInheritance(input, themeRegistry, parent, irPath, themePath),
    localNamespace,
    envelope: { kind: boundingShape, shape },
    transform: {
      position: Array.isArray(position) ? position : { ...position, selfAnchor: position.selfAnchor ?? 'center' },
      transforms: transforms.map(transform => {
        switch (transform.kind) {
          case 'rotate':
            return { ...transform, pivot: transform.pivot ?? 'origin' };
          case 'scale':
            return { ...transform, y: transform.y ?? transform.x, pivot: transform.pivot ?? 'origin' };
          case 'polar-translate':
            return { ...transform, ...resolvePolarPosition(transform) };
          case 'at-translate':
            return { ...transform, distance: transform.distance ?? nodeDistance };
          case 'offset-translate':
            return {
              ...transform,
              of:
                typeof transform.of === 'string' || Array.isArray(transform.of)
                  ? transform.of
                  : resolvePolarPosition(transform.of),
              offset: transform.offset ?? [0, 0],
            };
          case 'between-translate':
            return {
              ...transform,
              between: [resolveAbsoluteTarget(transform.between[0]), resolveAbsoluteTarget(transform.between[1])],
            };
          default:
            return transform;
        }
      }),
    },
    style: { id, meta, zIndex },
    clip: clip === undefined ? undefined : resolveClip(clip, { clipRegistry, irPath: [...irPath, 'clip'] }),
    animations,
  };
};

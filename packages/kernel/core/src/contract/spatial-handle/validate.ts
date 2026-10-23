import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { cloneAndFreezeJson } from '../../shared/json';
import type { SpatialHandleDeclaration } from './handle';

/** 检查 owner 内的身份冲突与几何不变量，并脱离、冻结空间声明 */
export const validateSpatialHandleDeclarations = (
  owner: string,
  declarations: ReadonlyArray<SpatialHandleDeclaration>,
): ReadonlyArray<SpatialHandleDeclaration> => {
  const fail = (detail: string): never => {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      `${owner} returned an invalid spatial handle declaration: ${detail}.`,
    );
  };
  const ids = new Set<string>();
  return Object.freeze(
    declarations.map((declaration, index) => {
      for (const id of [declaration.id, ...(declaration.aliasIds ?? [])]) {
        if (ids.has(id)) fail(`duplicate spatial handle id '${id}'`);
        ids.add(id);
      }
      const { x, y, width, height } = declaration.bounds;
      for (const [field, value] of Object.entries({ x, y, width, height })) {
        if (!Number.isFinite(value)) fail(`spatialHandles[${index}].bounds.${field} must be finite`);
      }
      if (width < 0) fail(`spatialHandles[${index}].bounds.width must be nonnegative`);
      if (height < 0) fail(`spatialHandles[${index}].bounds.height must be nonnegative`);
      const tags = new Set<string>();
      for (const tag of declaration.tags ?? []) {
        if (tags.has(tag)) fail(`spatialHandles[${index}].tags contains duplicate tag '${tag}'`);
        tags.add(tag);
      }
      return Object.freeze({
        id: declaration.id,
        role: declaration.role,
        bounds: Object.freeze({ x, y, width, height }),
        ...(declaration.aliasIds === undefined ? {} : { aliasIds: Object.freeze([...declaration.aliasIds]) }),
        ...(declaration.tags === undefined ? {} : { tags: Object.freeze([...declaration.tags]) }),
        ...(declaration.payload === undefined
          ? {}
          : {
              payload: cloneAndFreezeJson(declaration.payload, `${owner} spatialHandles[${index}].payload`),
            }),
      });
    }),
  );
};

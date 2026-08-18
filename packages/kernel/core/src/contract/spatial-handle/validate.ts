import type { IRJsonObject } from '../../schemas';
import type { SpatialHandleDeclaration } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { cloneAndFreezeJson } from '../../shared/json';

const declarationFields = new Set(['key', 'role', 'bounds', 'tags', 'payload']);
const boundsFields = new Set(['x', 'y', 'width', 'height']);

const fail = (owner: string, detail: string): never => {
  throw new RetikzCoreError(
    RetikzCoreErrorCode.Contract,
    `${owner} returned an invalid spatial handle declaration: ${detail}.`,
  );
};

const requireRecord = (owner: string, value: unknown, detail: string): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(owner, detail);
  return value as Record<string, unknown>;
};

const requireNonEmptyString = (owner: string, value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0) return fail(owner, `${field} must be a non-empty string`);
  return value;
};

/** 校验、脱离并冻结同一 composite occurrence 的全部局部空间声明 */
export const validateSpatialHandleDeclarations = (
  owner: string,
  value: unknown,
): ReadonlyArray<SpatialHandleDeclaration> => {
  const inputs = Array.isArray(value) ? value : fail(owner, 'spatialHandles must be an array');
  const keys = new Set<string>();
  const declarations = inputs.map((input: unknown, index: number): SpatialHandleDeclaration => {
    const location = `spatialHandles[${index}]`;
    const declaration = requireRecord(owner, input, `${location} must be an object`);
    const unsupported = Object.keys(declaration).filter(field => !declarationFields.has(field));
    if (unsupported.length > 0) fail(owner, `${location} contains unsupported field '${unsupported[0]}'`);

    const key = requireNonEmptyString(owner, declaration.key, `${location}.key`);
    if (keys.has(key)) fail(owner, `duplicate spatial handle key '${key}'`);
    keys.add(key);
    const role = requireNonEmptyString(owner, declaration.role, `${location}.role`);

    const rawBounds = requireRecord(owner, declaration.bounds, `${location}.bounds must be an object`);
    const unsupportedBounds = Object.keys(rawBounds).filter(field => !boundsFields.has(field));
    if (unsupportedBounds.length > 0) {
      fail(owner, `${location}.bounds contains unsupported field '${unsupportedBounds[0]}'`);
    }
    const readFinite = (field: 'x' | 'y' | 'width' | 'height'): number => {
      const number = rawBounds[field];
      if (typeof number !== 'number' || !Number.isFinite(number)) {
        return fail(owner, `${location}.bounds.${field} must be finite`);
      }
      return number;
    };
    const x = readFinite('x');
    const y = readFinite('y');
    const width = readFinite('width');
    const height = readFinite('height');
    if (width < 0) fail(owner, `${location}.bounds.width must be nonnegative`);
    if (height < 0) fail(owner, `${location}.bounds.height must be nonnegative`);

    let tags: ReadonlyArray<string> | undefined;
    if (declaration.tags !== undefined) {
      const rawTags = Array.isArray(declaration.tags)
        ? declaration.tags
        : fail(owner, `${location}.tags must be an array`);
      const seenTags = new Set<string>();
      tags = Object.freeze(
        rawTags.map((tag: unknown, tagIndex: number) => {
          const resolved = requireNonEmptyString(owner, tag, `${location}.tags[${tagIndex}]`);
          if (seenTags.has(resolved)) fail(owner, `${location}.tags contains duplicate tag '${resolved}'`);
          seenTags.add(resolved);
          return resolved;
        }),
      );
    }

    let payload: Readonly<IRJsonObject> | undefined;
    if (declaration.payload !== undefined) {
      const rawPayload = requireRecord(owner, declaration.payload, `${location}.payload must be a JSON object`);
      try {
        payload = cloneAndFreezeJson(rawPayload, `${owner} ${location}.payload`) as Readonly<IRJsonObject>;
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        fail(owner, `${location}.payload must be JSON-safe: ${detail}`);
      }
    }

    return Object.freeze({
      key,
      role,
      bounds: Object.freeze({ x, y, width, height }),
      ...(tags === undefined ? {} : { tags }),
      ...(payload === undefined ? {} : { payload }),
    });
  });
  return Object.freeze(declarations);
};

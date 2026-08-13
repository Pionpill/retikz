import type { IRPath } from '@retikz/core';

import { parseWay, THICKNESS_TO_WIDTH } from '@retikz/core';

import type { InputPath } from './types';

/** 将作者侧路径输入组装为 Source IR */
export const normalizePath = (input: InputPath): IRPath => {
  const { type: _type, authoring: _authoring, way, thickness, children, strokeWidth, ...path } = input;
  void _type;
  void _authoring;
  if (way !== undefined && children !== undefined) {
    throw new Error('normalizePath: use either way or children, not both');
  }
  const normalizedChildren = way === undefined ? (children === undefined ? undefined : [...children]) : parseWay(way);
  if (normalizedChildren === undefined) {
    throw new Error('normalizePath: path requires way or children');
  }
  return {
    type: 'path',
    ...path,
    children: normalizedChildren,
    ...(strokeWidth === undefined
      ? thickness === undefined
        ? {}
        : { strokeWidth: THICKNESS_TO_WIDTH[thickness] }
      : { strokeWidth }),
  };
};

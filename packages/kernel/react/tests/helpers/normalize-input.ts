import type { IRScene } from '@retikz/core';
import type { ReactNode } from 'react';

import { normalizeScene } from '@retikz/vanilla';

import { createInputScene } from '../../src/kernel/adapter/input-scene';

/** 将 React JSX 按生产路径收集为 Vanilla Input 并归一为 Source IR */
export const normalizeReactInput = (children: ReactNode): IRScene =>
  normalizeScene(createInputScene(children).scene).ir;

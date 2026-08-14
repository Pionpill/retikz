import type { InputFacet, InputScaffold, InputTrack } from '@retikz/plot-vanilla';
import type { FC, ReactNode } from 'react';

export type FacetDimensionInput = InputFacet['row'];
export type FacetProps = InputFacet & { children?: ReactNode };
export type ScaffoldProps = InputScaffold & { children?: ReactNode };
export type TrackProps = InputTrack & { children?: ReactNode };

/** 分面布局声明组件 */
export const Facet: FC<FacetProps> = () => null;
/** 共享轨道骨架声明组件 */
export const Scaffold: FC<ScaffoldProps> = () => null;
/** 共享骨架中的轨道声明组件 */
export const Track: FC<TrackProps> = () => null;

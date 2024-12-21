export type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeDashOffset?: string;
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit';
  strokeLinejoin?: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
  strokeMiterlimit?: number;
  strokeOpacity?: number;
};

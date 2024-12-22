export type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeDashOffset?: string;
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit';
  strokeLinejoin?: "round" | "inherit" | "bevel" | "miter";
  strokeMiterlimit?: number;
  strokeOpacity?: number;
};

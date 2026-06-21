import type { IRTexContent } from '../schemas';
import type { PathCommand } from '../primitive';

export type LoweredTex = {
  commands: Array<PathCommand>;
  width: number;
  height: number;
  depth: number;
};

export type LowerTex = (
  content: IRTexContent,
  style: { fontSize: number; color?: string },
) => LoweredTex | null;

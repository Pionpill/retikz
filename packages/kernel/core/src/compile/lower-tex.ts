import type { PathCommand } from '../contract/scene';
import type { IRTexContent } from '../schemas';

export type LoweredTex = {
  commands: Array<PathCommand>;
  width: number;
  height: number;
  depth: number;
};

export type LowerTex = (content: IRTexContent, style: { fontSize: number; color?: string }) => LoweredTex | null;

import { Container, LetterText, MonitorDown, Waypoints } from 'lucide-react';

// 模块配置信息
export const moduleConfig: Record<string, { repos: string; iconMap: Record<string, typeof MonitorDown> }> = {
  core: {
    repos: 'retikz',
    iconMap: {
      installation: MonitorDown,
      安装: MonitorDown,
      tikz: Container,
      node: LetterText,
      draw: Waypoints,
    },
  },
};

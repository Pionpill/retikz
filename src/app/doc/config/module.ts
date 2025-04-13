import { Container, LetterText, MonitorDown, Waypoints } from 'lucide-react';

// 模块配置信息
export const moduleConfig: Record<string, { repos: string; npm: string; version: string; iconMap: Record<string, typeof MonitorDown> }> = {
  core: {
    repos: 'retikz',
    npm: "@retikz/core",
    version: "0.0.1-rc.3",
    iconMap: {
      installation: MonitorDown,
      安装: MonitorDown,
      tikz: Container,
      node: LetterText,
      draw: Waypoints,
    },
  },
};

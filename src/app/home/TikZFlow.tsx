import useTheme from '@/hooks/useTheme';
import { TikZ, Node, Draw, PathNode } from '@retikz/core';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const TikZFlow: FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <TikZ width="400" height="125">
      <Node position={[50, 100]} name="tikz" children="tikz" size="large"/>
      <Node position={[175, 100]} name="React" color="#087EA4" size="large" children="React" />
      <Node position={[175, 25]} name="d3" color="#EF7234" children="d3" size="large"/>
      <Node position={[350, 100]} name="retikz" children="retikz" color="#0084D1" size="large"/>
      <Draw way={['tikz', 'React']} dashed color="silver">
        <PathNode midway above children={t('home.inspiration')} color="gray" size="small" />
      </Draw>
      <Draw way={['d3', 'React']} color="silver" endArrow="Stealth">
        <PathNode midway right children={t('home.tool')} color="gray" size="small" />
      </Draw>
      <Draw way={['React', 'retikz']} color="silver" endArrow="Stealth">
        <PathNode midway children="svg" fill={theme === 'dark' ? '#1d1d1d' : 'white'} color="gray" size="small" />
      </Draw>
    </TikZ>
  );
};

export default TikZFlow;

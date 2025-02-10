import { LocaleTypes } from '@/config';
import { PropsWithChildren } from 'react';

export type HomePageProps = {
  params: Promise<{ lng: LocaleTypes }>;
} & PropsWithChildren;

const HomePage = async (props: HomePageProps) => {
  const { params } = props;

  return <div></div>;
};

export default HomePage;

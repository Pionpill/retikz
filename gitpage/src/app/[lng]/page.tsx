import { localeTypes } from '@/config';
import useTranslation from '@/hooks/useTranslation';
import { PropsWithChildren } from 'react';

export type HomePageProps = {
  params: Promise<{ lng: localeTypes }>;
} & PropsWithChildren;

const HomePage = async (props: HomePageProps) => {
  const { params } = props;
  const { lng } = await params;

  const { t } = await useTranslation(lng);

  return <div>{t('docTitle')}</div>;
};

export default HomePage;

import { LocaleTypes } from '@/config';
import { PropsWithChildren } from 'react';
import SideMenu from './_components/Sidebar/SideMenu';

export type HomePageProps = {
  params: Promise<{ lng: LocaleTypes }>;
} & PropsWithChildren;

const HomePage = async (props: HomePageProps) => {
  const { params } = props;
  const { lng } = await params;

  return (
    <div>
      <SideMenu lng={lng} />
    </div>
  );
};

export default HomePage;

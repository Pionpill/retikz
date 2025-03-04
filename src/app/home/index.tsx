import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { BookText } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGithub } from 'react-icons/fa';
import { useNavigate } from 'react-router';
import TikZFlow from './TikZFlow';
import RetikzTitle from './RetikzTitle';

const Home: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const i18nKeyArray = ['tikz', 'react', 'd3'];

  return (
    <div className="w-full flex-1 flex flex-wrap p-6 lg:p-12 justify-center gap-24 max-h-full overflow-auto">
      <div className="w-full flex-col lg:flex-row-reverse items-center flex justify-center gap-8">
        <div className="flex items-center justify-center">
          <TikZFlow />
        </div>
        <div className="flex flex-col items-center lg:items-start gap-4 w-[500px] max-w-full">
          <RetikzTitle />
          <Typography variant="subTitle">{t('home.description')}</Typography>
          <Typography wrap>{t('home.content')}</Typography>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/doc')}>
              <BookText />
              {t('home.getStarted')}
            </Button>
            <Button variant="secondary" onClick={() => window.open('https://github.com/Pionpill/retikz', '_blank')}>
              <FaGithub />
              Github
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-between w-full max-w-[950px]">
        {i18nKeyArray.map(item => (
          <div className="flex flex-col gap-2 max-w-full m-2" key={item}>
            <Typography>{t(`home.feature.${item}.title`)}</Typography>
            <Typography variant="caption" wrap>
              {t(`home.feature.${item}.content`)}
            </Typography>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;

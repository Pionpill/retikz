import { Button } from '@/components/ui/button';
import useLang from '@/hooks/useLang';
import useTheme from '@/hooks/useTheme';
import { House, Moon, Sun } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { LuLanguages } from 'react-icons/lu';
import { RiEnglishInput } from 'react-icons/ri';
import { Link } from 'react-router';

const FooterActions: FC = () => {
  const { t } = useTranslation();
  const { theme, switchTheme } = useTheme();
  const { lang, switchLang } = useLang();

  return (
    <div className="flex flex-wrap">
      <Button size="sm" variant="ghost" className="p-2" title={t('common.switchTheme')} onClick={() => switchTheme()}>
        {theme === 'light' ? <Sun className="text-blue-500" /> : <Moon className="text-blue-500" />}
      </Button>
      <Button size="sm" variant="ghost" className="p-2" title={t('common.switchLang')} onClick={() => switchLang()}>
        {lang === 'zh' ? <LuLanguages className="text-blue-500" /> : <RiEnglishInput className="text-blue-500" />}
      </Button>
      <Link to="/">
        <Button size="sm" variant="ghost" className="p-2" title={t('doc.backToHome')}>
          <House className="text-gray-500" />
        </Button>
      </Link>
    </div>
  );
};

export default FooterActions;

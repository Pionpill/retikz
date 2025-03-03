import { Typography } from '@/components/ui/typography';
import { useState } from 'react';

const RetikzTitle = () => {
  const [expand, setExpand] = useState(false);

  return (
    <div onMouseEnter={() => setExpand(true)} onMouseLeave={() => setExpand(false)}>
      {expand ? (
        <>
          <Typography variant="header" className="text-cyan-600">
            react
          </Typography>
          <Typography variant="header"> + </Typography>
          <Typography variant="header" className="text-green-600">
            tikz
          </Typography>
        </>
      ) : (
        <Typography variant="header" className="text-sky-600">
          retikz
        </Typography>
      )}
    </div>
  );
};

export default RetikzTitle;

import { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onTick?: () => void;
}

export function Typewriter({ text, speed = 18, onComplete, onTick }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('');
  const idxRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    idxRef.current = 0;
    setDisplayed('');

    const interval = setInterval(() => {
      idxRef.current++;
      if (idxRef.current > text.length) {
        clearInterval(interval);
        onCompleteRef.current?.();
        return;
      }
      setDisplayed(text.slice(0, idxRef.current));
      onTickRef.current?.();
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <>{displayed}</>;
}

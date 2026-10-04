import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

/** Smoothly counts from the previous value to the new one (display only). */
export function CountUpText({
  value,
  format,
  duration = 900,
  style,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = Date.now();
    const origin = from.current;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = origin + (value - origin) * eased;
      setShown(cur);
      from.current = cur;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <Text style={style}>{format(shown)}</Text>;
}

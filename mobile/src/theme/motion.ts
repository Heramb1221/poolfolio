import { FadeIn } from 'react-native-reanimated';

/** Subtle staggered entrance: a short fade, delayed per index. */
export const enter = (i = 0) => FadeIn.duration(360).delay(Math.min(i, 10) * 45);
export const fade = (i = 0) => FadeIn.duration(320).delay(Math.min(i, 10) * 40);

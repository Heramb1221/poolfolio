import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { colors, fonts } from '../../theme/tokens';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props {
  data: number[];
  height?: number;
  color?: string;
  /** Render in white-on-dark mode (for the hero card). */
  onDark?: boolean;
  labels?: string[];
  formatValue?: (n: number) => string;
  onScrub?: (index: number | null) => void;
}

const PAD_Y = 14;

/** Catmull-Rom → cubic Bézier for a smooth, overshoot-free line. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({
  data,
  height = 140,
  color = colors.primary,
  onDark = false,
  labels,
  formatValue,
  onScrub,
}: Props) {
  const [w, setW] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const progress = useSharedValue(0);
  const wRef = useRef(0);
  const nRef = useRef(data.length);
  nRef.current = data.length;
  wRef.current = w;

  const stroke = onDark ? '#FFFFFF' : color;
  const gid = useMemo(() => `ag${Math.random().toString(36).slice(2, 8)}`, []);

  const pts = useMemo(() => {
    if (w === 0 || data.length === 0) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data.map((v, i) => ({
      x: data.length === 1 ? w / 2 : (i / (data.length - 1)) * w,
      y: PAD_Y + (1 - (v - min) / range) * (height - PAD_Y * 2),
    }));
  }, [data, w, height]);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [data, w, progress]);

  const clipProps = useAnimatedProps(() => ({ width: progress.value * w }));

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => handle(e.nativeEvent.locationX),
        onPanResponderMove: (e) => handle(e.nativeEvent.locationX),
        onPanResponderRelease: () => end(),
        onPanResponderTerminate: () => end(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function handle(x: number) {
    const n = nRef.current;
    const width = wRef.current;
    if (n < 2 || width === 0) return;
    const i = Math.max(0, Math.min(n - 1, Math.round((x / width) * (n - 1))));
    setActive(i);
    onScrub?.(i);
  }
  function end() {
    setActive(null);
    onScrub?.(null);
  }

  if (data.length === 0) return <View style={{ height }} />;

  const line = smoothPath(pts);
  const area = pts.length > 1 ? `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z` : '';
  const ap = active != null ? pts[active] : null;
  const gridColor = onDark ? 'rgba(255,255,255,0.14)' : colors.border;

  return (
    <View
      style={{ height }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      {...(data.length > 1 ? pan.panHandlers : {})}
    >
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={onDark ? 0.35 : 0.28} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
            <ClipPath id={`${gid}c`}>
              <AnimatedRect x={0} y={0} height={height} animatedProps={clipProps} />
            </ClipPath>
          </Defs>

          {[0.25, 0.5, 0.75].map((g) => (
            <Line key={g} x1={0} x2={w} y1={height * g} y2={height * g} stroke={gridColor} strokeDasharray="3 6" strokeWidth={1} />
          ))}

          {pts.length > 1 ? (
            <>
              <Path d={area} fill={`url(#${gid})`} clipPath={`url(#${gid}c)`} />
              <Path
                d={line}
                stroke={stroke}
                strokeWidth={2.6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#${gid}c)`}
              />
            </>
          ) : (
            <Line x1={0} x2={w} y1={height / 2} y2={height / 2} stroke={stroke} strokeWidth={2} strokeDasharray="4 6" />
          )}

          {ap ? (
            <>
              <Line x1={ap.x} x2={ap.x} y1={0} y2={height} stroke={stroke} strokeOpacity={0.5} strokeWidth={1} />
              <Circle cx={ap.x} cy={ap.y} r={8} fill={stroke} fillOpacity={0.2} />
              <Circle cx={ap.x} cy={ap.y} r={4.5} fill={onDark ? '#fff' : colors.surface} stroke={stroke} strokeWidth={2.5} />
            </>
          ) : pts.length > 0 ? (
            <Circle
              cx={pts[pts.length - 1].x - 6}
              cy={pts[pts.length - 1].y}
              r={4}
              fill={onDark ? '#fff' : colors.surface}
              stroke={stroke}
              strokeWidth={2.5}
            />
          ) : null}
        </Svg>
      ) : null}

      {ap && active != null ? (
        <View
          pointerEvents="none"
          style={[
            styles.tip,
            { left: Math.max(0, Math.min(w - 112, ap.x - 56)), backgroundColor: onDark ? 'rgba(255,255,255,0.95)' : colors.ink },
          ]}
        >
          <Text style={[styles.tipVal, { color: onDark ? colors.primaryDeep : colors.white }]}>
            {formatValue ? formatValue(data[active]) : String(data[active])}
          </Text>
          {labels?.[active] ? (
            <Text style={[styles.tipLabel, { color: onDark ? colors.ink2 : 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
              {labels[active]}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    top: -6,
    width: 112,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tipVal: { fontFamily: fonts.monoBold, fontSize: 12 },
  tipLabel: { fontFamily: fonts.sansMedium, fontSize: 10, marginTop: 1 },
});

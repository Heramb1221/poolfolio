# Poolfolio mobile — design system

Light, emerald, glass. All styling reads from `src/theme/tokens.ts`.

- Fonts: Space Grotesk (UI) + JetBrains Mono (all figures)
- Navigation: floating pill tab bar (`components/layout/FloatingTabBar`)
- Feedback: `useToast()` for results, `useConfirm()` for destructive/lifecycle confirmations (bottom sheet)
- Sheets: `components/feedback/BottomSheet` (drag handle, swipe to dismiss). Inside sheets, show errors inline (toasts render beneath native modals).
- Charts (react-native-svg + Reanimated): `AreaChart` (touch-scrub), `DonutChart`, `BarChart`
- Motion: subtle fades + press feedback only; honours system reduce-motion
- Money: display-only formatting in `theme/format.ts`. No accounting logic lives in the app; the dashboard hero only adds up server-computed `/pnl` totals.

Run: `npm install && npx expo start` (Expo Go compatible, no custom native code).

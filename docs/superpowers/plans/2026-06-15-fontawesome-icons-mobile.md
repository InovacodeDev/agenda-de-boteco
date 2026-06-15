# Font Awesome Icon Migration (Mobile) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `lucide-react-native` icons in `apps/mobile` with Font Awesome Free v7, behind a centralized type-safe `Icon` component, and use Font Awesome Brands for company logos (Apple, Google).

**Architecture:** Introduce `src/components/ui/Icon.tsx` exposing `<Icon name="..." variant? color? size? style? />`. A pure module `src/components/ui/iconMap.ts` holds the kebab-case → Font Awesome `IconDefinition` map (deep imports) and a `resolveIcon(name, variant)` function — the testable contract. All 16 call-sites migrate from direct Lucide imports to `<Icon />`. Lucide is removed at the end.

**Tech Stack:** Expo SDK 56, React Native 0.85, TypeScript strict, `@fortawesome/react-native-fontawesome@^1`, `@fortawesome/fontawesome-svg-core@^7`, `@fortawesome/free-{solid,regular,brands}-svg-icons@^7`, `react-native-svg@15.15.4` (already installed), Jest + jest-expo.

**Spec:** `docs/superpowers/specs/2026-06-15-fontawesome-icons-mobile-design.md`

---

## Key constraints discovered

- **Jest `testMatch` is `src/**/*.test.ts`** (NOT `.tsx`). No `@testing-library/react-native` / `react-test-renderer` installed; zero component tests exist. → The `Icon` contract is tested via a **pure `.ts` test** against `resolveIcon()` in `iconMap.ts`, not by rendering JSX. This matches AGENTS.md ("unit test for any new/modified utils, the strict source of truth for behavior").
- **`transformIgnorePatterns`** in `jest.config.js` lists `lucide-react-native` but not `@fortawesome/*`. Font Awesome packages ship ES modules — Jest must transpile them. → Task 1 adds `@fortawesome` to the allow-list.
- Color stays exactly as today: every call-site keeps passing `color={colors.X}` / `size={N}`. `Icon` forwards them to `FontAwesomeIcon`.
- Two-state icons (`star`, `heart`) drop Lucide's `fill=` and switch via `variant`: filled = `solid`, empty = `regular`.

## File structure

- **Create** `apps/mobile/src/components/ui/iconMap.ts` — kebab-case → `{ solid?, regular?, brands? }` map + `resolveIcon()`. Single source of truth for the icon set.
- **Create** `apps/mobile/src/components/ui/iconMap.test.ts` — contract tests for `resolveIcon()` and the full name set.
- **Create** `apps/mobile/src/components/ui/Icon.tsx` — thin presentational wrapper over `FontAwesomeIcon`.
- **Modify** `apps/mobile/jest.config.js` — allow `@fortawesome` in `transformIgnorePatterns`.
- **Modify** `apps/mobile/package.json` — add FA deps; remove `lucide-react-native` (last task).
- **Modify** 16 call-site files (Tasks 4–9) to use `<Icon />`.

---

## Task 1: Add Font Awesome dependencies + Jest transform allow-list

**Files:**
- Modify: `apps/mobile/package.json` (dependencies)
- Modify: `apps/mobile/jest.config.js:11-13`

- [ ] **Step 1: Install Font Awesome packages (from repo root, pnpm, scoped to mobile)**

Run:
```bash
cd /Users/titorm/git/agenda-de-boteco && pnpm --filter ./apps/mobile add \
  @fortawesome/fontawesome-svg-core@^7 \
  @fortawesome/react-native-fontawesome@^1 \
  @fortawesome/free-solid-svg-icons@^7 \
  @fortawesome/free-regular-svg-icons@^7 \
  @fortawesome/free-brands-svg-icons@^7
```
Expected: 5 packages added to `apps/mobile/package.json` dependencies. `react-native-svg@15.15.4` already present (peer satisfied).

- [ ] **Step 2: Allow `@fortawesome` packages through Jest's transform**

In `apps/mobile/jest.config.js`, the `transformIgnorePatterns` regex currently ends with `...|@agenda/.*))`. Add `|@fortawesome/.*` before the closing `))`:

```js
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-css|nativewind|lucide-react-native|zustand|@supabase/.*|@tanstack/.*|@agenda/.*|@fortawesome/.*))',
  ],
```

- [ ] **Step 3: Verify install + existing tests still pass**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm test`
Expected: PASS (all existing suites green; no new tests yet).

- [ ] **Step 4: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/jest.config.js && git commit -m "build(mobile): add Font Awesome free packages and jest transform"
```

---

## Task 2: Icon map + `resolveIcon` (TDD)

This is the heart of the abstraction and the tested contract. Build the map and the resolver test-first.

**Files:**
- Create: `apps/mobile/src/components/ui/iconMap.ts`
- Test: `apps/mobile/src/components/ui/iconMap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/components/ui/iconMap.test.ts`:

```ts
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { ICON_NAMES, resolveIcon } from './iconMap';

function isIconDefinition(value: unknown): value is IconDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'iconName' in value &&
    'prefix' in value &&
    'icon' in value
  );
}

describe('iconMap', () => {
  it('exposes the full set of names used across the app', () => {
    // Locks the contract: removing/renaming a name is a breaking change.
    expect([...ICON_NAMES].sort()).toEqual(
      [
        'apple',
        'arrow-left',
        'at',
        'bell',
        'calendar',
        'check',
        'chevron-right',
        'circle-info',
        'clock',
        'comment',
        'envelope',
        'google',
        'heart',
        'house',
        'location-arrow',
        'location-dot',
        'magnifying-glass',
        'music',
        'right-from-bracket',
        'share-nodes',
        'sliders',
        'star',
        'store',
        'ticket',
        'user',
        'wand-magic-sparkles',
        'xmark',
      ].sort(),
    );
  });

  it('resolves every name (default variant) to a valid FA IconDefinition', () => {
    for (const name of ICON_NAMES) {
      expect(isIconDefinition(resolveIcon(name))).toBe(true);
    }
  });

  it('resolves solid and regular variants for two-state icons', () => {
    expect(resolveIcon('heart', 'solid').prefix).toBe('fas');
    expect(resolveIcon('heart', 'regular').prefix).toBe('far');
    expect(resolveIcon('star', 'solid').prefix).toBe('fas');
    expect(resolveIcon('star', 'regular').prefix).toBe('far');
  });

  it('resolves brand icons with the fab prefix', () => {
    expect(resolveIcon('apple').prefix).toBe('fab');
    expect(resolveIcon('google').prefix).toBe('fab');
  });

  it('falls back to the available definition when a variant is missing', () => {
    // location-dot has only solid; asking for regular must not return undefined.
    expect(isIconDefinition(resolveIcon('location-dot', 'regular'))).toBe(true);
    expect(resolveIcon('location-dot', 'regular').prefix).toBe('fas');
  });

  it('returns the exact mapped FA icon for representative names', () => {
    expect(resolveIcon('magnifying-glass').iconName).toBe('magnifying-glass');
    expect(resolveIcon('location-dot').iconName).toBe('location-dot');
    expect(resolveIcon('xmark').iconName).toBe('xmark');
    expect(resolveIcon('right-from-bracket').iconName).toBe('right-from-bracket');
    expect(resolveIcon('wand-magic-sparkles').iconName).toBe('wand-magic-sparkles');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm test iconMap`
Expected: FAIL — `Cannot find module './iconMap'`.

- [ ] **Step 3: Write the implementation**

Create `apps/mobile/src/components/ui/iconMap.ts` (deep imports for tree-shaking):

```ts
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faApple } from '@fortawesome/free-brands-svg-icons/faApple';
import { faGoogle } from '@fortawesome/free-brands-svg-icons/faGoogle';
import { faBell as faBellRegular } from '@fortawesome/free-regular-svg-icons/faBell';
import { faCalendar as faCalendarRegular } from '@fortawesome/free-regular-svg-icons/faCalendar';
import { faClock as faClockRegular } from '@fortawesome/free-regular-svg-icons/faClock';
import { faComment as faCommentRegular } from '@fortawesome/free-regular-svg-icons/faComment';
import { faEnvelope as faEnvelopeRegular } from '@fortawesome/free-regular-svg-icons/faEnvelope';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons/faHeart';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons/faStar';
import { faUser as faUserRegular } from '@fortawesome/free-regular-svg-icons/faUser';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faAt } from '@fortawesome/free-solid-svg-icons/faAt';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faCalendar } from '@fortawesome/free-solid-svg-icons/faCalendar';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faComment } from '@fortawesome/free-solid-svg-icons/faComment';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons/faEnvelope';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faHouse } from '@fortawesome/free-solid-svg-icons/faHouse';
import { faLocationArrow } from '@fortawesome/free-solid-svg-icons/faLocationArrow';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons/faLocationDot';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';
import { faMusic } from '@fortawesome/free-solid-svg-icons/faMusic';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons/faRightFromBracket';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons/faShareNodes';
import { faSliders } from '@fortawesome/free-solid-svg-icons/faSliders';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faStore } from '@fortawesome/free-solid-svg-icons/faStore';
import { faTicket } from '@fortawesome/free-solid-svg-icons/faTicket';
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons/faWandMagicSparkles';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';

export type IconVariant = 'solid' | 'regular' | 'brands';

interface IconEntry {
  solid?: IconDefinition;
  regular?: IconDefinition;
  brands?: IconDefinition;
}

const ICON_MAP = {
  'apple': { brands: faApple },
  'arrow-left': { solid: faArrowLeft },
  'at': { solid: faAt },
  'bell': { solid: faBell, regular: faBellRegular },
  'calendar': { solid: faCalendar, regular: faCalendarRegular },
  'check': { solid: faCheck },
  'chevron-right': { solid: faChevronRight },
  'circle-info': { solid: faCircleInfo },
  'clock': { solid: faClock, regular: faClockRegular },
  'comment': { solid: faComment, regular: faCommentRegular },
  'envelope': { solid: faEnvelope, regular: faEnvelopeRegular },
  'google': { brands: faGoogle },
  'heart': { solid: faHeart, regular: faHeartRegular },
  'house': { solid: faHouse },
  'location-arrow': { solid: faLocationArrow },
  'location-dot': { solid: faLocationDot },
  'magnifying-glass': { solid: faMagnifyingGlass },
  'music': { solid: faMusic },
  'right-from-bracket': { solid: faRightFromBracket },
  'share-nodes': { solid: faShareNodes },
  'sliders': { solid: faSliders },
  'star': { solid: faStar, regular: faStarRegular },
  'store': { solid: faStore },
  'ticket': { solid: faTicket },
  'user': { solid: faUser, regular: faUserRegular },
  'wand-magic-sparkles': { solid: faWandMagicSparkles },
  'xmark': { solid: faXmark },
} satisfies Record<string, IconEntry>;

export type IconName = keyof typeof ICON_MAP;

export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[];

/**
 * Resolve a kebab-case name + optional variant to a Font Awesome icon.
 * If the requested variant is absent, falls back deterministically to the
 * entry's available definition (brands → solid → regular), guaranteeing a
 * valid IconDefinition for every registered name.
 */
export function resolveIcon(name: IconName, variant: IconVariant = 'solid'): IconDefinition {
  const entry = ICON_MAP[name];
  const chosen =
    entry[variant] ?? entry.brands ?? entry.solid ?? entry.regular;
  // Every entry has at least one definition; the map type guarantees this.
  return chosen as IconDefinition;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm test iconMap`
Expected: PASS (all assertions green).

- [ ] **Step 5: Typecheck**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/src/components/ui/iconMap.ts apps/mobile/src/components/ui/iconMap.test.ts && git commit -m "feat(mobile): add Font Awesome icon map with resolveIcon contract"
```

---

## Task 3: `Icon` component

Thin wrapper over `FontAwesomeIcon`. No new test file (rendering not covered by current Jest setup; the contract lives in `iconMap.test.ts`). It must typecheck and lint.

**Files:**
- Create: `apps/mobile/src/components/ui/Icon.tsx`

- [ ] **Step 1: Write the component**

Create `apps/mobile/src/components/ui/Icon.tsx`:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { StyleProp, TextStyle } from 'react-native';

import { type IconName, type IconVariant, resolveIcon } from './iconMap';

export interface IconProps {
  /** kebab-case name from the centralized icon map. */
  name: IconName;
  /** `solid` (default), `regular` (outline), or `brands` (logos). */
  variant?: IconVariant;
  /** Icon color; pass a value from `@/theme/colors`. */
  color?: string;
  /** Square size in px. */
  size?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Centralized icon. Isolates the icon library: swapping or extending the
 * icon set only touches `iconMap.ts`. Call-sites reference icons by name.
 */
export function Icon({ name, variant, color, size, style }: IconProps) {
  return (
    <FontAwesomeIcon icon={resolveIcon(name, variant)} color={color} size={size} style={style} />
  );
}
```

> Note: `@fortawesome/react-native-fontawesome` ships its own types; no `@types/...` needed. The `style` prop is accepted by `FontAwesomeIcon`.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm lint`
Expected: no errors for `Icon.tsx` (fix import order if ESLint complains).

- [ ] **Step 4: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/src/components/ui/Icon.tsx && git commit -m "feat(mobile): add centralized Icon component over Font Awesome"
```

---

## Task 4: Migrate simple single-icon call-sites

Straightforward one-or-two icon swaps with no state logic. Each: remove the `lucide-react-native` import, add `import { Icon } from '@/components/ui/Icon';`, replace JSX.

**Files:**
- Modify: `apps/mobile/app/filters.tsx:2,77`
- Modify: `apps/mobile/app/city.tsx:2,44,69`
- Modify: `apps/mobile/src/components/layout/ScreenHeader.tsx:3,49`
- Modify: `apps/mobile/src/components/feed/SearchBar.tsx:2,19,35`
- Modify: `apps/mobile/src/components/feed/FeedHeader.tsx:3,31`
- Modify: `apps/mobile/src/components/ui/GradientBadge.tsx:2,18`

- [ ] **Step 1: `filters.tsx`** — replace `import { X } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace `<X color={colors.mutedForeground} size={20} />` with `<Icon name="xmark" color={colors.mutedForeground} size={20} />`.

- [ ] **Step 2: `city.tsx`** — replace `import { Check, MapPin } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace `<MapPin color={colors.foreground} size={16} />` with `<Icon name="location-dot" color={colors.foreground} size={16} />`; replace `<Check color={colors.primary} size={18} />` with `<Icon name="check" color={colors.primary} size={18} />`.

- [ ] **Step 3: `ScreenHeader.tsx`** — replace `import { ArrowLeft } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace `<ArrowLeft color={colors.foreground} size={20} />` with `<Icon name="arrow-left" color={colors.foreground} size={20} />`.

- [ ] **Step 4: `SearchBar.tsx`** — replace `import { Search, SlidersHorizontal } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace `<Search color={colors.mutedForeground} size={18} />` with `<Icon name="magnifying-glass" color={colors.mutedForeground} size={18} />`; replace `<SlidersHorizontal color={colors.foreground} size={18} />` with `<Icon name="sliders" color={colors.foreground} size={18} />`.

- [ ] **Step 5: `FeedHeader.tsx`** — replace `import { MapPin } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace `<MapPin color={colors.primary} size={14} />` with `<Icon name="location-dot" color={colors.primary} size={14} />`.

- [ ] **Step 6: `GradientBadge.tsx`** — replace `import { Sparkles } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace `<Sparkles color={colors.primaryForeground} size={12} />` with `<Icon name="wand-magic-sparkles" color={colors.primaryForeground} size={12} />`.

- [ ] **Step 7: Typecheck + lint**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck && pnpm lint`
Expected: no errors. (No `lucide-react-native` import remains in these 6 files.)

- [ ] **Step 8: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/app/filters.tsx apps/mobile/app/city.tsx apps/mobile/src/components/layout/ScreenHeader.tsx apps/mobile/src/components/feed/SearchBar.tsx apps/mobile/src/components/feed/FeedHeader.tsx apps/mobile/src/components/ui/GradientBadge.tsx && git commit -m "refactor(mobile): migrate simple icon call-sites to Icon component"
```

---

## Task 5: Migrate `onboarding.tsx`

**Files:**
- Modify: `apps/mobile/app/onboarding.tsx:3,78,79,80,87`

- [ ] **Step 1: Swap import**

Replace `import { MapPin, Music, Sparkles } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`.

- [ ] **Step 2: Replace JSX**

- `<Music color={colors.primary} size={20} />` → `<Icon name="music" color={colors.primary} size={20} />`
- `<Sparkles color={colors.primary} size={20} />` → `<Icon name="wand-magic-sparkles" color={colors.primary} size={20} />`
- `<MapPin color={colors.primary} size={20} />` (FeatureCard) → `<Icon name="location-dot" color={colors.primary} size={20} />`
- `<MapPin color={colors.primaryForeground} size={16} />` (Button) → `<Icon name="location-dot" color={colors.primaryForeground} size={16} />`

- [ ] **Step 3: Typecheck + lint**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/app/onboarding.tsx && git commit -m "refactor(mobile): migrate onboarding icons to Icon component"
```

---

## Task 6: Migrate `login.tsx` (incl. Google brand logo)

Google stops being the text `"G"` and becomes the brand icon. Apple/Mail/Info migrate too.

**Files:**
- Modify: `apps/mobile/app/login.tsx:4,120,145,154,175,202,223`

- [ ] **Step 1: Swap import**

Replace `import { Apple, Info, Mail } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`.

- [ ] **Step 2: Replace JSX**

- Info (line 120): `<Info color={colors.accent} size={18} />` → `<Icon name="circle-info" color={colors.accent} size={18} />`
- Google button icon (line 145): replace `icon={<Text className="font-body-bold text-primary-foreground text-[15px]">G</Text>}` with `icon={<Icon name="google" size={18} />}`. The button is `variant="white"` (white background), so the multicolor Google logo reads correctly; no `color` prop so FA renders the icon's intrinsic paths.
- Apple button icon (line 154): `<Apple color={colors.foreground} size={16} />` → `<Icon name="apple" color={colors.foreground} size={16} />`
- Mail (line 175): `<Mail color={colors.primaryForeground} size={16} />` → `<Icon name="envelope" variant="regular" color={colors.primaryForeground} size={16} />`
- Mail (line 202): `<Mail color={colors.primaryForeground} size={16} />` → `<Icon name="envelope" variant="regular" color={colors.primaryForeground} size={16} />`
- Mail (line 223): `<Mail color={colors.foreground} size={16} />` → `<Icon name="envelope" variant="regular" color={colors.foreground} size={16} />`

> The `import { useEffect, useState } from 'react';` stays. The `Text` import from `@/tw` stays (still used elsewhere in the file).

- [ ] **Step 3: Typecheck + lint**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/app/login.tsx && git commit -m "refactor(mobile): migrate login icons and Google logo to Font Awesome"
```

---

## Task 7: Migrate tab bar `_layout.tsx` and `NotificationCard.tsx`

Both pass dynamic `color`. The tab bar passes `color`/`size` from the navigator; `NotificationCard` picks color by read/unread.

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx:2,31,38,45,52,59`
- Modify: `apps/mobile/src/components/notification/NotificationCard.tsx:2,16,18,20,22`

- [ ] **Step 1: `_layout.tsx` — swap import**

Replace `import { Bell, Heart, House, MapPin, User } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`.

- [ ] **Step 2: `_layout.tsx` — replace tabBarIcon callbacks**

- `tabBarIcon: ({ color, size }) => <House color={color} size={size} />` → `<Icon name="house" color={color} size={size} />`
- `<MapPin color={color} size={size} />` → `<Icon name="location-dot" color={color} size={size} />`
- `<Heart color={color} size={size} />` → `<Icon name="heart" variant="regular" color={color} size={size} />`
- `<Bell color={color} size={size} />` → `<Icon name="bell" variant="regular" color={color} size={size} />`
- `<User color={color} size={size} />` → `<Icon name="user" variant="regular" color={color} size={size} />`

- [ ] **Step 3: `NotificationCard.tsx` — swap import**

Replace `import { Heart, MapPin, Music, Sparkles } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Keep `import { memo, type ReactNode } from 'react';` (still used for `ReactNode` return type).

- [ ] **Step 4: `NotificationCard.tsx` — replace `iconFor` returns**

Inside `iconFor` (lines 14-23):

```tsx
  switch (type) {
    case 'style':
      return <Icon name="music" color={color} size={18} />;
    case 'city':
      return <Icon name="location-dot" color={color} size={18} />;
    case 'favorite':
      return <Icon name="heart" variant="regular" color={color} size={18} />;
    case 'promo':
      return <Icon name="wand-magic-sparkles" color={color} size={18} />;
  }
```

- [ ] **Step 5: Typecheck + lint**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add "apps/mobile/app/(tabs)/_layout.tsx" apps/mobile/src/components/notification/NotificationCard.tsx && git commit -m "refactor(mobile): migrate tab bar and notification icons to Icon component"
```

---

## Task 8: Migrate `RatingStars`, `favorites`, `profile`

Includes the `Star` (always filled → `variant="solid"`) and `Heart` cases.

**Files:**
- Modify: `apps/mobile/src/components/ui/RatingStars.tsx:1,17`
- Modify: `apps/mobile/app/(tabs)/favorites.tsx:3,88`
- Modify: `apps/mobile/app/(tabs)/profile.tsx:2,21,103,106,114,117,127`

- [ ] **Step 1: `RatingStars.tsx`**

Replace `import { Star } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace `<Star color={colors.accent} fill={colors.accent} size={14} />` with `<Icon name="star" variant="solid" color={colors.accent} size={14} />` (the `fill` prop is dropped; solid star is intrinsically filled).

- [ ] **Step 2: `favorites.tsx`**

Replace `import { Heart } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`. Replace the empty-state icon `<Heart color={colors.mutedForeground} size={32} />` with `<Icon name="heart" variant="regular" color={colors.mutedForeground} size={32} />` (empty-state = outline).

- [ ] **Step 3: `profile.tsx` — swap import**

Replace `import { ChevronRight, Heart, LogOut, MapPin, User } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`.

- [ ] **Step 4: `profile.tsx` — replace JSX**

- `<User color={colors.mutedForeground} size={28} />` (SignedOut avatar) → `<Icon name="user" variant="regular" color={colors.mutedForeground} size={28} />`
- `<Heart color={colors.primary} size={18} />` (menu row "Meus favoritos") → `<Icon name="heart" variant="solid" color={colors.primary} size={18} />`
- `<ChevronRight color={colors.mutedForeground} size={16} />` (after Heart row) → `<Icon name="chevron-right" color={colors.mutedForeground} size={16} />`
- `<MapPin color={colors.primary} size={18} />` (menu row "Mudar cidade") → `<Icon name="location-dot" color={colors.primary} size={18} />`
- `<ChevronRight color={colors.mutedForeground} size={16} />` (after MapPin row) → `<Icon name="chevron-right" color={colors.mutedForeground} size={16} />`
- `<LogOut color={colors.destructive} size={16} />` → `<Icon name="right-from-bracket" color={colors.destructive} size={16} />`

- [ ] **Step 5: Typecheck + lint**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Run RatingStars-related tests (regression on rating display)**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm test format`
Expected: PASS (`formatRating` contract unchanged; this confirms nothing in the rating pipeline regressed).

- [ ] **Step 7: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/src/components/ui/RatingStars.tsx "apps/mobile/app/(tabs)/favorites.tsx" "apps/mobile/app/(tabs)/profile.tsx" && git commit -m "refactor(mobile): migrate rating, favorites and profile icons to Icon component"
```

---

## Task 9: Migrate detail screens + `EventCard` (stateful Heart)

The favorite `Heart` uses `fill={isFavorite ? primary : 'transparent'}` → becomes `variant={isFavorite ? 'solid' : 'regular'}` with `color` always set.

**Files:**
- Modify: `apps/mobile/src/components/event/EventCard.tsx:3,90-94,115,120,127,132`
- Modify: `apps/mobile/app/establishment/[id].tsx:2,155,160,166,220,227,240,247-252`
- Modify: `apps/mobile/app/event/[id].tsx:2-11,141,146,153,158,189,197,208,213-219`

- [ ] **Step 1: `EventCard.tsx` — swap import**

Replace `import { Calendar, Clock, Heart, MapPin, Ticket } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`.

- [ ] **Step 2: `EventCard.tsx` — replace JSX**

- Favorite heart (lines 90-94):
```tsx
              <Icon
                name="heart"
                variant={isFavorite ? 'solid' : 'regular'}
                color={isFavorite ? colors.primary : colors.foreground}
                size={18}
              />
```
- `<Calendar color={colors.primary} size={14} />` → `<Icon name="calendar" variant="regular" color={colors.primary} size={14} />`
- `<MapPin color={colors.primary} size={14} />` → `<Icon name="location-dot" color={colors.primary} size={14} />`
- `<Clock color={colors.primary} size={14} />` → `<Icon name="clock" variant="regular" color={colors.primary} size={14} />`
- `<Ticket color={colors.primary} size={14} />` → `<Icon name="ticket" color={colors.primary} size={14} />`

- [ ] **Step 3: `establishment/[id].tsx` — swap import**

Replace `import { AtSign, Clock, Heart, MapPin, MessageCircle, Navigation, Share2 } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`.

- [ ] **Step 4: `establishment/[id].tsx` — replace JSX**

- `<MapPin color={colors.primary} size={13} />` → `<Icon name="location-dot" color={colors.primary} size={13} />`
- `<Clock color={colors.mutedForeground} size={13} />` → `<Icon name="clock" variant="regular" color={colors.mutedForeground} size={13} />`
- `<AtSign color={colors.primary} size={13} />` → `<Icon name="at" color={colors.primary} size={13} />`
- `<MessageCircle color={colors.primaryForeground} size={16} />` → `<Icon name="comment" variant="regular" color={colors.primaryForeground} size={16} />`
- `<Navigation color={colors.foreground} size={16} />` → `<Icon name="location-arrow" color={colors.foreground} size={16} />`
- `<Share2 color={colors.foreground} size={18} />` → `<Icon name="share-nodes" color={colors.foreground} size={18} />`
- Favorite heart (lines 247-252):
```tsx
              icon={
                <Icon
                  name="heart"
                  variant={isFavorite ? 'solid' : 'regular'}
                  color={isFavorite ? colors.primary : colors.foreground}
                  size={18}
                />
              }
```

- [ ] **Step 5: `event/[id].tsx` — swap import**

Replace the multi-line `import { Calendar, Clock, Heart, MapPin, Navigation, Share2, Store, Ticket } from 'lucide-react-native';` with `import { Icon } from '@/components/ui/Icon';`.

- [ ] **Step 6: `event/[id].tsx` — replace JSX**

- `<Calendar color={colors.mutedForeground} size={13} />` → `<Icon name="calendar" variant="regular" color={colors.mutedForeground} size={13} />`
- `<Clock color={colors.mutedForeground} size={13} />` → `<Icon name="clock" variant="regular" color={colors.mutedForeground} size={13} />`
- `<MapPin color={colors.mutedForeground} size={13} />` → `<Icon name="location-dot" color={colors.mutedForeground} size={13} />`
- `<Ticket color={colors.mutedForeground} size={13} />` → `<Icon name="ticket" color={colors.mutedForeground} size={13} />`
- `<Navigation color={colors.foreground} size={16} />` → `<Icon name="location-arrow" color={colors.foreground} size={16} />`
- `<Store color={colors.primaryForeground} size={16} />` → `<Icon name="store" color={colors.primaryForeground} size={16} />`
- `<Share2 color={colors.foreground} size={18} />` → `<Icon name="share-nodes" color={colors.foreground} size={18} />`
- Favorite heart (lines 213-219):
```tsx
              icon={
                <Icon
                  name="heart"
                  variant={isFavorite ? 'solid' : 'regular'}
                  color={isFavorite ? colors.primary : colors.foreground}
                  size={18}
                />
              }
```

- [ ] **Step 7: Typecheck + lint**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/src/components/event/EventCard.tsx "apps/mobile/app/establishment/[id].tsx" "apps/mobile/app/event/[id].tsx" && git commit -m "refactor(mobile): migrate detail screens and event card icons to Font Awesome"
```

---

## Task 10: Remove Lucide + final verification

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/jest.config.js:11-13` (drop `lucide-react-native` from allow-list)

- [ ] **Step 1: Confirm no Lucide imports remain**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && grep -rn "lucide-react-native" src app`
Expected: **no output** (exit code 1). If any line prints, migrate it before continuing.

- [ ] **Step 2: Remove the dependency**

Run: `cd /Users/titorm/git/agenda-de-boteco && pnpm --filter ./apps/mobile remove lucide-react-native`
Expected: `lucide-react-native` removed from `apps/mobile/package.json`.

- [ ] **Step 3: Drop Lucide from Jest transform allow-list**

In `apps/mobile/jest.config.js`, remove `lucide-react-native|` from the `transformIgnorePatterns` regex (it's no longer a dependency). Keep `@fortawesome/.*` added in Task 1.

- [ ] **Step 4: Full verification — typecheck, lint, tests**

Run:
```bash
cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm typecheck && pnpm lint && pnpm test
```
Expected: all green. `iconMap` suite passes; existing suites unaffected.

- [ ] **Step 5: Commit**

```bash
cd /Users/titorm/git/agenda-de-boteco && git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/jest.config.js && git commit -m "chore(mobile): remove lucide-react-native after Font Awesome migration"
```

---

## Task 11: Smoke-test in the running app

Static checks can't confirm icons actually render (deep-import subpath resolution under Metro, brand multicolor, outline vs solid). Verify visually.

- [ ] **Step 1: Start the app**

Run: `cd /Users/titorm/git/agenda-de-boteco/apps/mobile && pnpm dev`
Expected: Metro bundles with no "icon not found" errors and no subpath resolution errors for `@fortawesome/free-*-svg-icons/faXxx`.

> If deep-import subpaths fail under Metro, the isolated fallback is in `iconMap.ts` only: change deep imports to named imports, e.g. `import { faStar } from '@fortawesome/free-solid-svg-icons';`. Call-sites are unaffected.

- [ ] **Step 2: Visually confirm key screens**

Check, on device/simulator:
- Feed: EventCard footer icons (calendar/clock outline, location-dot, ticket) + heart toggles solid/outline on favorite.
- Search bar: magnifying-glass + sliders.
- Tab bar: house / location-dot / heart / bell / user, active (green) vs inactive (gray).
- Login: **Google logo** renders (multicolor on white button), Apple logo, envelope.
- Establishment & Event detail: share-nodes, location-arrow, comment, at, store; favorite heart fills.
- Rating stars are amber and filled.
- Onboarding & GradientBadge: wand-magic-sparkles renders.

- [ ] **Step 2 (alt): Use the `verify` skill** to drive the app and capture screenshots if a simulator is available.

---

## Self-review notes (author)

- **Spec coverage:** every icon in the spec's mapping table has a task (Tasks 4–9 cover all 16 files; Task 2 registers all 27 names incl. both `apple`/`google` brands and solid+regular two-state). Package add/remove + Jest config (spec "Pacotes a adicionar" / "remover lucide") = Tasks 1 & 10. Centralized `Icon` + name API + colors-unchanged (spec "Componente Icon") = Tasks 2 & 3. Tests (spec "Testes") = Task 2's `iconMap.test.ts`. Out-of-scope web untouched.
- **Type consistency:** `IconName`, `IconVariant`, `resolveIcon`, `ICON_NAMES`, `ICON_MAP` names are identical across Tasks 2, 3 and the test. `Icon` props (`name`, `variant`, `color`, `size`, `style`) match every call-site usage in Tasks 4–9.
- **No placeholders:** every code step shows the exact code; every run step shows the command + expected result.
- **Note on test approach:** the spec proposed `Icon.test.tsx` (component render). Adjusted to `iconMap.test.ts` because the repo's Jest `testMatch` is `.ts`-only and has no RN render library — testing `resolveIcon` covers the same contract (name/variant → correct icon) within existing infra, satisfying AGENTS.md's "unit test for utils as source of truth".

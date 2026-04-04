# Xevora Mobile

React Native mobile app for Xevora workforce management platform built with Expo.

## Tech Stack

- **Expo SDK 54** with Expo Router for file-based routing
- **TypeScript** (strict mode)
- **NativeWind** for Tailwind CSS styling
- **Supabase** for backend and authentication
- **React Native SVG** for custom graphics
- **Expo Location** for GPS tracking
- **Expo Notifications** for push notifications
- **Expo Secure Store** for secure credential storage

## Project Structure

```
xevora-mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (driver)/          # Driver role screens
│   │   ├── _layout.tsx    # Tab navigation
│   │   ├── index.tsx      # Home/Dashboard
│   │   ├── clock.tsx      # Clock in/out
│   │   ├── timecard.tsx   # Timecard view
│   │   ├── pay.tsx        # Pay information
│   │   └── vault.tsx      # Tax vault
│   ├── (admin)/           # Admin role screens
│   │   ├── _layout.tsx
│   │   ├── index.tsx      # Dashboard
│   │   ├── workers.tsx    # Workers list
│   │   └── settings.tsx   # Settings
│   └── _layout.tsx        # Root layout with auth gating
├── components/            # Reusable components
│   ├── HexLogo.tsx       # Animated hex logo
│   ├── StatusBadge.tsx   # Status indicators
│   └── ClientChip.tsx    # Client badges
├── lib/                   # Core libraries
│   ├── supabase.ts       # Supabase client
│   ├── auth.ts           # Authentication helpers
│   ├── payroll.ts        # Payroll calculations
│   └── gps.ts            # GPS utilities
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts        # Authentication state
│   ├── useShift.ts       # Active shift tracking
│   └── usePayPeriod.ts   # Pay period data
├── constants/
│   └── theme.ts          # Design tokens
└── .env                   # Environment variables

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Configure environment variables in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start the development server:
```bash
npm start
```

4. Run on a platform:
```bash
npm run ios      # iOS Simulator (Mac only)
npm run android  # Android Emulator
npm run web      # Web browser
```

## Design System

### Colors
- **Background**: `#03060D` (bg)
- **Surface**: `#060B14` (surface)
- **Card**: `#0A1628` (card)
- **Primary**: `#2563EB` (primary)
- **Bright**: `#3B82F6` (bright)
- **Success**: `#22C55E` (success)
- **Warning**: `#F59E0B` (warning)
- **Danger**: `#EF4444` (danger)
- **Text**: `#F1F5FF` (text)
- **Muted**: `#4E6D92` (muted)

### Typography
- **Heading**: Plus Jakarta Sans 800 (ExtraBold)
- **Body**: Plus Jakarta Sans 400 (Regular)
- **Body Medium**: Plus Jakarta Sans 500 (Medium)
- **Mono**: JetBrains Mono 400 (Regular)

## Key Features

### Authentication
- Email/password sign-in with Supabase
- Role-based routing (driver vs admin)
- Secure session management with AsyncStorage

### Driver Features
- **Home**: Active shift overview and weekly summary
- **Clock**: GPS-verified clock in/out with geofencing
- **Timecard**: View shifts and hours for pay periods
- **Pay**: Pay history and current period earnings
- **Vault**: Tax savings automation for 1099 contractors

### Admin Features
- **Dashboard**: Company-wide metrics and active workers
- **Workers**: Worker list and management
- **Settings**: Account and app configuration

### Real-time Updates
- Supabase Realtime for instant shift updates
- Live shift timer on home screen
- Automatic refresh on data changes

## Development Guidelines

### Code Style
- **Strict TypeScript** - No `any` types
- **Safe Area Views** - Use `SafeAreaView` from `react-native-safe-area-context`
- **Keyboard Avoiding** - Use `KeyboardAvoidingView` on input screens
- **FlatList** - Use `FlatList` for all scrollable lists (not ScrollView with map)
- **No Deprecated APIs** - Use latest Expo SDK 52+ APIs only

### Performance
- Skeleton UIs for loading states
- Inline retry for error states
- No blank white screens
- Optimized re-renders with proper memoization

### Styling
- Use StyleSheet.create() for all styles
- Follow theme.ts design tokens
- Dark mode by default (userInterfaceStyle: "dark")
- Consistent spacing and typography

## Deployment

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## License

Proprietary - Xevora.IO

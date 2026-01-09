# CloudFire Cloud Mining App - Design Guidelines

## Design Approach
**System-Based with Crypto Aesthetic Enhancement**
This crypto mining dashboard follows a dark-mode utility application pattern inspired by modern fintech and crypto platforms (Binance, Coinbase Pro). The design emphasizes data visibility, quick actions, and gamified progression through the mining machine levels.

## Core Design Elements

### Typography
- **Headings**: Inter or Poppins (Bold/Semibold) - clean, modern sans-serif
  - H1: 2xl to 3xl (Dashboard title, "CloudFire")
  - H2: xl to 2xl (Section headers: "Mining Machines", "Payments")
  - H3: lg to xl (Machine levels: "M1", "M2")
- **Body**: Inter (Regular/Medium)
  - Base: text-sm to text-base (Stats, descriptions)
  - Small: text-xs (Helper text, timestamps)
- **Numbers/Stats**: Font variant tabular-nums for consistent alignment
- **CTAs**: Semibold weight for all buttons

### Color Palette
- **Backgrounds**: 
  - Primary: Navy Blue (#0F172A, #1E293B)
  - Secondary: Darker Navy (#020617)
  - Cards: #1E293B with subtle blue tint
- **Accents**:
  - Primary Blue: #3B82F6 to #60A5FA (buttons, highlights)
  - Gold: #F59E0B to #FBBF24 (premium features, profits, active states)
  - Success Green: #10B981 (positive metrics)
  - Alert Red: #EF4444 (withdrawal, important actions)
- **Text**: White (#FFFFFF), Gray-300 (#D1D5DB) for secondary text

### Layout System
**Spacing**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Small gaps/padding: p-2, p-4
- Section spacing: p-6, p-8
- Large containers: py-8, py-12

**Container Strategy**:
- Max-width: max-w-7xl for desktop
- Mobile-first: Full-width containers with px-4 padding
- Cards: Consistent rounded-lg or rounded-xl with backdrop-blur effects

## Component Library

### Authentication Pages (Login/Signup)
- **Layout**: Centered card (max-w-md) on gradient navy background
- **Form Fields**: Dark inputs with blue focus rings, white text
- **Submit Button**: Full-width gradient blue-to-blue, gold hover state
- **Branding**: CloudFire logo/text at top with flame icon (gold)
- **Footer Link**: "Don't have an account?" toggle between login/signup

### Dashboard - Hero Section
**Central Mining Button**:
- Large circular button (200-300px diameter) with pulsing glow animation
- Gradient fill (blue to gold)
- Text: "START MINING" or "MINING..." with countdown
- 24-hour countdown timer displayed below button (text-2xl, gold color)
- Surround with subtle particle effects or border glow

**Floating Coin Bubbles**:
- Position at top of dashboard, floating SVG/animated coin icons
- 5-8 coins of varying sizes
- Gentle float animation (up/down, drift)
- Gold and blue colors
- Semi-transparent

**Stats Display**:
- Two prominent cards side-by-side (or stacked mobile):
  - "Total Assets": Large number (3xl) in gold, PKR label
  - "Miners": Count with miner icon, blue accent
- Glass-morphism effect (backdrop-blur, semi-transparent background)

### Mining Machines Section
**List Layout**:
- Vertical scrollable list of 10 machine cards
- Each card: rounded-lg, dark background, blue left border
- Progressive visual enhancement: M1 simple, M10 most ornate with gold accents

**Machine Card Structure**:
- Left: Machine icon/badge with level (M1-M10)
- Center: 
  - Machine name/level (bold)
  - Cost in PKR (white)
  - Daily profit in gold/green with arrow-up icon
- Right: "Rent" button (blue for affordable, disabled gray for locked)
- Locked machines: Show lock icon, display cost in dimmed state

**Visual Hierarchy**:
- M1-M3: Blue accents
- M4-M7: Blue-gold gradient accents
- M8-M10: Predominantly gold accents, glowing effects

### Payments Section
**Deposit Card**:
- Title: "Add Funds"
- Display EasyPaisa/JazzCash logos
- Large, copyable number: 03425809569
- "Copy Number" button (blue, with copy icon)
- Instructions: "Send payment and upload screenshot"
- Upload button for payment proof

**Withdraw Card**:
- Display available balance (large gold text)
- Minimum withdrawal notice
- Input field for amount
- "Request Withdrawal" button (red/orange for urgency)
- Status indicator for pending withdrawals

### Navigation
- Bottom tab bar (mobile) or left sidebar (desktop)
- Icons: Dashboard, Machines, Payments, Profile
- Active state: Blue with gold underline/highlight
- Badge indicators for notifications

## Animation Guidelines
**Minimal & Purposeful**:
- Mining button: Subtle pulse/glow when active
- Coin bubbles: Gentle float
- Card hover: Slight scale (scale-105) and shadow increase
- Button press: scale-95 active state
- No scroll-triggered animations
- Loading states: Simple spinner, no elaborate sequences

## Images
**No hero images required.** This is a dashboard app focused on functionality. Use:
- Icon library: Heroicons for UI elements
- Custom coin/mining SVG icons (simple geometric designs)
- Machine icons: Abstract geometric shapes representing increasing complexity (M1 simple triangle, M10 complex hexagon with details)

## Mobile Responsiveness
- Stack cards vertically on mobile
- Mining button scales to 150-180px on small screens
- Bottom navigation for mobile, sidebar for desktop (lg:)
- Touch-friendly button sizes (min 44px height)
- Swipeable machine list on mobile

**Critical**: Maintain data hierarchy on mobile - all information visible without horizontal scroll. Use collapsible sections if needed for machine details.
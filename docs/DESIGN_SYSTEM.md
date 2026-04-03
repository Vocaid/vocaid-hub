# Design System — Vocaid Hybrid Resource Allocation

**Purpose:** Visual and component specifications for the Mini App UI
**Used by:** Wave 2 Agent 7 (Marketplace UI), Wave 4 Agent 13 (Polish)
**Framework:** Next.js 15 + Tailwind CSS 4 + World MiniKit 2.0

---

## Color Palette

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0F172A` | Headers, primary text, nav |
| `primary-accent` | `#3B82F6` | Links, active states, CTAs |
| `secondary` | `#64748B` | Secondary text, labels |
| `background` | `#FFFFFF` | Page background |
| `surface` | `#F8FAFC` | Cards, elevated surfaces |
| `border` | `#E2E8F0` | Dividers, card borders |

### Chain Colors (One per chain — used in badges and indicators)

| Chain | Color | Hex | Usage |
|-------|-------|-----|-------|
| World | Blue | `#3B82F6` | World ID verified badges, trust indicators |
| 0G | Green | `#10B981` | GPU verification, compute indicators |
| Arc | Violet | `#8B5CF6` | USDC payments, prediction markets |

### Status Colors

| Status | Hex | Usage |
|--------|-----|-------|
| Verified | `#10B981` | TEE attestation passed, World ID verified |
| Pending | `#F59E0B` | Awaiting verification, transaction pending |
| Failed | `#EF4444` | Attestation failed, blocked by Shield |
| Inactive | `#94A3B8` | Offline provider, expired |

### Tailwind Config Extension

```javascript
// tailwind.config.ts — extend the MiniKit template defaults
{
  theme: {
    extend: {
      colors: {
        chain: {
          world: '#3B82F6',
          og: '#10B981',
          arc: '#8B5CF6',
        },
        status: {
          verified: '#10B981',
          pending: '#F59E0B',
          failed: '#EF4444',
          inactive: '#94A3B8',
        },
      },
    },
  },
}
```

---

## Typography

| Level | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| H1 | 24px (1.5rem) | Bold (700) | System (Inter via Tailwind) | Page titles |
| H2 | 20px (1.25rem) | Semibold (600) | System | Section headers |
| H3 | 16px (1rem) | Semibold (600) | System | Card titles |
| Body | 14px (0.875rem) | Regular (400) | System | Content text |
| Caption | 12px (0.75rem) | Regular (400) | System | Labels, metadata |
| Mono | 13px (0.8125rem) | Regular (400) | JetBrains Mono / monospace | Addresses, hashes, chain data |

---

## Component Library

**Use Tailwind CSS utility classes directly.** No external component library (shadcn/ui, Radix) — keeps bundle small for Mini App performance inside World App.

### Core Components to Build

| Component | Location | Description |
|-----------|----------|-------------|
| `ResourceCard` | `components/ResourceCard.tsx` | Unified card for human, GPU, agent resources. Shows identity, reputation, chain badge |
| `ChainBadge` | `components/ChainBadge.tsx` | Small colored pill showing World/0G/Arc origin |
| `ReputationBar` | `components/ReputationBar.tsx` | Horizontal bar (0-100) with color gradient |
| `VerificationStatus` | `components/VerificationStatus.tsx` | Icon + text for TEE/World ID status |
| `PredictionCard` | `components/PredictionCard.tsx` | Market question, yes/no pools, odds, bet button |
| `PaymentConfirmation` | `components/PaymentConfirmation.tsx` | USDC amount, gas-free badge, tx hash |
| `AgentCard` | `components/AgentCard.tsx` | Agent identity, role (Seer/Edge/Shield/Lens), ERC-8004 ID |

---

## Layout Constraints

### World App Viewport

| Constraint | Value |
|------------|-------|
| Safe area top | MiniKit handles via CSS env() |
| Max width | 428px (mobile-first, World App is mobile) |
| Bottom nav | Reserve 60px for World App bottom bar |
| Touch targets | Minimum 44x44px (Apple HIG) |
| Font minimum | 14px body (readability on mobile) |

### Page Structure

```
┌─────────────────────────┐
│  Header (app name)      │  48px
├─────────────────────────┤
│  Tab Navigation         │  44px
│  [Marketplace][GPU][Predict][My]
├─────────────────────────┤
│                         │
│  Content Area           │  flex-1, scrollable
│  (cards, forms, etc.)   │
│                         │
├─────────────────────────┤
│  World App Bottom Bar   │  60px (reserved)
└─────────────────────────┘
```

### Navigation Tabs

| Tab | Route | Content | Agent |
|-----|-------|---------|-------|
| Marketplace | `/` | Browse all resources (humans, GPUs, agents) | Agent 7 (Wave 2) |
| GPU Verify | `/gpu-verify` | Provider verification portal | Agent 5 (Wave 2) |
| Predictions | `/predictions` | Resource prediction markets | Agent 10 (Wave 3) |
| Profile | `/profile` | World ID status, my resources, agent fleet | Agent 13 (Wave 4) |

---

## Iconography

Use **Lucide React** icons (`npm install lucide-react`). No emojis as UI icons — looks unprofessional to judges.

```bash
npm install lucide-react  # ~30KB gzipped, tree-shakeable
```

| Meaning | Lucide Icon | Import |
|---------|-------------|--------|
| World Chain / World ID | `Globe` | `import { Globe } from 'lucide-react'` |
| 0G Chain / Compute | `Zap` | `import { Zap } from 'lucide-react'` |
| Arc / USDC / Payments | `CircleDollarSign` | `import { CircleDollarSign } from 'lucide-react'` |
| Verified | `ShieldCheck` | `import { ShieldCheck } from 'lucide-react'` |
| Seer agent | `Eye` | `import { Eye } from 'lucide-react'` |
| Reputation score | `BarChart3` | `import { BarChart3 } from 'lucide-react'` |
| GPU provider | `Cpu` | `import { Cpu } from 'lucide-react'` |
| AI agent | `Bot` | `import { Bot } from 'lucide-react'` |
| Human resource | `User` | `import { User } from 'lucide-react'` |
| Prediction market | `TrendingUp` | `import { TrendingUp } from 'lucide-react'` |

All icons: `className="w-5 h-5"` (20px) for cards, `className="w-4 h-4"` (16px) for badges.

## Screen Flow

See `SCREEN_FLOW.md` for complete screen-by-screen specifications, architecture communication map, component-to-chain mapping, UX gap analysis, and demo timing budget.

---

## Dark Mode

**Not for hackathon.** Light mode only. Keeps scope minimal. MiniKit template defaults to light.

---

## Responsive Breakpoints

**Mobile-only.** World App is a mobile application. No tablet or desktop breakpoints needed. Design everything at 375-428px width.

---

## Accessibility Minimum

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | All text passes WCAG AA (4.5:1 ratio) — palette above is pre-checked |
| Touch targets | 44x44px minimum on all interactive elements |
| Focus indicators | Tailwind `focus:ring-2 focus:ring-primary-accent` |
| Screen reader | Semantic HTML (`<nav>`, `<main>`, `<button>`) |

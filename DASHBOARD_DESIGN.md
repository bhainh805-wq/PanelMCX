# Minecraft Server Dashboard UI Design

## Overview

A modern, dark-themed dashboard for managing and monitoring a Minecraft server. The design emphasizes clarity, visual hierarchy, and real-time feedback using a sophisticated black color palette with vibrant accent colors.

## Design Philosophy

### Color Theory

The dashboard follows a **modern black theme** with carefully selected accent colors that provide:

1. **High Contrast**: All text and UI elements maintain WCAG AAA contrast ratios against the black background
2. **Visual Hierarchy**: Color coding helps users quickly understand server states and metrics
3. **Depth & Dimension**: Subtle gradients and shadows create a layered, premium feel
4. **Accessibility**: Color choices work for users with various forms of color vision deficiency

### Color Palette

#### Base Colors
- **Primary Background**: `#000000` (Pure Black)
- **Secondary Background**: `#0a0a0a` to `#1a1a1a` (Near Black with subtle variations)
- **Surface**: `#171717` to `#262626` (Neutral grays for cards)

#### Accent Colors

**Status Indicators:**
- 🟢 **Online/Success**: `#10b981` (Emerald 500) - Vibrant green for active states
- 🔴 **Offline/Error**: `#ef4444` (Red 500) - Clear red for inactive/error states
- 🟡 **Warning/Starting**: `#f59e0b` (Amber 500) - Warm amber for transitional states
- 🟠 **Stopping**: `#f97316` (Orange 500) - Orange for shutdown processes
- ⚪ **Neutral/Loading**: `#737373` (Neutral 500) - Gray for unknown states

**Performance Metrics:**
- 💙 **CPU Usage**: `#3b82f6` (Blue 500) - Cool blue for processor metrics
- 💠 **RAM Usage**: `#06b6d4` (Cyan 500) - Bright cyan for memory metrics
- 💜 **Connection Info**: `#8b5cf6` (Violet 500) - Purple for network information

#### Glow Effects
Each accent color includes a corresponding glow/shadow effect at 20-50% opacity to create depth and draw attention to interactive elements.

---

## Component Architecture

### 1. StatusCard Component

**Purpose**: Display current server status with color-coded indicators

**Features**:
- Real-time status updates (Online, Offline, Starting, Stopping)
- Color-coded status badges with animated pulse effects
- Uptime display in HH:MM:SS format
- Smooth transitions between states
- Contextual status descriptions

**Color Coding**:
- **Online**: Emerald gradient background with green glow
- **Offline**: Red gradient background with red glow
- **Starting**: Amber gradient background with yellow glow (pulsing)
- **Stopping**: Orange gradient background with orange glow (pulsing)
- **Checking**: Neutral gradient with gray glow (pulsing)

**Visual Elements**:
- Gradient backgrounds: `from-{color}-950/80 to-{color}-900/40`
- Border: `border-{color}-500/40`
- Shadow: `shadow-{color}-500/30`
- Animated pulse for transitional states

---

### 2. ControlButtons Component

**Purpose**: Provide prominent, accessible controls for server management

**Features**:
- Large, touch-friendly buttons (minimum 44x44px touch target)
- Gradient backgrounds with hover effects
- Loading states with animated spinners
- Disabled states with clear visual feedback
- Glow effects on hover

**Button Styles**:

**Start Button** (Enabled):
- Background: `from-emerald-600 to-emerald-500`
- Hover: `from-emerald-500 to-emerald-400`
- Shadow: `shadow-emerald-500/30` → `shadow-emerald-500/50` on hover
- Icon: Play symbol (filled)

**Stop Button** (Enabled):
- Background: `from-red-600 to-red-500`
- Hover: `from-red-500 to-red-400`
- Shadow: `shadow-red-500/30` → `shadow-red-500/50` on hover
- Icon: Square symbol (filled)

**Disabled State**:
- Background: `bg-neutral-900`
- Text: `text-neutral-600`
- Border: `border-neutral-800`
- Cursor: `cursor-not-allowed`

**Animations**:
- Scale on hover: `scale-1.02`
- Scale on tap: `scale-0.98`
- Shimmer effect: Animated gradient overlay on hover

---

### 3. PerformanceGraphs Component

**Purpose**: Visualize server resource usage in real-time

**Features**:
- Dual graphs for RAM and CPU usage
- Real-time line charts with 30-second history
- Current value display with percentage/unit
- Progress bars for quick visual reference
- Min/Avg/Max statistics
- Graceful handling of offline state

**Graph Styling**:

**RAM Usage** (Cyan Theme):
- Line color: `stroke-cyan-400`
- Fill gradient: `fill-cyan-500/20`
- Progress bar: `bg-cyan-500` with `shadow-cyan-500/50`
- Text: `text-cyan-400`

**CPU Usage** (Blue Theme):
- Line color: `stroke-blue-400`
- Fill gradient: `fill-blue-500/20`
- Progress bar: `bg-blue-500` with `shadow-blue-500/50`
- Text: `text-blue-400`

**Chart Features**:
- SVG-based line charts with smooth curves
- Grid lines at 0%, 25%, 50%, 75%, 100%
- Data points highlighted with circles
- Responsive scaling
- Automatic data point limiting (max 30 points)

---

### 4. ServerInfoCard Component

**Purpose**: Display connection information for Java and Bedrock editions

**Features**:
- Copy-to-clipboard functionality
- Visual feedback on copy action
- Server status indicator
- Responsive layout
- Graceful handling of missing configuration

**Styling**:
- Violet theme: `from-violet-950/80 to-violet-900/40`
- Border: `border-violet-500/40`
- Glow: `shadow-violet-500/30`
- Icons: Server and Globe icons from Lucide

**Interactive Elements**:
- Copy button with hover state
- Check icon feedback on successful copy
- Disabled state for unconfigured IPs

---

### 5. DashboardLayout Component

**Purpose**: Orchestrate all dashboard components in a cohesive layout

**Features**:
- Responsive grid layout (1 column mobile, 3 columns desktop)
- Background ambient effects (colored blur orbs)
- Error alert system
- Animated component entrance
- Footer with system information

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│ Header (Title + Icon)                   │
├─────────────────────────────────────────┤
│ Error Alert (conditional)               │
├──────────────┬──────────────────────────┤
│ StatusCard   │ ControlButtons           │
│              ├──────────────────────────┤
│ ServerInfo   │ PerformanceGraphs        │
│              │ (RAM + CPU)              │
└──────────────┴──────────────────────────┘
│ Footer Info                             │
└─────────────────────────────────────────┘
```

**Background Effects**:
- Three colored blur orbs (emerald, cyan, violet)
- Positioned strategically for visual interest
- Low opacity (10%) to avoid distraction
- Fixed positioning with pointer-events-none

---

## Animation & Transitions

### Entrance Animations
All components use Framer Motion for smooth entrance:
- **Initial**: `opacity: 0, y: 20`
- **Animate**: `opacity: 1, y: 0`
- **Duration**: 0.5s with staggered delays

### State Transitions
- **Pulse Animation**: Used for loading/transitional states
- **Scale Transforms**: Buttons scale on hover/tap
- **Color Transitions**: Smooth 300ms transitions between states
- **Progress Bars**: Animated width changes with 500ms duration

### Micro-interactions
- **Hover Effects**: Scale, glow, and color shifts
- **Copy Feedback**: Icon swap with 2-second timeout
- **Loading Spinners**: Smooth rotation animation
- **Status Badges**: Pulsing animation for active states

---

## Responsive Design

### Breakpoints
- **Mobile**: < 768px (1 column layout)
- **Tablet**: 768px - 1024px (2 column layout)
- **Desktop**: > 1024px (3 column layout)

### Mobile Optimizations
- Larger touch targets (minimum 44x44px)
- Stacked button layout
- Simplified graph displays
- Reduced padding and margins
- Font size adjustments

### Desktop Enhancements
- Multi-column grid layout
- Larger graph areas
- More detailed statistics
- Enhanced hover effects

---

## Accessibility Features

### WCAG Compliance
- **Contrast Ratios**: All text meets WCAG AAA standards (7:1 minimum)
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Keyboard Navigation**: Full keyboard support for all controls
- **Screen Readers**: Semantic HTML and ARIA labels

### Color Blindness Considerations
- Status indicators use both color AND text/icons
- Graphs include numerical values alongside visual representation
- Multiple visual cues for state changes (color, animation, text)

### Motion Preferences
- Respects `prefers-reduced-motion` media query
- Animations can be disabled without losing functionality

---

## Performance Optimizations

### Rendering
- React.memo for expensive components
- Virtualized lists for large datasets
- Debounced state updates
- Efficient re-render strategies

### Data Management
- Limited data point history (30 points max)
- Automatic cleanup of old data
- Optimized WebSocket message handling
- Lazy loading of non-critical components

### Asset Optimization
- SVG icons (scalable, small file size)
- CSS gradients instead of images
- Minimal external dependencies
- Tree-shaking for unused code

---

## Technology Stack

### Core
- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety

### Styling
- **Tailwind CSS 4**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Custom CSS**: For complex animations

### Icons
- **Lucide React**: Modern icon library
- Consistent 24x24px base size
- Stroke-based for scalability

---

## File Structure

```
src/
├── components/
│   └── dashboard/
│       ├── StatusCard.tsx          # Server status display
│       ├── ControlButtons.tsx      # Start/Stop controls
│       ├── PerformanceGraphs.tsx   # RAM/CPU charts
│       ├── ServerInfoCard.tsx      # Connection info
│       ├── DashboardLayout.tsx     # Main layout orchestrator
│       └── index.ts                # Component exports
├── app/
│   ├── page.tsx                    # Main dashboard page
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
```

---

## Usage Example

```tsx
import { DashboardLayout } from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <DashboardLayout
      running={true}
      preparing={false}
      stopping={false}
      busy={false}
      error={null}
      statusReady={true}
      startServer={() => {}}
      stopServer={() => {}}
      setError={() => {}}
      uptimeSeconds={3600}
      javaIp="play.example.com"
      bedrockIp="bedrock.example.com"
    />
  );
}
```

---

## Future Enhancements

### Planned Features
- [ ] Player list with avatars
- [ ] Console log viewer
- [ ] Plugin management interface
- [ ] Backup/restore functionality
- [ ] Performance history charts (24h/7d/30d)
- [ ] Custom theme builder
- [ ] Mobile app (React Native)

### Potential Improvements
- [ ] WebGL-based performance graphs
- [ ] Real-time player activity heatmap
- [ ] Advanced filtering and search
- [ ] Customizable dashboard layouts
- [ ] Dark/Light theme toggle
- [ ] Internationalization (i18n)

---

## Contributing

When adding new components or modifying existing ones:

1. **Follow the color palette** defined in this document
2. **Maintain accessibility standards** (WCAG AAA)
3. **Use Framer Motion** for animations
4. **Add TypeScript types** for all props
5. **Test on multiple screen sizes**
6. **Document new features** in this README

---

## License

This dashboard design is part of the PanelMCX project.

---

## Credits

**Design & Development**: PanelMCX Team  
**Icons**: Lucide Icons  
**Animations**: Framer Motion  
**Framework**: Next.js + React  

---

*Last Updated: 2024*

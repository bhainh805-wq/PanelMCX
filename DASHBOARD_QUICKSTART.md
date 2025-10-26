# Dashboard Quick Start Guide

## 🚀 Overview

The PanelMCX Dashboard is a modern, black-themed UI for managing Minecraft servers. It features real-time monitoring, intuitive controls, and beautiful visualizations.

## 📦 What's Included

### Components

1. **StatusCard** - Shows server status with color-coded indicators
2. **ControlButtons** - Start/Stop server controls
3. **PerformanceGraphs** - Real-time RAM and CPU usage charts
4. **ServerInfoCard** - Connection information display
5. **DashboardLayout** - Main layout orchestrator

### Documentation

- **DASHBOARD_DESIGN.md** - Complete technical documentation
- **DASHBOARD_VISUAL_GUIDE.md** - Visual reference with ASCII diagrams
- **DASHBOARD_QUICKSTART.md** - This file

## 🎨 Key Features

### Color-Coded Status System
- 🟢 **Green** - Server online
- 🔴 **Red** - Server offline
- 🟡 **Amber** - Server starting
- 🟠 **Orange** - Server stopping
- ⚪ **Gray** - Status checking

### Real-Time Monitoring
- Live server status updates (3-second polling)
- Uptime tracking in HH:MM:SS format
- RAM usage graph (cyan theme)
- CPU usage graph (blue theme)
- Min/Avg/Max statistics

### Interactive Controls
- Large, accessible Start/Stop buttons
- Loading states with spinners
- Hover effects and animations
- Copy-to-clipboard for server IPs

## 🛠️ Installation

The dashboard is already integrated into the project. No additional installation needed!

## 💻 Usage

### Basic Implementation

The dashboard is automatically rendered on the home page (`src/app/page.tsx`):

```tsx
import { DashboardLayout } from '@/components/dashboard';

export default function Home() {
  // ... state management ...
  
  return (
    <DashboardLayout
      running={running}
      preparing={preparing}
      stopping={stopping}
      busy={busy}
      error={error}
      statusReady={statusReady}
      startServer={startServer}
      stopServer={stopServer}
      setError={setError}
      uptimeSeconds={uptimeSeconds}
      javaIp={javaIp}
      bedrockIp={bedrockIp}
    />
  );
}
```

### Using Individual Components

You can also use components individually:

```tsx
import { StatusCard, ControlButtons, PerformanceGraphs } from '@/components/dashboard';

// Use StatusCard alone
<StatusCard
  running={true}
  preparing={false}
  stopping={false}
  statusReady={true}
  uptimeSeconds={3600}
/>

// Use ControlButtons alone
<ControlButtons
  running={true}
  preparing={false}
  stopping={false}
  busy={false}
  statusReady={true}
  startServer={() => console.log('Start')}
  stopServer={() => console.log('Stop')}
/>

// Use PerformanceGraphs alone
<PerformanceGraphs running={true} />
```

## 🎯 Props Reference

### DashboardLayout Props

| Prop | Type | Description |
|------|------|-------------|
| `running` | `boolean` | Server is currently running |
| `preparing` | `boolean` | Server is starting up |
| `stopping` | `boolean` | Server is shutting down |
| `busy` | `boolean` | Operation in progress |
| `error` | `string \| null` | Error message to display |
| `statusReady` | `boolean` | Status has been fetched |
| `startServer` | `() => void` | Function to start server |
| `stopServer` | `() => void` | Function to stop server |
| `setError` | `(error: string \| null) => void` | Function to set error |
| `uptimeSeconds` | `number \| null` | Server uptime in seconds |
| `javaIp` | `string` | Java Edition server IP |
| `bedrockIp` | `string` | Bedrock Edition server IP |

## 🎨 Customization

### Changing Colors

Colors are defined using Tailwind CSS classes. To change a color:

1. Open the component file (e.g., `src/components/dashboard/StatusCard.tsx`)
2. Find the color class (e.g., `text-emerald-400`)
3. Replace with your desired color (e.g., `text-green-400`)

Example:
```tsx
// Before
<p className="text-emerald-400">Online</p>

// After (using a different green)
<p className="text-green-400">Online</p>
```

### Modifying Animations

Animations use Framer Motion. To adjust:

```tsx
// Change animation duration
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }} // Change this value
>
```

### Adjusting Layout

The layout uses CSS Grid. To modify:

```tsx
// In DashboardLayout.tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Change grid-cols-3 to adjust column count */}
</div>
```

## 📱 Responsive Design

The dashboard automatically adapts to different screen sizes:

- **Mobile** (< 768px): Single column layout
- **Tablet** (768px - 1024px): Two column layout
- **Desktop** (> 1024px): Three column layout

## ♿ Accessibility

The dashboard includes:

- **WCAG AAA** contrast ratios (7:1 minimum)
- **Keyboard navigation** for all interactive elements
- **Screen reader** support with ARIA labels
- **Focus indicators** on all buttons and links
- **Color + text/icons** for status (not color alone)

## 🔧 Troubleshooting

### Dashboard not updating
- Check WebSocket connection in browser console
- Verify API endpoints are responding
- Check network tab for failed requests

### Colors not showing correctly
- Ensure Tailwind CSS is properly configured
- Check `tailwind.config.ts` for color definitions
- Verify `globals.css` is imported

### Animations not working
- Ensure Framer Motion is installed: `npm install framer-motion`
- Check browser console for errors
- Verify component imports

### Performance issues
- Reduce graph data points (default: 30)
- Increase polling interval (default: 3s)
- Disable animations on low-end devices

## 📊 Performance Optimization

### Data Management
```tsx
// Limit data points in PerformanceGraphs
const MAX_DATA_POINTS = 30; // Reduce for better performance

// Adjust polling interval
const pollInterval = 3000; // Increase for less frequent updates
```

### Lazy Loading
```tsx
// Lazy load heavy components
const PerformanceGraphs = lazy(() => import('./PerformanceGraphs'));

<Suspense fallback={<LoadingSpinner />}>
  <PerformanceGraphs running={running} />
</Suspense>
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Server starts successfully
- [ ] Server stops successfully
- [ ] Status updates in real-time
- [ ] Uptime displays correctly
- [ ] Graphs update with new data
- [ ] Copy buttons work for IPs
- [ ] Error messages display properly
- [ ] Responsive on mobile/tablet/desktop
- [ ] Keyboard navigation works
- [ ] Animations are smooth

### Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📚 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Lucide Icons](https://lucide.dev/)

## 🤝 Contributing

When modifying the dashboard:

1. **Follow the color palette** defined in DASHBOARD_DESIGN.md
2. **Maintain accessibility** standards (WCAG AAA)
3. **Test on multiple devices** and browsers
4. **Update documentation** if adding new features
5. **Use TypeScript** for type safety
6. **Add comments** for complex logic

## 📝 Code Style

### Component Structure
```tsx
'use client';

import { motion } from 'framer-motion';
import { Icon } from 'lucide-react';

interface ComponentProps {
  // Props with JSDoc comments
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // State declarations
  // Effect hooks
  // Event handlers
  // Render logic
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="..."
    >
      {/* Component content */}
    </motion.div>
  );
}
```

### Naming Conventions
- **Components**: PascalCase (e.g., `StatusCard`)
- **Functions**: camelCase (e.g., `startServer`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_DATA_POINTS`)
- **CSS Classes**: kebab-case via Tailwind

## 🎓 Learning Path

1. **Start with** DASHBOARD_VISUAL_GUIDE.md for visual overview
2. **Read** DASHBOARD_DESIGN.md for technical details
3. **Explore** component files in `src/components/dashboard/`
4. **Experiment** with props and customization
5. **Build** your own components using the same patterns

## 🚨 Common Mistakes

### ❌ Don't
```tsx
// Don't use inline styles
<div style={{ color: 'green' }}>

// Don't hardcode colors
<div className="text-[#10b981]">

// Don't skip accessibility
<button onClick={handleClick}>
```

### ✅ Do
```tsx
// Use Tailwind classes
<div className="text-emerald-500">

// Use semantic color names
<div className="text-emerald-500">

// Include accessibility attributes
<button onClick={handleClick} aria-label="Start server">
```

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review component source code
3. Check browser console for errors
4. Open an issue on GitHub

## 🎉 Quick Wins

### Add a new status color
```tsx
// In StatusCard.tsx
else if (customStatus) {
  statusText = 'Custom';
  statusColor = 'text-purple-400';
  bgGradient = 'from-purple-950/80 to-purple-900/40';
  borderColor = 'border-purple-500/40';
  glowColor = 'shadow-purple-500/30';
}
```

### Change button text
```tsx
// In ControlButtons.tsx
<span>Launch Server</span> // Instead of "Start Server"
```

### Adjust graph colors
```tsx
// In PerformanceGraphs.tsx
const colors = {
  cyan: { /* ... */ },
  blue: { /* ... */ },
  purple: { // Add new color
    gradient: 'from-purple-950/80 to-purple-900/40',
    // ... other properties
  }
};
```

## 🎯 Next Steps

1. **Explore** the dashboard in your browser
2. **Read** the full documentation
3. **Customize** colors and layout to your preference
4. **Add** new features or components
5. **Share** your improvements!

---

**Happy coding! 🚀**

For detailed technical information, see [DASHBOARD_DESIGN.md](./DASHBOARD_DESIGN.md)  
For visual reference, see [DASHBOARD_VISUAL_GUIDE.md](./DASHBOARD_VISUAL_GUIDE.md)

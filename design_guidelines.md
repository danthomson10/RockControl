# Rock Control Design Guidelines

## Design Approach
**System-Based**: Material Design principles adapted for enterprise construction software, prioritizing clarity, efficiency, and mobile-first field operations.

## Brand Identity

### Logo & Lockup
- "ROCK" in Rock Red (#E23B2E) + "CONTROL" in Slate Dark (#3A3A3A)
- Tagline in small-case beneath the lockup
- Maintain clear space equivalent to the height of "ROCK"

### Color Palette
```
Primary: Rock Red #E23B2E (CTAs, active states, danger actions)
Neutral Dark: Slate Dark #3A3A3A (headings, navigation, primary text)
Neutral Mid: Mid Grey #777777 (secondary text, labels)
Neutral Light: Light Grey #E9ECEF (panels, table rows, dividers)
Background: Off-White #FAFBFC (page background)
Warning: Safety Orange #F59E0B (warnings, caution states)
Success: Success Green #16A34A (confirmations, completed states)
```

## Typography
**Font Family**: Inter (Google Fonts)

**Scale**:
- H1: 28px/36px line-height, font-weight 600
- H2: 22px/30px, font-weight 600
- H3: 18px/26px, font-weight 600
- Body: 16px/24px, font-weight 400
- Caption: 13px/18px, font-weight 400
- Use tabular numerals for all IDs, reference numbers, and data tables

## Layout System

**Spacing Units**: Tailwind scale of 2, 4, 6, 8, 12, 16, 20, 24 (p-2, p-4, gap-6, etc.)

**Container Strategy**:
- Desktop: max-w-7xl with px-6 padding
- Content areas: max-w-6xl
- Forms/cards: max-w-2xl for optimal readability

**Structure**:
- Sticky top bar (h-16) with tenant switcher, global search, Quick Add, offline badge, notifications, user menu
- Collapsible left sidebar (w-64 expanded, w-16 collapsed) with role-aware navigation
- Mobile: Sidebar transforms to drawer, optional bottom navigation bar for Field roles
- Main content area: bg-off-white with subtle padding

## Components

### Buttons
- Primary: bg-rock-red, text-white, px-6 py-3, rounded-lg, 44-48px min-height
- Secondary: bg-slate-dark, text-white
- Destructive: bg-neutral with confirmation modal (avoid instant red buttons)
- Disabled: 40% opacity
- Radii: 8-12px depending on component size

### Forms & Inputs
- Input fields: border, rounded-lg, px-4 py-3, min-height 44px
- Labels: text-sm font-medium text-slate-dark, mb-2
- Focus rings: 2px ring in rock-red at 50% opacity
- Error states: border-red-500, text-red-600 helper text

### Cards
- Background: white, rounded-xl, shadow-sm
- Padding: p-6
- Hover: shadow-md transition
- Table rows: alternating light-grey background

### Navigation
- Active state: bg-rock-red text-white
- Hover: bg-light-grey
- Icons: 20px Lucide icons, mr-3 spacing from labels

### Signatures & Approvals
- Signature canvas: border-2, border-dashed, min-h-48
- Approval badges: rounded-full, px-3 py-1, text-xs font-medium

## Accessibility
- WCAG AA contrast minimum 4.5:1
- Keyboard navigation support with visible focus rings
- Skip links for main content
- Reduced-motion option respects prefers-reduced-motion
- Touch targets: 44-48px minimum

## Images
- **Hero sections**: Not applicable for enterprise applications
- **Attachment previews**: Thumbnail grid (160px square) with zoom overlay
- **User avatars**: 32px round (navigation), 40px (forms), 64px (profiles)
- **Site photos**: Full-width when viewing, responsive grid in galleries

## Responsive Behavior
- Desktop (≥1024px): Full sidebar, multi-column layouts
- Tablet (768-1023px): Collapsed sidebar icons only, 2-column grids
- Mobile (<768px): Drawer navigation, single column, bottom nav for Field role, larger touch targets

## Motion & Interaction
- Minimal animations: drawer slide (200ms), dropdown fade (150ms)
- Loading states: subtle spinner (rock-red)
- No decorative animations, focus on immediate feedback
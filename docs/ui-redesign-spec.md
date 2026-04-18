# UI Redesign Spec — Stitch-Aligned Editorial

Screen-by-screen blueprint, component inventory, and implementation checklist.

## Feed Page (`/feed`)

### Layout
- Desktop: sidebar (270px) + main content grid
- Mobile: top header bar → stacked content

### Components
| Component | Purpose | Notes |
|-----------|---------|-------|
| `FeedPage` | Main client component | State management, API calls, rendering |
| `DesktopSidebar` | Sidebar nav | Brand, stats, nav links, personalization panel, theme toggle |
| `ArticleCard` | Individual article display | Image, rank/source badge, serif title, summary, why-recommended, feedback |
| `BriefProgressCard` | Loading state | Spinner + phase checklist |
| `FeedErrorCard` | Error state | Error message + retry button |
| `ConsentPrompt` | Policy consent | Accept/decline buttons |
| `ReadingHistory` | Recently read articles | Compact article list |
| `MobileInsights` | Collapsible accordion | Personalization stats on mobile |
| `SkeletonCard` | Loading placeholder | Flat surface with pulse animation |

### Dark/Light Behavior
- Article cards use `ds-surface-1` with border, `rounded-12px`
- Titles: `font-display`, `ds-text`, serif; Summaries: `ds-text-muted`, IBM Plex Sans
- Why-recommended block: `ds-accent-soft` background, `ds-accent` text
- Feedback buttons: `rounded-10px` with border
- Focus/active: dark gets aqua glow, light gets black outline

### Spacing
- Hero: horizontal padding 20px (mobile) → 24px (desktop)
- Between cards: 16px gap
- Card padding: 20px–24px

## Settings Page (`/settings`) ✅ COMPLETED

### Components
- `SettingsPage` with `PageShell`
- `SettingsSidebar`: brand + stats + nav + personalization + theme toggle
- `MetricCard`: stat tiles in hero and sidebar
- `ShellHero`: serif headline + description
- `ShellSoftCard`: section tabs pill row
- `ShellCard`: form sections (Profile, Appearance, Safari Import, Accounts, Brief Time, Topics, Privacy, Danger Zone)
- `TopicBadge`: topic preference pills with checkbox
- `ComingSoonCard`: placeholder for future integrations
- `DeleteAccountButton`: two-stage confirmation
- `SafariImportSection`: full upload/confirm/delete states
- `MiniStat`: compact stat display

### Details
- Dark mode: accent is aqua `#00f5e8`, glow on focus/active
- Light mode: accent is black `#111111`, outline on focus
- Section tracking: IntersectionObserver highlights current section in sidebar
- All form elements use `.ds-input`, `.ds-select`, `.ds-btn`, `.ds-btn-secondary`

## Privacy Page (`/privacy`) ✅ COMPLETED

### Components
- `PrivacySidebar`: brand, version info, quick nav links, contact card
- `PrivacyHero`: serif headline + stat tiles + description
- Document panel: flat border surface, serif section headings, muted prose
- Bordered tables with `ds-surface-2` header rows
- Inline code tokens in accent color

## Terms Page (`/terms`) ✅ COMPLETED

### Structure
Mirrors Privacy page pattern:
- `TermsSidebar`, `TermsHero`, document panel
- Same serif headings, muted prose, bordered tables
- Section anchors for internal nav links

## Loading/Progress States

### Brief Progress Card
- Surface: `ds-surface-1` with border, `rounded-12px`
- Spinner: `ds-accent` background with `ds-bg` color
- Phase checklist: checkmarks (green), spinners (aqua for current), empty circles (not started)
- Headline: `font-display`, `ds-text` color

## Implementation Order

- [x] 1. Lock tokens and typography (`globals.css` + `layout.tsx`)
- [x] 2. Rebuild PageShell surfaces (`page-shell.tsx`)
- [x] 3. Update ThemeToggle (`theme-toggle.tsx`)
- [x] 4. Redesign Settings page
- [x] 5. Redesign Privacy page
- [x] 6. Redesign Terms page
- [x] 7. Redesign Feed page
- [ ] 8. Redesign Landing page (`app/page.tsx`)
- [x] 9. Design system docs (`design-system.md`, `ui-redesign-spec.md`)
- [x] 10. README "UI Source of Truth" section

## QA Checklist
- [ ] Visual QA in both dark and light mode for: feed, settings, privacy, terms
- [ ] Serif display type appears only in headline/document roles
- [ ] Sidebar active states match new system (aqua glow dark, black outline light)
- [ ] Light mode remains high-contrast
- [ ] Dark mode glow is used sparingly and consistently
- [ ] Forms still submit (settings)
- [ ] Feed interactions still work
- [ ] Privacy/terms content and anchor links still work
- [ ] Theme switching works with new token system
- [ ] Responsive QA: desktop full width, tablet, mobile narrow widths

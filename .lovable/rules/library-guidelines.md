# Nippon  — Guidelines

## Components

The design system exports these components — import them from `@ws-52adc5b3e74ffb37dbcf/a5221ce4-14fe-4335-b8b1-3f32b1047cfe` and compose them before building anything from scratch:

`AnalyticsCharts`, `AuthProvider`, `Badge`, `Button`, `ChartContainer`, `ChartLegendContent`, `ChartLegend`, `ChartStyle`, `ChartTooltipContent`, `ChartTooltip`, `ChatAttachment`, `CompanyIdentity`, `CompanyListingCard`, `CompanyProfileEditor`, `Constants`, `Footer`, `ForgotPassword`, `Header`, `Input`, `Label`, `ListingCard`, `NotificationsBell`, `PresenceTracker`, `ProfitsAnalytics`, `SupportWhatsAppButton`, `TabsContent`, `TabsList`, `TabsTrigger`, `Tabs`, `Textarea`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-52adc5b3e74ffb37dbcf/a5221ce4-14fe-4335-b8b1-3f32b1047cfe/styles.css` (source — preferred import)
- `@ws-52adc5b3e74ffb37dbcf/a5221ce4-14fe-4335-b8b1-3f32b1047cfe/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)


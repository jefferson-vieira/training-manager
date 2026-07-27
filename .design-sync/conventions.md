# Training Manager — how to build with this system

A Portuguese-language (pt-BR) fitness/training app. Tailwind 4 + shadcn-style
primitives over Base UI. Write UI copy in **Portuguese**.

## Setup

No root provider is required — the design tokens are plain CSS custom properties
in `styles.css`, so components are styled as soon as that stylesheet is present.

Two exceptions:

- **`Tooltip` must be inside `TooltipProvider`.** Mount one near the top of the
  screen you build; without it the tooltip never opens.
- **Dark mode** is a class variant: put `class="dark"` on an ancestor (usually
  `<html>` or the screen's root). Every token has a dark value; `dark:` variants
  work too.

## Styling: Tailwind utilities over semantic tokens

Never hardcode a hex colour. Every colour comes from a semantic token, used as a
normal Tailwind utility — `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`:

| Token | Use for |
|---|---|
| `background` / `foreground` | page surface and its default text |
| `card` / `card-foreground` | raised panels |
| `popover` / `popover-foreground` | drawers, tooltips, menus |
| `primary` / `primary-foreground` | brand blue — main actions, active nav, progress |
| `secondary` / `secondary-foreground` | quiet buttons and chips |
| `muted` / `muted-foreground` | subdued surfaces and secondary text |
| `accent` / `accent-foreground` | hover/selected surfaces |
| `destructive` | errors and delete actions |
| `success` / `success-foreground` | completed workouts |
| `streak` | orange streak/consistency accent |
| `border` / `input` / `ring` | hairlines, field borders, focus rings |

Opacity suffixes are the house idiom for tinted surfaces: `bg-primary/8`,
`bg-foreground/40`, `text-background/70`. `destructive` is normally used tinted —
`bg-destructive/10 text-destructive` — not as a solid fill.

**Type**: `font-sans` (Inter) is the default body face. `font-heading`
(Inter Tight) is used for titles, metric values and weekday labels — reach for it
on anything numeric or headline-like. Radius scale is `rounded-sm|md|lg|xl|2xl|3xl|4xl`;
cards in this product are `rounded-xl`, sheets `rounded-3xl`.

Layout, spacing, grid and responsive utilities are ordinary Tailwind and are all
available (`flex`, `grid-cols-*`, `gap-*`, `p-*`, `max-w-*`, `sm:`/`md:`/`lg:`).
Mobile-first: this is a phone-shaped product — design at ~390px and let it widen.

## Components

Primitives: `Button`, `LinkButton`, `Badge`, `Input`, `Textarea`, `Avatar`,
`Drawer`, `Tooltip`, `ScrollArea`, `Spinner`, `Toaster`.

Domain components — prefer these over rebuilding their look:
`WorkoutCard` (switches on `isRest`), `WorkoutDayCard`, `WorkoutRestCard`,
`StatCard`, `ConsistencySquare`, `HeaderBanner`, `NavLink`.

Compounds are composed from exported subparts: `Avatar` + `AvatarImage` /
`AvatarFallback` / `AvatarBadge` / `AvatarGroup` / `AvatarGroupCount`;
`Drawer` + `DrawerTrigger` / `DrawerContent` / `DrawerHeader` / `DrawerTitle` /
`DrawerDescription` / `DrawerFooter` / `DrawerClose`;
`Tooltip` + `TooltipProvider` / `TooltipTrigger` / `TooltipContent`.
`Button` and `LinkButton` share one variant set, so a link styled as a button
matches exactly.

Base UI polymorphism: pass `render={<OtherElement/>}` instead of `asChild`.

## Where the truth is

Read `<Name>.d.ts` for the exact props and `<Name>.prompt.md` for usage before
composing. Token values live in `styles.css` and its imports.

## Idiomatic example

```jsx
<div className="flex flex-col gap-4 p-5">
  <div className="grid grid-cols-2 gap-3">
    <StatCard icon={Flame} label="Sequência atual" value="7 dias" />
    <StatCard icon={Dumbbell} label="Treinos no mês" value="18" />
  </div>

  <WorkoutCard
    href="/treinos/segunda"
    workoutDay={{
      name: 'Peito e Tríceps',
      weekDay: 'MONDAY',
      isRest: false,
      estimatedDurationInSeconds: 3600,
      exercisesCount: 8,
      coverImageUrl: cover,
    }}
  />

  <Button className="w-full" size="xl">
    <Play data-icon="inline-start" />
    Iniciar treino
  </Button>
</div>
```

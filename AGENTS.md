# AGENTS.md

# JABAL

You are working on the JABAL e-commerce website.

## Goal

Every change should improve one or more of these:

- Conversion rate
- Performance
- Code quality
- User experience
- Maintainability

Never make changes that reduce any of these.

---

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Vercel

Do not introduce another framework unless requested.

---

## Design Philosophy

JABAL is a premium minimalist clothing brand.

Prioritize:

- clean layouts
- generous spacing
- consistent typography
- smooth animations
- luxury appearance
- mobile-first design

Avoid:

- clutter
- unnecessary animations
- bright colors
- large borders
- inconsistent spacing

---

## Code Style

Write code that is:

- modular
- readable
- typed
- reusable

Prefer:

- small components
- composition
- custom hooks
- utility functions

Avoid:

- duplicated code
- giant files
- magic numbers
- unnecessary abstractions

---

## UI Rules

Maintain visual consistency.

Never invent new spacing values.

Reuse:

- colors
- typography
- buttons
- cards
- badges
- dialogs
- forms

before creating new ones.

---

## Components

Before creating a new component:

1. Search the project.
2. Reuse an existing component if possible.
3. Extend existing components before creating new ones.

---

## Database

Never modify:

- Supabase schema
- migrations
- RLS policies
- Edge Functions

without explicit permission.

Never delete data.

---

## Security

Never expose:

- service_role keys
- environment variables
- secrets
- API tokens

Always validate user input.

---

## Performance

Prefer:

- lazy loading
- memoization only when useful
- image optimization
- minimal bundle size

Avoid unnecessary dependencies.

---

## Dependencies

Before installing a package:

Ask whether an existing dependency already solves the problem.

Never install large libraries for simple tasks.

---

## Git

Keep changes focused.

One feature per commit.

Do not rewrite git history.

Never force push.

---

## Testing

After every task:

- check TypeScript
- check lint
- ensure build succeeds

If something fails:

Fix it before continuing.

---

## Images

For fashion pages:

Prioritize product imagery.

Maintain consistent image sizes.

Do not distort images.

Preserve brand colors.

---

## SEO

Never reduce SEO quality.

Preserve:

- metadata
- canonical URLs
- structured data
- Open Graph tags
- sitemap

---

## Admin Dashboard

Prioritize:

- clarity
- speed
- error prevention

Never remove confirmation dialogs for destructive actions.

---

## Orders

Keep payment status and fulfillment status independent.

Never assume payment means fulfillment.

---

## Customer Experience

Optimize for:

- fast checkout
- trust
- premium presentation
- clear error messages
- minimal clicks

---

## Before finishing

Always review:

- duplicate code
- dead code
- console logs
- unused imports
- unnecessary comments

Remove them if safe.

---

## If unsure

Read the existing code.

Match the existing architecture.

Choose the simplest solution.

Do not guess.

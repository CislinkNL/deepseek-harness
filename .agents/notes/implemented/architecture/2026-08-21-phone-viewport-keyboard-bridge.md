# Agent Note: Phone viewport — soft-keyboard bridge, send dismissal, and the settings sheet

Status: implemented

> Scope: the three phone-viewport behaviors of the browser client — keeping the composer visible above the on-screen keyboard, dismissing the keyboard after a touch Send, and the settings sheet's narrow-viewport layout. The narrow concession chain (sidebar drawer, rail hiding) predates this note and stays owned by AppFrame.

## Problem

On phones the soft keyboard covers the composer: browsers that keep the layout viewport full-height (iOS Safari) leave a `100%`-height frame reaching under the keyboard, so the input that started the gesture disappears behind it. After a touch Send the keyboard stays open over the reply stream, because the composer's `keepFocus` mousedown handler deliberately restores textarea focus for continuous desktop typing. Separately, the settings shell is a centered 800px two-column modal — on a phone viewport the 188px nav rail leaves the content column unreadable.

## Decision

- **Keyboard visibility is a layout fact, not a component concern.** `apps/web/index.html` sets `interactive-widget=resizes-content`, so Android Chrome resizes the layout viewport and the frame's `100%` height tracks the visible area. For browsers that do not resize the layout viewport, AppFrame mirrors the occluded height — `documentElement.clientHeight − visualViewport.height − visualViewport.offsetTop`, floored at zero — into `--dsh-keyboard-inset` on the frame root, and `.frame` computes `height: calc(100% − var(--dsh-keyboard-inset, 0px))`. The mechanisms compose: wherever the layout viewport already shrank, the inset is zero.
- **Send dismissal is a pointer-class fact.** `onPrimary` blurs the textarea only when `matchMedia('(hover: none) and (pointer: coarse)')` matches; hover pointers and matchMedia-less embedders keep focus. The guard sits inside the submit success path, not in `keepFocus`, so Stop and disabled presses never dismiss.
- **The settings phone sheet is a separate CSS Module applied by clsx.** `SettingsRoot.mobile.module.css` holds only `@media (max-width: 560px)` overrides (full-screen column panel, horizontal tab strip, edge padding); SettingsRoot merges it with the base classes. Desktop output is untouched because the file's rules exist only inside the query, and import order makes the merge deterministic. The team-task floating button uses the same breakpoint inline: pinned to the right edge, lifted clear of the stacked composer.

## Alternatives considered

**Per-element `scrollIntoView` on focus.** Scrolls the focused control into the visual viewport instead of resizing the frame. Lost: it must be repeated for every focusable surface (composer, docked panels, dialogs), fights the browser's own reveal heuristics on iOS, and leaves the frame's lower regions (queue dock, jobs strip) still covered.

**A fixed translation on the composer alone.** Cheaper than the frame inset but moves the composer out of its grid row: sticky positioning and the conversation scrollport then disagree about where the composer is, reintroducing exactly the divergence the shared-scrollport decision removed.

**Blurring unconditionally on Send.** One line, no media query — but desktop users lose focus after every message, breaking continuous typing for the primary input surface.

**A dedicated phone settings component.** Full freedom for the phone layout, but duplicates the shell's slot wiring, dialog semantics, and Escape handling; a media-query module keeps one component and one behavior tree.

## Consequences

One mechanism (the frame inset) serves every surface at the cost of shrinking the whole app rather than isolating the focused control. The inset applies instantly — no easing — because the keyboard itself already animates, and gating a transition on reduced-motion would buy nothing. The phone settings sheet keeps the modal dialog semantics (Escape, mask click, focus landing) rather than phone-native navigation. The 560px breakpoint matches the existing narrow-viewport precedent (onboarding dialogs, workflow panel) instead of introducing a phone-specific token.

## Testing

`packages/client/ui-layout/tests/app-frame.client.spec.tsx` drives a stubbed `visualViewport` through occlude → clear → unmount and asserts the inset property and listener teardown. `packages/client/ui-conversation/tests/input-bar.client.spec.tsx` covers both pointer classes: a coarse-pointer Send blurs the composer, a hover-pointer Send keeps focus. `pnpm run test:gui` and `DSH_SNAPSHOT=replay pnpm run test:web` stay green; replay lanes run at desktop width, so the phone branches are component-level.

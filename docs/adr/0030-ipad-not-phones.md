# 0030. The iPad is the device to fit; phones are not supported

- Status: Accepted
- Date: 2026-10-12

## Context

The plan listed "the phone layout" as not yet checked, and some layout work had allowed for a
narrow window. On 2026-10-12 the owner dropped phone support: the player is for the iPad, mainly,
and the PC.

## Decision

- The layouts to fit and judge are the iPad's (landscape and portrait) and the PC's window.
- Phones are not a target: no work, checks or tests for a phone-sized screen.

## Consequences

- Narrow-window code already in the page (the stacked pages under 760 px wide, the thinner frame)
  may stay as it is, but nothing is designed or fixed for it, and it may be removed when it gets in
  the way.
- "Fits" (clear of the page frame, no wrapping) is judged at iPad and PC sizes.

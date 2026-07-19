---
name: Ethos Precision
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#46464a'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#77767b'
  outline-variant: '#c7c6ca'
  surface-tint: '#5f5e60'
  primary: '#030304'
  on-primary: '#ffffff'
  primary-container: '#1d1d1f'
  on-primary-container: '#868587'
  inverse-primary: '#c8c6c8'
  secondary: '#5e5e63'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfe4'
  on-secondary-container: '#626267'
  tertiary: '#00030b'
  on-tertiary: '#ffffff'
  tertiary-container: '#001c41'
  on-tertiary-container: '#3b84eb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e2e4'
  primary-fixed-dim: '#c8c6c8'
  on-primary-fixed: '#1b1b1d'
  on-primary-fixed-variant: '#474649'
  secondary-fixed: '#e3e2e7'
  secondary-fixed-dim: '#c7c6cb'
  on-secondary-fixed: '#1a1b1f'
  on-secondary-fixed-variant: '#46464b'
  tertiary-fixed: '#d7e3ff'
  tertiary-fixed-dim: '#aac7ff'
  on-tertiary-fixed: '#001b3e'
  on-tertiary-fixed-variant: '#00458e'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 19px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-xs: 4px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
  stack-xl: 80px
---

## Brand & Style

The design system is rooted in the philosophy of "Invisible Excellence." It targets a sophisticated audience that values clarity, performance, and understated luxury. Drawing inspiration from high-end editorial layouts and premium hardware interfaces, the style is a fusion of **Modern Minimalism** and **Tonal Layering**.

The emotional response should be one of calm confidence. By prioritizing extreme white space (breathing room), intentional typographic scales, and a restrictive color palette, the UI feels expansive yet precise. There are no decorative elements; every line, gap, and shadow serves a functional purpose in establishing hierarchy. The aesthetic avoids the "flatness" of basic web design by using microscopic depth cues and razor-sharp execution.

## Colors

This design system utilizes a high-fidelity neutral palette to create a sense of timelessness. 

- **Primary (Deep Slate):** Used for all primary headings, body text, and high-emphasis icons. It is not pure black, allowing for a softer contrast against the off-white background.
- **Secondary (Soft Silver):** Reserved for metadata, captions, and inactive states.
- **Accent (Midnight Blue):** Used sparingly for primary actions, links, and active indicators. It should never overwhelm the layout.
- **Neutral (Off-white):** The foundational canvas color. 
- **Surface (White):** Used for elevated cards or containers to create a subtle "lift" from the background.
- **Border:** A hairline silver used for structural definition without adding visual weight.

## Typography

Typography is the primary engine of this design system. We use **Inter** for its systematic, utilitarian clarity and modern geometric construction.

- **Scale:** High contrast between Display and Body levels is encouraged to create a clear editorial path for the eye.
- **Tracking:** Headings use slight negative letter-spacing (-1% to -2%) to feel tighter and more premium. Small labels use positive tracking (+1% to +2%) to ensure legibility.
- **Weight:** Use `600` (Semi-bold) for emphasis and `400` (Regular) for readability in long-form text. Avoid `700` (Bold) to maintain the "light" premium feel.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model. Content is housed within a 1200px centered container on desktop, while margins and paddings scale fluidly on smaller viewports.

- **Grid:** A 12-column system is used for desktop, 8-column for tablet, and 4-column for mobile.
- **Spacing Rhythm:** Based on an 8px baseline. Use large vertical gaps (`stack-xl`) between major sections to emphasize the minimalist aesthetic. 
- **White Space:** Do not fear "empty" space. Padding within components should be generous (min 24px) to ensure no element feels crowded.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Micro-Shadows** rather than heavy blurs.

1.  **Level 0 (Base):** Off-white (#F5F5F7). The canvas.
2.  **Level 1 (Surface):** Pure White (#FFFFFF). Used for cards and secondary navigation bars. These should have a 1px border (#D2D2D7) or a very soft, large-radius shadow.
3.  **Shadows:** Use "Ambient Shadows"—multi-layered, low-opacity shadows. 
    *   *Example:* `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);`
4.  **Transitions:** Elevation changes (on hover) should be subtle, such as a slight shift in shadow density or a 1px vertical lift.

## Shapes

The shape language is controlled and geometric. 

- **Primary Radius:** 8px (`0.5rem`) for standard components like buttons, input fields, and small cards.
- **Secondary Radius:** 16px (`1rem`) for larger containers and modal overlays.
- **Stroke:** Use 1px "Hairline" borders. Avoid 2px or thicker strokes, as they break the precision aesthetic.

## Components

- **Buttons:** 
  - *Primary:* Deep Slate background, White text. 8px radius. No shadow.
  - *Secondary:* Ghost style with 1px Soft Silver border.
  - *Interaction:* Subtle opacity shift (0.9) on hover.
- **Input Fields:** Pure White background with 1px Soft Silver border. On focus, the border transitions to Midnight Blue or Deep Slate with no outer glow.
- **Chips/Tags:** Small 4px radius or fully rounded. Use Off-white backgrounds with Label-sm typography.
- **Cards:** White background, 16px radius, subtle ambient shadow. No borders preferred for cards on the Off-white background.
- **Lists:** Clean dividers using 1px Soft Silver at 50% opacity. Generous vertical padding (16px+).
- **Navigation:** Top-tier navigation should be clean, using Label-md typography with 32px spacing between items. Active states are indicated by a simple 2px bottom bar in Deep Slate or a weight change.
---
name: Editorial Pulse
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5b403e'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#906f6d'
  outline-variant: '#e4bdbb'
  surface-tint: '#bc1128'
  primary: '#97001b'
  on-primary: '#ffffff'
  primary-container: '#c0152a'
  on-primary-container: '#ffd2d0'
  inverse-primary: '#ffb3b0'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2e1'
  on-secondary-container: '#656464'
  tertiary: '#494949'
  on-tertiary: '#ffffff'
  tertiary-container: '#616161'
  on-tertiary-container: '#dedcdc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b0'
  on-primary-fixed: '#410006'
  on-primary-fixed-variant: '#93001a'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e4e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Lexend
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Lexend
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Lexend
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Lexend
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  section-gap: 80px
  content-gap: 24px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

This design system is built for a high-performance editorial environment where information density meets aesthetic clarity. The brand personality is authoritative, urgent, and precise—evoking the feeling of a premium newsroom or a specialized analytical journal. 

The visual style is a blend of **High-Contrast Minimalism**. It leverages massive typography and a restricted color palette to create an unmistakable hierarchy. By removing unnecessary ornamentation, the focus remains entirely on the content, using generous whitespace to allow complex stories to breathe. The result is a digital experience that feels as intentional and structured as a master-class in print layout, but with the responsiveness of modern SaaS.

## Colors

The palette is anchored by "Crimson Red," a high-energy primary color that signals urgency and importance. This is balanced against a stark, light background to maximize legibility and provide a premium, clean canvas.

- **Primary (Crimson Red):** Used for critical actions, highlights, and branding accents. It provides a sharp contrast against the light surface.
- **Surface:** A combination of pure white (#FFFFFF) for main content areas and a soft off-white (#FAFAFA) for background layers to reduce eye strain.
- **Text:** A deep off-black (#121212) is used for all primary communication to ensure the highest possible contrast and accessibility.
- **Accent:** Functional greys are used for borders and secondary metadata to maintain a monochromatic elegance.

## Typography

The typography in this design system utilizes **Lexend** across all levels. Lexend’s expanded character width and geometric clarity provide exceptional readability, making it ideal for information-heavy editorial platforms.

The hierarchy is strictly enforced through dramatic scale shifts. Display sizes use heavy weights and tight tracking for a bold, headline-driven impact. Body text utilizes ample line-height to ensure long-form articles remain comfortable to read. Labels and metadata use uppercase styling with increased letter spacing to provide a clear functional distinction from narrative content.

## Layout & Spacing

This design system employs a **12-column fluid grid** for desktop, shifting to a **4-column grid** for mobile devices. The layout philosophy centers on "The Editorial Column"—maintaining a max-width for text-heavy content to prevent line lengths from becoming too long for the eye to track.

Spacing follows an 8px base unit. Generous section gaps (80px+) are used to separate distinct editorial blocks, creating a sense of "breathing room" that characterizes luxury publications. Margins are intentionally wide on desktop to center the user’s focus, while gutters remain tight enough to maintain a relationship between related items like image-caption pairs.

## Elevation & Depth

To maintain the premium editorial feel, this design system avoids heavy, ambient shadows. Depth is instead communicated through **Tonal Layers** and **High-Contrast Outlines**.

1.  **The Hairline Stroke:** Surfaces are separated by 1px solid borders in a light neutral tone (#E0E0E0). This mimics the precision of print columns.
2.  **Layered Surfaces:** Secondary content (like sidebars or footers) sits on a #FAFAFA background, while primary content sits on #FFFFFF.
3.  **The Crimson Hover:** Interactive elements do not lift off the page; instead, they utilize subtle shifts in background color or the introduction of a Primary-colored accent bar to indicate focus.

## Shapes

The shape language is primarily **Soft (Level 1)**. While the overall layout is governed by a rigid, rectangular grid to maintain professional authority, UI components such as buttons and input fields feature a subtle 4px (0.25rem) corner radius.

This slight rounding softens the "brutalist" edge of the high-contrast design, making the interface feel more modern and approachable without losing its serious, editorial character. Standard icons and avatars should follow this same subtle rounding to maintain visual harmony.

## Components

Components in this design system are designed to be "invisible" facilitators of content.

- **Buttons:** Primary buttons are solid Crimson Red (#C0152A) with white text. They are rectangular with a 4px radius. Secondary buttons use a thick 2px black border with no fill.
- **Input Fields:** Use a 1px bottom-border only for a "minimalist form" look, or a full 1px light grey border for standard SaaS-style data entry. Labels always sit above the field in `label-sm` style.
- **Cards:** Editorial cards feature no shadows. They rely on the "Hairline Stroke" or simple whitespace to define their boundaries. Images within cards are always full-bleed to the top and sides.
- **Chips/Tags:** Used for categories. These are small, uppercase, and use a light neutral background with black text to avoid competing with the primary Crimson action color.
- **The Accent Bar:** A signature component—a 4px vertical or horizontal Crimson line used to highlight "Featured" content or the current active state in a navigation menu.
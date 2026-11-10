# DTH Tamizhan design system

Hallmark full app redesign, 10 November 2026. Adapted from Dose (deal 3/3); operator identities and bilingual project fonts take precedence over the reference palette/type.

- Audience: customers recharging and managing DTH boxes; staff maintaining subscribers, queues and plans.
- User-requested colorful restyle: pale blue canvas with crimson, teal, golden yellow and lilac solid surfaces. Keep the working layout and explicit card/month selection states. No decorative motion or oversized marketing hero.
- Preserve operator names, supplied logo assets, all routes, fields, ids, handlers and data contracts.
- Tokens live in src/tokens.css. Every color/font uses a theme token. Existing OperatorTheme properties map to shared semantic utilities. Operator colors are identifier accents, never full-page backgrounds.
- DM Sans with Noto Sans Tamil; JetBrains Mono only for IDs, dates, quantities and money. Weights 400, 500, 700. Sentence-case functional labels with normal tracking.
- Centered 1320px container including gutters. White reading surfaces against pale blue, with color in page headings, pack headers, navigation and summaries. Flat tables/definition rows inside surfaces; avoid framed panels inside framed panels.
- 12px surface radius, 8px controls. Restrained border, no broad surface shadows; elevated dialogs/popovers only. One red primary recipe, quiet secondary actions, explicit destructive styles.
- Customer top bar and horizontally scrollable mobile destinations. Eight admin destinations earn a desktop work rail; mobile uses visible scroll navigation. Active state includes semantics and shape, not color alone.
- The shared navigation header is navy on desktop and mobile, with light links, a gold active destination and gold focus rings on the dark surface. The profile control and its dropdown retain light reading surfaces.
- Recharge opens with a compact page heading, operator and subscriber controls, then pack selection and a checkout strip. No separate promotional stage.
- Plans use sidebar filters and flat plan records. Connections use readable identity and account facts. Security uses rows on desktop and plain disclosures on phones.
- Every field has a readable label; focus-visible is instant, minimum practical pointer targets 44px. Disabled/loading/error/success states use existing app logic. All motion respects reduced motion.
- A dialog has a labeled header, bounded dvh scrolling body and reachable actions. Preserve the existing accessible-modal hook.
- No invented claims, metrics, booking confirmations or testimonials. Keep existing factual copy unless a documented copy gate requires tightening.

Shared styles: src/base.css, src/workspace.css, src/admin.css, src/dialogs.css, src/colorful.css. Page-specific composition stays in the owning component. The colorful restyle supersedes the original restrained palette while retaining fonts and operator identity.

Icons: Phosphor React, duotone by default, through src/lib/icons.tsx. Icon aliases keep existing view/handler wiring stable. Tamil retains Noto Sans Tamil; IDs and amounts retain the mono face.

# Giving Tree Project Rules & UI Design System

## UI & Styling Guidelines
- **Custom Theme Tokens & shadcn**: Never use raw default Tailwind utility combos or generic un-themed classes. Always enforce custom theme tokens (CSS variables / custom HSL theme scale).
- **Color Restraint**: Restrain colors to 1 primary accent (`#10b981`), neutral dark surfaces, and crisp white typography. Avoid multi-colored rainbow gradients (blue-cyan-purple) or glowing neon text fill.
- **No Neon Ambient Glow Blobs**: Do not add random floating blur circles (`hero-blob`), heavy multi-layered glowing drop shadows, or background noise slop.
- **Tactile Component States**: Keep hover, focus, and active states subtle and restrained (`translateY(-2px)` to `-4px`), avoiding hyperactive scale/jump transforms.
- **Typography & Layout**: Maintain clean font hierarchies, controlled line lengths (max-width 520px-640px for copy), and predictable spacing.

## Data Authenticity & Anti-Fake Policy (Mandatory Rule)
- **Zero Fake / Mock / Synthetic Data**: Never post, seed, or hardcode fake items, dummy users, synthetic test accounts, or placeholder credentials anywhere in the frontend, backend, or database.
- **100% Real Authentic Items & Users Only**: Only real items and actual users who have genuinely registered and published listings are permitted.
- **Zero Auto-Fill / Dummy Buttons**: No demo test autofill buttons or pre-filled dummy credentials in the UI.
- **Isolated Testing Hygiene**: All automated tests must run with strict teardown (`afterAll`) ensuring zero temporary test artifacts linger in the persistent database.
- **Authentic Photos Only**: All item listings must use genuine user-uploaded photos—no AI-generated item images or misleading stock photos.

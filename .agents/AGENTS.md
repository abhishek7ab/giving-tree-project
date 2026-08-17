# Giving Tree Project Rules & UI Design System

## UI & Styling Guidelines
- **Custom Theme Tokens & shadcn**: Never use raw default Tailwind utility combos or generic un-themed classes. Always enforce custom theme tokens (CSS variables / custom HSL theme scale).
- **Color Restraint**: Restrain colors to 1 primary accent (`#10b981`), neutral dark surfaces, and crisp white typography. Avoid multi-colored rainbow gradients (blue-cyan-purple) or glowing neon text fill.
- **No Neon Ambient Glow Blobs**: Do not add random floating blur circles (`hero-blob`), heavy multi-layered glowing drop shadows, or background noise slop.
- **Tactile Component States**: Keep hover, focus, and active states subtle and restrained (`translateY(-2px)` to `-4px`), avoiding hyperactive scale/jump transforms.
- **Typography & Layout**: Maintain clean font hierarchies, controlled line lengths (max-width 520px-640px for copy), and predictable spacing.

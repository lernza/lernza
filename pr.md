## What does this PR do?

This PR implements the dashboard analytics feature as requested. It introduces `recharts` to render the user's earnings over time, which is **lazy-loaded** to keep the initial bundle size small (~314kB). The implementation also extracts the dashboard into maintainable sub-components (`PlatformStats`, `PersonalProgress`, `TrendingQuests`, `RecentActivity`) and provides a full neo-brutalist UI overhaul with platform-wide and personal statistics.

## Related Issue

Closes: #56 

## Type of Change

- [ ] Bug fix
- [x] New feature
- [ ] Refactor (no behavior change)
- [ ] Documentation
- [ ] Infrastructure / CI
- [ ] Tests

## Checklist

- [x] I have read the [Contributing Guide](CONTRIBUTING.md)
- [x] My PR title follows [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `refactor:`)
- [x] I have added at least one label to this PR
- [ ] I have added/updated tests for my changes (if applicable)
- [ ] `cargo test --workspace` passes (if contracts changed)
- [x] `pnpm build` passes (if frontend changed)
- [ ] `cargo fmt --all -- --check` passes (if Rust changed)
- [x] `pnpm lint` passes (if frontend changed)

## Screenshots

<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/5cc4fc1b-b92e-48d6-bec0-d6e0769d7b6b" />

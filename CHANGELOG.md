# Changelog

## [0.3.0](https://github.com/lernza/lernza/compare/v0.2.3...v0.3.0) (2026-03-25)


### Features

* add instructions for generating TypeScript bindings from Soroban contract WASM ([01adfa4](https://github.com/lernza/lernza/commit/01adfa452a1fe421f6011994a88061fd5e8f99f4))
* add multi-step quest creation form ([#118](https://github.com/lernza/lernza/issues/118)) ([3cf64d2](https://github.com/lernza/lernza/commit/3cf64d2ae3ee04983b0816b8d9b5c88777a30ce4))
* add quest visibility modes (public/private) ([#127](https://github.com/lernza/lernza/issues/127)) ([f0f6ea3](https://github.com/lernza/lernza/commit/f0f6ea3ac2be570556e1bd38713f9faff58ba725))
* add script to generate TypeScript bindings from Soroban contracts ([6a1febf](https://github.com/lernza/lernza/commit/6a1febf8fe5fe833f57ba9ce3954e93982778b0c))
* bug(contracts): rewards initialize has no auth guard, anyone can set the token address ([d5fd2bd](https://github.com/lernza/lernza/commit/d5fd2bda270f4d1d1feb8af0e06244388b7240d8))
* Chore set up development environment documentation ([#115](https://github.com/lernza/lernza/issues/115)) ([cacc92b](https://github.com/lernza/lernza/commit/cacc92b050862ba31ab90fa7cf8d923e3f9dea7a))
* Contract interaction diagrams ([#147](https://github.com/lernza/lernza/issues/147)) ([d460430](https://github.com/lernza/lernza/commit/d4604303e3cd2fa9d142ab034ca9349f38fab114))
* **contracts:** add deadline support to workspace and milestone contracts ([0fd61c6](https://github.com/lernza/lernza/commit/0fd61c669ec835e24eb51f4de18c1b59527b8f87))
* **contracts:** add event emission for all state changes ([#284](https://github.com/lernza/lernza/issues/284)) ([afa2093](https://github.com/lernza/lernza/commit/afa2093811acb394fede3cf2307e86f501c266e0))
* **contracts:** add peer verification for milestone completion ([#153](https://github.com/lernza/lernza/issues/153)) ([779d7f0](https://github.com/lernza/lernza/commit/779d7f06ac0ed239caee8d8a24107630461a1227))
* **contracts:** add quest categories and tags ([#281](https://github.com/lernza/lernza/issues/281)) ([6421d81](https://github.com/lernza/lernza/commit/6421d81196dcc70b7295a5901d350f4dbca240af))
* **contracts:** add quest enrollment cap ([#279](https://github.com/lernza/lernza/issues/279)) ([b85494f](https://github.com/lernza/lernza/commit/b85494f4621e206663e4cc9d42338cc7d9f37897))
* **contracts:** implement enrollee progress tracking ([#278](https://github.com/lernza/lernza/issues/278)) ([35252bf](https://github.com/lernza/lernza/commit/35252bf5031e15aed3ae12ccaffad21dba42ab49))
* **contracts:** implement funding model selection for Quest ([2cbade8](https://github.com/lernza/lernza/commit/2cbade87d7059a2a6446dff4168ca0dccd98ec0d))
* Created toast notification system ([a9192e7](https://github.com/lernza/lernza/commit/a9192e70802ff4c16f1729577d2b986815d22b0e))
* Docs: create architecture decision records ([#146](https://github.com/lernza/lernza/issues/146)) ([72bed1b](https://github.com/lernza/lernza/commit/72bed1b43cf78d0fe169dcf9befd048b64fc9a57))
* Docs/api reference 42 ([#150](https://github.com/lernza/lernza/issues/150)) ([620e148](https://github.com/lernza/lernza/commit/620e148aca0c2505a223b75860832b38cd2ebd73))
* frontend add error boundary and global error handling ([#139](https://github.com/lernza/lernza/issues/139)) ([467e7c2](https://github.com/lernza/lernza/commit/467e7c2be453d31b7e01ecf5030dc79c6ab31b71))
* **frontend:** add loading skeleton components ([7484ff6](https://github.com/lernza/lernza/commit/7484ff6df33e0cbc141720f75bd01fd5dfcce791))
* **frontend:** add quest sharing and toast notifications ([b5668c2](https://github.com/lernza/lernza/commit/b5668c226c08d909d3c71833c0ac4b057e89fcce))
* **frontend:** implement dashboard analytics ([cb0fd11](https://github.com/lernza/lernza/commit/cb0fd1154f07053c308ca8837fff31cab412d513)), closes [#56](https://github.com/lernza/lernza/issues/56)
* **frontend:** implement proper client-side routing ([#28](https://github.com/lernza/lernza/issues/28)) ([6488489](https://github.com/lernza/lernza/commit/6488489092dd654564865d9050f2221b2c15e5cb))
* **frontend:** implement Quest detail page with Neo-brutalist styling ([8e0d531](https://github.com/lernza/lernza/commit/8e0d531451cbafdfc5d1d1a85cfff847ff52e143))
* **frontend:** implement quest progress tracking visualization ([#277](https://github.com/lernza/lernza/issues/277)) ([3c589a0](https://github.com/lernza/lernza/commit/3c589a0d6d36c865c95cb5bded96c891ea193d94))
* **frontend:** implement quest sharing and social features closes [#60](https://github.com/lernza/lernza/issues/60), closes [#21](https://github.com/lernza/lernza/issues/21) ([7434428](https://github.com/lernza/lernza/commit/7434428ebe9c0c95a0f18c7787d5511786134fb9))
* **frontend:** implement quest sharing and social features closes [#60](https://github.com/lernza/lernza/issues/60), closes [#21](https://github.com/lernza/lernza/issues/21) ([facc3d0](https://github.com/lernza/lernza/commit/facc3d0ede4efd1c27471bb2778ddb2f6fd4c703))
* **frontend:** integrate Soroban contracts and refactor to Quest domain ([a3a1ff6](https://github.com/lernza/lernza/commit/a3a1ff662e6b0894b18576449e91c734497d48bd))
* implement dark/light mode toggle with theme persistence ([cccd41e](https://github.com/lernza/lernza/commit/cccd41e1dd8b0d59ba1d9a848e614fad975f1fac))
* implement dark/light mode toggle with theme persistence ([6b6614c](https://github.com/lernza/lernza/commit/6b6614ce83c06a432b006a685f05096cd710a19a))
* implement dark/light mode toggle with theme persistence ([9f92077](https://github.com/lernza/lernza/commit/9f920779189d4edf22f59f949ae86faf0d4aa213))
* implement dark/light mode toggle with theme persistence ([33c0251](https://github.com/lernza/lernza/commit/33c0251e92ac431b894941774e040b55989f2f98))
* implement dark/light mode toggle with theme persistence ([88f2d1a](https://github.com/lernza/lernza/commit/88f2d1aa489a3845b07f437a6824345afb8961c3))
* implement dark/light mode toggle with theme persistence ([#124](https://github.com/lernza/lernza/issues/124)) ([b748740](https://github.com/lernza/lernza/commit/b7487400e4c6053181588540c162bbec4c2a828b))
* implement quest completion certificates (SBTs) ([#287](https://github.com/lernza/lernza/issues/287)) ([dd60ef8](https://github.com/lernza/lernza/commit/dd60ef84435e23668dcdc0e616dc19701a1f417b))
* implement quest sharing and social features ([c8045d7](https://github.com/lernza/lernza/commit/c8045d71aa8aea70bc55eb63767d45190c4e9af3))
* **milestone:** add configurable reward distribution modes ([#140](https://github.com/lernza/lernza/issues/140)) ([9f81229](https://github.com/lernza/lernza/commit/9f8122909a1b121f93c0babbf153cb87941ac3e3))
* refactor frontend mock data to match Soroban structs (fixes [#81](https://github.com/lernza/lernza/issues/81)) ([9b29610](https://github.com/lernza/lernza/commit/9b296105b7cd935d7c3921250160e86049d60420))
* **rewards:** add platform admin governance to rewards contract ([56865dd](https://github.com/lernza/lernza/commit/56865dd85a4f59b908837b2c1108a8a05fd9b320))
* update .gitignore and package.json for generated TypeScript bindings from Soroban contract WASM ([ece8bc5](https://github.com/lernza/lernza/commit/ece8bc55524a3d6407612d3432f2d5be5a61e08f))


### Bug Fixes

* **contract:** handle cross-contract failures and add enroll verification to milestone contract ([#286](https://github.com/lernza/lernza/issues/286)) ([f31cf41](https://github.com/lernza/lernza/commit/f31cf414ee1836cce16b2c8024e1bf5923568585))
* **contracts:** block rewards authority self-payouts ([0909198](https://github.com/lernza/lernza/commit/09091988281f0a189f9ec357243b38ce0b91bd45))
* **contracts:** prevent milestone ownership race condition via cross-contract validation ([#132](https://github.com/lernza/lernza/issues/132)) ([f03ada4](https://github.com/lernza/lernza/commit/f03ada4c467146cc65c4f2943d2d19748d3427b8))
* **contracts:** Resolve failing CI due to mismatched QuestInfo and outdated quest_id parameters ([df4a247](https://github.com/lernza/lernza/commit/df4a247e4a5560536a56e42cd2b8582409f97282))
* **contracts:** verify workspace ownership during funding to prevent frontrunning ([#135](https://github.com/lernza/lernza/issues/135)) ([91c7cf7](https://github.com/lernza/lernza/commit/91c7cf7b76ca4545b4a2f31be68b0baef78c3a6b))
* **frontend:** rename quest-detail components to kebab-case ([2d02341](https://github.com/lernza/lernza/commit/2d023417f05e478366470a5979beafad9bc94a70))
* **frontend:** resolve CI failures by updating lockfile and fixing lint warnings ([7911442](https://github.com/lernza/lernza/commit/791144236142c90089b8a199c20ff4bcbfdeb27c))
* **frontend:** resolve JSX parsing error and navigation consistency in Dashboard/App ([dab1768](https://github.com/lernza/lernza/commit/dab1768d1252266dcb029d6385784d4c47efde7f))
* **frontend:** resolve merge conflicts and align quest detail page with main ([5447f6a](https://github.com/lernza/lernza/commit/5447f6a068ea8d19c75d8308aa4c8ec945a9c8f7))
* **frontend:** resolve SDK 14 and Freighter types to fix build ([179a6a8](https://github.com/lernza/lernza/commit/179a6a889b0713b1b5eca7520e9da050d779b2a4))
* **quest:** validate create_quest inputs ([104bf02](https://github.com/lernza/lernza/commit/104bf028ab01b2fb164589768d3e4c5b871fa116))
* remove pr.md and fix any types in create-quest ([ac2a68c](https://github.com/lernza/lernza/commit/ac2a68cdb33edd7d14ce443f03d792107e025f3c))
* remove test coverage summary and update module comment ([c759e49](https://github.com/lernza/lernza/commit/c759e497b9f23df79f3672ed3d08206c8301619d))
* repair broken files from bulk PR merges ([55fdfcb](https://github.com/lernza/lernza/commit/55fdfcba7400a106a7399a00efd717b3667b69c6))
* resolve rebase conflicts and apply formatting ([a091eb1](https://github.com/lernza/lernza/commit/a091eb1136eb9f90f7222db332cc81a3b0e6a0ca))
* resolve upstream rebase conflicts and fix milestone syntax error ([c092492](https://github.com/lernza/lernza/commit/c092492e36c21afffa8c986fffaac8604c77e723))
* **rewards:** add recovery flow for tokens sent directly to contract address ([7925db8](https://github.com/lernza/lernza/commit/7925db8c54621dfc85a7c87c36e3ca11a43e42de)), closes [#169](https://github.com/lernza/lernza/issues/169)
* **rewards:** handle get_quest cross-contract failures explicitly in fund_quest [#160](https://github.com/lernza/lernza/issues/160) ([#289](https://github.com/lernza/lernza/issues/289)) ([ff80b6f](https://github.com/lernza/lernza/commit/ff80b6f97c395319658e7b0158cdb6d005e6571a))


### Performance Improvements

* **quest:** switch Enrollees to Map and add PublicQuests index for p… ([#285](https://github.com/lernza/lernza/issues/285)) ([d33f322](https://github.com/lernza/lernza/commit/d33f322b4c4df8c4e2016f98b771d74467a57b13))

## [0.2.3](https://github.com/lernza/lernza/compare/v0.2.2...v0.2.3) (2026-03-21)


### Bug Fixes

* **ci:** rebuild release notes from git log to include all commit types ([#101](https://github.com/lernza/lernza/issues/101)) ([7b85206](https://github.com/lernza/lernza/commit/7b85206f9d269e322d11e8e70bf681e4f7c99814))

## [0.2.2](https://github.com/lernza/lernza/compare/v0.2.1...v0.2.2) (2026-03-21)


### Bug Fixes

* **ci:** add explicit permissions to project-automation and stale workflows ([#98](https://github.com/lernza/lernza/issues/98)) ([e05981e](https://github.com/lernza/lernza/commit/e05981e2c68ccd312694f5a747e6572fe8c4e337))
* **ci:** show all commit types in release changelog ([#96](https://github.com/lernza/lernza/issues/96)) ([cb3c21f](https://github.com/lernza/lernza/commit/cb3c21f976ccc0ed733ae080cf48b4376d8998fd))

## [0.2.1](https://github.com/lernza/lernza/compare/v0.2.0...v0.2.1) (2026-03-21)


### Bug Fixes

* **ci:** exempt dependabot from pr-checks and auto-label ([#94](https://github.com/lernza/lernza/issues/94)) ([8e177c5](https://github.com/lernza/lernza/commit/8e177c5bfe253d47088c0f3807d8349031c12243))

## [0.2.0](https://github.com/lernza/lernza/compare/v0.1.0...v0.2.0) (2026-03-21)


### Features

* **ci:** switch to Release Please for automated releases ([cae2926](https://github.com/lernza/lernza/commit/cae29261ee3e84fc8f12b78692261f164959ea5f))


### Bug Fixes

* **ci:** skip CI checks for Release Please PRs, simplify release notes ([#90](https://github.com/lernza/lernza/issues/90)) ([73c63fd](https://github.com/lernza/lernza/commit/73c63fd7632c218821c2e9e39636f736e418181f))

## [0.1.0](https://github.com/lernza/lernza/releases/tag/v0.1.0) (2026-03-21)

### New Features

* admin dashboard (12feebe)
* add wallet connection hook and integrate with Freighter API (f489b23)
* enhance profile and workspace pages with improved UI and animations (851eb33)
* enhance landing page with new icons and improved footer layout (6571acc)
* enhance layout and animations across components (d7f2f34)
* handle refresh and 404 (8d48cd1)
* continuous marquee (1d2c427)
* USDC token, auto-labeling, release workflow, contributor recognition (0159190)
* add Stellar contract integration layer (c26cb57)
* path-filtered builds, linked-issue check, stale bot (062ef31)
* PR-linked issues auto-progress, comprehensive branch protection (bae47eb)

### Bug Fixes

* fix wallet connection reliability improvements
* fix release notes and WASM binary paths
* harden project automation with status guards and edge cases (670fd76)
* handle all edge cases in project automation (dad6bed)

### Refactoring

* consolidate project automation into single job (2b99ac3)
* remove Todo status, simplify to 5-status board (5bb96b9)

### Documentation

* add lernza-automation GitHub App implementation guide (95a5ba9)
* rewrite README with detailed architecture, contract API, and roadmap (7515497)

### CI/CD

* migrate to Vercel (a66e7cf)
* add repo infrastructure, CI workflows, and community files (49d1963)

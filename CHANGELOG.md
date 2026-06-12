# Changelog

## [0.4.0](https://github.com/lernza/lernza/compare/v0.3.0...v0.4.0) (2026-06-12)


### Features

* add CI push triggers, quest filter presets, funder display, and… ([daadc49](https://github.com/lernza/lernza/commit/daadc495c366e6bd5f7f3b0c3fa229fde27a1a17)), closes [#757](https://github.com/lernza/lernza/issues/757) [#740](https://github.com/lernza/lernza/issues/740) [#742](https://github.com/lernza/lernza/issues/742) [#752](https://github.com/lernza/lernza/issues/752)
* add ci, semantics, dialog focus and scroll lock ([3f9ffe5](https://github.com/lernza/lernza/commit/3f9ffe54a22c6cd94a889a0bd94df00262309eca))
* add transfer_admin to quest contract ([3cc5b61](https://github.com/lernza/lernza/commit/3cc5b61da7c836cf5a8a5dd19efd6c4475945be0))
* centralize test helpers and implement contract improvements ([7faff98](https://github.com/lernza/lernza/commit/7faff98181d340af7e6333d334be112d0d5fc8e9))
* consolidate theme, add quest funding, pagination, and framer audit ([2b0243a](https://github.com/lernza/lernza/commit/2b0243aa92b1625903d095fc868b05b1faad5c10))
* **contracts:** platform stats, refund_unused_pool, certificate metadata update, owner-gated revocation ([cc40ba0](https://github.com/lernza/lernza/commit/cc40ba0378c1c9b0eb22211b391bf4de4a51a1ce)), closes [#717](https://github.com/lernza/lernza/issues/717) [#718](https://github.com/lernza/lernza/issues/718) [#719](https://github.com/lernza/lernza/issues/719) [#720](https://github.com/lernza/lernza/issues/720)
* enforce TTL safety, add creator verification revocation, refund… ([9fa07ab](https://github.com/lernza/lernza/commit/9fa07ab48290d8460fa4a6dd090628c8b1fc266a))
* **frontend:** add analytics tracking, route prefetching, creator profile page, and SSR-safe theme initialization ([2ceb0e7](https://github.com/lernza/lernza/commit/2ceb0e7fdfd6843f75ff71323c267ba2185cfa8a))
* **frontend:** add duplicate quest button for creators ([a9fe07d](https://github.com/lernza/lernza/commit/a9fe07dd903c4589257febc5808e91db2eeee869))
* **frontend:** adopt react-router-dom router, consolidate metadata, … ([b28ae96](https://github.com/lernza/lernza/commit/b28ae9658138f44790aec560b0cc28f962c060bc))
* **frontend:** E2E tests, unit tests, create-quest navigation, error state components ([2d76bee](https://github.com/lernza/lernza/commit/2d76bee540850b9f46bf16dbbf85b8772fc0e34e))
* **frontend:** implement wcag 2.1 aa accessibility improvements and … ([#437](https://github.com/lernza/lernza/issues/437)) ([c895b71](https://github.com/lernza/lernza/commit/c895b719fab757be14c9cfe76e8c5afe2b5deb73))
* implement capture route + wallet context in ErrorBoundary ([#1053](https://github.com/lernza/lernza/issues/1053)) ([428add6](https://github.com/lernza/lernza/commit/428add644815212317d72abe490750a5acf7021e))
* implement live quest dashboard and activity flows ([4d55d3c](https://github.com/lernza/lernza/commit/4d55d3c175dc1e96816815df162ae3b0f437ec98))
* implement pool refund, consolidate contract clients, fix self-enrollment arg order ([6fa9a00](https://github.com/lernza/lernza/commit/6fa9a006de311dd821052306735c30609ef79fd4))
* improve UX with optimistic updates, wallet balances, permissions gating, and contract events ([eea695f](https://github.com/lernza/lernza/commit/eea695fa650e5b3804aebae7a616f8eef48b34b6))
* lernza docs and features modification ([2965264](https://github.com/lernza/lernza/commit/2965264cfce4d8a59a2cd6f9b081265e2f885714))
* lighthouse ci for tracking ([2ef6323](https://github.com/lernza/lernza/commit/2ef6323017a9babfb956abd89f04f90bda8078a4))
* **milestone:** standardize errors and enhance distribution validation ([#1017](https://github.com/lernza/lernza/issues/1017)) ([44df698](https://github.com/lernza/lernza/commit/44df6989aa91e6d97cecb782f48dcc8f7251df0c))
* perf(frontend): defer Vercel Analytics script until idle ([#1037](https://github.com/lernza/lernza/issues/1037)) ([09dc4de](https://github.com/lernza/lernza/commit/09dc4de5027730cc20ea0b6bfdfa8d6de12c8130))
* **rewards:** emit event for authority assignment on first funding and add related tests ([#1019](https://github.com/lernza/lernza/issues/1019)) ([7e37c4d](https://github.com/lernza/lernza/commit/7e37c4dc61161b5c42d82e2bf3c2260a5ee537b8))
* **rewards:** implement refund_pool safeguards with 7-day grace peri… ([a76ba73](https://github.com/lernza/lernza/commit/a76ba7314749dc832fecbfa33396b82feae86819)), closes [#466](https://github.com/lernza/lernza/issues/466)
* update quest snapshots and add owner quests data ([b9d4b17](https://github.com/lernza/lernza/commit/b9d4b174c4755859cdf2fe9c173db828c7062774))


### Bug Fixes

* **a11y:** add missing aria labels, fix duplicate h1, improve keyboard support ([fb6d0e0](https://github.com/lernza/lernza/commit/fb6d0e0f4dddca6ec1238fa675472195abf5cf27)), closes [#943](https://github.com/lernza/lernza/issues/943) [#944](https://github.com/lernza/lernza/issues/944) [#945](https://github.com/lernza/lernza/issues/945) [#946](https://github.com/lernza/lernza/issues/946)
* **a11y:** touch targets, skip link, live regions, alt text ([#951](https://github.com/lernza/lernza/issues/951)-[#954](https://github.com/lernza/lernza/issues/954)) ([90239e9](https://github.com/lernza/lernza/commit/90239e913e1b8c4eb35a3e428ed2aea5358060de))
* add confirmation to quest archiving and fix dashboard retry ([f96ff5f](https://github.com/lernza/lernza/commit/f96ff5f4023ffe678dc4dbaf0322e8018a2be5f8)), closes [#489](https://github.com/lernza/lernza/issues/489)
* address contract/frontend cleanup issues in one batch ([66e40d8](https://github.com/lernza/lernza/commit/66e40d84d9c7bd1c6dfbd8e83c38eacc7cafc1c4))
* apply 1_000_000 decimal factor consistently in create-quest funding ([f2bb73e](https://github.com/lernza/lernza/commit/f2bb73e0378cc91f80ff24b22221ee22119a60de)), closes [#444](https://github.com/lernza/lernza/issues/444)
* apply decimals conversion in formatTokens ([97e155b](https://github.com/lernza/lernza/commit/97e155ba6fb73dfa2e125899abc653b1a39c4dde))
* breadcrumb, explicit loading messages, empty-state sizing, inline hero CSS ([2b10874](https://github.com/lernza/lernza/commit/2b10874342699173cb9c0be6cb93b60ea41f0aa0))
* **build:** unbreak production navigation by removing broken dynamic imports ([f92d4fb](https://github.com/lernza/lernza/commit/f92d4fb4952ce2302ab09ea33a18b90f76cd532f))
* clarify platform stats as sample data (Closes [#453](https://github.com/lernza/lernza/issues/453)) ([fff926f](https://github.com/lernza/lernza/commit/fff926f4390d2099b6131de2da5e8dbb33776eca))
* consolidate to single hooks-based toast system ([d802a5d](https://github.com/lernza/lernza/commit/d802a5d741e12f1ed6a3fe06ccdadab0a5673efd)), closes [#457](https://github.com/lernza/lernza/issues/457)
* coordinate Paused error codes, add proptests, docs, panic-resili… ([9565ab0](https://github.com/lernza/lernza/commit/9565ab094f2fb03cec98536bc021ee1e1eaaa1ed))
* document dashboard retry refetch behavior ([#451](https://github.com/lernza/lernza/issues/451)) ([e99d4e8](https://github.com/lernza/lernza/commit/e99d4e855fe70ad71233c83fe7a28064a94ce0f9))
* duplicate ThemeContext files cause confusion and dead code ([71096dd](https://github.com/lernza/lernza/commit/71096dd32b40cb701d10e97c363dd9953026c921))
* Fefactor frontend performance and runtime configuration handling ([c0f980d](https://github.com/lernza/lernza/commit/c0f980d78367b5d3b2102e9b4d798e3f8ea2aebd))
* **frontend:** document stable handler pattern in profile ([49638b8](https://github.com/lernza/lernza/commit/49638b843eae2dcbf715a386791336cfd3d89cb1)), closes [#905](https://github.com/lernza/lernza/issues/905)
* **frontend:** move fetcherRef assignment out of render body ([148631e](https://github.com/lernza/lernza/commit/148631e82c62cdc4fc1dd539b2c9136e614d604d))
* **frontend:** network guard, batched quest stats, abort activity, retry RPC ([2b142b4](https://github.com/lernza/lernza/commit/2b142b4c2aec55d93640c1d3c47a12c4517d5922))
* **frontend:** network guard, batched quest stats, abort activity, retry RPC ([#1035](https://github.com/lernza/lernza/issues/1035)) ([333b351](https://github.com/lernza/lernza/commit/333b35144aa5beabf8ac3d193d2d8b71d8f6e2a5))
* **frontend:** shared UI polish and accessibility updates ([3c40b5b](https://github.com/lernza/lernza/commit/3c40b5bbf68810b7c603c689549d85c9e8a91af5))
* harden quest imports and contract safety ([53e34f4](https://github.com/lernza/lernza/commit/53e34f4dfa72b561a496c6e43af1360cc6018dcd))
* leave-quest hold + exponential polling backoff ([c297c7a](https://github.com/lernza/lernza/commit/c297c7a3b1221c56ac6a1fcefcb52b298ad92940))
* **milestone:** close competitive race, mint before completed, snapshot mode, propagate cert errors ([02ced5d](https://github.com/lernza/lernza/commit/02ced5d7c01409b2712b8b7cdbb332bc9afc4f16))
* **milestone:** Implement accurate quest completion rate ([da9d8d0](https://github.com/lernza/lernza/commit/da9d8d0cc0c6d2379385d37272bf7e10dc4889e2)), closes [#440](https://github.com/lernza/lernza/issues/440)
* move public quest index to persistent storage (Closes [#449](https://github.com/lernza/lernza/issues/449)) ([6607f63](https://github.com/lernza/lernza/commit/6607f63b9460df2ad16e3396eecf701ace5f35fd))
* narrow deprecated allows, strengthen address validation, document pause ([#832](https://github.com/lernza/lernza/issues/832)) ([eb090e5](https://github.com/lernza/lernza/commit/eb090e56e46c74faf20b8af0fbc356a2a69299a2))
* optimize milestone count, fix state updates, validate category and remove console.error ([afce2df](https://github.com/lernza/lernza/commit/afce2dfedf965819308bad9580602379de3663c1))
* payout-before-transfer, refund counter sync, paginate completion rate, emit distribution-mode event ([07385ed](https://github.com/lernza/lernza/commit/07385edfec9a419a6be3f003b7be7d286381e25e))
* pre-commit rustfmt, coverage thresholds, milestone e2e, dialog a11y ([#797](https://github.com/lernza/lernza/issues/797)) ([bd0d876](https://github.com/lernza/lernza/commit/bd0d8769203ec9c3bae30e105c613e40232a6a2b))
* prevent authority self-reward distribution ([#445](https://github.com/lernza/lernza/issues/445)) ([0317646](https://github.com/lernza/lernza/commit/031764695cb38094e67a6aa747a025fd97d54c09))
* reduced-motion guard, 404 noindex, broadened e2e, deterministic leaderboard tests ([627c9d4](https://github.com/lernza/lernza/commit/627c9d42c04d35deb0cf9d994e81c5ad93e71ae6))
* remove broken leaderboard earner navigation ([#455](https://github.com/lernza/lernza/issues/455)) ([daa59d0](https://github.com/lernza/lernza/commit/daa59d09dbed85f68d0c46b436a01c72c43c8292))
* remove duplicate completion-fetching useEffect in quest page ([78f09b4](https://github.com/lernza/lernza/commit/78f09b428443c6f2ee326b93aed7296c6abb2e27)), closes [#448](https://github.com/lernza/lernza/issues/448)
* replace getQuests() with listPublicQuests() in leaderboard ([f1b06ad](https://github.com/lernza/lernza/commit/f1b06ad062e0604c6d1c1351d40107e6fc838190)), closes [#464](https://github.com/lernza/lernza/issues/464)
* reset useUserRole state when wallet disconnects ([7a9e764](https://github.com/lernza/lernza/commit/7a9e76443209e287abf25f530255d67fb65f6f10)), closes [#467](https://github.com/lernza/lernza/issues/467)
* resolve frontend issues [#442](https://github.com/lernza/lernza/issues/442), [#478](https://github.com/lernza/lernza/issues/478), [#483](https://github.com/lernza/lernza/issues/483), [#487](https://github.com/lernza/lernza/issues/487) ([8748d3e](https://github.com/lernza/lernza/commit/8748d3eaf80e3b58b341a0a8e1ebc0e54c458954))
* resolve issues with rewards, milestones, vercel config, and asyn… ([289b819](https://github.com/lernza/lernza/commit/289b8191f0a17f2fa0f18ad4bb2c31fda2bf4fe5)), closes [#922](https://github.com/lernza/lernza/issues/922) [#920](https://github.com/lernza/lernza/issues/920) [#866](https://github.com/lernza/lernza/issues/866) [#858](https://github.com/lernza/lernza/issues/858)
* resolve quest indexing, overflow safety, and frontend cache/timer leaks ([5368c4c](https://github.com/lernza/lernza/commit/5368c4cc5a38d6396fc8751a5af6144cf8c8c326))
* respect system theme preference on first load ([#528](https://github.com/lernza/lernza/issues/528)) ([1c4372d](https://github.com/lernza/lernza/commit/1c4372da9ddb6c16311a928e45fb8f763a447585))
* restore contract tests, unbreak frontend build/lint, standardize UI shell ([3b30f18](https://github.com/lernza/lernza/commit/3b30f1888dad10f32f565063b39570967d468cf6))
* restore frontend route lazy-loading by removing unresolved alias specifiers ([0762a9f](https://github.com/lernza/lernza/commit/0762a9f601b537d9c0197d6f19a5a29248015e9c))
* **router:** preserve dynamic ID in workspace redirect ([#441](https://github.com/lernza/lernza/issues/441)) ([bfec917](https://github.com/lernza/lernza/commit/bfec917f631f7675e70ad50d98df9ba74533118b))
* split corrupted .gitignore line into two entries ([8f53d47](https://github.com/lernza/lernza/commit/8f53d4762ac4a7a7193851644d0e107f981a301f)), closes [#577](https://github.com/lernza/lernza/issues/577)
* stabilize quest error numbering, validate milestone distribution mode, and strengthen pause coverage ([c742066](https://github.com/lernza/lernza/commit/c7420663a56ead08aca0300272fa5fad099da2ea))
* **token:** store and prioritize tokenAddress in TokenClient ([e51adc7](https://github.com/lernza/lernza/commit/e51adc7e6160aa048e0c3d28a881cb226f43f9c6))
* use client-side navigation on profile manage button ([#476](https://github.com/lernza/lernza/issues/476)) ([44bb021](https://github.com/lernza/lernza/commit/44bb0215e6a1d2f39a826abfca9d6a3efd4c2f64))
* validate distribute_reward amount against milestone configured reward ([7b40ce0](https://github.com/lernza/lernza/commit/7b40ce014dffb1dfe5eddadbc7a3a930f93e8691)), closes [#447](https://github.com/lernza/lernza/issues/447)
* validate quest token address matches rewards contract token in f… ([429b4c9](https://github.com/lernza/lernza/commit/429b4c9011a60328b97eeec616bfc2f61b10d214)), closes [#463](https://github.com/lernza/lernza/issues/463)
* wrap production console.error calls in DEV guards ([ddc2e96](https://github.com/lernza/lernza/commit/ddc2e96190bafcd9ed41aad046fc9870db97279c))


### Performance Improvements

* **frontend:** restore code splitting, split create-quest, portal dialog ([1a23c16](https://github.com/lernza/lernza/commit/1a23c169f0e1029bbec91866b6931f53cb06ddab))

## [Unreleased]

### ⚠ BREAKING CHANGES

* **contracts:** The `workspace` identifier has been renamed to `quest` across all contracts, frontend code, and URLs. The `/workspace/:id` route now redirects to `/quest/:id` via a compatibility shim (`WorkspaceRedirect`). The shim and all `workspace` aliases will be removed on **2026-09-01**. Integrators must migrate any direct references to `WorkspaceInfo`, `MOCK_WORKSPACES`, or `/workspace/` paths to their `quest`-prefixed equivalents before that date.
* **milestone:** `verify_completion` now fails with `FlatRewardNotConfigured` (error 18) if a quest is in `Flat` distribution mode but no flat reward amount has been set. This prevents silent fallback to per-milestone configured rewards which may be inconsistent in flat mode.

## [0.3.0](https://github.com/lernza/lernza/compare/v0.2.3...v0.3.0) (2026-03-27)


### Features

* add ambassador/creator verification badge system ([#379](https://github.com/lernza/lernza/issues/379)) ([#408](https://github.com/lernza/lernza/issues/408)) ([817e562](https://github.com/lernza/lernza/commit/817e562ae9b9f6f15cd80f52172e5ed00b18760d))
* add ambassador/creator verification badge system ([#408](https://github.com/lernza/lernza/issues/408)) ([6736277](https://github.com/lernza/lernza/commit/6736277250f312366839381ada0f6d8d2fc541c1))
* add instructions for generating TypeScript bindings from Soroban contract WASM ([01adfa4](https://github.com/lernza/lernza/commit/01adfa452a1fe421f6011994a88061fd5e8f99f4))
* add multi-step quest creation form ([#118](https://github.com/lernza/lernza/issues/118)) ([3cf64d2](https://github.com/lernza/lernza/commit/3cf64d2ae3ee04983b0816b8d9b5c88777a30ce4))
* add quest visibility modes (public/private) ([#127](https://github.com/lernza/lernza/issues/127)) ([f0f6ea3](https://github.com/lernza/lernza/commit/f0f6ea3ac2be570556e1bd38713f9faff58ba725))
* add script to generate TypeScript bindings from Soroban contracts ([6a1febf](https://github.com/lernza/lernza/commit/6a1febf8fe5fe833f57ba9ce3954e93982778b0c))
* add transaction confirmation dialog and quest export/import ([#403](https://github.com/lernza/lernza/issues/403)) ([e8efc17](https://github.com/lernza/lernza/commit/e8efc17e7e4a98293163c3ee1783d756cea2c969))
* add visibility mode tests and progress ring component ([#410](https://github.com/lernza/lernza/issues/410)) ([8df913d](https://github.com/lernza/lernza/commit/8df913decc3457db860870476e5c4c39d589f44b))
* allow users to self-unenroll from a quest ([#305](https://github.com/lernza/lernza/issues/305)) ([b1bf43e](https://github.com/lernza/lernza/commit/b1bf43ee076f812dcbf0b917fdeacc81701ccbc3))
* bug(contracts): rewards initialize has no auth guard, anyone can set the token address ([d5fd2bd](https://github.com/lernza/lernza/commit/d5fd2bda270f4d1d1feb8af0e06244388b7240d8))
* Chore set up development environment documentation ([#115](https://github.com/lernza/lernza/issues/115)) ([cacc92b](https://github.com/lernza/lernza/commit/cacc92b050862ba31ab90fa7cf8d923e3f9dea7a))
* **ci:** auto-merge approved PRs with squash and co-author ([c17d5b0](https://github.com/lernza/lernza/commit/c17d5b0c91baf2e43c2154e7dd81c358065a5f1d))
* **ci:** auto-merge on approval, strip AI co-author lines ([6fa5f1f](https://github.com/lernza/lernza/commit/6fa5f1f525019eec2d06ab0f15449b246e57f497))
* Contract interaction diagrams ([#147](https://github.com/lernza/lernza/issues/147)) ([d460430](https://github.com/lernza/lernza/commit/d4604303e3cd2fa9d142ab034ca9349f38fab114))
* **contracts:** add deadline support to workspace and milestone contracts ([0fd61c6](https://github.com/lernza/lernza/commit/0fd61c669ec835e24eb51f4de18c1b59527b8f87))
* **contracts:** add event emission for all state changes ([#284](https://github.com/lernza/lernza/issues/284)) ([afa2093](https://github.com/lernza/lernza/commit/afa2093811acb394fede3cf2307e86f501c266e0))
* **contracts:** add MAX_MILESTONES cap and input length validation ([#397](https://github.com/lernza/lernza/issues/397)) ([17d370b](https://github.com/lernza/lernza/commit/17d370b6f6aab2cb0ad3f9e493e12a52e3b919cc))
* **contracts:** add peer verification for milestone completion ([#153](https://github.com/lernza/lernza/issues/153)) ([779d7f0](https://github.com/lernza/lernza/commit/779d7f06ac0ed239caee8d8a24107630461a1227))
* **contracts:** add quest categories and tags ([#281](https://github.com/lernza/lernza/issues/281)) ([6421d81](https://github.com/lernza/lernza/commit/6421d81196dcc70b7295a5901d350f4dbca240af))
* **contracts:** add quest enrollment cap ([#279](https://github.com/lernza/lernza/issues/279)) ([b85494f](https://github.com/lernza/lernza/commit/b85494f4621e206663e4cc9d42338cc7d9f37897))
* **contracts:** add quest milestone ordering to enforce sequential completion ([#406](https://github.com/lernza/lernza/issues/406)) ([7791de9](https://github.com/lernza/lernza/commit/7791de9d88bfd47fb50c8bfbd978a45f38d03128))
* **contracts:** add quest update and archival functions ([#394](https://github.com/lernza/lernza/issues/394)) ([51de8c5](https://github.com/lernza/lernza/commit/51de8c5d4a07830fe9adca80cffa075127a40b63))
* **contracts:** implement enrollee progress tracking ([#278](https://github.com/lernza/lernza/issues/278)) ([35252bf](https://github.com/lernza/lernza/commit/35252bf5031e15aed3ae12ccaffad21dba42ab49))
* **contracts:** implement funding model selection for Quest ([2cbade8](https://github.com/lernza/lernza/commit/2cbade87d7059a2a6446dff4168ca0dccd98ec0d))
* **contracts:** merge leave_quest, quest archival, and milestone reward verification ([8d38fe9](https://github.com/lernza/lernza/commit/8d38fe94bc7fd4a2786c11ae488f3a7f13437bd2))
* Created toast notification system ([a9192e7](https://github.com/lernza/lernza/commit/a9192e70802ff4c16f1729577d2b986815d22b0e))
* Docs: create architecture decision records ([#146](https://github.com/lernza/lernza/issues/146)) ([72bed1b](https://github.com/lernza/lernza/commit/72bed1b43cf78d0fe169dcf9befd048b64fc9a57))
* Docs/api reference 42 ([#150](https://github.com/lernza/lernza/issues/150)) ([620e148](https://github.com/lernza/lernza/commit/620e148aca0c2505a223b75860832b38cd2ebd73))
* frontend add error boundary and global error handling ([#139](https://github.com/lernza/lernza/issues/139)) ([467e7c2](https://github.com/lernza/lernza/commit/467e7c2be453d31b7e01ecf5030dc79c6ab31b71))
* **frontend:** add form validation with React Hook Form and Zod ([#321](https://github.com/lernza/lernza/issues/321)) ([0eca13a](https://github.com/lernza/lernza/commit/0eca13ac6165546327d4ac5612647c5d84b0f5f5))
* **frontend:** add loading skeleton components ([7484ff6](https://github.com/lernza/lernza/commit/7484ff6df33e0cbc141720f75bd01fd5dfcce791))
* **frontend:** add per-quest open-graph metadata ([#347](https://github.com/lernza/lernza/issues/347)) ([8c14faa](https://github.com/lernza/lernza/commit/8c14faae3d4e1edfb50f9e06e34057fb106a5dd5))
* **frontend:** add quest preview mode in create-quest wizard ([#421](https://github.com/lernza/lernza/issues/421)) ([d5982cc](https://github.com/lernza/lernza/commit/d5982ccbdf0f028e777c02ab1946689d0cd9563d))
* **frontend:** add quest preview mode in create-quest wizard ([#421](https://github.com/lernza/lernza/issues/421)) ([697946d](https://github.com/lernza/lernza/commit/697946dec46e950d9be53a870f115ca56eadd0a7))
* **frontend:** add quest sharing and toast notifications ([b5668c2](https://github.com/lernza/lernza/commit/b5668c226c08d909d3c71833c0ac4b057e89fcce))
* **frontend:** implement dashboard analytics ([cb0fd11](https://github.com/lernza/lernza/commit/cb0fd1154f07053c308ca8837fff31cab412d513)), closes [#56](https://github.com/lernza/lernza/issues/56)
* **frontend:** implement proper client-side routing ([#28](https://github.com/lernza/lernza/issues/28)) ([6488489](https://github.com/lernza/lernza/commit/6488489092dd654564865d9050f2221b2c15e5cb))
* **frontend:** implement Quest detail page with Neo-brutalist styling ([8e0d531](https://github.com/lernza/lernza/commit/8e0d531451cbafdfc5d1d1a85cfff847ff52e143))
* **frontend:** implement quest progress tracking visualization ([#277](https://github.com/lernza/lernza/issues/277)) ([3c589a0](https://github.com/lernza/lernza/commit/3c589a0d6d36c865c95cb5bded96c891ea193d94))
* **frontend:** implement quest sharing and social features closes [#60](https://github.com/lernza/lernza/issues/60), closes [#21](https://github.com/lernza/lernza/issues/21) ([7434428](https://github.com/lernza/lernza/commit/7434428ebe9c0c95a0f18c7787d5511786134fb9))
* **frontend:** implement quest sharing and social features closes [#60](https://github.com/lernza/lernza/issues/60), closes [#21](https://github.com/lernza/lernza/issues/21) ([facc3d0](https://github.com/lernza/lernza/commit/facc3d0ede4efd1c27471bb2778ddb2f6fd4c703))
* **frontend:** integrate Soroban contracts and refactor to Quest domain ([a3a1ff6](https://github.com/lernza/lernza/commit/a3a1ff662e6b0894b18576449e91c734497d48bd))
* implement creator analytics and stellar expert links ([#418](https://github.com/lernza/lernza/issues/418)) ([4bb3ac4](https://github.com/lernza/lernza/commit/4bb3ac4925e0ecfaa040f9f0f2c27e896893fe9d))
* implement dark/light mode toggle with theme persistence ([cccd41e](https://github.com/lernza/lernza/commit/cccd41e1dd8b0d59ba1d9a848e614fad975f1fac))
* implement dark/light mode toggle with theme persistence ([6b6614c](https://github.com/lernza/lernza/commit/6b6614ce83c06a432b006a685f05096cd710a19a))
* implement dark/light mode toggle with theme persistence ([9f92077](https://github.com/lernza/lernza/commit/9f920779189d4edf22f59f949ae86faf0d4aa213))
* implement dark/light mode toggle with theme persistence ([33c0251](https://github.com/lernza/lernza/commit/33c0251e92ac431b894941774e040b55989f2f98))
* implement dark/light mode toggle with theme persistence ([88f2d1a](https://github.com/lernza/lernza/commit/88f2d1aa489a3845b07f437a6824345afb8961c3))
* implement dark/light mode toggle with theme persistence ([#124](https://github.com/lernza/lernza/issues/124)) ([b748740](https://github.com/lernza/lernza/commit/b7487400e4c6053181588540c162bbec4c2a828b))
* implement on-chain milestone creation in quest flow  ([#393](https://github.com/lernza/lernza/issues/393)) ([220dd07](https://github.com/lernza/lernza/commit/220dd07523d6b38ba59f805e0604001eb7001ae2))
* implement on-chain milestone creation in quest flow ([#382](https://github.com/lernza/lernza/issues/382)) ([2748948](https://github.com/lernza/lernza/commit/27489488fdbccc55b649262cde4eb07f3d8a6558))
* implement quest completion certificates (SBTs) ([#287](https://github.com/lernza/lernza/issues/287)) ([dd60ef8](https://github.com/lernza/lernza/commit/dd60ef84435e23668dcdc0e616dc19701a1f417b))
* implement quest sharing and social features ([c8045d7](https://github.com/lernza/lernza/commit/c8045d71aa8aea70bc55eb63767d45190c4e9af3))
* implement Soroban contract clients for Quest and Rewards ([#423](https://github.com/lernza/lernza/issues/423)) ([668a453](https://github.com/lernza/lernza/commit/668a4539e8d1a2dadb2af244ae7f28ee7497052b))
* implement Soroban contract clients for Quest and Rewards ([#423](https://github.com/lernza/lernza/issues/423)) ([f1dcdb6](https://github.com/lernza/lernza/commit/f1dcdb6c433fb9eae53dd39b855649d415b5b369))
* integrate milestone client, dashboard filtering, and quest lifecycle UX ([#420](https://github.com/lernza/lernza/issues/420)) ([ecdc2f8](https://github.com/lernza/lernza/commit/ecdc2f80083a8365965a847fe11600dea21b3083))
* integrate milestone client, dashboard filtering, and quest lifecycle UX ([#420](https://github.com/lernza/lernza/issues/420)) ([729b9e1](https://github.com/lernza/lernza/commit/729b9e18fe5e4d8a0fa7fd47f20a86aa2664998a))
* **integration:** replace mock workspace data with live quest and milestone reads ([#412](https://github.com/lernza/lernza/issues/412)) ([67cd6ea](https://github.com/lernza/lernza/commit/67cd6eac1628ef09d9ccaa14981d2e156109df8f))
* issue 335 milestone payout ([6ec5449](https://github.com/lernza/lernza/commit/6ec5449b75da87f98178d1ab02e8be52c562e418))
* issue 361 quest invitation ([bf7ded2](https://github.com/lernza/lernza/commit/bf7ded23583cb1ce5ccac93e13b2d19160b55f45))
* lazy loading pages ([#402](https://github.com/lernza/lernza/issues/402)) ([6b058f4](https://github.com/lernza/lernza/commit/6b058f4086d3a05f1db32de6c51aac3c8072b6f4))
* **milestone:** add configurable reward distribution modes ([#140](https://github.com/lernza/lernza/issues/140)) ([9f81229](https://github.com/lernza/lernza/commit/9f8122909a1b121f93c0babbf153cb87941ac3e3))
* modernize quest platform and resolve CI/CD blockers ([#400](https://github.com/lernza/lernza/issues/400)) ([040b6c5](https://github.com/lernza/lernza/commit/040b6c5064346ec692618f51205495492e9c5776))
* quest update function for name, description, and visibility, ad… ([#399](https://github.com/lernza/lernza/issues/399)) ([16c889c](https://github.com/lernza/lernza/commit/16c889c188686732102c9e9eea4d38bc7b473a75))
* refactor frontend mock data to match Soroban structs (fixes [#81](https://github.com/lernza/lernza/issues/81)) ([9b29610](https://github.com/lernza/lernza/commit/9b296105b7cd935d7c3921250160e86049d60420))
* **rewards:** add platform admin governance to rewards contract ([56865dd](https://github.com/lernza/lernza/commit/56865dd85a4f59b908837b2c1108a8a05fd9b320))
* **rewards:** validate SAC token liveness via try_symbol before funding ([#392](https://github.com/lernza/lernza/issues/392)) ([6b06dea](https://github.com/lernza/lernza/commit/6b06dea4b1664416a59bb89dbe8d214a7024a5a9))
* **security:** add comprehensive input validation across all contracts ([#325](https://github.com/lernza/lernza/issues/325)) ([6c62b5d](https://github.com/lernza/lernza/commit/6c62b5deaa03aa7676346fd65b15bbf4aa3c3e5d))
* **security:** add Content Security Policy headers for Netlify deployment ([#415](https://github.com/lernza/lernza/issues/415)) ([77e3f16](https://github.com/lernza/lernza/commit/77e3f16a9b8d60c76416ccf12234706f6fdbc0d5))
* token metadata formatting ([#422](https://github.com/lernza/lernza/issues/422)) ([32b4583](https://github.com/lernza/lernza/commit/32b45830e788136d7ee6944b662ec26262173675))
* token metadata formatting ([#422](https://github.com/lernza/lernza/issues/422)) ([bb8b599](https://github.com/lernza/lernza/commit/bb8b599225786cfaf88855c22e0ac63b74392a92))
* update .gitignore and package.json for generated TypeScript bindings from Soroban contract WASM ([ece8bc5](https://github.com/lernza/lernza/commit/ece8bc55524a3d6407612d3432f2d5be5a61e08f))
* update README to Reflect Current Contract Structure  ([#309](https://github.com/lernza/lernza/issues/309)) ([3dc0d25](https://github.com/lernza/lernza/commit/3dc0d2514c935adfac09063c7f2ce12e0ad71a9b))


### Bug Fixes

* **a11y:** add accessible names to decorative svgs  ([#308](https://github.com/lernza/lernza/issues/308)) ([34f764f](https://github.com/lernza/lernza/commit/34f764f75ae8fafe92814cae59d8d12e390163a5))
* add Broken Link and Stale Reference Checks ([#323](https://github.com/lernza/lernza/issues/323)) ([a2e272f](https://github.com/lernza/lernza/commit/a2e272f80ebf7463e2456cd5e14da692d9c3b83d))
* add quest validation, user role detection, and version pinning ([#419](https://github.com/lernza/lernza/issues/419)) ([fe14c1c](https://github.com/lernza/lernza/commit/fe14c1cd3bfd8e05d73bb4c754b4a2273396a4cf))
* add quest validation, user role detection, and version pinning ([#419](https://github.com/lernza/lernza/issues/419)) ([e600d8a](https://github.com/lernza/lernza/commit/e600d8ad1edcf57dca1a06c6595fef78308af349))
* align privacy docs and profile earnings ([#316](https://github.com/lernza/lernza/issues/316)) ([6f49653](https://github.com/lernza/lernza/commit/6f49653161d10ac71441bd9af173d4dff100b0f9))
* **ci:** add --admin flag to auto-merge to bypass branch protection ([06d1a83](https://github.com/lernza/lernza/commit/06d1a8387e8017a56e3bc50ff09b58226f49f088))
* **ci:** fix auto-review PR detection and empty body handling ([#416](https://github.com/lernza/lernza/issues/416)) ([a92dd32](https://github.com/lernza/lernza/commit/a92dd325c162a06e4beb9c30c063cf3b6b783ae7))
* **ci:** skip self-approval in auto-review, post comment instead ([#414](https://github.com/lernza/lernza/issues/414)) ([1991921](https://github.com/lernza/lernza/commit/19919210fee80ae97cedede7300a7d974dd89b53))
* **ci:** use heredoc delimiters for GITHUB_OUTPUT values with special chars ([4b0bbe0](https://github.com/lernza/lernza/commit/4b0bbe0abe98c40f772b42adde95c2ebf59ee4a2))
* **ci:** use owner PAT for auto-review ([#411](https://github.com/lernza/lernza/issues/411)) ([adccfad](https://github.com/lernza/lernza/commit/adccfad2446866aac46c650a7a01388e37ccef0a))
* **contract:** handle cross-contract failures and add enroll verification to milestone contract ([#286](https://github.com/lernza/lernza/issues/286)) ([f31cf41](https://github.com/lernza/lernza/commit/f31cf414ee1836cce16b2c8024e1bf5923568585))
* **contracts:** add ABI drift guard for quest-facing shared types ([#381](https://github.com/lernza/lernza/issues/381)) ([97e24a3](https://github.com/lernza/lernza/commit/97e24a3675a147b8771624e7c4ee7b9a9d29933c))
* **contracts:** block rewards authority self-payouts ([0909198](https://github.com/lernza/lernza/commit/09091988281f0a189f9ec357243b38ce0b91bd45))
* **contracts:** prevent milestone ownership race condition via cross-contract validation ([#132](https://github.com/lernza/lernza/issues/132)) ([f03ada4](https://github.com/lernza/lernza/commit/f03ada4c467146cc65c4f2943d2d19748d3427b8))
* **contracts:** Resolve failing CI due to mismatched QuestInfo and outdated quest_id parameters ([df4a247](https://github.com/lernza/lernza/commit/df4a247e4a5560536a56e42cd2b8582409f97282))
* **contracts:** verify workspace ownership during funding to prevent frontrunning ([#135](https://github.com/lernza/lernza/issues/135)) ([91c7cf7](https://github.com/lernza/lernza/commit/91c7cf7b76ca4545b4a2f31be68b0baef78c3a6b))
* **frontend:** add .env.local check to prevent invalid-contract-id crash ([#429](https://github.com/lernza/lernza/issues/429)) ([fdb0b85](https://github.com/lernza/lernza/commit/fdb0b85041a9174f91c9657686aa1fa7cb800634))
* **frontend:** add resilient public asset fallbacks ([#324](https://github.com/lernza/lernza/issues/324)) ([8d5225b](https://github.com/lernza/lernza/commit/8d5225b27c7536e9eb33ddd5fa7ded779d9c54cb))
* **frontend:** announce toasts to screen readers via persistent live … ([#386](https://github.com/lernza/lernza/issues/386)) ([e8d0624](https://github.com/lernza/lernza/commit/e8d0624aefb84baf01f835d7790dfa671b47f5a9))
* **frontend:** catch invalid contract ID to prevent crash on bad env var ([#388](https://github.com/lernza/lernza/issues/388)) ([b11e89c](https://github.com/lernza/lernza/commit/b11e89c41e4a1b7346986f7a3353dcd024b1a414))
* **frontend:** eliminate infinite fetch loop, replace spinner loader, add auto-review ([#409](https://github.com/lernza/lernza/issues/409)) ([fbdec74](https://github.com/lernza/lernza/commit/fbdec74056c09d60b60f1e0a8f10b5c9439944b6))
* **frontend:** extract Soroban return value from transaction response ([5641cf7](https://github.com/lernza/lernza/commit/5641cf74e8cf689a1292a5b7724d35ff6ad8e4bd))
* **frontend:** fix failing tests after PR merges ([#427](https://github.com/lernza/lernza/issues/427)) ([a5fc478](https://github.com/lernza/lernza/commit/a5fc478bc91b0d6d69eb58a86851b43a70321073))
* **frontend:** handle Freighter edge cases in wallet hook and navbar ([#311](https://github.com/lernza/lernza/issues/311)) ([513d881](https://github.com/lernza/lernza/commit/513d8810440ee07da37d7347b9b69871ce1ec0e0))
* **frontend:** improve wrong network banner with actionable instructions ([#390](https://github.com/lernza/lernza/issues/390)) ([f5b3670](https://github.com/lernza/lernza/commit/f5b3670d3313caa73d833d19d5476961f532ad82))
* **frontend:** make 404 recovery work for direct-entry users ([#389](https://github.com/lernza/lernza/issues/389)) ([f6b730b](https://github.com/lernza/lernza/commit/f6b730b19af0e24c8c7810628e8f520070a898dc))
* **frontend:** persist quest draft in localStorage across refreshes a… ([#312](https://github.com/lernza/lernza/issues/312)) ([4d6eea3](https://github.com/lernza/lernza/commit/4d6eea3e3f36b3f6422c22fbc4bb78166f44e133))
* **frontend:** prevent crash when contract IDs are not configured ([#385](https://github.com/lernza/lernza/issues/385)) ([d7ab9c9](https://github.com/lernza/lernza/commit/d7ab9c9badfe9fa440ef6e47d09e5f0b5267fecf))
* **frontend:** rename quest-detail components to kebab-case ([2d02341](https://github.com/lernza/lernza/commit/2d023417f05e478366470a5979beafad9bc94a70))
* **frontend:** replace dashboard mocks and standardize wallet tx states ([#320](https://github.com/lernza/lernza/issues/320)) ([c5bf971](https://github.com/lernza/lernza/commit/c5bf971b96bbe0bb41524aa32d1f6912edd1da51))
* **frontend:** resolve build errors from merged PRs ([#425](https://github.com/lernza/lernza/issues/425)) ([2383442](https://github.com/lernza/lernza/commit/23834424d4a48b1359a816ed37afb4fa0d1edcbd))
* **frontend:** resolve CI failures by updating lockfile and fixing lint warnings ([7911442](https://github.com/lernza/lernza/commit/791144236142c90089b8a199c20ff4bcbfdeb27c))
* **frontend:** resolve JSX parsing error and navigation consistency in Dashboard/App ([dab1768](https://github.com/lernza/lernza/commit/dab1768d1252266dcb029d6385784d4c47efde7f))
* **frontend:** resolve merge conflicts and align quest detail page with main ([5447f6a](https://github.com/lernza/lernza/commit/5447f6a068ea8d19c75d8308aa4c8ec945a9c8f7))
* **frontend:** resolve SDK 14 and Freighter types to fix build ([179a6a8](https://github.com/lernza/lernza/commit/179a6a889b0713b1b5eca7520e9da050d779b2a4))
* **frontend:** sync pnpm lockfile with package.json ([41df994](https://github.com/lernza/lernza/commit/41df994c6485c77f7dce01f2d0071974e18a05bd))
* **frontend:** wire Add Enrollee to quest contract with ownership gat… ([#313](https://github.com/lernza/lernza/issues/313)) ([430d358](https://github.com/lernza/lernza/commit/430d358627e71aadc85ddfafcecfa8fbe619765d))
* gate mock-backed product routes behind wallet auth ([#318](https://github.com/lernza/lernza/issues/318)) ([c54a614](https://github.com/lernza/lernza/commit/c54a61444890bf2e5609715fb04a175aca01a087))
* **milestone:** expose distribution config read endpoints ([#383](https://github.com/lernza/lernza/issues/383)) ([ea49873](https://github.com/lernza/lernza/commit/ea49873d84a7e3732449e88e00bc59dba5c31ed3))
* **quest:** validate create_quest inputs ([104bf02](https://github.com/lernza/lernza/commit/104bf028ab01b2fb164589768d3e4c5b871fa116))
* remove pr.md and fix any types in create-quest ([ac2a68c](https://github.com/lernza/lernza/commit/ac2a68cdb33edd7d14ce443f03d792107e025f3c))
* remove test coverage summary and update module comment ([c759e49](https://github.com/lernza/lernza/commit/c759e497b9f23df79f3672ed3d08206c8301619d))
* repair broken files from bulk PR merges ([55fdfcb](https://github.com/lernza/lernza/commit/55fdfcba7400a106a7399a00efd717b3667b69c6))
* resolve all contract compile errors, test failures, and frontend build issues ([8b1f476](https://github.com/lernza/lernza/commit/8b1f47684135a6271c4989d31ffd522cbe3ec01c))
* resolve rebase conflicts and apply formatting ([a091eb1](https://github.com/lernza/lernza/commit/a091eb1136eb9f90f7222db332cc81a3b0e6a0ca))
* resolve upstream rebase conflicts and fix milestone syntax error ([c092492](https://github.com/lernza/lernza/commit/c092492e36c21afffa8c986fffaac8604c77e723))
* **rewards:** add overflow/underflow protection for token amounts ([#51](https://github.com/lernza/lernza/issues/51)) ([#306](https://github.com/lernza/lernza/issues/306)) ([35c26b0](https://github.com/lernza/lernza/commit/35c26b0038110aced9270e4acb6e9e7ed6b9877c))
* **rewards:** add recovery flow for tokens sent directly to contract address ([7925db8](https://github.com/lernza/lernza/commit/7925db8c54621dfc85a7c87c36e3ca11a43e42de)), closes [#169](https://github.com/lernza/lernza/issues/169)
* **rewards:** handle get_quest cross-contract failures explicitly in fund_quest [#160](https://github.com/lernza/lernza/issues/160) ([#289](https://github.com/lernza/lernza/issues/289)) ([ff80b6f](https://github.com/lernza/lernza/commit/ff80b6f97c395319658e7b0158cdb6d005e6571a))
* share fallbacks, idempotent payouts, milestone flow ([#315](https://github.com/lernza/lernza/issues/315)) ([37820d7](https://github.com/lernza/lernza/commit/37820d7742854d772f426edfd173d09b261edc31))
* workspace test smoke and frontend readme truth ([#396](https://github.com/lernza/lernza/issues/396)) ([364e79b](https://github.com/lernza/lernza/commit/364e79b96bc0b1bf7d671719b23838f3e95211f3))


### Performance Improvements

* **frontend:** gate Vercel analytics behind VITE_ENABLE_ANALYTICS flag ([#391](https://github.com/lernza/lernza/issues/391)) ([fe9703d](https://github.com/lernza/lernza/commit/fe9703d457451436a9d709cc6197cef381194739))
* **frontend:** replace Recharts with pure SVG, drop 340 kB earnings-… ([#314](https://github.com/lernza/lernza/issues/314)) ([defb1ad](https://github.com/lernza/lernza/commit/defb1ad78f01479b2f56ed0b0913da8a8875c041))
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

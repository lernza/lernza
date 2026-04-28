import "@testing-library/jest-dom/vitest"
import { expect } from "vitest"
import * as axeMatchers from "vitest-axe/matchers"
import "vitest-axe/extend-expect"

expect.extend(axeMatchers)

# Framer-motion Bundle Impact Audit

## Current State

**Package**: `framer-motion@^12.38.0` (v12.38.0)
**Files using it**: 1
- `src/components/swipeable-quest-card.tsx`

## Usage Analysis

### SwipeableQuestCard Component

The component uses framer-motion for:

1. **Drag Gestures** (`drag="x"`)
   - Allows horizontal swiping to enroll/dismiss
   - Uses `onDragEnd` handler with offset detection
   - Critical feature for mobile experience

2. **Motion Values & Transforms**
   - `useMotionValue(0)` tracks drag offset
   - `useTransform()` creates interpolated values:
     - Opacity changes based on swipe direction
     - Background color animation (red/green)
     - Icon scale animation
   - Smooth visual feedback during drag

3. **AnimatePresence**
   - Conditional rendering of hint overlay
   - Entry/exit animations for the "Swipe to Act" hint

## Bundle Impact

- **framer-motion v12.38.0**: ~55-65KB (gzipped)
- Represents ~15-20% of typical React app bundle
- Used by only 1 component

## Alternatives Evaluated

### Option 1: Pure CSS + Pointer Events (Recommended)

**Pros:**
- Remove framer-motion entirely (~60KB savings)
- Native browser performance
- Smaller mental model for maintainers

**Cons:**
- No smooth motion value interpolation
- More verbose pointer event handling
- Loss of animated background feedback during drag
- AnimatePresence replacement requires manual transition management

**Estimate**: -60KB gzipped, +~150 lines of component code

### Option 2: motion Package

**Pros:**
- Lighter than framer-motion (~30KB gzipped)
- Similar API for basic transitions
- Drop-in replacement potential

**Cons:**
- Still adds 30KB (vs 0KB with vanilla)
- Minimal savings vs current approach
- No significant maintainability improvement

**Estimate**: -30KB gzipped

### Option 3: Keep framer-motion

**Pros:**
- Excellent developer experience
- Powerful, battle-tested library
- Smooth, polished animations
- AnimatePresence handles complexity elegantly

**Cons:**
- 60KB bundle cost for one component
- Could be seen as over-engineered for a swipe gesture

## Recommendation

**Keep framer-motion** for now. Here's why:

1. **Bundle impact is justified**: 60KB for a polished mobile-first interaction is reasonable
2. **Maintainability**: Swipe animations are notoriously finicky with pointer events. framer-motion handles drag normalization, multi-touch, and momentum automatically
3. **Mobile UX**: The motion value interpolations (background color, opacity, scale) provide visual feedback that improves UX
4. **Single dependency**: Not adding additional animation libs; this is the only one
5. **Performance**: framer-motion is optimized with GPU acceleration and will perform better than manual RAF loops

## Future Optimization Paths

If bundle size becomes a critical concern:

1. **Lazy-load the component**: Wrap SwipeableQuestCard in React.lazy() to load only on Dashboard
2. **Simplify animations**: Remove interpolated effects (background, scale) if they're deemed non-essential
3. **Migrate to CSS animations**: Only viable if UX requirements are scaled back

## Conclusion

The decision to keep framer-motion is sound given the single-use case and the complexity of drag interactions. The 60KB bundle cost is offset by:
- Superior touch gesture handling
- Automated performance optimizations
- Better maintainability compared to vanilla approaches
- Professional-grade animation polish that improves perceived app quality

No action required at this time.

import { getInteractionCount } from './polyfills/interactionCountPolyfill.js';

const MAX_INTERACTIONS_TO_CONSIDER = 10;
let prevInteractionCount = 0;
const getInteractionCountForNavigation = () => {
  return getInteractionCount() - prevInteractionCount;
};
class InteractionManager {
  constructor() {
    /**
     * A list of longest interactions on the page (by latency) sorted so the
     * longest one is first. The list is at most MAX_INTERACTIONS_TO_CONSIDER
     * long.
     */
    // oxlint-disable-next-line sdk/no-class-field-initializers
    this._longestInteractionList = [];
    /**
     * A mapping of longest interactions by their interaction ID.
     * This is used for faster lookup.
     */
    // oxlint-disable-next-line sdk/no-class-field-initializers
    this._longestInteractionMap = /* @__PURE__ */ new Map();
  }
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility, jsdoc/require-jsdoc
  _resetInteractions() {
    prevInteractionCount = getInteractionCount();
    this._longestInteractionList.length = 0;
    this._longestInteractionMap.clear();
  }
  /**
   * Returns the estimated p98 longest interaction based on the stored
   * interaction candidates and the interaction count for the current page.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  _estimateP98LongestInteraction() {
    const candidateInteractionIndex = Math.min(
      this._longestInteractionList.length - 1,
      Math.floor(getInteractionCountForNavigation() / 50)
    );
    return this._longestInteractionList[candidateInteractionIndex];
  }
  /**
   * Takes a performance entry and adds it to the list of worst interactions
   * if its duration is long enough to make it among the worst. If the
   * entry is part of an existing interaction, it is merged and the latency
   * and entries list is updated as needed.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  _processEntry(entry) {
    this._onBeforeProcessingEntry?.(entry);
    if (!(entry.interactionId || entry.entryType === "first-input")) return;
    const minLongestInteraction = this._longestInteractionList.at(-1);
    let interaction = this._longestInteractionMap.get(entry.interactionId);
    if (interaction || this._longestInteractionList.length < MAX_INTERACTIONS_TO_CONSIDER || // If the above conditions are false, `minLongestInteraction` will be set.
    entry.duration > minLongestInteraction._latency) {
      if (interaction) {
        if (entry.duration > interaction._latency) {
          interaction.entries = [entry];
          interaction._latency = entry.duration;
        } else if (entry.duration === interaction._latency && entry.startTime === interaction.entries[0].startTime) {
          interaction.entries.push(entry);
        }
      } else {
        interaction = {
          id: entry.interactionId,
          entries: [entry],
          _latency: entry.duration
        };
        this._longestInteractionMap.set(interaction.id, interaction);
        this._longestInteractionList.push(interaction);
      }
      this._longestInteractionList.sort((a, b) => b._latency - a._latency);
      if (this._longestInteractionList.length > MAX_INTERACTIONS_TO_CONSIDER) {
        const removedInteractions = this._longestInteractionList.splice(MAX_INTERACTIONS_TO_CONSIDER);
        for (const interaction2 of removedInteractions) {
          this._longestInteractionMap.delete(interaction2.id);
        }
      }
      this._onAfterProcessingINPCandidate?.(interaction);
    }
  }
}

export { InteractionManager };
//# sourceMappingURL=InteractionManager.js.map

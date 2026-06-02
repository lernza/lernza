class LCPEntryManager {
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility, jsdoc/require-jsdoc
  _processEntry(entry) {
    this._onBeforeProcessingEntry?.(entry);
  }
}

export { LCPEntryManager };
//# sourceMappingURL=LCPEntryManager.js.map

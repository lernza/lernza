Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

class LCPEntryManager {
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility, jsdoc/require-jsdoc
  _processEntry(entry) {
    this._onBeforeProcessingEntry?.(entry);
  }
}

exports.LCPEntryManager = LCPEntryManager;
//# sourceMappingURL=LCPEntryManager.js.map

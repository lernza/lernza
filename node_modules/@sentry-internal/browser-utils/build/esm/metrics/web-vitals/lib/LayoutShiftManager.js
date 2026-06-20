class LayoutShiftManager {
  constructor() {
    // oxlint-disable-next-line sdk/no-class-field-initializers
    this._sessionValue = 0;
    // oxlint-disable-next-line sdk/no-class-field-initializers
    this._sessionEntries = [];
  }
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  _processEntry(entry) {
    if (entry.hadRecentInput) return;
    const firstSessionEntry = this._sessionEntries[0];
    const lastSessionEntry = this._sessionEntries[this._sessionEntries.length - 1];
    if (this._sessionValue && firstSessionEntry && lastSessionEntry && entry.startTime - lastSessionEntry.startTime < 1e3 && entry.startTime - firstSessionEntry.startTime < 5e3) {
      this._sessionValue += entry.value;
      this._sessionEntries.push(entry);
    } else {
      this._sessionValue = entry.value;
      this._sessionEntries = [entry];
    }
    this._onAfterProcessingUnexpectedShift?.(entry);
  }
}

export { LayoutShiftManager };
//# sourceMappingURL=LayoutShiftManager.js.map

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const generateUniqueID = () => {
  return `v5-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
};

exports.generateUniqueID = generateUniqueID;
//# sourceMappingURL=generateUniqueID.js.map

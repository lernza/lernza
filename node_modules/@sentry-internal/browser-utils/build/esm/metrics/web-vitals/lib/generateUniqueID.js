const generateUniqueID = () => {
  return `v5-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
};

export { generateUniqueID };
//# sourceMappingURL=generateUniqueID.js.map

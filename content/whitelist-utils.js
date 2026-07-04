function channelListIncludes(channel, list) {
  if (!channel || !Array.isArray(list)) return false;
  if (Array.isArray(channel)) return channel.some(c => list.includes(c));
  return list.includes(channel);
}

function computeWhitelistUpdate(channel, shouldWhitelist, list, enabled) {
  if (!channel) return null;

  const current = Array.isArray(list) ? list : [];
  const has = current.includes(channel);
  const needsReEnable = shouldWhitelist && !enabled;
  if (shouldWhitelist === has && !needsReEnable) return null;

  const updates = {};
  let nextList = current;
  if (shouldWhitelist !== has) {
    nextList = shouldWhitelist
      ? [...current, channel]
      : current.filter(c => c !== channel);
    updates.channelWhitelist = nextList;
  }
  if (needsReEnable) {
    updates.channelWhitelistEnabled = true;
  }

  return { list: nextList, updates };
}

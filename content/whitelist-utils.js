function channelListIncludes(channel, list) {
  if (!channel || !Array.isArray(list)) return false;
  if (Array.isArray(channel)) return channel.some(c => list.includes(c));
  return list.includes(channel);
}

function computeWhitelistUpdate(channel, shouldWhitelist, list, enabled) {
  if (!channel) return null;
  const channels = Array.isArray(channel) ? channel : [channel];
  if (!channels.length) return null;

  const current = Array.isArray(list) ? list : [];
  const allPresent = channels.every(c => current.includes(c));
  const anyPresent = channels.some(c => current.includes(c));
  const needsListChange = shouldWhitelist ? !allPresent : anyPresent;
  const needsReEnable = shouldWhitelist && !enabled;
  if (!needsListChange && !needsReEnable) return null;

  const updates = {};
  let nextList = current;
  let changedChannels = [];
  if (needsListChange) {
    changedChannels = shouldWhitelist
      ? channels.filter(c => !current.includes(c))
      : channels.filter(c => current.includes(c));
    nextList = shouldWhitelist
      ? [...current, ...changedChannels]
      : current.filter(c => !channels.includes(c));
    updates.channelWhitelist = nextList;
  }
  if (needsReEnable) {
    updates.channelWhitelistEnabled = true;
  }

  return { list: nextList, updates, changedChannels, enabledChanged: !!needsReEnable };
}

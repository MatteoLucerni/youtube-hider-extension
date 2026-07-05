function channelListIncludes(channel, list) {
  if (!channel || !Array.isArray(list)) return false;
  if (Array.isArray(channel)) return channel.some(c => list.includes(c));
  return list.includes(channel);
}

function pluralizeChannelWord(channel) {
  const isMulti = Array.isArray(channel) && channel.length > 1;
  return {
    channelWord: isMulti ? 'these channels' : 'this channel',
    possessive: isMulti ? 'their' : 'its',
  };
}

function computeWhitelistUpdate(
  channel,
  shouldWhitelist,
  list,
  enabled,
  keys = { listKey: 'channelWhitelist', enabledKey: 'channelWhitelistEnabled' },
) {
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
    updates[keys.listKey] = nextList;
  }
  if (needsReEnable) {
    updates[keys.enabledKey] = true;
  }

  return { list: nextList, updates, changedChannels, enabledChanged: !!needsReEnable };
}

const MANAGER_SAMPLE_VIDEO_IDS = [
  'dQw4w9WgXcQ',
  'jNQXAC9IVRw',
  '9bZkp7q19f0',
  'kJQP7kiw5Fk',
  'fJ9rUzIMcZQ',
  'hT_nvWreIhg',
  'OPf0YbXqDm0',
  'JGwWNGJdvx8',
];
const MANAGER_SAMPLE_SPACING_SECONDS = 26 * 60 * 60;

async function fetchVideoDetails(videoId) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const handle = new URL(data.author_url).pathname.toLowerCase();
    return { title: data.title, channel: handle };
  } catch {
    return null;
  }
}

async function buildManagerSample() {
  const details = await Promise.all(MANAGER_SAMPLE_VIDEO_IDS.map(fetchVideoDetails));
  const videos = MANAGER_SAMPLE_VIDEO_IDS.map((id, index) => ({ id, details: details[index] })).filter(
    video => video.details
  );
  if (!videos.length) {
    throw new Error('Could not load any sample video details from YouTube oEmbed');
  }
  const now = Math.floor(Date.now() / 1000);
  const markedWatched = videos.map((video, index) => [
    video.id,
    now - (videos.length - index) * MANAGER_SAMPLE_SPACING_SECONDS,
  ]);
  const markedWatchedMeta = Object.fromEntries(
    videos.map(video => [video.id, [video.details.title, video.details.channel]])
  );
  return { markedWatched, markedWatchedMeta };
}

const LIST_SAMPLE_WHITELIST = [
  '/@vintagemapsclub',
  '/@urbanbirdwatch',
  '/@morningpianoroom',
  '/@homebrewcircuits',
  '/@deepseadispatch',
  '/@citysketchbook',
  '/@woodshopsundays',
  '/@slowtravelfilms',
  '/@pocketphysics',
  '/@nightskyweekly',
  '/@quietkitchenlab',
  '/@alpinetrailnotes',
];
const LIST_SAMPLE_BLACKLIST_SIZE = 2431;
const LIST_SAMPLE_TITLE_WHITELIST = ['tutorial', 'documentary', 'lecture', 'field notes', 'how to', 'recipe'];
const LIST_SAMPLE_TITLE_BLACKLIST_SIZE = 24;
const LIST_SAMPLE_PASTE = ['@paperboatstudio', 'youtube.com/@trailmixmusic', '@alpinetrailnotes'].join('\n');

function buildListsSample() {
  const pad = (value, size) => String(value).padStart(size, '0');
  return {
    channelWhitelist: [...LIST_SAMPLE_WHITELIST],
    channelBlacklist: Array.from({ length: LIST_SAMPLE_BLACKLIST_SIZE }, (_, i) => '/@sample-channel-' + pad(i, 4)),
    titleWhitelist: [...LIST_SAMPLE_TITLE_WHITELIST],
    titleBlacklist: Array.from({ length: LIST_SAMPLE_TITLE_BLACKLIST_SIZE }, (_, i) => 'sample word ' + pad(i, 2)),
  };
}

module.exports = { buildManagerSample, buildListsSample, LIST_SAMPLE_PASTE };

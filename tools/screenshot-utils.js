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

module.exports = { buildManagerSample };

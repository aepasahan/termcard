/** Well-known services, used to give links a readable label and a stable id automatically. */

const services = [
  ['linkedin', 'LinkedIn', ['linkedin.com']],
  ['github', 'GitHub', ['github.com']],
  ['gitlab', 'GitLab', ['gitlab.com']],
  ['x', 'X', ['x.com', 'twitter.com']],
  ['bluesky', 'Bluesky', ['bsky.app']],
  ['threads', 'Threads', ['threads.net', 'threads.com']],
  ['instagram', 'Instagram', ['instagram.com']],
  ['facebook', 'Facebook', ['facebook.com']],
  ['youtube', 'YouTube', ['youtube.com', 'youtu.be']],
  ['tiktok', 'TikTok', ['tiktok.com']],
  ['behance', 'Behance', ['behance.net']],
  ['dribbble', 'Dribbble', ['dribbble.com']],
  ['medium', 'Medium', ['medium.com']],
  ['devto', 'DEV', ['dev.to']],
  ['stackoverflow', 'Stack Overflow', ['stackoverflow.com']],
  ['npm', 'npm', ['npmjs.com']],
  ['codepen', 'CodePen', ['codepen.io']],
  ['figma', 'Figma', ['figma.com']],
  ['producthunt', 'Product Hunt', ['producthunt.com']],
  ['calendly', 'Calendly', ['calendly.com']],
  ['cal', 'Cal.com', ['cal.com']],
];

export function identifyService(url) {
  let host;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const [id, label, hosts] of services) {
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return { id, label };
  }
  return { id: host.split('.').slice(-2, -1)[0] || host, label: host };
}

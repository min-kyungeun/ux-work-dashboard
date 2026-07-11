#!/usr/bin/env node
/**
 * GitHub Projects v2 데이터 페처
 * 실행: GITHUB_TOKEN=xxx node scripts/fetch-data.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN;
const ORG = 'hkmc-airlab';
const PROJECT_NUMBER = 59;

const MILESTONE_REPOS = {
  'shucle-rider':                 'Rider',
  'shucle-DriverVehicle-product': 'Driver',
  'shucle-taxidriver-product':    'Taxi Driver',
  'shucle-kiosk':                 'Kiosk',
  'shucle-CallAgent-product':     'Call Agent',
};

const ALWAYS_ON_REPOS = {
  'shucle-product':  'Product',
  'shucle-registry': 'Registry',
  'shucle-ux':       'UX',
};

const ALL_REPOS = { ...MILESTONE_REPOS, ...ALWAYS_ON_REPOS };

const STATUS_ORDER = ['todo', 'in progress', 'spec fix', 'md fix'];

function normalizeStatus(raw) {
  if (!raw) return 'other';
  const s = raw.toLowerCase().trim();
  if (s === 'todo')                  return 'todo';
  if (s === 'in progress')           return 'in-progress';
  if (s === 'spec fix' || s === 'spec fixed') return 'spec-fix';
  if (s === 'md fix'   || s === 'md updated') return 'md-fix';
  if (s === 'icebox')                return 'icebox';
  return 'other';
}

async function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ux-dashboard',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errors) {
            console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
            reject(new Error(json.errors[0]?.message || JSON.stringify(json.errors)));
          } else if (!json.data) {
            console.error('Raw response:', data);
            reject(new Error('GraphQL returned no data'));
          } else {
            resolve(json.data);
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const ITEMS_QUERY = `
  query($org: String!, $num: Int!, $cursor: String) {
    organization(login: $org) {
      projectV2(number: $num) {
        title
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            content {
              ... on Issue {
                title number url state
                milestone { title }
                repository { name }
                issueType { name }
                assignees(first: 5) {
                  nodes { login avatarUrl }
                }
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchAllItems() {
  const items = [];
  let cursor = null;

  while (true) {
    const data = await graphql(ITEMS_QUERY, { org: ORG, num: PROJECT_NUMBER, cursor });
    const page = data.organization.projectV2.items;
    for (const node of page.nodes) {
      if (!node.content || !node.content.repository) continue;
      const repoName = node.content.repository.name;
      if (!ALL_REPOS[repoName]) continue;

      const statusField = node.fieldValues.nodes.find(
        f => f.field && f.field.name && f.field.name.toLowerCase() === 'status'
      );
      const typeField = node.fieldValues.nodes.find(
        f => f.field && f.field.name && f.field.name.toLowerCase() === 'type'
      );
      const rawStatus = statusField ? statusField.name : null;
      const rawType   = typeField   ? typeField.name.toLowerCase()
                      : node.content.issueType ? node.content.issueType.name.toLowerCase()
                      : null;

      items.push({
        title:     node.content.title,
        number:    node.content.number,
        url:       node.content.url,
        state:     node.content.state,
        milestone: node.content.milestone ? node.content.milestone.title : null,
        repo:      repoName,
        type:      rawType,
        status:    rawType === 'task' ? null
                   : node.content.state === 'CLOSED' ? 'done'
                   : normalizeStatus(rawStatus),
        assignees: (node.content.assignees?.nodes || []).map(a => ({
          login:      a.login,
          avatar_url: a.avatarUrl,
        })),
      });
    }

    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }

  return items;
}

function buildRepoStats(items, repoMap) {
  const result = {};
  for (const [repo, displayName] of Object.entries(repoMap)) {
    const repoItems = items.filter(i => i.repo === repo);
    const counts = { todo: 0, 'in-progress': 0, 'spec-fix': 0, 'md-fix': 0, done: 0, other: 0 };
    for (const item of repoItems) counts[item.status] = (counts[item.status] || 0) + 1;
    result[repo] = {
      display_name: displayName,
      total: repoItems.length,
      status_counts: counts,
      issues: repoItems.map(({ title, number, url, type, status, milestone, assignees }) =>
        ({ title, number, url, type, status, milestone, assignees: assignees || [] })
      ),
    };
  }
  return result;
}

async function restGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ux-dashboard',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchRecentIssues(repos) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();

  const result = {};
  for (const repo of repos) {
    console.log(`  Fetching recent issues: ${repo}`);
    try {
      const issues = await restGet(
        `/repos/hkmc-airlab/${repo}/issues?state=all&sort=updated&direction=desc&since=${sinceStr}&per_page=50`
      );
      result[repo] = Array.isArray(issues) ? issues.map(i => ({
        number:     i.number,
        title:      i.title,
        url:        i.html_url,
        state:      i.state,
        updated_at: i.updated_at,
        assignees:  (i.assignees || []).map(a => a.login),
        labels:     (i.labels || []).map(l => l.name),
        milestone:  i.milestone?.title || null,
      })) : [];
    } catch (e) {
      console.error(`  Failed ${repo}:`, e.message);
      result[repo] = [];
    }
  }
  return result;
}

async function fetchNotifications() {
  try {
    const data = await restGet('/notifications?all=false&per_page=5');
    if (!Array.isArray(data)) return [];
    return data.slice(0, 5).map(n => ({
      id:         n.id,
      title:      n.subject?.title || '',
      type:       n.subject?.type  || '',
      url:        n.subject?.url   || '',
      repo:       n.repository?.full_name || '',
      reason:     n.reason || '',
      updated_at: n.updated_at,
      unread:     n.unread,
      web_url:    (n.subject?.url || '').replace('api.github.com/repos','github.com').replace('/pulls/','/pull/').replace('/issues/','/issues/'),
    }));
  } catch (e) {
    console.error('Notifications fetch failed:', e.message);
    return [];
  }
}

async function main() {
  if (!TOKEN) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

  console.log('Fetching project items...');
  const items = await fetchAllItems();
  console.log(`Fetched ${items.length} items`);

  console.log('Fetching GitHub notifications...');
  const notifications = await fetchNotifications();
  console.log(`  ${notifications.length} notifications`);

  console.log('Fetching recent issue updates...');
  const allRepos = [...Object.keys(MILESTONE_REPOS), ...Object.keys(ALWAYS_ON_REPOS)];
  const recentUpdates = await fetchRecentIssues(allRepos);

  const output = {
    generated_at: new Date().toISOString(),
    notifications,
    milestone_products: buildRepoStats(items, MILESTONE_REPOS),
    always_on_products: buildRepoStats(items, ALWAYS_ON_REPOS),
    recent_updates: recentUpdates,
  };

  const outPath = path.join(__dirname, '../data/issues.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Written to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });

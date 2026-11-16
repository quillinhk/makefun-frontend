// Small helpers for showing API values, and a tiny Markdown renderer
// (headings, bold, italic, code, links, lists) for bounty descriptions
// and rules, which the API returns as Markdown.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00' or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A count with thousands separators. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Whether a bounty still takes entries: by its deadline, not its status. */
export function stillOpen(bounty) {
  return Boolean(bounty?.deadline) && new Date(bounty.deadline).getTime() > Date.now();
}

/** Inline Markdown (bold, italic, code, links) inside one escaped line. */
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong>${bold}</strong>`)
    .replace(/\*([^*]+)\*/g, (_, it) => `<em>${it}</em>`)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
}

/** A Markdown document to HTML. Headings, lists, code blocks, rules. */
export function md(source) {
  const lines = String(source ?? '').split('\n');
  const out = [];
  let list = null;
  let pre = false;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line.startsWith('```')) {
      if (pre) out.push('</code></pre>');
      else {
        closeList();
        out.push('<pre><code>');
      }
      pre = !pre;
      continue;
    }
    if (pre) {
      out.push(`${esc(line)}\n`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      out.push(`<h${heading[1].length + 1}>${inline(esc(heading[2]))}</h${heading[1].length + 1}>`);
      continue;
    }
    if (/^---+$/.test(line)) {
      closeList();
      out.push('<hr>');
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) {
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline(esc(item[1]))}</li>`);
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline(esc(ordered[1]))}</li>`);
      continue;
    }
    if (line === '') {
      closeList();
      continue;
    }
    closeList();
    out.push(`<p>${inline(esc(line))}</p>`);
  }
  closeList();
  if (pre) out.push('</code></pre>');
  return out.join('\n');
}

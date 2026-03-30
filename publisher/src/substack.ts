import axios from 'axios';
import type { BriefOutputType } from 'shared-types';

const SUBSTACK_API_KEY = process.env.SUBSTACK_API_KEY;
const PUBLICATION_ID = process.env.SUBSTACK_PUBLICATION_ID;

// Format brief as HTML for Substack
function formatBriefAsHTML(brief: BriefOutputType): string {
  const signalRows = brief.expert.signals.map(s => `
    <tr>
      <td>${s.label}</td>
      <td><strong>${s.value}</strong></td>
      <td><a href="${s.source_url}">${s.source}</a></td>
      <td>${s.delta}</td>
      <td>${s.flag !== 'normal' ? `⚠️ ${s.flag_reason || s.flag}` : '—'}</td>
    </tr>
  `).join('');

  return `
<p style="background:#f9f9f9;padding:12px;border-left:3px solid #ccc;font-size:13px;">
  <strong>Disclaimer:</strong> ${brief.disclaimer}
</p>

<h2>Today's Brief</h2>
<p>${brief.beginner.body.replace(/\n\n/g, '</p><p>')}</p>
<p><strong>Key takeaway:</strong> ${brief.beginner.key_takeaway}</p>

<hr/>
<h3>Expert Signals</h3>
<p><em>${brief.expert.summary_line}</em></p>
<table>
  <thead>
    <tr><th>Signal</th><th>Value</th><th>Source</th><th>Delta</th><th>Flag</th></tr>
  </thead>
  <tbody>${signalRows}</tbody>
</table>

${brief.expert.anomalies.length > 0 ? `
<h4>Anomalies Detected</h4>
<ul>${brief.expert.anomalies.map(a => `<li>${a}</li>`).join('')}</ul>
` : ''}

<hr/>
<p style="font-size:12px;color:#888;">${brief.disclaimer}</p>
`;
}

export async function publishToSubstack(brief: BriefOutputType): Promise<string | null> {
  const html = formatBriefAsHTML(brief);
  const subject = `${brief.date} — ${brief.beginner.headline}`;

  // Try Substack API if configured
  if (SUBSTACK_API_KEY && PUBLICATION_ID) {
    try {
      const res = await axios.post(
        `https://api.substack.com/api/v1/publication/${PUBLICATION_ID}/posts`,
        {
          draft: true, // Always create as draft first for review
          title: subject,
          subtitle: brief.expert.summary_line,
          body: html,
          section_id: null
        },
        {
          headers: {
            'Authorization': `Bearer ${SUBSTACK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const postUrl = res.data.canonical_url;
      console.log(`[Publisher] ✅ Draft created on Substack: ${postUrl}`);
      return postUrl;
    } catch (err) {
      console.warn('[Publisher] Substack API failed — falling back to HTML');
    }
  }

  // Fallback: save as HTML file
  const fs = await import('fs/promises');
  await fs.mkdir('./output', { recursive: true });
  const filename = `./output/brief-${brief.date}.html`;
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; padding: 0 20px; color: #333; }
    h2 { color: #1a1a1a; }
    h3 { color: #444; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    a { color: #0066cc; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
  </style>
</head>
<body>
  <h1>${subject}</h1>
  ${html}
</body>
</html>`;

  await fs.writeFile(filename, fullHtml);
  console.log(`[Publisher] 📄 Saved to ${filename} — copy into Substack editor to publish`);
  return null;
}

export { formatBriefAsHTML };

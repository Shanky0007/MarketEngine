import 'dotenv/config';
import axios from 'axios';

async function test() {
  const key = process.env.TINYFISH_API_KEY;
  console.log('Key starts with:', key?.substring(0, 20));
  console.log('Key length:', key?.length);

  try {
    const r = await axios.post(
      'https://agent.tinyfish.ai/v1/automation/run-async',
      {
        url: 'https://example.com',
        goal: 'Return the page title as JSON: { "title": "string" }',
        browser_profile: 'lite'
      },
      { headers: { 'X-API-Key': key!, 'Content-Type': 'application/json' } }
    );
    console.log('SUCCESS:', r.data);
  } catch (e: any) {
    console.log('ERROR status:', e.response?.status);
    console.log('ERROR data:', JSON.stringify(e.response?.data));
  }
}

test();

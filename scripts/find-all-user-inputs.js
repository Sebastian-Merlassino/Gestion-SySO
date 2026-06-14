const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\sebas\\.gemini\\antigravity-ide\\brain\\cedff97f-c541-441e-917a-391e03f049bc\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        console.log(`Index: ${obj.step_index}, Length: ${obj.content ? obj.content.length : 0}, Starts with: ${obj.content ? obj.content.substring(0, 100).replace(/\n/g, ' ') : ''}`);
      }
    } catch (e) {
      // ignore
    }
  });
} catch (err) {
  console.error('Error:', err);
}

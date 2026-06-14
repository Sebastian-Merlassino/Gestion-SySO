const fs = require('fs');
const transcriptPath = 'C:\\Users\\sebas\\.gemini\\antigravity-ide\\brain\\cedff97f-c541-441e-917a-391e03f049bc\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 2474) {
        console.log('CONTENT:');
        console.log(obj.content);
        break;
      }
    } catch (e) {}
  }
} catch (err) {
  console.error('Error:', err);
}

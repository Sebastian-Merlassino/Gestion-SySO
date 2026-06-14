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
      console.log(`Line ${index + 1}: step_index=${obj.step_index}, type=${obj.type}, source=${obj.source}, content_len=${obj.content ? obj.content.length : 0}`);
      if (obj.type === 'USER_INPUT' && obj.content && obj.content.includes('Cultivo de arroz')) {
        console.log(`  --> Contains 'Cultivo de arroz'`);
        if (obj.content.includes('truncated')) {
          console.log(`  --> BUT IT CONTAINS 'truncated'!`);
        } else {
          console.log(`  --> AND IT DOES NOT CONTAIN 'truncated'!`);
        }
      }
    } catch (e) {
      console.error(`Line ${index + 1} parse error: ${e.message}`);
    }
  });
} catch (err) {
  console.error('Error:', err);
}

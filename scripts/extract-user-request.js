const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\sebas\\.gemini\\antigravity-ide\\brain\\cedff97f-c541-441e-917a-391e03f049bc\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'extracted_request.md');

try {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  let lastUserInput = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        lastUserInput = obj.content;
      }
    } catch (e) {
      // Ignore invalid JSON lines
    }
  }

  if (lastUserInput) {
    fs.writeFileSync(outputPath, lastUserInput, 'utf8');
    console.log('Successfully extracted last user input to:', outputPath);
  } else {
    console.log('No USER_INPUT found in transcript');
  }
} catch (err) {
  console.error('Error reading/writing files:', err);
}

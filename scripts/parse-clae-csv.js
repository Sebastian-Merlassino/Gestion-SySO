const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'clae_agg.csv');
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260617000000_create_actividades_economicas.sql');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

try {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');
  const activities = [];

  // Start from line 1 to skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    if (parts.length >= 2) {
      const codigo = parts[0].trim();
      let descripcion = parts[1].trim();
      
      // Remove surrounding quotes if any
      if (descripcion.startsWith('"') && descripcion.endsWith('"')) {
        descripcion = descripcion.slice(1, -1);
      }
      
      // Escape single quotes for SQL
      descripcion = descripcion.replace(/'/g, "''");
      
      if (codigo && descripcion) {
        activities.push({ codigo, descripcion });
      }
    }
  }

  console.log(`Parsed ${activities.length} activities.`);

  if (activities.length === 0) {
    console.error('No activities parsed!');
    process.exit(1);
  }

  // Generate SQL migration content
  let sql = `-- Migration to create public.actividades_economicas table and populate it
CREATE TABLE IF NOT EXISTS public.actividades_economicas (
    codigo VARCHAR(50) PRIMARY KEY,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.actividades_economicas ENABLE ROW LEVEL SECURITY;

-- Select policy for authenticated/public read
CREATE POLICY "Permitir lectura publica de actividades" ON public.actividades_economicas
    FOR SELECT TO public USING (true);

-- Insert data
INSERT INTO public.actividades_economicas (codigo, descripcion) VALUES
`;

  const valueRows = activities.map(act => `('${act.codigo}', '${act.descripcion}')`);
  sql += valueRows.join(',\n') + '\nON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion;\n';

  fs.writeFileSync(migrationPath, sql, 'utf8');
  console.log('Successfully generated SQL migration at:', migrationPath);

} catch (err) {
  console.error('Error generating activities migration:', err);
}

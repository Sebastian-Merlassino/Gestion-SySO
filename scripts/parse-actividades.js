const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, 'extracted_request.md');
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260617000000_create_actividades_economicas.sql');

try {
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const lines = mdContent.split('\n');
  const activities = [];

  for (const line of lines) {
    // Check if line matches a table row with format | code | description |
    const match = line.trim().match(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|$/);
    if (match) {
      const codigo = match[1].trim();
      let descripcion = match[2].trim();
      
      // Clean up any extra trailing characters or issues
      descripcion = descripcion.replace(/'/g, "''"); // escape single quotes for SQL
      activities.push({ codigo, descripcion });
    }
  }

  console.log(`Parsed ${activities.length} activities.`);

  if (activities.length === 0) {
    console.error('No activities parsed! Check table format.');
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

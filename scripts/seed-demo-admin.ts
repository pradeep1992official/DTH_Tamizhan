// Explicit local fixture export only. Never imports Firebase or the application store.
import { createInterface } from 'node:readline/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createDemoAdminData } from '../tests/fixtures/demoAdminData';

if (process.env.NODE_ENV !== 'development') throw new Error('Fixture export is development-only.');
const prompt = createInterface({ input: process.stdin, output: process.stdout });
try {
  const answer = await prompt.question('Type EXPORT LOCAL FIXTURES to create isolated fixture files (no database writes): ');
  if (answer !== 'EXPORT LOCAL FIXTURES') throw new Error('Fixture export cancelled.');
  const directory = new URL('../.local-fixtures/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('admin-demo.json', directory), JSON.stringify(createDemoAdminData(), null, 2), { flag: 'wx' });
  console.log(`Exported fixtures to ${fileURLToPath(directory)}. No application data changed.`);
} finally { prompt.close(); }

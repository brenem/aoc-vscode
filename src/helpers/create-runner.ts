import * as fs from 'fs';
import * as path from 'path';

export interface RunnerConfig {
    solutionPath: string;
    inputPath: string;
    part: 1 | 2;
    tempDir: string;
}

export function createRunner(config: RunnerConfig): string {
    const { solutionPath, inputPath, part, tempDir } = config;
    
    // Read input
    let input = '';
    if (fs.existsSync(inputPath)) {
        input = fs.readFileSync(inputPath, 'utf-8');
    }
    
    // Escape backticks and dollar signs in input for template literal
    const escapedInput = input
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
    
    // Create runner script
    const runnerCode = `
import { part${part} } from '${solutionPath.replace(/\\/g, '/')}';

const input = \`${escapedInput}\`;

console.log('='.repeat(50));
console.log('Running Part ${part}');
console.log('='.repeat(50));

const startTime = Date.now();
const result = part${part}(input);
const elapsed = Date.now() - startTime;

console.log('\\nResult:', result);
console.log(\`Time: \${elapsed}ms\`);
console.log('='.repeat(50));
`;

    // Write runner to temp directory
    const runnerPath = path.join(tempDir, `runner-part${part}.ts`);
    fs.writeFileSync(runnerPath, runnerCode, 'utf-8');
    
    return runnerPath;
}

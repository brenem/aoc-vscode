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
let result;
let success = true;
let error = null;

try {
    result = part${part}(input);
} catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
}

const elapsed = Date.now() - startTime;

if (success) {
    console.log('\\nResult:', result);
    console.log(\`Time: \${elapsed}ms\`);
    console.log('='.repeat(50));
    
    // Output stats for parsing (JSON on single line)
    console.log('__STATS__' + JSON.stringify({
        result: result,
        executionTime: elapsed,
        timestamp: Date.now(),
        success: true
    }));
} else {
    console.log('\\nError:', error);
    console.log(\`Time: \${elapsed}ms\`);
    console.log('='.repeat(50));
    
    // Output error stats
    console.log('__STATS__' + JSON.stringify({
        result: 'ERROR',
        executionTime: elapsed,
        timestamp: Date.now(),
        success: false
    }));
}
`;

    // Write runner to temp directory
    const runnerPath = path.join(tempDir, `runner-part${part}.ts`);
    fs.writeFileSync(runnerPath, runnerCode, 'utf-8');
    
    return runnerPath;
}

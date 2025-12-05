import * as fs from 'fs';
import * as path from 'path';

export interface RunnerConfig {
    solutionPath: string;
    inputPath: string;
    part: 1 | 2;
    tempDir: string;
    inputSource?: 'input' | 'sample'; // Optional: defaults to 'input'
}

export function createRunner(config: RunnerConfig): string {
    const { solutionPath, inputPath, part, tempDir, inputSource = 'input' } = config;
    
    // Determine the actual input file to use
    const actualInputPath = inputSource === 'sample'
        ? inputPath.replace('input.txt', 'sample.txt')
        : inputPath;
    
    // Read input
    let input = '';
    if (fs.existsSync(actualInputPath)) {
        input = fs.readFileSync(actualInputPath, 'utf-8');
    }
    
    // Escape backticks and dollar signs in input for template literal
    const escapedInput = input
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
    
    // Create runner script with async support
    const runnerCode = `
import { part${part} } from '${solutionPath.replace(/\\/g, '/')}';

const input = \`${escapedInput}\`;

(async () => {
    console.log('='.repeat(50));
    console.log('Running Part ${part}');
    console.log('='.repeat(50));

    const startTime = Date.now();
    let result;
    let success = true;
    let error = null;

    try {
        result = await part${part}(input);
    } catch (e) {
        success = false;
        error = e instanceof Error ? e.message : String(e);
    }

    const elapsed = Date.now() - startTime;

    if (success) {
        // Convert BigInt to string for display
        const displayResult = typeof result === 'bigint' ? result.toString() : result;
        
        console.log('\\nResult:', displayResult);
        if (typeof result === 'bigint') {
            console.log('(BigInt)');
        }
        console.log(\`Time: \${elapsed}ms\`);
        console.log('='.repeat(50));
        
        // Output stats for parsing (JSON on single line)
        // Convert BigInt to string for JSON serialization
        console.log('__STATS__' + JSON.stringify({
            result: displayResult,
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
})();
`;

    // Write runner to temp directory
    const runnerPath = path.join(tempDir, `runner-part${part}.ts`);
    fs.writeFileSync(runnerPath, runnerCode, 'utf-8');
    
    return runnerPath;
}

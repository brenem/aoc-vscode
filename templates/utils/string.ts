/**
 * String utilities for Advent of Code
 */

/**
 * Split input into lines
 */
export function lines(input: string): string[] {
    return input.trim().split('\n');
}

/**
 * Split input into sections separated by blank lines
 */
export function sections(input: string): string[] {
    return input.trim().split('\n\n');
}

/**
 * Count occurrences of a substring
 */
export function countOccurrences(str: string, substr: string): number {
    let count = 0;
    let pos = 0;
    while ((pos = str.indexOf(substr, pos)) !== -1) {
        count++;
        pos += substr.length;
    }
    return count;
}

/**
 * Reverse a string
 */
export function reverse(str: string): string {
    return str.split('').reverse().join('');
}

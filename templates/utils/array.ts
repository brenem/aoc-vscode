/**
 * Array utilities for Advent of Code
 */

/**
 * Split array into chunks of given size
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Get sliding windows of given size
 */
export function windows<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i <= array.length - size; i++) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

/**
 * Group array elements by a key function
 */
export function groupBy<T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
): Record<K, T[]> {
    const groups = {} as Record<K, T[]>;
    for (const item of array) {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
    }
    return groups;
}

/**
 * Count occurrences of each element
 */
export function countBy<T>(array: T[]): Map<T, number> {
    const counts = new Map<T, number>();
    for (const item of array) {
        counts.set(item, (counts.get(item) || 0) + 1);
    }
    return counts;
}

/**
 * Get unique elements from array
 */
export function unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
}

/**
 * Transpose a 2D array (flip rows and columns)
 */
export function transpose<T>(array: T[][]): T[][] {
    if (array.length === 0) return [];
    return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
}

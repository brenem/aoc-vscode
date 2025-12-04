/**
 * Math utilities for Advent of Code
 */

/**
 * Greatest Common Divisor
 */
export function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

/**
 * Least Common Multiple
 */
export function lcm(a: number, b: number): number {
    return (a * b) / gcd(a, b);
}

/**
 * Parse all numbers from a string
 */
export function parseNumbers(input: string): number[] {
    const matches = input.match(/-?\d+/g);
    return matches ? matches.map(Number) : [];
}

/**
 * Sum an array of numbers
 */
export function sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
}

/**
 * Product of an array of numbers
 */
export function product(numbers: number[]): number {
    return numbers.reduce((a, b) => a * b, 1);
}

/**
 * Range from start to end (inclusive)
 */
export function range(start: number, end: number): number[] {
    const result: number[] = [];
    for (let i = start; i <= end; i++) {
        result.push(i);
    }
    return result;
}

/**
 * Manhattan distance between two points
 */
export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

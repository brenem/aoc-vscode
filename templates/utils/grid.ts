/**
 * Grid and matrix utilities for Advent of Code
 */

export type Point = { x: number; y: number };
export type Grid<T> = T[][];

/**
 * Parse a grid from input string
 */
export function parseGrid(input: string): string[][] {
    return input.trim().split('\n').map(line => line.split(''));
}

/**
 * Get the value at a point in the grid
 */
export function getCell<T>(grid: Grid<T>, point: Point): T | undefined {
    if (point.y < 0 || point.y >= grid.length) return undefined;
    if (point.x < 0 || point.x >= grid[point.y].length) return undefined;
    return grid[point.y][point.x];
}

/**
 * Cardinal directions (up, right, down, left)
 */
export const CARDINAL_DIRECTIONS: Point[] = [
    { x: 0, y: -1 }, // up
    { x: 1, y: 0 },  // right
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }  // left
];

/**
 * All 8 directions including diagonals
 */
export const ALL_DIRECTIONS: Point[] = [
    { x: 0, y: -1 },  // up
    { x: 1, y: -1 },  // up-right
    { x: 1, y: 0 },   // right
    { x: 1, y: 1 },   // down-right
    { x: 0, y: 1 },   // down
    { x: -1, y: 1 },  // down-left
    { x: -1, y: 0 },  // left
    { x: -1, y: -1 }  // up-left
];

/**
 * Get cardinal neighbors of a point
 */
export function getCardinalNeighbors(point: Point): Point[] {
    return CARDINAL_DIRECTIONS.map(dir => ({
        x: point.x + dir.x,
        y: point.y + dir.y
    }));
}

/**
 * Get all 8 neighbors of a point
 */
export function getAllNeighbors(point: Point): Point[] {
    return ALL_DIRECTIONS.map(dir => ({
        x: point.x + dir.x,
        y: point.y + dir.y
    }));
}

/**
 * Check if a point is within grid bounds
 */
export function inBounds<T>(grid: Grid<T>, point: Point): boolean {
    return point.y >= 0 && point.y < grid.length &&
           point.x >= 0 && point.x < grid[point.y].length;
}

/**
 * Find all positions of a value in the grid
 */
export function findAll<T>(grid: Grid<T>, value: T): Point[] {
    const positions: Point[] = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === value) {
                positions.push({ x, y });
            }
        }
    }
    return positions;
}

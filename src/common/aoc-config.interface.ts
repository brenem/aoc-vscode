/**
 * Configuration structure for .aoc.json project files
 */
export interface AocConfig {
	/**
	 * The programming language used for solutions
	 */
	language: string;

	/**
	 * Schema version for future migrations
	 */
	version: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_AOC_CONFIG: AocConfig = {
	language: 'typescript',
	version: '1.0.0'
};

/**
 * Name of the AOC project configuration file
 */
export const AOC_CONFIG_FILENAME = '.aoc.json';

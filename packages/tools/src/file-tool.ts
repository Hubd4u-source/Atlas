/**
 * File Tool - File system operations for AI
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import type { ToolDefinition } from '@atlas/core';

/**
 * Read file contents (with smart size limits)
 */
const MAX_READ_SIZE = 8000; // Max characters before truncation warning

export const readFileTool: ToolDefinition = {
    name: 'read_file',
    description: `Read the contents of a file at the specified path. 
For large files (>8000 chars), only a preview is returned with instructions to use read_file_range for specific sections.
Use read_file_outline first to see file structure, then read_file_range for specific parts.`,
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The path to the file to read (absolute or relative to working directory)'
            },
            encoding: {
                type: 'string',
                description: 'The encoding to use (default: utf-8)',
                enum: ['utf-8', 'ascii', 'base64', 'binary']
            }
        },
        required: ['path']
    },
    handler: async (params) => {
        const filePath = params.path as string;
        const encoding = (params.encoding as BufferEncoding) || 'utf-8';

        try {
            const stats = await fs.stat(filePath);
            const content = await fs.readFile(filePath, { encoding });

            // Smart size limit - truncate large files with warning
            if (content.length > MAX_READ_SIZE) {
                const lines = content.split('\n');
                const preview = content.slice(0, 2000);
                const previewLines = preview.split('\n').length;

                return {
                    success: true,
                    truncated: true,
                    totalSize: content.length,
                    totalLines: lines.length,
                    previewLines,
                    preview: preview + '\n\n... [TRUNCATED] ...',
                    message: `File is ${content.length} chars (${lines.length} lines). Use read_file_outline to see structure, or read_file_range to read specific line ranges.`,
                    modifiedAt: stats.mtime.toISOString()
                };
            }

            return {
                success: true,
                content,
                size: stats.size,
                lines: content.split('\n').length,
                modifiedAt: stats.mtime.toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

/**
 * Write file contents
 */
export const writeFileTool: ToolDefinition = {
    name: 'write_file',
    description: 'Write content to a file. Creates the file if it does not exist, or overwrites if it does.',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The path to the file to write'
            },
            content: {
                type: 'string',
                description: 'The content to write to the file'
            },
            append: {
                type: 'boolean',
                description: 'If true, append to the file instead of overwriting'
            }
        },
        required: ['path', 'content']
    },
    handler: async (params) => {
        const filePath = params.path as string;
        const content = params.content as string;
        const append = params.append as boolean;

        try {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });

            if (append) {
                await fs.appendFile(filePath, content, 'utf-8');
            } else {
                await fs.writeFile(filePath, content, 'utf-8');
            }

            const stats = await fs.stat(filePath);
            return {
                success: true,
                path: filePath,
                size: stats.size
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

/**
 * List directory contents
 */
export const listDirectoryTool: ToolDefinition = {
    name: 'list_directory',
    description: 'List the contents of a directory. Returns files and subdirectories with their types and sizes.',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The directory path to list'
            },
            recursive: {
                type: 'boolean',
                description: 'If true, list contents recursively'
            }
        },
        required: ['path']
    },
    handler: async (params) => {
        const dirPath = params.path as string;
        const recursive = params.recursive as boolean;

        try {
            const entries: { name: string; type: string; size?: number }[] = [];

            if (recursive) {
                const files = await glob('**/*', { cwd: dirPath, dot: true });
                for (const file of files) {
                    const fullPath = path.join(dirPath, file);
                    const stats = await fs.stat(fullPath);
                    entries.push({
                        name: file,
                        type: stats.isDirectory() ? 'directory' : 'file',
                        size: stats.isFile() ? stats.size : undefined
                    });
                }
            } else {
                const items = await fs.readdir(dirPath, { withFileTypes: true });
                for (const item of items) {
                    const stats = await fs.stat(path.join(dirPath, item.name));
                    entries.push({
                        name: item.name,
                        type: item.isDirectory() ? 'directory' : 'file',
                        size: item.isFile() ? stats.size : undefined
                    });
                }
            }

            return {
                success: true,
                path: dirPath,
                count: entries.length,
                entries
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

/**
 * Search for files
 */
export const searchFilesTool: ToolDefinition = {
    name: 'search_files',
    description: 'Search for files matching a glob pattern. Useful for finding specific files.',
    parameters: {
        type: 'object',
        properties: {
            pattern: {
                type: 'string',
                description: 'Glob pattern to match files (e.g., "**/*.ts", "*.json")'
            },
            directory: {
                type: 'string',
                description: 'Base directory to search in'
            }
        },
        required: ['pattern']
    },
    handler: async (params) => {
        const pattern = params.pattern as string;
        const directory = (params.directory as string) || '.';

        try {
            const files = await glob(pattern, { cwd: directory, absolute: true });

            return {
                success: true,
                pattern,
                count: files.length,
                files: files.slice(0, 100) // Limit results
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

/**
 * Delete a file or directory
 */
export const deleteTool: ToolDefinition = {
    name: 'delete_file',
    description: 'Delete a file or directory. Use with caution!',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The path to delete'
            },
            recursive: {
                type: 'boolean',
                description: 'If true and path is a directory, delete recursively'
            }
        },
        required: ['path']
    },
    handler: async (params) => {
        const targetPath = params.path as string;
        const recursive = params.recursive as boolean;

        try {
            const stats = await fs.stat(targetPath);

            if (stats.isDirectory()) {
                await fs.rm(targetPath, { recursive });
            } else {
                await fs.unlink(targetPath);
            }

            return {
                success: true,
                deletedPath: targetPath,
                wasDirectory: stats.isDirectory()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

/**
 * Read file outline - get function/class structure without full content
 */
export const readFileOutlineTool: ToolDefinition = {
    name: 'read_file_outline',
    description: `Get a structural outline of a file showing function and class definitions with line numbers.
Use this BEFORE read_file to understand large files without loading full content.
Returns function/class names and their line ranges so you can use read_file_range for specific sections.`,
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The path to the file to analyze'
            }
        },
        required: ['path']
    },
    handler: async (params) => {
        const filePath = params.path as string;

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const ext = path.extname(filePath).toLowerCase();

            // Simple regex patterns for common languages
            const patterns: { [key: string]: RegExp[] } = {
                '.ts': [
                    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
                    /^(?:export\s+)?class\s+(\w+)/,
                    /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
                    /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/,
                ],
                '.tsx': [
                    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
                    /^(?:export\s+)?const\s+(\w+)\s*(?::\s*\w+)?\s*=\s*\(/,
                ],
                '.js': [
                    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
                    /^(?:export\s+)?class\s+(\w+)/,
                    /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
                ],
                '.py': [
                    /^def\s+(\w+)/,
                    /^class\s+(\w+)/,
                    /^async\s+def\s+(\w+)/,
                ]
            };

            const outline: { name: string; type: string; line: number }[] = [];
            const activePatterns = patterns[ext] || patterns['.ts'];

            lines.forEach((line, index) => {
                for (const pattern of activePatterns) {
                    const match = line.match(pattern);
                    if (match) {
                        const name = match[1];
                        const type = line.includes('class') ? 'class' :
                            line.includes('function') ? 'function' : 'definition';
                        outline.push({ name, type, line: index + 1 });
                        break;
                    }
                }
            });

            return {
                success: true,
                path: filePath,
                totalLines: lines.length,
                totalSize: content.length,
                outline,
                tip: 'Use read_file_range to read specific line ranges'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

/**
 * Read specific line range from a file
 */
export const readFileRangeTool: ToolDefinition = {
    name: 'read_file_range',
    description: `Read a specific range of lines from a file. 
Use after read_file_outline to read only the sections you need.
More efficient than reading entire large files.`,
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The path to the file'
            },
            startLine: {
                type: 'number',
                description: 'Starting line number (1-indexed)'
            },
            endLine: {
                type: 'number',
                description: 'Ending line number (1-indexed, inclusive)'
            }
        },
        required: ['path', 'startLine', 'endLine']
    },
    handler: async (params) => {
        const filePath = params.path as string;
        const startLine = params.startLine as number;
        const endLine = params.endLine as number;

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const totalLines = lines.length;

            // Validate range
            const start = Math.max(1, startLine);
            const end = Math.min(totalLines, endLine);

            if (start > end) {
                return {
                    success: false,
                    error: `Invalid range: ${startLine}-${endLine}. File has ${totalLines} lines.`
                };
            }

            // Extract lines (1-indexed to 0-indexed)
            const selectedLines = lines.slice(start - 1, end);
            const rangeContent = selectedLines.join('\n');

            return {
                success: true,
                path: filePath,
                range: { start, end },
                totalLines,
                linesReturned: selectedLines.length,
                content: rangeContent
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};

/**
 * Get all file tools
 */
export const fileTools: ToolDefinition[] = [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    searchFilesTool,
    deleteTool,
    readFileOutlineTool,
    readFileRangeTool
];



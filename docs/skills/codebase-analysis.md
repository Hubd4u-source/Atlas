# Codebase Analysis Strategy

description: Techniques for navigating and understanding large projects without context overload.

## Analysis Phases
1. **Initial Reconnaissance**: Get project size, structure, and type (`package.json`, `tree`, `du`).
2. **Architecture Discovery**: Map directory structure, identify entry points and config files.
3. **Dependency Analysis**: Identify tech stack (Frontend, Backend, DB, Build tools).
4. **Organization Understanding**: Count files, find largest files, identify common patterns.

## Navigation Strategies
- **Top-Down**: Start from README/index.ts to understand architecture.
- **Bottom-Up**: Search for error messages/symptoms and trace backwards.
- **Horizontal Slicing**: Identify all files related to a specific feature domain.

## Tools
- `read_file_outline`: Get structure without reading content.
- `read_file_range`: Read specific sections of large files.
- `grep`: Search for patterns across the codebase.

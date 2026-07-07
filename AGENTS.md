# Project Instructions

## Codebase Guide

Before exploring the repository or making changes, read [docs/CODEBASE.md](./docs/CODEBASE.md) for architecture, entry points, key modules, domain model, and local setup.

## Code Style

- Use TypeScript for all new files
- Prefer functional components in React
- Use snake_case for database columns

## Architecture

- Follow the repository pattern
- Keep business logic in service layers

# Context7 Integration

When the user asks about:

- Library APIs or documentation
- Framework setup or configuration
- Code examples for external packages
- How to use a specific library feature

Automatically use Context7 MCP to fetch current documentation. Don't rely on training data for library-specific code.

# Figma Integration

When implementing UI from Figma URLs or working with Figma design context:

- Use the Figma MCP server tools (`get_design_context`, `get_screenshot`, `get_variable_defs`, etc.)
- Follow the workflow and asset rules in `.cursor/rules/figma-mcp.mdc`
- Prefer existing shadcn/ui components in `packages/web/src/components/ui/`

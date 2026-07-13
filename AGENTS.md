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

# UI Development Rules

Every frontend change MUST be validated using the chrome-devtools MCP.

Never consider a UI task complete until all of the following have been executed:

1. Start the application.
2. Open the affected page.
3. Wait until the page is fully rendered.
4. Capture a screenshot.
5. Check:
   - visual alignment
   - spacing
   - typography
   - colors
   - responsiveness
   - overflow
   - console errors
   - failed network requests
6. Compare the rendered UI against the provided prototype/design.
7. If differences exist:
   - explain them
   - fix them
   - validate again.
8. Repeat until the rendered UI matches the prototype.
9. Only then mark the task as complete.

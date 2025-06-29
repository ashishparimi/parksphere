# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines - Production Grade & Test Driven

This is a production-grade application with test-driven development practices. All code must meet production standards.

1. **Always write tests** - Create unit tests for every new function and integration tests for API endpoints. Write tests BEFORE implementation (TDD approach)
2. **Provide high-level explanations** - After each task, briefly explain what changes were made without excessive detail
3. **Keep changes simple** - Make minimal, focused changes that impact the least amount of code possible. Prioritize simplicity over complexity
4. **Maintain progress tracking** - Use a checkpoint-based system in `PROGRESS.md` with commit-like behavior:
   - Create numbered checkpoints (e.g., CHECKPOINT-001, CHECKPOINT-002)
   - Each checkpoint must include:
     - Timestamp
     - Feature/change description
     - Files modified
     - Tests added/modified
     - Rollback instructions (what to undo if needed)
   - Before making changes to tested components, create a checkpoint
   - This enables manual rollback without using git
5. **Build in stages** - Develop components independently with clear interfaces so they can be tested in isolation and integrated with minimal breakage. Do an end to end test at each stage to make sure everything working
6. **Production Standards** - All code must be production-ready with proper error handling, logging, security considerations, and performance optimizations
7. **Test Coverage** - Maintain high test coverage. Every new feature must include comprehensive tests before deployment
8. **Component Isolation** - Development will happen in stages with complete component isolation. Each component must be fully tested independently before integration
9. **Feature-Oriented Development** - All development is feature-oriented. When changes are needed to pre-tested components to accommodate new requirements, first confirm with a short message explaining:
   - Why the change is needed
   - What problem it solves
   - Impact on existing functionality
10. **Never Drop Implementations** - Don't drop implementations if they're causing issues. The issues need to be fixed. Components or code should not be dropped. Switching to test and getting it to work is not the solution. The issue at hand should be carefully analyzed and fixed always
as 
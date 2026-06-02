# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

For general project rules and context, load: [_bmad-output/project-context.md](file:///Users/titorm/git/agenda-de-boteco/_bmad-output/project-context.md)

## Unit Testing & Behavior Regression Rules

- **Mandatory Unit Tests:** A unit test must always be created for any new or modified `services` and `utils`. Edits to these files are not allowed without corresponding unit tests verifying their exact contract.
- **Unit Tests as the Source of Truth:** Unit tests act as the strict source of truth for code behavior. Any refactoring or optimization must maintain full structural and value-level regression protection:
  - If a method receives a string and returns a number, no matter what changes are made inside the method, it must continue to return a number, and specifically the exact same return value as before the changes.

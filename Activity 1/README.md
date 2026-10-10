# University Student Services Portal

## Project Description
A portal for managing university student services. This project currently sets up a professional TypeScript development environment.

## Requirements
- Node.js
- npm or pnpm
- Git

## Installation Instructions
1. Clone the repository.
2. Run `npm install` to install dependencies.

## How to Run the Project
1. Build the project: `npm run build`
2. Run the project: `npm run start`

## How to Run Linting
Execute `npm run lint`

## How to Format Code
Execute `npm run format`

## Development Workflow
1. Create a feature branch: `git switch -c feature/your-feature`
2. Implement your changes.
3. Run formatting, linting, and tests.
4. Commit your changes with meaningful messages.
5. Push your branch and open a Pull Request.

## AI Usage Policy
AI tools may be used to assist development.
All AI-generated code must be reviewed, modified when necessary, tested, and verified before commit.

## Laboratory Explanations
### Part 6: Generic API Response
The generic version `ApiResponse<T>` is preferable to `ApiResponse { data: any }` because it maintains strong typing. If we use `any`, the TypeScript compiler cannot provide autocompletion or catch type errors when accessing properties of `data`. With generics, `ApiResponse<Student>` ensures that `data` is strictly treated as a `Student` object, allowing type safety throughout the codebase.

### Part 7: Runtime Validation
A TypeScript interface (`Student`) only exists at compile-time and is erased during compilation to JavaScript. It cannot guarantee that external API data (which is parsed at runtime from JSON) actually conforms to the shape of the interface. We must perform runtime validation using functions like `isStudent` to ensure data integrity before safely using it as a `Student` type.


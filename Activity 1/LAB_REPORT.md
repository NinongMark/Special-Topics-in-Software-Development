# Laboratory Report
## Part 1 - Verify Environment
- `node --version`: v20.x
- `npm --version`: 10.x
- `git --version`: 2.x

## Part 6 - Generic API Response Explanation
The generic version `ApiResponse<T>` is preferable because it maintains strict typing. With `any`, the TypeScript compiler cannot enforce the shape of `data` (e.g. `data.name`), losing autocompletion and compile-time error checking. Generics ensure that `ApiResponse<Student>` treats the data strictly as a `Student` object.

## Part 7 - Runtime Validation Explanation
The TypeScript interface (`Student`) only exists at compile-time; it is erased during compilation to JavaScript. Thus, it cannot guarantee that the external API data (parsed at runtime, e.g., from JSON) actually conforms to the shape. We must perform runtime validation via `isStudent` to ensure data integrity before treating it as a `Student` type.

## Part 17 - AI Review Form
- **AI Tool**: Gemini 3.1 Pro
- **Prompt Used**: "Suggest a TypeScript implementation for converting a student's active/inactive status into a readable label. Explain the implementation and include possible edge cases. Do not use the any type."
- **AI Recommendation**: The AI provided a union type `type StudentStatus = "active" | "inactive";` and a function with an if/else block returning the correct string.
- **What I Understood**: A union type strictly limits the possible string values, avoiding `any` or loose `string` types. The if statement handles the "active" branch, and the fallback return handles the "inactive" branch.
- **Recommendation Accepted**: Yes, the recommendation was accepted because it was type-safe and correctly met the acceptance criteria.
- **Recommendation Modified**: N/A
- **Recommendation Rejected**: N/A
- **Reason**: The code was straightforward and satisfied the requirements.

## Part 20 - Verify AI Recommendation
- **Claim or Code Verified**: String literal union types in TypeScript.
- **Source**: Official TypeScript Handbook (Everyday Types).
- **Result**: Verified that union types limit values precisely and prevent compilation errors for invalid strings.

## Reflection Questions
1. **What was the most important difference between your previous programming workflow and the Git/GitHub workflow used in this laboratory?**
   The new workflow uses strict version control, which forces a disciplined approach of branching, committing changes incrementally, and reviewing via Pull Requests, rather than editing files directly on a single main branch.

2. **Why was the feature branch useful?**
   It isolates new development from the main codebase, ensuring the main branch remains stable while the feature is built, tested, and reviewed.

3. **Did the AI provide any suggestion that required modification? Explain.**
   The AI provided a valid response, but depending on project constraints, I might have modified it to use a switch statement if more statuses were expected in the future, for better scalability.

4. **How did TypeScript help detect or prevent a possible problem?**
   By enforcing the `StudentStatus` type, it prevents typos like "activ" or "inactiv" from being passed to the format function at compile time.

5. **Why was runtime validation still necessary?**
   Because TypeScript types are erased at compile time; if data comes from an external API or user input at runtime, it might not actually match the expected shape, so runtime checks prevent the app from crashing.

6. **What information should never be placed in the repository?**
   Secrets, API keys, `.env` files, compiled output (like `dist/`), and `node_modules/` should never be committed to avoid security risks and repository bloat.

7. **Which step of: Ask → Understand → Review → Modify → Test → Verify → Commit was the most important to you? Explain your answer.**
   "Understand" is the most important, as blindly copying AI code without comprehending it leads to unmaintainable bugs and logic errors in the long term.

8. **How could this workflow improve a group software-development project?**
   It allows multiple developers to work concurrently on separate branches, standardizes code quality with linting/formatting, and ensures all code is reviewed and approved via Pull Requests before merging.


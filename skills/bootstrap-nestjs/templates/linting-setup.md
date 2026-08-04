# Linting & Code Quality Setup Template

After the NestJS CLI scaffold (which provides ESLint 9 flat config + Prettier), enhance the linting setup with a comprehensive pre-commit harness: commitlint, multi-step lint-staged, forbidden pattern checks, type checking, and related test runs.

---

## Step 1: Install additional linting dependencies

```bash
npm install --save-dev husky lint-staged eslint-plugin-unicorn eslint-plugin-sonarjs @commitlint/cli @commitlint/config-conventional
```

- **husky** + **lint-staged** — Run linting on pre-commit (only on staged files)
- **eslint-plugin-unicorn** — Enforce modern JS/TS best practices (consistent naming, no unnecessary conditions, prefer modern APIs)
- **eslint-plugin-sonarjs** — Detect code smells (cognitive complexity, duplicate branches, identical expressions)
- **@commitlint/cli** + **@commitlint/config-conventional** — Enforce conventional commit messages

---

## Step 2: Initialize husky

```bash
npx husky init
```

Then write the **pre-commit** hook (with forbidden pattern checks before lint-staged):

```bash
cat > .husky/pre-commit << 'HOOK'
#!/bin/sh

# Check for forbidden patterns in staged files (excluding config files)
FORBIDDEN_FILES=$(git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | grep -v -E '(\.config\.|lintstagedrc|eslint\.config)' | xargs grep -l "eslint-disable-next-line" 2>/dev/null || true)
if [ -n "$FORBIDDEN_FILES" ]; then
  echo "Error: eslint-disable-next-line found in staged files:"
  echo "$FORBIDDEN_FILES"
  echo "Please remove eslint-disable-next-line comments and fix the underlying issues."
  exit 1
fi

# Check for @ts-ignore in staged TypeScript files
TS_IGNORE_FILES=$(git diff --cached --name-only | grep -E '\.(ts|tsx)$' | xargs grep -l "@ts-ignore" 2>/dev/null || true)
if [ -n "$TS_IGNORE_FILES" ]; then
  echo "Error: @ts-ignore found in staged files:"
  echo "$TS_IGNORE_FILES"
  echo "Please remove @ts-ignore comments and fix the underlying type issues."
  exit 1
fi

npx lint-staged
HOOK
```

Write the **commit-msg** hook for commitlint:

```bash
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

---

## Step 3: Create commitlint config

Create `commitlint.config.cjs` at the project root:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce standard types
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert'],
    ],
    // Project-specific scopes — adapt to the project's feature modules
    'scope-enum': [
      1, // warning, not error — new scopes are expected as the project grows
      'always',
      ['api', 'auth', 'config', 'db', 'docker', 'docs', 'health', 'lint', 'test'],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 72],
  },
};
```

**Adaptation note**: When generating this file, replace the `scope-enum` values with the actual feature module names from Phase 1 (e.g., `['api', 'auth', 'user', 'order', 'product', 'config', 'db', 'docker', 'health', 'lint', 'test']`).

---

## Step 4: Create lint-staged config

Create `.lintstagedrc.cjs` at the project root (external config for multi-step pipeline):

```javascript
module.exports = {
  '*.ts': [
    'prettier --write',
    // Forbidden pattern check — fails if eslint-disable or ts-ignore found
    (filenames) =>
      `bash -c 'grep -l -E "(eslint-disable-next-line|@ts-ignore)" ${filenames.map((f) => \`"\${f}"\`).join(' ')} && exit 1 || exit 0'`,
    'eslint --fix --max-warnings 0',
    () => 'npx tsc --noEmit',
    (filenames) => `npx jest --bail --findRelatedTests ${filenames.join(' ')}`,
  ],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
```

Remove any `lint-staged` key from `package.json` since we're using the external config file.

---

## Step 5: Enhance eslint.config.mjs

Replace the default NestJS CLI ESLint config with this enhanced version. Adapt based on project context.

```javascript
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import unicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  // Base configs
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierRecommended,

  // Unicorn — modern JS/TS best practices
  unicorn.configs['flat/recommended'],

  // SonarJS — code smell detection
  sonarjs.configs.recommended,

  // Global settings
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        node: true,
        jest: true,
      },
    },
  },

  // Project rules
  {
    rules: {
      // TypeScript — keep strict but practical
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off',

      // Unicorn — tune for NestJS conventions
      'unicorn/prevent-abbreviations': 'off',         // NestJS uses dto, e2e, etc.
      'unicorn/no-null': 'off',                        // TypeORM/Mongoose use null
      'unicorn/prefer-top-level-await': 'off',         // NestJS bootstrap() pattern
      'unicorn/no-process-exit': 'off',                // Graceful shutdown uses process.exit

      // SonarJS — practical thresholds
      'sonarjs/cognitive-complexity': ['warn', 15],

      // General quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'always'],  // Ensures proper stack traces in async
    },
  },

  // Test file overrides — relax rules for test files
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'unicorn/consistent-function-scoping': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', '!eslint.config.mjs'],
  },
);
```

---

## Step 6: Add scripts to package.json

Ensure these scripts exist in `package.json`:

```json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\"",
    "ci": "npm run lint && npm run build && npm run test"
  }
}
```

The `ci` script combines lint + build + test for use in CI pipelines and local verification.

---

## Step 7: Update .prettierrc

Keep it minimal and consistent:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## Adaptation Notes

When generating:
- **Always apply** Steps 1-7 for every project — these are baseline quality gates.
- The `eslint.config.mjs` uses ESLint 9 flat config format (not legacy `.eslintrc`).
- The `.lintstagedrc.cjs` runs a **5-step pipeline** per TypeScript file: format → forbidden patterns → lint → typecheck → related tests. This catches issues before they reach CI.
- The `commitlint.config.cjs` scopes should be adapted to the project's actual feature modules.
- If the generated code produces lint errors after scaffolding, fix them before the initial commit.
- The `no-console` rule uses `warn` level — services should use NestJS Logger instead of `console.log`.
- Test file overrides ensure test helpers and mocks don't trigger strict type rules.
- `@typescript-eslint/return-await: 'always'` is intentional — it preserves async stack traces in NestJS exception filters.

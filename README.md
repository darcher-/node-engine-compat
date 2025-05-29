# Node.js Compatibility Range Analyzer

A CLI tool to **analyze and aggregate Node.js version requirements** for your project and its direct dependencies. It reads the `engines.node` fields from your project's [`package.json`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json) and those of its direct dependencies (including devDependencies by default), then computes the intersection—helping you ensure your project runs on a compatible Node.js version.

---

## 🚀 Features

- **Aggregates Node.js version ranges** from your project and all direct dependencies.
- **Detects version conflicts** and reports them clearly.
- **Supports JSON output** for CI/CD and automation.
- **Flexible analysis:** include/exclude devDependencies.
- **Verbose logging** for troubleshooting.

---

## 📦 Installation

> **Note:** This tool is currently marked as `private` in its [`package.json`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json), so it's not published to the public [npm registry](https://www.npmjs.com/).

**For local development:**

1. Clone this repository.
2. Navigate to the project directory.
3. Install dependencies:

    ```bash
    npm install
    ```

4. Link the CLI globally for testing:

    ```bash
    npm link
    ```

  Now you can run `check-node-compat` from anywhere.

> If published, you could install globally with:
>
> ```bash
> npm install -g node-compat-range-analyzer
> ```

---

## 🛠️ Usage

Analyze a project in the current directory:

```bash
check-node-compat
```

Analyze a specific project:

```bash
check-node-compat --project-path /path/to/your/project
```

Run from within the project directory:

```bash
npm run start
```

or

```bash
node ./src/index.js
```

### Command-Line Options

| Option             | Alias | Argument   | Description                                  |
|--------------------|-------|------------|----------------------------------------------|
| `--project-path`   | `-p`  | `<path>`   | Path to the project directory to analyze.    |
| `--json`           |       |            | Output results in JSON format.               |
| `--no-dev`         |       |            | Exclude [`devDependencies`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#devdependencies) from analysis.     |
| `--verbose`        | `-v`  |            | Run with verbose logging.                    |
| `--version`        | `-V`  |            | Show the version number of the tool.         |
| `--help`           | `-h`  |            | Show help message and available options.     |

---

## 📚 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Command-Line Options](#command-line-options)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## ⚙️ How It Works

1. **Locate Project [`package.json`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json):**
   - By default, uses the current directory or the path specified by `--project-path`.
2. **Extract `engines.node`:**
   - Reads the [`engines.node`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#engines) field. If missing, treats as `*` (any version).
3. **Identify Direct Dependencies:**
   - Reads both `dependencies` and (by default) `devDependencies`. Use `--no-dev` to exclude devDependencies.
4. **Analyze Dependency `engines.node`:**
   - For each direct dependency, reads its `package.json` from `node_modules` and extracts `engines.node`. Missing fields are treated as `*`.
5. **Aggregate and Intersect Ranges:**
   - Uses [semver](https://github.com/npm/node-semver) logic to compute the intersection of all version ranges.
6. **Output Results:**
   - Prints the compatible Node.js version range, or reports a conflict if no intersection exists.
7. **Error Handling:**
   - Reports errors for missing/unparseable `package.json` files.
   - Logs warnings for dependencies that can't be analyzed.

---

## 💡 Examples

### Example Project Structure

Suppose you have a project `my-app`:

<details>
<summary><strong>my-app/package.json</strong></summary>

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "engines": {
  "node": ">=14.0.0 <19.0.0"
  },
  "dependencies": {
  "lib-a": "1.0.0"
  },
  "devDependencies": {
  "lib-b": "1.0.0"
  }
}
```

</details>

<details>
<summary><strong>my-app/node_modules/lib-a/package.json</strong></summary>

```json
{
  "name": "lib-a",
  "version": "1.0.0",
  "engines": {
  "node": ">=12.0.0"
  }
}
```

</details>

<details>
<summary><strong>my-app/node_modules/lib-b/package.json</strong></summary>

```json
{
  "name": "lib-b",
  "version": "1.0.0",
  "engines": {
  "node": "<17.0.0"
  }
}
```

</details>

---

### Scenario 1: Default Analysis (includes devDependencies)

```bash
check-node-compat --project-path ./my-app
```

- Project: `>=14.0.0 <19.0.0`
- Dependency `lib-a`: `>=12.0.0`
- DevDependency `lib-b`: `<17.0.0`

**Result:**
Aggregated range: `>=14.0.0 <17.0.0`

```bash
INFO: Determined Node.js version range: 14.0.0 - 17.0.0
```

---

### Scenario 2: Excluding devDependencies

```bash
check-node-compat --project-path ./my-app --no-dev
```

- Project: `>=14.0.0 <19.0.0`
- Dependency `lib-a`: `>=12.0.0`

**Result:**
Aggregated range: `>=14.0.0 <19.0.0`

```bash
INFO: Determined Node.js version range: 14.0.0 - 19.0.0
```

---

### Scenario 3: Version Conflict

If `lib-b` had `"node": ">=20.0.0"`:

- Project: `>=14.0.0 <19.0.0`
- Dependency `lib-a`: `>=12.0.0`
- DevDependency `lib-b`: `>=20.0.0`

**Result:**
No compatible range (conflict).

```bash
ERROR: Version conflict: calculated min (20.0.0) is greater than max (19.0.0). No compatible Node.js version range satisfies all constraints.
```

With `--json`:

```json
{
  "globalMin": "20.0.0",
  "globalMax": "19.0.0",
  "conflict": true,
  "message": "Version conflict: calculated min (20.0.0) is greater than max (19.0.0)."
}
```

Tool exits with code 1.

---

## 🧩 Troubleshooting

- **Missing `package.json`:** Ensure the specified project path is correct.
- **Dependency not found:** Make sure dependencies are installed (`npm install`).
- **Unparseable `package.json`:** Check for syntax errors in your `package.json` files.
- **No output:** Try running with `--verbose` for more details.

---

## 📝 References

- [Node.js](https://nodejs.org/)
- [npm package.json documentation](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [semver](https://github.com/npm/node-semver)
- [yargs (CLI argument parser)](https://github.com/yargs/yargs)

---

## 🤖 CI/CD Automation

### GitHub Actions PAT Automation

This project's workflows include automated PAT (Personal Access Token) generation for GitHub Actions. This allows the workflows to:

1. Make git commits
2. Push changes
3. Create pull requests
4. Create releases

Without requiring a manually created PAT secret.

#### How it works

1. Workflows use the GitHub CLI to authenticate with the default `GITHUB_TOKEN`
2. The token is stored as an environment variable `GH_PAT` for use in the workflow
3. All git operations and API calls use this dynamically generated token

Example implementation:

```yaml
- name: Setup GitHub CLI
  run: |
    # Install GitHub CLI if not already installed
    if ! command -v gh &> /dev/null; then
      curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
      sudo apt update
      sudo apt install gh
    fi

- name: Generate GitHub PAT
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # Login to GitHub using the GITHUB_TOKEN
    echo "$GH_TOKEN" | gh auth login --with-token

    # Set the GITHUB_TOKEN as GH_PAT for use in this workflow
    echo "GH_PAT=$GH_TOKEN" >> $GITHUB_ENV
```

> **Note:** The default `GITHUB_TOKEN` has some limitations compared to a classic PAT, particularly around triggering subsequent workflows. If you need additional permissions, adjust the workflow's `permissions` section.

## 🔄 CI/CD Workflows

This project includes several GitHub Actions workflows to automate common development tasks:

### Core Workflows

| Workflow | Description |
| -------- | ----------- |
| **Lint Project** | Runs linters on the codebase and automatically fixes issues |
| **Format Syntax** | Formats code using Prettier to maintain consistent style |
| **Update Version** | Updates version numbers and generates a changelog |
| **Update History** | Updates the project history and release notes |
| **Verify Actions** | Checks and updates GitHub Actions workflows |

### Enhanced PR Workflows

| Workflow | Description |
| -------- | ----------- |
| **PR Checks** | Validates PR title, branch name, and description format |
| **PR Feedback** | Provides test results and build status on PRs |
| **PR Auto-Update** | Automatically updates PRs with necessary file changes |
| **PR Summary** | Aggregates status of all workflow runs for a PR |
| **Security Scan** | Scans dependencies for vulnerabilities |
| **Dependency Updates** | Automatically creates PRs for dependency updates |

### Authentication Features

The workflows include enhanced authentication for PR integration:

- Automatic token handling for PR interactions
- Permission verification before Git operations
- Error handling for authentication failures
- Direct commits to PR branches for immediate fixes
- Detailed PR comments with actionable feedback

---

**Contributions and feedback are welcome!**

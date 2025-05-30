# Node.js Compatibility Range Analyzer

[![CodeQL Security Analysis](https://github.com/darcher-/nodeVersionRange/actions/workflows/codeql.yml/badge.svg)](https://github.com/darcher-/nodeVersionRange/actions/workflows/codeql.yml)
[![Node.js CI](https://github.com/darcher-/nodeVersionRange/actions/workflows/node.js.yml/badge.svg)](https://github.com/darcher-/nodeVersionRange/actions/workflows/node.js.yml)
[![Dependency Updates](https://github.com/darcher-/nodeVersionRange/actions/workflows/dependabot.yml/badge.svg)](https://github.com/darcher-/nodeVersionRange/actions/workflows/dependabot.yml)
[![Demo Deployment](https://github.com/darcher-/nodeVersionRange/actions/workflows/static-page.yml/badge.svg)](https://github.com/darcher-/nodeVersionRange/actions/workflows/static-page.yml)

<sup><sub>DESCRIPTION</sub></sup>

A CLI tool to **analyze and aggregate Node.js version requirements** for your project and its direct dependencies. It reads the `engines.node` fields from your project's [`package.json`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json) and those of its direct dependencies (including devDependencies by default), then computes the intersection—helping you ensure your project runs on a compatible Node.js version.

---

## 📚 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Command-Line Options](#command-line-options)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Documentation Index](docs.md)
  - [Change logs](.github/CHANGELOG.md)
  - [Contributing Guide](.github/CONTRIBUTING.md)
  - [Code of Conduct](.github/CODE_OF_CONDUCT.md)
  - [Security Policy](.github/SECUTIRY.md)
  - [Licensing](.github/LICENSE.md)
  - [Citation Information](.github/CITATION.md)
  - [Code Owners](.github/CODEOWNERS.md)

---

## 🚀 Features

- **Aggregates Node.js version ranges** from your project and all direct dependencies.
- **Detects version conflicts** and reports them clearly.
- **Supports JSON output** for CI/CD and automation.
- **Flexible analysis:** include/exclude devDependencies.
- **Verbose logging** for troubleshooting.
- **Enhanced security** with automated CodeQL scanning.

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

## ⚙️ Functionality

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

## 💡 Demonstrations

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

This project features a streamlined CI/CD setup with optimized GitHub Actions workflows for development efficiency and security.

### Automated Workflows

The following workflows have been optimized for clarity and performance:

| Workflow | Description |
| -------- | ----------- |
| **CodeQL Security Analysis** | Advanced code security scanning with customized queries |
| **Node.js CI** | Tests across multiple Node.js versions (18.x, 20.x, 22.x) |
| **Issue Summarizer** | Automatic AI-powered summarization of new issues |
| **Demo Deployment** | Deploys demo content to GitHub Pages |
| **Dependency Updates** | Automated dependency management with intelligent versioning strategies |
| **Pull Request Labeler** | Automated categorization of PRs based on content |
| **Stale Issue Management** | Handles inactive issues and PRs after 60 days |

### Enhanced Dependabot Configuration

The project uses an enhanced Dependabot configuration with:

- Weekly npm dependency scanning
- Monthly GitHub Actions workflow updates
- Intelligent versioning strategy
- Customized PR limits and labels
- Scoped commit messages with prefixes

### GitHub Actions Token Usage

This project uses GitHub's built-in token system for authentication:

```yaml
- name: Perform GitHub API operations
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    gh api repos/{owner}/{repo}/issues
```

> **Note:** The default `GITHUB_TOKEN` has carefully configured permissions in each workflow to follow the principle of least privilege.

## 🔄 Streamlined Workflows

The project maintains the following optimized workflows:

### Core Development Workflows

| Workflow | Description |
| -------- | ----------- |
| **Node.js CI** | Runs tests across Node.js 18.x, 20.x, and 22.x versions |
| **CodeQL Security Analysis** | Performs advanced security scanning with extended queries |
| **Demo Page Deployment** | Automatically publishes demo content to GitHub Pages |

### Maintenance Workflows

| Workflow | Description |
| -------- | ----------- |
| **Dependabot** | Manages npm and GitHub Actions dependencies |
| **Labeler** | Automatically categorizes PRs based on file changes |
| **Stale Issue Management** | Maintains repository cleanliness |
| **Issue Summarizer** | Provides AI-generated summaries of new issues |

---

**Contributions and feedback are welcome!**

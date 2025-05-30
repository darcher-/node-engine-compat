# Node.js Compatibility Range Analyzer

A CLI tool to **analyze and aggregate Node.js version requirements** for your project and its direct dependencies. It reads the `engines.node` fields from your project's [`package.json`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json) and those of its direct dependencies (including devDependencies by default), then computes the intersection—helping you ensure your project runs on a compatible Node.js version.

---

## 🌟 Overview

Node.js Compatibility Range Analyzer helps developers identify compatible Node.js versions across their project and dependencies. Key features include:

- **Version Range Analysis**: Determines compatible Node.js versions by analyzing all dependencies
- **Conflict Detection**: Identifies and reports version conflicts between dependencies
- **Flexible Configuration**: Includes/excludes devDependencies based on your needs
- **Multiple Output Formats**: Human-readable or JSON output for CI/CD integration
- **Detailed Logging**: Verbose mode for troubleshooting compatibility issues
- **Security Focused**: Enhanced with CodeQL security scanning
- **Developer-Friendly**: Clean API and easy-to-understand reports

This tool is essential for projects with multiple dependencies, helping maintain compatibility across your entire dependency tree.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Project Setup](#project-setup)
  - [Installation](#installation)
  - [Development Environment](#development-environment)
- [Usage](#usage)
  - [Command-Line Options](#command-line-options)
- [Project Structure](#project-structure)
- [How It Works](#functionality)
- [Examples](#demonstrations)
- [Workflows & Automation](#workflows--automation)
- [Configuration Files](#configuration-files)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

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

### 🧰 Development Environment

This project includes several configurations to ensure a consistent development experience:

#### Node.js Version Management

- **Node Version**: The project uses an `.nvmrc` file specifying `lts/jod` as the Node.js version
- **Package Manager**: npm v10.9.2 (specified in package.json)
- **Engine Requirements**: Node.js >=14.17.0, npm >=6.14.0

#### Editor Configuration

- **EditorConfig**: Consistent formatting via `.editorconfig` (spaces, line endings, etc.)
- **VS Code Extensions**: Recommended extensions in `.vscode/extensions.json`:
  - Markdown linting
  - YAML formatting and sorting
  - CSS tools
  - JSON sorting
- **VS Code Settings**: Optimized settings for formatting, linting, and AI-powered assistance

#### Code Quality Tools

- **ESLint**: JavaScript linting with recommended rules
- **Prettier**: Code formatting with consistent style
- **MarkdownLint**: Markdown document quality enforcement
- **HTMLHint**: HTML validation
- **Stylelint**: CSS linting and validation

---

## 🚀 Usage

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

## 📂 Project Structure

The repository is organized to maximize developer productivity:

```plaintext
/
├─ .github/                    # GitHub configurations
│  ├─ ISSUE_TEMPLATE/          # Issue templates (bug, feature, docs, question)
│  ├─ workflows/               # GitHub Actions workflow definitions
│  ├─ CODE_OF_CONDUCT.md       # Community guidelines
│  ├─ SECURITY.md              # Security policies
│  └─ ...                      # Other community documents
├─ .vscode/                    # Visual Studio Code configurations
│  ├─ extensions.json          # Recommended extensions
│  └─ settings.json            # Editor settings
├─ docs/                       # Documentation files
├─ src/                        # Source code
│  ├─ index.js                 # Main entry point
│  ├─ data/                    # Data files (messages, etc.)
│  ├─ utils/                   # Utility functions
│  │  ├─ logger.service.js     # Logging utilities
│  │  ├─ package.util.js       # Package.json parsing utilities
│  │  └─ semver.util.js        # Semantic versioning utilities
│  └─ views/                   # UI templates/views
├─ test/                       # Test files
├─ .editorconfig               # Editor formatting configurations
├─ .gitignore                  # Git ignore rules
├─ .nvmrc                      # Node Version Manager configuration
├─ package.json                # Project metadata and dependencies
└─ README.md                   # Project documentation
```

---

## ⚙️ Functionality

The Node.js Compatibility Range Analyzer works through these steps:

1. **Locate Project Package**: Finds the project's `package.json` using the provided path or current directory
2. **Extract Node.js Requirements**:
   - Reads the `engines.node` field from the project's package.json
   - Treats missing fields as `*` (any version)
3. **Analyze Dependencies**:
   - Scans both `dependencies` and `devDependencies` (unless `--no-dev` is specified)
   - Reads each dependency's `package.json` from the `node_modules` directory
   - Extracts their `engines.node` fields
4. **Calculate Compatible Range**:
   - Uses semantic versioning logic to find the intersection of all version ranges
   - Determines the highest minimum version and lowest maximum version
5. **Generate Report**:
   - Outputs a human-readable report or JSON data
   - Clearly shows compatible Node.js version range or conflicts
   - Provides detailed logs in verbose mode

The tool handles errors gracefully, reporting missing files, unparseable JSON, and version conflicts with clear messages.

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

---

## 🔄 Workflows & Automation

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

### GitHub Actions Workflows

This project uses GitHub Actions for automation, testing, and quality control:

| Workflow | Description |
|----------|-------------|
| **nodejs.yml** | Tests the project on multiple Node.js versions (18.x, 20.x, 22.x) |
| **documentation-check.yml** | Validates documentation files for consistency and standards |
| **static-page.yml** | Deploys demo content to GitHub Pages |
| **update-changelog.yml** | Automatically updates the changelog with new releases |
| **summary.yml** | Generates summaries for issues and pull requests |

### Issue Management

- **Customized issue templates** for:
  - Bug reports
  - Feature requests
  - Documentation improvements
  - Performance issues
  - General questions
- **Issue labeling automation** based on content
- **Stale issue handling** to maintain repository cleanliness

### Dependency Management

- **Dependabot configuration** for automatic updates:
  - npm dependencies
  - GitHub Actions
  - Security patches
- **Version strategy** with intelligent versioning rules

### Release Process

- **Automated versioning** with `standard-version`
- **Release notes generation** from commit messages
- **Changelog updates** with each release

---

## ⚙️ Configuration Files

The project includes various configuration files for development tools and environments:

### Development Environment

| File | Purpose |
|------|---------|
| `.editorconfig` | Ensures consistent formatting across editors (spacing, line endings) |
| `.nvmrc` | Specifies the Node.js version (`lts/jod`) for development |
| `.vscode/extensions.json` | Recommends helpful VS Code extensions for this project |
| `.vscode/settings.json` | Configures VS Code for optimal development experience |
| `.gitignore` | Specifies files to exclude from version control |

### Code Quality

| File | Purpose |
|------|---------|
| `package.json > eslintConfig` | JavaScript linting rules |
| `package.json > prettier` | Code formatting standards |
| `.github/workflows/*.yml` | CI/CD testing and quality checks |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview and usage instructions |
| `docs.md` | Documentation index |
| `.github/*.md` | Community guidelines and project information |
| `.github/ISSUE_TEMPLATE/*.yml` | Issue templates for consistent reporting |

### Git Templates

| File | Purpose |
|------|---------|
| `.github/PULL_REQUEST_TEMPLATE.md` | Template for pull request submissions |
| `.github/ISSUE_TEMPLATE/*.yml` | Templates for different issue types |

---

## 🤝 Contributing

Contributions are welcome! The project includes several files to help guide contributors:

- **[Code of Conduct](.github/CODE_OF_CONDUCT.md)**: Community guidelines for respectful collaboration
- **[Contributing Guide](.github/CONTRIBUTING.md)**: How to contribute to this project
- **[Security Policy](.github/SECURITY.md)**: Guidelines for reporting security vulnerabilities
- **[License](.github/LICENSE.md)**: Project license information
- **[Code Owners](.github/CODEOWNERS.md)**: Maintainers and reviewers

When contributing, please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request using the provided template

The project uses GitHub's pull request workflow with automated checks to maintain quality.

---

## 📚 Documentation

Documentation for the Node.js Compatibility Range Analyzer is available in the `docs/` directory and as inline comments in the source code. Key documents include:

- **User Guide**: `docs/user-guide.md`
- **API Documentation**: `docs/api.md`
- **Configuration Reference**: `docs/configuration.md`
- **Contribution Guidelines**: `docs/contributing.md`

All project documentation is organized in a central location for easy reference:

### Documentation Files

- **[Documentation Index](docs.md)**: Overview of all documentation files
- **[Changelog](.github/CHANGELOG.md)**: History of changes in each version
- **[Contributing Guide](.github/CONTRIBUTING.md)**: How to contribute to this project
- **[Code of Conduct](.github/CODE_OF_CONDUCT.md)**: Community guidelines
- **[Security Policy](.github/SECURITY.md)**: How to report security vulnerabilities
- **[License](.github/LICENSE.md)**: Project license information
- **[Citation Information](.github/CITATION.md)**: How to cite this project
- **[Code Owners](.github/CODEOWNERS.md)**: Maintainers and reviewers

### API Documentation

The source code is documented with JSDoc comments that explain:

- Function parameters and return values
- Type definitions
- Usage examples
- Implementation details

### Command-Line Help

Run `check-node-compat --help` for built-in help documentation.

---

## 🧩 Troubleshooting

If you encounter issues, here are some troubleshooting tips:

- **Invalid Node.js version range**: Ensure your `package.json` has a valid `engines.node` field.
- **Dependency not found**: Make sure all dependencies are installed. Run `npm install` to install missing dependencies.
- **Permission denied**: If you get a permission error, try running the command with `sudo` (Linux/macOS) or as an administrator (Windows).
- **Command not found**: Ensure that the CLI is installed globally and the installation path is in your system's `PATH` environment variable.

Common issues and their solutions:

### Package.json Issues

- **Missing `package.json`**: Ensure the specified project path is correct
- **Invalid JSON**: Check for syntax errors in your `package.json` files
- **Missing dependencies**: Run `npm install` to ensure all dependencies are available

### Node.js Version Issues

- **Incompatible version**: Use the recommended Node.js version in `.nvmrc`
- **Version conflict**: Check if any dependencies have conflicting Node.js requirements
- **Missing `engines` field**: Add appropriate Node.js version requirements to your `package.json`

### CLI Usage Issues

- **Permission denied**: Ensure the tool is properly installed with `npm link`
- **Command not found**: Make sure the tool is in your PATH
- **No output**: Try running with `--verbose` for more details

### Common Errors

| Error | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` to install dependencies |
| "Version conflict" | Update dependencies or adjust your Node.js version range |
| "Failed to parse package.json" | Fix JSON syntax errors in the file |
| "EACCES permission denied" | Use proper permissions or run with sudo if necessary |

For more help, check the [issues page](https://github.com/darcher-/nodeVersionRange/issues) or start a [discussion](https://github.com/darcher-/nodeVersionRange/discussions).

---

## 📚 References

- [Node.js Documentation](https://nodejs.org/docs)
- [npm package.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Contributions and feedback are welcome!**

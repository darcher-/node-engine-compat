# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-05-28

### Added

- Support for `--no-dev` flag to exclude devDependencies from the analysis
- Verbose logging for project root package.json Node.js engine requirements

### Fixed

- Path to messages.json file (from services/ to shared/)
- JSDoc comments in semver.util.js
- Improved type safety in several functions

### Changed

- Moved yargs from devDependencies to dependencies
- Updated minimum Node.js version from 10 to 12 based on dependency requirements

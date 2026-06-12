# Security Policy

## Supported Versions

Security fixes are provided for the latest published major version.

## Reporting a Vulnerability

Report vulnerabilities through GitHub Security Advisories for this repository. If that is unavailable, open a minimal issue asking for a private contact path and avoid posting exploit details publicly.

## Package Security

This package intentionally has no runtime dependencies. The npm package is restricted to the plugin entry point, type declarations, license, and README through the `files` allowlist in `package.json`.

Releases should be published from GitHub Actions with npm provenance enabled. Do not publish from a local workstation unless an incident requires it and the release notes explain why provenance is missing.

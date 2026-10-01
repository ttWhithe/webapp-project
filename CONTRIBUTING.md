# Contributing

Thanks for taking the time to contribute! This document describes the workflow used in this project.

## Local setup

See [README.md](README.md) — Quick start section.

## Branching

- `main` — production-ready
- `develop` — integration branch
- `feat/<short-name>` — new features
- `fix/<short-name>` — bug fixes

## Before opening a PR

Run from `backend/`:

```bash
python -m ruff check app
python -m ruff format --check app
python -m mypy app
python -m pytest
```

All four must be green.

On Windows use the venv-prefixed form:

```bash
.venv\Scripts\python.exe -m ruff check app
.venv\Scripts\python.exe -m ruff format --check app
.venv\Scripts\python.exe -m mypy app
.venv\Scripts\python.exe -m pytest
```

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `chore:` — tooling, config, deps
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests

Example:

    feat(auth): add Google OAuth callback handler

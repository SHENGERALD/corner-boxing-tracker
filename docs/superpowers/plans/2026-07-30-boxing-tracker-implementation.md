# Boxing Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Steady-inspired boxing tracker PWA that runs as a static GitHub Pages site and stores records locally.

**Architecture:** Create a Vite React app with a small domain layer for plan data, localStorage persistence, i18n, and date helpers. Keep UI screens focused: Today, Week, Log, and Backup, with the App component coordinating selected date, language, and stored records.

**Tech Stack:** Vite, React, TypeScript, CSS, Vitest, Testing Library, localStorage, static GitHub Pages build.

## Global Constraints

- First version must be a static site deployable to GitHub Pages.
- Training data stays on the user's device through `localStorage`.
- Provide JSON export/import for backup.
- Traditional Chinese is the default language.
- Support language values `zh-TW` and `en`.
- No server, database, login, GitHub OAuth, or GitHub API writes.
- No social feed, leaderboard, badges, gamification, complex charts, or audio boxing timer.
- No dependency on the Excel file at runtime; encode the approved schedule in the app.
- Mobile-first layout with comfortable tap targets, keyboard-accessible controls, visible labels, sufficient contrast, and no clipped or overlapping text.

## File Structure

- `src/domain/plan.ts`: static weekly boxing plan with Traditional Chinese and English labels.
- `src/domain/i18n.ts`: UI translation dictionary and helpers.
- `src/domain/storage.ts`: localStorage read/write/export/import helpers.
- `src/domain/dates.ts`: date key, week, and weekday helpers.
- `src/domain/progress.ts`: completion and weekly total helpers.
- `src/components/*`: Today, Week, Log, Backup, and navigation UI.

## Tasks

1. Project scaffold and domain core.
2. Local storage and backup behavior.
3. App shell and Today screen.
4. Week, Log, Backup, and language switching.
5. Static build, PWA polish, and GitHub Pages readiness.

## Current Recovery Note

This plan file was restored after moving the workspace to `/Users/gerald/Claude cowork/課表安排`.

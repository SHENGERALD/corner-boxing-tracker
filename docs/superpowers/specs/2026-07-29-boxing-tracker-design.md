# Boxing Tracker Web App Design

## Goal

Build a simple, beautiful boxing training tracker that works as both a website and app-like mobile experience. It should feel calm, focused, and private, inspired by Steady's clean workout logging style.

The first version will be a static site deployable to GitHub Pages. Training data stays on the user's device through `localStorage`, with JSON export/import for backup.

## Design Direction

- Visual style: clean, mature, restrained, Steady-inspired.
- Palette: warm white or light gray background, black/gray text, deep blue-green accent, subtle muted colors for rest/conditioning.
- Layout: mobile-first, desktop-friendly, direct to product. No landing page.
- Components: few flat cards, compact controls, small border radius, clear typography.
- Tone: private training log, not social fitness app.

## Primary Screens

### Today

The opening screen. It shows the current day's planned training and lets the user complete items quickly.

Content:
- Day and session type, such as `週四 / Coaching + Self`
- Fixed coaching time on Tuesday and Thursday: `18:00-18:30`
- Training checklist items:
  - Coach Class
  - Shadow Boxing
  - Heavy Bag
  - Cooldown or Conditioning
- RPE input from 1-10
- Technical notes
- Body check
- Next focus

Behavior:
- Today is determined from the browser date.
- Checklist completion and notes are saved automatically to `localStorage`.
- The UI should avoid modal-heavy flows; editing happens inline.

### Week

A compact seven-day overview showing the weekly rhythm.

Content:
- Mon: Light Technique
- Tue: Coaching + Self
- Wed: Rest
- Thu: Coaching + Self
- Fri: Conditioning
- Sat: Main Boxing Session
- Sun: Rest-Light Activity
- Completion status for each day
- Simple weekly totals: sessions completed and estimated minutes

Behavior:
- Tapping a day switches the Today view to that day or opens that day's details.
- Visual treatment should remain minimal; no heavy analytics dashboard.

### Log

A simple history list of completed or edited training days.

### Backup

Minimal data and preference controls.

Content:
- Language setting: Traditional Chinese and English
- Export JSON
- Import JSON
- Reset local data

Behavior:
- Traditional Chinese is the default language.
- Language preference is saved to `localStorage`.
- Changing language updates interface labels, training item names, session types, and common helper text.
- Export downloads all local training records.
- Import replaces or merges records after clear confirmation.
- Reset requires clear confirmation.

## Data Model

Static plan data:
- Day key
- Traditional Chinese and English labels
- Session type
- Planned duration
- Intensity
- Checklist items
- Focus notes

Local user data:
- Date key
- Day key
- Completed checklist item IDs
- RPE
- Technical notes
- Body check
- Next focus
- Last updated timestamp

Local preferences:
- Language: `zh-TW` or `en`

Storage:
- Use a single localStorage key such as `boxing-tracker-v1`.
- Keep data human-readable JSON for export/import.
- Store preferences with the same export/import payload so backups preserve language choice.

## GitHub Pages

The app must build as a static site that can be hosted on GitHub Pages. No server, database, login, GitHub OAuth, or GitHub API writes are included in version one.

## Success Criteria

- User can open the site and immediately see today's boxing plan.
- User can check off training items and write RPE/notes.
- Data remains after refresh through localStorage.
- User can view the week and past logs.
- User can export/import backup JSON.
- User can switch between Traditional Chinese and English.
- The app feels simple, polished, and Steady-inspired.
- The build is suitable for GitHub Pages deployment.

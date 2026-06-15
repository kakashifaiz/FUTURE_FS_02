# Advanced CRM

A simple full-stack CRM for managing website leads with CRUD operations, status updates, follow-up tracking, notes, search, filtering, and basic analytics.

## Features
- Create, read, update, and delete leads
- Track lead status: New, Contacted, Converted
- Add notes and follow-up dates
- Search and filter leads
- View quick analytics for lead pipeline health
- Simple admin login

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Storage: JSON file (local persistence)

## Project Structure
- `server.js` - Express server and API routes
- `public/` - Frontend HTML, CSS, and JavaScript
- `test/` - Basic regression tests for filtering and analytics

## Installation
1. Open the project folder
2. Install dependencies:
   ```bash
   npm install
   ```

## Run the App
Start the server:
```bash
node server.js
```

Open your browser at:
```text
http://localhost:3000
```

## Default Login
- Username: `admin`
- Password: `admin123`

## Testing
Run tests with:
```bash
npm test
```

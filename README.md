# Rent Management System

A web-based rent management application built with Node.js and Express.

## Tech Stack

- **Backend:** Node.js, Express 5
- **Templating:** EJS
- **Database:** SQLite (via `sqlite` and `sqlite3`)
- **Auth & Sessions:** bcryptjs, express-session, session-file-store, cookie-parser
- **Other:** Chart.js (for data visualization), connect-flash (flash messages), compression, dotenv, json2csv

## Project Structure

```
Rent-Management-System/
├── Views/              # EJS templates
├── public/              # Static assets (CSS, JS, images)
├── routes/              # Express route handlers
├── sessions/            # Session store files
├── createAdmin.js       # Script to create an admin user
├── database.js          # Database connection/setup
├── database.sqlite      # SQLite database file
├── hash.js              # Password hashing utility
├── resetAdmin.js        # Script to reset admin credentials
├── server.js            # Application entry point
├── package.json
└── package-lock.json
```

## Getting Started

### Prerequisites
- Node.js installed

### Installation

1. Clone the repository
```bash
git clone https://github.com/Abdullah-Saleem-141/Rent-Management-System.git
cd Rent-Management-System
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables (create a `.env` file if needed for your config)

4. Create an admin user
```bash
node createAdmin.js
```

5. Start the server
```bash
npm start
```

The app will run using `server.js` as the entry point.

## Admin Management

- `createAdmin.js` — creates an admin account
- `resetAdmin.js` — resets admin credentials

## License

ISC

# Silvera V2 - Premium E-commerce Platform

## Overview
Silvera V2 is a full-stack e-commerce platform with admin CMS, built with Node.js, Express, and SQLite.

## Features
- Product catalog with categories
- Shopping cart & checkout
- User authentication (JWT)
- Order management
- Admin CMS panel
- Payment gateway integration (DirectPay/NexusPay)
- Email service (Nodemailer)

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** SQLite (better-sqlite3)
- **Frontend:** Static HTML/CSS/JS
- **Admin Panel:** React-based (admin-app)
- **Testing:** Playwright (E2E)

## Environment Variables
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3865) |
| `JWT_SECRET` | Secret key for JWT tokens |
| `SMTP_*` | Email configuration |
| `NEXUSPAY_*` | Payment gateway credentials |
| `DATABASE_PATH` | Path to SQLite database |

## Development
```bash
npm install
npm run dev
```

## Production Deployment
This app is configured for Dokploy deployment with Docker.

## License
Private - InnovateHub Philippines

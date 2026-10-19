# Golden Resort Booking System

A full-stack resort booking and management system designed to simplify accommodation reservations, guest management, and day-to-day resort operations through a modern web interface.

Built with **Next.js, TypeScript, Tailwind CSS, Laravel, and MySQL**, the system provides a public booking experience and an administrative workspace for managing resort activities.

## Overview

Golden Resort Booking System is a web-based application that connects guests with resort accommodations while giving administrators and staff tools to manage reservations, rooms, customers, payments, and housekeeping operations.

The project uses a separate frontend and backend architecture, with Next.js handling the user interface and Laravel providing the API, business logic, and database integration.

## Features

### Guest Booking Experience

- **Accommodation Listings** — Browse available resort accommodations and room details.
- **Availability Search** — Search accommodations based on reservation dates and availability.
- **Reservation Management** — Create and manage booking information through the booking workflow.
- **Booking Details** — Access reservation information and booking status.

### Administration Dashboard

- **Dashboard Overview** — Access a centralized view of resort management information.
- **Room Management** — Manage accommodation details and active or inactive room availability.
- **Reservation Management** — View reservations, inspect booking details, and manage reservation records.
- **Customer Management** — View guest records and individual customer details.
- **Payment Management** — Access payment-related records and reservation payment information.

### Resort Operations

- **Check-in and Check-out Management** — Support guest arrival and departure workflows.
- **Housekeeping Management** — Track room turnover tasks after guest check-out.
- **Room Status Tracking** — Maintain room status information for resort operations.
- **Automated Housekeeping Tasks** — Generate housekeeping turnover tasks after check-out while preventing duplicate tasks and preserving maintenance-related room states.
- **Booking Notifications** — Maintain notification records for booking confirmations, reminders, cancellations, and refunds.
- **Notification Center** — View notifications from the administrative interface, track unread notifications, and mark notifications as read.

### Technical Features

- **Separated Frontend and Backend** — Independent Next.js frontend and Laravel backend.
- **REST API Integration** — Communicate between the frontend and backend through API endpoints.
- **Database Persistence** — Store application records using MySQL and Laravel's Eloquent ORM.
- **Role-Based Access** — Separate access according to supported user roles and permissions.
- **Responsive Interface** — Use a modern interface built with Tailwind CSS.
- **Data Management Tables** — Organize administrative records using structured tables and filtering tools.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | PHP, Laravel |
| API | REST API |
| Database | MySQL |
| ORM | Laravel Eloquent |
| Development Tools | Git, GitHub, npm |

## Architecture

The application is organized into two main components:

```text
Golden-Resort-Booking-System/
├── frontend/          # Next.js application
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/           # Laravel application
│   ├── app/
│   ├── routes/
│   ├── database/
│   ├── config/
│   └── composer.json
│
└── README.md
```

*The directory structure above is illustrative; actual subdirectories may differ.*

### Request Flow

1. The user interacts with the Next.js frontend.
2. The frontend API client sends requests to the Laravel backend.
3. Laravel validates requests, applies business rules, and processes application logic.
4. Eloquent interacts with the MySQL database.
5. The backend returns responses to the frontend for display.

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

Install the following tools before starting:

- Node.js and npm
- PHP
- Composer
- MySQL
- Git

You may use XAMPP or another local development environment for MySQL and PHP, provided the required versions and extensions are supported.

### 1. Clone the Repository

```bash
git clone https://github.com/peterGwapo29/Golden-Resort-Booking-System.git

cd Golden-Resort-Booking-System
```

### 2. Set Up the Laravel Backend

```bash
cd backend

composer install
```

Create your environment file using the provided example:

```bash
cp .env.example .env
```

Configure the database settings in `.env`:

```dotenv
APP_NAME=Golden_Resort
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=golden_resort_db
DB_USERNAME=root
DB_PASSWORD=
```

Create the `golden_resort_db` database in MySQL, then generate the application key:

```bash
php artisan key:generate
```

Run database migrations if the project includes the required migration files:

```bash
php artisan migrate
```

Start the Laravel development server:

```bash
php artisan serve
```

The backend will normally be available at `http://localhost:8000`.

**Note:** Configure any required API URLs, environment variables, and database seeders according to the project's existing configuration. Never commit real credentials or secret keys.

### 3. Set Up the Next.js Frontend

Open a separate terminal:

```bash
cd frontend

npm install
```

Create the frontend environment file using the variables required by the project. For example, if the application uses `NEXT_PUBLIC_API_URL`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Use the exact environment variable expected by the existing API client.

Start the frontend development server:

```bash
npm run dev
```

The frontend will normally be available at `http://localhost:3000`.

### 4. Verify the Application

- Confirm that the Laravel backend starts successfully.
- Confirm that the Next.js frontend loads.
- Verify that the frontend can communicate with the Laravel API.
- Check the MySQL connection and required database tables.
- Test the booking workflow and administrative features using the appropriate user accounts.

**Important:** The setup instructions assume standard Laravel and Next.js configurations. Review the repository's environment files, migration requirements, and package scripts before running the commands.

## Security Considerations

- Keep database credentials and application secrets out of version control.
- Validate incoming requests on the backend.
- Enforce authentication and authorization for protected operations.
- Apply server-side validation to booking and payment-related data.
- Configure appropriate CORS settings for the frontend and backend.
- Use HTTPS and secure environment variables when deploying to production.

## Future Improvements

Potential areas for future development include:

- Online payment gateway integration.
- Email and SMS notification integrations.
- Enhanced booking analytics and revenue reports.
- Additional accommodation search and filtering options.
- Automated deployment and continuous integration.

These are possible enhancements and are not necessarily part of the current implementation.

## Project Status

**Status:** Completed — prepared for staging.

This project demonstrates full-stack web development, frontend/backend integration, database management, reservation workflows, and administrative operations.

## Author

**Peter Olan-Olan**

Full-Stack Developer

- GitHub: [@peterGwapo29](https://github.com/peterGwapo29)
- Repository: [Golden Resort Booking System](https://github.com/peterGwapo29/Golden-Resort-Booking-System)

## License

No license has been specified for this repository yet. All rights reserved unless a license is added to the project.

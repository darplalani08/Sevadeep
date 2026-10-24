# SevaDeep — System Architecture

## 1. Project Overview
SevaDeep is a web-based NGO management platform designed to digitize student enrollment, volunteer registration, application tracking, and administrative operations.

## 2. System Architecture
The platform uses a client-server architecture consisting of:

- **Frontend:** Responsive website for students, volunteers, donors, NGOs, and administrators.
- **Backend:** API endpoints handling requests, validation, authentication, and business logic.
- **Database:** Supabase PostgreSQL for persistent cloud-based data storage.
- **Deployment:** Vercel for web application hosting.
- **Version Control:** Git and GitHub.

## 3. Student Application Workflow
1. Student completes the enrollment form.
2. Application details are validated.
3. Valid records are stored in the database.
4. A unique application reference is generated.
5. The administrator reviews the application.
6. The application status is updated.
7. The student tracks the application using the reference.

## 4. Volunteer Matching Algorithm
The system uses a weighted compatibility model:

Match Score = (0.50 × Skills) + (0.30 × Interests) + (0.20 × Availability)

The resulting score is used to rank volunteering opportunities based on compatibility.

## 5. Administrator Dashboard
The administrative interface supports application review, status management, volunteer information, and operational monitoring.

## 6. Security Considerations
- Authenticated administrator access
- Role-based authorization
- Input validation
- Protected database operations
- Secure application sessions

## 7. Technical Value
The platform combines multiple NGO workflows within a single system, reducing dependence on disconnected manual processes and improving application transparency.

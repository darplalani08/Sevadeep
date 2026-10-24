# 🪔 SevaDeep — NGO Management Platform

### Connecting Donors, Empowering Communities

A modern, responsive NGO management platform developed to digitize SevaDeep's operations, simplify student enrollment, streamline volunteer coordination, and improve transparency through centralized application management.

[![Live Website](https://img.shields.io/badge/Live_Website-Visit_SevaDeep-800020?style=for-the-badge)](https://sevadeep-two.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

**🌐 Live Website:** https://sevadeep-two.vercel.app/

**🔐 Admin Login:** https://sevadeep-two.vercel.app/admin/login

---

## 📌 About the Project

SevaDeep is a Pune-based NGO initiative associated with the Relfor Foundation, connecting donors with verified NGOs and supporting community welfare through donations, food distribution, educational resources, and volunteering.

This project extends the NGO's digital presence beyond a conventional informational website by introducing structured workflows for student applications, volunteering, and administration.

### 🎯 Project Objectives

- Digitize student enrollment and application management.
- Provide transparent application status tracking.
- Support volunteer registration and opportunity matching.
- Centralize administrative operations.
- Improve accessibility through a responsive web interface.
- Provide interactive chatbot assistance for website users.

---

## ✨ Key Features

### 🤖 Interactive NGO Chatbot

- Rule-based intent recognition for common NGO-related queries.
- Assistance with services, donations, volunteering, and navigation.
- Lightweight implementation without dependence on a paid AI API.

### 🎓 Student Enrollment & Application Tracking

- Online enrollment form with input validation.
- Unique application reference generation.
- Application status tracking.
- Administrator-controlled application review.

**Application Lifecycle:**

`Submitted → Under Review → Approved / Rejected`

### 🛡️ Administrator Dashboard

- Protected administrator authentication.
- Centralized student application management.
- Approval and rejection workflows.
- Application statistics and analytics.
- Volunteer information management.

### 🤝 Skill-Based Volunteer Matching

A weighted compatibility algorithm recommends volunteering opportunities based on three parameters.

| Matching Parameter | Weight |
|---|---:|
| Skills | 50% |
| Interests | 30% |
| Availability | 20% |

**Matching Formula:**

`Match Score = 0.50 × Skills + 0.30 × Interests + 0.20 × Availability`

This provides an explainable approach to ranking volunteering opportunities.

### 📱 Responsive User Experience

- Mobile-friendly interface.
- Light and dark themes.
- Animated UI components.
- Accessible navigation and optimized images.

---

## 🏗️ System Architecture

The application uses a layered architecture:

```text
                  USERS
       Students | Volunteers | Donors
               | Administrators
                       |
                       v
             NEXT.JS FRONTEND
          React + TypeScript + Tailwind
                       |
                       v
              BACKEND API ROUTES
        Validation | Auth | Business Logic
                       |
                       v
                 DATA STORAGE
           Persistent Application Records
                       |
                       v
               SYSTEM OUTPUTS
       Application Tracking | Dashboard
        Volunteer Matching | Analytics
```

The database implementation and synchronization mechanism should be updated here to match the current production configuration.

---

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Animation | Framer Motion, Lenis |
| Forms | React Hook Form, Zod |
| Backend | Next.js API Route Handlers |
| Chatbot | Rule-based intent recognition |
| Volunteer Matching | Weighted scoring algorithm |
| Version Control | Git, GitHub |
| Deployment | Vercel |

**Database:** Verify whether the current deployed version uses Supabase PostgreSQL or another persistence layer before listing it as the production database.

---

## 🌐 Live Deployment

The SevaDeep website is available at:

**https://sevadeep-two.vercel.app/**

The deployment provides access to the public-facing platform through a browser.

### 🔐 How to Access the Admin Panel

1. Open the deployed website.
2. Navigate directly to:

   **https://sevadeep-two.vercel.app/admin/login**

3. Enter the authorized administrator credentials.
4. After successful authentication, access the administrator dashboard at `/admin`.

**Security:** Administrator credentials are not published in this repository. Access is restricted to authorized users.

> Note: Production administrator access depends on the authentication and database configuration deployed to Vercel.

---

## 💻 Getting Started Locally

### Prerequisites

- Node.js and npm
- Git
- Required environment variables for the active backend configuration

### Installation

Clone the repository:

```bash
git clone https://github.com/darplalani08/Sevadeep.git
cd Sevadeep
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

`http://localhost:3000`

### Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build the application |
| `npm run start` | Run production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run test:api` | Run API integration tests |
| `npm run test:browser` | Run browser tests |
| `npm run test:all` | Run the complete test suite |

These commands reflect the existing repository documentation and should be checked against the current `package.json`.

---

## 🧪 Testing and Quality Assurance

The project includes testing for:

- Form validation and input handling.
- Chatbot response logic.
- Volunteer matching calculations.
- Application persistence and status management.
- Administrator authentication.
- API integration.
- Browser-based application workflows.

The original local implementation documented 67 unit tests, 51 HTTP integration tests, and a 19-step browser test. These are historical results and should be rerun against the current code before being reported as current verification.

---

## 🌟 Novelty and Value Addition

**1. Explainable Volunteer Recommendations**

Uses weighted compatibility scoring rather than only collecting volunteer information.

**2. End-to-End Application Workflow**

Connects enrollment, administrator review, and applicant tracking.

**3. Integrated NGO Operations**

Brings multiple NGO-related services together within one digital platform.

**4. Reduced Manual Coordination**

Supports structured records, centralized administration, and transparent application processing.

---

## 👨‍💻 Project Contributors

**Rachit Doshi**  
**Darp Lalani**

Symbiosis Institute of Technology, Pune  
Department of Computer Science and Engineering  
Batch: 2024–2028

---

## 📚 Project Documentation

- [Technical Documentation](SEVADEEP_TECHNICAL_DOCUMENTATION.md)
- [System Architecture](ARCHITECTURE.md)
- [Demo Checklist](DEMO_CHECKLIST.md)
- [Original Website Audit](scraper/SITEMAP.md)

---

## 🙏 Acknowledgement

We thank SevaDeep and the Relfor Foundation for the opportunity to contribute to their community welfare initiatives through technical development and volunteering activities.

---

**SevaDeep — Connecting Donors, Empowering Communities.**

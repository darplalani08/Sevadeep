# SevaDeep — Testing and Quality Assurance

## 1. Overview

This document describes the testing strategy for SevaDeep, a web-based NGO management platform.

The objective is to verify the reliability, functionality, security, and consistency of the application across its major modules.

## 2. Testing Objectives

- Validate student enrollment and application tracking.
- Verify administrator authentication and authorization.
- Test application approval and rejection workflows.
- Evaluate volunteer matching calculations.
- Verify chatbot response handling.
- Check database persistence and cross-device consistency.
- Ensure responsive behavior across devices.

## 3. Testing Methodology

The project uses multiple testing approaches:

| Testing Type | Purpose |
|---|---|
| Unit Testing | Verify individual functions and algorithms |
| Integration Testing | Validate interactions between APIs and data storage |
| Functional Testing | Check user-facing application workflows |
| Security Testing | Verify authentication and access restrictions |
| UI Testing | Validate navigation, forms, and responsiveness |
| Persistence Testing | Confirm data remains stored after refresh or restart |

## 4. Functional Test Cases

The following checklist can be used to record manual verification of the deployed application.

| Test ID | Test Scenario | Expected Result |
|---|---|---|
| TC-01 | Open homepage | Website loads successfully |
| TC-02 | Submit valid student enrollment | Application is accepted and reference generated |
| TC-03 | Submit incomplete enrollment | Validation error is displayed |
| TC-04 | Track valid application ID | Correct application status is displayed |
| TC-05 | Track invalid application ID | Appropriate error is displayed |
| TC-06 | Login with valid admin credentials | Administrator dashboard opens |
| TC-07 | Login with invalid credentials | Authentication is rejected |
| TC-08 | Access admin dashboard without login | Unauthorized access is blocked |
| TC-09 | Approve or reject application | Updated status is saved |
| TC-10 | Register as volunteer | Valid registration is processed |
| TC-11 | Calculate volunteer match | Opportunities are ranked using matching scores |
| TC-12 | Ask chatbot a supported question | Relevant response is displayed |
| TC-13 | Refresh application tracking page | Previously saved status remains available |
| TC-14 | Open website on mobile | Layout adapts to screen size |
| TC-15 | Access application from another device | Shared records remain consistent |

**Note:** These are test cases, not claims that every test has passed. Record the actual outcome after execution.

## 5. Volunteer Matching Algorithm Testing

The volunteer matching engine uses a weighted compatibility formula:

**Match Score = (0.50 × Skills) + (0.30 × Interests) + (0.20 × Availability)**

### Example Test

Assume the individual compatibility scores are normalized to a scale of 0–100.

| Parameter | Score | Weight | Contribution |
|---|---:|---:|---:|
| Skills | 80 | 50% | 40 |
| Interests | 90 | 30% | 27 |
| Availability | 70 | 20% | 14 |
| **Total** | | **100%** | **81** |

**Expected Match Score: 81/100**

This example can be used to verify the weighted scoring calculation. Actual ranking also depends on how the application calculates each compatibility component.

## 6. Database Persistence Testing

### Test Procedure

1. Submit a student application.
2. Save the generated application reference.
3. Open the administrator dashboard.
4. Verify that the application record is available.
5. Update the application status.
6. Refresh the administrator dashboard.
7. Open the tracking interface on another device.
8. Verify that the updated status is retrieved.

### Expected Result

Application data and status updates should persist in the configured database and remain accessible to authorized users.

## 7. Security Testing

### Authentication Tests

- Verify administrator login with valid credentials.
- Reject invalid authentication attempts.
- Restrict access to protected administrative routes.
- Verify logout and session handling.

### Input Validation Tests

- Reject missing required fields.
- Validate application reference formats.
- Handle malformed requests safely.
- Prevent unauthorized application status modifications.

### Data Protection

- Avoid exposing database credentials in frontend code.
- Keep sensitive environment variables outside the repository.
- Restrict access to administrative operations.

## 8. Automated Testing

The repository documents the following testing commands:

```bash
npm test
npm run test:api
npm run test:browser
npm run test:all
```

These commands should be verified against the current `package.json`.

The earlier local implementation reported:

- 67 unit tests
- 51 HTTP integration tests
- A 19-step browser test

These figures describe the previously documented test suite. Current results should be recorded after rerunning the tests on the latest codebase.

## 9. Manual Test Execution Record

| Test Area | Result | Remarks |
|---|---|---|
| Student Enrollment | Not yet recorded | |
| Application Tracking | Not yet recorded | |
| Admin Authentication | Not yet recorded | |
| Application Approval | Not yet recorded | |
| Volunteer Matching | Not yet recorded | |
| Chatbot | Not yet recorded | |
| Database Persistence | Not yet recorded | |
| Cross-Device Access | Not yet recorded | |
| Mobile Responsiveness | Not yet recorded | |

Replace each result with **Pass**, **Fail**, or **Not Applicable** after testing.

## 10. Conclusion

A structured testing process helps ensure that SevaDeep's user-facing features, backend workflows, database operations, and administrative controls operate reliably.

Maintaining test cases and execution records also supports regression testing as the platform evolves.

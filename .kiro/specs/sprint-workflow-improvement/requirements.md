# Requirements Document

## Introduction

This feature improves the Sprint page from a basic list view into a comprehensive sprint workflow hub that supports the daily cycle of sprint planning, execution tracking, and closure. The improved page provides visibility into sprint initiatives, progress tracking, and sprint lifecycle management — all within the context of the OKR system.

## Glossary

- **Sprint_Page**: The frontend page at `/sprints` that displays sprint information and workflow controls
- **Sprint_Detail_Page**: The frontend page at `/sprints/:id` that shows a single sprint's full context
- **Sprint_Board**: A section within Sprint Detail that displays all initiatives assigned to the sprint, grouped by status
- **Initiative_Card**: A UI component displaying an initiative's title, status, progress, assignee, and due date
- **Sprint_Summary**: A statistics section showing sprint progress metrics (total initiatives, done count, in-progress count, blocked count)
- **Sprint_Backlog**: Initiatives that exist in the system without a sprint assignment (sprint_id is null) for the current quarter
- **Carry_Over**: The action of reassigning incomplete initiatives from a completed sprint to the next planning sprint
- **Sprint_Progress**: The aggregate progress calculated as average of all root-level initiative progress values within a sprint

## Requirements

### Requirement 1: Sprint Detail Page with Initiative Board

**User Story:** As a team member, I want to see all initiatives assigned to a sprint grouped by status, so that I can understand what work is planned, in progress, and completed.

#### Acceptance Criteria

1. WHEN a user navigates to `/sprints/:id`, THE Sprint_Detail_Page SHALL display the sprint name, goal, status, start date, and end date in a header section
2. WHEN a user views the Sprint_Detail_Page, THE Sprint_Board SHALL display all initiatives assigned to the sprint grouped into columns by status (TODO, IN_PROGRESS, BLOCKED, DONE, CANCELLED)
3. THE Initiative_Card SHALL display the initiative title, status badge, progress percentage, assignee name, and due date
4. WHEN an initiative has a parent objective and key result, THE Initiative_Card SHALL display the parent objective title and key result title as context breadcrumbs
5. WHEN the sprint has zero initiatives assigned, THE Sprint_Board SHALL display an empty state message with guidance to assign initiatives from the Objectives page

### Requirement 2: Sprint Progress Summary

**User Story:** As a product manager, I want to see aggregate progress metrics for a sprint, so that I can quickly assess how the sprint is tracking.

#### Acceptance Criteria

1. WHEN a user views the Sprint_Detail_Page, THE Sprint_Summary SHALL display the total number of initiatives, count per status (TODO, IN_PROGRESS, BLOCKED, DONE, CANCELLED), and the Sprint_Progress percentage
2. THE Sprint_Summary SHALL calculate Sprint_Progress as the average progress of all root-level initiatives assigned to the sprint
3. WHEN an initiative's progress changes, THE Sprint_Summary SHALL update the Sprint_Progress value within 2 seconds via WebSocket invalidation
4. THE Sprint_Summary SHALL display a visual progress bar representing the Sprint_Progress percentage

### Requirement 3: Sprint Lifecycle Actions on Detail Page

**User Story:** As a team member, I want to manage the sprint lifecycle (activate, complete) directly from the sprint detail page, so that I can control the sprint flow without navigating away.

#### Acceptance Criteria

1. WHILE a sprint status is PLANNING, THE Sprint_Detail_Page SHALL display an "Activate" button and an "Edit" button
2. WHILE a sprint status is ACTIVE, THE Sprint_Detail_Page SHALL display a "Complete Sprint" button
3. WHEN a user clicks "Complete Sprint", THE Sprint_Detail_Page SHALL open a modal requesting review_note and retro_note before completing the sprint
4. WHILE a sprint status is COMPLETED, THE Sprint_Detail_Page SHALL display the review_note and retro_note in a dedicated review section
5. WHILE a sprint status is COMPLETED, THE Sprint_Detail_Page SHALL disable all editing actions

### Requirement 4: Sprint Backlog View

**User Story:** As a team member, I want to see unassigned initiatives (backlog) for the current quarter, so that I can identify work that needs to be planned into a sprint.

#### Acceptance Criteria

1. WHEN a user views the Sprint_Detail_Page for a PLANNING or ACTIVE sprint, THE Sprint_Detail_Page SHALL display a "Backlog" section showing initiatives in the current quarter that have no sprint assignment (sprint_id is null)
2. THE Sprint_Backlog SHALL display each initiative with its title, status, progress, assignee, due date, and parent key result title
3. WHEN a user clicks an "Assign to Sprint" action on a backlog initiative, THE Sprint_Detail_Page SHALL update the initiative's sprint_id to the current sprint
4. WHEN an initiative is successfully assigned, THE Sprint_Board SHALL immediately reflect the newly assigned initiative in the correct status column

### Requirement 5: Initiative Carry-Over on Sprint Completion

**User Story:** As a team member, I want to easily move incomplete initiatives to the next sprint when completing a sprint, so that unfinished work is not lost.

#### Acceptance Criteria

1. WHEN a user clicks "Complete Sprint" and there are initiatives with status not equal to DONE or CANCELLED, THE Complete_Sprint_Modal SHALL display a list of incomplete initiatives with an option to carry them over
2. WHEN the user selects initiatives for Carry_Over, THE System SHALL update each selected initiative's sprint_id to the next PLANNING sprint in the same quarter
3. IF no PLANNING sprint exists in the quarter when carry-over is requested, THEN THE System SHALL display a message indicating that no target sprint is available for carry-over
4. WHEN carry-over is completed, THE System SHALL log the reassignment action in the activity log for each moved initiative

### Requirement 6: Enhanced Sprint List Page

**User Story:** As a team member, I want the sprint list to show progress indicators and initiative counts, so that I can compare sprints at a glance.

#### Acceptance Criteria

1. THE Sprint_Page SHALL display each sprint card with the sprint name, status badge, date range, goal, initiative count, and Sprint_Progress bar
2. WHEN a user clicks on a sprint card, THE Sprint_Page SHALL navigate to the Sprint_Detail_Page for that sprint
3. THE Sprint_Page SHALL visually distinguish the ACTIVE sprint from PLANNING and COMPLETED sprints using a highlighted border or background
4. THE Sprint_Page SHALL sort sprints with ACTIVE first, then PLANNING by start_date ascending, then COMPLETED by end_date descending

### Requirement 7: Quick Initiative Status Update from Sprint Board

**User Story:** As a team member, I want to quickly update an initiative's status from the sprint board, so that I can reflect daily progress without navigating to the objective detail page.

#### Acceptance Criteria

1. WHEN a user clicks on an Initiative_Card in the Sprint_Board, THE Sprint_Detail_Page SHALL open the initiative edit drawer (same as Objectives page) allowing status and progress updates
2. WHEN a user updates an initiative's status or progress from the drawer, THE Sprint_Board SHALL immediately reflect the change in the correct status column
3. WHEN a leaf initiative's progress is updated from the Sprint_Board, THE System SHALL trigger the standard progress recalculation chain (parent initiative → key result → objective)

### Requirement 8: Sprint Timeline Indicator

**User Story:** As a team member, I want to see how many days remain in the active sprint, so that I can pace my work accordingly.

#### Acceptance Criteria

1. WHILE a sprint status is ACTIVE, THE Sprint_Detail_Page SHALL display a timeline indicator showing the number of days elapsed, total sprint duration in days, and number of days remaining
2. WHILE a sprint status is ACTIVE, THE Sprint_Detail_Page SHALL display a visual timeline bar representing elapsed time as a percentage of total duration
3. IF the current date exceeds the sprint end_date and the sprint is still ACTIVE, THEN THE Sprint_Detail_Page SHALL display an "Overdue" warning indicator with the number of days past the end date


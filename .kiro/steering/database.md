# Database Schema

Use MySQL 8.0+ with GORM. All main entities use soft delete (deleted_at column).

## Tables

- users
- periods
- sprints
- objectives
- key_results
- initiatives
- initiative_updates
- notifications
- notification_logs
- activity_logs

## Migration Order

1. users
2. periods
3. sprints
4. objectives
5. key_results
6. initiatives
7. initiative_updates
8. notifications
9. notification_logs
10. activity_logs

## Schema

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME NULL
);

CREATE TABLE periods (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  year INT NOT NULL,
  quarter ENUM('Q1','Q2','Q3','Q4') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME NULL,
  UNIQUE KEY unique_year_quarter (year, quarter)
);

CREATE TABLE sprints (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  period_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  goal TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'PLANNING',
  review_note TEXT NULL,
  retro_note TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME NULL,
  INDEX idx_sprints_period_id (period_id),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE objectives (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  period_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  progress DECIMAL(5,2) DEFAULT 0,
  confidence_level INT DEFAULT 5 COMMENT '0-10 scale, how confident we achieve this objective',
  status VARCHAR(30) DEFAULT 'PLANNING',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME NULL,
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE key_results (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  objective_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  target_value DECIMAL(10,2) NOT NULL DEFAULT 100,
  current_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  metric_unit VARCHAR(50) NULL,
  progress DECIMAL(5,2) DEFAULT 0,
  confidence_level INT DEFAULT 5 COMMENT '0-10 scale, how confident we achieve this KR',
  status VARCHAR(30) DEFAULT 'PLANNING',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME NULL,
  FOREIGN KEY (objective_id) REFERENCES objectives(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE initiatives (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  key_result_id BIGINT UNSIGNED NOT NULL,
  sprint_id BIGINT UNSIGNED NULL COMMENT 'nullable, initiative can exist without sprint',
  parent_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  assignee_id BIGINT UNSIGNED NULL,
  progress DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'TODO',
  due_date DATE NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME NULL,
  INDEX idx_initiatives_sprint_id (sprint_id),
  INDEX idx_initiatives_parent_id (parent_id),
  INDEX idx_initiatives_key_result_id (key_result_id),
  INDEX idx_initiatives_assignee_id (assignee_id),
  FOREIGN KEY (key_result_id) REFERENCES key_results(id),
  FOREIGN KEY (sprint_id) REFERENCES sprints(id),
  FOREIGN KEY (parent_id) REFERENCES initiatives(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE initiative_updates (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  initiative_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  progress_before DECIMAL(5,2),
  progress_after DECIMAL(5,2),
  note TEXT NULL,
  blocker TEXT NULL,
  created_at DATETIME,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME,
  read_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notification_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  initiative_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  reminder_key VARCHAR(50) NOT NULL,
  created_at DATETIME,
  UNIQUE KEY unique_notification_log (initiative_id, user_id, reminder_key),
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  entity_title VARCHAR(255),
  description TEXT,
  old_value TEXT NULL,
  new_value TEXT NULL,
  objective_id BIGINT UNSIGNED NULL,
  key_result_id BIGINT UNSIGNED NULL,
  initiative_id BIGINT UNSIGNED NULL,
  created_at DATETIME,
  INDEX idx_activity_logs_user_id (user_id),
  INDEX idx_activity_logs_entity (entity_type, entity_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Entity Relationships

- users 1..n objectives (created_by)
- users 1..n key_results (created_by)
- users 1..n sprints (created_by)
- users 1..n initiatives (assignee_id, created_by)
- users 1..n initiative_updates
- users 1..n notifications
- periods 1..n objectives
- periods 1..n sprints
- sprints 1..n initiatives
- objectives 1..n key_results
- key_results 1..n initiatives
- initiatives 1..n initiatives (self-referencing via parent_id)
- initiatives 1..n initiative_updates
- initiatives 1..n notification_logs

## Conventions

- Table names: snake_case plural
- Column names: snake_case
- Foreign keys: {referenced_table_singular}_id
- Timestamps: created_at, updated_at, deleted_at (GORM convention)
- Use GORM AutoMigrate for development, manual SQL for production

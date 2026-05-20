export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Period {
  id: number;
  year: number;
  quarter: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Sprint {
  id: number;
  period_id: number;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  review_note: string | null;
  retro_note: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Objective {
  id: number;
  period_id: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface KeyResult {
  id: number;
  objective_id: number;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  metric_unit: string | null;
  progress: number;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Initiative {
  id: number;
  key_result_id: number;
  sprint_id: number | null;
  parent_id: number | null;
  title: string;
  description: string | null;
  assignee_id: number | null;
  progress: number;
  status: string;
  due_date: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  children?: Initiative[];
}

export interface InitiativeUpdate {
  id: number;
  initiative_id: number;
  user_id: number;
  progress_before: number;
  progress_after: number;
  note: string | null;
  blocker: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: number;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface DashboardSummary {
  total_objectives: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  off_track: number;
  overdue_initiatives: number;
  recent_updates: InitiativeUpdate[];
}

export interface AnnualDashboard {
  year: number;
  annual_summary: {
    total_objectives: number;
    avg_progress: number;
    avg_confidence: number;
    completed_objectives: number;
    completion_rate: number;
    total_initiatives: number;
    total_overdue: number;
  };
  quarters: QuarterSummary[];
}

export interface QuarterSummary {
  quarter: string;
  period_id: number;
  total_objectives: number;
  avg_progress: number;
  avg_confidence: number;
  on_track: number;
  at_risk: number;
  off_track: number;
  done: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

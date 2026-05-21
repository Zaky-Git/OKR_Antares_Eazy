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
  // Phase 1: okr-objective-context fields
  strategy_id?: number | null;
  segment_id?: number | null;
  division_id?: number | null;
  owner_id?: number | null;
  notes?: string | null;
  strategy?: { id: number; name: string; color: string } | null;
  segment?: { id: number; name: string; color: string } | null;
  division?: { id: number; name: string; code: string; color: string } | null;
  owner?: { id: number; name: string; email: string } | null;
}

export type KRType = 'METRIC' | 'MILESTONE';

export interface KeyResult {
  id: number;
  objective_id: number;
  title: string;
  description: string | null;
  kr_type?: string;
  target_value: number;
  current_value: number;
  baseline_value?: number | null;
  metric_unit: string | null;
  due_date?: string | null;
  notes?: string | null;
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
  support_needed?: string | null;
  notes?: string | null;
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
  total_key_results: number;
  total_initiatives: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  off_track: number;
  overdue_initiatives: number;
  in_progress: number;
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

export interface SprintInitiative {
  id: number;
  key_result_id: number;
  sprint_id: number | null;
  parent_id: number | null;
  parent_title: string | null;
  title: string;
  description: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  progress: number;
  status: string;
  due_date: string | null;
  objective_title: string;
  key_result_title: string;
  created_by: number;
  has_children: boolean;
}

export interface SprintSummary {
  total_initiatives: number;
  todo_count: number;
  in_progress_count: number;
  blocked_count: number;
  done_count: number;
  cancelled_count: number;
  sprint_progress: number;
}

export interface CarryOverResponse {
  carried_count: number;
  target_sprint_id: number;
  target_sprint_name: string;
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

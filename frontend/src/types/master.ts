// Master data types for Strategy, Segment, and Division
// Used by /admin/masters page and Objective form

export interface Strategy {
  id: number;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Segment {
  id: number;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Division {
  id: number;
  name: string;
  code: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// DTOs for create/update operations
export interface CreateStrategyDto {
  name: string;
  description?: string;
  color: string;
  sort_order?: number;
  is_active?: boolean;
}

export type UpdateStrategyDto = Partial<CreateStrategyDto>;

export interface CreateSegmentDto {
  name: string;
  description?: string;
  color: string;
  is_active?: boolean;
}

export type UpdateSegmentDto = Partial<CreateSegmentDto>;

export interface CreateDivisionDto {
  name: string;
  code: string;
  description?: string;
  color: string;
  is_active?: boolean;
}

export type UpdateDivisionDto = Partial<CreateDivisionDto>;

import { useQuery } from '@tanstack/react-query';
import { sprintService } from '../services/sprint.service';
import { periodService } from '../services/period.service';
import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function SprintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedSprintId, setHighlightedSprintId] = useState<number | null>(null);

  const { data: periodRes } = useQuery({
    queryKey: ['periods', 'current'],
    queryFn: () => periodService.getCurrent(),
  });

  const currentPeriod = periodRes?.data?.data;

  const { data: sprintRes, isLoading } = useQuery({
    queryKey: ['sprints', currentPeriod?.id],
    queryFn: () => sprintService.getByPeriod(currentPeriod!.id),
    enabled: !!currentPeriod?.id,
  });

  const sprints = sprintRes?.data?.data || [];

  useEffect(() => {
    const hl = searchParams.get('highlightSprint');
    if (hl) {
      setHighlightedSprintId(Number(hl));
      const timer = setTimeout(() => {
        setHighlightedSprintId(null);
        setSearchParams({}, { replace: true });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sprints</h1>
        {currentPeriod && <span className="period-label">{currentPeriod.year} {currentPeriod.quarter}</span>}
      </div>

      {sprints.length === 0 ? (
        <p className="empty-state">No sprints yet.</p>
      ) : (
        <div className="sprint-list">
          {sprints.map((sprint) => (
            <div key={sprint.id} className={`sprint-card ${highlightedSprintId === sprint.id ? 'ring-2 ring-primary ring-offset-2 animate-pulse rounded-xl' : ''}`}>
              <div className="sprint-card-header">
                <h3>{sprint.name}</h3>
                <span className={`status-badge status-${sprint.status.toLowerCase()}`}>
                  {sprint.status}
                </span>
              </div>
              <div className="sprint-card-body">
                <span>{sprint.start_date.slice(0, 10)} — {sprint.end_date.slice(0, 10)}</span>
                {sprint.goal && <p className="sprint-goal">{sprint.goal}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

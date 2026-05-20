import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { objectiveService } from '../services/objective.service';

export function ObjectiveDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: objRes, isLoading } = useQuery({
    queryKey: ['objective', id],
    queryFn: () => objectiveService.getById(Number(id)),
    enabled: !!id,
  });

  const objective = objRes?.data?.data;

  if (isLoading) return <div className="loading">Loading...</div>;
  if (!objective) return <div className="error">Objective not found</div>;

  return (
    <div className="page">
      <h1>{objective.title}</h1>
      <p className="description">{objective.description}</p>

      <div className="detail-meta">
        <span className={`status-badge status-${objective.status.toLowerCase().replace('_', '-')}`}>
          {objective.status}
        </span>
        <span>Progress: {objective.progress.toFixed(1)}%</span>
      </div>

      <div className="progress-bar large">
        <div className="progress-fill" style={{ width: `${objective.progress}%` }} />
      </div>


      <section className="section">
        <h2>Key Results</h2>
        <p className="empty-state">Key Results UI coming soon...</p>
      </section>
    </div>
  );
}

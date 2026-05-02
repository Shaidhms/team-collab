type Props = {
  totalTasks: number;
  doneTasks: number;
  online: number;
  highPriority: number;
};

export function Stats({ totalTasks, doneTasks, online, highPriority }: Props) {
  const completion = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  return (
    <div className="stats" role="region" aria-label="Workspace stats">
      <div className="stat">
        <span className="stat-label">Tasks</span>
        <span className="stat-value">{totalTasks}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Done</span>
        <span className="stat-value">
          {doneTasks}
          <span style={{ fontSize: 13, color: 'var(--fg-subtle)', marginLeft: 6 }}>
            {completion}%
          </span>
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">High priority</span>
        <span className="stat-value">{highPriority}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Online</span>
        <span className="stat-value">{online}</span>
      </div>
    </div>
  );
}

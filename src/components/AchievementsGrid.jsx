export default function AchievementsGrid({ list, unlocked }) {
  const count = list.filter((a) => unlocked[a.id]).length;

  return (
    <>
      <div className="ach-progress">
        <span>
          Открыто <strong>{count}</strong> из {list.length}
        </span>
        <span className="muted small">+{count}% к общему доходу</span>
      </div>

      <div className="ach-grid">
        {list.map((a) => {
          const got = Boolean(unlocked[a.id]);
          return (
            <div key={a.id} className={got ? 'ach got' : 'ach'}>
              <span className="ach-icon" aria-hidden="true">
                {got ? a.icon : '🔒'}
              </span>
              <div>
                <strong>{a.name}</strong>
                <p className="tiny muted">{a.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

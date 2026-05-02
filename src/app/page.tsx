import { store } from '@/lib/store';
import { readSession } from '@/lib/session';
import { TaskBoard } from '@/components/task-board';
import { JoinPrompt } from '@/components/join-prompt';
import { Avatar } from '@/components/avatar';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await readSession();

  // Server-side initial render of tasks + presence so the client hydrates
  // with real data, not a loading spinner. Cuts perceived latency.
  const initialTasks = await store.listTasks();
  const initialPresence = store.listPresence();

  return (
    <main id="main">
      <header className="app-header">
        <div>
          <span className="brand-mark">
            <span className="brand-icon" aria-hidden="true">
              TC
            </span>
            <span className="visually-hidden">Team Collab logo</span>
          </span>
          <h1>Team Collab</h1>
          <p className="tagline">
            Real-time shared task board. Add a task in one tab, watch it appear instantly in the
            other.
          </p>
        </div>

        {session && (
          <div className="user-chip" aria-label={`Signed in as ${session.name}`}>
            <Avatar name={session.name} size="sm" />
            <span>
              Signed in as <strong>{session.name}</strong>
            </span>
          </div>
        )}
      </header>

      {session ? (
        <TaskBoard
          initialTasks={initialTasks}
          initialPresence={initialPresence}
          currentUser={session.name}
        />
      ) : (
        <JoinPrompt />
      )}

      <footer className="app-footer">
        <span>
          Built with Next.js 14 · Server-Sent Events · Google Cloud Run · {new Date().getFullYear()}
        </span>
        <a
          href="https://github.com/Shaidhms/team-collab"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source on GitHub
        </a>
      </footer>
    </main>
  );
}

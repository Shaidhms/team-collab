import { store } from '@/lib/store';
import { readSession } from '@/lib/session';
import { TaskBoard } from '@/components/task-board';
import { JoinPrompt } from '@/components/join-prompt';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await readSession();

  // Server-side initial render of tasks + presence so the client hydrates
  // with real data, not a loading spinner. Cuts perceived latency.
  const initialTasks = store.listTasks();
  const initialPresence = store.listPresence();

  return (
    <main id="main">
      <header className="app-header">
        <div>
          <h1>Team Collab</h1>
          <p>Real-time shared task board. Open in another tab — your team sees changes live.</p>
        </div>
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
          Built with Next.js 14, Server-Sent Events, and Google Cloud Run · {new Date().getFullYear()}
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

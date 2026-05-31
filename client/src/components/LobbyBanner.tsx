import { Link, useLocation } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useLobby } from '../context/LobbyContext';

const PHASE_LABELS: Record<string, string> = {
  waiting: 'In attesa...',
  playing: 'Partita in corso',
  submitted: 'Voto inviato',
  round_result: 'Risultati round',
  finished: 'Partita terminata',
};

export default function LobbyBanner() {
  const { lobbyState, phase, leaveLobby } = useLobby();
  const location = useLocation();

  // Hide when idle/error, no lobby, or already on the lobby page
  if (!lobbyState || phase === 'idle' || phase === 'error') return null;
  if (location.pathname.startsWith('/lobby/')) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary truncate">
          {lobbyState.name}
          {PHASE_LABELS[phase] ? ` — ${PHASE_LABELS[phase]}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <Link
          to={`/lobby/${lobbyState.code}`}
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
        >
          Torna alla lobby →
        </Link>
        <button
          onClick={leaveLobby}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Esci
        </button>
      </div>
    </div>
  );
}

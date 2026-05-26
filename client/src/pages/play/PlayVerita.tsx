import type { ReactNode } from 'react';
import type { PlayViewProps } from './PlayLateShow';

const C = {
  paper:      '#f3eee2',
  paper2:     '#ebe4d2',
  card:       '#fbf7ec',
  ink:        '#1a1815',
  inkSoft:    '#3d3a32',
  muted:      '#6f6a5b',
  faint:      '#a59f8c',
  line:       '#d8d0bd',
  lineSoft:   '#e4dcc9',
  cherry:     '#c5392b',
  cherryDark: '#9a2c20',
  blue:       '#274a82',
};

const FONT_DISPLAY = "'DM Serif Display', 'Times New Roman', serif";
const FONT_BODY    = "'DM Sans', system-ui, sans-serif";
const FONT_MONO    = "'DM Mono', 'JetBrains Mono', monospace";

function Kicker({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2,
      textTransform: 'uppercase', color: color ?? C.cherry, fontWeight: 500,
      marginBottom: 4,
    }}>{children}</div>
  );
}

export default function PlayVerita({ movie, loading, userRating, setUserRating, result, showResult, error, movieMode, setMovieMode, fetchMovie, handleGuess }: PlayViewProps) {
  const pct = userRating / 10;
  const scoreLabel = (s: number) => s >= 80 ? 'Critico esperto' : s >= 60 ? 'Buona intuizione' : s >= 40 ? 'Ci hai provato' : 'Occhio al dettaglio';

  return (
    <div style={{
      minHeight: 'calc(100vh - 72px)',
      background: C.paper,
      color: C.ink,
      fontFamily: FONT_BODY,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 56px 52px' }}>

        {error && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            border: '1px solid ' + C.cherry,
            borderLeft: '4px solid ' + C.cherry,
            color: C.cherry, fontFamily: FONT_MONO, fontSize: 13,
            background: C.card,
          }}>
            {error}
          </div>
        )}

        {/* ── START SCREEN ── */}
        {!movie && !loading && !showResult && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{
              borderBottom: '3px double ' + C.ink, paddingBottom: 16, marginBottom: 28, textAlign: 'center',
            }}>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 44, color: C.ink, lineHeight: 1, letterSpacing: -0.5,
              }}>
                Film<span style={{ color: C.cherry, fontStyle: 'italic' }}>Rating</span>Guessr
              </div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 10, color: C.muted, letterSpacing: 1.5, marginTop: 6,
              }}>EDIZIONE SETTIMANALE</div>
            </div>

            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 56, color: C.ink, fontStyle: 'italic',
              lineHeight: 1, letterSpacing: -0.8, margin: '0 0 12px', textAlign: 'center',
            }}>
              Pronto a giocare?
            </h2>
            <p style={{ textAlign: 'center', fontSize: 15, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
              Indovina il voto TMDB del film e vedi quanto sei vicino alla critica.
            </p>

            {/* mode toggle */}
            <div style={{ display: 'flex', border: '1px solid ' + C.line, marginBottom: 10 }}>
              {(['popular', 'any'] as const).map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMovieMode(m)}
                  style={{
                    flex: 1, padding: '12px 16px', border: 0,
                    borderLeft: i === 1 ? '1px solid ' + C.line : '0',
                    background: movieMode === m ? C.cherry : C.card,
                    color: movieMode === m ? C.card : C.muted,
                    fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {m === 'popular' ? '🔥 Film famosi' : '🎲 Casuali'}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.faint, letterSpacing: 1, marginBottom: 28, textAlign: 'center' }}>
              {movieMode === 'popular'
                ? 'Film con almeno 1 000 voti — facilmente riconoscibili'
                : 'Qualsiasi film dal catalogo TMDB — potrebbe essere oscuro'}
            </p>

            <button
              onClick={() => fetchMovie()}
              style={{
                width: '100%', padding: '18px 24px',
                background: C.cherry, color: C.card, border: 0,
                fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: 'italic',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              Inizia ›
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && !showResult && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <div style={{
              width: 44, height: 44,
              border: `3px solid ${C.lineSoft}`,
              borderTopColor: C.cherry,
              borderRadius: '50%',
              animation: 'vspin 0.8s linear infinite',
            }} />
            <style>{`@keyframes vspin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── PLAYING ── */}
        {movie && !showResult && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 56 }}>
            {/* LEFT — editorial column */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Kicker>Indovina il voto</Kicker>
              <h1 style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontSize: Math.max(40, Math.min(84, 84 - Math.max(0, movie.title.length - 18) * 1.5)),
                lineHeight: 1, letterSpacing: -0.8, color: C.ink, fontStyle: 'italic',
              }}>
                {movie.title.split(' ').slice(0, -1).join(' ')}{' '}
                <span style={{ color: C.cherry }}>
                  {movie.title.split(' ').slice(-1)[0]}
                </span>
              </h1>

              {/* synopsis with drop-cap */}
              <p style={{
                margin: '22px 0 0', fontSize: 16, lineHeight: 1.5, color: C.inkSoft,
                maxWidth: 540,
              }}>
                <span style={{
                  float: 'left', fontFamily: FONT_DISPLAY, fontSize: 64, lineHeight: 0.85,
                  marginRight: 10, marginTop: 4, color: C.cherry,
                }}>
                  {movie.overview.charAt(0)}
                </span>
                {movie.overview.slice(1, 260)}
                {movie.overview.length > 260 ? '…' : ''}
              </p>

              {/* rating block */}
              <div style={{ marginTop: 'auto', paddingTop: 36 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  borderTop: '1px solid ' + C.ink, paddingTop: 18,
                }}>
                  <div>
                    <Kicker color={C.muted}>Il tuo voto</Kicker>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 96, lineHeight: 0.88,
                        color: C.cherry, letterSpacing: -3,
                      }}>{userRating.toFixed(1).replace('.', ',')}</span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.muted }}>/ 10,0</span>
                    </div>
                  </div>
                  <button
                    onClick={handleGuess}
                    disabled={loading}
                    style={{
                      background: C.cherry, color: C.card, border: 0,
                      padding: '18px 28px', fontFamily: FONT_DISPLAY, fontSize: 22,
                      fontStyle: 'italic', cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    Conferma ›
                  </button>
                </div>

                {/* ruler slider */}
                <div style={{ position: 'relative', height: 52, marginTop: 18 }}>
                  {/* baseline */}
                  <div style={{ position: 'absolute', top: 34, left: 0, right: 0, height: 1, background: C.ink }} />
                  {/* tick marks */}
                  {Array.from({ length: 21 }).map((_, i) => {
                    const major = i % 5 === 0;
                    return (
                      <div key={i} style={{
                        position: 'absolute', bottom: 18, left: `${i * 5}%`,
                        width: 1, height: major ? 18 : 10, background: C.ink,
                      }} />
                    );
                  })}
                  {/* labels */}
                  {[0, 5, 10].map((n) => (
                    <span key={n} style={{
                      position: 'absolute', top: 0, left: `${n * 10}%`,
                      transform: 'translateX(-50%)',
                      fontFamily: FONT_MONO, fontSize: 10, color: C.muted,
                    }}>{n}</span>
                  ))}
                  {/* triangle indicator */}
                  <div style={{
                    position: 'absolute', bottom: 8,
                    left: `${pct * 100}%`, transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '14px solid ' + C.cherry,
                    transition: 'left .05s',
                    pointerEvents: 'none',
                  }} />
                  {/* transparent input */}
                  <input
                    type="range" min="0" max="10" step="0.1"
                    value={userRating}
                    onChange={e => setUserRating(parseFloat(e.target.value))}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer', margin: 0,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT — poster as print */}
            <div style={{ position: 'relative', alignSelf: 'start', marginTop: 24 }}>
              <div style={{
                background: C.card, padding: 14, paddingBottom: 52,
                boxShadow: `0 1px 0 ${C.line}, 0 6px 24px rgba(26,24,21,0.10)`,
                transform: 'rotate(0.4deg)',
              }}>
                <div style={{ aspectRatio: '2/3', width: '100%', overflow: 'hidden' }}>
                  {movie.poster ? (
                    <img src={movie.poster} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: C.paper2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎬</div>
                  )}
                </div>
                <div style={{
                  marginTop: 12, fontFamily: FONT_DISPLAY, fontSize: 18, color: C.ink, fontStyle: 'italic',
                }}>"{movie.title}"</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: 1 }}>
                  TMDB · ID {movie.id}
                </div>
              </div>
              {/* corner tag */}
              <div style={{
                position: 'absolute', top: -12, right: -8,
                background: C.ink, color: C.card,
                padding: '6px 12px', fontFamily: FONT_MONO, fontSize: 10,
                letterSpacing: 1.5, transform: 'rotate(2deg)',
              }}>INDOVINA IL VOTO</div>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {showResult && result && movie && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
            {/* LEFT — verdict */}
            <div>
              <Kicker>Verdetto</Kicker>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 6 }}>
                <span style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 260, lineHeight: 0.82,
                  color: C.cherry, letterSpacing: -8,
                }}>{result.score}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.muted, marginTop: 18 }}>/ 100</span>
              </div>
              <h2 style={{
                fontFamily: FONT_DISPLAY, fontSize: 52, fontStyle: 'italic',
                color: C.ink, margin: '4px 0 0', letterSpacing: -0.8, lineHeight: 1,
              }}>
                {scoreLabel(result.score)}
              </h2>
              <p style={{ margin: '20px 0 0', maxWidth: 440, fontSize: 17, lineHeight: 1.55, color: C.inkSoft }}>
                Differenza di{' '}
                <em style={{ color: C.cherry, fontStyle: 'normal', fontWeight: 600 }}>
                  {result.diff.toFixed(1).replace('.', ',')} punti
                </em>{' '}
                dal voto reale{' '}
                <strong style={{ fontFamily: FONT_MONO, fontSize: 15 }}>
                  {result.realRating.toFixed(1).replace('.', ',')}
                </strong>.
              </p>
            </div>

            {/* RIGHT — receipt */}
            <div style={{
              background: C.card, border: '1px solid ' + C.line, padding: 28,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 14, borderBottom: '1px solid ' + C.line,
              }}>
                <Kicker color={C.muted}>Riepilogo film</Kicker>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.muted, letterSpacing: 1 }}>
                  ID {movie.id}
                </span>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 36, fontStyle: 'italic',
                  color: C.ink, lineHeight: 1, letterSpacing: -0.8,
                }}>{movie.title}</div>
              </div>

              {/* score table */}
              <div style={{
                marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                border: '1px solid ' + C.line,
              }}>
                {[
                  { k: 'Il tuo',  v: result.game.userRating.toFixed(1).replace('.', ','), c: C.ink },
                  { k: 'Reale',   v: result.realRating.toFixed(1).replace('.', ','),      c: C.cherry },
                  { k: 'Δ',       v: result.diff.toFixed(1).replace('.', ','),            c: C.blue },
                ].map((s, i, arr) => (
                  <div key={s.k} style={{
                    padding: '18px 14px',
                    borderRight: i < arr.length - 1 ? '1px solid ' + C.line : '0',
                  }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>{s.k}</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 46, lineHeight: 1, color: s.c, marginTop: 4, letterSpacing: -1 }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* next film button */}
              <button
                onClick={() => fetchMovie()}
                style={{
                  marginTop: 24, width: '100%', background: C.ink, color: C.card,
                  border: 0, padding: '16px 20px',
                  fontFamily: FONT_DISPLAY, fontSize: 20, fontStyle: 'italic',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span>Prossimo film</span><span>›</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

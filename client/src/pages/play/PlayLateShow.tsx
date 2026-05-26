import type { RandomMovie, GuessResult } from '../../types/index';

type MovieMode = 'popular' | 'any';

export interface PlayViewProps {
  movie: RandomMovie | null;
  loading: boolean;
  userRating: number;
  setUserRating: (n: number) => void;
  result: GuessResult | null;
  showResult: boolean;
  error: string;
  movieMode: MovieMode;
  setMovieMode: (m: MovieMode) => void;
  fetchMovie: (mode?: MovieMode) => void;
  handleGuess: () => void;
}

const C = {
  stage:     '#0d0c0a',
  surface:   '#16140f',
  surface2:  '#1d1a13',
  line:      '#2a2620',
  text:      '#f5efe1',
  textDim:   '#a39c89',
  textFaint: '#6e6757',
  amber:     '#f0b945',
  amberDim:  '#a37926',
  cherry:    '#d35640',
  good:      '#8db96b',
};

const FONT_DISPLAY = "'Anton', 'Arial Narrow', sans-serif";
const FONT_BODY    = "system-ui, sans-serif";
const FONT_MONO    = "'JetBrains Mono', monospace";

const GRAIN_BG = `radial-gradient(1200px 600px at 30% 0%, rgba(240,185,69,0.06), transparent 60%), radial-gradient(800px 400px at 80% 100%, rgba(211,86,64,0.04), transparent 60%)`;

function Ticks({ count = 21 }: { count?: number }) {
  return (
    <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: 1,
          height: i % 2 === 0 ? 18 : 10,
          background: i % 2 === 0 ? C.textFaint : C.line,
        }} />
      ))}
    </div>
  );
}

export default function PlayLateShow({ movie, loading, userRating, setUserRating, result, showResult, error, movieMode, setMovieMode, fetchMovie, handleGuess }: PlayViewProps) {
  const pct = userRating / 10;
  const scoreLabel = (s: number) => s >= 80 ? 'Critico esperto' : s >= 60 ? 'Buona intuizione' : s >= 40 ? 'Ci hai provato' : 'Occhio al dettaglio';

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: C.stage,
      backgroundImage: GRAIN_BG,
      color: C.text,
      fontFamily: FONT_BODY,
      position: 'relative',
    }}>
      {/* grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        mixBlendMode: 'overlay', opacity: 0.06, zIndex: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '36px 40px 48px' }}>

        {error && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            background: 'rgba(211,86,64,0.12)', border: '1px solid ' + C.cherry,
            color: C.cherry, fontFamily: FONT_MONO, fontSize: 13, letterSpacing: 0.5,
          }}>
            {error}
          </div>
        )}

        {/* ── START SCREEN ── */}
        {!movie && !loading && !showResult && (
          <div style={{
            maxWidth: 520, margin: '0 auto',
            background: C.surface, border: '1px solid ' + C.line,
            padding: 48, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 24px',
              background: C.amber, color: C.stage,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_DISPLAY, fontSize: 42, fontWeight: 900,
              boxShadow: '0 0 40px rgba(240,185,69,0.30)',
            }}>F</div>

            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 52, textTransform: 'uppercase',
              letterSpacing: 0, lineHeight: 0.95, color: C.text, margin: '0 0 12px',
            }}>
              Pronto a<br/>giocare?
            </h2>
            <p style={{ fontSize: 14, color: C.textDim, marginBottom: 32, lineHeight: 1.6 }}>
              Ti mostreremo un film: indovina il voto TMDB con più precisione possibile.
            </p>

            {/* mode toggle */}
            <div style={{ display: 'flex', border: '1px solid ' + C.line, marginBottom: 12 }}>
              {(['popular', 'any'] as MovieMode[]).map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMovieMode(m)}
                  style={{
                    flex: 1, padding: '12px 16px', border: 0,
                    borderLeft: i === 1 ? '1px solid ' + C.line : '0',
                    background: movieMode === m ? C.amber : C.surface2,
                    color: movieMode === m ? C.stage : C.textDim,
                    fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 1,
                    textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {m === 'popular' ? '🔥 Film famosi' : '🎲 Casuali'}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textFaint, letterSpacing: 1, marginBottom: 32 }}>
              {movieMode === 'popular'
                ? 'Film con almeno 1 000 voti — facilmente riconoscibili'
                : 'Qualsiasi film dal catalogo TMDB — potrebbe essere oscuro'}
            </p>

            <button
              onClick={() => fetchMovie()}
              style={{
                width: '100%', padding: '18px 24px',
                background: C.amber, color: C.stage, border: 0,
                fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 1.5,
                textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              ▶ Inizia
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && !showResult && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <div style={{
              width: 48, height: 48,
              border: `4px solid ${C.line}`,
              borderTopColor: C.amber,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── PLAYING ── */}
        {movie && !showResult && !loading && (
          <div style={{ display: 'flex', gap: 44 }}>
            {/* LEFT — poster */}
            <div style={{ width: 340, flexShrink: 0 }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2,
                color: C.textFaint, marginBottom: 10,
              }}>● REC · INDOVINA IL VOTO</div>

              <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: C.surface2, border: '1px solid ' + C.line, overflow: 'hidden' }}>
                {movie.poster ? (
                  <img src={movie.poster} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textFaint, fontSize: 48 }}>🎬</div>
                )}
                {/* spotlight */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'radial-gradient(ellipse at 30% 10%, rgba(240,185,69,0.16), transparent 55%)',
                }} />
                {/* ticket stub badge */}
                <div style={{
                  position: 'absolute', top: 14, left: 14,
                  background: C.amber, color: C.stage,
                  padding: '4px 10px', fontFamily: FONT_MONO,
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                }}>TMDB</div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: FONT_MONO, fontSize: 10, color: C.textFaint,
                letterSpacing: 1.5, marginTop: 10,
              }}>
                <span>ID {movie.id}</span>
              </div>
            </div>

            {/* RIGHT — title + rating */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 2,
                color: C.amber, marginBottom: 14,
              }}>INDOVINA IL VOTO</div>

              <h1 style={{
                margin: 0,
                fontFamily: FONT_DISPLAY, textTransform: 'uppercase',
                fontSize: Math.max(42, Math.min(86, 86 - Math.max(0, movie.title.length - 20) * 1.2)),
                lineHeight: 0.92, letterSpacing: -1,
                color: C.text,
              }}>
                {movie.title}
              </h1>

              <p style={{
                fontSize: 15, color: C.textDim, lineHeight: 1.65, margin: '24px 0 0',
                maxWidth: 520,
                overflow: 'hidden',
              }}>
                {movie.overview}
              </p>

              {/* rating block */}
              <div style={{ marginTop: 'auto', paddingTop: 32 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  marginBottom: 14,
                }}>
                  <div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2, color: C.textFaint, marginBottom: 6 }}>
                      IL TUO VOTO
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 96, lineHeight: 0.85,
                        color: C.amber, letterSpacing: -2,
                      }}>{userRating.toFixed(1)}</span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.textFaint }}>/10</span>
                    </div>
                  </div>
                  <button
                    onClick={handleGuess}
                    disabled={loading}
                    style={{
                      background: C.amber, color: C.stage, border: 0,
                      padding: '18px 28px', fontFamily: FONT_DISPLAY, fontSize: 22,
                      letterSpacing: 1.2, textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    Conferma ›
                  </button>
                </div>

                {/* tuner slider */}
                <div style={{ position: 'relative', height: 44, marginBottom: 6 }}>
                  {/* track */}
                  <div style={{
                    position: 'absolute', top: 18, left: 0, right: 0, height: 8,
                    background: C.surface2, border: '1px solid ' + C.line,
                  }} />
                  <Ticks />
                  {/* fill */}
                  <div style={{
                    position: 'absolute', top: 18, left: 0,
                    width: `${pct * 100}%`, height: 8,
                    background: `linear-gradient(90deg, ${C.amberDim}, ${C.amber})`,
                    transition: 'width .05s',
                  }} />
                  {/* thumb */}
                  <div style={{
                    position: 'absolute', top: 6,
                    left: `calc(${pct * 100}% - 12px)`,
                    width: 24, height: 32, background: C.amber,
                    boxShadow: `0 0 0 1px ${C.stage}, 0 0 18px rgba(240,185,69,0.5)`,
                    pointerEvents: 'none', transition: 'left .05s',
                  }} />
                  {/* transparent interactive input */}
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

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5,
                  color: C.textFaint,
                }}>
                  <span>0.0 · BOMBA</span><span>5.0</span><span>10.0 · CAPOLAVORO</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {showResult && result && movie && (
          <div style={{ display: 'flex', gap: 44 }}>
            {/* LEFT — big score */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
              borderRight: '1px dashed ' + C.line, paddingRight: 44,
            }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 2,
                color: C.amber, marginBottom: 8,
              }}>VERDETTO</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 240, lineHeight: 0.82,
                  color: result.score >= 60 ? C.amber : C.cherry,
                  letterSpacing: -6,
                }}>{result.score}</span>
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 16, color: C.textFaint,
                  marginTop: 16,
                }}>/100</span>
              </div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 36, letterSpacing: 0.5,
                textTransform: 'uppercase', color: C.text, marginTop: 8,
              }}>
                {scoreLabel(result.score)}
              </div>
              <p style={{
                fontSize: 14, color: C.textDim, maxWidth: 360, marginTop: 14, lineHeight: 1.6,
              }}>
                Differenza di <span style={{ color: C.amber }}>{result.diff.toFixed(1)}</span> punti dal voto reale{' '}
                <span style={{ color: C.amber, fontFamily: FONT_MONO }}>{result.realRating.toFixed(1)}</span>.
              </p>
            </div>

            {/* RIGHT — ticket stub */}
            <div style={{ width: 440, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
              {/* ticket */}
              <div style={{
                background: C.surface, border: '1px solid ' + C.line,
                padding: 24, position: 'relative',
              }}>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2,
                  color: C.textFaint, marginBottom: 14,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>● BIGLIETTO</span>
                  <span>TMDB ID {movie.id}</span>
                </div>
                <div style={{
                  fontFamily: FONT_DISPLAY, textTransform: 'uppercase',
                  fontSize: 28, letterSpacing: -0.5, lineHeight: 1, color: C.text,
                }}>
                  {movie.title}
                </div>
                <div style={{
                  marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
                }}>
                  {[
                    { k: 'IL TUO', v: result.game.userRating.toFixed(1), c: C.text },
                    { k: 'REALE',  v: result.realRating.toFixed(1),       c: C.amber },
                    { k: 'DELTA',  v: result.diff.toFixed(1),              c: result.diff <= 0.5 ? C.good : C.cherry },
                  ].map((s) => (
                    <div key={s.k} style={{ borderTop: '1px solid ' + C.line, paddingTop: 10 }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5, color: C.textFaint }}>{s.k}</div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 42, lineHeight: 1, color: s.c, marginTop: 2 }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                {/* perforation line */}
                <div style={{
                  position: 'absolute', left: -7, right: -7, top: '55%',
                  borderTop: '1px dashed ' + C.line, pointerEvents: 'none',
                }} />
                {[-1, 1].map((s, i) => (
                  <div key={i} style={{
                    position: 'absolute', top: '55%', marginTop: -7,
                    [s < 0 ? 'left' : 'right']: -7,
                    width: 14, height: 14, borderRadius: '50%',
                    background: C.stage, border: '1px solid ' + C.line,
                  }} />
                ))}
              </div>

              {/* next button */}
              <button
                onClick={() => fetchMovie()}
                style={{
                  background: 'transparent', color: C.text,
                  border: '1px solid ' + C.line,
                  padding: '18px 24px', fontFamily: FONT_DISPLAY, fontSize: 22,
                  letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'border-color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.amber)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.line)}
              >
                <span>Prossimo film</span>
                <span>›</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

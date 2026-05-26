import type { CSSProperties, ReactNode } from 'react';
import type { PlayViewProps } from './PlayLateShow';

const C = {
  stage:    '#08090c',
  surface:  '#0f1116',
  surface2: '#161922',
  surfaceHi:'#1d2230',
  border:   '#1f2532',
  borderHi: '#2a3344',
  text:     '#e3eaf5',
  textMuted:'#7a8395',
  textDim:  '#4a5161',
  cyan:     '#00e6c0',
  cyanDim:  '#00a98a',
  magenta:  '#ff3d8b',
  yellow:   '#ffd93d',
  good:     '#73ff5f',
};

const FONT_DISPLAY = "'Saira Condensed', 'Impact', sans-serif";
const FONT_BODY    = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO    = "'JetBrains Mono', monospace";

const cutCorners = (s = 12) =>
  `polygon(0 ${s}px, ${s}px 0, calc(100% - ${s}px) 0, 100% ${s}px, 100% calc(100% - ${s}px), calc(100% - ${s}px) 100%, ${s}px 100%, 0 calc(100% - ${s}px))`;

function Telem({ children, color, size = 10 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <span style={{
      fontFamily: FONT_MONO, fontSize: size, fontWeight: 500,
      letterSpacing: 2, textTransform: 'uppercase',
      color: color ?? C.textMuted,
    }}>{children}</span>
  );
}

function HudBrackets({ color = C.cyan, inset = 6, size = 16 }: { color?: string; inset?: number; size?: number }) {
  const arm = `${size}px`;
  const stroke = 2;
  const base: CSSProperties = { position: 'absolute', background: color, boxShadow: `0 0 8px ${color}` };
  return (
    <>
      {/* TL */}
      <span style={{ ...base, top: inset, left: inset, height: stroke, width: arm }} />
      <span style={{ ...base, top: inset, left: inset, width: stroke, height: arm }} />
      {/* TR */}
      <span style={{ ...base, top: inset, right: inset, height: stroke, width: arm }} />
      <span style={{ ...base, top: inset, right: inset, width: stroke, height: arm }} />
      {/* BL */}
      <span style={{ ...base, bottom: inset, left: inset, height: stroke, width: arm }} />
      <span style={{ ...base, bottom: inset, left: inset, width: stroke, height: arm }} />
      {/* BR */}
      <span style={{ ...base, bottom: inset, right: inset, height: stroke, width: arm }} />
      <span style={{ ...base, bottom: inset, right: inset, width: stroke, height: arm }} />
    </>
  );
}

function HudPanel({ children, accent, glow, style }: { children: ReactNode; accent?: string; glow?: boolean; style?: CSSProperties }) {
  const a = accent ?? C.cyan;
  return (
    <div style={{
      position: 'relative',
      background: C.surface,
      clipPath: cutCorners(12),
      ...style,
    }}>
      {/* border gradient */}
      <div style={{
        position: 'absolute', inset: 0, padding: 1, pointerEvents: 'none',
        background: `linear-gradient(135deg, ${a}, transparent 30%, transparent 70%, ${a})`,
        clipPath: cutCorners(12),
      }} />
      {glow && (
        <div style={{
          position: 'absolute', inset: -2, pointerEvents: 'none',
          boxShadow: `0 0 24px ${a}40`, clipPath: cutCorners(13),
        }} />
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

export default function PlayOverride({ movie, loading, userRating, setUserRating, result, showResult, error, movieMode, setMovieMode, fetchMovie, handleGuess }: PlayViewProps) {
  const pct = userRating / 10;
  const scoreLabel = (s: number) => s >= 80 ? 'MISSION COMPLETE' : s >= 60 ? 'GOOD ESTIMATE' : s >= 40 ? 'PARTIAL HIT' : 'TARGET MISSED';

  const EQ_BARS = 41;

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      background: C.stage,
      color: C.text,
      fontFamily: FONT_BODY,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* scanlines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,230,192,0.025) 0px 1px, transparent 1px 3px)',
      }} />
      {/* cyan glow blob */}
      <div style={{
        position: 'fixed', top: '10%', left: '55%', width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(0,230,192,0.08), transparent 60%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '32px 40px 48px' }}>

        {error && (
          <div style={{
            marginBottom: 20, padding: '10px 14px',
            background: `${C.magenta}20`, color: C.magenta,
            fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5,
            clipPath: cutCorners(6),
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── START SCREEN ── */}
        {!movie && !loading && !showResult && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            {/* status strip */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 12px', background: C.surface,
              clipPath: cutCorners(6), marginBottom: 22,
            }}>
              <Telem color={C.cyan}>● UPLINK_READY</Telem>
              <Telem color={C.textDim}>FRG · v2.4</Telem>
            </div>

            <div style={{
              fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 64,
              lineHeight: 0.9, letterSpacing: -1, textTransform: 'uppercase', color: C.text,
              marginBottom: 6,
            }}>
              FILM<br/>
              <span style={{ color: C.cyan, textShadow: `0 0 18px ${C.cyan}88` }}>RATING_</span>
            </div>
            <Telem color={C.textDim}>INDOVINA IL VOTO · INIZIA UN NUOVO RUN</Telem>

            <HudPanel accent={C.cyan} glow style={{ marginTop: 28, padding: 28, background: C.surface2 }}>
              {/* mode */}
              <div style={{ marginBottom: 20 }}>
                <Telem color={C.cyan}>▸ FILM.mode</Telem>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {(['popular', 'any'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMovieMode(m)}
                      style={{
                        flex: 1, padding: '10px 12px', border: 0,
                        background: movieMode === m ? C.cyan : C.border,
                        color: movieMode === m ? C.stage : C.textMuted,
                        fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                        clipPath: cutCorners(5), cursor: 'pointer', transition: 'all .15s',
                        ...(movieMode === m ? { boxShadow: `0 0 12px ${C.cyan}66` } : {}),
                      }}
                    >
                      {m === 'popular' ? 'POPULAR' : 'RANDOM'}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontFamily: FONT_MONO, fontSize: 10, color: C.textDim }}>
                  {movieMode === 'popular' ? '≥ 1 000 VOTI · ALTA RICOGNIZIONE' : 'CATALOGO COMPLETO · ALTO RISCHIO'}
                </div>
              </div>

              <button
                onClick={() => fetchMovie()}
                style={{
                  width: '100%', padding: '14px 18px',
                  background: C.cyan, color: C.stage, border: 0,
                  clipPath: cutCorners(8),
                  fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700,
                  letterSpacing: 2, textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  cursor: 'pointer',
                  boxShadow: `0 0 18px ${C.cyan}55`,
                }}
              >
                ▶ ENGAGE
              </button>
            </HudPanel>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && !showResult && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <div style={{
              width: 48, height: 48,
              border: `3px solid ${C.border}`,
              borderTopColor: C.cyan,
              borderRadius: '50%',
              animation: 'ospin 0.7s linear infinite',
              boxShadow: `0 0 16px ${C.cyan}44`,
            }} />
            <style>{`@keyframes ospin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── PLAYING ── */}
        {movie && !showResult && !loading && (
          <div style={{ display: 'flex', gap: 36 }}>
            {/* LEFT — poster with HUD frame */}
            <div style={{ width: 300, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Telem color={C.cyan}>▸ TARGET·ACQUIRED</Telem>
              </div>
              <div style={{
                position: 'relative', width: '100%', aspectRatio: '2/3',
                background: C.surface, clipPath: cutCorners(14), overflow: 'hidden',
              }}>
                {movie.poster ? (
                  <img src={movie.poster} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎬</div>
                )}
                {/* HUD tint */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `linear-gradient(135deg, rgba(0,230,192,0.06) 0%, transparent 50%, rgba(0,230,192,0.12) 100%)`,
                }} />
                <HudBrackets color={C.cyan} size={16} inset={6} />
                {/* crosshair */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 36, height: 36, pointerEvents: 'none',
                }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: C.cyan, boxShadow: `0 0 4px ${C.cyan}` }} />
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.cyan, boxShadow: `0 0 4px ${C.cyan}` }} />
                  <div style={{ position: 'absolute', inset: 8, border: `1px solid ${C.cyan}`, borderRadius: '50%' }} />
                </div>
                {/* meta strip */}
                <div style={{
                  position: 'absolute', left: 8, right: 8, bottom: 8,
                  background: 'rgba(8,9,12,0.85)', padding: '6px 10px',
                  clipPath: cutCorners(6),
                  fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>ID:{movie.id}</span>
                  <span>TMDB</span>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <Telem size={10} color={C.textDim}>FILM LOADED</Telem>
              </div>
            </div>

            {/* RIGHT — info + rating console */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Telem color={C.cyan}>▸ SCAN().title</Telem>
              <h1 style={{
                margin: '8px 0 0',
                fontFamily: FONT_DISPLAY, fontWeight: 800,
                fontSize: Math.max(40, Math.min(80, 80 - Math.max(0, movie.title.length - 16) * 1.2)),
                lineHeight: 0.9, letterSpacing: -1, textTransform: 'uppercase', color: C.text,
                textShadow: `0 0 24px ${C.cyan}30`,
              }}>
                {movie.title.split(' ').slice(0, -1).join(' ')}{' '}
                {movie.title.split(' ').length > 1 && (
                  <span style={{ color: C.cyan, textShadow: `0 0 18px ${C.cyan}88` }}>
                    {movie.title.split(' ').slice(-1)[0]}_
                  </span>
                )}
              </h1>

              <p style={{
                margin: '18px 0 0', fontSize: 14, lineHeight: 1.6, color: C.textMuted, maxWidth: 520,
                overflow: 'hidden',
              }}>
                {movie.overview}
              </p>

              {/* rating console */}
              <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                <HudPanel accent={C.cyan} glow style={{ padding: 24, background: C.surface2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Telem color={C.cyan}>▸ RATING.input</Telem>
                    <Telem color={C.textDim}>AWAITING_LOCK</Telem>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontWeight: 800,
                        fontSize: 88, lineHeight: 0.86, letterSpacing: -1,
                        color: C.cyan,
                        textShadow: `0 0 16px ${C.cyan}99, 0 0 32px ${C.cyan}55`,
                        transition: 'text-shadow .1s',
                      }}>{userRating.toFixed(1)}</span>
                      <Telem color={C.textDim} size={12}>/ 10.0</Telem>
                    </div>
                    <button
                      onClick={handleGuess}
                      disabled={loading}
                      style={{
                        background: C.cyan, color: C.stage, border: 0,
                        padding: '14px 24px', clipPath: cutCorners(8),
                        fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700,
                        letterSpacing: 2, textTransform: 'uppercase',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: `0 0 20px ${C.cyan}66`,
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      LOCK_IN ›
                    </button>
                  </div>

                  {/* EQ-bar slider */}
                  <div style={{ marginTop: 18, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, pointerEvents: 'none' }}>
                      {Array.from({ length: EQ_BARS }).map((_, i) => {
                        const barPct = i / (EQ_BARS - 1);
                        const filled = barPct <= pct;
                        const h = 10 + Math.abs(Math.sin(i * 0.7)) * 18;
                        return (
                          <div key={i} style={{
                            flex: 1, height: h,
                            background: filled ? C.cyan : C.border,
                            boxShadow: filled ? `0 0 4px ${C.cyan}` : 'none',
                            transition: 'background .05s',
                          }} />
                        );
                      })}
                    </div>
                    {/* transparent input overlay */}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <Telem size={9} color={C.textDim}>0.0 · MIN</Telem>
                    <Telem size={9} color={C.textDim}>5.0 · MID</Telem>
                    <Telem size={9} color={C.textDim}>10.0 · MAX</Telem>
                  </div>
                </HudPanel>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {showResult && result && movie && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 32, alignItems: 'center' }}>
            {/* LEFT — huge score */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ width: 32, height: 1, background: C.cyan, boxShadow: `0 0 4px ${C.cyan}` }} />
                <Telem color={C.cyan}>▸ MISSION_RESULT</Telem>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 800,
                  fontSize: 240, lineHeight: 0.82, letterSpacing: -6,
                  color: result.score >= 60 ? C.cyan : C.magenta,
                  textShadow: result.score >= 60
                    ? `0 0 16px ${C.cyan}99, 0 0 32px ${C.cyan}55`
                    : `0 0 16px ${C.magenta}99, 0 0 32px ${C.magenta}55`,
                }}>{result.score}</span>
                <div style={{ marginTop: 24 }}>
                  <Telem color={C.textDim}>SCORE</Telem>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.text, marginTop: 4 }}>/ 100</div>
                  <div style={{
                    marginTop: 12, padding: '4px 8px',
                    background: `${C.good}22`, color: C.good,
                    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5,
                    clipPath: cutCorners(4),
                  }}>+ {result.score} XP</div>
                </div>
              </div>
              <h2 style={{
                margin: '4px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 800,
                fontSize: 44, lineHeight: 1, letterSpacing: -0.5, textTransform: 'uppercase',
                color: C.text,
              }}>
                {scoreLabel(result.score).split(' ')[0]}{' '}
                <span style={{
                  color: result.score >= 60 ? C.cyan : C.magenta,
                  textShadow: result.score >= 60 ? `0 0 16px ${C.cyan}88` : `0 0 16px ${C.magenta}88`,
                }}>
                  {scoreLabel(result.score).split(' ').slice(1).join(' ')}
                </span>
              </h2>
              <p style={{ maxWidth: 440, marginTop: 14, fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>
                Δ = {result.diff.toFixed(1)} · {result.diff <= 0.5 ? 'Precision EXPERT · Target tolerance nominal.' : result.diff <= 1 ? 'Close call · Review target data.' : 'Large deviation · Recalibrate sensors.'}
              </p>
            </div>

            {/* RIGHT — telemetry panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <HudPanel accent={C.cyan} style={{ padding: 20, background: C.surface }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Telem color={C.cyan}>▸ TELEMETRY</Telem>
                </div>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24,
                  textTransform: 'uppercase', letterSpacing: -0.5,
                }}>
                  {movie.title}
                </div>
                <div style={{ marginTop: 4 }}>
                  <Telem color={C.textDim}>ID: {movie.id}</Telem>
                </div>

                {/* 3-stat readout */}
                <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { k: 'YOUR', v: result.game.userRating.toFixed(1), c: C.text },
                    { k: 'REAL', v: result.realRating.toFixed(1),      c: C.cyan },
                    { k: 'DELTA',v: result.diff.toFixed(1),            c: C.good },
                  ].map((s, i) => (
                    <div key={s.k} style={{
                      background: C.stage, padding: '12px 10px',
                      clipPath: cutCorners(6),
                      borderTop: i === 1 ? `1px solid ${C.cyan}` : `1px solid ${C.border}`,
                    }}>
                      <Telem color={C.textDim} size={9}>{s.k}</Telem>
                      <div style={{
                        fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 34,
                        color: s.c, marginTop: 2, lineHeight: 1, letterSpacing: -1,
                        textShadow: s.c === C.cyan ? `0 0 10px ${C.cyan}88` : 'none',
                      }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </HudPanel>

              <button
                onClick={() => fetchMovie()}
                style={{
                  background: C.cyan, color: C.stage, border: 0,
                  padding: '16px 20px', clipPath: cutCorners(10),
                  fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700,
                  letterSpacing: 2, textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: `0 0 24px ${C.cyan}66`,
                  cursor: 'pointer',
                }}
              >
                <span>ENGAGE // NEXT</span><span>›</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

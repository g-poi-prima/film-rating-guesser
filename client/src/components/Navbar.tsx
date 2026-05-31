import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, type AppTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useMatch } from '../context/MatchContext';
import { useFriends } from '../context/FriendsContext';
import {
  Film,
  Trophy,
  History,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Swords,
  MessageCircle,
  Users,
  UserCheck,
  Palette,
  Check,
  Scale,
} from 'lucide-react';
import { useState, useEffect, useRef, type RefObject } from 'react';

const links = [
  { to: '/', label: 'Gioca', icon: Film },
  { to: '/higher-lower', label: 'H/L', icon: Scale },
  { to: '/match', label: '1v1', icon: Swords },
  { to: '/lobbies', label: 'Lobby', icon: Users },
  { to: '/friends', label: 'Amici', icon: UserCheck },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/ranking', label: 'Classifica', icon: Trophy },
  { to: '/history', label: 'Storico', icon: History },
  { to: '/profile', label: 'Profilo', icon: User },
];

const THEMES: { id: AppTheme; label: string; desc: string; dot: string }[] = [
  { id: 'studio-light', label: 'Studio Chiaro', desc: 'Default',          dot: '#6366f1' },
  { id: 'studio-dark',  label: 'Studio Scuro',  desc: 'Default scuro',    dot: '#818cf8' },
  { id: 'late-show',    label: 'Late Show',     desc: 'Cinema dorato',    dot: '#f0b945' },
  { id: 'verita',       label: 'Verità',        desc: 'Editoriale',       dot: '#c5392b' },
  { id: 'override',     label: 'Override',      desc: 'HUD futuristico',  dot: '#00e6c0' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared props for all themed navbars
// ─────────────────────────────────────────────────────────────────────────────
interface NavProps {
  user: { username: string; role: string } | null;
  logout: () => void;
  pathname: string;
  onlineCount: number;
  pendingCount: number;
  showMatchBanner: boolean;
  phase: string;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  pickerRef: RefObject<HTMLDivElement | null>;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  currentThemeDot: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LATE SHOW navbar
// ─────────────────────────────────────────────────────────────────────────────
const LA = {
  stage:    '#0d0c0a',
  line:     '#2a2620',
  text:     '#f5efe1',
  textDim:  '#a39c89',
  textFaint:'#6e6757',
  amber:    '#f0b945',
};

function NavLateShow({ user, logout, pathname, onlineCount, pendingCount, showMatchBanner, phase, pickerOpen, setPickerOpen, pickerRef, theme, setTheme }: NavProps) {
  const cutCorners = (s = 6) =>
    `polygon(0 ${s}px, ${s}px 0, calc(100% - ${s}px) 0, 100% ${s}px, 100% calc(100% - ${s}px), calc(100% - ${s}px) 100%, ${s}px 100%, 0 calc(100% - ${s}px))`;

  return (
    <nav style={{ background: LA.stage, borderBottom: '1px solid ' + LA.line, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 28, height: 64 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{
            width: 28, height: 28,
            background: LA.amber, color: LA.stage,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Anton', sans-serif", fontSize: 18, fontWeight: 900,
          }}>F</span>
          <span style={{
            fontFamily: "'Anton', sans-serif", fontSize: 20, letterSpacing: 1.5,
            color: LA.text, textTransform: 'uppercase',
          }}>
            FilmRating<span style={{ color: LA.amber }}>Guessr</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: 0, flex: 1 }}>
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link key={l.to} to={l.to} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px',
                height: 64, fontFamily: 'system-ui', fontSize: 13, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: 0.3, textDecoration: 'none',
                color: active ? LA.amber : LA.textDim,
                borderBottom: active ? '2px solid ' + LA.amber : '2px solid transparent',
                position: 'relative',
                transition: 'color .15s',
              }}>
                <l.icon size={14} />
                {l.label}
                {l.to === '/chat' && onlineCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 12, right: 6,
                    width: 16, height: 16, borderRadius: '50%', background: '#22c55e',
                    color: 'white', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{onlineCount > 9 ? '9+' : onlineCount}</span>
                )}
                {l.to === '/friends' && pendingCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 12, right: 6,
                    width: 16, height: 16, borderRadius: '50%', background: '#ef4444',
                    color: 'white', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{pendingCount > 9 ? '9+' : pendingCount}</span>
                )}
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px',
              height: 64, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', textDecoration: 'none',
              color: pathname === '/admin' ? LA.amber : LA.textDim,
              borderBottom: pathname === '/admin' ? '2px solid ' + LA.amber : '2px solid transparent',
            }}>
              <Shield size={14} /> Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme picker */}
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
              onClick={() => setPickerOpen(v => !v)}
              style={{
                padding: '6px 10px', background: 'transparent', border: '1px solid ' + LA.line,
                color: LA.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                clipPath: cutCorners(5),
              }}
              title="Cambia tema"
            >
              <Palette size={16} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: THEMES.find(t => t.id === theme)?.dot ?? LA.amber, flexShrink: 0 }} />
            </button>
            {pickerOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
                background: LA.stage, border: '1px solid ' + LA.line,
                minWidth: 200,
              }}>
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => { setTheme(t.id); setPickerOpen(false); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', border: 0, background: theme === t.id ? 'rgba(240,185,69,0.1)' : 'transparent',
                    color: theme === t.id ? LA.amber : LA.textDim, cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'system-ui', fontSize: 13, borderBottom: '1px solid ' + LA.line,
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.dot, flexShrink: 0, boxShadow: `0 0 6px ${t.dot}88` }} />
                    <span style={{ flex: 1 }}>
                      {t.label}
                      <span style={{ display: 'block', fontSize: 10, opacity: 0.6 }}>{t.desc}</span>
                    </span>
                    {theme === t.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user && (
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', background: 'transparent', border: '1px solid ' + LA.line,
              color: LA.textDim, cursor: 'pointer', fontSize: 13, textTransform: 'uppercase',
              fontWeight: 500, clipPath: cutCorners(5),
            }}>
              <LogOut size={14} /> Esci
            </button>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setOpen(!open)} style={{
            display: 'none', padding: 8, background: 'transparent', border: 0,
            color: LA.textDim, cursor: 'pointer',
          }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Match banner */}
      {showMatchBanner && (
        <div style={{
          background: 'rgba(240,185,69,0.1)', borderTop: '1px solid rgba(240,185,69,0.2)',
          padding: '6px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, background: LA.amber, borderRadius: '50%', boxShadow: '0 0 6px ' + LA.amber }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: LA.amber, letterSpacing: 1.5 }}>
              {phase === 'queuing' ? 'IN CODA…' : 'PARTITA IN CORSO'}
            </span>
          </div>
          <Link to="/match" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: LA.amber, textDecoration: 'none', letterSpacing: 1 }}>
            TORNA ALLA PARTITA →
          </Link>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CINEMA VERITÀ navbar — editorial two-row masthead
// ─────────────────────────────────────────────────────────────────────────────
const VB = {
  paper: '#f3eee2',
  line:  '#d8d0bd',
  ink:   '#1a1815',
  muted: '#6f6a5b',
  cherry:'#c5392b',
};

function NavVerita({ user, logout, pathname, onlineCount, pendingCount, showMatchBanner, phase, pickerOpen, setPickerOpen, pickerRef, theme, setTheme }: NavProps) {
  return (
    <nav style={{ background: VB.paper, borderBottom: '1px solid ' + VB.line, position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Row 1 — masthead */}
      <div style={{ padding: '12px 32px 0', borderBottom: '1px solid ' + VB.line }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: VB.ink, lineHeight: 1, letterSpacing: -0.5 }}>
              Film<span style={{ color: VB.cherry, fontStyle: 'italic' }}>Rating</span>Guessr
            </span>
          </Link>
          <div style={{
            marginBottom: 3, padding: '2px 8px',
            background: VB.ink, color: VB.paper,
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5,
          }}>GIOCO</div>
          <div style={{ marginLeft: 'auto', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme picker */}
            <div style={{ position: 'relative' }} ref={pickerRef}>
              <button
                onClick={() => setPickerOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', border: '1px solid ' + VB.line,
                  background: 'transparent', color: VB.muted, cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                }}
                title="Cambia tema"
              >
                <Palette size={14} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: THEMES.find(t => t.id === theme)?.dot ?? VB.cherry }} />
              </button>
              {pickerOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
                  background: VB.paper, border: '1px solid ' + VB.line, minWidth: 200,
                  boxShadow: '0 4px 16px rgba(26,24,21,0.1)',
                }}>
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => { setTheme(t.id); setPickerOpen(false); }} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', border: 0,
                      background: theme === t.id ? 'rgba(197,57,43,0.08)' : 'transparent',
                      color: theme === t.id ? VB.cherry : VB.muted, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, textAlign: 'left',
                      borderBottom: '1px solid ' + VB.line,
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>
                        {t.label}
                        <span style={{ display: 'block', fontSize: 10, opacity: 0.6 }}>{t.desc}</span>
                      </span>
                      {theme === t.id && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user && (
              <button onClick={logout} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', border: '1px solid ' + VB.line,
                background: 'transparent', color: VB.muted, cursor: 'pointer',
                fontFamily: "'DM Mono', monospace", fontSize: 11,
              }}>
                <LogOut size={13} /> Esci
              </button>
            )}
          </div>
        </div>

        {/* Row 2 — navigation tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 0, maxWidth: 1200, margin: '0 auto' }}>
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link key={l.to} to={l.to} style={{
                padding: '10px 16px 10px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: 0.3, textDecoration: 'none',
                color: active ? VB.ink : VB.muted,
                borderTop: active ? '3px solid ' + VB.cherry : '3px solid transparent',
                marginTop: -1, position: 'relative',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {l.label}
                {l.to === '/chat' && onlineCount > 0 && (
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#22c55e',
                    color: 'white', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{onlineCount > 9 ? '9+' : onlineCount}</span>
                )}
                {l.to === '/friends' && pendingCount > 0 && (
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', background: VB.cherry,
                    color: 'white', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{pendingCount > 9 ? '9+' : pendingCount}</span>
                )}
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', textDecoration: 'none',
              color: pathname === '/admin' ? VB.ink : VB.muted,
              borderTop: pathname === '/admin' ? '3px solid ' + VB.cherry : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              Admin
            </Link>
          )}
        </div>
      </div>

      {/* Match banner */}
      {showMatchBanner && (
        <div style={{
          background: 'rgba(197,57,43,0.06)', borderBottom: '1px solid rgba(197,57,43,0.2)',
          padding: '6px 32px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: VB.cherry }}>
            {phase === 'queuing' ? '● In coda…' : '● Partita in corso'}
          </span>
          <Link to="/match" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: VB.cherry, textDecoration: 'underline' }}>
            Torna alla partita →
          </Link>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERRIDE navbar — HUD telemetry bar
// ─────────────────────────────────────────────────────────────────────────────
const OV = {
  stage:    '#08090c',
  surface:  '#0f1116',
  border:   '#1f2532',
  text:     '#e3eaf5',
  textMuted:'#7a8395',
  textDim:  '#4a5161',
  cyan:     '#00e6c0',
  yellow:   '#ffd93d',
};

function NavOverride({ user, logout, pathname, onlineCount, pendingCount, showMatchBanner, phase, pickerOpen, setPickerOpen, pickerRef, theme, setTheme }: NavProps) {
  const monoLinks = [
    { to: '/',              label: 'PLAY' },
    { to: '/higher-lower',  label: 'H/L' },
    { to: '/match',         label: '1V1' },
    { to: '/lobbies',  label: 'LOBBY' },
    { to: '/friends',  label: 'SQUAD' },
    { to: '/chat',     label: 'CHAT' },
    { to: '/ranking',  label: 'RANK' },
    { to: '/history',  label: 'LOG' },
    { to: '/profile',  label: 'USER' },
  ];

  return (
    <nav style={{ background: OV.stage, borderBottom: '1px solid ' + OV.border, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20, maxWidth: 1400, margin: '0 auto' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            width: 8, height: 8, background: OV.cyan, borderRadius: 0,
            boxShadow: `0 0 8px ${OV.cyan}, 0 0 16px ${OV.cyan}`,
          }} />
          <span style={{
            fontFamily: "'Saira Condensed', sans-serif", fontSize: 22, fontWeight: 800,
            color: OV.text, letterSpacing: 2, textTransform: 'uppercase',
          }}>
            FRG<span style={{ color: OV.cyan }}>/</span>v2.4
          </span>
        </Link>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: OV.border, flexShrink: 0 }} />

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 0, flex: 1 }}>
          {monoLinks.map((l) => {
            const active = pathname === l.to;
            const chatNotif = l.to === '/chat' && onlineCount > 0;
            const friendNotif = l.to === '/friends' && pendingCount > 0;
            return (
              <Link key={l.to} to={l.to} style={{
                position: 'relative',
                padding: '20px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                fontWeight: 600, letterSpacing: 2,
                color: active ? OV.cyan : OV.textMuted,
                textDecoration: 'none',
              }}>
                {l.label}
                {active && (
                  <span style={{
                    position: 'absolute', left: 8, right: 8, bottom: 0, height: 2,
                    background: OV.cyan, boxShadow: '0 0 8px ' + OV.cyan,
                  }} />
                )}
                {chatNotif && (
                  <span style={{
                    position: 'absolute', top: 10, right: 4,
                    width: 14, height: 14, borderRadius: 0, background: '#22c55e',
                    color: '#000', fontSize: 8, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{onlineCount > 9 ? '9+' : onlineCount}</span>
                )}
                {friendNotif && (
                  <span style={{
                    position: 'absolute', top: 10, right: 4,
                    width: 14, height: 14, borderRadius: 0, background: '#ff3d8b',
                    color: '#000', fontSize: 8, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{pendingCount > 9 ? '9+' : pendingCount}</span>
                )}
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" style={{
              position: 'relative', padding: '20px 14px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: 2,
              color: pathname === '/admin' ? OV.cyan : OV.textMuted, textDecoration: 'none',
            }}>
              ADMIN
              {pathname === '/admin' && (
                <span style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, background: OV.cyan, boxShadow: '0 0 8px ' + OV.cyan }} />
              )}
            </Link>
          )}
        </div>

        {/* Right telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {onlineCount > 0 && (
            <>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: OV.cyan }}>
                ● {onlineCount} ONLINE
              </span>
              <div style={{ width: 1, height: 16, background: OV.border }} />
            </>
          )}
          {user && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: OV.textMuted }}>
              {user.username.toUpperCase()}
            </span>
          )}
          <div style={{ width: 1, height: 16, background: OV.border }} />

          {/* Theme picker */}
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
              onClick={() => setPickerOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', background: OV.surface, border: '1px solid ' + OV.border,
                color: OV.textMuted, cursor: 'pointer',
              }}
              title="Cambia tema"
            >
              <Palette size={14} />
              <span style={{ width: 8, height: 8, background: THEMES.find(t => t.id === theme)?.dot ?? OV.cyan, flexShrink: 0 }} />
            </button>
            {pickerOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
                background: OV.surface, border: '1px solid ' + OV.border, minWidth: 200,
              }}>
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => { setTheme(t.id); setPickerOpen(false); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', border: 0,
                    background: theme === t.id ? 'rgba(0,230,192,0.08)' : 'transparent',
                    color: theme === t.id ? OV.cyan : OV.textMuted, cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1,
                    borderBottom: '1px solid ' + OV.border,
                  }}>
                    <span style={{ width: 10, height: 10, background: t.dot, flexShrink: 0, boxShadow: `0 0 6px ${t.dot}88` }} />
                    <span style={{ flex: 1 }}>
                      {t.label.toUpperCase()}
                      <span style={{ display: 'block', fontSize: 9, opacity: 0.5, textTransform: 'none' }}>{t.desc}</span>
                    </span>
                    {theme === t.id && <Check size={11} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user && (
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: OV.surface, border: '1px solid ' + OV.border,
              color: OV.textMuted, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5,
            }}>
              <LogOut size={13} /> EXIT
            </button>
          )}
        </div>
      </div>

      {/* Match banner */}
      {showMatchBanner && (
        <div style={{
          background: `rgba(0,230,192,0.08)`, borderTop: '1px solid rgba(0,230,192,0.2)',
          padding: '5px 24px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: OV.cyan }}>
            ▸ {phase === 'queuing' ? 'QUEUE_ACTIVE' : 'MATCH_IN_PROGRESS'}
          </span>
          <Link to="/match" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: OV.cyan, textDecoration: 'none' }}>
            RETURN_TO_MATCH →
          </Link>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Navbar — dispatches to themed variants
// ─────────────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { onlineUsers } = useSocket();
  const { phase } = useMatch();
  const { pendingRequests, friendIds } = useFriends();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const onlineCount = onlineUsers.filter((u) => u.id !== user?.id && friendIds.has(u.id)).length;
  const pendingCount = pendingRequests.length;

  const matchActive = phase !== 'idle' && phase !== 'result' && phase !== 'disconnected';
  const showMatchBanner = matchActive && location.pathname !== '/match';

  const currentThemeDot = THEMES.find((t) => t.id === theme)?.dot ?? '#6366f1';

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const navProps: NavProps = {
    user: user ? { username: user.username, role: user.role } : null,
    logout,
    pathname: location.pathname,
    onlineCount,
    pendingCount,
    showMatchBanner,
    phase,
    pickerOpen,
    setPickerOpen,
    pickerRef,
    theme,
    setTheme,
    currentThemeDot,
  };

  // ── Themed navbars ─────────────────────────────────────────────────────────
  if (theme === 'late-show') return <NavLateShow {...navProps} />;
  if (theme === 'verita')    return <NavVerita   {...navProps} />;
  if (theme === 'override')  return <NavOverride  {...navProps} />;

  // ── Default (studio-light / studio-dark) ──────────────────────────────────
  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <Film className="w-6 h-6" />
            <span className="hidden sm:inline">FilmRatingGuessr</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <l.icon className="w-4 h-4" />
                  {l.label}
                  {l.to === '/chat' && onlineCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {onlineCount > 9 ? '9+' : onlineCount}
                    </span>
                  )}
                  {l.to === '/friends' && pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/admin'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Theme picker */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                title="Cambia tema"
              >
                <Palette className="w-5 h-5" />
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: currentThemeDot }}
                />
              </button>

              {pickerOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden min-w-[200px]">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setPickerOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        theme === t.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
                        style={{ background: t.dot, boxShadow: `0 0 6px ${t.dot}88` }}
                      />
                      <span className="flex-1">
                        {t.label}
                        <span className="block text-xs opacity-60 font-normal">{t.desc}</span>
                      </span>
                      {theme === t.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user && (
              <button
                onClick={logout}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Esci
              </button>
            )}

            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Match-in-progress banner */}
      {showMatchBanner && (
        <div className="bg-primary/10 border-t border-primary/20 px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary">
              {phase === 'queuing' ? 'In coda...' : 'Partita in corso'}
            </span>
          </div>
          <Link
            to="/match"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Torna alla partita →
          </Link>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pb-4">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
                {l.to === '/chat' && onlineCount > 0 && (
                  <span className="ml-auto text-xs bg-green-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    {onlineCount > 9 ? '9+' : onlineCount}
                  </span>
                )}
                {l.to === '/friends' && pendingCount > 0 && (
                  <span className="ml-auto text-xs bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
          {user && (
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full mt-1"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

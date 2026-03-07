"use client"

import { useState, useEffect, useRef } from "react"
import { createClient, createAccount } from "genlayer-js"
import { studionet } from "genlayer-js/chains"

// ─── Contract ────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0xf45902f62477E50eC3d2A179163D9c920b85D1A8" as `0x${string}`

// Studionet: no private key needed — SDK auto-generates + funds a test account
const account = createAccount()
const client = createClient({ chain: studionet, account })

// ─── Types ───────────────────────────────────────────────────
interface TownEvent {
  character: string
  statement: string
}
interface StoryEntry {
  day: number
  events: TownEvent[]
}

const CHAR_EMOJI: Record<string, string> = {
  Mayor: "🏛️",
  Journalist: "📰",
  "Conspiracy Guy": "🔍",
  "Police Chief": "👮",
  "Shop Owner": "🛒",
}

// ─── Component ───────────────────────────────────────────────
export default function Home() {
  const [currentDay, setCurrentDay] = useState<number | null>(null)
  const [story, setStory] = useState<StoryEntry | null>(null)
  const [selectedDay, setSelectedDay] = useState(1)
  const [loadingDay, setLoadingDay] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [loadingStory, setLoadingStory] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLog((p) => [`[${time}] ${msg}`, ...p.slice(0, 29)])
  }

  async function fetchDay() {
    setLoadingDay(true)
    setError(null)
    try {
      addLog("Reading get_day()…")
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_day",
        args: [],
      })
      const d = Number(result)
      setCurrentDay(d)
      if (d > 1) setSelectedDay(d - 1)
      addLog(`✅ Current day: ${d}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      addLog("❌ " + msg)
    } finally {
      setLoadingDay(false)
    }
  }

  async function simulateDay() {
    setSimulating(true)
    setError(null)
    setTxHash(null)
    try {
      addLog("Submitting simulate_day() transaction…")
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "simulate_day",
        args: [],
      })
      setTxHash(String(hash))
      addLog(`📤 TX: ${hash}`)
      addLog("⏳ Waiting for AI consensus (~30–90s)…")
      await client.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        status: "FINALIZED",
      })
      addLog("✅ Day simulated successfully!")
      await fetchDay()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      addLog("❌ " + msg)
    } finally {
      setSimulating(false)
    }
  }

  async function loadStory() {
    setLoadingStory(true)
    setError(null)
    setStory(null)
    try {
      addLog(`Reading get_story(${selectedDay})…`)
      const raw = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_story",
        args: [selectedDay],
      })
      if (!raw) {
        addLog(`⚠️ No story for day ${selectedDay} — simulate it first.`)
        return
      }
      const parsed: StoryEntry = typeof raw === "string" ? JSON.parse(raw) : (raw as StoryEntry)
      setStory(parsed)
      addLog(`✅ Loaded story for day ${selectedDay}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      addLog("❌ " + msg)
    } finally {
      setLoadingStory(false)
    }
  }

  useEffect(() => { fetchDay() }, []) // eslint-disable-line

  return (
    <div style={s.page}>

      {/* ── HEADER ── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.pulse} />
          <span style={s.logo}>AI Town</span>
          <span style={s.logoSub}>GenLayer Intelligent Contract</span>
        </div>
        <span style={s.chip}>STUDIONET</span>
      </header>

      <main style={s.main}>

        {/* ── DAY COUNTER ── */}
        <div style={s.card}>
          <div style={s.cardRow}>
            <div>
              <div style={s.fieldLabel}>CURRENT DAY</div>
              <div style={s.dayDisplay}>
                {loadingDay ? "…" : currentDay !== null ? `Day ${currentDay}` : "—"}
              </div>
            </div>
            <div style={s.btnGroup}>
              <button style={s.btnGhost} onClick={fetchDay} disabled={loadingDay}>
                {loadingDay ? "…" : "↻ Refresh"}
              </button>
              <button
                style={{ ...s.btnPrimary, ...(simulating ? s.btnDim : {}) }}
                onClick={simulateDay}
                disabled={simulating}
              >
                {simulating ? "⏳ Simulating…" : "⚡ Simulate Day"}
              </button>
            </div>
          </div>

          {txHash && (
            <div style={s.txRow}>
              <span style={s.txLabel}>TX</span>
              <code style={s.txVal}>{txHash}</code>
            </div>
          )}
          {error && <div style={s.errBox}>⚠️ {error}</div>}
        </div>

        {/* ── STORY READER ── */}
        <div style={s.card}>
          <div style={s.cardRow}>
            <div>
              <div style={s.fieldLabel}>READ STORY FOR DAY</div>
              <div style={s.stepper}>
                <button
                  style={s.stepBtn}
                  onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
                  disabled={selectedDay <= 1}
                >−</button>
                <span style={s.stepVal}>{selectedDay}</span>
                <button
                  style={s.stepBtn}
                  onClick={() => setSelectedDay((d) => d + 1)}
                  disabled={currentDay !== null && selectedDay >= currentDay - 1}
                >+</button>
              </div>
            </div>
            <button style={s.btnPrimary} onClick={loadStory} disabled={loadingStory}>
              {loadingStory ? "Loading…" : "📖 Load Story"}
            </button>
          </div>
        </div>

        {/* ── STORY DISPLAY ── */}
        {story && (
          <div style={s.storyCard}>
            <div style={s.storyHeader}>
              <span style={s.storyDay}>Day {story.day}</span>
              <span style={s.storyTitle}>The Town Chronicle</span>
            </div>
            <div style={s.eventList}>
              {story.events?.map((ev, i) => (
                <div key={i} style={s.eventCard}>
                  <div style={s.evHeader}>
                    <span style={s.evEmoji}>{CHAR_EMOJI[ev.character] ?? "🏘️"}</span>
                    <span style={s.evName}>{ev.character}</span>
                  </div>
                  <p style={s.evText}>"{ev.statement}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONSOLE LOG ── */}
        <div style={s.console}>
          <div style={s.consoleBar}>● CONSOLE</div>
          <div ref={logRef} style={s.consoleBody}>
            {log.length === 0
              ? <span style={s.consoleDim}>Ready.</span>
              : log.map((l, i) => <div key={i} style={s.consoleLine}>{l}</div>)
            }
          </div>
        </div>

      </main>

      <footer style={s.footer}>
        <code style={s.footerCode}>{CONTRACT_ADDRESS}</code>
      </footer>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const FONT = "'IBM Plex Mono', 'Courier New', monospace"

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0c0e14",
    color: "#c8cfe8",
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 28px",
    background: "#0f1118",
    borderBottom: "1px solid #1c2030",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  pulse: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 10px #4ade80aa",
    animation: "none",
  },
  logo: { fontSize: 18, fontWeight: 700, color: "#eef0ff", letterSpacing: "0.04em" },
  logoSub: { fontSize: 11, color: "#3d4460", marginLeft: 2 },
  chip: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    padding: "3px 10px",
    border: "1px solid #252d50",
    borderRadius: 4,
    color: "#4a5580",
    background: "#12152a",
  },
  main: {
    flex: 1,
    maxWidth: 800,
    width: "100%",
    margin: "0 auto",
    padding: "28px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  card: {
    background: "#111420",
    border: "1px solid #1c2030",
    borderRadius: 10,
    padding: "20px 22px",
  },
  cardRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
  },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: "0.12em",
    color: "#3d4460",
    marginBottom: 6,
  },
  dayDisplay: {
    fontSize: 32,
    fontWeight: 700,
    color: "#9ba8e8",
    letterSpacing: "-0.01em",
  },
  btnGroup: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnPrimary: {
    background: "linear-gradient(135deg,#4338ca,#6d28d9)",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "10px 20px",
    fontSize: 13,
    fontFamily: FONT,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 14px #4338ca33",
  },
  btnGhost: {
    background: "transparent",
    color: "#5a6480",
    border: "1px solid #1c2030",
    borderRadius: 7,
    padding: "10px 16px",
    fontSize: 13,
    fontFamily: FONT,
    cursor: "pointer",
  },
  btnDim: { opacity: 0.5, cursor: "not-allowed" },
  txRow: {
    marginTop: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "#0c0e16",
    borderRadius: 6,
    padding: "8px 12px",
  },
  txLabel: { fontSize: 10, color: "#3d4460", flexShrink: 0, paddingTop: 2 },
  txVal: { fontSize: 11, color: "#34d399", fontFamily: FONT, wordBreak: "break-all" },
  errBox: {
    marginTop: 12,
    background: "#180e0e",
    border: "1px solid #3d1515",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#f87171",
    fontSize: 12,
    lineHeight: 1.6,
  },
  stepper: { display: "flex", alignItems: "center", gap: 14, marginTop: 4 },
  stepBtn: {
    width: 32,
    height: 32,
    background: "#1a1e30",
    border: "1px solid #252d50",
    borderRadius: 6,
    color: "#7080b0",
    fontSize: 18,
    cursor: "pointer",
    fontFamily: FONT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  stepVal: { fontSize: 28, fontWeight: 700, color: "#9ba8e8", minWidth: 36, textAlign: "center" },
  storyCard: {
    background: "#0d1020",
    border: "1px solid #1e2545",
    borderRadius: 10,
    overflow: "hidden",
  },
  storyHeader: {
    padding: "16px 22px",
    borderBottom: "1px solid #1a2040",
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    background: "#0f1228",
  },
  storyDay: { fontSize: 11, color: "#4a5a90", letterSpacing: "0.1em" },
  storyTitle: { fontSize: 14, fontWeight: 700, color: "#b0b8e8" },
  eventList: {
    padding: "16px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  eventCard: {
    background: "#111828",
    border: "1px solid #1a2240",
    borderRadius: 8,
    padding: "14px 16px",
  },
  evHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  evEmoji: { fontSize: 18 },
  evName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#6d7cc0",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  evText: {
    margin: 0,
    fontSize: 13,
    color: "#8892b8",
    lineHeight: 1.7,
    fontStyle: "italic",
  },
  console: {
    background: "#080a10",
    border: "1px solid #151824",
    borderRadius: 10,
    overflow: "hidden",
  },
  consoleBar: {
    padding: "7px 16px",
    fontSize: 10,
    letterSpacing: "0.1em",
    color: "#2a3050",
    background: "#0b0d18",
    borderBottom: "1px solid #151824",
  },
  consoleBody: {
    padding: "12px 16px",
    maxHeight: 200,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  consoleDim: { fontSize: 12, color: "#1e2540" },
  consoleLine: { fontSize: 12, color: "#4a5880", lineHeight: 1.5 },
  footer: {
    padding: "12px 28px",
    borderTop: "1px solid #151824",
    textAlign: "center",
  },
  footerCode: { fontSize: 10, color: "#2a3050", fontFamily: FONT },
}

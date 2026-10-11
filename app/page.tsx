"use client";

import {
  ArrowDown, ArrowRight, ArrowUp, BookOpen, Brain, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Droplets,
  Dumbbell, Footprints, Heart, Moon, MoreHorizontal, Plus, Salad, Settings2,
  Sunrise, Target, Trash2, Waves, X,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  AppData, DAY_COUNT, DEFAULT_HABITS, DayRecord, EMPTY_DAY, END_DATE, START_DATE,
  challengeDay, clampChallengeDate, dateKey, dateOffset, dayScore, inclusiveDates,
  parseDate, sleepMinutes,
} from "@/lib/winter-arc";

type Page = "Today" | "Calendar" | "Reviews";
type IconComponent = typeof Dumbbell;
const iconOptions: Record<string, IconComponent> = {
  Dumbbell, Footprints, Droplets, Salad, BookOpen, Brain, Sunrise, Moon, Target, Heart, Waves,
};
const initialData: AppData = { habits: DEFAULT_HABITS, records: {}, weeklyReviews: {}, monthlyReviews: {} };
const MONTHS = ["October", "November", "December", "January", "February"];

function getBrowserDate() {
  const today = dateKey(new Date());
  return today < START_DATE ? START_DATE : today > END_DATE ? END_DATE : today;
}
function fmtDate(key: string, options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return parseDate(key).toLocaleDateString("en-US", options);
}
function fmtDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export default function Home() {
  const [data, setData] = useState<AppData>(initialData);
  const [selectedDate, setSelectedDate] = useState(START_DATE);
  const [today, setToday] = useState(START_DATE);
  const [page, setPage] = useState<Page>("Today");
  const [loaded, setLoaded] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [newHabit, setNewHabit] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [reviewMonth, setReviewMonth] = useState("2026-10");
  const [sleepChartMode, setSleepChartMode] = useState<"daily" | "monthly">("daily");

  useEffect(() => {
    const current = getBrowserDate();
    let restored = initialData;
    try {
      const saved = localStorage.getItem("winter-arc-data-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppData>;
        restored = { ...initialData, ...parsed, habits: parsed.habits?.length ? parsed.habits : DEFAULT_HABITS };
      }
    } catch {
      localStorage.removeItem("winter-arc-data-v1");
    }
    startTransition(() => {
      setToday(current);
      setSelectedDate(current);
      setData(restored);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("winter-arc-data-v1", JSON.stringify(data));
  }, [data, loaded]);

  const currentRecord = data.records[selectedDate] ?? EMPTY_DAY;
  const selectedScore = dayScore(currentRecord, data.habits);
  const completedCount = data.habits.filter((habit) => currentRecord.completed?.[habit.id]).length;
  const selectedDay = challengeDay(selectedDate);
  const inFuture = selectedDate > today;
  const allDates = useMemo(() => inclusiveDates(START_DATE, today), [today]);
  const completedDays = allDates.filter((date) => dayScore(data.records[date], data.habits) > 0).length;
  const bestStreak = useMemo(() => {
    let best = 0;
    let current = 0;
    for (const date of allDates) {
      if (dayScore(data.records[date], data.habits) >= 70) {
        current += 1;
        best = Math.max(best, current);
      } else current = 0;
    }
    return best;
  }, [allDates, data.records, data.habits]);
  const streak = useMemo(() => {
    let count = 0;
    for (let date = today; date >= START_DATE; date = dateOffset(date, -1)) {
      if (dayScore(data.records[date], data.habits) >= 70) count += 1;
      else if (date !== today || dayScore(data.records[today], data.habits) < 70) break;
    }
    return count;
  }, [data.records, data.habits, today]);
  const totalSleep = allDates.map((date) => sleepMinutes(data.records[date])).filter(Boolean);
  const averageSleep = totalSleep.length ? Math.round(totalSleep.reduce((sum, mins) => sum + mins, 0) / totalSleep.length) : 0;
  const totalPossible = allDates.length * data.habits.length;
  const totalDone = allDates.reduce((sum, date) => sum + data.habits.filter((habit) => data.records[date]?.completed?.[habit.id]).length, 0);
  const overallScore = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;

  function updateRecord(patch: Partial<(typeof EMPTY_DAY)>) {
    setData((old) => ({
      ...old,
      records: { ...old.records, [selectedDate]: { ...EMPTY_DAY, ...old.records[selectedDate], ...patch } },
    }));
  }
  function toggleHabit(id: string) {
    const completed = { ...currentRecord.completed, [id]: !currentRecord.completed?.[id] };
    updateRecord({ completed });
  }
  function selectDate(date: string) {
    setSelectedDate(clampChallengeDate(date));
    setPage("Today");
  }
  function saveHabitEdit(id: string, name: string) {
    setData((old) => ({ ...old, habits: old.habits.map((habit) => habit.id === id ? { ...habit, name: name.trim() || habit.name } : habit) }));
    setEditingHabit(null);
  }
  function addHabit() {
    const name = newHabit.trim();
    if (!name) return;
    setData((old) => ({ ...old, habits: [...old.habits, { id: `custom-${Date.now()}`, name, icon: "Heart" }] }));
    setNewHabit("");
  }
  function moveHabit(index: number, direction: -1 | 1) {
    setData((old) => {
      const habits = [...old.habits];
      const next = index + direction;
      if (next < 0 || next >= habits.length) return old;
      [habits[index], habits[next]] = [habits[next], habits[index]];
      return { ...old, habits };
    });
  }
  function deleteHabit(id: string) {
    if (!window.confirm("Delete this habit and remove it from your list?")) return;
    setData((old) => ({ ...old, habits: old.habits.filter((habit) => habit.id !== id) }));
  }

  const fullCalendar = page === "Calendar";
  const selectedMonth = parseDate(selectedDate).getMonth();
  const monthFirst = new Date(parseDate(selectedDate).getFullYear(), selectedMonth, 1);
  const monthLength = new Date(parseDate(selectedDate).getFullYear(), selectedMonth + 1, 0).getDate();
  const monthCells = [...Array((monthFirst.getDay() + 6) % 7).fill(null), ...Array.from({ length: monthLength }, (_, day) => day + 1)];
  const activeReview = data.monthlyReviews[reviewMonth] ?? { win: "", lesson: "", improve: "", goal: "" };

  return (
    <main className="app-shell">
      <aside className="side-rail">
        <a className="brand" href="#today" aria-label="Winter Arc home">
          <span className="brand-mark"><Waves size={21} strokeWidth={1.7} /></span>
          <span>WINTER<span className="brand-light">ARC</span><small>DAILY PRACTICE</small></span>
        </a>
        <div className="rail-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {(["Today", "Calendar", "Reviews"] as Page[]).map((item) => {
            const Icon = item === "Today" ? Target : item === "Calendar" ? CalendarDays : BookOpen;
            return <button key={item} onClick={() => setPage(item)} className={page === item ? "nav-item active" : "nav-item"}><Icon size={17} />{item}<span className="nav-indicator" /></button>;
          })}
        </nav>
        <div className="rail-bottom">
          <div className="rail-challenge"><span className="rail-spark">✳</span><div><strong>WINTER ARC</strong><small>OCT 01 — FEB 28</small></div></div>
          <button className="settings-link" onClick={() => setShowSettings(true)}><Settings2 size={17} /> Manage habits</button>
          <div className="storage-note"><span className="storage-dot" /> Saved on this device</div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">WINTER ARC <ChevronRight size={13} /> <span>{page.toUpperCase()}</span></div>
          <div className="top-actions"><span className="season-chip"><span /> 2026—27 SEASON</span><button className="icon-button help-button" title="Your entries are stored in this browser"><CircleHelp size={17} /></button></div>
        </header>

        {page === "Today" && <>
          <section className="hero-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> {inFuture ? "UP NEXT" : selectedDate === today ? "TODAY, IN THE ARC" : "PAST DAY"}</div>
              <h1>{fmtDate(selectedDate, { weekday: "long", month: "long", day: "numeric" })}<span className="title-period">.</span></h1>
              <p className="hero-sub">A small promise, kept today. <span>That’s how the season changes.</span></p>
            </div>
            <div className="day-stamp"><span>CHALLENGE DAY</span><strong>{String(selectedDay).padStart(2, "0")}<i> / 151</i></strong><div className="stamp-rule"><span style={{ width: `${Math.max(1, selectedDay / DAY_COUNT * 100)}%` }} /></div><small>{fmtDate(selectedDate, { month: "short", year: "numeric" }).toUpperCase()}</small></div>
          </section>

          <section className="dashboard-grid">
            <div className="main-column">
              <section className="panel habit-panel">
                <div className="panel-heading"><div><div className="section-kicker">THE DAILY PRACTICE</div><h2>Show up for yourself</h2></div><button className="text-button" onClick={() => setShowSettings(true)}>Edit list <Settings2 size={14} /></button></div>
                <div className="habit-summary"><div className="summary-progress"><div className="progress-track"><span style={{ width: `${selectedScore}%` }} /></div><span className="summary-percent">{selectedScore}%</span></div><span className="summary-count">{completedCount} <span>/ {data.habits.length} complete</span></span></div>
                <div className="habit-list">
                  {data.habits.map((habit, index) => {
                    const Icon = iconOptions[habit.icon] ?? Heart;
                    const done = Boolean(currentRecord.completed?.[habit.id]);
                    return <div key={habit.id} className={`habit-row ${done ? "is-done" : ""}`}>
                      <button className="habit-check" onClick={() => toggleHabit(habit.id)} disabled={inFuture} aria-label={`${done ? "Uncheck" : "Complete"} ${habit.name}`}>{done && <Check size={13} strokeWidth={2.6} />}</button>
                      <span className="habit-icon"><Icon size={17} strokeWidth={1.7} /></span>
                      <span className="habit-name">{habit.name}</span>
                      {done && <span className="done-label">DONE</span>}
                      <span className="habit-number">{String(index + 1).padStart(2, "0")}</span>
                    </div>;
                  })}
                  {!data.habits.length && <div className="empty-habits">A blank slate. Add a habit to begin.</div>}
                </div>
                <div className={`encouragement ${selectedScore === 100 && data.habits.length ? "encouragement-complete" : ""}`}><span className="encouragement-mark">✳</span><span>{selectedScore === 100 && data.habits.length ? "A perfect day. You kept every promise." : completedCount > 0 ? "You showed up. Keep going at your pace." : "No zero days. One small win still counts."}</span><span className="encouragement-note">{inFuture ? "FUTURE DAY" : "CONSISTENCY > INTENSITY"}</span></div>
              </section>

              <section className="panel calendar-panel">
                <div className="panel-heading calendar-heading"><div><div className="section-kicker">THE LONG VIEW</div><h2>{fullCalendar ? "151 days, one at a time" : "Your season so far"}</h2></div><div className="calendar-controls"><button className="icon-button" title="Previous month" onClick={() => selectDate(dateOffset(`${dateKey(new Date(monthFirst.getFullYear(), monthFirst.getMonth(), 1))}`, -1))}><ChevronLeft size={16} /></button><span>{fmtDate(selectedDate, { month: "long", year: "numeric" })}</span><button className="icon-button" title="Next month" onClick={() => selectDate(dateOffset(`${dateKey(new Date(monthFirst.getFullYear(), monthFirst.getMonth() + 1, 1))}`, 0))}><ChevronRight size={16} /></button></div></div>
                <div className="month-grid">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}${index}`} className="weekday">{day}</span>)}
                  {monthCells.map((day, index) => {
                    if (!day) return <span key={`blank-${index}`} />;
                    const key = `${monthFirst.getFullYear()}-${String(monthFirst.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const score = dayScore(data.records[key], data.habits);
                    const future = key > today;
                    return <button key={key} onClick={() => selectDate(key)} disabled={key < START_DATE || key > END_DATE} className={`calendar-day ${key === selectedDate ? "selected" : ""} ${key === today ? "is-today" : ""} ${future ? "future" : ""} ${score >= 90 ? "score-high" : score >= 50 ? "score-mid" : score > 0 ? "score-low" : ""}`} title={`${fmtDate(key, { month: "long", day: "numeric" })}${score ? `, ${score}%` : ""}`}><span>{day}</span>{score > 0 && <i />}</button>;
                  })}
                </div>
                <div className="calendar-footer"><span><i className="legend-dot done" /> Strong day</span><span><i className="legend-dot partial" /> Partial</span><span><i className="legend-dot empty" /> Not logged</span><button onClick={() => setPage("Calendar")}>Full tracker <ArrowRight size={14} /></button></div>
              </section>
            </div>

            <aside className="right-column">
              <section className="score-panel">
                <div className="score-top"><div className="section-kicker">YOUR MOMENTUM</div><MoreHorizontal size={18} /></div>
                <div className="streak-number">{streak}<span>days</span></div><div className="streak-caption"><span className="streak-flare">✳</span> CURRENT STREAK</div>
                <div className="score-divider" />
                <div className="mini-stats"><div><strong>{bestStreak}</strong><span>BEST STREAK</span></div><div><strong>{completedDays}</strong><span>DAYS SHOWED UP</span></div></div>
                <div className="overall-wrap"><div className="overall-line"><span>OVERALL COMPLETION</span><b>{overallScore}%</b></div><div className="overall-track"><span style={{ width: `${overallScore}%` }} /></div><small>{totalDone} of {totalPossible} habits checked so far</small></div>
              </section>

              <section className="panel sleep-panel">
                <div className="panel-heading sleep-heading"><div><div className="section-kicker">REST IS PART OF IT</div><h2>Sleep log</h2></div><Moon size={18} className="sleep-moon" /></div>
                <div className="sleep-times"><label>TIME IN BED<input type="time" value={currentRecord.sleepStart} onChange={(event) => updateRecord({ sleepStart: event.target.value })} disabled={inFuture} /></label><ArrowRight size={15} /><label>TIME OUT OF BED<input type="time" value={currentRecord.wakeTime} onChange={(event) => updateRecord({ wakeTime: event.target.value })} disabled={inFuture} /></label></div>
                <div className="sleep-result"><div><span className="sleep-result-icon"><Clock3 size={17} /></span><strong>{fmtDuration(sleepMinutes(currentRecord))}</strong></div><span className="sleep-status">{sleepMinutes(currentRecord) >= 420 && sleepMinutes(currentRecord) <= 540 ? "IN THE 7–9H ZONE" : "AIM FOR 7–9 HOURS"}</span></div>
                <div className="sleep-foot"><span>SEASON AVERAGE</span><strong>{averageSleep ? fmtDuration(averageSleep) : "—"}</strong></div>
              </section>

              <section className="quote-panel"><span className="quote-symbol">“</span><blockquote>Consistency is built in the quiet, ordinary moments.</blockquote><span className="quote-credit">A NOTE TO YOUR FUTURE SELF</span><div className="quote-decoration">✳</div></section>
              <button className="weekly-link" onClick={() => { setReviewMonth("weekly"); setPage("Reviews"); }}><span className="weekly-icon"><BookOpen size={16} /></span><span><strong>Weekly reflection</strong><small>Close the week with intention</small></span><ArrowRight size={15} /></button>
            </aside>
          </section>
          <SleepChart
            mode={sleepChartMode}
            onModeChange={setSleepChartMode}
            selectedDate={selectedDate}
            records={data.records}
          />
          <footer className="page-footer"><span>BUILT FOR THE LONG GAME</span><span>OCTOBER 01, 2026 <i>—</i> FEBRUARY 28, 2027</span></footer>
        </>}

        {page === "Calendar" && <section className="full-calendar-view">
          <div className="eyebrow"><span className="eyebrow-line" /> THE WHOLE SEASON</div><h1 className="page-title">One day at a time<span className="title-period">.</span></h1><p className="hero-sub">A living record of the promises you kept. Select any date to see its check-in.</p>
          <div className="calendar-months">{MONTHS.map((name, monthIndex) => {
            const year = monthIndex < 3 ? 2026 : 2027;
            const month = [9, 10, 11, 0, 1][monthIndex];
            const first = new Date(year, month, 1);
            const length = new Date(year, month + 1, 0).getDate();
            const blanks = (first.getDay() + 6) % 7;
            return <section className="panel month-card" key={name}><div className="month-card-head"><h2>{name}<small>{year}</small></h2><span>{String(length).padStart(2, "0")} DAYS</span></div><div className="month-grid small-grid">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`${d}${i}`} className="weekday">{d}</span>)}{[...Array(blanks).fill(null), ...Array.from({ length }, (_, day) => day + 1)].map((day, index) => {
              if (!day) return <span key={`gap-${index}`} />;
              const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const score = dayScore(data.records[key], data.habits);
              return <button key={key} className={`calendar-day ${key === selectedDate ? "selected" : ""} ${key === today ? "is-today" : ""} ${key > today ? "future" : ""} ${score >= 90 ? "score-high" : score >= 50 ? "score-mid" : score > 0 ? "score-low" : ""}`} onClick={() => selectDate(key)} title={`${fmtDate(key)}${score ? ` • ${score}%` : ""}`}><span>{day}</span>{score > 0 && <i />}</button>;
            })}</div></section>;
          })}</div>
          <div className="calendar-legend"><span><i className="legend-dot done" /> 90%+ complete</span><span><i className="legend-dot partial" /> Partial day</span><span><i className="legend-dot empty" /> Not logged</span><span className="calendar-days-total">151 DAYS TOTAL</span></div>
        </section>}

        {page === "Reviews" && <section className="reviews-view">
          <div className="eyebrow"><span className="eyebrow-line" /> PAUSE & NOTICE</div><h1 className="page-title">Look how far you’ve come<span className="title-period">.</span></h1><p className="hero-sub">Reflection turns effort into direction. Keep it honest, keep it yours.</p>
          <div className="review-tabs"><button className={`review-tab ${reviewMonth !== "weekly" ? "active" : ""}`} onClick={() => { if (reviewMonth === "weekly") setReviewMonth("2026-10"); }}>Monthly reflection</button><button className={`review-tab ${reviewMonth === "weekly" ? "active" : ""}`} onClick={() => setReviewMonth("weekly")}>Weekly check-in <span>↗</span></button></div>
          {reviewMonth !== "weekly" ? <div className="review-layout"><section className="panel reflection-form"><div className="review-select-row"><div><div className="section-kicker">MONTHLY REVIEW</div><h2>{new Date(Number(reviewMonth.slice(0, 4)), Number(reviewMonth.slice(5)) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2></div><label className="select-wrap"><select value={reviewMonth} onChange={(event) => setReviewMonth(event.target.value)}>{["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"].map((month) => <option key={month} value={month}>{new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>)}</select><ChevronDown size={15} /></label></div>
            <ReflectionField number="01" label="BIGGEST WIN" placeholder="What are you proud of this month?" value={activeReview.win} onChange={(value) => setData((old) => ({ ...old, monthlyReviews: { ...old.monthlyReviews, [reviewMonth]: { ...activeReview, win: value } } }))} />
            <ReflectionField number="02" label="THE LESSON" placeholder="What did this month teach you?" value={activeReview.lesson} onChange={(value) => setData((old) => ({ ...old, monthlyReviews: { ...old.monthlyReviews, [reviewMonth]: { ...activeReview, lesson: value } } }))} />
            <ReflectionField number="03" label="ROOM TO GROW" placeholder="What would you like to approach differently?" value={activeReview.improve} onChange={(value) => setData((old) => ({ ...old, monthlyReviews: { ...old.monthlyReviews, [reviewMonth]: { ...activeReview, improve: value } } }))} />
            <ReflectionField number="04" label="NEXT MONTH’S INTENTION" placeholder="One thing you want to carry forward..." value={activeReview.goal} onChange={(value) => setData((old) => ({ ...old, monthlyReviews: { ...old.monthlyReviews, [reviewMonth]: { ...activeReview, goal: value } } }))} /></section>
            <aside className="review-aside"><div className="review-aside-mark">✳</div><div className="section-kicker">A MOMENT TO LOOK BACK</div><h2>Progress isn’t always loud.</h2><p>Some months are about building momentum. Others are about learning how to begin again. Both count.</p><div className="review-stat"><span>SEASON SCORE</span><strong>{overallScore}<i>%</i></strong><small>across {allDates.length} days so far</small></div></aside></div> : <div className="panel weekly-review"><div className="review-select-row"><div><div className="section-kicker">WEEKLY CHECK-IN</div><h2>Week {Math.floor((selectedDay - 1) / 7) + 1} <small>· {fmtDate(dateOffset(START_DATE, Math.floor((selectedDay - 1) / 7) * 7), { month: "short", day: "numeric" })} — {fmtDate(dateOffset(START_DATE, Math.min(DAY_COUNT - 1, Math.floor((selectedDay - 1) / 7) * 7 + 6)), { month: "short", day: "numeric" })}</small></h2></div><button className="text-button" onClick={() => setReviewMonth("2026-10")}>Monthly reflection <ArrowRight size={14} /></button></div>
            {([ ["wins", "MY WINS", "What did I accomplish this week?"], ["lessons", "WHAT I LEARNED", "What felt hard, and what did it teach me?"], ["focus", "NEXT WEEK’S FOCUS", "What deserves my attention next week?"] ] as const).map(([key, label, placeholder]) => <ReflectionField key={key} number={key === "wins" ? "01" : key === "lessons" ? "02" : "03"} label={label} placeholder={placeholder} value={data.weeklyReviews[String(Math.floor((selectedDay - 1) / 7))]?.[key] ?? ""} onChange={(value) => { const week = String(Math.floor((selectedDay - 1) / 7)); setData((old) => { const saved = old.weeklyReviews[week] ?? { wins: "", lessons: "", focus: "" }; return { ...old, weeklyReviews: { ...old.weeklyReviews, [week]: { ...saved, [key]: value } } }; }); }} />)}</div>}
        </section>}
      </section>

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modal-header"><div><div className="section-kicker">MAKE IT YOURS</div><h2 id="settings-title">Your daily habits</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} title="Close"><X size={18} /></button></div><p className="modal-description">Shape the list around the person you’re becoming.</p><div className="manage-list">{data.habits.map((habit, index) => <div className="manage-row" key={habit.id}><span className="manage-order">{String(index + 1).padStart(2, "0")}</span>{editingHabit === habit.id ? <input className="edit-habit-input" autoFocus defaultValue={habit.name} onBlur={(event) => saveHabitEdit(habit.id, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveHabitEdit(habit.id, event.currentTarget.value); if (event.key === "Escape") setEditingHabit(null); }} /> : <button className="manage-name" onClick={() => setEditingHabit(habit.id)} title="Click to rename">{habit.name}</button>}<div className="manage-actions"><button onClick={() => moveHabit(index, -1)} disabled={index === 0} title="Move up"><ArrowUp size={14} /></button><button onClick={() => moveHabit(index, 1)} disabled={index === data.habits.length - 1} title="Move down"><ArrowDown size={14} /></button><button onClick={() => setEditingHabit(habit.id)} title="Rename"><Settings2 size={14} /></button><button onClick={() => deleteHabit(habit.id)} title="Delete"><Trash2 size={14} /></button></div></div>)}</div><form className="add-habit-form" onSubmit={(event) => { event.preventDefault(); addHabit(); }}><input value={newHabit} onChange={(event) => setNewHabit(event.target.value)} placeholder="Add a habit to your practice..." maxLength={48} /><button type="submit" disabled={!newHabit.trim()}><Plus size={15} /> Add</button></form><div className="modal-foot"><span>{data.habits.length} active habits</span><span>Changes save automatically</span></div></section></div>}
      <nav className="mobile-nav" aria-label="Mobile navigation">{(["Today", "Calendar", "Reviews"] as Page[]).map((item) => { const Icon = item === "Today" ? Target : item === "Calendar" ? CalendarDays : BookOpen; return <button key={item} onClick={() => setPage(item)} className={page === item ? "active" : ""}><Icon size={19} /><span>{item}</span></button>; })}<button onClick={() => setShowSettings(true)}><Settings2 size={19} /><span>Habits</span></button></nav>
    </main>
  );
}

function SleepChart({ mode, onModeChange, selectedDate, records }: {
  mode: "daily" | "monthly";
  onModeChange: (mode: "daily" | "monthly") => void;
  selectedDate: string;
  records: Record<string, DayRecord>;
}) {
  const chartContainer = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(760);
  useEffect(() => {
    const container = chartContainer.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setChartWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const selectedMonth = selectedDate.slice(0, 7);
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = `${selectedMonth}-01` < START_DATE ? START_DATE : `${selectedMonth}-01`;
  const monthEndKey = `${selectedMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const monthEnd = monthEndKey > END_DATE ? END_DATE : monthEndKey;
  const dailyPoints = inclusiveDates(monthStart, monthEnd).map((key) => ({
    key,
    label: String(Number(key.slice(-2))),
    minutes: sleepMinutes(records[key]),
    nights: sleepMinutes(records[key]) > 0 ? 1 : 0,
  }));
  const monthlyPoints = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"].map((monthKey, index) => {
    const [monthYear, monthNumber] = monthKey.split("-").map(Number);
    const first = `${monthKey}-01` < START_DATE ? START_DATE : `${monthKey}-01`;
    const lastKey = `${monthKey}-${String(new Date(monthYear, monthNumber, 0).getDate()).padStart(2, "0")}`;
    const last = lastKey > END_DATE ? END_DATE : lastKey;
    const nights = inclusiveDates(first, last).map((key) => sleepMinutes(records[key])).filter((minutes) => minutes > 0);
    return {
      key: monthKey,
      label: ["OCT", "NOV", "DEC", "JAN", "FEB"][index],
      minutes: nights.length ? Math.round(nights.reduce((sum, value) => sum + value, 0) / nights.length) : 0,
      nights: nights.length,
    };
  });
  const points = mode === "daily" ? dailyPoints : monthlyPoints;
  const loggedPoints = points.filter((point) => point.minutes > 0);
  const average = loggedPoints.length
    ? Math.round(loggedPoints.reduce((sum, point) => sum + point.minutes, 0) / loggedPoints.length)
    : 0;
  const maxMinutes = Math.max(600, Math.ceil(Math.max(0, ...points.map((point) => point.minutes)) / 240) * 240);
  const viewWidth = chartWidth;
  const viewHeight = 250;
  const left = 48;
  const right = 12;
  const top = 15;
  const bottom = 211;
  const plotWidth = viewWidth - left - right;
  const plotHeight = bottom - top;
  const slotWidth = plotWidth / Math.max(points.length, 1);
  const chartPoints = points.map((point, index) => ({
    point,
    x: left + (index + 0.5) * slotWidth,
    y: bottom - (point.minutes / maxMinutes) * plotHeight,
  }));
  const lineSegments: string[] = [];
  let segment: string[] = [];
  for (const chartPoint of chartPoints) {
    if (chartPoint.point.minutes > 0) {
      segment.push(`${chartPoint.x},${chartPoint.y}`);
    } else if (segment.length) {
      lineSegments.push(segment.join(" "));
      segment = [];
    }
  }
  if (segment.length) lineSegments.push(segment.join(" "));
  const dailyLabels = new Set([1, 8, 15, 22, 29]);
  const ticks = [0, maxMinutes / 2, maxMinutes];

  return <section className="panel sleep-chart-panel">
    <div className="sleep-chart-heading">
      <div><div className="section-kicker">REST, OVER TIME</div><h2>Sleep rhythm</h2><p>{mode === "daily" ? `Nightly hours in ${parseDate(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : "Average nightly sleep by month"}</p></div>
      <div className="chart-mode" role="group" aria-label="Sleep chart view">
        <button aria-pressed={mode === "daily"} className={mode === "daily" ? "active" : ""} onClick={() => onModeChange("daily")}>Daily</button>
        <button aria-pressed={mode === "monthly"} className={mode === "monthly" ? "active" : ""} onClick={() => onModeChange("monthly")}>Monthly</button>
      </div>
    </div>
    <div className="sleep-chart-summary"><span><i className="chart-legend-swatch" /> {mode === "daily" ? "HOURS SLEPT" : "MONTHLY AVERAGE"}</span><strong>{average ? fmtDuration(average) : "No sleep logged yet"}</strong><small>{loggedPoints.length} {mode === "daily" ? "nights" : "months"} with data</small></div>
    <div className="sleep-chart-wrap" ref={chartContainer}>
      <svg className="sleep-chart" viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={mode === "daily" ? `Daily sleep duration chart for ${parseDate(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : "Monthly average sleep duration chart for the Winter Arc"}>
        <rect x={left} y={bottom - (540 / maxMinutes) * plotHeight} width={plotWidth} height={(120 / maxMinutes) * plotHeight} className="chart-target-band" />
        {ticks.map((tick) => {
          const y = bottom - (tick / maxMinutes) * plotHeight;
          return <g key={tick}><line x1={left} x2={viewWidth - right} y1={y} y2={y} className="chart-gridline" /><text x={left - 9} y={y + 3} textAnchor="end" className="chart-axis-label">{tick / 60}h</text></g>;
        })}
        {lineSegments.map((segmentPath, index) => <polyline key={`line-${index}`} points={segmentPath} className="sleep-line" />)}
        {chartPoints.map(({ point, x, y }) => {
          const selected = mode === "daily" && point.key === selectedDate;
          const labelDay = mode === "daily" ? Number(point.label) : 0;
          const labelVisible = mode === "monthly" || dailyLabels.has(labelDay);
          const detail = point.minutes ? fmtDuration(point.minutes) : "No sleep logged";
          const title = mode === "daily" ? `${fmtDate(point.key, { month: "short", day: "numeric" })}: ${detail}` : `${point.label}: ${point.minutes ? `${fmtDuration(point.minutes)} average across ${point.nights} nights` : "No nights logged"}`;
          return <g key={point.key}>
            {point.minutes > 0 && <circle cx={x} cy={y} r={selected ? 4.5 : 3.5} className={`sleep-point ${selected ? "selected" : ""}`}><title>{title}</title></circle>}
            {labelVisible && <text x={x} y={bottom + 18} textAnchor="middle" className={`chart-x-label ${selected ? "selected" : ""}`}>{point.label}</text>}
          </g>;
        })}
      </svg>
    </div>
    <div className="sleep-chart-note"><span>Target: 7–9 hours</span><span>{mode === "daily" ? "Select a date on the calendar to view another month" : "Monthly averages use logged nights only"}</span></div>
  </section>;
}

function ReflectionField({ number, label, placeholder, value, onChange }: { number: string; label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return <label className="reflection-field"><span className="reflection-number">{number}</span><span className="reflection-content"><span className="section-kicker">{label}</span><textarea rows={2} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></span></label>;
}

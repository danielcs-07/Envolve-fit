import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const clients = [
  { id: 1, name: "Marina Costa", initials: "MC", plan: "Hipertrofia A/B/C", last: "Hoje", status: "Em dia", weight: "78%" },
  { id: 2, name: "Rafael Mendes", initials: "RM", plan: "Força e condicionamento", last: "Ontem", status: "Em dia", weight: "91%" },
  { id: 3, name: "Camila Rocha", initials: "CR", plan: "Treino funcional", last: "Há 3 dias", status: "Acompanhar", weight: "53%" },
  { id: 4, name: "Bruno Ferreira", initials: "BF", plan: "Em elaboração", last: "Sem registros", status: "Sem ficha", weight: "0%" },
  { id: 5, name: "Larissa Lima", initials: "LL", plan: "Hipertrofia A/B", last: "Hoje", status: "Em dia", weight: "82%" },
  { id: 6, name: "Lucas Alves", initials: "LA", plan: "Resistência", last: "Há 8 dias", status: "Acompanhar", weight: "37%" }
];
const initialWorkouts = [
  { id: 1, title: "Hipertrofia A — Inferiores", student: "Marina Costa", exercises: 6, tag: "Publicado" },
  { id: 2, title: "Força total", student: "Rafael Mendes", exercises: 5, tag: "Publicado" },
  { id: 3, title: "Treino funcional", student: "Camila Rocha", exercises: 7, tag: "Publicado" },
  { id: 4, title: "Resistência B", student: "Lucas Alves", exercises: 5, tag: "Rascunho" }
];
const activities = [
  { name: "Marina Costa", detail: "Concluiu Hipertrofia A — Inferiores", when: "Há 18 min", icon: "check" },
  { name: "Larissa Lima", detail: "Registrou um novo recorde pessoal", when: "Há 1 h", icon: "trend" },
  { name: "Rafael Mendes", detail: "Concluiu Força total", when: "Há 3 h", icon: "check" },
  { name: "Camila Rocha", detail: "Enviou feedback sobre o treino", when: "Ontem", icon: "message" }
];
const week = [{ day: "Seg", n: 6 }, { day: "Ter", n: 10 }, { day: "Qua", n: 7 }, { day: "Qui", n: 13 }, { day: "Sex", n: 11 }, { day: "Sáb", n: 8 }, { day: "Dom", n: 5 }];
const trainerNav = [
  ["home", "Visão geral"], ["users", "Alunos"], ["dumbbell", "Fichas de treino"], ["chart", "Acompanhamento"]
];
const studentNav = [
  ["home", "Início"], ["dumbbell", "Meu treino"], ["chart", "Evolução"], ["calendar", "Histórico"]
];
const movement = {
  initial: { opacity: 0, x: 25, filter: "blur(2px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -22, filter: "blur(2px)" }
};
const smooth = { duration: .29, ease: [.22, 1, .36, 1] };

function Icon({ name, size = 20 }) {
  const paths = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/></>,
    users: <><circle cx="9" cy="8" r="3.1"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></>,
    dumbbell: <><path d="M3 10v4M6 7v10M9 9v6M15 9v6M18 7v10M21 10v4M9 12h6"/></>,
    chart: <><path d="M4 19V5M4 19h16M8 15l4-4 3 2 5-6"/><path d="M17 7h3v3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    close: <path d="M5 5l14 14M19 5 5 19"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    message: <><path d="M4 4h16v13H9l-5 4z"/></>,
    trend: <><path d="m3 16 6-6 4 4 8-8M15 6h6v6"/></>,
    spark: <path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z"/>,
    notification: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    filter: <><path d="M3 5h18M7 12h10M10 19h4"/></>
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.home}</svg>;
}
function Page({ id, children }) {
  return <motion.section key={id} {...movement} transition={smooth} className="page-view">{children}</motion.section>;
}
function Chip({ children, tone = "neutral" }) { return <span className={"chip " + tone}>{children}</span>; }
function Headline({ tag, title, subtitle, button }) {
  return <div className="section-head">
    <div><span className="eyebrow">{tag}</span><h1>{title}</h1><p>{subtitle}</p></div>
    {button}
  </div>;
}
function Section({ title, subtitle, aside, children, className = "" }) {
  return <div className={"surface " + className}>
    <div className="surface-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{aside}</div>
    {children}
  </div>;
}
function Metric({ icon, title, value, footer, emphasis = false }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ duration: .16 }} className={"metric " + (emphasis ? "metric-emphasis" : "")}>
    <div className="metric-top"><span>{title}</span><span className="metric-icon"><Icon name={icon} size={18}/></span></div>
    <strong>{value}</strong><small>{footer}</small>
  </motion.div>;
}
function SessionBars() {
  return <div className="chart-area">
    <div className="chart-guide"><span>15</span><span>10</span><span>5</span><span>0</span></div>
    <div className="chart-bars">
      {week.map((item, i) => <div className="chart-bar-group" key={item.day}>
        <div className="chart-bar-stage"><motion.div className={"chart-bar " + (i === 3 ? "best" : "")}
          initial={{ height: 0 }} animate={{ height: item.n * 9 + "px" }} transition={{ duration: .65, delay: i * .05, ease: [.22, 1, .36, 1] }}
          title={item.n + " sessões"} /></div><span>{item.day}</span>
      </div>)}
    </div>
  </div>;
}
function ClientList({ onOpen, search = "", compact = false }) {
  const found = clients.filter(c => (c.name + " " + c.plan + " " + c.status).toLowerCase().includes(search.toLowerCase()));
  return <div className="roster-table" role="table" aria-label="Alunos de exemplo">
    <div className="roster-headers" role="row"><span>ALUNO</span><span>PLANO</span><span>ÚLTIMO TREINO</span><span>SITUAÇÃO</span><span></span></div>
    {found.slice(0, compact ? 4 : 20).map(c => <motion.div layout key={c.id} className="roster-row" role="row" whileHover={{ backgroundColor: "#f8faf7" }}>
      <div className="client-cell"><span className="initials">{c.initials}</span><strong>{c.name}</strong></div>
      <span className="cell-secondary">{c.plan}</span><span className="cell-secondary">{c.last}</span>
      <Chip tone={c.status === "Em dia" ? "ok" : c.status === "Sem ficha" ? "warning" : "muted"}>{c.status}</Chip>
      <button type="button" className="text-button" onClick={() => onOpen(c)}>Abrir <Icon name="chevron" size={15}/></button>
    </motion.div>)}
    {!found.length && <p className="empty">Nenhum aluno encontrado com essa busca.</p>}
  </div>;
}
function ActivityFeed() {
  return <div className="feed">{activities.map((a, i) => <motion.div layout className="feed-row" key={a.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .045 }}>
    <span className="feed-icon"><Icon name={a.icon} size={17}/></span><div><strong>{a.name}</strong><p>{a.detail}</p></div><small>{a.when}</small>
  </motion.div>)}</div>;
}
function StudentDetail({ client, onClose }) {
  return <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.aside className="detail-sheet" initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }}
      transition={{ type: "spring", stiffness: 330, damping: 35 }} onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Detalhes do aluno">
      <div className="sheet-top"><span className="eyebrow">PERFIL DO ALUNO</span><button className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="close"/></button></div>
      <div className="detail-identity"><span className="big-initials">{client.initials}</span><div><h2>{client.name}</h2><p>Aluno demonstrativo</p></div></div>
      <div className="detail-content"><div className="detail-line"><span>Plano atual</span><strong>{client.plan}</strong></div>
        <div className="detail-line"><span>Último treino</span><strong>{client.last}</strong></div><div className="detail-line"><span>Status</span><Chip tone={client.status === "Em dia" ? "ok" : "warning"}>{client.status}</Chip></div></div>
      <div className="detail-progress"><p>Consistência ilustrativa</p><div className="progress-track"><motion.div initial={{ width: 0 }} animate={{ width: client.weight }} transition={{ duration: .6 }}/></div><strong>{client.weight}</strong></div>
      <p className="sheet-note">Esta tela usa informações fictícias. A integração com Firebase será feita em outra etapa.</p>
      <button className="button button-primary" onClick={onClose}>Voltar ao painel</button>
    </motion.aside>
  </motion.div>;
}
function NewWorkout({ onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [student, setStudent] = useState(clients[0].name);
  const submit = e => { e.preventDefault(); if (!title.trim()) return; onAdd({ id: Date.now(), title: title.trim(), student, exercises: 0, tag: "Rascunho" }); onClose(); };
  return <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.div className="modal" initial={{ scale: .94, y: 25, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: .96, opacity: 0 }} transition={smooth} onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Nova ficha de treino">
      <div className="sheet-top"><span className="eyebrow">CRIAÇÃO DE TREINO · DEMO</span><button className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="close"/></button></div>
      <h2>Nova ficha de treino</h2><p>Experimente a animação e o fluxo de criação de uma ficha.</p>
      <form onSubmit={submit}><label>Nome da ficha<input autoFocus required maxLength={70} placeholder="Ex.: Treino A — Inferiores" value={title} onChange={e => setTitle(e.target.value)}/></label>
        <label>Aluno<select value={student} onChange={e => setStudent(e.target.value)}>{clients.map(c => <option key={c.id}>{c.name}</option>)}</select></label>
        <div className="modal-footer"><button type="button" className="button button-soft" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary">Criar rascunho</button></div>
      </form><small>Rascunho apenas nesta demonstração; não é enviado ao Firebase.</small>
    </motion.div>
  </motion.div>;
}
function TrainerPage({ page, openClient, openNew, workouts }) {
  const [search, setSearch] = useState("");
  const newButton = <motion.button whileTap={{ scale: .97 }} className="button button-primary" onClick={openNew}><Icon name="plus" size={17}/> Nova ficha</motion.button>;
  if (page === "home") return <Page id="trainer-home">
    <Headline tag="ÁREA DO TREINADOR / VISÃO GERAL" title={<>Bom dia, <em>personal.</em></>} subtitle="Uma visão clara dos seus alunos e da operação de hoje." button={newButton}/>
    <div className="metrics-grid"><Metric title="Alunos ativos" icon="users" value="24" footer="Cadastros acompanhados"/><Metric title="Treinos esta semana" icon="check" value="60" footer="Sessões concluídas" emphasis/><Metric title="Fichas publicadas" icon="dumbbell" value="38" footer="Disponíveis para alunos"/><Metric title="Precisam de atenção" icon="notification" value="03" footer="Alunos para acompanhar"/></div>
    <div className="workspace-grid"><Section title="Seus alunos" subtitle="Acompanhe o andamento de cada um." aside={<span className="section-caption">6 EM DESTAQUE</span>} className="clients-pane"><ClientList onOpen={openClient} compact/></Section><Section title="Últimas atividades" subtitle="Atualizações do seu time." className="activity-pane"><ActivityFeed/></Section></div>
    <div className="workspace-grid lower"><Section title="Frequência semanal" subtitle="Distribuição das sessões de treino." aside={<Chip tone="ok">Últimos 7 dias</Chip>}><SessionBars/></Section>
    <Section title="Próximas ações" subtitle="Acompanhe os pontos importantes."><div className="tasks"><div><span className="task-dot amber"/><p><strong>1 aluno sem ficha</strong><small>Bruno Ferreira precisa de um plano.</small></p></div><div><span className="task-dot"/><p><strong>2 alunos sem atividade recente</strong><small>Confira o acompanhamento semanal.</small></p></div><div><span className="task-dot ok"/><p><strong>Feedbacks recebidos</strong><small>Veja os comentários dos últimos treinos.</small></p></div></div></Section></div>
  </Page>;
  if (page === "users") return <Page id="trainer-users">
    <Headline tag="GESTÃO / ALUNOS" title="Seus alunos" subtitle="Tudo o que você precisa para acompanhar cada pessoa." button={newButton}/>
    <Section title="Alunos cadastrados" subtitle="Clique em um aluno para abrir o perfil em um painel deslizante." aside={<span className="section-caption">{clients.length} ALUNOS</span>}>
      <label className="search-input"><Icon name="search" size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome, plano ou situação" aria-label="Pesquisar alunos"/></label>
      <ClientList onOpen={openClient} search={search}/>
    </Section>
  </Page>;
  if (page === "dumbbell") return <Page id="trainer-workouts">
    <Headline tag="TREINAMENTO / FICHAS" title="Biblioteca de treinos" subtitle="Organize e crie prescrições com mais facilidade." button={newButton}/>
    <div className="workouts-grid">{workouts.map((w, i) => <motion.div className="workout-tile" key={w.id} layout whileHover={{ y: -4 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}>
      <div className="tile-icon"><Icon name="dumbbell" size={24}/></div><Chip tone={w.tag === "Publicado" ? "ok" : "muted"}>{w.tag}</Chip>
      <h3>{w.title}</h3><p>{w.student}</p><div className="tile-footer">{w.exercises} exercícios <Icon name="arrow" size={17}/></div>
    </motion.div>)}</div>
  </Page>;
  return <Page id="trainer-progress">
    <Headline tag="DADOS / ACOMPANHAMENTO" title="Evolução dos alunos" subtitle="Informações organizadas para decisões melhores."/>
    <div className="metrics-grid"><Metric icon="chart" title="Sessões concluídas" value="60" footer="Na semana"/><Metric icon="users" title="Alunos que treinaram" value="19" footer="Nos últimos 7 dias"/><Metric icon="trend" title="Taxa de atividade" value="79%" footer="Amostra demonstrativa"/><Metric icon="check" title="Fichas ativas" value="38" footer="Planos publicados"/></div>
    <Section title="Atividade por dia" subtitle="Passe pelas telas para ver como as transições funcionam."><SessionBars/></Section>
  </Page>;
}
function StudentPage({ page, setPage, done, setDone, completed, setCompleted }) {
  const moves = ["Agachamento livre", "Leg press 45°", "Cadeira extensora", "Mesa flexora"];
  const completedCount = done.filter(Boolean).length;
  if (page === "home") return <Page id="student-home">
    <Headline tag="SEU TREINO / HOJE" title={<>Seu progresso <em>continua.</em></>} subtitle="Seu próximo passo está pronto quando você estiver."/>
    <div className="student-grid"><div className="training-feature"><span className="eyebrow">TREINO DE HOJE</span><h2>Inferiores · Treino A</h2><p>Quatro exercícios selecionados para você evoluir com consistência.</p><div className="feature-facts"><span><Icon name="dumbbell" size={16}/> 4 exercícios</span><span><Icon name="clock" size={16}/> ~50 minutos</span></div>
      <button className="button button-primary" onClick={() => setPage("dumbbell")}>Abrir meu treino <Icon name="arrow" size={17}/></button></div>
      <Section title="Seu ritmo" subtitle="Cada sessão conta."><div className="student-big"><strong>{completedCount}/4</strong><span>Exercícios marcados</span></div><div className="progress-track"><motion.div initial={{ width: 0 }} animate={{ width: (completedCount / 4 * 100) + "%" }} transition={{ type: "spring", stiffness: 160 }}/></div></Section>
    </div>
  </Page>;
  if (page === "dumbbell") return <Page id="student-training">
    <Headline tag="EXECUÇÃO DO TREINO" title="Inferiores · Treino A" subtitle="Marque os exercícios para testar as animações de progresso." button={<Chip tone={completed ? "ok" : "neutral"}>{completed ? "Concluído na demo" : "Em andamento"}</Chip>}/>
    <div className="training-list">{moves.map((move, i) => <motion.button layout key={move} whileTap={{ scale: .99 }} className={"exercise-line " + (done[i] ? "done" : "")}
      onClick={() => { setCompleted(false); setDone(arr => arr.map((v, j) => i === j ? !v : v)); }} aria-pressed={done[i]}>
      <span className="exercise-num">{String(i + 1).padStart(2, "0")}</span><span className="exercise-copy"><strong>{move}</strong><small>3 séries · 10–12 repetições</small></span>
      <motion.span className="check-square" animate={{ scale: done[i] ? [1, 1.23, 1] : 1 }} transition={{ duration: .22 }}>{done[i] ? <Icon name="check" size={19}/> : null}</motion.span>
    </motion.button>)}</div>
    <div className="session-footer"><div><p>{completedCount} de 4 exercícios marcados</p><div className="progress-track"><motion.div animate={{ width: (completedCount / 4 * 100) + "%" }}/></div></div>
      <button className="button button-primary" onClick={() => { setCompleted(true); setPage("calendar"); }}>Concluir demonstração <Icon name="arrow" size={17}/></button></div>
  </Page>;
  if (page === "chart") return <Page id="student-progress">
    <Headline tag="RESULTADOS / EVOLUÇÃO" title="Sua evolução" subtitle="Uma visão prática do que você construiu com o tempo."/>
    <div className="metrics-grid"><Metric title="Treinos da semana" icon="check" value="03" footer="Consistência demonstrativa"/><Metric title="Seu recorde" icon="trend" value="84 kg" footer="Exemplo de carga"/><Metric title="Exercícios feitos" icon="dumbbell" value={String(completedCount)} footer="Nesta demonstração"/><Metric title="Meta semanal" icon="calendar" value="75%" footer="Exemplo visual"/></div><Section title="Frequência" subtitle="Gráfico demonstrativo"><SessionBars/></Section>
  </Page>;
  return <Page id="student-history">
    <Headline tag="ACOMPANHAMENTO / HISTÓRICO" title="Seu histórico" subtitle="Acompanhe o que você já realizou."/>
    <Section title="Sessões"><div className="history-record"><span className="history-mark"><Icon name="check"/></span><div><strong>Inferiores · Treino A</strong><p>{completed ? "Concluído agora nesta demonstração" : "Exemplo de sessão anterior"}</p></div><Chip tone="ok">{completed ? "Concluído" : "Exemplo"}</Chip></div>
    <p className="muted-note">Os dados desta tela são fictícios. Nenhum treino real foi modificado.</p></Section>
  </Page>;
}
export default function App() {
  const [role, setRole] = useState("trainer");
  const [page, setPage] = useState("home");
  const [selectedClient, setSelectedClient] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [completed, setCompleted] = useState(false);
  const [done, setDone] = useState([false, false, false, false]);
  const nav = role === "trainer" ? trainerNav : studentNav;
  const sectionTitle = useMemo(() => (nav.find(([slug]) => slug === page) || nav[0])[1], [nav, page]);
  function chooseRole(next) { setRole(next); setPage("home"); setSelectedClient(null); setBuilderOpen(false); }
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="wordmark" onClick={() => setPage("home")} aria-label="Ir para início"><span className="logo-mark">E<span>✦</span></span><span>EVOLVE<span className="brand-accent">FIT</span><small>TRAINING PLATFORM</small></span></button>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Navegação principal">{nav.map(([slug, label]) => <button key={slug} className={"nav-button " + (page === slug ? "selected" : "")} onClick={() => setPage(slug)} aria-current={page === slug ? "page" : undefined}>
        {page === slug && <motion.span layoutId="nav-highlight" className="nav-highlight" transition={{ type: "spring", stiffness: 450, damping: 38 }}/>}
        <Icon name={slug}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="side-feature"><Icon name="spark" size={19}/><strong>Uma nova experiência.</strong><p>Transições suaves e tudo no seu ritmo.</p></div><span className="side-footer">EVOLVE FIT 3.0 · PROTÓTIPO</span></div>
    </aside>
    <div className="main">
      <header className="topbar"><div className="topbar-location"><span className="crumb">Workspace</span><Icon name="chevron" size={15}/><strong>{sectionTitle}</strong></div>
        <div className="topbar-actions"><div className="role-switch" role="group" aria-label="Área do aplicativo"><button className={role === "trainer" ? "active" : ""} onClick={() => chooseRole("trainer")}>Treinador</button><button className={role === "student" ? "active" : ""} onClick={() => chooseRole("student")}>Aluno</button></div><span className="top-avatar">EF</span></div>
      </header>
      <div className="demo-note"><span className="demo-pulse"/> DEMONSTRAÇÃO INTERATIVA <span>· Sem conexão com dados reais</span></div>
      <main className="page-content"><AnimatePresence mode="wait">
        {role === "trainer" ? <TrainerPage key={"trainer:" + page} page={page} openClient={setSelectedClient} openNew={() => setBuilderOpen(true)} workouts={workouts}/> :
          <StudentPage key={"student:" + page} page={page} setPage={setPage} done={done} setDone={setDone} completed={completed} setCompleted={setCompleted}/>}
      </AnimatePresence></main>
      <nav className="mobile-nav" aria-label="Navegação móvel">{nav.map(([slug, label]) => <button key={slug} onClick={() => setPage(slug)} className={page === slug ? "active" : ""} aria-current={page === slug ? "page" : undefined}>
        <Icon name={slug} size={19}/><span>{label}</span></button>)}</nav>
    </div>
    <AnimatePresence>{selectedClient && <StudentDetail key={selectedClient.id} client={selectedClient} onClose={() => setSelectedClient(null)}/>}</AnimatePresence>
    <AnimatePresence>{builderOpen && <NewWorkout key="new-workout" onClose={() => setBuilderOpen(false)} onAdd={w => setWorkouts(items => [w, ...items])}/>}</AnimatePresence>
  </div>;
}

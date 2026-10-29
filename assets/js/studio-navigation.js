// Navegação premium do Evolve Fit.
// Reutiliza os botões e as telas existentes, sem tocar no Firebase.
(() => {
  "use strict";

  const icons = Object.freeze({
    dashboard: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    workouts: '<path d="M6.5 6.5v11M3 9v6m7-10v14m4-14v14m3.5-12.5v11M21 9v6M10 12h4"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    progress: '<path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/><path d="M16 7h3v3"/>',
    explore: '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    create: '<path d="M12 5v14M5 12h14"/>',
    students: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    models: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
  });

  const roles = {
    student: {
      primary: ["dashboard","history","workouts","progress"],
      more: ["explore","profile"],
      labels: {
        dashboard:["Início","Sua visão geral"], workouts:["Treinos","Suas fichas e sessões"],
        history:["Histórico","Treinos realizados"],progress:["Evolução","Cargas, medidas e PR"],
        explore:["Ferramentas","Biblioteca, cálculos e música"],profile:["Meu perfil","Conta e aparência"]
      }
    },
    trainer: {
      primary: ["dashboard","students","create","workouts"],
      more: ["models","history","progress","profile"],
      labels: {
        dashboard:["Início","Resumo dos alunos"],students:["Alunos","Gerenciamento"],
        create:["Criar","Nova ficha de treino"],workouts:["Fichas","Criadas e publicadas"],
        models:["Modelos","Comece com uma base"],history:["Histórico","Atividades dos alunos"],
        progress:["Evolução","Desempenho e medidas"],profile:["Meu perfil","Conta e aparência"]
      }
    }
  };

  function svg(name, size = 21) {
    const el = document.createElementNS("http://www.w3.org/2000/svg","svg");
    el.setAttribute("viewBox","0 0 24 24");
    el.setAttribute("width",size);
    el.setAttribute("height",size);
    el.setAttribute("stroke","currentColor");
    el.setAttribute("stroke-width","1.8");
    el.setAttribute("stroke-linecap","round");
    el.setAttribute("stroke-linejoin","round");
    el.setAttribute("fill","none");
    el.setAttribute("aria-hidden","true");
    el.classList.add("studio-line-icon");
    el.innerHTML = icons[name] || icons.more;
    return el;
  }

  function el(tag, className, label) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function setup() {
    const app = document.getElementById("app");
    const menu = app?.querySelector(".sidebar-nav");
    if (!app || !menu || app.querySelector(".studio-mobile-dock")) return;
    const isTrainer = !!menu.querySelector('[data-tab="students"]');
    const config = isTrainer ? roles.trainer : roles.student;
    const original = new Map([...menu.querySelectorAll(".nav-item[data-tab]")].map(b=>[b.dataset.tab,b]));
    // Keep all original buttons and their event handlers intact for desktop/JS navigation.
    original.forEach((button, tab) => {
      const info = config.labels[tab];
      if (!info) return;
      const name = el("span","studio-sidebar-label",info[0] === "Início" && isTrainer ? "Visão geral" : info[0]);
      button.replaceChildren(svg(tab,20), name);
      button.type = "button";
      button.setAttribute("aria-label",info[0]);
    });

    const dock = el("nav","studio-mobile-dock");
    dock.setAttribute("aria-label","Navegação principal");
    const inner = el("div","studio-dock-inner");
    dock.append(inner);

    const overlay = el("div","studio-more-overlay");
    overlay.hidden = true;
    const sheet = el("section","studio-more-sheet");
    sheet.id = "studio-more-sheet";
    sheet.hidden = true;
    sheet.setAttribute("role","dialog");
    sheet.setAttribute("aria-modal","true");
    sheet.setAttribute("aria-labelledby","studio-more-title");
    const handle = el("span","studio-sheet-handle");
    handle.setAttribute("aria-hidden","true");
    const header = el("div","studio-more-header");
    const text = el("div","");
    const kicker = el("small","studio-more-kicker","EVOLVE FIT");
    const title = el("h2","","Mais opções");
    title.id = "studio-more-title";
    text.append(kicker,title);
    const close = el("button","studio-more-close");
    close.type = "button";
    close.setAttribute("aria-label","Fechar menu");
    close.append(svg("close",20));
    header.append(text,close);
    const list = el("div","studio-more-links");

    let priorFocus = null;
    const more = el("button","studio-dock-item studio-dock-more");
    more.type = "button";
    more.append(svg("more",22),el("span","","Mais"));
    more.setAttribute("aria-controls",sheet.id);
    more.setAttribute("aria-haspopup","dialog");
    more.setAttribute("aria-expanded","false");

    const closeSheet = () => {
      if (sheet.hidden) return;
      sheet.hidden = true;
      overlay.hidden = true;
      more.setAttribute("aria-expanded","false");
      document.body.classList.remove("studio-sheet-open");
      if (priorFocus?.isConnected) priorFocus.focus({preventScroll:true});
    };
    const openSheet = () => {
      priorFocus = document.activeElement;
      overlay.hidden = false;
      sheet.hidden = false;
      more.setAttribute("aria-expanded","true");
      document.body.classList.add("studio-sheet-open");
      close.focus({preventScroll:true});
    };
    more.addEventListener("click",()=>sheet.hidden ? openSheet():closeSheet());
    overlay.addEventListener("click",closeSheet);
    close.addEventListener("click",closeSheet);
    document.addEventListener("keydown",event=>{
      if (sheet.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
      } else if (event.key === "Tab") {
        const focusable = [...sheet.querySelectorAll('button:not([disabled]),a[href]')].filter(x=>x.getClientRects().length);
        if (!focusable.length) return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if (event.shiftKey && document.activeElement===first) {
          event.preventDefault();last.focus();
        } else if (!event.shiftKey && document.activeElement===last) {
          event.preventDefault();first.focus();
        }
      }
    });
    window.matchMedia("(min-width: 901px)").addEventListener?.("change",event=> {
      if (event.matches) closeSheet();
    });

    function navigate(tab) {
      closeSheet();
      const button = original.get(tab);
      if (!button) return;
      button.click();
    }

    const dockButtons = new Map();
    config.primary.forEach(tab=>{
      if (!original.has(tab)) return;
      const label = config.labels[tab][0];
      const button = el("button","studio-dock-item");
      button.type="button";
      button.dataset.studioTab=tab;
      button.setAttribute("aria-label",label);
      const iconWrap=el("span","studio-dock-icon");
      iconWrap.append(svg(tab,tab==="create" ? 26:22));
      button.append(iconWrap,el("span","studio-dock-label",label));
      if (tab==="workouts" && !isTrainer || tab==="create" && isTrainer)
        button.classList.add("studio-dock-emphasis");
      button.addEventListener("click",()=>navigate(tab));
      dockButtons.set(tab,button);
    });

    // Preserve the intuitive order: home, logs/students, action, progress/workouts, more.
    for(const tab of config.primary) if(dockButtons.has(tab)) inner.append(dockButtons.get(tab));
    inner.append(more);

    config.more.forEach(tab=>{
      if (!original.has(tab)) return;
      const [name,description]=config.labels[tab];
      const button=el("button","studio-more-link");
      button.type="button";
      const badge=el("span","studio-more-link-icon");
      badge.append(svg(tab,22));
      const details=el("span","studio-more-link-copy");
      details.append(el("strong","",name),el("small","",description));
      button.append(badge,details,svg("chevron",18));
      button.addEventListener("click",()=>navigate(tab));
      button.dataset.studioTab=tab;
      list.append(button);
    });

    // Profile/logout remains available from the bottom sheet if needed.
    const exit=el("button","studio-more-logout");
    exit.type="button";
    exit.append(svg("logout",19),el("span","","Sair da conta"));
    exit.addEventListener("click",()=>{
      closeSheet();
      document.getElementById("logout")?.click();
    });

    sheet.append(handle,header,list,exit);
    app.append(dock,overlay,sheet);

    function sync() {
      const active=menu.querySelector(".nav-item.active")?.dataset.tab;
      dockButtons.forEach((button,tab)=>{
        const yes=tab===active;
        button.classList.toggle("is-active",yes);
        if(yes) button.setAttribute("aria-current","page");
        else button.removeAttribute("aria-current");
      });
      const isMore=config.more.includes(active);
      more.classList.toggle("is-active",isMore);
      if(isMore) more.setAttribute("aria-current","page");
      else more.removeAttribute("aria-current");
      [...list.querySelectorAll("[data-studio-tab]")].forEach(button=>{
        button.classList.toggle("is-active",button.dataset.studioTab===active);
      });
    }

    new MutationObserver(sync).observe(menu,{subtree:true,attributes:true,attributeFilter:["class"]});
    sync();
  }

  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",setup);
  else setup();
})();

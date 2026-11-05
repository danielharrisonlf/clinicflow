import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Menu,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/layout/brand";
import { TabPanel, Tabs } from "@/components/ui/segmented";
import "./landing-page.css";

const stages = [
  {
    value: "agenda",
    label: "Agenda",
    image: "/marketing/agenda.webp",
    mobileImage: "/marketing/agenda-mobile.webp",
    imageAlt:
      "Agenda do ClinicFlow com consultas organizadas por horário e estado",
    eyebrow: "01 / Planeje o dia",
    title: "A agenda mostra o que vem a seguir.",
    description:
      "Horários, pacientes e estados da consulta ficam no mesmo lugar para a recepção acompanhar o dia sem perder o contexto.",
  },
  {
    value: "recepcao",
    label: "Recepção",
    image: "/marketing/espera.webp",
    mobileImage: "/marketing/espera-mobile.webp",
    imageAlt:
      "Fila de espera do ClinicFlow com pacientes que chegaram à clínica",
    eyebrow: "02 / Acompanhe as chegadas",
    title: "Quem chegou fica visível para a equipe.",
    description:
      "A recepção registra a chegada e acompanha quem está aguardando, com um próximo passo claro para cada pessoa.",
  },
  {
    value: "atendimento",
    label: "Atendimento",
    image: "/marketing/painel.webp",
    mobileImage: "/marketing/painel-mobile.webp",
    imageAlt: "Painel operacional do ClinicFlow com tarefas e visão do dia",
    eyebrow: "03 / Mantenha o ritmo",
    title: "O andamento do dia em uma visão só.",
    description:
      "Consultas e pendências administrativas aparecem juntas, para que a equipe saiba o que precisa de atenção agora.",
  },
  {
    value: "retornos",
    label: "Retornos",
    image: "/marketing/retornos.webp",
    mobileImage: "/marketing/retornos-mobile.webp",
    imageAlt: "Lista de retornos pendentes no ClinicFlow",
    eyebrow: "04 / Feche o ciclo",
    title: "O cuidado continua depois da consulta.",
    description:
      "Registre retornos e acompanhe pendências até que a próxima ação esteja resolvida pela equipe.",
  },
] as const;

type Stage = (typeof stages)[number]["value"];

const navItems = [
  { label: "Como funciona", href: "#fluxo" },
  { label: "Para a recepção", href: "#recepcao" },
  { label: "Perguntas", href: "#perguntas" },
];

export function LandingPage() {
  const [activeStage, setActiveStage] = useState<Stage>("agenda");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const stage = stages.find((item) => item.value === activeStage) ?? stages[0];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <div className="landing" id="topo">
      <a className="landing-skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <div className="landing-top">
        <header className="landing-header">
          <nav className="landing-nav" aria-label="Navegação principal">
            <a
              className="landing-brand"
              href="#topo"
              aria-label="ClinicFlow, voltar ao início"
            >
              <BrandMark size="sm" />
              <span>ClinicFlow</span>
            </a>

            <div className="landing-nav-links">
              {navItems.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </div>

            <div className="landing-nav-actions">
              <a className="landing-login" href="/entrar">
                Entrar no sistema
              </a>
              <a className="landing-nav-cta" href="#fluxo">
                Conhecer o fluxo <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>

            <button
              className="landing-menu-toggle"
              ref={menuButtonRef}
              type="button"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>
          {mobileMenuOpen && (
            <div className="landing-mobile-menu" id="landing-mobile-menu">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label} <ChevronRight size={17} aria-hidden="true" />
                </a>
              ))}
              <a href="/entrar" onClick={() => setMobileMenuOpen(false)}>
                Entrar no sistema <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          )}
        </header>

        <main id="conteudo">
          <section className="landing-hero" aria-labelledby="landing-heading">
            <div className="landing-hero-copy">
              <p className="landing-kicker">
                <span className="landing-kicker-line" /> Para o dia a dia da
                clínica
              </p>
              <h1 id="landing-heading">
                O próximo passo de cada paciente, claro para toda a equipe.
              </h1>
              <p className="landing-hero-description">
                Organize agenda, chegadas, documentos e retornos em um fluxo que
                acompanha o dia da clínica.
              </p>
              <div className="landing-hero-actions">
                <a className="landing-primary-cta" href="#fluxo">
                  Conhecer o fluxo <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a className="landing-hero-login" href="/entrar">
                  Entrar no sistema
                </a>
              </div>
            </div>
            <figure className="landing-hero-visual">
              <div className="landing-hero-visual-header">
                <span>ClinicFlow</span>
                <span>Cockpit do dia</span>
              </div>
              <picture>
                <source
                  media="(max-width: 600px)"
                  srcSet="/marketing/painel-mobile.webp"
                />
                <img
                  src="/marketing/painel.webp"
                  alt="Painel operacional do ClinicFlow com os próximos passos da equipe"
                  width="1440"
                  height="900"
                />
              </picture>
              <figcaption>
                Visão real do produto · Dados fictícios de demonstração
              </figcaption>
            </figure>
          </section>

          <section
            className="landing-showcase-section"
            aria-labelledby="showcase-title"
          >
            <div className="landing-showcase-intro">
              <span className="landing-section-index">EXPLORE O PRODUTO</span>
              <h2 id="showcase-title">
                Acompanhe cada etapa, no mesmo ritmo da clínica.
              </h2>
              <p>
                Escolha uma etapa para ver como o trabalho do dia se organiza.
              </p>
            </div>
            <section
              className="landing-showcase"
              aria-label="Explore o ClinicFlow por etapa"
            >
              <Tabs
                label="Etapas do fluxo da clínica"
                items={stages.map(({ value, label }) => ({ value, label }))}
                value={activeStage}
                onChange={setActiveStage}
                idPrefix="landing-stage"
                className="landing-showcase-tabs"
              />
              <TabPanel
                idPrefix="landing-stage"
                value={activeStage}
                className="landing-showcase-panel"
              >
                <div className="landing-preview-frame">
                  <div className="landing-preview-topbar" aria-hidden="true">
                    <span className="landing-preview-product">
                      ClinicFlow / {stage.label}
                    </span>
                    <span className="landing-preview-url">Visão da equipe</span>
                  </div>
                  <div className="landing-preview-image-wrap">
                    <picture>
                      <source
                        media="(max-width: 600px)"
                        srcSet={stage.mobileImage}
                      />
                      <img
                        src={stage.image}
                        alt={stage.imageAlt}
                        width="1440"
                        height="900"
                      />
                    </picture>
                  </div>
                </div>
                <div className="landing-showcase-caption">
                  <div>
                    <span>{stage.eyebrow}</span>
                    <strong>{stage.title}</strong>
                  </div>
                  <p>{stage.description}</p>
                </div>
              </TabPanel>
              <p className="landing-demo-note">
                Imagens do produto · Dados fictícios de demonstração
              </p>
            </section>
          </section>
        </main>
      </div>

      <section
        className="landing-journey landing-section"
        id="fluxo"
        aria-labelledby="journey-title"
      >
        <div className="landing-section-heading">
          <span className="landing-section-index">01 / O FLUXO</span>
          <h2 id="journey-title">
            Um dia de clínica tem muitas passagens. Deixe cada uma à vista.
          </h2>
          <p>
            Da primeira consulta marcada ao retorno, a recepção sabe onde
            encontrar o contexto e qual ação vem depois.
          </p>
        </div>
        <div className="landing-journey-grid">
          <article className="landing-journey-card">
            <div className="landing-card-icon">
              <CalendarDays size={24} aria-hidden="true" />
            </div>
            <span>01 / Agenda</span>
            <h3>Prepare o dia</h3>
            <p>
              Veja consultas por horário e acompanhe alterações sem procurar
              informações em vários lugares.
            </p>
          </article>
          <article className="landing-journey-card">
            <div className="landing-card-icon">
              <Check size={24} aria-hidden="true" />
            </div>
            <span>02 / Chegada</span>
            <h3>Receba com contexto</h3>
            <p>
              Registre quem chegou e mantenha a fila de espera visível para a
              equipe.
            </p>
          </article>
          <article className="landing-journey-card">
            <div className="landing-card-icon">
              <ClipboardList size={24} aria-hidden="true" />
            </div>
            <span>03 / Pendências</span>
            <h3>Resolva o que falta</h3>
            <p>
              Associe tarefas administrativas ao trabalho do dia, com
              responsáveis e estado claros.
            </p>
          </article>
          <article className="landing-journey-card">
            <div className="landing-card-icon">
              <RotateCcw size={24} aria-hidden="true" />
            </div>
            <span>04 / Retorno</span>
            <h3>Acompanhe o próximo contato</h3>
            <p>
              Guarde os retornos que precisam de atenção até a próxima ação
              acontecer.
            </p>
          </article>
        </div>
      </section>

      <section
        className="landing-reception landing-section"
        id="recepcao"
        aria-labelledby="reception-title"
      >
        <div className="landing-reception-copy">
          <span className="landing-section-index">02 / PARA A RECEPÇÃO</span>
          <h2 id="reception-title">
            Menos perguntas soltas. Mais clareza no balcão.
          </h2>
          <p>
            Um painel reúne o que está acontecendo agora: consultas do dia,
            pessoas aguardando e tarefas que ainda precisam de alguém.
          </p>
          <ul>
            <li>
              <Check size={18} aria-hidden="true" /> Veja o estado das consultas
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Acompanhe chegadas e espera
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Encontre pendências
              administrativas
            </li>
          </ul>
          <a href="#produto" className="landing-text-link">
            Ver o produto <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
        <figure className="landing-reception-figure">
          <img
            src="/marketing/painel.webp"
            alt="Painel do ClinicFlow com o resumo operacional do dia"
            loading="lazy"
            width="1440"
            height="900"
          />
          <figcaption>
            Visão do dia no ClinicFlow · Dados fictícios de demonstração
          </figcaption>
        </figure>
      </section>

      <section
        className="landing-product landing-section"
        id="produto"
        aria-labelledby="product-title"
      >
        <div className="landing-section-heading landing-product-heading">
          <span className="landing-section-index">03 / DENTRO DO PRODUTO</span>
          <h2 id="product-title">
            Uma visão para cada momento. O mesmo fluxo para todos.
          </h2>
          <p>
            As telas abaixo mostram como o ClinicFlow conecta as etapas
            administrativas da jornada.
          </p>
        </div>
        <div className="landing-product-grid">
          <figure>
            <div className="landing-product-image">
              <img
                src="/marketing/agenda.webp"
                alt="Tela de agenda do ClinicFlow"
                loading="lazy"
                width="1440"
                height="900"
              />
            </div>
            <figcaption>
              <span>Agenda</span>
              <span>Organize horários e estados</span>
            </figcaption>
          </figure>
          <figure>
            <div className="landing-product-image">
              <img
                src="/marketing/espera.webp"
                alt="Tela de espera do ClinicFlow"
                loading="lazy"
                width="1440"
                height="900"
              />
            </div>
            <figcaption>
              <span>Recepção</span>
              <span>Acompanhe quem chegou</span>
            </figcaption>
          </figure>
          <figure>
            <div className="landing-product-image">
              <img
                src="/marketing/retornos.webp"
                alt="Tela de retornos do ClinicFlow"
                loading="lazy"
                width="1440"
                height="900"
              />
            </div>
            <figcaption>
              <span>Retornos</span>
              <span>Cuide do próximo passo</span>
            </figcaption>
          </figure>
        </div>
        <p className="landing-product-note">Dados fictícios de demonstração</p>
      </section>

      <section
        className="landing-details landing-section"
        aria-label="Recursos para acompanhar a jornada"
      >
        <article>
          <div className="landing-detail-icon">
            <FileText size={26} aria-hidden="true" />
          </div>
          <span className="landing-section-index">FICHA E DOCUMENTOS</span>
          <h2>O contexto administrativo junto da pessoa.</h2>
          <p>
            Consulte os dados de cadastro e organize documentos associados ao
            paciente para o trabalho da recepção.
          </p>
        </article>
        <article>
          <div className="landing-detail-icon">
            <RotateCcw size={26} aria-hidden="true" />
          </div>
          <span className="landing-section-index">RETORNOS E TAREFAS</span>
          <h2>O que ficou pendente continua visível.</h2>
          <p>
            Crie tarefas, registre retornos e acompanhe o que falta resolver
            depois do atendimento.
          </p>
        </article>
      </section>

      <section
        className="landing-faq landing-section"
        id="perguntas"
        aria-labelledby="faq-title"
      >
        <div>
          <span className="landing-section-index">04 / PERGUNTAS</span>
          <h2 id="faq-title">Para entender onde o ClinicFlow entra.</h2>
        </div>
        <div className="landing-faq-list">
          <details>
            <summary>
              Para quem é o ClinicFlow?<span aria-hidden="true">+</span>
            </summary>
            <p>
              Para a operação de clínicas independentes, especialmente a
              recepção e a gestão que precisam acompanhar o dia da clínica.
            </p>
          </details>
          <details>
            <summary>
              O que posso acompanhar no mesmo fluxo?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              Agenda, chegada de pacientes, espera, tarefas administrativas,
              documentos associados ao cadastro e retornos.
            </p>
          </details>
          <details>
            <summary>
              O ClinicFlow substitui o prontuário médico?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              O foco do ClinicFlow é a operação administrativa da clínica. As
              telas apresentadas aqui mostram agenda, recepção e acompanhamento
              de pendências.
            </p>
          </details>
          <details>
            <summary>
              Posso explorar as telas antes de entrar?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              Sim. Use as abas acima para ver exemplos das principais etapas. As
              imagens usam dados fictícios de demonstração.
            </p>
          </details>
        </div>
      </section>

      <section className="landing-final" aria-labelledby="final-title">
        <span className="landing-section-index">
          CLINICFLOW / OPERAÇÃO CLARA
        </span>
        <h2 id="final-title">
          Do agendamento ao retorno, todo próximo passo à vista.
        </h2>
        <div>
          <a className="landing-primary-cta" href="#fluxo">
            Conhecer o fluxo <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="landing-final-login" href="/entrar">
            Entrar no sistema <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>
      <footer className="landing-footer">
        <a className="landing-brand" href="#topo">
          <BrandMark size="sm" />
          <span>
            ClinicFlow<span className="landing-brand-dot">.</span>
          </span>
        </a>
        <p>Operação clara para o dia da clínica.</p>
        <a href="#topo">Voltar ao início ↑</a>
      </footer>
    </div>
  );
}

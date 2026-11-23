import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export type Lang = "en" | "ru";
const LS_KEY = "firstnote-lang";

const listeners = new Set<() => void>();
let current: Lang | null = null;

function read(): Lang {
  if (current) return current;
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "en" || v === "ru") return (current = v);
    current = navigator.language?.toLowerCase().startsWith("ru") || navigator.language?.toLowerCase().startsWith("kk") ? "ru" : "en";
  } catch {
    current = "en";
  }
  return current;
}

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(LS_KEY, l);
    document.documentElement.lang = l;
  } catch {
    /* ignore */
  }
  listeners.forEach((f) => f());
}

function subscribe(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

const EN = {
  // common
  "common.save": "Save",
  "common.delete": "Delete",
  "common.cancel": "Cancel",
  "common.loading": "Loading…",
  "common.retry": "Retry",
  "common.signIn": "Sign in",
  "common.signOut": "Sign out",
  "common.unassigned": "Unassigned",
  "common.none": "None",
  "common.unknown": "Unknown",
  "common.name": "Name",
  "common.email": "Email",
  "common.password": "Password",
  "common.deleteConfirm": 'Delete "{name}"?',

  // landing
  "landing.kicker": "FIRST Tech Challenge 2026–27",
  "landing.title1": "One workspace for your whole ",
  "landing.title2": " season.",
  "landing.sub": "Countdown to every event, track award readiness, run the build board and finish the portfolio — synced live across the team.",
  "landing.enter": "Enter workspace",
  "landing.f1.t": "All 11 FTC awards",
  "landing.f1.d": "Requirements and owners per award.",
  "landing.f2.t": "Team Kanban",
  "landing.f2.d": "Hardware, software, outreach, logistics.",
  "landing.f3.t": "Journal & scorer",
  "landing.f3.d": "Daily logs and practice match stats.",

  // auth
  "auth.back": "Back to home",
  "auth.welcome": "Welcome back",
  "auth.join": "Join the team",
  "auth.create": "Create account",
  "auth.toUp": "New here? Create an account",
  "auth.toIn": "Already have an account? Sign in",
  "auth.google": "Continue with Google",
  "auth.or": "or with email",
  "auth.googleFail": "Google sign-in failed",
  "auth.checkEmail": "Check your email to confirm your account.",
  "auth.err.invalid": "Wrong email or password.",
  "auth.err.notConfirmed": "Email not confirmed. Open the message and click the link.",
  "auth.err.exists": "This email is already registered — sign in.",
  "auth.err.server": "The server is temporarily unavailable, please try again.",

  // profile / role / country
  "role.label": "Team role",
  "role.choose": "Choose team role",
  "role.custom": "Custom role",
  "role.placeholder": "Enter your role",
  "role.Captain": "Captain",
  "role.Hardware": "Hardware",
  "role.Software": "Software",
  "role.Driver": "Driver",
  "role.Outreach": "Outreach",
  "role.Portfolio": "Portfolio",
  "role.Mentor": "Mentor",
  "role.Member": "Member",
  "country.label": "Country",
  "country.whole": "Whole country",
  "country.hint": "You'll see FTC events of this country, with your area first.",
  "country.KZ": "Kazakhstan",
  "country.US": "USA",
  "country.CA": "Canada",
  "country.RO": "Romania",
  "country.TH": "Thailand",
  "country.BR": "Brazil",
  "country.GR": "Greece",
  "country.JM": "Jamaica",
  "area.KZ": "City / region",
  "area.US": "State",
  "area.CA": "Province",
  "area.RO": "County (județ)",
  "area.TH": "Province",
  "area.BR": "State",
  "area.GR": "Region",
  "area.JM": "Parish",
  "profile.title": "Your profile",
  "profile.edit": "Edit profile",
  "profile.avatar": "Avatar image URL",
  "profile.required": "Name and role are required",

  // app shell
  "tab.overview": "Overview",
  "tab.forum": "Forum",
  "fr.title": "Forum",
  "fr.sub": "Short posts from FTC teams around the world. Everyone on firstnote can see them.",
  "fr.everyone": "Everyone",
  "fr.composePh": "What's new with your team?",
  "fr.replyPh": "Write a reply…",
  "fr.post": "Post",
  "fr.reply": "Reply",
  "fr.like": "Like",
  "fr.delete": "Delete",
  "fr.deleteConfirm": "Delete this post?",
  "fr.empty": "No posts yet. Say hi to teams around the world!",
  "fr.loadFail": "Couldn't load the forum.",
  "fr.now": "now",
  "tab.awards": "Awards",
  "tab.board": "Board",
  "tab.journal": "Journal & Matches",
  "tab.portfolio": "Portfolio",
  "tab.roster": "Roster",
  "app.loadError": "Couldn't load your workspaces",
  "app.checkConnection": "Check your connection and try again.",
  "app.createJoin": "+ Create / join…",
  "app.createJoinShort": "Create / join…",
  "app.goOverview": "Go to overview",
  "onb.title1": "Set up your ",
  "onb.title2": "workspace",
  "onb.back": "Back to workspace",
  "onb.create": "Create a workspace",
  "onb.createBtn": "Create",
  "onb.teamPh": "Team name, e.g. Robo Wolves #12345",
  "onb.join": "Join with invite code",
  "onb.joinBtn": "Join",
  "onb.codePh": "e.g. A1B2C3",
  "onb.needName": "Enter a team name",
  "onb.needCode": "Enter an invite code",

  // overview
  "ov.title": "Overview",
  "ov.sub": "Countdown and team readiness",
  "ov.days": "Days",
  "ov.hrs": "Hrs",
  "ov.min": "Min",
  "ov.sec": "Sec",
  "ov.starts": "starts {time} local ({gmt})",
  "ov.yourTime": "your time{place}: {time}",
  "ov.otherEvent": "Other event, {time} (your time)",
  "ov.pick": "Pick an event",
  "ov.loadingEvents": "Loading events…",
  "ov.live": "It's on! Happening now",
  "ov.switchesIn": "Switches to the next event automatically in ~{h} h.",
  "ov.noTimes": "FIRST doesn't publish start times — countdown is to {hour}:00 local event time.",
  "ov.readiness": "Readiness",
  "ov.readinessSplit": "Tasks 60%, Portfolio 40%",
  "ov.chooseCountry": "Choose your country to see its FTC events. You can change it later in your profile.",
  "ov.showEvents": "Show events",
  "ov.ftcEvents": "FTC events",
  "ov.shown": "{n} shown",
  "ov.changeInProfile": "Change country / area in your profile",
  "ov.search": "Search event, city, code…",
  "ov.allOf": "All of {country}",
  "ov.you": " (you)",
  "ov.showPast": "Show past events",
  "ov.showAll": "Include kickoffs, workshops, interviews",
  "ov.loadFail": "Couldn't load the event list.",
  "ov.noMatch": "No events match these filters.",
  "ov.yourArea": "Your area: {area}",
  "ov.rest": "Rest of {country}",
  "ov.noneHere": "No upcoming FTC events here yet.",
  "ov.more": "Show more ({n} left)",
  "ov.source": "Source: FIRST Tech Challenge event list, 2026-27 BIOBUZZ season.",
  "ov.otherEvents": "Other events",
  "ov.notInFirst": "not in FIRST system yet",
  "ov.liveBadge": "Live",
  "ov.local": "local",
  "ov.yours": "yours",
  "ov.thNote": "No 2026-27 FTC Thailand events are published yet. Check back later or follow the official pages.",

  "kind.qualifier": "Qualifier",
  "kind.league_meet": "League Meet",
  "kind.league_tournament": "League Tournament",
  "kind.championship": "Championship",
  "kind.scrimmage": "Scrimmage",
  "kind.worlds": "World Championship",
  "kind.kickoff": "Kickoff",
  "kind.leadership": "Leadership Award",
  "kind.other": "Workshop / Other",

  "status.todo": "To Do",
  "status.in_progress": "In Progress",
  "status.review": "Review",
  "status.done": "Done",
  "page.not_started": "Not Started",
  "page.in_progress": "In Progress",
  "page.ready": "Ready",
  "cat.Hardware": "Hardware",
  "cat.Software": "Software",
  "cat.Portfolio": "Portfolio",
  "cat.Outreach": "Outreach",
  "cat.Logistics": "Logistics",

  // awards
  "aw.title": "Awards",
  "aw.sub": "Requirements and owners for every FTC award",
  "aw.opt": "(opt)",
  "aw.add": "Add requirement",
  "aw.complete": "{done} of {total} complete",
  "aw.empty": "No requirements yet. Add the first one.",

  // board
  "bd.title": "Task Board",
  "bd.sub": "Drag cards between columns, or open a card to change its status",
  "bd.allMembers": "All members",
  "bd.allCats": "All categories",
  "bd.task": "Task",

  // task dialog
  "task.edit": "Edit task",
  "task.new": "New task",
  "task.title": "Title",
  "task.details": "Details",
  "task.status": "Status",
  "task.category": "Category",
  "task.award": "Award",
  "task.assignee": "Assignee",
  "task.titleRequired": "Title required",
  "task.deleteConfirm": 'Delete task "{name}"?',

  // journal
  "jr.title": "Engineering Journal",
  "jr.sub": "Daily technical log",
  "jr.whatPh": "What did we work on?",
  "jr.contentPh": "Problem, iterations, results, next steps…",
  "jr.log": "Log entry",
  "jr.empty": "No journal entries yet. Log your first one above.",
  "jr.deleteEntry": "Delete entry",
  "ms.title": "Match Scorer",
  "ms.sub": "Practice runs",
  "ms.labelPh": "Match label",
  "ms.practice": "Practice #{n}",
  "ms.auto": "Auto",
  "ms.teleop": "TeleOp",
  "ms.endgame": "Endgame",
  "ms.total": "Total",
  "ms.save": "Save match",
  "ms.high": "High",
  "ms.avg": "Average",
  "ms.empty": "No matches saved yet.",
  "ms.deleteMatch": "Delete match",

  // portfolio / roster
  "pf.title": "Engineering Portfolio",
  "pf.sub": "15-page planner",
  "pf.ready": "{ready} / {total} pages ready",
  "pf.page": "PAGE",
  "rs.title": "Member Roster",
  "rs.sub": "Roles and workload",
  "rs.invite": "Invite code:",
  "rs.open": "open",
  "rs.done": "done",
  "rs.pages": "pages",
};

type Key = keyof typeof EN;

const RU: Record<Key, string> = {
  "common.save": "Сохранить",
  "common.delete": "Удалить",
  "common.cancel": "Отмена",
  "common.loading": "Загрузка…",
  "common.retry": "Повторить",
  "common.signIn": "Войти",
  "common.signOut": "Выйти",
  "common.unassigned": "Не назначено",
  "common.none": "Нет",
  "common.unknown": "Неизвестно",
  "common.name": "Имя",
  "common.email": "Email",
  "common.password": "Пароль",
  "common.deleteConfirm": "Удалить «{name}»?",

  "landing.kicker": "FIRST Tech Challenge 2026–27",
  "landing.title1": "Одно пространство на весь сезон ",
  "landing.title2": ".",
  "landing.sub": "Отсчёт до каждого ивента, готовность к наградам, доска задач и портфолио — всё синхронно для всей команды.",
  "landing.enter": "Войти в пространство",
  "landing.f1.t": "Все 11 наград FTC",
  "landing.f1.d": "Требования и ответственные по каждой награде.",
  "landing.f2.t": "Канбан команды",
  "landing.f2.d": "Hardware, software, outreach, логистика.",
  "landing.f3.t": "Журнал и счётчик",
  "landing.f3.d": "Ежедневные записи и статистика тренировочных матчей.",

  "auth.back": "На главную",
  "auth.welcome": "С возвращением",
  "auth.join": "Присоединяйся к команде",
  "auth.create": "Создать аккаунт",
  "auth.toUp": "Впервые здесь? Создай аккаунт",
  "auth.toIn": "Уже есть аккаунт? Войти",
  "auth.google": "Продолжить с Google",
  "auth.or": "или по почте",
  "auth.googleFail": "Не удалось войти через Google",
  "auth.checkEmail": "Проверь почту и подтверди аккаунт.",
  "auth.err.invalid": "Неверная почта или пароль.",
  "auth.err.notConfirmed": "Почта не подтверждена. Откройте письмо и нажмите ссылку.",
  "auth.err.exists": "Этот email уже зарегистрирован — войдите.",
  "auth.err.server": "Сервер временно недоступен, попробуйте ещё раз.",

  "role.label": "Роль в команде",
  "role.choose": "Выбери роль",
  "role.custom": "Своя роль",
  "role.placeholder": "Введи свою роль",
  "role.Captain": "Капитан",
  "role.Hardware": "Hardware",
  "role.Software": "Software",
  "role.Driver": "Пилот",
  "role.Outreach": "Outreach",
  "role.Portfolio": "Портфолио",
  "role.Mentor": "Ментор",
  "role.Member": "Участник",
  "country.label": "Страна",
  "country.whole": "Вся страна",
  "country.hint": "Будут показаны FTC-ивенты этой страны, сначала — в твоём регионе.",
  "country.KZ": "Казахстан",
  "country.US": "США",
  "country.CA": "Канада",
  "country.RO": "Румыния",
  "country.TH": "Таиланд",
  "country.BR": "Бразилия",
  "country.GR": "Греция",
  "country.JM": "Ямайка",
  "area.KZ": "Город / область",
  "area.US": "Штат",
  "area.CA": "Провинция",
  "area.RO": "Жудец (județ)",
  "area.TH": "Провинция",
  "area.BR": "Штат",
  "area.GR": "Регион",
  "area.JM": "Округ (parish)",
  "profile.title": "Твой профиль",
  "profile.edit": "Редактировать профиль",
  "profile.avatar": "Ссылка на аватар",
  "profile.required": "Имя и роль обязательны",

  "tab.overview": "Обзор",
  "tab.forum": "Форум",
  "fr.title": "Форум",
  "fr.sub": "Короткие посты FTC-команд со всего мира. Их видят все пользователи firstnote.",
  "fr.everyone": "Все",
  "fr.composePh": "Что нового у вашей команды?",
  "fr.replyPh": "Ответить…",
  "fr.post": "Опубликовать",
  "fr.reply": "Ответить",
  "fr.like": "Нравится",
  "fr.delete": "Удалить",
  "fr.deleteConfirm": "Удалить этот пост?",
  "fr.empty": "Постов пока нет. Поздоровайся с командами со всего мира!",
  "fr.loadFail": "Не удалось загрузить форум.",
  "fr.now": "сейчас",
  "tab.awards": "Награды",
  "tab.board": "Доска",
  "tab.journal": "Журнал и матчи",
  "tab.portfolio": "Портфолио",
  "tab.roster": "Состав",
  "app.loadError": "Не удалось загрузить пространства",
  "app.checkConnection": "Проверь интернет и попробуй ещё раз.",
  "app.createJoin": "+ Создать / вступить…",
  "app.createJoinShort": "Создать / вступить…",
  "app.goOverview": "К обзору",
  "onb.title1": "Настрой своё ",
  "onb.title2": "пространство",
  "onb.back": "Назад в пространство",
  "onb.create": "Создать пространство",
  "onb.createBtn": "Создать",
  "onb.teamPh": "Название команды, напр. Robo Wolves #12345",
  "onb.join": "Вступить по коду",
  "onb.joinBtn": "Вступить",
  "onb.codePh": "напр. A1B2C3",
  "onb.needName": "Введи название команды",
  "onb.needCode": "Введи код приглашения",

  "ov.title": "Обзор",
  "ov.sub": "Отсчёт и готовность команды",
  "ov.days": "Дни",
  "ov.hrs": "Часы",
  "ov.min": "Мин",
  "ov.sec": "Сек",
  "ov.starts": "начало {time} по местному ({gmt})",
  "ov.yourTime": "у тебя{place}: {time}",
  "ov.otherEvent": "Другое событие, {time} (твоё время)",
  "ov.pick": "Выбери ивент",
  "ov.loadingEvents": "Загружаю ивенты…",
  "ov.live": "Началось! Идёт прямо сейчас",
  "ov.switchesIn": "Переключится на следующий ивент автоматически примерно через {h} ч.",
  "ov.noTimes": "FIRST не публикует время начала — отсчёт до {hour}:00 по местному времени ивента.",
  "ov.readiness": "Готовность",
  "ov.readinessSplit": "Задачи 60%, Портфолио 40%",
  "ov.chooseCountry": "Выбери страну, чтобы видеть её FTC-ивенты. Потом можно поменять в профиле.",
  "ov.showEvents": "Показать ивенты",
  "ov.ftcEvents": "FTC-ивенты",
  "ov.shown": "показано {n}",
  "ov.changeInProfile": "Страну и регион можно поменять в профиле",
  "ov.search": "Поиск: ивент, город, код…",
  "ov.allOf": "Весь {country}",
  "ov.you": " (ты)",
  "ov.showPast": "Показать прошедшие",
  "ov.showAll": "Показать кикоффы, воркшопы, интервью",
  "ov.loadFail": "Не удалось загрузить список ивентов.",
  "ov.noMatch": "Нет ивентов по этим фильтрам.",
  "ov.yourArea": "Твой регион: {area}",
  "ov.rest": "Остальные: {country}",
  "ov.noneHere": "Здесь пока нет предстоящих FTC-ивентов.",
  "ov.more": "Показать ещё (осталось {n})",
  "ov.source": "Источник: список ивентов FIRST Tech Challenge, сезон 2026-27 BIOBUZZ.",
  "ov.otherEvents": "Другие события",
  "ov.notInFirst": "пока нет в системе FIRST",
  "ov.liveBadge": "Идёт",
  "ov.local": "местн.",
  "ov.yours": "у тебя",
  "ov.thNote": "Ивенты FTC Таиланда на сезон 2026-27 ещё не опубликованы. Загляни позже или следи за официальными страницами.",

  "kind.qualifier": "Квалификация",
  "kind.league_meet": "Встреча лиги",
  "kind.league_tournament": "Турнир лиги",
  "kind.championship": "Чемпионат",
  "kind.scrimmage": "Скриммедж",
  "kind.worlds": "Чемпионат мира",
  "kind.kickoff": "Кикофф",
  "kind.leadership": "Leadership Award",
  "kind.other": "Воркшоп / другое",

  "status.todo": "К выполнению",
  "status.in_progress": "В работе",
  "status.review": "На проверке",
  "status.done": "Готово",
  "page.not_started": "Не начато",
  "page.in_progress": "В работе",
  "page.ready": "Готово",
  "cat.Hardware": "Hardware",
  "cat.Software": "Software",
  "cat.Portfolio": "Портфолио",
  "cat.Outreach": "Outreach",
  "cat.Logistics": "Логистика",

  "aw.title": "Награды",
  "aw.sub": "Требования и ответственные по каждой награде FTC",
  "aw.opt": "(опц.)",
  "aw.add": "Добавить требование",
  "aw.complete": "Выполнено {done} из {total}",
  "aw.empty": "Требований пока нет. Добавь первое.",

  "bd.title": "Доска задач",
  "bd.sub": "Перетаскивай карточки между колонками или открой карточку, чтобы сменить статус",
  "bd.allMembers": "Все участники",
  "bd.allCats": "Все категории",
  "bd.task": "Задача",

  "task.edit": "Редактировать задачу",
  "task.new": "Новая задача",
  "task.title": "Название",
  "task.details": "Подробности",
  "task.status": "Статус",
  "task.category": "Категория",
  "task.award": "Награда",
  "task.assignee": "Исполнитель",
  "task.titleRequired": "Нужно название",
  "task.deleteConfirm": "Удалить задачу «{name}»?",

  "jr.title": "Инженерный журнал",
  "jr.sub": "Ежедневные технические записи",
  "jr.whatPh": "Над чем работали?",
  "jr.contentPh": "Проблема, итерации, результат, следующие шаги…",
  "jr.log": "Записать",
  "jr.empty": "Записей пока нет. Добавь первую выше.",
  "jr.deleteEntry": "Удалить запись",
  "ms.title": "Счётчик матчей",
  "ms.sub": "Тренировочные заезды",
  "ms.labelPh": "Название матча",
  "ms.practice": "Тренировка #{n}",
  "ms.auto": "Автоном",
  "ms.teleop": "TeleOp",
  "ms.endgame": "Эндгейм",
  "ms.total": "Итого",
  "ms.save": "Сохранить матч",
  "ms.high": "Рекорд",
  "ms.avg": "Среднее",
  "ms.empty": "Матчей пока нет.",
  "ms.deleteMatch": "Удалить матч",

  "pf.title": "Инженерное портфолио",
  "pf.sub": "План на 15 страниц",
  "pf.ready": "Готово страниц: {ready} / {total}",
  "pf.page": "СТР.",
  "rs.title": "Состав команды",
  "rs.sub": "Роли и загрузка",
  "rs.invite": "Код приглашения:",
  "rs.open": "открыто",
  "rs.done": "готово",
  "rs.pages": "стр.",
};

const DICTS: Record<Lang, Record<Key, string>> = { en: EN, ru: RU };

export type TFn = (key: Key, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? EN[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Current language + translator. Re-renders when the language changes. */
export function useI18n(): { lang: Lang; t: TFn; locale: string; setLang: (l: Lang) => void } {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Lang);
  return {
    lang,
    t: (key, vars) => translate(lang, key, vars),
    locale: lang === "ru" ? "ru-RU" : "en-US",
    setLang,
  };
}

/** Translated label for a stored English value (role, category…) — falls back to the raw value. */
export function tryT(t: TFn, prefix: string, value: string): string {
  const k = `${prefix}.${value}` as Key;
  return k in EN ? t(k) : value;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang: set } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border border-border text-xs", className)} role="group" aria-label="Language">
      {(["en", "ru"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          className={cn("px-2 py-1 text-xs font-medium transition", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          aria-pressed={lang === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

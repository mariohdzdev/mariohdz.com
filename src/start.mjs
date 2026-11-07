// The guided form at /start/ and /es/empezar/: the projects it starts, what it asks about each one, in English
// and Spanish, and how the answers read in my inbox, in Spanish. tools/build.mjs writes the form from these lists,
// and the Worker reads every answer against them, so only what the form asks can reach my inbox.
// Several projects can be chosen at once: each one adds its own questions and its own part of the estimate.

import { PRICES, PROJECTS, SERVICES } from "../tools/site.mjs";

/* Step 1: what's needed. The projects of tools/site.mjs, by service, and three ways in of their own. */

export const MORE = {
  glyph: "+",
  en: "Something else",
  es: "Otra cosa",
  projects: {
    "check-up": {
      price: PRICES.checkUp,
      mine: "Revisión técnica",
      en: { name: "A tech check-up", scope: "Your domain, email, website and accounts, looked over" },
      es: { name: "Una revisión técnica", scope: "Tu dominio, tu correo, tu web y tus cuentas, revisados" },
    },
    custom: {
      mine: "Proyecto a medida",
      en: { name: "Something made for you", scope: "A web app, an internal tool or anything not on this list" },
      es: { name: "Algo hecho a tu medida", scope: "Una app web, una herramienta interna o algo que no esté en la lista" },
    },
    unsure: {
      mine: "Aún no lo sabe",
      en: { name: "Not sure yet", scope: "Tell me what’s going on, and I’ll suggest where to start" },
      es: { name: "Aún no lo sé", scope: "Cuéntame qué pasa y te diré por dónde empezar" },
    },
  },
};

// Short names for the line that sums up the choice on phones, where the full names don't fit side by side.
export const SHORT = {
  "launch-package": { en: "Launch package", es: "Paquete de arranque" },
  website: { en: "Business website", es: "Web para tu negocio" },
  "one-page": { en: "One-page website", es: "Web de una página" },
  "business-email": { en: "Business email", es: "Correo profesional" },
  deliverability: { en: "Reaching the inbox", es: "Llegar a la bandeja" },
  "domain-recovery": { en: "Your domain back", es: "Recuperar tu dominio" },
  "ai-assistant": { en: "AI assistant", es: "Asistente de IA" },
  automation: { en: "Task automation", es: "Automatizar una tarea" },
  "private-ai": { en: "Private AI", es: "IA privada" },
  "check-up": { en: "Tech check-up", es: "Revisión técnica" },
  custom: { en: "Made for you", es: "A tu medida" },
  unsure: { en: "Not sure yet", es: "Aún no lo sé" },
};

const project = (key) => PROJECTS[key] ?? MORE.projects[key];
export const START_PROJECTS = [...SERVICES.flatMap((service) => service.projects), ...Object.keys(MORE.projects)];
export const projectName = (key, lang) => project(key)[lang].name;
export const projectScope = (key, lang) => project(key)[lang].scope;
export const projectPrice = (key) => project(key).price ?? null;
export const mineName = (key) => (PROJECTS[key] ? PROJECTS[key].es.name : MORE.projects[key].mine);

// What can't be chosen together: one website at a time, business email is already part of the launch package,
// and "not sure yet" stands alone. public/start.js applies the same rules as the boxes are ticked.
export const SITES = ["launch-package", "website", "one-page"];
export const INCLUDED = { "launch-package": ["business-email"] };
export const ALONE = "unsure";

// The projects chosen, in the form's order, once those rules are applied.
export function pickProjects(keys) {
  let chosen = START_PROJECTS.filter((key) => keys.includes(key));
  if (chosen.length > 1) chosen = chosen.filter((key) => key !== ALONE);
  const site = chosen.find((key) => SITES.includes(key));
  chosen = chosen.filter((key) => !SITES.includes(key) || key === site);
  for (const [key, included] of Object.entries(INCLUDED)) {
    if (chosen.includes(key)) chosen = chosen.filter((other) => !included.includes(other));
  }
  return chosen;
}

/* Step 2: what's already there. Each thing is answered yes, no or not sure, and nothing is required. */

export const ANSWERS = [
  { value: "yes", en: "Yes", es: "Sí", mine: "Sí" },
  { value: "no", en: "No", es: "No", mine: "No" },
  { value: "unsure", en: "Not sure", es: "No sé", mine: "No lo sabe" },
];

// [what it is, a line that explains it in plain words], and a short name for my inbox.
export const ITEMS = {
  domain: { mine: "Dominio", en: ["A domain", "Your address online, like yourbusiness.com"], es: ["Un dominio", "Tu dirección en internet, como tunegocio.com"] },
  access: { mine: "Acceso a la cuenta del dominio", en: ["Access to your domain’s account", "Where it renews each year, like GoDaddy or Namecheap"], es: ["Acceso a la cuenta de tu dominio", "Donde se renueva cada año, como GoDaddy o Namecheap"] },
  logo: { mine: "Logo", en: ["Your logo", "Ideally the original file"], es: ["Tu logo", "Mejor el archivo original"] },
  text: { mine: "Textos o notas", en: ["Text or notes about your business", "What you do, who it’s for and why people choose you"], es: ["Textos o notas sobre tu negocio", "Qué haces, para quién y por qué te eligen"] },
  photos: { mine: "Fotos propias", en: ["Photos of your own", "Of your work, your team or your place"], es: ["Fotos propias", "De tu trabajo, tu equipo o tu local"] },
  mailbox: { mine: "Correo con su dominio", en: ["Email on your domain", "An address like hello@yourbusiness.com"], es: ["Correo con tu dominio", "Una dirección como hola@tunegocio.com"] },
  site: { mine: "Web", en: ["A website", "Even an old one"], es: ["Una web", "Aunque sea antigua"] },
  old: { mine: "Mensajes que conservar", en: ["Old messages to keep", "From the address you use today"], es: ["Mensajes antiguos que conservar", "De la dirección que usas hoy"] },
  list: { mine: "Lista de buzones", en: ["A list of who needs an address", "People, or shared ones like billing@"], es: ["La lista de quién necesita dirección", "Personas, o compartidas como facturas@"] },
  senders: { mine: "Lista de lo que envía correo", en: ["A list of what sends email for you", "Your mailbox, website forms, newsletters, invoices or a CRM"], es: ["La lista de lo que envía correo por ti", "Tu buzón, los formularios de la web, boletines, facturas o un CRM"] },
  example: { mine: "Ejemplo del fallo", en: ["An example of what goes wrong", "A message that landed in spam, or a form that never arrived"], es: ["Un ejemplo de lo que falla", "Un mensaje que acabó en spam, o un formulario que nunca llegó"] },
  proof: { mine: "Pruebas de que el negocio es suyo", en: ["Proof the business is yours", "A registration, an invoice or a bank statement in its name"], es: ["Pruebas de que el negocio es tuyo", "Un registro, una factura o un extracto bancario a su nombre"] },
  foothold: { mine: "Algún acceso", en: ["Any access you still have", "To the domain, the website or the email"], es: ["Algún acceso que conserves", "Al dominio, a la web o al correo"] },
  reach: { mine: "Contacto con quien lo tiene", en: ["A way to reach whoever has it", "Even if you no longer work together"], es: ["Una forma de contactar a quien lo tiene", "Aunque ya no trabajen juntos"] },
  docs: { mine: "Documentos", en: ["The documents it should learn from", "Guides, price lists, policies or past answers"], es: ["Los documentos de los que debe aprender", "Guías, listas de precios, políticas o respuestas anteriores"] },
  examples: { mine: "Ejemplos de buen trabajo", en: ["Examples of good work", "A few emails or documents done the way you like"], es: ["Ejemplos de trabajo bien hecho", "Algunos correos o documentos hechos como te gustan"] },
  aiPlan: { mine: "Plan de IA", en: ["An AI plan for your team", "Like ChatGPT, Claude, Copilot or Gemini"], es: ["Un plan de IA para tu equipo", "Como ChatGPT, Claude, Copilot o Gemini"] },
  steps: { mine: "La tarea por pasos", en: ["The task, step by step", "Even as rough notes"], es: ["La tarea, paso a paso", "Aunque sea en notas sueltas"] },
  appAccess: { mine: "Acceso a las apps", en: ["Access to the apps it connects", "As a user you add, not with your password"], es: ["Acceso a las apps que conecta", "Como un usuario que añades tú, no con tu contraseña"] },
  sample: { mine: "Ejemplo real", en: ["A real example to start from", "A form, a spreadsheet or an email"], es: ["Un ejemplo real del que partir", "Un formulario, una hoja de cálculo o un correo"] },
  computer: { mine: "Equipo reciente", en: ["A recent computer", "Bought in the last four years or so"], es: ["Un equipo reciente", "Comprado en los últimos cuatro años, más o menos"] },
  remote: { mine: "Acceso remoto", en: ["A way to connect remotely", "So it can be set up without a visit"], es: ["Una forma de conectarme a distancia", "Para instalarla sin visitarte"] },
  files: { mine: "Archivos", en: ["The files it will work with", "Contracts, financial records or client data"], es: ["Los archivos con los que trabajará", "Contratos, registros financieros o datos de clientes"] },
};

// What step 2 stops asking once another answer makes it moot: without a domain there's no account to reach
// and no address on it. public/start.js folds these away, and the Worker reads them as a no.
export const UNLESS = { access: ["domain", "no"], mailbox: ["domain", "no"] };

// Step 2 asks for what every project chosen needs, each thing once, under these headings.
export const GROUPS = [
  { items: ["domain", "access", "mailbox"], en: "Your domain and email", es: "Tu dominio y tu correo" },
  { items: ["logo", "text", "photos", "site"], en: "Your website", es: "Tu web" },
  { items: ["old", "list", "senders", "example"], en: "Your email", es: "Tu correo" },
  { items: ["proof", "foothold", "reach"], en: "Getting your domain back", es: "Recuperar tu dominio" },
  { items: ["docs", "examples", "aiPlan"], en: "Your AI assistant", es: "Tu asistente de IA" },
  { items: ["steps", "appAccess", "sample"], en: "The task to automate", es: "La tarea que quieres automatizar" },
  { items: ["computer", "remote", "files"], en: "Your computer", es: "Tu equipo" },
];

/* Steps 2 and 3, by kind of project: what step 2 asks (`have`, or `first` when there's nothing to have yet),
   the details step 3 asks under the kind's own heading, and the heading in my inbox (`mine`). `only` limits
   a detail to some of the kind's projects. */

export const KINDS = {
  web: { projects: SITES, have: ["domain", "access", "logo", "text", "photos", "mailbox"], details: ["size", "pages", "features", "mailboxes"], en: "Your website", es: "Tu web", mine: "La web" },
  email: { projects: ["business-email"], have: ["domain", "access", "old", "list"], details: ["mailboxes", "provider"], en: "Your business email", es: "Tu correo profesional", mine: "El correo" },
  inbox: { projects: ["deliverability"], have: ["access", "senders", "example"], details: ["issues"], en: "Email that reaches the inbox", es: "Correo que llega a la bandeja", mine: "Correo a la bandeja" },
  recovery: { projects: ["domain-recovery"], have: ["proof", "foothold", "reach"], details: ["holder"], en: "Getting your domain back", es: "Recuperar tu dominio", mine: "Recuperar el dominio" },
  assistant: { projects: ["ai-assistant"], have: ["docs", "examples", "aiPlan"], details: ["people", "confidential"], en: "Your AI assistant", es: "Tu asistente de IA", mine: "El asistente de IA" },
  automation: { projects: ["automation"], have: ["steps", "appAccess", "sample"], details: ["hours", "apps"], en: "The task to automate", es: "La tarea que quieres automatizar", mine: "La automatización" },
  private: { projects: ["private-ai"], have: ["computer", "remote", "files"], details: ["system"], en: "Your private AI", es: "Tu IA privada", mine: "La IA privada" },
  checkup: { projects: ["check-up"], have: ["domain", "access", "mailbox", "site"], details: ["worries"], en: "Your tech check-up", es: "Tu revisión técnica", mine: "La revisión técnica" },
  custom: { projects: ["custom"], first: ["idea", "tools"], have: [], details: [], en: "Tell me your idea", es: "Cuéntame tu idea", mine: "A medida" },
  unsure: { projects: ["unsure"], first: ["symptoms"], have: [], details: [], en: "What’s going on?", es: "¿Qué está pasando?", mine: "Aún no lo sabe" },
};

export const kindOf = (key) => Object.keys(KINDS).find((kind) => KINDS[kind].projects.includes(key));
// The projects of this kind a detail is limited to, or null when it applies to all of them.
export const onlyFor = (kind, question) => question.only?.filter((key) => KINDS[kind].projects.includes(key)) ?? null;
// What step 2 asks for these kinds of project, each thing once, in the order of the headings.
export const itemsFor = (kinds) => GROUPS.flatMap((group) => group.items).filter((item) => kinds.some((kind) => KINDS[kind].have.includes(item)));

// An option: what's sent, how it reads on each page and, when it differs, in my inbox.
const option = (value, en, es, mine = es, more = {}) => ({ value, en, es, mine, ...more });

export const QUESTIONS = {
  size: {
    type: "one", only: ["launch-package"], mine: "Tamaño", en: "One page, or up to five?", es: "¿Una página o hasta cinco?",
    options: [option("one", "One page", "Una página"), option("five", "Up to five pages", "Hasta cinco páginas", undefined, { price: PRICES.upToFivePages })],
  },
  pages: {
    type: "one", only: ["website"], mine: "Páginas", en: "How many pages do you have in mind?", es: "¿Cuántas páginas tienes en mente?",
    options: [
      option("few", "2 or 3", "2 o 3"),
      option("five", "4 or 5", "4 o 5"),
      option("more", "More than 5", "Más de 5", undefined, { sub: { en: `+$${PRICES.extraPage} for each one after five`, es: `+${PRICES.extraPage} USD cada una a partir de la sexta` } }),
      option("unsure", "Not sure", "No lo sé", "No lo sabe"),
    ],
  },
  features: {
    type: "many", mine: "Lo que debe hacer la web", en: "What should your website do?", es: "¿Qué debe hacer tu web?",
    options: [
      option("form", "Take messages with a form", "Recibir mensajes con un formulario", "Formulario"),
      option("whatsapp", "A WhatsApp button", "Un botón de WhatsApp", "Botón de WhatsApp"),
      option("booking", "Bookings, with the tool you use", "Reservas, con la herramienta que ya uses", "Reservas con su herramienta"),
      option("map", "A map and opening hours on the site", "Mapa y horario en la web", "Mapa y horario"),
      option("reviews", "Reviews from clients", "Reseñas de clientes"),
      option("gallery", "A gallery of your work", "Galería de trabajos"),
      option("languages", "In English and Spanish", "En español e inglés", "En dos idiomas", { extra: "languages" }),
      option("listing", "Your business on Google Maps", "Tu negocio en Google Maps", "Ficha en Google Maps", { extra: "listing" }),
    ],
  },
  mailboxes: {
    type: "count", only: ["launch-package", "business-email"], min: 1, max: 50, mine: "Buzones",
    en: "How many email addresses?", es: "¿Cuántas direcciones de correo?",
    hint: {
      en: `Up to ${PRICES.includedMailboxes} are included, and each extra one is $${PRICES.extraMailbox}`,
      es: `Incluye hasta ${PRICES.includedMailboxes}, y cada una más cuesta ${PRICES.extraMailbox} USD`,
    },
  },
  provider: {
    type: "one", mine: "Correo actual", en: "What do you use for email today?", es: "¿Qué usas hoy para el correo?",
    options: [
      option("free", "A Gmail or Outlook address", "Una dirección de Gmail u Outlook", "Gmail u Outlook personal"),
      option("google", "Google Workspace", "Google Workspace"),
      option("microsoft", "Microsoft 365", "Microsoft 365"),
      option("other", "Another provider", "Otro proveedor"),
      option("unsure", "Not sure", "No lo sé", "No lo sabe"),
    ],
  },
  issues: {
    type: "many", mine: "Qué pasa", en: "What’s happening?", es: "¿Qué está pasando?",
    options: [
      option("spam", "Messages land in spam", "Los mensajes acaban en spam", "Mensajes en spam"),
      option("forms", "Website forms don’t arrive", "Los formularios de la web no llegan", "Formularios que no llegan"),
      option("spoof", "Someone sends email pretending to be you", "Alguien envía correos haciéndose pasar por ti", "Suplantan su dominio"),
      option("check", "Nothing yet, I’d like it checked", "Nada aún, quiero que lo revises", "Solo quiere una revisión"),
    ],
  },
  holder: {
    type: "one", mine: "Quién lo tiene", en: "Who has it now?", es: "¿Quién lo tiene ahora?",
    options: [
      option("agency", "A former designer or agency", "Un diseñador o una agencia anterior", "Diseñador o agencia anterior"),
      option("person", "A former employee or partner", "Un exempleado o un exsocio", "Exempleado o exsocio"),
      option("unsure", "I don’t know", "No lo sé", "No lo sabe"),
    ],
  },
  people: { type: "count", min: 1, max: 500, mine: "Personas que lo usarán", en: "How many people will use it?", es: "¿Cuántas personas lo usarán?" },
  confidential: {
    type: "one", mine: "Información confidencial", en: "Will it work with confidential information?", es: "¿Trabajará con información confidencial?",
    hint: { en: "Client data, contracts or finances", es: "Datos de clientes, contratos o finanzas" },
    options: [option("yes", "Yes", "Sí"), option("no", "No", "No"), option("unsure", "Not sure", "No sé", "No lo sabe")],
  },
  hours: {
    type: "one", mine: "Tiempo a la semana", en: "How much time does it take each week?", es: "¿Cuánto tiempo te quita cada semana?",
    options: [
      option("few", "Under 2 hours", "Menos de 2 horas"),
      option("some", "2 to 5 hours", "De 2 a 5 horas"),
      option("many", "More than 5 hours", "Más de 5 horas"),
      option("unsure", "Not sure", "No lo sé", "No lo sabe"),
    ],
  },
  apps: {
    type: "line", max: 200, mine: "Apps", en: "Which apps are involved?", es: "¿Qué apps intervienen?",
    placeholder: { en: "A form, a spreadsheet, your CRM…", es: "Un formulario, una hoja de cálculo, tu CRM…" },
  },
  system: {
    type: "one", mine: "Equipo", en: "Which computer is it?", es: "¿Qué equipo es?",
    options: [option("windows", "Windows", "Windows"), option("mac", "Mac", "Mac"), option("linux", "Linux", "Linux"), option("unsure", "Not sure", "No lo sé", "No lo sabe")],
  },
  worries: {
    type: "many", mine: "Le preocupa", en: "Is anything worrying you?", es: "¿Te preocupa algo?",
    options: [
      option("spam", "Messages land in spam", "Los mensajes acaban en spam", "Mensajes en spam"),
      option("domain", "I’m not sure who controls my domain", "No sé quién controla mi dominio", "No sabe quién controla su dominio"),
      option("site", "My website feels slow or out of date", "Mi web va lenta o se ve anticuada", "Web lenta o anticuada"),
      option("access", "Too many people can get into our accounts", "Demasiada gente entra en nuestras cuentas", "Demasiados accesos"),
    ],
  },
  idea: {
    type: "text", max: 3000, mine: "La idea", en: "Your idea", es: "Tu idea",
    placeholder: { en: "What it should do, and who will use it", es: "Qué debe hacer y quién lo usará" },
  },
  tools: {
    type: "line", max: 200, mine: "Lo que usa hoy", en: "What you use today", es: "Lo que usas hoy",
    placeholder: { en: "Spreadsheets, a CRM, Google Workspace…", es: "Hojas de cálculo, un CRM, Google Workspace…" },
  },
  symptoms: {
    type: "many", mine: "Lo que le pasa", en: "What’s going on?", es: "¿Qué está pasando?",
    options: [
      option("site", "My website looks old, or I don’t have one", "Mi web se ve anticuada, o no tengo", "Web anticuada o sin web", { suggests: "one-page" }),
      option("spam", "My emails land in spam", "Mis correos acaban en spam", "Correos en spam", { suggests: "deliverability" }),
      option("domain", "I’m not sure who controls my domain", "No sé quién controla mi dominio", "No sabe quién controla su dominio", { suggests: "domain-recovery" }),
      option("mailbox", "We still write from a Gmail or Outlook address", "Aún escribimos desde Gmail u Outlook", "Escribe desde Gmail u Outlook", { suggests: "business-email" }),
      option("tasks", "Repetitive tasks eat hours every week", "Las tareas repetitivas se comen horas cada semana", "Tareas repetitivas", { suggests: "automation" }),
      option("ai", "I’d like to use AI with our documents", "Quiero usar IA con nuestros documentos", "IA con sus documentos", { suggests: "ai-assistant" }),
    ],
  },
};

/* Steps 3 and 4: what every project asks. */

export const COMMON = {
  when: {
    type: "one", mine: "Para cuándo", en: "When would you like it?", es: "¿Para cuándo lo quieres?",
    options: [option("asap", "As soon as possible", "Lo antes posible"), option("soon", "In 2 or 3 months", "En 2 o 3 meses"), option("later", "No rush", "Sin prisa")],
  },
  site: {
    type: "line", max: 200, mine: "Web o dominio", en: "Your website or domain", es: "Tu web o tu dominio",
    placeholder: { en: "yourbusiness.com", es: "tunegocio.com" },
  },
  want: {
    type: "one", mine: "Te pide", en: "What would you like from me?", es: "¿Qué te gustaría recibir?",
    options: [
      option("plan", "A plan with a fixed price", "Un plan con precio cerrado"),
      option("price", "An idea of the price, for now", "Una idea del precio, por ahora", "Una idea del precio"),
    ],
  },
  channel: {
    type: "one", mine: "Canal", en: "How would you like to talk?", es: "¿Cómo prefieres que hablemos?",
    options: [option("email", "By email", "Por correo"), option("call", "On a 20-minute video call", "En una videollamada de 20 minutos", "Quiere una videollamada")],
  },
  slot: {
    type: "one", mine: "Franja", en: "When suits you best?", es: "¿Cuándo te viene mejor?",
    options: [option("morning", "In the morning", "Por la mañana"), option("afternoon", "In the afternoon", "Por la tarde")],
  },
  tz: { type: "zone", mine: "Zona horaria", en: "Your time zone", es: "Tu zona horaria" },
  source: {
    type: "pick", mine: "Cómo llegó", en: "How did you find this site?", es: "¿Cómo llegaste aquí?",
    placeholder: { en: "Choose one", es: "Elige una opción" },
    options: [
      option("search", "On Google or another search engine", "En Google u otro buscador", "Google u otro buscador"),
      option("ai", "An AI assistant, like ChatGPT, Claude or Gemini", "Un asistente de IA, como ChatGPT, Claude o Gemini", "Un asistente de IA"),
      option("referral", "Someone recommended you", "Me lo recomendaron", "Recomendación"),
      option("social", "Social media", "Redes sociales"),
      option("other", "Somewhere else", "Otro sitio"),
    ],
  },
};

// The time zones people pick from when they'd like a call: the U.S., Latin America and Spain. A browser in any
// other zone adds its own to the list.
export const ZONES = [
  ["America/New_York", "Eastern (New York)", "Este de EE. UU. (Nueva York)"],
  ["America/Chicago", "Central (Chicago)", "Centro de EE. UU. (Chicago)"],
  ["America/Denver", "Mountain (Denver)", "Montaña de EE. UU. (Denver)"],
  ["America/Phoenix", "Arizona", "Arizona"],
  ["America/Los_Angeles", "Pacific (Los Angeles)", "Pacífico de EE. UU. (Los Ángeles)"],
  ["America/Anchorage", "Alaska", "Alaska"],
  ["Pacific/Honolulu", "Hawaii", "Hawái"],
  ["America/Puerto_Rico", "Atlantic (Puerto Rico)", "Atlántico (Puerto Rico)"],
  ["America/Mexico_City", "Mexico City", "Ciudad de México"],
  ["America/Tegucigalpa", "Central America", "Centroamérica"],
  ["America/Bogota", "Bogotá, Lima and Quito", "Bogotá, Lima y Quito"],
  ["America/Santo_Domingo", "Santo Domingo", "Santo Domingo"],
  ["America/Caracas", "Caracas", "Caracas"],
  ["America/Santiago", "Santiago de Chile", "Santiago de Chile"],
  ["America/Argentina/Buenos_Aires", "Buenos Aires", "Buenos Aires"],
  ["Europe/Madrid", "Madrid", "Madrid"],
];
const ZONE_PATTERN = /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/;

// What an extra adds, for the project and the size chosen: a second language costs more on a bigger site,
// and the launch package already includes the Google Maps listing.
export function extraPrice(extra, key, size) {
  const big = key === "website" || (key === "launch-package" && size === "five");
  if (extra === "languages") return big ? PRICES.secondLanguage.upToFive : PRICES.secondLanguage.onePage;
  if (extra === "listing") return key === "launch-package" ? 0 : PRICES.mapsListing;
  return 0;
}

/* Reading what was sent */

// Trims the value and drops control characters, keeping line breaks.
export function clean(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .trim();
}

const line = (value, max) => clean(value).replace(/\s+/g, " ").slice(0, max);

// Field names: step 2 is have_<thing>, a detail is <kind>_<question>, and the rest keep their own name.
export const haveName = (item) => `have_${item}`;
export const detailName = (kind, question) => `${kind}_${question}`;

function readQuestion(form, name, question) {
  const values = question.options?.map((choice) => choice.value);
  if (question.type === "one" || question.type === "pick") {
    const value = clean(form.get(name));
    return values.includes(value) ? value : null;
  }
  if (question.type === "many") return [...new Set(form.getAll(name).map(clean))].filter((value) => values.includes(value));
  if (question.type === "count") {
    const value = clean(form.get(name));
    if (!/^\d{1,4}$/.test(value)) return null;
    const number = Number(value);
    return number >= question.min && number <= question.max ? number : null;
  }
  if (question.type === "zone") {
    const value = clean(form.get(name));
    return value.length <= 64 && ZONE_PATTERN.test(value) ? value : null;
  }
  if (question.type === "line") return line(form.get(name), question.max) || null;
  return clean(form.get(name)).slice(0, question.max) || null;
}

// Everything the form sent that belongs to the projects chosen, checked against the lists above.
// Returns null when no known project was chosen.
export function readStart(form) {
  const projects = pickProjects(form.getAll("project").map(clean));
  if (!projects.length) return null;
  const kinds = [...new Set(projects.map(kindOf))];
  const read = (item) => {
    const answer = clean(form.get(haveName(item)));
    return ANSWERS.some((choice) => choice.value === answer) ? answer : null;
  };
  const have = itemsFor(kinds).map((item) => {
    const [other, value] = UNLESS[item] ?? [];
    return [item, other && read(other) === value ? "no" : read(item)];
  });
  const details = {};
  for (const kind of kinds) {
    details[kind] = {};
    for (const name of [...(KINDS[kind].first ?? []), ...KINDS[kind].details]) {
      const question = QUESTIONS[name];
      const only = onlyFor(kind, question);
      if (only && !only.some((key) => projects.includes(key))) continue;
      details[kind][name] = readQuestion(form, detailName(kind, name), question);
    }
  }
  const common = {};
  for (const [name, question] of Object.entries(COMMON)) common[name] = readQuestion(form, name, question);
  if (common.channel !== "call") common.slot = common.tz = null;
  return { projects, kinds, have, details, ...common };
}

/* What it adds up to */

// The suggestion for "not sure yet": one worry points to its project, several to a check-up.
export function suggestion(symptoms = []) {
  const picked = QUESTIONS.symptoms.options.filter((choice) => symptoms.includes(choice.value));
  if (!picked.length) return null;
  if (picked.length > 1) return { project: "check-up", price: PRICES.checkUp };
  const key = picked[0].suggests;
  return { project: key, price: projectPrice(key) };
}

// The estimate the visitor saw: for each project, where it starts and what each extra adds, and anything
// priced apart. `open` means something chosen gets its price in the plan: something made to measure, or
// "not sure yet" with nothing picked. Null when nothing chosen has a price yet.
export function estimate(data) {
  const parts = [];
  let open = false;
  for (const key of data.projects) {
    if (key === "custom") {
      open = true;
      continue;
    }
    if (key === ALONE) {
      const picked = suggestion(data.details.unsure?.symptoms);
      if (picked) parts.push({ project: picked.project, base: picked.price, lines: [], notes: [], suggested: true });
      else open = true;
      continue;
    }
    const kind = kindOf(key);
    const details = data.details[kind] ?? {};
    const part = { project: key, base: projectPrice(key), lines: [], notes: [] };
    if (kind === "web") {
      if (key === "launch-package" && details.size === "five") part.lines.push(["Hasta cinco páginas", PRICES.upToFivePages]);
      for (const extra of ["languages", "listing"]) {
        const price = extraPrice(extra, key, details.size);
        if (details.features?.includes(extra) && price) part.lines.push([QUESTIONS.features.options.find((choice) => choice.value === extra).mine, price]);
      }
      if (key === "website" && details.pages === "more") part.notes.push(`+${PRICES.extraPage} USD por cada página a partir de la sexta`);
    }
    const boxes = details.mailboxes;
    if (boxes > PRICES.includedMailboxes) {
      const more = boxes - PRICES.includedMailboxes;
      part.lines.push([`${more} ${more === 1 ? "buzón más" : "buzones más"}`, more * PRICES.extraMailbox]);
    }
    parts.push(part);
  }
  if (!parts.length) return null;
  const total = parts.reduce((sum, part) => sum + part.base + part.lines.reduce((add, [, price]) => add + price, 0), 0);
  return { total, parts, open };
}

const TYPES = {
  ready: { tag: "Listo", name: "Todo listo para empezar", tone: "ready" },
  guide: { tag: "Orientar", name: "Necesita orientación", tone: "guide" },
  price: { tag: "Precio", name: "Busca un precio", tone: "price" },
};

// What kind of client this is, why, and what I do next. The rules are few and plain on purpose:
// a price question gets a short answer, doubts get questions first, and a clear request gets a plan.
export function classify(data) {
  const answer = Object.fromEntries(data.have);
  const doubts = data.have.filter(([, value]) => value === "unsure").length;
  // A domain that's there but out of reach comes before any plan. An access left unanswered isn't taken as a no.
  const blocked = answer.domain === "yes" && (answer.access === "no" || answer.access === "unsure");
  const priced = estimate(data);
  const custom = data.projects.includes("custom");
  const lost = data.projects.includes(ALONE);
  if (data.want === "price") {
    return {
      ...TYPES.price,
      key: "price",
      why: "Quiere una idea del precio antes de decidir.",
      next: !priced || priced.open ? "Respuesta corta: un rango orientativo y lo que te falta saber para cerrarlo." : data.projects.length > 1 ? "Respuesta corta: la estimación y los enlaces a las páginas de los proyectos." : "Respuesta corta: la estimación y el enlace a la página del proyecto.",
    };
  }
  const reasons = [];
  if (lost) reasons.push("no sabe qué proyecto necesita");
  if (custom) reasons.push(data.projects.length > 1 ? "incluye algo a medida" : "es un proyecto a medida");
  if (doubts >= 2) reasons.push(`tiene ${doubts} dudas`);
  if (blocked) reasons.push("no controla su dominio");
  if (reasons.length) {
    const said = reasons.join(", ").replace(/, ([^,]*)$/, " y $1");
    let next = "Hazle dos o tres preguntas, o proponle la revisión técnica de 300 USD.";
    if (blocked) next = "Antes del plan, averigua quién controla su dominio.";
    else if (custom) next = "Pregúntale lo que falte para definir el alcance antes de dar un precio.";
    else if (lost) {
      const suggested = priced?.parts[0];
      if (!suggested) next = "Pregúntale qué le pasa y proponle por dónde empezar.";
      else if (suggested.project === "check-up") next = "Proponle la revisión técnica: con varias cosas a la vez, es lo que más le aclara.";
      else next = `Proponle empezar por «${mineName(suggested.project)}», desde ${suggested.base} USD.`;
    }
    return { ...TYPES.guide, key: "guide", why: `${said[0].toUpperCase()}${said.slice(1)}.`, next };
  }
  const why = data.want === "plan" ? "Sabe lo que quiere, pide un plan y no tiene dudas importantes." : "Sabe lo que quiere y no tiene dudas importantes.";
  const next = data.projects.length > 1 ? "Envíale un plan con precio cerrado y plazos para cada proyecto." : "Envíale el plan con precio cerrado y plazos.";
  return { ...TYPES.ready, key: "ready", why, next };
}

// Notes for me, from fixed rules: what's missing, what it may lead to and how to reply.
export function hints(data) {
  const notes = [];
  const add = (text) => notes.push(text);
  const answer = Object.fromEntries(data.have);
  const has = (kind) => data.kinds.includes(kind);
  const details = (kind) => data.details[kind] ?? {};
  const missing = (item) => answer[item] === "no" || answer[item] === "unsure";
  const chose = (key) => data.projects.includes(key);

  if ("domain" in answer) {
    if (answer.domain === "no") add("No tiene dominio: lo registras a su nombre (unos 10–15 USD al año, aparte).");
    if (answer.domain === "unsure") add("No sabe si tiene dominio: búscalo por el nombre del negocio antes de responder.");
    if (answer.domain === "yes" && missing("access")) add("No controla su dominio: averigua quién lo tiene. Puede tocar «Tu dominio y tus cuentas, de nuevo a tu nombre», desde 400 USD.");
  }
  if (has("web")) {
    if (missing("logo")) add("Sin logo claro: no está incluido. Pregúntale si alguien se lo hizo.");
    if (missing("text")) add("Sin textos: los escribes tú desde sus notas, como prometen tus páginas. Pídeselas pronto.");
    if (missing("photos")) add("Sin fotos propias: fotos de banco, o unas sencillas hechas con el móvil.");
    if (has("email")) add("Pide la web y el correo por separado: el paquete de arranque cuesta lo mismo y además incluye la ficha de Google Maps.");
    else if (answer.mailbox === "no" && !chose("launch-package")) add("No tiene correo con su dominio: encaja el paquete de arranque o «Correo profesional con tu dominio», desde 500 USD.");
    if (details("web").features?.includes("booking")) add("Quiere reservas: pregúntale qué herramienta usa.");
    if (details("web").pages === "unsure") add("No sabe cuántas páginas: propón una estructura en el plan.");
  }
  if (has("email")) {
    if (answer.old === "yes") add("Quiere conservar mensajes: incluye la migración en el plan.");
    if (missing("list")) add("No tiene clara la lista de buzones: pregúntale quién escribe en nombre del negocio.");
    const provider = details("email").provider;
    if (provider === "free") add("Escribe desde Gmail u Outlook personal: cuéntale qué gana con su dominio y recomiéndale un plan de correo (se paga aparte, por persona y mes).");
    if (provider === "unsure") add("No sabe qué usa para el correo: pregúntale antes del plan; quizá necesite contratar uno (se paga aparte, por persona y mes).");
  }
  if (has("inbox")) {
    if (missing("access") && answer.domain !== "yes") add("Sin acceso al dominio no se pueden tocar sus registros: que te añada como usuario.");
    if (missing("senders")) add("No sabe qué envía correo por su dominio: sale en los informes DMARC de las primeras semanas.");
    if (details("inbox").issues?.includes("spoof")) add("Alguien suplanta su dominio: DMARC es lo primero.");
  }
  if (has("recovery")) {
    if (missing("proof")) add("Sin pruebas claras: pídele un registro, una factura o un extracto a nombre del negocio.");
    if (answer.foothold === "no") add("No conserva ningún acceso: la recuperación irá por el registrador y puede tardar más.");
    if (missing("reach")) add("Sin contacto con quien lo tiene: toca ir por el registrador.");
    if (details("recovery").holder === "unsure") add("No sabe quién lo tiene: empieza por el WHOIS y el registrador.");
  }
  if (has("assistant")) {
    if (missing("docs")) add("Sin documentos reunidos: el primer paso será juntarlos.");
    if (missing("aiPlan")) add("Sin plan de IA: recomiéndale uno; se paga aparte, por persona y mes.");
    const confidential = details("assistant").confidential;
    if (confidential && confidential !== "no" && !chose("private-ai")) add("Puede haber información confidencial: valora «IA privada en tu propio equipo», desde 600 USD.");
  }
  if (has("automation")) {
    if (missing("steps")) add("La tarea no está escrita: pídele que te la cuente paso a paso.");
    if (missing("appAccess")) add("Sin acceso a las apps: que te añada como usuario.");
    if (details("automation").hours === "many") add("Le quita más de 5 horas a la semana: el ahorro justifica el precio.");
  }
  if (has("private")) {
    if (missing("computer")) add("Equipo dudoso: revisa memoria y procesador antes de cobrar.");
    if (missing("remote")) add("Sin acceso remoto claro: explícale cómo vas a conectarte.");
    if (details("private").system === "unsure") add("No sabe qué equipo tiene: pídele el modelo.");
  }
  if (has("custom")) add("Algo a medida: define el alcance antes de dar un precio.");
  if (data.channel === "email") add("Lo quiere por correo: no le propongas una llamada.");
  if (data.channel === "call") {
    const when = data.slot ? ` ${optionMine(COMMON.slot, data.slot).toLowerCase()}` : "";
    const zone = data.tz ? ` Su zona: ${zoneName(data.tz)}.` : "";
    add(`Quiere una videollamada de 20 minutos: proponle dos o tres horas${when} y mándale el enlace.${zone}`);
  }
  return notes;
}

const optionMine = (question, value) => question.options.find((choice) => choice.value === value)?.mine ?? "";
const zoneName = (zone) => ZONES.find(([value]) => value === zone)?.[2] ?? zone;

/* The message to my inbox: an HTML version to read at a glance, and the same in plain text. */

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const usd = (amount) => `${amount} USD`;

// A reference people can quote: the day, and three characters that can't be mistaken for one another.
export function reference(now = new Date()) {
  const letters = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const random = crypto.getRandomValues(new Uint8Array(3));
  const day = `${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `MH-${day}-${[...random].map((byte) => letters[byte % letters.length]).join("")}`;
}

// Everything the message shows, in the order it shows it.
function summary(data) {
  const type = classify(data);
  const priced = estimate(data);
  const facts = [
    [data.projects.length > 1 ? "Proyectos" : "Proyecto", data.projects.map(mineName).join(" + ")],
    ["Estimación", priced ? `Desde ${usd(priced.total)}${priced.open ? " + a medida" : ""}` : "Por definir"],
    ["Para cuándo", data.when ? optionMine(COMMON.when, data.when) : "Sin indicar"],
    ["Te pide", data.want ? optionMine(COMMON.want, data.want) : "Sin indicar"],
  ];
  const have = data.have.map(([item, value]) => [ITEMS[item].mine, value]);
  // Each kind of project keeps its answers under its own heading; what every project asks comes last.
  const sections = [];
  for (const kind of data.kinds) {
    const rows = [];
    const answers = data.details[kind] ?? {};
    for (const name of [...(KINDS[kind].first ?? []), ...KINDS[kind].details]) {
      if (!(name in answers)) continue;
      const question = QUESTIONS[name];
      const value = answers[name];
      if (value === null || (Array.isArray(value) && !value.length)) continue;
      let shown = value;
      if (question.type === "one") shown = optionMine(question, value);
      if (question.type === "many") shown = value.map((picked) => optionMine(question, picked)).join(" · ");
      rows.push([question.mine, String(shown), question.type === "text"]);
    }
    const part = priced?.parts.find((candidate) => !candidate.suggested && kindOf(candidate.project) === kind);
    if (part?.lines.length) rows.push(["Extras", part.lines.map(([name, price]) => `${name} (+${usd(price)})`).join(" · ")]);
    for (const note of part?.notes ?? []) rows.push(["Aparte", note]);
    if (rows.length) sections.push([KINDS[kind].mine, rows]);
  }
  const rest = [];
  if (data.site) rest.push([COMMON.site.mine, data.site, false, true]);
  if (data.channel === "call") {
    if (data.slot) rest.push([COMMON.slot.mine, optionMine(COMMON.slot, data.slot)]);
    if (data.tz) rest.push([COMMON.tz.mine, zoneName(data.tz)]);
  }
  if (data.source) rest.push([COMMON.source.mine, optionMine(COMMON.source, data.source)]);
  if (rest.length) sections.push(["Otros datos", rest]);
  return { type, facts, have, sections, notes: hints(data), channel: data.channel ? optionMine(COMMON.channel, data.channel) : "Canal sin indicar" };
}

export function startEmail(data, { name, email, business, message, lang, ref, flagged }) {
  const { type, facts, have, sections, notes, channel } = summary(data);
  const subject = `${flagged ? "[Possible spam] " : ""}[${type.tag}] ${data.projects.map(mineName).join(" + ")} · ${name} · ${ref}`;
  const form = lang === "es" ? "español" : "inglés";
  const answered = have.filter(([, value]) => value !== null);
  const ready = have.filter(([, value]) => value === "yes").length;
  const status = (value) => ({ yes: "✓ Sí", no: "– No", unsure: "? No lo sabe" })[value] ?? "Sin responder";
  const said = (value) => ANSWERS.find((choice) => choice.value === value)?.mine ?? "Sin responder";

  const text = [
    `[${type.tag}] ${type.name} · ${channel}`,
    business ? `${name} · ${business}` : name,
    type.why,
    "",
    ...facts.map(([label, value]) => `${label}: ${value}`),
    `→ ${type.next}`,
    ...(have.length ? ["", `LO QUE YA TIENE (${ready} de ${have.length})`, ...have.map(([label, value]) => `- ${label}: ${said(value)}`)] : []),
    ...sections.flatMap(([title, rows]) => ["", title.toUpperCase(), ...rows.map(([label, value]) => `- ${label}: ${value}`)]),
    ...(notes.length ? ["", "AVISOS PARA TI", ...notes.map((note) => `- ${note}`)] : []),
    ...(message ? ["", "SU MENSAJE", message] : []),
    ...(flagged ? ["", "Posible spam: alguien rellenó el campo oculto que solo ven los bots."] : []),
    "",
    "-- ",
    `Formulario guiado en ${form} · Referencia ${ref}`,
    `Al responder, le escribes a ${name} <${email}>`,
  ].join("\n");

  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const tones = {
    ready: "background:#e3efe9;color:#144f3d",
    guide: "background:#f7ecd5;color:#674508",
    price: "background:#e5edf5;color:#22405d",
  };
  const pill = (content, style, cls) => `<span class="${cls}" style="display:inline-block;margin:0 6px 6px 0;padding:5px 11px;border-radius:999px;font-size:13px;font-weight:600;line-height:1.3;${style}">${content}</span>`;
  const heading = (content) => `<p class="faint" style="margin:0 0 8px;color:#5f676b;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase">${content}</p>`;
  const section = (content) => `<tr><td style="padding:22px 28px 0">${content}</td></tr>`;
  const row = (left, right, rightStyle = "", rightClass = "ink") =>
    `<tr><td class="ink rule" style="padding:9px 12px 9px 0;border-top:1px solid #e3e6e8;color:#13191d;font-size:15px;line-height:1.45;vertical-align:top">${left}</td><td class="${rightClass} rule" align="right" style="padding:9px 0;border-top:1px solid #e3e6e8;font-size:15px;line-height:1.45;vertical-align:top;${rightStyle}">${right}</td></tr>`;
  const statusStyle = { yes: "color:#21624d;font-weight:600", no: "color:#5f676b", unsure: "color:#8a5800;font-weight:600" };
  const tile = ([label, value]) =>
    `<td class="tile" width="48%" style="width:48%;padding:12px 14px;background:#f5f6f4;border:1px solid #e6e9e6;border-radius:10px;vertical-align:top"><p class="faint" style="margin:0 0 3px;color:#5f676b;font-size:12px">${escape(label)}</p><p class="ink" style="margin:0;color:#13191d;font-size:15px;font-weight:600;line-height:1.35">${escape(value)}</p></td>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escape(subject)}</title>
<style>
@media (prefers-color-scheme: dark) {
  .page { background: #0c0c0d !important; }
  .card { background: #161719 !important; border-color: #2a2d2e !important; }
  .ink { color: #edeef0 !important; }
  .muted { color: #bfc1c3 !important; }
  .faint { color: #96989b !important; }
  .rule { border-color: #2a2d2e !important; }
  .tile { background: #1d2022 !important; border-color: #2a2d2e !important; }
  .tone-ready { background: #173a2e !important; color: #bdecd9 !important; }
  .tone-guide { background: #3b2c0f !important; color: #f4d898 !important; }
  .tone-price { background: #1d2d3d !important; color: #c3d7ec !important; }
  .tone-plain { background: #222527 !important; color: #c6c8cb !important; }
  .yes { color: #8cd6ba !important; }
  .unsure { color: #f0c76e !important; }
  .no { color: #a0a3a6 !important; }
  .accent { color: #8cd6ba !important; }
  .quote { border-color: #3c3e3f !important; }
}
</style>
</head>
<body class="page" style="margin:0;padding:24px 12px;background:#f2f3f0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<tr><td align="center">
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-collapse:separate;background:#ffffff;border:1px solid #dce0e3;border-radius:14px;${font}">
<tr><td style="padding:26px 28px 0">
${pill(escape(type.name), tones[type.tone], `tone-${type.tone}`)}${pill(escape(channel), "background:#eef0f1;color:#3b4246", "tone-plain")}
<p class="ink" style="margin:8px 0 4px;color:#13191d;font-size:21px;font-weight:600;line-height:1.3">${escape(name)}${business ? ` <span class="muted" style="color:#495155;font-weight:400">· ${escape(business)}</span>` : ""}</p>
<p class="muted" style="margin:0;color:#495155;font-size:15px;line-height:1.5">${escape(type.why)}</p>
</td></tr>
<tr><td style="padding:18px 28px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;margin:-8px 0">
<tr>${tile(facts[0])}<td width="4%" style="width:4%"></td>${tile(facts[1])}</tr>
<tr>${tile(facts[2])}<td width="4%" style="width:4%"></td>${tile(facts[3])}</tr>
</table>
<p class="ink" style="margin:16px 0 0;color:#13191d;font-size:15px;line-height:1.5"><span class="accent" style="color:#21624d;font-weight:600">→</span> ${escape(type.next)}</p>
</td></tr>
${have.length ? section(`${heading(`Lo que ya tiene · ${ready} de ${have.length}${answered.length < have.length ? ` · ${have.length - answered.length} sin responder` : ""}`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${have.map(([label, value]) => row(escape(label), status(value), statusStyle[value] ?? "color:#5f676b", value ?? "faint")).join("")}</table>`) : ""}
${sections.map(([title, rows], i) => section(`${i === 0 ? heading("Detalles") : ""}<p class="ink" style="margin:0 0 6px;color:#13191d;font-size:14px;font-weight:600">${escape(title)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.map(([label, value, long, literal]) => (long ? `<tr><td colspan="2" class="ink rule" style="padding:9px 0;border-top:1px solid #e3e6e8;color:#13191d;font-size:15px;line-height:1.5"><span class="faint" style="display:block;color:#5f676b;font-size:13px;margin-bottom:2px">${escape(label)}</span>${escape(value).replace(/\n/g, "<br>")}</td></tr>` : row(`<span class="faint" style="color:#5f676b">${escape(label)}</span>`, literal ? `<span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px">${escape(value)}</span>` : escape(value), "color:#13191d"))).join("")}</table>`)).join("\n")}
${notes.length ? section(`${heading("Avisos para ti")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${notes.map((note) => `<tr><td class="accent" style="width:18px;padding:5px 0;color:#21624d;font-size:15px;line-height:1.5;vertical-align:top">›</td><td class="ink" style="padding:5px 0;color:#13191d;font-size:15px;line-height:1.5">${escape(note)}</td></tr>`).join("")}</table>`) : ""}
${message ? section(`${heading("Su mensaje")}<p class="ink quote" style="margin:0;padding:2px 0 2px 14px;border-left:3px solid #c6cbcf;color:#13191d;font-size:15px;line-height:1.6">${escape(message).replace(/\n/g, "<br>")}</p>`) : ""}
${flagged ? section(`<p style="margin:0;padding:10px 12px;border-radius:8px;background:#fbe9e8;color:#8f1d19;font-size:14px">Posible spam: alguien rellenó el campo oculto que solo ven los bots.</p>`) : ""}
<tr><td style="padding:24px 28px 26px">
<p class="faint" style="margin:0;color:#5f676b;font-size:12px;line-height:1.6">Formulario guiado en ${form} · Referencia ${escape(ref)}<br>Al responder, le escribes a ${escape(name)} &lt;${escape(email)}&gt;</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html, type: type.key };
}

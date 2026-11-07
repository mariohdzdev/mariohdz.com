// Serves the site and sends the contact form to my inbox.
// Everything except /api/contact is a static file from public/.

const INBOX = "contact@mariohdz.com";
// Automatic mail goes out from a subdomain, so it never touches the reputation or the DMARC record of my own inbox.
const SENDER = { email: "form@notify.mariohdz.com", name: "mariohdz.com" };
const LIMITS = { name: 100, email: 254, message: 5000 };
// A full form is a few kilobytes, and stays well under this even when every character is percent-encoded.
const MAX_BODY = 64 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// What the topic menu on the form sends, and how each one reads in my inbox.
const TOPICS = {
  website: "Website",
  email: "Email and domain",
  ai: "AI and automation",
  other: "Something else",
};
// What a card's "Start this project" button sends, and how each project reads in my inbox.
const PROJECTS = {
  "launch-package": "Launch package",
  website: "A website for your business",
  "one-page": "A one-page website",
  "business-email": "Business email on your domain",
  deliverability: "Email that reaches the inbox",
  "domain-recovery": "Your domain and accounts, back in your name",
  "ai-assistant": "An AI assistant for your business",
  automation: "Automating a repetitive task",
  "private-ai": "Private AI on your own computer",
  "check-up": "Tech check-up",
  "care-plan": "Care plan",
};

// The English and Spanish pages post the same form; a hidden field says which one the visitor used.
const TEXT = {
  en: {
    unreadable: "Your message couldn’t be read. Please try again.",
    name: "Please add your name.",
    longName: "Please use a shorter name.",
    email: "Please check your email address.",
    message: "Please tell me what you need.",
    longMessage: "Please keep your message under 5,000 characters.",
    busy: "Too many messages came from your connection just now. Please wait a minute and try again, or write to contact@mariohdz.com.",
    failed: "Your message couldn’t be sent. Please try again, or write to contact@mariohdz.com.",
    sentTitle: "Message sent",
    sentText: "Thanks for writing. I’ll reply to the email address you left within one business day.",
    errorTitle: "Not sent yet",
    goBack: "Go back and check the form.",
    home: "Back to the site",
    homeUrl: "/",
    page: "English",
  },
  es: {
    unreadable: "No se pudo leer tu mensaje. Inténtalo de nuevo.",
    name: "Escribe tu nombre.",
    longName: "Usa un nombre más corto.",
    email: "Revisa tu dirección de correo.",
    message: "Cuéntame qué necesitas.",
    longMessage: "El mensaje no puede pasar de 5000 caracteres.",
    busy: "Llegaron demasiados mensajes desde tu conexión hace un momento. Espera un minuto y vuelve a intentarlo, o escríbeme a contact@mariohdz.com.",
    failed: "No se pudo enviar tu mensaje. Inténtalo de nuevo o escríbeme a contact@mariohdz.com.",
    sentTitle: "Mensaje enviado",
    sentText: "Gracias por escribir. Te responderé en un día laborable a la dirección que dejaste.",
    errorTitle: "Aún no se ha enviado",
    goBack: "Vuelve atrás y revisa el formulario.",
    home: "Volver al sitio",
    homeUrl: "/es/",
    page: "Spanish",
  },
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/contact") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
      }
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  // The page sends the form with fetch and asks for JSON; without JavaScript the browser posts it as a normal form.
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  // Until the form is read, the page it was sent from says which language to answer in.
  let lang = refererLang(request);
  const reply = (status, message) => respond(wantsJson, lang, status, message);

  try {
    // Generous, because offices and mobile networks put many people behind one IP address.
    const { success } = await env.CONTACT_LIMIT.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" });
    if (!success) {
      log("limited", { lang }, "warn");
      return reply(429, TEXT[lang].busy);
    }

    const body = await readBody(request);
    if (!body) {
      log("too_large", { lang }, "warn");
      return reply(413, TEXT[lang].longMessage);
    }

    let form;
    try {
      const type = request.headers.get("Content-Type") || "";
      form = await new Response(body, { headers: { "Content-Type": type } }).formData();
    } catch {
      log("unreadable", { lang });
      return reply(400, TEXT[lang].unreadable);
    }

    const chosen = form.get("lang");
    if (chosen === "en" || chosen === "es") lang = chosen;
    const text = TEXT[lang];

    // Bots fill in the hidden field; people never see it. A browser or password manager could still fill it in
    // for someone, so the message isn't dropped: it arrives marked as possible spam, for me to judge.
    const flagged = clean(form.get("website")) !== "";

    const name = clean(form.get("name")).replace(/\s+/g, " ");
    const email = clean(form.get("email"));
    const message = clean(form.get("message"));
    const topicKey = clean(form.get("topic"));
    const topic = Object.hasOwn(TOPICS, topicKey) ? TOPICS[topicKey] : "";
    const projectKey = clean(form.get("project"));
    const project = Object.hasOwn(PROJECTS, projectKey) ? PROJECTS[projectKey] : "";

    const invalid = (field, problem) => {
      log("invalid", { lang, field, flagged });
      return reply(400, problem);
    };
    if (!name) return invalid("name", text.name);
    if (name.length > LIMITS.name) return invalid("name", text.longName);
    if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) return invalid("email", text.email);
    if (!message) return invalid("message", text.message);
    if (message.length > LIMITS.message) return invalid("message", text.longMessage);

    const details = [`${name} <${email}>`];
    if (project) details.push(`Project: ${project}`);
    if (topic) details.push(`Topic: ${topic}`);
    details.push(`Sent from the ${text.page} contact form on mariohdz.com`);
    if (flagged) details.push("Possible spam: the hidden field that only bots see was filled in.");
    // The project, when a card started one, says more than the topic, so it leads the subject.
    const about = project || topic;
    const subject = `${flagged ? "[Possible spam] " : ""}${about ? `${about}: ` : ""}${name} via mariohdz.com`;

    try {
      const sent = await env.EMAIL.send({
        from: SENDER,
        to: INBOX,
        replyTo: { email, name },
        subject,
        text: `${message}\n\n-- \n${details.join("\n")}`,
      });
      log("sent", { lang, topic: topic ? topicKey : null, project: project ? projectKey : null, flagged, messageId: sent?.messageId ?? null });
    } catch (error) {
      log("failed", { lang, flagged, code: error?.code ?? null, error: error?.message ?? String(error) }, "error");
      return reply(502, text.failed);
    }

    return reply(200);
  } catch (error) {
    // Anything unexpected still gets an answer, and a line in the logs.
    log("error", { lang, error: String(error?.stack || error) }, "error");
    return reply(500, TEXT[lang].failed);
  }
}

// One line per submission in Workers Logs, kept for seven days: what happened, never who wrote or what they said.
function log(outcome, details, level = "log") {
  console[level]({ form: "contact", outcome, ...details });
}

function refererLang(request) {
  try {
    return new URL(request.headers.get("Referer") ?? "").pathname.startsWith("/es/") ? "es" : "en";
  } catch {
    return "en";
  }
}

// Reads the body only up to MAX_BODY, so an oversized request is turned away without being read in full.
async function readBody(request) {
  if (Number(request.headers.get("Content-Length")) > MAX_BODY) return null;
  if (!request.body) return new Blob([]);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return new Blob(chunks);
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
}

// Trims the value and drops control characters, keeping line breaks in the message.
function clean(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .trim();
}

function respond(wantsJson, lang, status, message) {
  return wantsJson ? jsonReply(status, message) : pageReply(status, message, lang);
}

function jsonReply(status, message) {
  const body = status === 200 ? { ok: true } : { ok: false, message };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// A plain page for browsers without JavaScript, styled by the site's own stylesheet.
function pageReply(status, message, lang) {
  const text = TEXT[lang];
  const sent = status === 200;
  const title = sent ? text.sentTitle : text.errorTitle;
  // Only a problem with the form itself sends the visitor back to it; the other messages say what to do.
  const fixable = status === 400 || status === 413;
  const body = sent ? text.sentText : fixable ? `${message} ${text.goBack}` : message;
  const html = `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · Mario Hernández</title>
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light dark">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main>
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-id">
          <h1 class="name">${title}</h1>
          <p class="tagline mono">${body} <a href="${text.homeUrl}">${text.home}</a>.</p>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

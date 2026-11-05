// Serves the site and sends the contact form to my inbox.
// Everything except /api/contact is a static file from public/.

const INBOX = "contact@mariohdz.com";
// Automatic mail goes out from a subdomain, so it never touches the reputation or the DMARC record of my own inbox.
const SENDER = { email: "form@notify.mariohdz.com", name: "mariohdz.com" };
const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// What the topic menu on the form sends, and how each one reads in my inbox.
const TOPICS = {
  website: "Website",
  email: "Email and domain",
  ai: "AI and automation",
  computers: "Computers and privacy",
  other: "Something else",
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

  let form;
  try {
    form = await request.formData();
  } catch {
    return respond(wantsJson, "en", 400, TEXT.en.unreadable);
  }

  const lang = form.get("lang") === "es" ? "es" : "en";
  const text = TEXT[lang];
  const reply = (status, message) => respond(wantsJson, lang, status, message);

  // Bots fill in the hidden field; people never see it. Pretend it worked so they move on.
  if (String(form.get("website") || "").trim()) return reply(200);

  const name = clean(form.get("name")).replace(/\s+/g, " ");
  const email = clean(form.get("email"));
  const message = clean(form.get("message"));
  const topic = TOPICS[clean(form.get("topic"))];

  if (!name) return reply(400, text.name);
  if (name.length > LIMITS.name) return reply(400, text.longName);
  if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) return reply(400, text.email);
  if (!message) return reply(400, text.message);
  if (message.length > LIMITS.message) return reply(400, text.longMessage);

  const details = [`${name} <${email}>`];
  if (topic) details.push(`Topic: ${topic}`);
  details.push(`Sent from the ${text.page} contact form on mariohdz.com`);

  try {
    await env.EMAIL.send({
      from: SENDER,
      to: INBOX,
      replyTo: { email, name },
      subject: topic ? `${topic}: ${name} via mariohdz.com` : `${name} via mariohdz.com`,
      text: `${message}\n\n-- \n${details.join("\n")}`,
    });
  } catch (error) {
    console.error("Contact form email failed", error?.code, error?.message);
    return reply(502, text.failed);
  }

  return reply(200);
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
  const body = sent ? text.sentText : `${message} ${text.goBack}`;
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

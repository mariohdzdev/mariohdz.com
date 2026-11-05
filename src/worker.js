// Serves the site and sends the contact form to my inbox.
// Everything except /api/contact is a static file from public/.

const INBOX = "contact@mariohdz.com";
// Automatic mail goes out from a subdomain, so it never touches the reputation or the DMARC record of my own inbox.
const SENDER = { email: "form@notify.mariohdz.com", name: "mariohdz.com" };
const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const reply = wantsJson ? jsonReply : pageReply;

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, "Your message couldn’t be read. Please try again.");
  }

  // Bots fill in the hidden field; people never see it. Pretend it worked so they move on.
  if (String(form.get("website") || "").trim()) return reply(200);

  const name = clean(form.get("name")).replace(/\s+/g, " ");
  const email = clean(form.get("email"));
  const message = clean(form.get("message"));

  if (!name) return reply(400, "Please add your name.");
  if (name.length > LIMITS.name) return reply(400, "Please use a shorter name.");
  if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) return reply(400, "Please check your email address.");
  if (!message) return reply(400, "Please tell me what you need.");
  if (message.length > LIMITS.message) return reply(400, "Please keep your message under 5,000 characters.");

  try {
    await env.EMAIL.send({
      from: SENDER,
      to: INBOX,
      replyTo: { email, name },
      subject: `${name} via mariohdz.com`,
      text: `${message}\n\n-- \n${name} <${email}>\nSent from the contact form on mariohdz.com`,
    });
  } catch (error) {
    console.error("Contact form email failed", error?.code, error?.message);
    return reply(502, "Your message couldn’t be sent. Please try again, or write to contact@mariohdz.com.");
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

function jsonReply(status, message) {
  const body = status === 200 ? { ok: true } : { ok: false, message };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// A plain page for browsers without JavaScript, styled by the site's own stylesheet.
function pageReply(status, message) {
  const sent = status === 200;
  const title = sent ? "Message sent" : "Not sent yet";
  const text = sent
    ? "Thanks for writing. I’ll reply to the email address you left."
    : `${message} Go back and check the form.`;
  const html = `<!doctype html>
<html lang="en">
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
      <div class="wrap hero-inner">
        <h1 class="name">${title}</h1>
        <p class="tagline mono">${text} <a href="/">Back to the site</a>.</p>
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

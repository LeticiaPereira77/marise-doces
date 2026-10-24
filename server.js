const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "marise";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "site-state.json");

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error("Configure ADMIN_PASSWORD e SESSION_SECRET nas variáveis de ambiente antes de iniciar.");
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ active: true, message: "Estamos preparando novidades deliciosas. Em breve estaremos de volta!" }, null, 2));
}
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { active: true, message: "Estamos preparando novidades deliciosas. Em breve estaremos de volta!" }; }
}
function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "marise_admin_session",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 2 * 60 * 60 * 1000 }
}));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: "Muitas tentativas. Aguarde 15 minutos e tente novamente." });
const publicDir = path.join(__dirname, "public");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function maintenancePage(message) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#713b7c"><title>Em breve | MARISE DOCES</title>
  <style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#fffaf5,#f7e2ec);font-family:system-ui,-apple-system,Segoe UI,Arial;color:#352936}.card{max-width:650px;width:100%;padding:clamp(28px,6vw,58px);text-align:center;background:#fff;border:1px solid #eadce9;border-radius:28px;box-shadow:0 20px 60px #713b7c18}.logo{font-weight:900;letter-spacing:1.5px;color:#713b7c;font-size:1.2rem}.icon{font-size:3.5rem;margin:22px 0 8px}h1{font-size:clamp(2rem,6vw,3.3rem);line-height:1.05;color:#4f2b59;margin:10px 0 18px}p{color:#786b79;font-size:1.05rem;line-height:1.7}.btn{display:inline-block;margin-top:14px;padding:13px 20px;border-radius:999px;background:#713b7c;color:#fff;text-decoration:none;font-weight:800}</style></head>
  <body><main class="card"><div class="logo">MARISE DOCES</div><div class="icon">🎀 🍪 🎄</div><h1>Estamos preparando novidades deliciosas!</h1><p>${escapeHtml(message)}</p><p>Estamos cuidando de cada detalhe para voltar com muitas delícias feitas com carinho.</p><a class="btn" href="https://wa.me/5531989519616" target="_blank" rel="noopener">Fale conosco pelo WhatsApp</a></main></body></html>`;
}
function requireAdmin(req, res, next) {
  if (!req.session || req.session.isAdmin !== true) return res.redirect("/admin");
  next();
}
app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/admin", (req, res) => {
  if (req.session && req.session.isAdmin) return res.send(adminPage(readState()));
  res.send(loginPage(""));
});
app.post("/admin/login", loginLimiter, (req, res) => {
  const user = String(req.body.username || "");
  const pass = String(req.body.password || "");
  if (user !== ADMIN_USER || pass !== ADMIN_PASSWORD) return res.status(401).send(loginPage("Usuário ou senha incorretos."));
  req.session.regenerate(err => {
    if (err) return res.status(500).send(loginPage("Não foi possível iniciar a sessão. Tente novamente."));
    req.session.isAdmin = true;
    res.redirect("/admin");
  });
});
app.post("/admin/logout", requireAdmin, (req, res) => req.session.destroy(() => res.redirect("/admin")));
app.post("/admin/settings", requireAdmin, (req, res) => {
  const active = req.body.active === "on";
  const message = String(req.body.message || "").trim().slice(0, 400) || "Estamos preparando novidades deliciosas. Em breve estaremos de volta!";
  writeState({ active, message });
  res.redirect("/admin?saved=1");
});
app.get("/", (req, res) => {
  const state = readState();
  if (!state.active) return res.status(503).send(maintenancePage(state.message));
  res.sendFile(path.join(publicDir, "index.html"));
});
app.use((req, res, next) => {
  if (req.path === "/admin" || req.path.startsWith("/admin/") || req.path === "/health") return next();
  const state = readState();
  if (!state.active) return res.status(503).send(maintenancePage(state.message));
  express.static(publicDir)(req, res, next);
});
function loginPage(error) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administração | MARISE DOCES</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:linear-gradient(145deg,#fffaf5,#f7e2ec);font-family:system-ui,Arial;color:#352936}.panel{width:100%;max-width:430px;background:white;border:1px solid #eadce9;border-radius:24px;padding:30px;box-shadow:0 18px 50px #713b7c18}.brand{text-align:center;color:#713b7c;font-weight:900;letter-spacing:1px;font-size:1.2rem}h1{text-align:center;color:#4f2b59;font-size:1.6rem}p{color:#786b79;text-align:center}.field{margin:16px 0}.field label{display:block;font-weight:700;margin-bottom:6px}.field input{width:100%;padding:12px;border:1px solid #d8c8d7;border-radius:10px;font:inherit}.btn{width:100%;padding:13px;border:0;border-radius:999px;background:#713b7c;color:#fff;font-weight:800;font-size:1rem;cursor:pointer}.error{color:#a61b36;background:#fff0f2;padding:10px;border-radius:10px}.back{display:block;margin-top:18px;text-align:center;color:#713b7c}</style></head><body><main class="panel"><div class="brand">MARISE DOCES</div><h1>Acesso da administradora</h1><p>Entre para controlar a disponibilidade do site.</p>${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}<form method="post" action="/admin/login"><div class="field"><label for="username">Usuário</label><input id="username" name="username" autocomplete="username" required></div><div class="field"><label for="password">Senha</label><input id="password" type="password" name="password" autocomplete="current-password" required></div><button class="btn">Entrar no painel</button></form><a class="back" href="/">Voltar ao site</a></main></body></html>`;
}
function adminPage(state) {
  const active = state.active === true;
  const saved = new URLSearchParams("").get("saved");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel | MARISE DOCES</title><style>*{box-sizing:border-box}body{margin:0;background:#fffaf5;font-family:system-ui,Arial;color:#352936;padding:24px}.wrap{max-width:760px;margin:35px auto}.brand{font-weight:900;color:#713b7c;letter-spacing:1px}.panel{background:white;border:1px solid #eadce9;border-radius:24px;padding:clamp(22px,5vw,38px);margin-top:18px;box-shadow:0 12px 35px #713b7c10}h1{color:#4f2b59}.status{display:inline-block;padding:7px 12px;border-radius:999px;font-weight:800;background:${active ? "#e5f7eb" : "#fff0d8"};color:${active ? "#176b3a" : "#945200"}}.toggle{display:flex;gap:12px;align-items:center;margin:22px 0;font-weight:800}.toggle input{width:22px;height:22px;accent-color:#713b7c}label.text{display:block;font-weight:800;margin:20px 0 7px}textarea{width:100%;min-height:120px;padding:12px;border:1px solid #d8c8d7;border-radius:12px;font:inherit;resize:vertical}.btn{border:0;border-radius:999px;padding:12px 19px;background:#713b7c;color:white;font-weight:800;cursor:pointer;font-size:1rem}.secondary{background:white;color:#713b7c;border:1px solid #d9c1de}.row{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.note{color:#786b79;line-height:1.6}.success{color:#176b3a;font-weight:800}</style></head><body><main class="wrap"><div class="brand">MARISE DOCES · ADMINISTRAÇÃO</div><section class="panel"><span class="status">${active ? "SITE ATIVO" : "MODO DE PREPARAÇÃO ATIVO"}</span><h1>Controle do site</h1><p class="note">Quando o site estiver inativo, os clientes verão a página de preparação. Sua área administrativa continuará acessível por /admin.</p><form method="post" action="/admin/settings"><label class="toggle"><input type="checkbox" name="active" ${active ? "checked" : ""}> Deixar o site publicado e disponível para clientes</label><label class="text" for="message">Mensagem exibida no modo de preparação</label><textarea id="message" name="message" maxlength="400">${escapeHtml(state.message || "")}</textarea><div class="row"><button class="btn" type="submit">Salvar configurações</button><a class="btn secondary" href="/" style="text-decoration:none">Visualizar site</a></div></form><p class="note">Dica: desmarque a opção e salve para ativar o modo de preparação. Marque e salve para reabrir a loja.</p><form method="post" action="/admin/logout"><button class="btn secondary" type="submit">Sair da administração</button></form></section></main></body></html>`;
}
app.listen(PORT, () => console.log(`MARISE DOCES rodando na porta ${PORT}`));

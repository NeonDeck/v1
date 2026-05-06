const games = [
  {
    title: "Reflex Rush",
    type: "Reaction",
    entry: "80 coins",
    prize: "1,400",
    art: "RR",
    colors: ["#0f7b5d", "#43b8c7"],
    copy: "Beat live opponents in short timing rounds where fast hands and calm choices decide the table.",
  },
  {
    title: "Mind Grid",
    type: "Puzzle",
    entry: "120 coins",
    prize: "2,100",
    art: "MG",
    colors: ["#6e58d9", "#ec6b55"],
    copy: "A clean tactical grid game built for players who see patterns before the timer gets loud.",
  },
  {
    title: "Aim Arc",
    type: "Precision",
    entry: "60 coins",
    prize: "980",
    art: "AA",
    colors: ["#d8a11d", "#0f7b5d"],
    copy: "Control angle, power, and timing in skill-first rounds with transparent scoring.",
  },
  {
    title: "Number Duel",
    type: "Strategy",
    entry: "50 coins",
    prize: "760",
    art: "ND",
    colors: ["#17211d", "#43b8c7"],
    copy: "Read the board, predict your rival, and win with sharper decisions instead of luck.",
  },
  {
    title: "Stack Sprint",
    type: "Speed",
    entry: "90 coins",
    prize: "1,620",
    art: "SS",
    colors: ["#ec6b55", "#d8a11d"],
    copy: "A brisk stacking challenge with live score pressure and tight head-to-head matches.",
  },
  {
    title: "Route Master",
    type: "Logic",
    entry: "100 coins",
    prize: "1,850",
    art: "RM",
    colors: ["#07533f", "#6e58d9"],
    copy: "Plan the cleanest path before your opponent does in a compact logic arena.",
  },
];

const matches = [
  ["Reflex Rush", "Starts in 42s", "1,400"],
  ["Mind Grid", "3 seats open", "2,100"],
  ["Aim Arc", "Live now", "980"],
];

const app = document.querySelector("#app");
const navLinks = [...document.querySelectorAll("[data-route]")];
const authModal = document.querySelector("#authModal");
const authForm = document.querySelector("#authForm");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authMessage = document.querySelector("#authMessage");
const authSubmit = document.querySelector(".auth-submit");
const authTabs = [...document.querySelectorAll("[data-auth-mode]")];
const authButton = document.querySelector("[data-auth-open]");
const avatarButton = document.querySelector(".avatar-button");
const coinBalance = document.querySelector("#coinBalance");
const supabaseUrl = "https://tzjcsgbnwexfzqucmrrq.supabase.co";
const supabaseKey = "sb_publishable_DmjL-PtbtqLTm5x4TsPYrw_N1mx7A6F";
const supabaseClient = window.supabase?.createClient(supabaseUrl, supabaseKey);
let authMode = "login";
let activeUser = null;
let currentCoins = 0;

function money(value) {
  return `<span class="prize">${value} coins</span>`;
}

function gameCard(game) {
  return `
    <article class="card game-card">
      <div class="game-art" style="--card-a:${game.colors[0]};--card-b:${game.colors[1]}">${game.art}</div>
      <h3>${game.title}</h3>
      <p>${game.copy}</p>
      <div class="game-meta">
        <span class="tag">${game.type}</span>
        <span>${game.entry}</span>
      </div>
      <div class="game-foot">
        <span class="muted">Prize pool</span>
        ${money(game.prize)}
      </div>
    </article>
  `;
}

function sharedSection() {
  return `
    <section>
      <div class="section-title">
        <div>
          <h2>Trust before deposit</h2>
          <p>Premium rooms, clear entries, visible balances, and skill-led matching make Destrexa feel serious from the first tap.</p>
        </div>
      </div>
      <div class="trust-row">
        <span>Skill based rooms</span>
        <span>Clear entry fees</span>
        <span>Wallet ready flow</span>
        <span>Responsible play UX</span>
      </div>
    </section>
  `;
}

function getInitials(email) {
  return (email || "DX").slice(0, 2).toUpperCase();
}

function formatCoins(coins) {
  return Number(coins || 0).toLocaleString("en-US");
}

function updateCoinDisplays() {
  document.querySelectorAll("[data-coin-balance]").forEach((element) => {
    element.textContent = formatCoins(currentCoins);
  });
}

function setAuthMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`.trim();
}

function openAuthModal(mode = "login") {
  setAuthMode(mode);
  authModal.classList.add("open");
  authModal.setAttribute("aria-hidden", "false");
  setAuthMessage("");
  setTimeout(() => authEmail.focus(), 0);
}

function closeAuthModal() {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
}

function setAuthMode(mode) {
  authMode = mode;
  authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authMode === mode));
  authSubmit.textContent = mode === "login" ? "Login" : "Create account";
  authPassword.autocomplete = mode === "login" ? "current-password" : "new-password";
  setAuthMessage("");
}

function updateAuthHeader(user) {
  activeUser = user;
  if (user) {
    authButton.textContent = "Logout";
    authButton.dataset.authOpen = "";
    avatarButton.hidden = false;
    avatarButton.textContent = getInitials(user.email);
  } else {
    authButton.textContent = "Login";
    avatarButton.hidden = true;
    avatarButton.textContent = "DX";
    currentCoins = 0;
    updateCoinDisplays();
  }
}

async function fetchUserCoins(user) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("coins")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Could not fetch profile coins", error);
    currentCoins = 0;
    updateCoinDisplays();
    return;
  }

  currentCoins = data?.coins || 0;
  updateCoinDisplays();
}

async function setAuthenticatedUser(user) {
  updateAuthHeader(user);

  if (user) {
    await fetchUserCoins(user);
  }
}

async function refreshSession() {
  if (!supabaseClient) {
    setAuthMessage("Supabase client could not load. Check internet access and try again.", "error");
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  await setAuthenticatedUser(data.session?.user || null);
}

async function createSignupProfile(userId) {
  const { error } = await supabaseClient.from("profiles").insert({ id: userId });

  if (error && error.code !== "23505") {
    throw error;
  }
}

const pages = {
  home() {
    return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Destrexa private tables</p>
          <h1>Skill games with a premium money-room feel.</h1>
          <p>Destrexa is a polished multiplayer lobby for skill contests, coin rooms, and future real-money play. It feels sharp, secure, and worth depositing into without burying players in clutter.</p>
          <div class="quick-row">
            <a class="primary-button" href="#games">Enter lobby</a>
            <a class="secondary-button" href="#coins">Open wallet</a>
          </div>
          <div class="stat-grid">
            <div class="stat"><strong>18k</strong><span>players today</span></div>
            <div class="stat"><strong>92%</strong><span>skill match rate</span></div>
            <div class="stat"><strong>24/7</strong><span>live rooms</span></div>
          </div>
        </div>
        <div class="hero-board">
          <div class="live-panel">
            <h3>High value rooms</h3>
            ${matches
              .map(
                ([game, status, prize]) => `
                <div class="match-row">
                  <div><strong>${game}</strong><span>${status}</span></div>
                  ${money(prize)}
                </div>
              `,
              )
              .join("")}
          </div>
          <div class="arena-card">
            <p class="eyebrow">Featured table</p>
            <h2>Mind Grid Masters</h2>
            <span>12 verified players competing for 2,100 coins</span>
          </div>
        </div>
      </section>
      <section>
        <div class="section-title">
          <div>
            <h2>Featured tables</h2>
            <p>Fast skill formats with serious entry points and visible prize pools.</p>
          </div>
          <a class="primary-button" href="#games">All games</a>
        </div>
        <div class="cards-grid">${games.slice(0, 3).map(gameCard).join("")}</div>
      </section>
      ${sharedSection()}
    `;
  },
  games() {
    return `
      <section class="page-title">
        <p class="eyebrow">Game lobby</p>
        <h1>Choose your table.</h1>
        <p>Browse polished multiplayer rooms by pace and skill type. The front end is shaped for deposits later, with wallet and entry clarity already in place.</p>
      </section>
      <div class="tabs" aria-label="Game filters">
        <button class="tab-button active">All</button>
        <button class="tab-button">Reaction</button>
        <button class="tab-button">Puzzle</button>
        <button class="tab-button">Strategy</button>
        <button class="tab-button">Speed</button>
      </div>
      <section class="cards-grid">${games.map(gameCard).join("")}</section>
      ${sharedSection()}
    `;
  },
  coins() {
    return `
      <section class="page-title">
        <p class="eyebrow">Coins vault</p>
        <h1>A wallet that feels worth trusting.</h1>
        <p>Balance, deposits, withdrawals, and room entries are kept clear so the payment layer can arrive without redesigning the product.</p>
      </section>
      <section class="coin-grid">
        <div class="wallet-total">
          <span>Available balance</span>
          <strong data-coin-balance>${formatCoins(currentCoins)}</strong>
          <p>Coins power entry fees, prize rooms, and promotional rewards. Real payment rails can be connected in the next phase.</p>
          <div class="vault-row">
            <span>Vault status</span>
            <b>Deposit ready</b>
          </div>
          <div class="quick-row">
            <button class="primary-button">Deposit coins</button>
            <button class="secondary-button">Withdraw</button>
          </div>
        </div>
        <div class="card">
          <h3>Recent activity</h3>
          <div class="coin-line"><div><b>Mind Grid win</b><span class="muted">Today, 8:20 PM</span></div><span class="prize">+2,100</span></div>
          <div class="coin-line"><div><b>Reflex Rush entry</b><span class="muted">Today, 7:44 PM</span></div><span>-80</span></div>
          <div class="coin-line"><div><b>Daily streak bonus</b><span class="muted">Today, 10:00 AM</span></div><span class="prize">+250</span></div>
          <div class="coin-line"><div><b>Aim Arc entry</b><span class="muted">Yesterday</span></div><span>-60</span></div>
        </div>
      </section>
      ${sharedSection()}
    `;
  },
  profile() {
    return `
      <section class="page-title">
        <p class="eyebrow">Player profile</p>
        <h1>Your verified skill identity.</h1>
        <p>A focused account page with rank, balance, performance, and trust signals in one place.</p>
      </section>
      <section class="profile-grid">
        <div class="card profile-hero">
          <div class="large-avatar">AR</div>
          <h3>Arjun Rao</h3>
          <p>Verified contender - Bengaluru</p>
          <div class="trust-row">
            <span>KYC ready</span>
            <span>Fair play</span>
            <span>Skill rank A</span>
          </div>
        </div>
        <div class="card">
          <h3>Performance</h3>
          <div class="profile-line"><div><b>Total wins</b><span class="muted">Across all games</span></div><strong>148</strong></div>
          <div class="profile-line"><div><b>Win rate</b><span class="muted">Last 30 days</span></div><strong>63%</strong></div>
          <div class="profile-line"><div><b>Best game</b><span class="muted">Highest consistency</span></div><strong>Mind Grid</strong></div>
          <div class="profile-line"><div><b>Coin balance</b><span class="muted">Ready to play</span></div><strong data-coin-balance>${formatCoins(currentCoins)}</strong></div>
        </div>
      </section>
      ${sharedSection()}
    `;
  },
};

function setRoute() {
  const route = (location.hash || "#home").replace("#", "");
  const page = pages[route] ? route : "home";
  app.innerHTML = pages[page]();
  updateCoinDisplays();
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.route === page));
  app.focus({ preventScroll: true });
}

document.addEventListener("click", async (event) => {
  const openButton = event.target.closest("[data-auth-open]");
  const closeButton = event.target.closest("[data-auth-close]");
  const modeButton = event.target.closest("[data-auth-mode]");

  if (openButton) {
    if (activeUser && supabaseClient) {
      await supabaseClient.auth.signOut();
      await setAuthenticatedUser(null);
      return;
    }
    openAuthModal("login");
  }

  if (closeButton) {
    closeAuthModal();
  }

  if (modeButton) {
    setAuthMode(modeButton.dataset.authMode);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && authModal.classList.contains("open")) {
    closeAuthModal();
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    setAuthMessage("Supabase client could not load. Check internet access and try again.", "error");
    return;
  }

  const email = authEmail.value.trim();
  const password = authPassword.value;
  authSubmit.disabled = true;
  setAuthMessage(authMode === "login" ? "Checking access..." : "Creating secure access...");

  const authCall =
    authMode === "login"
      ? supabaseClient.auth.signInWithPassword({ email, password })
      : supabaseClient.auth.signUp({ email, password });

  const { data, error } = await authCall;
  authSubmit.disabled = false;

  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }

  if (data.session?.user) {
    if (authMode === "register") {
      try {
        await createSignupProfile(data.session.user.id);
      } catch (profileError) {
        setAuthMessage(profileError.message, "error");
        return;
      }
    }

    await setAuthenticatedUser(data.session.user);
    setAuthMessage("Access granted. Welcome to Destrexa.", "success");
    setTimeout(closeAuthModal, 650);
    return;
  }

  setAuthMessage("Account created. Your profile is prepared automatically after signup.", "success");
});

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    await setAuthenticatedUser(session?.user || null);
  });
  refreshSession();
} else {
  updateAuthHeader(null);
}

window.addEventListener("hashchange", setRoute);
setRoute();

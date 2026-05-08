const games = [
  {
    title: "Rock Paper Scissors",
    type: "Realtime",
    entry: "Free to 100 coins",
    prize: "Live",
    art: "RPS",
    colors: ["#30ebff", "#79ffca"],
    href: "games/rps/index.html",
    copy: "A live five-round RPS table with Firebase matchmaking, timers, and simultaneous reveal.",
  },
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
    copy: "Control angle, power, and timing in crypto-ready rounds with transparent scoring.",
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
const authUsername = document.querySelector("#authUsername");
const authDisplayName = document.querySelector("#authDisplayName");
const displayNameField = document.querySelector("#displayNameField");
const authPassword = document.querySelector("#authPassword");
const authMessage = document.querySelector("#authMessage");
const authSubmit = document.querySelector(".auth-submit");
const authButton = document.querySelector("[data-auth-open]");
const avatarButton = document.querySelector(".avatar-button");
const supabaseUrl = "https://tzjcsgbnwexfzqucmrrq.supabase.co";
const supabaseKey = "sb_publishable_DmjL-PtbtqLTm5x4TsPYrw_N1mx7A6F";
const supabaseClient = window.supabase?.createClient(supabaseUrl, supabaseKey);
let activeUser = null;
let activeProfile = null;
let currentCoins = 0;

function money(value) {
  const suffix = /\d/.test(String(value)) ? " coins" : "";
  return `<span class="prize">${value}${suffix}</span>`;
}

function gameCard(game) {
  return `
    <${game.href ? `a href="${game.href}"` : "article"} class="card game-card">
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
    </${game.href ? "a" : "article"}>
  `;
}

function sharedSection() {
  return `
    <section>
      <div class="section-title">
        <div>
          <h2>Trust before deposit</h2>
          <p>Premium crypto arenas, clear entries, visible balances, and wallet-ready matching make Cryplay feel serious from the first tap.</p>
        </div>
      </div>
      <div class="trust-row">
        <span>Crypto game rooms</span>
        <span>Clear entry fees</span>
        <span>Wallet ready flow</span>
        <span>Responsible play UX</span>
      </div>
    </section>
  `;
}

function marketProofSection() {
  return `
    <section class="market-proof">
      <div class="stat-grid">
        <div class="stat"><strong>18k</strong><span>players today</span></div>
        <div class="stat"><strong>92%</strong><span>fair match rate</span></div>
        <div class="stat"><strong>24/7</strong><span>live rooms</span></div>
      </div>
      <div class="proof-grid">
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
  `;
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9_]{3,16}$/.test(username);
}

function usernameToEmail(username) {
  return `${username}@cryplay.local`;
}

function getInitials(profile) {
  const source = profile?.display_name || profile?.username || "CP";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

function setAuthLoading(isLoading, message = "") {
  authSubmit.disabled = isLoading;
  authUsername.disabled = isLoading;
  authPassword.disabled = isLoading;
  authDisplayName.disabled = isLoading;
  authSubmit.textContent = isLoading ? "Checking..." : "Enter Arena";
  if (message) setAuthMessage(message);
}

function setDisplayNameVisible(isVisible) {
  displayNameField.hidden = !isVisible;
  authDisplayName.required = isVisible;
}

function openAuthModal() {
  authModal.classList.add("open");
  authModal.setAttribute("aria-hidden", "false");
  setAuthMessage("");
  setDisplayNameVisible(false);
  setTimeout(() => authUsername.focus(), 0);
}

function closeAuthModal() {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
}

function updateAuthHeader(user, profile = null) {
  activeUser = user;
  activeProfile = profile;
  if (user) {
    authButton.textContent = "Logout";
    authButton.dataset.authOpen = "";
    avatarButton.hidden = false;
    avatarButton.textContent = getInitials(profile);
  } else {
    authButton.textContent = "Enter Arena";
    avatarButton.hidden = true;
    avatarButton.textContent = "CP";
    activeProfile = null;
    currentCoins = 0;
    updateCoinDisplays();
  }
}

async function fetchProfileByUserId(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name, coins")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function findProfileByUsername(username) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createProfileForUser(userId, username, displayName) {
  const profile = {
    id: userId,
    username,
    display_name: displayName || username,
  };
  const { data, error } = await supabaseClient.from("profiles").insert(profile).select("id, username, display_name, coins").single();

  if (error && error.code !== "23505") {
    throw error;
  }

  if (data) return data;
  return fetchProfileByUserId(userId);
}

async function setAuthenticatedUser(user) {
  if (!user) {
    updateAuthHeader(null);
    return;
  }

  try {
    const profile = await fetchProfileByUserId(user.id);
    currentCoins = profile?.coins || 0;
    updateAuthHeader(user, profile);
    updateCoinDisplays();
  } catch (error) {
    console.error("Could not fetch profile", error);
    currentCoins = 0;
    updateAuthHeader(user, {
      username: user.user_metadata?.username || "player",
      display_name: user.user_metadata?.display_name || "Player",
      coins: 0,
    });
    updateCoinDisplays();
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

async function enterArena({ username, password, displayName }) {
  const existingProfile = await findProfileByUsername(username);
  const email = usernameToEmail(username);

  if (existingProfile) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.session?.user || data.user, profile: existingProfile, created: false };
  }

  if (!displayName.trim()) {
    return { needsDisplayName: true };
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName.trim(),
      },
    },
  });

  if (error) throw error;

  const user = data.session?.user || data.user;
  if (!user?.id) {
    throw new Error("Account created, but Supabase did not return a user id. Check Supabase confirmation settings.");
  }

  const profile = await createProfileForUser(user.id, username, displayName.trim());
  return { user, profile, created: true };
}

const pages = {
  home() {
    return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Cryplay crypto tables</p>
          <h1>Crypto games with a premium arena feel.</h1>
          <p>Cryplay is built to feel trusted before the first deposit: clear wallet signals, live player proof, and games that look valuable without overwhelming the screen.</p>
          <div class="quick-row">
            <a class="primary-button" href="#games">Enter lobby</a>
            <a class="secondary-button" href="#coins">Open wallet</a>
          </div>
          <div class="hero-signal-row">
            <span>Wallet visible</span>
            <span>Live rooms</span>
            <span>Clear entry tiers</span>
          </div>
        </div>
      </section>
      <section>
        <div class="section-title">
          <div>
            <h2>Popular games</h2>
            <p>Fast crypto-ready formats with serious entry points and visible prize pools.</p>
          </div>
        </div>
        <div class="cards-grid">${games.slice(0, 3).map(gameCard).join("")}</div>
        <div class="section-action">
          <a class="primary-button" href="#games">All games</a>
        </div>
      </section>
      ${marketProofSection()}
      ${sharedSection()}
    `;
  },
  games() {
    return `
      <section class="page-title">
        <p class="eyebrow">Game lobby</p>
        <h1>Choose your table.</h1>
        <p>Browse polished multiplayer rooms by pace and arena type. The front end is shaped for crypto deposits later, with wallet and entry clarity already in place.</p>
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
    const displayName = activeProfile?.display_name || "Cryplay Player";
    const username = activeProfile?.username || "arena_player";
    const initials = getInitials(activeProfile);
    return `
      <section class="page-title">
        <p class="eyebrow">Player profile</p>
        <h1>Your verified crypto identity.</h1>
        <p>A focused account page with rank, balance, performance, and trust signals in one place.</p>
      </section>
      <section class="profile-grid">
        <div class="card profile-hero">
          <div class="large-avatar">${initials}</div>
          <h3>${displayName}</h3>
          <p>@${username}</p>
          <div class="trust-row">
            <span>KYC ready</span>
            <span>Fair play</span>
            <span>Arena rank A</span>
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

  if (openButton) {
    if (activeUser && supabaseClient) {
      await supabaseClient.auth.signOut();
      await setAuthenticatedUser(null);
      setRoute();
      return;
    }
    openAuthModal();
  }

  if (closeButton) {
    closeAuthModal();
  }

});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && authModal.classList.contains("open")) {
    closeAuthModal();
  }
});

authUsername.addEventListener("input", () => {
  const normalized = normalizeUsername(authUsername.value);
  if (authUsername.value !== normalized) {
    authUsername.value = normalized;
  }
  setDisplayNameVisible(false);
  setAuthMessage("");
});

authUsername.addEventListener("blur", async () => {
  if (!supabaseClient) return;
  const username = normalizeUsername(authUsername.value);
  if (!username || !isValidUsername(username)) return;

  try {
    setAuthMessage("Checking username...");
    const profile = await findProfileByUsername(username);
    setDisplayNameVisible(!profile);
    setAuthMessage(profile ? "Username found. Enter password to continue." : "New username. Add display name to create your arena profile.", profile ? "" : "success");
  } catch (error) {
    setAuthMessage(error.message || "Could not check username.", "error");
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    setAuthMessage("Supabase client could not load. Check internet access and try again.", "error");
    return;
  }

  const username = normalizeUsername(authUsername.value);
  const password = authPassword.value;
  const displayName = authDisplayName.value;
  authUsername.value = username;

  if (!isValidUsername(username)) {
    setAuthMessage("Username must be 3-16 lowercase letters, numbers, or underscores.", "error");
    return;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.", "error");
    return;
  }

  setAuthLoading(true, "Checking username...");

  try {
    const result = await enterArena({ username, password, displayName });

    if (result.needsDisplayName) {
      setDisplayNameVisible(true);
      setAuthLoading(false);
      setAuthMessage("New username detected. Add a display name to create your arena profile.", "success");
      authDisplayName.focus();
      return;
    }

    await setAuthenticatedUser(result.user);
    setRoute();
    setAuthLoading(false);
    setAuthMessage(result.created ? "Arena profile created. Welcome to Cryplay." : "Access granted. Welcome back.", "success");
    setTimeout(closeAuthModal, 650);
  } catch (error) {
    setAuthLoading(false);
    setAuthMessage(error.message || "Could not enter arena. Try again.", "error");
  }
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

import {
  database,
  ref,
  child,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
} from "./temp.js";

const SUPABASE_URL = "https://tzjcsgbnwexfzqucmrrq.supabase.co";
const SUPABASE_KEY = "sb_publishable_DmjL-PtbtqLTm5x4TsPYrw_N1mx7A6F";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
const tiers = [0, 10, 25, 50, 100];
const choices = ["rock", "paper", "scissors"];
const roundSeconds = 10;
const revealSeconds = 5;

const state = {
  user: null,
  username: "Player",
  coins: 0,
  selectedTier: 0,
  setupMode: "ai",
  mode: null,
  roomId: null,
  room: null,
  role: null,
  lastRoundKey: "",
  unsubscribeRoom: null,
  timer: null,
  searchTimer: null,
  searchEndsAt: 0,
  localScores: {},
  selectedChoice: null,
  ai: null,
};

const els = {
  playerName: document.querySelector("#playerName"),
  coinBalance: document.querySelector("#coinBalance"),
  opponentStatus: document.querySelector("#opponentStatus"),
  matchStatus: document.querySelector("#matchStatus"),
  tierGrid: document.querySelector("#tierGrid"),
  setupTitle: document.querySelector("#setupTitle"),
  setupCopy: document.querySelector("#setupCopy"),
  startModeButton: document.querySelector("#startModeButton"),
  searchTitle: document.querySelector("#searchTitle"),
  searchCopy: document.querySelector("#searchCopy"),
  searchCountdown: document.querySelector("#searchCountdown"),
  cancelSearchButton: document.querySelector("#cancelSearchButton"),
  youLabel: document.querySelector("#youLabel"),
  opponentLabel: document.querySelector("#opponentLabel"),
  youScore: document.querySelector("#youScore"),
  opponentScore: document.querySelector("#opponentScore"),
  roundLabel: document.querySelector("#roundLabel"),
  roundTimer: document.querySelector("#roundTimer"),
  roundStatus: document.querySelector("#roundStatus"),
  choiceGrid: document.querySelector("#choiceGrid"),
  yourReveal: document.querySelector("#yourReveal"),
  opponentReveal: document.querySelector("#opponentReveal"),
  finalTitle: document.querySelector("#finalTitle"),
  finalCopy: document.querySelector("#finalCopy"),
};

function formatCoins(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function dbPath(path) {
  return ref(database, path);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.querySelector(`#${name}Screen`)?.classList.add("active");
}

function playerPayload() {
  return {
    id: state.user.id,
    username: state.username,
    joinedAt: Date.now(),
    online: true,
  };
}

function getPlayerKey(room, uid = state.user.id) {
  if (room.players?.p1?.id === uid) return "p1";
  if (room.players?.p2?.id === uid) return "p2";
  return null;
}

function getOpponentKey(room) {
  const key = getPlayerKey(room);
  return key === "p1" ? "p2" : "p1";
}

function getDisplayName(player) {
  return player?.username || "Waiting";
}

function requireCoins(tier) {
  if (tier > state.coins) {
    window.location.href = "../../index.html#coins";
    return false;
  }
  return true;
}

function resultFor(a, b) {
  if (!a && !b) return "draw";
  if (a && !b) return "win";
  if (!a && b) return "lose";
  if (a === b) return "draw";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return "win";
  }
  return "lose";
}

function scoreFor(result) {
  if (result === "win") return 10;
  if (result === "draw") return 5;
  return 0;
}

function randomChoice() {
  return choices[Math.floor(Math.random() * choices.length)];
}

function computeScores(room) {
  const totals = { p1: 0, p2: 0 };
  const rounds = room.rounds || {};

  Object.values(rounds).forEach((round) => {
    if (!round.revealed) return;
    const p1 = round.choices?.p1 || null;
    const p2 = round.choices?.p2 || null;
    const p1Result = resultFor(p1, p2);
    totals.p1 += scoreFor(p1Result);
    totals.p2 += scoreFor(p1Result === "win" ? "lose" : p1Result === "lose" ? "win" : "draw");
  });

  return totals;
}

function roundWinner(room, roundNumber) {
  const round = room.rounds?.[roundNumber];
  const p1 = round?.choices?.p1 || null;
  const p2 = round?.choices?.p2 || null;
  const result = resultFor(p1, p2);
  if (result === "win") return "p1";
  if (result === "lose") return "p2";
  return "draw";
}

function resetChoicesUi() {
  state.selectedChoice = null;
  document.querySelectorAll(".choice-card").forEach((card) => {
    card.disabled = false;
    card.classList.remove("selected", "locked");
  });
  els.yourReveal.textContent = "Locked";
  els.opponentReveal.textContent = "Waiting";
}

function lockChoices(choice) {
  document.querySelectorAll(".choice-card").forEach((card) => {
    card.disabled = true;
    card.classList.add("locked");
    card.classList.toggle("selected", card.dataset.choice === choice);
  });
}

async function loadSession() {
  if (!supabaseClient) {
    window.location.href = "../../index.html#home";
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;

  if (!user) {
    window.location.href = "../../index.html#home";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("username, display_name, coins")
    .eq("id", user.id)
    .single();

  state.user = user;
  state.username = profile?.display_name || profile?.username || user.user_metadata?.username || "Player";
  state.coins = profile?.coins || 0;
  els.playerName.textContent = state.username;
  els.coinBalance.textContent = formatCoins(state.coins);

  await set(dbPath(`playerStatus/${user.id}`), {
    id: user.id,
    username: state.username,
    online: true,
    updatedAt: serverTimestamp(),
  });
  onDisconnect(dbPath(`playerStatus/${user.id}`)).remove();
}

function renderTiers() {
  els.tierGrid.innerHTML = tiers
    .map(
      (tier) => `
        <button class="tier-button ${tier === state.selectedTier ? "active" : ""}" data-tier="${tier}">
          ${tier === 0 ? "Free" : `${tier} coins`}
        </button>
      `,
    )
    .join("");
}

function openSetup(mode) {
  state.setupMode = mode;
  state.selectedTier = 0;
  renderTiers();

  if (mode === "ai") {
    els.setupTitle.textContent = "Play vs AI";
    els.setupCopy.textContent = "Choose Free Match or Coin Match. AI is random only with equal odds.";
    els.startModeButton.textContent = "Start AI match";
  }

  if (mode === "quick") {
    els.setupTitle.textContent = "1v1 Quick Match";
    els.setupCopy.textContent = "Search for 30 seconds against a live player in the same tier.";
    els.startModeButton.textContent = "Find opponent";
  }

  if (mode === "create") {
    els.setupTitle.textContent = "Create Room";
    els.setupCopy.textContent = "Create a public table that quick-match players can join.";
    els.startModeButton.textContent = "Create public room";
  }

  showScreen("setup");
}

function startAiMatch() {
  if (!requireCoins(state.selectedTier)) return;
  cleanupRealtime();
  state.mode = "ai";
  state.ai = {
    round: 1,
    phase: "choosing",
    revealUntil: 0,
    scores: { you: 0, ai: 0 },
  };
  els.opponentStatus.textContent = "Cryplay AI";
  els.matchStatus.textContent = state.selectedTier === 0 ? "Free AI table." : `${state.selectedTier} coin AI table.`;
  showScreen("match");
  startAiRound();
}

function startAiRound() {
  resetChoicesUi();
  state.ai.phase = "choosing";
  state.ai.startedAt = Date.now();
  updateAiUi();
  clearInterval(state.timer);
  state.timer = setInterval(updateAiUi, 250);
}

function updateAiUi() {
  const elapsed = Math.floor((Date.now() - state.ai.startedAt) / 1000);
  const left = Math.max(0, roundSeconds - elapsed);
  els.roundLabel.textContent = state.ai.round <= 5 ? `Round ${state.ai.round} / 5` : `Sudden death ${state.ai.round - 5}`;
  els.roundTimer.textContent = state.ai.phase === "choosing" ? left : Math.max(0, Math.ceil((state.ai.revealUntil - Date.now()) / 1000));
  els.youScore.textContent = state.ai.scores.you;
  els.opponentScore.textContent = state.ai.scores.ai;
  els.youLabel.textContent = state.username;
  els.opponentLabel.textContent = "Cryplay AI";

  if (state.ai.phase === "choosing" && left === 0) {
    revealAiRound(state.selectedChoice || null);
  }

  if (state.ai.phase === "reveal" && Date.now() >= state.ai.revealUntil) {
    nextAiRound();
  }
}

function revealAiRound(choice) {
  if (state.ai.phase !== "choosing") return;
  state.ai.phase = "reveal";
  const aiChoice = randomChoice();
  const result = resultFor(choice, aiChoice);
  state.ai.scores.you += scoreFor(result);
  state.ai.scores.ai += scoreFor(result === "win" ? "lose" : result === "lose" ? "win" : "draw");
  state.ai.revealUntil = Date.now() + revealSeconds * 1000;
  lockChoices(choice);
  els.yourReveal.textContent = choice || "No choice";
  els.opponentReveal.textContent = aiChoice;
  els.roundStatus.textContent = result === "draw" ? "Draw round." : result === "win" ? "You win the round." : "AI wins the round.";
}

function nextAiRound() {
  const suddenDeath = state.ai.round >= 5 && state.ai.scores.you === state.ai.scores.ai;
  if (state.ai.round >= 5 && !suddenDeath) {
    showFinal(state.ai.scores.you > state.ai.scores.ai ? "You win" : "AI wins", state.ai.scores);
    return;
  }
  state.ai.round += 1;
  startAiRound();
}

async function createRoom() {
  if (!requireCoins(state.selectedTier)) return;
  cleanupRealtime();
  const roomRef = push(dbPath("rooms"));
  const roomId = roomRef.key;
  await set(roomRef, {
    id: roomId,
    tier: state.selectedTier,
    public: true,
    status: "waiting",
    phase: "waiting",
    round: 1,
    createdAt: serverTimestamp(),
    players: {
      p1: playerPayload(),
    },
  });
  state.roomId = roomId;
  state.role = "p1";
  watchRoom(roomId);
  showScreen("search");
  els.searchTitle.textContent = "Room created";
  els.searchCopy.textContent = "Waiting for a player to join your public room.";
  els.searchCountdown.textContent = "--";
}

async function quickMatch() {
  if (!requireCoins(state.selectedTier)) return;
  cleanupRealtime();
  showScreen("search");
  els.searchTitle.textContent = "Finding opponent";
  els.searchCopy.textContent = "Searching public rooms and live players in this coin tier.";
  state.searchEndsAt = Date.now() + 30000;
  state.searchTimer = setInterval(updateSearch, 250);
  await searchOnce();
}

async function updateSearch() {
  const left = Math.max(0, Math.ceil((state.searchEndsAt - Date.now()) / 1000));
  els.searchCountdown.textContent = left;

  if (left === 0) {
    clearInterval(state.searchTimer);
    await remove(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`));
    els.searchTitle.textContent = "No player found";
    els.searchCopy.innerHTML =
      'No live player joined in time. Try <button class="inline-link" data-ai-fallback>Play vs AI</button> or <button class="inline-link" data-create-fallback>Create Room</button>.';
    return;
  }

  await searchOnce();
}

async function searchOnce() {
  if (state.roomId) return;
  const ownQueueSnapshot = await get(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`));
  const ownQueue = ownQueueSnapshot.val();

  if (ownQueue?.matchedRoom) {
    state.roomId = ownQueue.matchedRoom;
    state.role = ownQueue.role || "p1";
    clearInterval(state.searchTimer);
    await remove(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`));
    watchRoom(state.roomId);
    return;
  }

  const roomsSnapshot = await get(dbPath("rooms"));
  const rooms = roomsSnapshot.val() || {};
  const openRoom = Object.values(rooms).find(
    (room) =>
      room.public &&
      room.status === "waiting" &&
      room.tier === state.selectedTier &&
      room.players?.p1?.id !== state.user.id,
  );

  if (openRoom) {
    await joinRoom(openRoom.id);
    return;
  }

  const queueSnapshot = await get(dbPath(`matchmaking/${state.selectedTier}`));
  const queuedPlayers = queueSnapshot.val() || {};
  const opponentEntry = Object.values(queuedPlayers).find((entry) => entry.id !== state.user.id && !entry.matchedRoom);

  if (opponentEntry) {
    const roomRef = push(dbPath("rooms"));
    const roomId = roomRef.key;
    await set(roomRef, {
      id: roomId,
      tier: state.selectedTier,
      public: true,
      status: "active",
      phase: "choosing",
      round: 1,
      createdAt: serverTimestamp(),
      roundStartedAt: Date.now(),
      players: {
        p1: {
          id: opponentEntry.id,
          username: opponentEntry.username,
          joinedAt: opponentEntry.joinedAt || Date.now(),
          online: true,
        },
        p2: playerPayload(),
      },
    });
    await update(dbPath(`matchmaking/${state.selectedTier}/${opponentEntry.id}`), {
      matchedRoom: roomId,
      role: "p1",
    });
    await remove(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`));
    clearInterval(state.searchTimer);
    state.roomId = roomId;
    state.role = "p2";
    watchRoom(roomId);
    return;
  }

  await set(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`), {
    ...playerPayload(),
    tier: state.selectedTier,
    updatedAt: serverTimestamp(),
  });
  onDisconnect(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`)).remove();
}

async function joinRoom(roomId) {
  await update(dbPath(`rooms/${roomId}`), {
    status: "active",
    phase: "choosing",
    round: 1,
    roundStartedAt: Date.now(),
    "players/p2": playerPayload(),
  });
  await remove(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`));
  clearInterval(state.searchTimer);
  state.roomId = roomId;
  state.role = "p2";
  watchRoom(roomId);
}

function watchRoom(roomId) {
  if (state.unsubscribeRoom) state.unsubscribeRoom();
  state.unsubscribeRoom = onValue(dbPath(`rooms/${roomId}`), (snapshot) => {
    const room = snapshot.val();
    if (!room) return;
    state.room = room;
    renderRoom(room);
  });
}

function renderRoom(room) {
  const role = getPlayerKey(room);
  state.role = role || state.role;
  const opponentKey = getOpponentKey(room);
  const opponent = room.players?.[opponentKey];
  els.opponentStatus.textContent = opponent ? getDisplayName(opponent) : "Waiting";
  els.matchStatus.textContent = room.status === "waiting" ? "Public room open." : `${room.tier || "Free"} coin table active.`;
  els.youLabel.textContent = getDisplayName(room.players?.[state.role]);
  els.opponentLabel.textContent = getDisplayName(opponent);
  showScreen(room.status === "waiting" ? "search" : "match");

  if (room.status === "finished") {
    showFinalFromRoom(room);
    return;
  }

  if (room.status === "active") {
    startRoomTimer();
    renderRound(room);
  }
}

function startRoomTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (!state.room || state.room.status !== "active") return;
    renderRound(state.room);
    maybeAdvanceRoom(state.room);
  }, 250);
}

function renderRound(room) {
  const role = state.role;
  const opponentKey = getOpponentKey(room);
  const round = room.rounds?.[room.round] || {};
  const scores = computeScores(room);
  const elapsed = Math.floor((Date.now() - (room.roundStartedAt || Date.now())) / 1000);
  const left = Math.max(0, roundSeconds - elapsed);
  const label = room.round <= 5 ? `Round ${room.round} / 5` : `Sudden death ${room.round - 5}`;
  const roundKey = `${room.round}-${room.phase}`;

  if (room.phase === "choosing" && state.lastRoundKey !== roundKey) {
    resetChoicesUi();
  }
  state.lastRoundKey = roundKey;

  els.roundLabel.textContent = label;
  els.roundTimer.textContent = room.phase === "choosing" ? left : Math.max(0, Math.ceil(((room.revealUntil || Date.now()) - Date.now()) / 1000));
  els.youScore.textContent = scores[role] || 0;
  els.opponentScore.textContent = scores[opponentKey] || 0;

  if (room.phase === "choosing") {
    els.roundStatus.textContent = round.choices?.[role] ? "Choice locked. Waiting for reveal." : "Choose your card.";
    els.yourReveal.textContent = round.choices?.[role] ? "Locked" : "Waiting";
    els.opponentReveal.textContent = round.choices?.[opponentKey] ? "Locked" : "Waiting";
  } else {
    const yourChoice = round.choices?.[role] || "No choice";
    const opponentChoice = round.choices?.[opponentKey] || "No choice";
    const result = resultFor(round.choices?.[role] || null, round.choices?.[opponentKey] || null);
    els.yourReveal.textContent = yourChoice;
    els.opponentReveal.textContent = opponentChoice;
    els.roundStatus.textContent = result === "draw" ? "Draw round." : result === "win" ? "You win the round." : "Opponent wins the round.";
  }
}

async function chooseRealtime(choice) {
  if (!state.room || state.room.phase !== "choosing") return;
  const role = state.role;
  const existing = state.room.rounds?.[state.room.round]?.choices?.[role];
  if (existing) return;
  state.selectedChoice = choice;
  lockChoices(choice);
  await update(dbPath(`rooms/${state.roomId}/rounds/${state.room.round}/choices`), {
    [role]: choice,
  });
}

async function maybeAdvanceRoom(room) {
  if (state.role !== "p1" || room.phase !== "choosing") return;
  const round = room.rounds?.[room.round] || {};
  const bothChosen = round.choices?.p1 && round.choices?.p2;
  const timedOut = Date.now() - (room.roundStartedAt || Date.now()) >= roundSeconds * 1000;

  if (bothChosen || timedOut) {
    await update(dbPath(`rooms/${room.id}`), {
      phase: "reveal",
      revealUntil: Date.now() + revealSeconds * 1000,
      [`rounds/${room.round}/revealed`]: true,
    });
    setTimeout(() => advanceRoomRound(room.id), revealSeconds * 1000);
  }
}

async function advanceRoomRound(roomId) {
  const snapshot = await get(dbPath(`rooms/${roomId}`));
  const room = snapshot.val();
  if (!room || room.phase !== "reveal") return;

  const scores = computeScores(room);
  const tiedAfterFive = room.round >= 5 && scores.p1 === scores.p2;
  const suddenWinner = room.round > 5 && roundWinner(room, room.round) !== "draw";
  const finished = (room.round >= 5 && !tiedAfterFive) || suddenWinner;

  if (finished) {
    await update(dbPath(`rooms/${roomId}`), {
      status: "finished",
      phase: "finished",
      finishedAt: Date.now(),
    });
    showFinalFromRoom(room);
    return;
  }

  resetChoicesUi();
  await update(dbPath(`rooms/${roomId}`), {
    phase: "choosing",
    round: room.round + 1,
    roundStartedAt: Date.now(),
  });
}

function showFinalFromRoom(room) {
  const scores = computeScores(room);
  const role = state.role;
  const opponentKey = getOpponentKey(room);
  const title = scores[role] > scores[opponentKey] ? "You win" : scores[role] < scores[opponentKey] ? "Opponent wins" : "Draw";
  showFinal(title, { you: scores[role], ai: scores[opponentKey] });
}

function showFinal(title, scores) {
  clearInterval(state.timer);
  els.finalTitle.textContent = title;
  els.finalCopy.textContent = `Final score: ${scores.you} to ${scores.ai}. Coin rewards are not updated here and must be validated by backend logic later.`;
  showScreen("final");
}

function cleanupRealtime() {
  clearInterval(state.timer);
  clearInterval(state.searchTimer);
  if (state.unsubscribeRoom) state.unsubscribeRoom();
  state.unsubscribeRoom = null;
  state.roomId = null;
  state.room = null;
  state.role = null;
  state.lastRoundKey = "";
  state.ai = null;
  resetChoicesUi();
}

function renderStaticView(view) {
  if (view === "leaderboard") {
    showScreen("setup");
    els.setupTitle.textContent = "Leaderboard";
    els.setupCopy.textContent = "Leaderboard is reserved for future validated Supabase match history.";
    els.tierGrid.innerHTML = "";
    els.startModeButton.textContent = "Back home";
    state.setupMode = "home";
  }

  if (view === "settings") {
    showScreen("setup");
    els.setupTitle.textContent = "Settings";
    els.setupCopy.textContent = "Premium table visuals are enabled. Audio and haptics can be added later.";
    els.tierGrid.innerHTML = "";
    els.startModeButton.textContent = "Back home";
    state.setupMode = "home";
  }

  if (view === "profile") {
    showScreen("setup");
    els.setupTitle.textContent = "User Profile";
    els.setupCopy.textContent = `${state.username} has ${formatCoins(state.coins)} coins available. Permanent profile data stays in Supabase.`;
    els.tierGrid.innerHTML = "";
    els.startModeButton.textContent = "Back home";
    state.setupMode = "home";
  }
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  const tierButton = event.target.closest("[data-tier]");
  const choiceButton = event.target.closest("[data-choice]");
  const aiFallback = event.target.closest("[data-ai-fallback]");
  const createFallback = event.target.closest("[data-create-fallback]");

  if (viewButton) {
    const view = viewButton.dataset.view;
    if (view === "home") {
      cleanupRealtime();
      showScreen("home");
    } else if (["ai", "quick", "create"].includes(view)) {
      openSetup(view);
    } else {
      renderStaticView(view);
    }
  }

  if (tierButton) {
    state.selectedTier = Number(tierButton.dataset.tier);
    renderTiers();
  }

  if (choiceButton) {
    const choice = choiceButton.dataset.choice;
    if (state.mode === "ai") {
      state.selectedChoice = choice;
      lockChoices(choice);
      return;
    }
    await chooseRealtime(choice);
  }

  if (aiFallback) {
    openSetup("ai");
  }

  if (createFallback) {
    openSetup("create");
  }
});

els.startModeButton.addEventListener("click", async () => {
  if (state.setupMode === "home") {
    showScreen("home");
    return;
  }
  if (state.setupMode === "ai") startAiMatch();
  if (state.setupMode === "quick") await quickMatch();
  if (state.setupMode === "create") await createRoom();
});

els.cancelSearchButton.addEventListener("click", async () => {
  if (state.roomId && state.role === "p1") {
    await remove(dbPath(`rooms/${state.roomId}`));
  }
  await remove(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`));
  cleanupRealtime();
  showScreen("home");
});

window.addEventListener("beforeunload", () => {
  if (!state.user) return;
  remove(dbPath(`matchmaking/${state.selectedTier}/${state.user.id}`));
});

await loadSession();
renderTiers();
showScreen("home");

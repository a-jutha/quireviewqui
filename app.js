// Liste des participants (ordre d'affichage initial)
const PARTICIPANTS = [
  "Antoine",
  "Awena",
  "Florian",
  "Daren",
  "François",
  "Minh Anh",
  "Jutha",
];

// Rôles des participants (S = Senior, J = Junior)
const ROLES = {
  "Antoine": "S",
  "Awena": "J",
  "Florian": "S",
  "Daren": "J",
  "François": "S",
  "Minh Anh": "J",
  "Jutha": "S",
};

// Boucles de review prédéfinies pour les 3 semaines
// Chaque participant review le suivant dans sa boucle respective
const WEEK_LOOPS = {
  1: ["Antoine", "Awena", "Florian", "Daren", "François", "Minh Anh", "Jutha"],
  2: ["Antoine", "Florian", "Awena", "François", "Daren", "Jutha", "Minh Anh"],
  3: ["Antoine", "Minh Anh", "Florian", "François", "Awena", "Jutha", "Daren"],
};

// Date de début de la semaine 1 : 15 juin 2026 (lundi)
const START_DATE = new Date("2026-06-15T00:00:00");

// Participants absents (Set mis à jour dynamiquement)
const absentParticipants = new Set();

// Participant sélectionné pour focus (null = pas de focus)
let focusedPerson = null;

// Persistance localStorage
function saveState() {
  localStorage.setItem("absents", JSON.stringify([...absentParticipants]));
  localStorage.setItem("focused", focusedPerson ?? "");
}

function loadState() {
  const absents = JSON.parse(localStorage.getItem("absents") || "[]");
  absents.forEach((name) => {
    // Migration s'il y avait l'ancien nom sans espace
    let cleanName = name;
    if (name === "MinhAnh") cleanName = "Minh Anh";
    if (PARTICIPANTS.includes(cleanName)) {
      absentParticipants.add(cleanName);
    }
  });
  const focused = localStorage.getItem("focused");
  focusedPerson = focused || null;
  if (focusedPerson === "MinhAnh") focusedPerson = "Minh Anh";
}

// Calcul des informations du cycle actuel
function getCycleInfo() {
  const now = new Date();
  
  // Différence en millisecondes
  const diffTime = now - START_DATE;
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  
  // Nombre de semaines écoulées depuis le début (arrondi à l'inférieur)
  const weeksPassed = Math.floor(diffTime / msInWeek);
  
  // Semaine actuelle dans le cycle de 3 semaines (0 pour Semaine 1, 1 pour Semaine 2, 2 pour Semaine 3)
  const currentWeekIndex = ((weeksPassed % 3) + 3) % 3;
  
  // Début du cycle de 3 semaines contenant la date actuelle
  const cycleIndex = Math.floor(weeksPassed / 3);
  const cycleStartDate = new Date(START_DATE.getTime() + cycleIndex * 3 * msInWeek);
  
  return {
    currentWeekIndex,
    cycleStartDate,
  };
}

// Formater un intervalle de dates pour l'affichage (ex: "Du 15/06/2026 au 21/06/2026")
function formatDateRange(startDate) {
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  
  const format = (d) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  return `Du ${format(startDate)} au ${format(endDate)}`;
}

// Génère les permutations d'un tableau (utilisé pour trouver les cycles)
function getPermutations(array) {
  if (array.length === 0) return [[]];
  const result = [];
  for (let i = 0; i < array.length; i++) {
    const current = array[i];
    const remaining = array.slice(0, i).concat(array.slice(i + 1));
    const remainingPerms = getPermutations(remaining);
    for (let j = 0; j < remainingPerms.length; j++) {
      result.push([current].concat(remainingPerms[j]));
    }
  }
  return result;
}

// Génère tous les cycles uniques contenant un ensemble d'éléments
function getCycles(elements) {
  if (elements.length === 0) return [];
  const first = elements[0];
  const rest = elements.slice(1);
  const perms = getPermutations(rest);
  return perms.map((p) => [first].concat(p));
}

// Calcule le score d'un cycle en maximisant le fait qu'un Senior review un Junior,
// et en restant le plus proche possible de la boucle initiale.
function scoreCycle(cycle, baseLoop) {
  let score = 0;
  const k = cycle.length;

  for (let i = 0; i < k; i++) {
    const x = cycle[i];
    const y = cycle[(i + 1) % k];
    
    const roleX = ROLES[x];
    const roleY = ROLES[y];
    
    // Bonus pour alternance (Senior -> Junior et Junior -> Senior)
    if (roleX === "S" && roleY === "J") {
      score += 100;
    } else if (roleX === "J" && roleY === "S") {
      score += 100;
    } else if (roleX === "J" && roleY === "J") {
      score -= 50; // Pénalité forte si un Junior review un Junior
    } else if (roleX === "S" && roleY === "S") {
      score -= 10; // Pénalité faible si un Senior review un Senior
    }
    
    // Bonus de proximité pour conserver l'ordre initial (distance circulaire)
    const idxX = baseLoop.indexOf(x);
    const idxY = baseLoop.indexOf(y);
    if (idxX !== -1 && idxY !== -1) {
      const dist = (idxY - idxX + baseLoop.length) % baseLoop.length;
      score += 20 / dist;
    }
  }
  
  return score;
}

// Calcule les reviews d'une semaine en optimisant la boucle circulaire
function calculateReviews(weekNumber) {
  const loop = WEEK_LOOPS[weekNumber];
  if (!loop) return [];

  const present = PARTICIPANTS.filter((p) => !absentParticipants.has(p));
  
  if (present.length <= 1) {
    return present.map((reviewer) => ({
      reviewer,
      reviewee: null,
      redistributed: false,
    }));
  }

  // 1. Générer tous les cycles possibles de la taille des personnes présentes
  const cycles = getCycles(present);
  
  // 2. Trouver le cycle avec le score le plus élevé
  let bestCycle = null;
  let maxScore = -Infinity;
  
  cycles.forEach((cycle) => {
    const score = scoreCycle(cycle, loop);
    if (score > maxScore) {
      maxScore = score;
      bestCycle = cycle;
    }
  });

  // 3. Convertir le meilleur cycle en reviews
  const reviewsMap = new Map();
  const k = bestCycle.length;
  for (let i = 0; i < k; i++) {
    const reviewer = bestCycle[i];
    const reviewee = bestCycle[(i + 1) % k];
    
    // Indique s'il y a eu une déviation par rapport à la boucle de base
    const baseIdx = loop.indexOf(reviewer);
    const baseNext = loop[(baseIdx + 1) % loop.length];
    const redistributed = baseNext !== reviewee;
    
    reviewsMap.set(reviewer, {
      reviewer,
      reviewee,
      redistributed,
    });
  }

  // 4. Ordonner les reviews selon l'ordre initial des participants
  const reviews = [];
  PARTICIPANTS.forEach((p) => {
    if (reviewsMap.has(p)) {
      reviews.push(reviewsMap.get(p));
    }
  });

  return reviews;
}

// Applique le focus visuel (met en valeur les reviews concernant la personne)
function applyFocus() {
  document.querySelectorAll(".review-item").forEach((item) => {
    if (!focusedPerson) {
      item.classList.remove("highlighted", "dimmed");
    } else {
      const isReviewer = item.dataset.reviewer === focusedPerson;
      const isReviewee = item.dataset.reviewee === focusedPerson;
      
      if (isReviewer || isReviewee) {
        item.classList.add("highlighted");
        item.classList.remove("dimmed");
      } else {
        item.classList.add("dimmed");
        item.classList.remove("highlighted");
      }
    }
  });

  // Met à jour la classe active sur les boutons d'absence pour le focus
  document.querySelectorAll(".absence-btn").forEach((btn) => {
    const name = btn.dataset.name;
    if (focusedPerson === name) {
      btn.classList.add("focused-user");
    } else {
      btn.classList.remove("focused-user");
    }
  });
}

// Crée le DOM pour une section de semaine
function createWeekSection(weekNumber, isCurrent, weekStartDate) {
  const section = document.createElement("section");
  section.className = `week-section ${isCurrent ? "current" : ""}`;
  section.setAttribute("aria-label", `Semaine ${weekNumber}`);

  // En-tête de la semaine
  const header = document.createElement("div");
  header.className = "week-header";

  const title = document.createElement("h2");
  title.className = "week-title";
  title.textContent = `Semaine ${weekNumber}`;
  if (isCurrent) {
    const currentBadge = document.createElement("span");
    currentBadge.className = "current-badge";
    currentBadge.textContent = "Actuelle";
    title.appendChild(currentBadge);
  }

  const dates = document.createElement("div");
  dates.className = "week-dates";
  dates.textContent = formatDateRange(weekStartDate);

  header.appendChild(title);
  header.appendChild(dates);

  // Liste des reviews
  const reviewList = document.createElement("div");
  reviewList.className = "review-list";

  const reviews = calculateReviews(weekNumber);

  if (reviews.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "empty-reviews";
    emptyMsg.textContent = "Aucun participant présent";
    reviewList.appendChild(emptyMsg);
  } else {
    reviews.forEach((review) => {
      const reviewItem = document.createElement("div");
      reviewItem.className = "review-item";
      reviewItem.dataset.reviewer = review.reviewer;
      reviewItem.dataset.reviewee = review.reviewee || "";

      const rRole = ROLES[review.reviewer];
      
      let revieweeHtml;
      if (review.reviewee === null) {
        revieweeHtml = `<span class="reviewee no-review">—</span>`;
      } else {
        const reClass = review.redistributed ? " redistributed" : "";
        revieweeHtml = `
          <span class="reviewee${reClass}">
            <span class="name-text">${review.reviewee}</span>
          </span>
        `;
      }

      reviewItem.innerHTML = `
        <span class="reviewer name-tag">
          <span class="name-text">${review.reviewer}</span>
        </span>
        <span class="arrow" aria-hidden="true">→</span>
        ${revieweeHtml}
      `;

      // Clic sur un nom pour focus
      reviewItem
        .querySelectorAll(".name-tag, .reviewee:not(.no-review)")
        .forEach((span) => {
          span.addEventListener("click", (e) => {
            e.stopPropagation();
            const nameSpan = span.querySelector(".name-text");
            if (!nameSpan) return;
            const name = nameSpan.textContent.trim();
            focusedPerson = focusedPerson === name ? null : name;
            saveState();
            applyFocus();
          });
        });

      reviewList.appendChild(reviewItem);
    });
  }

  section.appendChild(header);
  section.appendChild(reviewList);

  return section;
}

// Initialise et affiche le panneau de gestion des absences
function renderAbsencePanel() {
  const container = document.getElementById("absence-buttons");
  container.innerHTML = "";
  
  PARTICIPANTS.forEach((name) => {
    const btn = document.createElement("button");
    const role = ROLES[name];
    
    btn.className = "absence-btn";
    if (absentParticipants.has(name)) {
      btn.classList.add("absent");
    }
    if (focusedPerson === name) {
      btn.classList.add("focused-user");
    }
    
    btn.dataset.name = name;
    btn.innerHTML = `<span class="btn-name">${name}</span>`;
    btn.setAttribute("aria-pressed", absentParticipants.has(name).toString());
    
    btn.addEventListener("click", () => {
      if (absentParticipants.has(name)) {
        absentParticipants.delete(name);
      } else {
        absentParticipants.add(name);
        if (focusedPerson === name) focusedPerson = null;
      }
      saveState();
      renderAbsencePanel();
      renderReviewList();
    });
    
    container.appendChild(btn);
  });
}

// Affiche les reviews des 3 semaines dans le DOM
function renderReviewList() {
  const { currentWeekIndex, cycleStartDate } = getCycleInfo();
  const weeksContainer = document.getElementById("weeks-container");
  weeksContainer.innerHTML = "";

  // Générer et ajouter les 3 semaines
  for (let i = 0; i < 3; i++) {
    const weekNum = i + 1;
    const isCurrent = i === currentWeekIndex;
    const weekStartDate = new Date(cycleStartDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    weeksContainer.appendChild(createWeekSection(weekNum, isCurrent, weekStartDate));
  }

  applyFocus();
}

// Initialisation au chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderAbsencePanel();
  renderReviewList();
  
  // Permet de désactiver le focus si on clique à côté
  document.addEventListener("click", () => {
    if (focusedPerson) {
      focusedPerson = null;
      saveState();
      applyFocus();
    }
  });
});

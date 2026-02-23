// Liste des participants (ordre fixe selon l'image)
const PARTICIPANTS = ["Antoine", "Florian", "François", "Jutha"];

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
  absents.forEach((name) => absentParticipants.add(name));
  const focused = localStorage.getItem("focused");
  focusedPerson = focused || null;
}

// Date de début de la semaine 1 : 19 janvier 2026 (dimanche)
const START_DATE = new Date("2026-01-19");
const WEEK_CYCLE = 3; // Cycle de 3 semaines

// Matrice des reviews basée sur l'image fournie
// reviewMatrix[semaine-1][reviewer] = reviewee
const REVIEW_MATRIX = {
  0: {
    // Semaine 1
    Antoine: "Jutha",
    Florian: "Antoine",
    François: "Florian",
    Jutha: "François",
  },
  1: {
    // Semaine 2
    Antoine: "François",
    Florian: "Jutha",
    François: "Antoine",
    Jutha: "Florian",
  },
  2: {
    // Semaine 3
    Antoine: "Florian",
    Florian: "François",
    François: "Jutha",
    Jutha: "Antoine",
  },
};

// Fonction pour calculer la semaine actuelle (1, 2 ou 3) à partir du 19 janvier 2026
function getCurrentWeek() {
  const now = new Date();

  // Calculer le nombre de jours écoulés depuis le début
  const diffTime = now - START_DATE;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Calculer le nombre de semaines écoulées (une semaine = 7 jours)
  const weeksPassed = Math.floor(diffDays / 7);

  // Calculer la semaine actuelle dans le cycle (1, 2, ou 3)
  const cycleWeek = (weeksPassed % WEEK_CYCLE) + 1;

  return {
    week: cycleWeek,
    year: now.getFullYear(),
  };
}

// Résout la chaîne de review en sautant les absents.
// Si la chaîne boucle sur le reviewer lui-même, fallback sur le premier présent disponible.
function resolveReviewee(weekReviews, reviewer) {
  const base = weekReviews[reviewer];
  let reviewee = base;
  const visited = new Set([reviewee]);

  while (absentParticipants.has(reviewee)) {
    const next = weekReviews[reviewee];
    if (!next || visited.has(next)) {
      reviewee = null;
      break;
    }
    visited.add(next);
    reviewee = next;
  }

  // Auto-review ou null → fallback : premier présent dans l'ordre des participants
  if (reviewee === reviewer || reviewee === null) {
    reviewee =
      PARTICIPANTS.find((p) => p !== reviewer && !absentParticipants.has(p)) ??
      null;
  }

  return reviewee;
}

// Fonction pour obtenir les reviews de la semaine actuelle (avec gestion des absences)
function calculateReviews(weekNumber) {
  const reviews = [];

  const matrixIndex = weekNumber - 1;
  const weekReviews = REVIEW_MATRIX[matrixIndex];

  PARTICIPANTS.forEach((reviewer) => {
    if (absentParticipants.has(reviewer)) return;

    const baseReviewee = weekReviews[reviewer];
    const finalReviewee = resolveReviewee(weekReviews, reviewer);
    reviews.push({
      reviewer,
      reviewee: finalReviewee,
      redistributed: finalReviewee !== baseReviewee,
    });
  });

  return reviews;
}

// Applique le filtre de focus : cache les lignes qui ne concernent pas la personne
function applyFocus() {
  document.querySelectorAll(".review-item").forEach((item) => {
    if (!focusedPerson) {
      item.style.display = "";
    } else {
      const match =
        item.dataset.reviewer === focusedPerson ||
        item.dataset.reviewee === focusedPerson;
      item.style.display = match ? "" : "none";
    }
  });
}

// Fonction pour créer une section de semaine
function createWeekSection(weekNumber, isCurrent) {
  const section = document.createElement("div");
  section.className = `week-section ${isCurrent ? "current" : ""}`;

  // En-tête de la semaine
  const header = document.createElement("div");
  header.className = "week-header";
  header.textContent = isCurrent
    ? `Semaine ${weekNumber} (Actuelle)`
    : `Semaine ${weekNumber}`;

  // Liste des reviews
  const reviewList = document.createElement("div");
  reviewList.className = "review-list";

  const reviews = calculateReviews(weekNumber);
  reviews.forEach((review) => {
    const reviewItem = document.createElement("div");
    reviewItem.className = "review-item";
    reviewItem.dataset.reviewer = review.reviewer;
    reviewItem.dataset.reviewee = review.reviewee || "";

    let revieweeHtml;
    if (review.reviewee === null) {
      revieweeHtml = `<span class="reviewee no-review">—</span>`;
    } else {
      revieweeHtml = `<span class="reviewee${review.redistributed ? " redistributed" : ""}">${review.reviewee}</span>`;
    }

    reviewItem.innerHTML = `
            <span class="reviewer name-tag">${review.reviewer}</span>
            <span class="arrow">→</span>
            ${revieweeHtml}
        `;

    // Clic sur un nom → sélection
    reviewItem
      .querySelectorAll(".name-tag, .reviewee:not(.no-review)")
      .forEach((span) => {
        span.addEventListener("click", (e) => {
          e.stopPropagation();
          const name = span.textContent.trim();
          focusedPerson = focusedPerson === name ? null : name;
          saveState();
          applyFocus();
        });
      });

    reviewList.appendChild(reviewItem);
  });

  section.appendChild(header);
  section.appendChild(reviewList);

  return section;
}

// Initialise les boutons d'absence
function renderAbsencePanel() {
  const container = document.getElementById("absence-buttons");
  container.innerHTML = "";
  PARTICIPANTS.forEach((name) => {
    const btn = document.createElement("button");
    btn.className =
      "absence-btn" + (absentParticipants.has(name) ? " absent" : "");
    btn.textContent = name;
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

// Fonction pour afficher les reviews dans le DOM
function renderReviewList() {
  const { week } = getCurrentWeek();

  // Calculer les semaines à afficher (précédente, actuelle, suivante)
  const previousWeek = week === 1 ? 3 : week - 1;
  const nextWeek = week === 3 ? 1 : week + 1;

  // Générer les 3 sections de semaines
  const weeksContainer = document.getElementById("weeks-container");
  weeksContainer.innerHTML = "";

  // Ajouter les 3 semaines
  weeksContainer.appendChild(createWeekSection(previousWeek, false));
  weeksContainer.appendChild(createWeekSection(week, true));
  weeksContainer.appendChild(createWeekSection(nextWeek, false));

  applyFocus();
}

// Initialiser l'application au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderAbsencePanel();
  renderReviewList();
});

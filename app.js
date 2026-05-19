// Liste des participants (ordre fixe)
const PARTICIPANTS = [
  "Antoine",
  "Awena",
  "Daren",
  "Florian",
  "François",
  "Jutha",
  "MinhAnh",
];

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
const WEEK_CYCLE = Math.max(PARTICIPANTS.length - 1, 1);

// Génère une rotation circulaire: en semaine k, chacun review la personne k positions avant lui.
// reviewMatrix[semaine-1][reviewer] = reviewee
function buildReviewMatrix() {
  const matrix = {};

  for (let weekIndex = 0; weekIndex < WEEK_CYCLE; weekIndex += 1) {
    const offset = weekIndex + 1;
    const weekMap = {};

    PARTICIPANTS.forEach((reviewer, index) => {
      const revieweeIndex =
        (index - offset + PARTICIPANTS.length) % PARTICIPANTS.length;
      weekMap[reviewer] = PARTICIPANTS[revieweeIndex];
    });

    matrix[weekIndex] = weekMap;
  }

  return matrix;
}

const REVIEW_MATRIX = buildReviewMatrix();

// Fonction pour calculer la semaine actuelle (1..WEEK_CYCLE) à partir du 19 janvier 2026
function getCurrentWeek() {
  const now = new Date();

  // Calculer le nombre de jours écoulés depuis le début
  const diffTime = now - START_DATE;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Calculer le nombre de semaines écoulées (une semaine = 7 jours)
  const weeksPassed = Math.floor(diffDays / 7);

  // Calculer la semaine actuelle dans le cycle
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
  const matrixIndex = weekNumber - 1;
  const weekReviews = REVIEW_MATRIX[matrixIndex];
  const present = PARTICIPANTS.filter((p) => !absentParticipants.has(p));

  // Étape 1 : assignments initiaux via suivi de chaîne
  const assignments = new Map();
  present.forEach((reviewer) => {
    assignments.set(reviewer, resolveReviewee(weekReviews, reviewer));
  });

  // Étape 2 : compter combien de fois chaque présent est reviewé
  const reviewedCount = new Map(present.map((p) => [p, 0]));
  assignments.forEach((reviewee) => {
    if (reviewee && reviewedCount.has(reviewee)) {
      reviewedCount.set(reviewee, reviewedCount.get(reviewee) + 1);
    }
  });

  // Étape 3 : réassigner les reviewers en double vers les présents non-couverts
  const unreviewed = present.filter((p) => reviewedCount.get(p) === 0);
  unreviewed.forEach((missing) => {
    for (const [rev, target] of assignments) {
      if (target && reviewedCount.get(target) > 1 && rev !== missing) {
        reviewedCount.set(target, reviewedCount.get(target) - 1);
        assignments.set(rev, missing);
        reviewedCount.set(missing, 1);
        break;
      }
    }
  });

  // Construire le résultat final
  const reviews = [];
  present.forEach((reviewer) => {
    const baseReviewee = weekReviews[reviewer];
    const finalReviewee = assignments.get(reviewer) ?? null;
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
  const previousWeek = ((week - 2 + WEEK_CYCLE) % WEEK_CYCLE) + 1;
  const nextWeek = (week % WEEK_CYCLE) + 1;

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

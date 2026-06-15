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

// Calcule les reviews d'une semaine en suivant la boucle et en sautant les absents
function calculateReviews(weekNumber) {
  const loop = WEEK_LOOPS[weekNumber];
  if (!loop) return [];

  const present = PARTICIPANTS.filter((p) => !absentParticipants.has(p));
  
  // S'il n'y a pas assez de monde pour faire des reviews
  if (present.length <= 1) {
    return present.map((reviewer) => ({
      reviewer,
      reviewee: null,
      redistributed: false,
    }));
  }

  const reviews = [];

  present.forEach((reviewer) => {
    const index = loop.indexOf(reviewer);
    if (index === -1) return;

    let reviewee = null;
    let nextIndex = index;
    
    // On parcourt la boucle circulaire pour trouver le prochain présent
    for (let i = 0; i < loop.length; i++) {
      nextIndex = (nextIndex + 1) % loop.length;
      const candidate = loop[nextIndex];
      
      if (candidate === reviewer) {
        break; // Évite l'auto-review
      }
      
      if (!absentParticipants.has(candidate)) {
        reviewee = candidate;
        break;
      }
    }

    // Indique s'il y a eu un saut d'absent (redistribution)
    const baseNext = loop[(index + 1) % loop.length];
    const redistributed = baseNext !== reviewee;

    reviews.push({
      reviewer,
      reviewee,
      redistributed,
    });
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

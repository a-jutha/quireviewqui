// Liste des participants (ordre fixe selon l'image)
const PARTICIPANTS = ['Antoine', 'Florian', 'François', 'Jutha'];

// Date de début de la semaine 1 : 19 janvier 2026 (dimanche)
const START_DATE = new Date('2026-01-19');
const WEEK_CYCLE = 3; // Cycle de 3 semaines

// Matrice des reviews basée sur l'image fournie
// reviewMatrix[semaine-1][reviewer] = reviewee
const REVIEW_MATRIX = {
    0: { // Semaine 1
        'Antoine': 'Jutha',
        'Florian': 'Antoine',
        'François': 'Florian',
        'Jutha': 'François'
    },
    1: { // Semaine 2
        'Antoine': 'François',
        'Florian': 'Jutha',
        'François': 'Antoine',
        'Jutha': 'Florian'
    },
    2: { // Semaine 3
        'Antoine': 'Florian',
        'Florian': 'François',
        'François': 'Jutha',
        'Jutha': 'Antoine'
    }
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
        year: now.getFullYear()
    };
}

// Fonction pour obtenir les reviews de la semaine actuelle
function calculateReviews(weekNumber) {
    const reviews = [];
    
    // weekNumber est entre 1 et 3, on doit utiliser l'index 0-2
    const matrixIndex = weekNumber - 1;
    const weekReviews = REVIEW_MATRIX[matrixIndex];
    
    // Créer les paires de review dans l'ordre des participants
    PARTICIPANTS.forEach(reviewer => {
        reviews.push({
            reviewer: reviewer,
            reviewee: weekReviews[reviewer]
        });
    });
    
    return reviews;
}

// Fonction pour créer une section de semaine
function createWeekSection(weekNumber, isCurrent) {
    const section = document.createElement('div');
    section.className = `week-section ${isCurrent ? 'current' : ''}`;
    
    // En-tête de la semaine
    const header = document.createElement('div');
    header.className = 'week-header';
    header.textContent = isCurrent ? `Semaine ${weekNumber} (Actuelle)` : `Semaine ${weekNumber}`;
    
    // Liste des reviews
    const reviewList = document.createElement('div');
    reviewList.className = 'review-list';
    
    const reviews = calculateReviews(weekNumber);
    reviews.forEach(review => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        reviewItem.innerHTML = `
            <span class="reviewer">${review.reviewer}</span>
            <span class="arrow">→</span>
            <span class="reviewee">${review.reviewee}</span>
        `;
        
        reviewList.appendChild(reviewItem);
    });
    
    section.appendChild(header);
    section.appendChild(reviewList);
    
    return section;
}

// Fonction pour afficher les reviews dans le DOM
function renderReviewList() {
    const { week, year } = getCurrentWeek();
    
    // Calculer les semaines à afficher (précédente, actuelle, suivante)
    const previousWeek = week === 1 ? 3 : week - 1;
    const nextWeek = week === 3 ? 1 : week + 1;
    
    // Générer les 3 sections de semaines
    const weeksContainer = document.getElementById('weeks-container');
    weeksContainer.innerHTML = '';
    
    // Ajouter les 3 semaines
    weeksContainer.appendChild(createWeekSection(previousWeek, false));
    weeksContainer.appendChild(createWeekSection(week, true));
    weeksContainer.appendChild(createWeekSection(nextWeek, false));
}

// Initialiser l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    renderReviewList();
});

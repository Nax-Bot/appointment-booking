// Petit « magasin » partagé pour la barre de chargement en haut de la page.
// start() la lance, done() la termine. NavigationProgress s'abonne et l'affiche.
type Listener = (value: number, visible: boolean) => void;

const listeners = new Set<Listener>();
let value = 0;
let visible = false;
let trickleTimer: ReturnType<typeof setInterval> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let startedAt = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

// La barre reste au moins ce temps visible, pour qu'on la voie même si la page est prête vite
const MIN_VISIBLE_MS = 450;

function emit() {
    listeners.forEach((listener) => listener(value, visible));
}

function clearTimers() {
    if (trickleTimer !== null) clearInterval(trickleTimer);
    if (safetyTimer !== null) clearTimeout(safetyTimer);
    if (hideTimer !== null) clearTimeout(hideTimer);
    trickleTimer = null;
    safetyTimer = null;
    hideTimer = null;
}

export function subscribeProgress(listener: Listener): () => void {
    listeners.add(listener);
    listener(value, visible);
    return () => {
        listeners.delete(listener);
    };
}

export function startProgress() {
    if (visible && value < 100 && trickleTimer !== null) {
        return; // déjà en cours
    }
    clearTimers();
    startedAt = Date.now();
    visible = true;
    value = 8;
    emit();

    // La barre avance de moins en moins vite et n'atteint jamais 100 toute seule (comme Facebook)
    trickleTimer = setInterval(() => {
        const remaining = 92 - value;
        value = value + Math.max(0.4, remaining * 0.08);
        emit();
    }, 180);

    // Sécurité : si la navigation n'aboutit jamais, on ne laisse pas la barre bloquée
    safetyTimer = setTimeout(() => doneProgress(true), 12000);
}

export function doneProgress(force = false) {
    if (visible === false) {
        return;
    }
    const elapsed = Date.now() - startedAt;
    const wait = force ? 0 : Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (hideTimer !== null) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        clearTimers();
        value = 100;
        emit();
        // on laisse la barre finir son trajet, puis elle disparaît en fondu
        hideTimer = setTimeout(() => {
            visible = false;
            emit();
            hideTimer = setTimeout(() => {
                value = 0;
                emit();
            }, 300);
        }, 260);
    }, wait);
}

import {
  REVISE_ACTION_KEY,
  REVISE_CONTEXT_KEY,
  REVISE_HOTEL_CANDIDATE_KEY,
} from './constants';

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getReviseContext() {
  if (typeof window === 'undefined') return null;
  return safeParse(sessionStorage.getItem(REVISE_CONTEXT_KEY));
}

export function setReviseContext(content) {
  if (typeof window === 'undefined' || !content) return;
  try {
    sessionStorage.setItem(REVISE_CONTEXT_KEY, JSON.stringify(content));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getReviseAction() {
  if (typeof window === 'undefined') return '';
  return String(sessionStorage.getItem(REVISE_ACTION_KEY) || '').trim();
}

export function setReviseAction(action) {
  if (typeof window === 'undefined') return;
  try {
    if (action) sessionStorage.setItem(REVISE_ACTION_KEY, action);
    else sessionStorage.removeItem(REVISE_ACTION_KEY);
  } catch {
    /* ignore */
  }
}

export function getReviseHotelCandidate() {
  if (typeof window === 'undefined') return null;
  return safeParse(sessionStorage.getItem(REVISE_HOTEL_CANDIDATE_KEY));
}

export function setReviseHotelCandidate(hotel) {
  if (typeof window === 'undefined') return;
  try {
    if (hotel) sessionStorage.setItem(REVISE_HOTEL_CANDIDATE_KEY, JSON.stringify(hotel));
    else sessionStorage.removeItem(REVISE_HOTEL_CANDIDATE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearReviseHotelCandidate() {
  setReviseHotelCandidate(null);
}

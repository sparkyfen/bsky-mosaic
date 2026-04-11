import { writable } from 'svelte/store';

/** Set to true to open the login modal from any page. Layout subscribes to this. */
export const showLoginModal = writable(false);

/** Set to true after restoreSession() has completed (success or failure). */
export const sessionReady = writable(false);

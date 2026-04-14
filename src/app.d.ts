import type { PhotoPost } from '$lib/api/bluesky.js';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			modalPost?: PhotoPost;
			modalImageIndex?: number;
		}
		// interface Platform {}
	}
}

export {};

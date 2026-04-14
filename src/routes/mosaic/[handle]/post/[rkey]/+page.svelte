<script lang="ts">
	import PhotoModal from '$lib/components/PhotoModal.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	function closeModal() {
		goto(`/mosaic/${encodeURIComponent(data.handle)}`);
	}
</script>

<PhotoModal post={data.post} imageIndex={0} onclose={closeModal} />

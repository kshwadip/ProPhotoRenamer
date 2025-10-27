<script lang="ts">
	import { filesStore, selectedCount, totalFiles } from '$lib/stores/files';
	import { extractExif } from '$lib/utils/exif';
	import { applyTemplate, batchRename } from '$lib/utils/rename';
	import { createZip, downloadZip, type ZipResult } from '$lib/utils/zip';
	import type { Photo } from '$lib/types/photo';
	import { usageStore } from '$lib/stores/usage';
	import { notifications } from '$lib/stores/notification';
	import { shouldEnforceLimits } from '$lib/utils/environment';
	import { analyticsStore } from '$lib/stores/analytics';
	import { generateFingerprint } from '$lib/utils/fingerprint';
	import { onMount } from 'svelte';

	import Dropzone from '../components/Dropzone.svelte';
	import FileList from '../components/FileList.svelte';
	import TemplateEditor from '../components/TemplateEditor.svelte';
	import DownloadButton from '../components/DownloadButton.svelte';

	let currentTemplate = '{date}_{model}_{counter}';
	let previousTemplate = currentTemplate;
	let isExtracting = false;
	let isDownloading = false;
	let downloadProgress = 0;

	interface ServerUsage {
		remaining: number;
		limit: number;
		used: number;
		canAdd: boolean;
		photosToAdd: number;
	}
	let serverUsage: ServerUsage | null = null;

	$: photos = $filesStore.photos;
	$: selectedPhotos = photos.filter((p) => p.selected);
	$: canDownload = selectedPhotos.length > 0 && currentTemplate.length > 0;
	$: if (currentTemplate !== previousTemplate && previousTemplate !== '') {
		analyticsStore.trackTemplateUsed(currentTemplate);
		analyticsStore.trackEvent('template_changed', {
			from: previousTemplate,
			to: currentTemplate
		});
		previousTemplate = currentTemplate;
	}

	onMount(async () => {
		analyticsStore.trackEvent('page_view');
		console.log('🔍 onMount: fetching server usage...');
		serverUsage = await fetchServerUsage();
		console.log('🔍 onMount: serverUsage result:', serverUsage);
	});

	async function fetchServerUsage() {
		console.log('🔍 fetchServerUsage called, shouldEnforceLimits():', shouldEnforceLimits());

		if (!shouldEnforceLimits()) return null;

		try {
			const fingerprint = generateFingerprint();
			console.log('🔍 Generated fingerprint:', fingerprint);

			const response = await fetch(
				'https://vnustygjnsuncyhnqlxl.supabase.co/functions/v1/check-limit',
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudXN0eWdqbnN1bmN5aG5xbHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MDE1NTEsImV4cCI6MjA3Njk3NzU1MX0.DCu7-JhaLDBJzLvGCfkGJZYKbCS4qGgoXZNOR1Z9Kn4`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						fingerprint,
						photosToAdd: 0
					})
				}
			);

			console.log('🔍 Server response status:', response.status, response.ok);
			const result = await response.json();
			console.log('🔍 Server response data:', result);
			return result;
		} catch (error) {
			console.error('🔍 Failed to fetch server usage:', error);
			return null;
		}
	}

	function updatePreviews() {
		let counter = 1;

		selectedPhotos.forEach((photo) => {
			if (photo.metadata.exif) {
				const newBaseName = applyTemplate(
					currentTemplate,
					photo.metadata.exif,
					counter,
					photo.metadata.fileName
				);
				const extension = getFileExtension(photo.metadata.fileName);
				const newFileName = `${newBaseName}.${extension}`;

				const warnings = generateTemplateWarnings(currentTemplate, photo.metadata.exif);

				filesStore.setRenameResult(photo.id, {
					success: true,
					originalName: photo.metadata.fileName,
					newName: newFileName,
					warnings: warnings
				});

				counter++;
			}
		});
	}

	function generateTemplateWarnings(template: string, exifData: any): string[] {
		const warnings: string[] = [];

		if (template.includes('{make}') && !exifData.make) {
			warnings.push('Camera make not available in EXIF data');
		}

		if (template.includes('{model}') && !exifData.model) {
			warnings.push('Camera model not available in EXIF data');
		}

		if (template.includes('{focal}') && !exifData.focalLength) {
			warnings.push('Focal length not available in EXIF data');
		}

		if (template.includes('{aperture}') && !exifData.fNumber) {
			warnings.push('Aperture not available in EXIF data');
		}

		if (template.includes('{iso}') && !exifData.iso) {
			warnings.push('ISO not available in EXIF data');
		}

		if (
			(template.includes('{lat}') || template.includes('{lng}') || template.includes('{gps}')) &&
			!exifData.gps
		) {
			warnings.push('GPS coordinates not available');
		}

		return warnings;
	}

	function getFileExtension(filename: string): string {
		const parts = filename.split('.');
		return parts.length > 1 ? parts[parts.length - 1] : 'jpg';
	}

	$: if (currentTemplate && selectedPhotos.length > 0) {
		updatePreviews();
	}

	async function handleFilesAdded(files: File[]) {
		console.log('🚀 Upload function called - NO SERVER CALLS VERSION');

		// Track analytics only if consented
		if (analyticsStore.hasConsent()) {
			analyticsStore.trackPhotosUploaded(files.length);
			analyticsStore.trackEvent('photos_uploaded', { count: files.length });
		}

		filesStore.addFiles(files);
		isExtracting = true;

		try {
			for (const file of files) {
				const exifData = await extractExif(file);
				const photo = $filesStore.photos.find((p: Photo) => p.file === file);

				if (photo) {
					filesStore.setExifData(photo.id, exifData);
				}
			}
		} catch (error) {
			console.error('Error processing files:', error);
			notifications.show('error', 'Failed to process some files. Please try again.', 5000);
		} finally {
			isExtracting = false;
		}

		updatePreviews();
	}

	async function handleDownload() {
		if (!canDownload) return;

		// Check server-side limit before downloading
		if (shouldEnforceLimits()) {
			try {
				const fingerprint = generateFingerprint();

				const response = await fetch(
					'https://vnustygjnsuncyhnqlxl.supabase.co/functions/v1/check-limit',
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudXN0eWdqbnN1bmN5aG5xbHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MDE1NTEsImV4cCI6MjA3Njk3NzU1MX0.DCu7-JhaLDBJzLvGCfkGJZYKbCS4qGgoXZNOR1Z9Kn4`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							fingerprint,
							photosToAdd: selectedPhotos.length,
							action: 'download'
						})
					}
				);

				const result = await response.json();

				if (!result.canAdd) {
					notifications.show(
						'error',
						`🚫 You've reached your free limit of ${result.limit} photos! You have processed ${result.used} photos.`,
						8000
					);
					return;
				}
			} catch (error) {
				console.error('Server limit check failed:', error);
			}
		}

		isDownloading = true;
		downloadProgress = 0;

		try {
			// Track local usage only when limits are enforced
			if (shouldEnforceLimits()) {
				usageStore.trackUsage(selectedPhotos.length);
			}

			// Rest of your download logic...
			const exifDataMap = new Map();
			selectedPhotos.forEach((photo) => {
				if (photo.metadata.exif) {
					exifDataMap.set(photo.file.name, photo.metadata.exif);
				}
			});

			const selectedFiles = selectedPhotos.map((p) => p.file);
			const renameResults = batchRename(selectedFiles, currentTemplate, exifDataMap);

			const renameMap = new Map();
			renameResults.forEach((result: any, file: any) => {
				renameMap.set(file, result);
			});

			const zipResult: ZipResult = await createZip(selectedFiles, renameMap, {
				compressionLevel: 6,
				includeMetadata: false,
				onProgress: (current, total, filename) => {
					downloadProgress = (current / total) * 100;
				}
			});

			// Track analytics only if consented
			if (analyticsStore.hasConsent()) {
				analyticsStore.trackDownload(selectedPhotos.length);
				analyticsStore.trackEvent('download_completed', {
					photoCount: selectedPhotos.length,
					template: currentTemplate
				});
			}

			// ALWAYS track downloads for usage limits (separate from analytics consent)
			if (shouldEnforceLimits()) {
				try {
					await fetch('https://vnustygjnsuncyhnqlxl.supabase.co/functions/v1/check-limit', {
						method: 'POST',
						headers: {
							Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudXN0eWdqbnN1bmN5aG5xbHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MDE1NTEsImV4cCI6MjA3Njk3NzU1MX0.DCu7-JhaLDBJzLvGCfkGJZYKbCS4qGgoXZNOR1Z9Kn4`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							fingerprint: generateFingerprint(),
							photosToAdd: selectedPhotos.length,
							action: 'record_download'
						})
					});

					// Refresh server usage after recording download
					serverUsage = await fetchServerUsage();
				} catch (error) {
					console.error('Failed to record download for usage tracking:', error);
				}
			}

			downloadZip(zipResult);

			notifications.show(
				'success',
				`Successfully downloaded ${selectedPhotos.length} renamed photos!`
			);
		} catch (error) {
			console.error('Download failed:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			notifications.show('error', `Failed to create ZIP: ${errorMessage}`);
		} finally {
			isDownloading = false;
			downloadProgress = 0;
		}
	}
</script>

<svelte:head>
	<title>Pro Photographer Renamer</title>
</svelte:head>

<div class="app-container">
	<header class="app-header">
		<h2>Rename your photos using EXIF metadata</h2>
	</header>

	<main class="app-main">
		<section class="upload-section">
			<Dropzone on:upload={(e) => handleFilesAdded(e.detail)} />
			{#if isExtracting}
				<p class="status-message">Extracting EXIF data...</p>
			{/if}
		</section>

		{#if $totalFiles > 0}
			<section class="files-section">
				<div class="section-header">
					<h2>Uploaded Files</h2>
					<div class="file-stats">
						<span>{$selectedCount} selected / {$totalFiles} total</span>
						{#if shouldEnforceLimits()}
							<span
								class="usage-indicator {(serverUsage?.remaining ||
									usageStore.getUsageStats().remaining) <= 20
									? 'usage-warning'
									: ''}"
							>
								{serverUsage?.remaining || usageStore.getUsageStats().remaining} of {serverUsage?.limit ||
									usageStore.getUsageStats().limit} free photos remaining
							</span>
						{:else}
							<span class="usage-indicator pro-badge"> ✨ Pro Version - Unlimited </span>
						{/if}

						<button class="btn-secondary" on:click={() => filesStore.clear()}> Clear All </button>
					</div>
				</div>
				<FileList />
			</section>

			<section class="template-section">
				<TemplateEditor bind:template={currentTemplate} {updatePreviews} />
			</section>

			<section class="download-section">
				<DownloadButton on:click={handleDownload} disabled={!canDownload || isDownloading} />
				{#if isDownloading}
					<div class="progress-bar">
						<div class="progress-fill" style="width: {downloadProgress}%"></div>
					</div>
					<p class="progress-text">{Math.round(downloadProgress)}% complete</p>
				{/if}
			</section>
		{:else if shouldEnforceLimits()}
			<section class="usage-info-section">
				<div class="usage-info-card">
					{#if serverUsage}
						<div class="usage-stats">
							<div class="usage-main">
								<span class="usage-number">{serverUsage.remaining}</span>
								<span class="usage-text">free photos remaining</span>
							</div>
							<div class="usage-details">
								<span
									>You've used {serverUsage.used} out of {serverUsage.limit} free photos (server-tracked)</span
								>
								<div class="usage-bar">
									<div
										class="usage-progress"
										style="width: {(serverUsage.used / serverUsage.limit) * 100}%"
									></div>
								</div>
							</div>
						</div>
						{#if serverUsage.remaining === 0}
							<div class="upgrade-prompt">
								<p>🚀 <strong>Upgrade to Pro</strong> for unlimited photo processing!</p>
								<button class="btn-primary">Get Pro Version</button>
							</div>
						{/if}
					{:else}
						<div class="usage-stats">
							<span class="usage-text">Loading server usage...</span>
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</main>

	<footer class="app-footer">
		<p>All processing happens in your browser. No files are uploaded to any server.</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f7fafc;
		color: #2d3748;
	}

	:global([data-theme='dark']) :global(body) {
		background: var(--bg-secondary);
		color: #ffffff;
	}

	.app-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 40px 20px;
	}

	.app-header {
		text-align: center;
		margin-bottom: 48px;
	}

	h2 {
		margin-right: 20px;
		color: #1a202c;
	}

	:global([data-theme='dark']) h2 {
		color: #ffffff;
	}

	section {
		margin-bottom: 32px;
	}

	.template-section {
		display: flex;
		justify-content: center;
		width: 100%;
		padding: 0 20px;
		box-sizing: border-box;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.section-header h2 {
		color: #2d3748;
	}

	:global([data-theme='dark']) .section-header h2 {
		color: #ffffff;
	}

	.file-stats {
		display: flex;
		gap: 16px;
		align-items: center;
		color: #718096;
	}

	:global([data-theme='dark']) .file-stats {
		color: var(--text-muted);
	}

	.btn-secondary {
		padding: 8px 16px;
		background: #e2e8f0;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		color: #2d3748;
	}

	:global([data-theme='dark']) .btn-secondary {
		background: var(--bg-tertiary);
		color: #ffffff;
	}

	.btn-secondary:hover {
		background: #cbd5e0;
	}

	:global([data-theme='dark']) .btn-secondary:hover {
		background: var(--border-hover);
	}

	.status-message {
		text-align: center;
		color: #4299e1;
		margin-top: 12px;
		font-style: italic;
	}

	:global([data-theme='dark']) .status-message {
		color: var(--accent);
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
		margin-top: 12px;
	}

	:global([data-theme='dark']) .progress-bar {
		background: var(--bg-tertiary);
	}

	.progress-fill {
		height: 100%;
		background: #48bb78;
		transition: width 0.3s;
	}

	.progress-text {
		text-align: center;
		color: #4a5568;
		margin-top: 8px;
	}

	:global([data-theme='dark']) .progress-text {
		color: var(--text-secondary);
	}

	.app-footer {
		text-align: center;
		padding-top: 32px;
		border-top: 1px solid #e2e8f0;
		color: #a0aec0;
		font-size: 14px;
	}

	:global([data-theme='dark']) .app-footer {
		border-top-color: var(--border-color);
		color: var(--text-muted);
	}

	.usage-indicator {
		font-size: 14px;
		color: #718096;
		font-weight: 500;
	}

	:global([data-theme='dark']) .usage-indicator {
		color: var(--text-muted);
	}

	.pro-badge {
		color: #48bb78;
		font-weight: 600;
	}

	:global([data-theme='dark']) .pro-badge {
		color: var(--accent);
	}

	.usage-warning {
		color: #e53e3e !important;
		font-weight: 600;
	}

	.usage-info-section {
		margin-bottom: 32px;
	}

	.usage-info-card {
		background: white;
		padding: 24px;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e2e8f0;
		text-align: center;
	}

	:global([data-theme='dark']) .usage-info-card {
		background: var(--bg-secondary);
		border-color: var(--border-color);
	}

	.usage-stats {
		margin-bottom: 20px;
	}

	.usage-main {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 12px;
	}

	.usage-number {
		font-size: 48px;
		font-weight: 700;
		color: #4299e1;
		line-height: 1;
	}

	.usage-text {
		font-size: 18px;
		color: #718096;
		font-weight: 500;
	}

	:global([data-theme='dark']) .usage-text {
		color: var(--text-muted);
	}

	.usage-details {
		font-size: 14px;
		color: #718096;
	}

	:global([data-theme='dark']) .usage-details {
		color: var(--text-muted);
	}

	.usage-bar {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
		margin-top: 8px;
	}

	:global([data-theme='dark']) .usage-bar {
		background: var(--bg-tertiary);
	}

	.usage-progress {
		height: 100%;
		background: linear-gradient(90deg, #48bb78, #4299e1, #e53e3e);
		transition: width 0.3s ease;
	}

	.upgrade-prompt {
		border-top: 1px solid #e2e8f0;
		padding-top: 20px;
	}

	:global([data-theme='dark']) .upgrade-prompt {
		border-top-color: var(--border-color);
	}

	.upgrade-prompt p {
		margin: 0 0 16px 0;
		font-size: 16px;
	}

	.btn-primary {
		background: #4299e1;
		color: white;
		border: none;
		padding: 12px 24px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary:hover {
		background: #3182ce;
	}
</style>

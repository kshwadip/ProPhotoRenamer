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

	onMount(() => {
		analyticsStore.trackEvent('page_view');
	});

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
		if (shouldEnforceLimits()) {
			const stats = usageStore.getUsageStats();

			if (stats.remaining === 0) {
				notifications.show(
					'error',
					`You've reached the free limit of ${stats.limit} photos. Upgrade to Pro for unlimited processing!`,
					6000
				);
				return;
			}

			const photoCount = files.length;

			if (photoCount > stats.remaining) {
				notifications.show(
					'warning',
					`You can only process ${stats.remaining} more photos in the free version. You're trying to add ${photoCount}.`,
					6000
				);
				return;
			}
		}

		analyticsStore.trackPhotosUploaded(files.length);
		analyticsStore.trackEvent('photos_uploaded', { count: files.length });

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
			usageStore.trackUsage(files.length);
			if (shouldEnforceLimits()) {
				const newStats = usageStore.getUsageStats();
				if (newStats.remaining <= 20 && newStats.remaining > 0) {
					notifications.show(
						'warning',
						`${newStats.remaining} photos remaining in free plan`,
						4000
					);
				}
			}
		} catch (error) {
			console.error('Error processing files:', error);
		} finally {
			isExtracting = false;
		}

		updatePreviews();
	}

	async function handleDownload() {
		if (!canDownload) return;

		isDownloading = true;
		downloadProgress = 0;

		try {
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

			analyticsStore.trackDownload(selectedPhotos.length);
			analyticsStore.trackEvent('download_completed', {
				photoCount: selectedPhotos.length,
				template: currentTemplate
			});

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
							<span class="usage-indicator">
								{usageStore.getUsageStats().remaining} of {usageStore.getUsageStats().limit} free photos
								remaining
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
</style>

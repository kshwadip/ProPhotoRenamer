<script lang="ts">
	import { filesStore, selectedCount, totalFiles } from '$lib/stores/files';
	import type { Photo } from '$lib/types/photo';

	$: photos = $filesStore.photos;
	$: allSelected = photos.length > 0 && $selectedCount === photos.length;

	function toggleSelectAll() {
		if (allSelected) {
			filesStore.deselectAll();
		} else {
			filesStore.selectAll();
		}
	}

	function formatFileSize(bytes: number): string {
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
	}

	function getUniqueWarnings(warnings: string[]): string[] {
		return [...new Set(warnings)];
	}

	function getExifDisplayInfo(photo: Photo) {
		if (!photo.metadata.hasExif || !photo.metadata.exif) {
			return {
				hasExif: false,
				summary: [],
				badges: []
			};
		}

		const badges = [];

		if (photo.metadata.cameraMake || photo.metadata.cameraModel) {
			const camera =
				`${photo.metadata.cameraMake || ''} ${photo.metadata.cameraModel || ''}`.trim();
			if (camera) badges.push(camera);
		}

		if (photo.metadata.dateTaken) {
			badges.push(photo.metadata.dateTaken.toLocaleDateString());
		}

		if (photo.metadata.iso) {
			badges.push(`ISO ${photo.metadata.iso}`);
		}

		if (photo.metadata.focalLength) {
			badges.push(`${photo.metadata.focalLength}mm`);
		}

		if (photo.metadata.aperture) {
			badges.push(`f/${photo.metadata.aperture}`);
		}

		return {
			hasExif: true,
			summary: [],
			badges
		};
	}
</script>

<div class="file-list">
	<div class="list-header">
		<label class="select-all">
			<input type="checkbox" checked={allSelected} on:change={toggleSelectAll} />
			<span>{allSelected ? 'Deselect All' : 'Select All'}</span>
		</label>
		<span class="count">{$selectedCount} selected / {$totalFiles} total</span>
	</div>

	{#if photos.length > 0}
		<div class="files-grid">
			{#each photos as photo (photo.id)}
				{@const exifInfo = getExifDisplayInfo(photo)}

				<div class="file-item" class:selected={photo.selected}>
					<label class="checkbox-wrapper">
						<input
							type="checkbox"
							checked={photo.selected}
							on:change={() => filesStore.toggleSelection(photo.id)}
						/>
					</label>

					<div class="file-info">
						<div class="file-name" title={photo.metadata.fileName}>
							{photo.metadata.fileName}
						</div>

						<div class="file-details">
							<span class="file-size">{formatFileSize(photo.metadata.fileSize)}</span>

							{#if exifInfo.hasExif}
								<span class="exif-status exif-found">✅ EXIF Found</span>

								{#each exifInfo.badges as badge}
									{#if badge && badge.trim()}
										<span class="exif-badge">{badge}</span>
									{/if}
								{/each}
							{:else}
								<span class="exif-status no-exif">❌ No EXIF</span>
							{/if}
						</div>

						{#if photo.newFileName}
							<div class="rename-preview">
								→ <strong>{photo.newFileName}</strong>
							</div>
						{/if}

						<!-- Show only unique warnings -->
						{#if photo.warnings.length > 0}
							<div class="warnings">
								{#each getUniqueWarnings(photo.warnings) as warning}
									<div class="warning-text">⚠️ {warning}</div>
								{/each}
							</div>
						{/if}
					</div>

					<button
						class="remove-btn"
						on:click={() => filesStore.removePhoto(photo.id)}
						title="Remove file"
					>
						✕
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<p>No photos loaded. Drag & drop files or click browse to add photos.</p>
		</div>
	{/if}
</div>

<style>
    .file-list {
        max-width: 600px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        overflow: hidden;
    }

    :global([data-theme="dark"]) .file-list {
        border-color: var(--border-color);
        background: var(--bg-primary);
    }

    .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #f7fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    :global([data-theme="dark"]) .list-header {
        background: var(--bg-tertiary);
        border-bottom-color: var(--border-color);
    }

    .select-all {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-weight: 600;
        color: #000000;
    }

    :global([data-theme="dark"]) .select-all {
        color: #ffffff;
    }

    .count {
        color: #718096;
        font-size: 14px;
    }

    :global([data-theme="dark"]) .count {
        color: var(--text-muted);
    }

    .files-grid {
        max-height: 500px;
        overflow-y: auto;
    }

    .file-item {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 12px 16px;
        border-bottom: 1px solid #f7fafc;
        transition: background 0.2s;
    }

    :global([data-theme="dark"]) .file-item {
        border-bottom-color: var(--bg-secondary);
    }

    .file-item:hover {
        background: #f7fafc;
    }

    :global([data-theme="dark"]) .file-item:hover {
        background: var(--bg-secondary);
    }

    .file-item.selected {
        background: #ebf8ff;
    }

    :global([data-theme="dark"]) .file-item.selected {
        background: rgba(99, 179, 237, 0.15);
    }

    .checkbox-wrapper {
        flex-shrink: 0;
        cursor: pointer;
    }

    .file-info {
        flex: 1;
        min-width: 0;
    }

    .file-name {
        font-weight: 500;
        margin-bottom: 6px;
        word-break: break-all;
        color: #2d3748;
    }

    :global([data-theme="dark"]) .file-name {
        color: #ffffff;
    }

    .file-details {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 13px;
        margin-bottom: 4px;
    }

    .file-size {
        color: #718096;
        font-weight: 500;
    }

    :global([data-theme="dark"]) .file-size {
        color: var(--text-muted);
    }

    .exif-status {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
    }

    .exif-found {
        background: #c6f6d5;
        color: #25543a;
    }

    :global([data-theme="dark"]) .exif-found {
        background: rgba(104, 211, 145, 0.2);
        color: #68d391;
    }

    .no-exif {
        background: #fed7d7;
        color: #c53030;
    }

    :global([data-theme="dark"]) .no-exif {
        background: rgba(252, 129, 129, 0.2);
        color: #fc8181;
    }

    .exif-badge {
        padding: 2px 8px;
        background: #e6fffa;
        color: #047857;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
    }

    :global([data-theme="dark"]) .exif-badge {
        background: rgba(74, 85, 104, 0.3);
        color: #a0aec0;
    }

    .rename-preview {
        margin-top: 8px;
        padding: 8px;
        background: #f0fff4;
        border-left: 3px solid #48bb78;
        font-size: 13px;
        color: #2f855a;
        border-radius: 0 4px 4px 0;
    }

    :global([data-theme="dark"]) .rename-preview {
        background: rgba(104, 211, 145, 0.15);
        color: #68d391;
    }

    .warnings {
        margin-top: 6px;
    }

    .warning-text {
        font-size: 12px;
        color: #d69e2e;
        margin-bottom: 2px;
    }

    :global([data-theme="dark"]) .warning-text {
        color: #f6ad55;
    }

    .empty-state {
        text-align: center;
        padding: 48px 24px;
        color: #a0aec0;
    }

    :global([data-theme="dark"]) .empty-state {
        color: var(--text-muted);
    }

    .empty-state p {
        margin: 0;
        font-size: 16px;
    }

    .remove-btn {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #a0aec0;
        cursor: pointer;
        font-size: 18px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    :global([data-theme="dark"]) .remove-btn {
        color: var(--text-muted);
    }

    .remove-btn:hover {
        background: #fed7d7;
        color: #e53e3e;
    }

    :global([data-theme="dark"]) .remove-btn:hover {
        background: rgba(252, 129, 129, 0.2);
        color: #fc8181;
    }
</style>
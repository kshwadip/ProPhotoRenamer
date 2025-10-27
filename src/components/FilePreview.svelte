<script lang="ts">
  import { onDestroy } from 'svelte';
  import { filesStore } from '../lib/stores/files';
  import { formatBytes } from '../lib/utils/validators';
  import { formatDateCompact } from '../lib/utils/formatters';
  import type { Photo } from '../lib/types/photo';
  export let photo: Photo;

  let objectUrl: string | null = null;

  $: {
    if (photo.file) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(photo.file);
    }
  }

  onDestroy(() => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });

  function toggleSelection() {
    filesStore.toggleSelection(photo.id);
  }
  
</script>

<article class="file-preview {photo.selected ? 'selected' : ''}" role="listitem">
  <input type="checkbox" bind:checked={photo.selected} on:change={toggleSelection} aria-label="Select file" />
  
  <div class="thumbnail" aria-label="Photo preview">
    {#if objectUrl}
      <img src={objectUrl} alt={`Preview of ${photo.metadata.fileName}`} loading="lazy" />
    {:else}
      <div class="placeholder">No preview</div>
    {/if}
  </div>
  
  <div class="file-info">
    <h3 class="file-name" title={photo.metadata.fileName}>{photo.metadata.fileName}</h3>
    
    <div class="meta-row">
      <span><strong>Size:</strong> {formatBytes(photo.metadata.fileSize)}</span>
      {#if photo.metadata.dateTaken}
        <span><strong>Taken:</strong> {formatDateCompact(photo.metadata.dateTaken)}</span>
      {/if}
    </div>

    {#if photo.metadata.cameraMake || photo.metadata.cameraModel}
      <div class="camera-info">
        <strong>Camera:</strong> {photo.metadata.cameraMake || ''} {photo.metadata.cameraModel || ''}
      </div>
    {/if}

    {#if photo.renameResult?.filename}
      <div class="rename-result" title={photo.renameResult.filename}>
        <strong>Renamed:</strong> {photo.renameResult.filename}
      </div>
    {/if}

    {#if photo.status === 'error'}
      <div class="status error">Error</div>
    {:else if photo.status === 'warning'}
      <div class="status warning">Warning</div>
    {:else if photo.status === 'ready'}
      <div class="status ready">Ready</div>
    {:else if photo.status === 'extracting' || photo.status === 'validating' || photo.status === 'renaming'}
      <div class="status processing">Processing...</div>
    {:else}
      <div class="status pending">Pending</div>
    {/if}

    {#if photo.warnings && photo.warnings.length > 0}
      <ul class="warnings" aria-label="Warnings">
        {#each photo.warnings as warning}
          <li>{warning}</li>
        {/each}
      </ul>
    {/if}
  </div>
</article>

<style>
  article.file-preview {
    display: flex;
    gap: 1rem;
    border-radius: 0.52rem;
    padding: 1.16rem 1.1rem;
    background: #fefefe;
    color: #21252b;
    box-shadow: 0 1px 8px rgb(0 0 0 / 0.08);
    align-items: center;
    cursor: pointer;
    transition: box-shadow 0.17s ease;
  }
  article.file-preview.selected {
    box-shadow: 0 0 0 3px #ff8700aa;
    background: #fff7e5;
  }
  article.file-preview:focus {
    outline: 2px solid #ffaa1a;
  }
  .thumbnail {
    width: 96px;
    height: 96px;
    flex-shrink: 0;
    border-radius: 0.52rem;
    overflow: hidden;
    background: #ccc;
    border: 1px solid #ddd;
    box-shadow: 1px 2px 5px #aaa2;
  }
  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 96px;
    font-size: 0.95rem;
    color: #888;
  }
  .file-info {
    flex: 1;
    overflow: hidden;
  }
  .file-info h3.file-name {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta-row {
    font-size: 0.88rem;
    color: #656d78;
    display: flex;
    gap: 1.3rem;
    margin-bottom: 0.25rem;
  }
  .camera-info {
    font-size: 0.89rem;
    color: #4a5159;
    margin-bottom: 0.18rem;
  }
  .rename-result {
    font-size: 0.88rem;
    color: #7a7a7a;
    font-style: italic;
  }
  .status {
    font-size: 0.9rem;
    font-weight: 700;
    margin-top: 0.3rem;
  }

  .status.error {
    color: #d32525;
  }
  .status.warning {
    color: #d57705;
  }
  .status.ready {
    color: #1d9a2e;
  }
  .status.processing {
    color: #1c6dd0;
  }
  .status.pending {
    color: #6a6a6a;
  }
  ul.warnings {
    margin: 0.33rem 0 0 0;
    padding-left: 1.1rem;
    color: #a36110;
    font-size: 0.81rem;
  }
  ul.warnings li {
    margin-bottom: 0.13rem;
    list-style-type: disc;
  }
</style>

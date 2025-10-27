<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{ upload: File[] }>();
  
  let isDragging = false;
  let fileInput: HTMLInputElement;
  let lastError = '';

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    
    const files = Array.from(e.dataTransfer?.files || []);
    processFiles(files);
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    processFiles(files);
  }

  function processFiles(files: File[]) {
    const imageFiles = files.filter(f => 
      f.type.startsWith('image/') || 
      f.name.match(/\.(jpg|jpeg|png|tiff|heic|heif|webp|raw|cr2|nef|arw|dng)$/i)
    );
    
    if (imageFiles.length === 0) {
      lastError = 'No valid image files found';
      setTimeout(() => lastError = '', 3000);
      return;
    }
    
    if (imageFiles.length < files.length) {
      lastError = `${files.length - imageFiles.length} non-image file(s) ignored`;
      setTimeout(() => lastError = '', 3000);
    }
    
    dispatch('upload', imageFiles);
  }
</script>

<div 
  class="dropzone"
  class:dragging={isDragging}
  on:drop={handleDrop}
  on:dragover|preventDefault={() => isDragging = true}
  on:dragleave={() => isDragging = false}
  on:click={() => fileInput?.click()}
  on:keydown={(e) => e.key === 'Enter' && fileInput?.click()}
  role="button"
  tabindex="0"
  >
  <input
    bind:this={fileInput}
    type="file"
    multiple
    accept="image/*,.raw,.cr2,.nef,.arw,.dng,.heic,.heif"
    on:change={handleFileSelect}
    style="display: none;"
  />
  
  <div class="dropzone-content">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke-width="2"/>
    </svg>
    <h3>Drag & drop</h3>
    <p>JPG, PNG, HEIC, WebP, or TIFF files here</p>
    <p class="or">or</p>
    <button class="browse-btn" on:click|stopPropagation={() => fileInput?.click()}>
      browse
    </button>
  </div>
  
  {#if lastError}
    <p class="error">{lastError}</p>
  {/if}
</div>

<style>
  .dropzone {
    border: 2px dashed #000000;
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #f7fafc;
  }

  :global([data-theme="dark"]) .dropzone {
    background: var(--bg-primary);
    border-color: var(--border-color);
  }

  .dropzone.dragging {
    border-color: #4299e1;
    background: #ebf8ff;
  }

  :global([data-theme="dark"]) .dropzone.dragging {
    border-color: var(--accent);
    background: var(--bg-secondary);
  }

  .dropzone:hover {
    border-color: #a0aec0;
  }

  :global([data-theme="dark"]) .dropzone:hover {
    border-color: var(--border-hover);
  }

  .dropzone-content svg {
    margin: 0 auto 16px;
    color: #4a5568;
  }

  :global([data-theme="dark"]) .dropzone-content svg {
    color: var(--text-secondary);
  }

  h3 {
    margin: 0 0 8px;
    font-size: 20px;
    color: #2d3748;
  }

  :global([data-theme="dark"]) h3 {
    color: var(--text-primary);
  }

  p {
    margin: 4px 0;
    color: #2d3748;
    font-size: 14px;
  }

  :global([data-theme="dark"]) p {
    color: #ffffff;
  }

  .or {
    margin: 12px 0;
    font-weight: 600;
    color: #2d3748;
  }

  :global([data-theme="dark"]) .or {
    color: #ffffff;
  }

  .browse-btn {
    padding: 10px 24px;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  }

  .browse-btn:hover {
    background: #3182ce;
  }

  .error {
    color: #e53e3e;
    margin-top: 12px;
    font-weight: 500;
  }

  :global([data-theme="dark"]) .error {
    color: var(--error);
  }
</style>


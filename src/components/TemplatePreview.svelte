<script lang="ts">
import { onDestroy } from 'svelte';
import { filesStore, selectedCount } from '$lib/stores/files';
import { templatesStore } from '$lib/stores/templates';
import { generateFilename } from '$lib/utils/rename';
import { derived } from 'svelte/store';

const selectedPhotos = derived(filesStore, $filesStore =>
 $filesStore.photos.filter(p => p.selected)
);

let previews: { original: string; renamed: string | null; warnings?: string[] }[] = [];

let unsubscribeSelected = selectedPhotos.subscribe(async (photos) => {
 const storeValue = $templatesStore;

 const activeTemplate = 
 storeValue?.activePreset && 
 typeof storeValue.activePreset === 'object' && 
 'template' in storeValue.activePreset
 ? (storeValue.activePreset as any).template 
 : '';

 previews = photos.map(photo => {
 try {
  const renameResult = generateFilename(activeTemplate, photo.metadata.exif, photo.metadata.fileName, {
  customText: '',
  counter: photo.index + 1, 
  counterPadding: 3,
  preserveExtension: true
  });
  return {
  original: photo.metadata.fileName,
  renamed: renameResult.filename,
  warnings: renameResult.warnings
  };
 } catch {
  return { original: photo.metadata.fileName, renamed: null, warnings: ['Error generating preview'] };
 }
 });
});

let templatesStoreValue;
const unsubscribeTemplates = templatesStore.subscribe(value => {
 templatesStoreValue = value;
});

onDestroy(() => {
 unsubscribeSelected();
 unsubscribeTemplates();
});
</script>

<div class="template-preview">
<h3>Preview ({$selectedCount} file{ $selectedCount === 1 ? '' : 's' })</h3>
{#if previews.length > 0}
 <ul class="preview-list" role="list" aria-live="polite" aria-atomic="true" aria-relevant="additions removals">
 {#each previews as preview (preview.original)}
  <li class="preview-item">
  <strong class="original-name" title={preview.original}>{preview.original}</strong> &rarr;
  {#if preview.renamed}
   <span class="renamed-name" title={preview.renamed}>{preview.renamed}</span>
  {:else}
   <span class="renamed-name error">Failed to generate</span>
  {/if}
  {#if preview.warnings && preview.warnings.length > 0}
   <ul class="warnings" aria-label="Warnings">
   {#each preview.warnings as warning}
    <li>{warning}</li>
   {/each}
   </ul>
  {/if}
  </li>
 {/each}
 </ul>
{:else}
 <p class="no-selection">Please select files to see a preview.</p>
{/if}
</div>

<style>
.template-preview {
 font-family: system-ui, sans-serif;
 background: #f9fafc;
 border-radius: 0.5rem;
 padding: 1rem 1.4rem;
 box-shadow: 0 1px 5px #dfdfdf;
 color: #24292f;
}

h3 {
 margin-top: 0;
 font-weight: 700;
 font-size: 1.25rem;
 border-bottom: 1px solid #ddd;
 padding-bottom: 0.3rem;
}

ul.preview-list {
 list-style: none;
 padding: 0;
 margin: 1rem 0 0 0;
 max-height: 240px;
 overflow-y: auto;
}

ul.preview-list li.preview-item {
 padding: 0.6rem 0;
 border-bottom: 1px solid #efefef;
 font-size: 0.95rem;
}

.original-name {
 font-weight: 700;
 color: #444;
 margin-right: 0.4rem;
}

.renamed-name {
 font-family: monospace;
 color: #1a73e8;
}

.renamed-name.error {
 color: #d33636;
 font-style: italic;
}

ul.warnings {
 margin: 0.2rem 0 0 1.1rem;
 padding-left: 0;
 color: #b55900;
 font-size: 0.82rem;
}

ul.warnings li {
 margin-bottom: 0.12rem;
}

.no-selection {
 font-style: italic;
 color: #777;
 margin-top: 1rem;
 font-size: 1rem;
}

ul.preview-list::-webkit-scrollbar {
 width: 6px;
}
ul.preview-list::-webkit-scrollbar-thumb {
 background-color: #bbb;
 border-radius: 3px;
}
</style>
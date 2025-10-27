<script lang="ts">
  import { selectedCount } from '$lib/stores/files';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{ click: void }>();
  
  export let disabled = false;
  
  $: buttonText = $selectedCount === 0 
    ? 'Select files to download'
    : `Download ZIP (${$selectedCount} ${$selectedCount === 1 ? 'file' : 'files'})`;
</script>

<button 
  class="download-btn"
  class:disabled
  {disabled}
  on:click={() => dispatch('click')}
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-width="2"/>
  </svg>
  {buttonText}
</button>

<style>
  .download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px 32px;
    background: #48bb78;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .download-btn:hover:not(.disabled) {
    background: #38a169;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
  }

  :global([data-theme="dark"]) .download-btn:hover:not(.disabled) {
    box-shadow: 0 4px 12px rgba(104, 211, 145, 0.4);
  }

  .download-btn.disabled {
    background: #797a7a;
    cursor: not-allowed;
  }
</style>
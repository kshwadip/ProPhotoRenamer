<script lang="ts">
  export let progress: number = 0; 
  export let label: string = 'Progress';
  export let showPercentage: boolean = true;

  $: clampedProgress = Math.min(100, Math.max(0, progress));
</script>

<div class="progressbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={clampedProgress} aria-label={label}>
  <div class="progressbar-fill" style="width: {clampedProgress}%"></div>
  {#if showPercentage}
    <span class="progress-label">{clampedProgress.toFixed(0)}%</span>
  {/if}
</div>

<style>
  .progressbar {
    position: relative;
    background-color: #e0e0e0;
    height: 14px;
    border-radius: 10px;
    overflow: hidden;
    width: 100%;
    margin: 0.8rem 0;
  }

  .progressbar-fill {
    background-color: #1e88e5;
    height: 100%;
    width: 0%;
    transition: width 0.3s ease-in-out;
  }

  .progress-label {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    font-size: 0.82rem;
    font-weight: 600;
    color: #1e88e5;
    user-select: none;
  }
</style>

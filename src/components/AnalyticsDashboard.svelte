<script lang="ts">
  import { analyticsStore } from '$lib/stores/analytics';

  $: summary = analyticsStore.getSummary();

  function exportAnalytics() {
    const data = analyticsStore.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString()}.json`;
    a.click();
  }
</script>

<div class="analytics-dashboard">
  <h3>📊 Usage Analytics</h3>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{summary.totalVisits}</div>
      <div class="stat-label">Total Visits</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">{summary.currentSessionDuration}m</div>
      <div class="stat-label">Session Duration</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">{summary.totalPhotosProcessed}</div>
      <div class="stat-label">Photos Processed</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">{summary.totalDownloads}</div>
      <div class="stat-label">Downloads</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">{summary.templateChanges}</div>
      <div class="stat-label">Template Changes</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">{summary.conversionRate}%</div>
      <div class="stat-label">Conversion Rate</div>
    </div>
  </div>

  <div class="most-used">
    <strong>Most Used Template:</strong> 
    <code>{summary.mostUsedTemplate}</code> 
    ({summary.mostUsedTemplateCount} times)
  </div>

  <button class="btn-secondary" on:click={exportAnalytics}>
    Export Analytics Data
  </button>
</div>

<style>
  .analytics-dashboard {
    padding: 20px;
    background: var(--color-surface);
    border-radius: 8px;
    margin: 20px 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .stat-card {
    background: var(--color-background);
    padding: 16px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid var(--color-border);
  }

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: var(--color-primary);
  }

  .stat-label {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-top: 4px;
  }

  .most-used {
    margin: 16px 0;
    padding: 12px;
    background: var(--color-background);
    border-radius: 6px;
  }

  code {
    background: var(--color-secondary);
    padding: 2px 6px;
    border-radius: 4px;
  }
</style>
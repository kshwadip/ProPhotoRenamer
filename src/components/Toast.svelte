<script lang="ts">
  import { notifications, type Notification } from '$lib/stores/notification';
  import { fly, fade } from 'svelte/transition';

  $: toasts = $notifications;

  function getIcon(type: string) {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  }
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div
      class="toast toast--{toast.type}"
      transition:fly={{ y: -20, duration: 300 }}
    >
      <span class="toast__icon">{getIcon(toast.type)}</span>
      <span class="toast__message">{toast.message}</span>
      <button
        class="toast__close"
        on:click={() => notifications.dismiss(toast.id)}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 320px;
    max-width: 480px;
    padding: 16px 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid;
    pointer-events: auto;
    animation: slideIn 0.3s ease;
  }

  :global([data-theme="dark"]) .toast {
    background: var(--bg-secondary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .toast--success {
    border-left-color: #48bb78;
  }

  .toast--error {
    border-left-color: #e53e3e;
  }

  .toast--warning {
    border-left-color: #dd6b20;
  }

  .toast--info {
    border-left-color: #4299e1;
  }

  .toast__icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .toast__message {
    flex: 1;
    color: #2d3748;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
  }

  :global([data-theme="dark"]) .toast__message {
    color: #ffffff;
  }

  .toast__close {
    background: none;
    border: none;
    color: #a0aec0;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .toast__close:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #2d3748;
  }

  :global([data-theme="dark"]) .toast__close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
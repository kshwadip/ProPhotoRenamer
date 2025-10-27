<script lang="ts">
    import { themeStore } from '$lib/stores/theme';
    import { consentStore } from '$lib/stores/consent';
    import { onMount } from 'svelte';
    import Toast from '../components/Toast.svelte';
    import ConsentBanner from '../components/ConsentBanner.svelte';

    onMount(() => {
        themeStore.init();
    });
</script>

<header class="app-header">
    <nav class="nav">
        <span class="brand">
            <img src="/favicon.ico" alt="Logo" class="logo" />
            <span>Pro Photographer Renamer</span>
        </span>
        <ul class="nav-links">
            <div class="theme-toggle-wrapper">
                <button 
                    class="theme-toggle" 
                    on:click={consentStore.toggleAnalytics} 
                    title={$consentStore.analyticsAllowed ? 'Analytics Enabled' : 'Analytics Disabled'}>
                    <span class="theme-icon">
                        {#if $consentStore.analyticsAllowed}
                            📊
                        {:else}
                            🚫
                        {/if}
                    </span>
                    <span class="theme-text">
                        {#if $consentStore.analyticsAllowed}
                            Analytics On
                        {:else}
                            Analytics Off
                        {/if}
                    </span>
                </button>
            </div>
            
            <div class="theme-toggle-wrapper">
                <button class="theme-toggle" on:click={themeStore.toggle} title="Toggle theme">
                    {#if $themeStore === 'dark'}
                        <span class="theme-icon">☀️</span>
                        <span class="theme-text">Light Mode</span>
                    {:else}
                        <span class="theme-icon">🌙</span>
                        <span class="theme-text">Dark Mode</span>
                    {/if}
                </button>
            </div>
        </ul>
    </nav>
</header>

<main class="main-content">
    <Toast />
    <ConsentBanner />
    <slot />
</main>

<footer class="app-footer">
    <span
        >&copy; {new Date().getFullYear()} PhotoRenamer &mdash; Rename, organize, and batch download photos
        with EXIF!</span
    >
</footer>

<style>
    :global(:root) {
        --bg-primary: #ffffff;
        --bg-secondary: #f7fafc;
        --bg-tertiary: #edf2f7;
        --text-primary: #2d3748;
        --text-secondary: #4a5568;
        --text-muted: #718096;
        --border-color: #e2e8f0;
        --border-hover: #cbd5e0;
        --header-bg: #171a1c;
        --header-text: #ffffff;
        --header-border: #25292b;
        --footer-bg: #171a1c;
        --footer-text: #7c8bad;
        --footer-border: #26292c;
    }

    :global([data-theme='dark']) {
        --bg-primary: #1a202c;
        --bg-secondary: #2d3748;
        --bg-tertiary: #4a5568;
        --text-primary: #f7fafc;
        --text-secondary: #e2e8f0;
        --text-muted: #a0aec0;
        --border-color: #4a5568;
        --border-hover: #718096;
        --header-bg: #0d1117;
        --header-text: #f0f6fc;
        --header-border: #21262d;
        --footer-bg: #0d1117;
        --footer-text: #8b949e;
        --footer-border: #21262d;
    }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--bg-secondary);
        color: var(--text-primary);
        transition:
            background-color 0.3s,
            color 0.3s;
    }

    .app-header {
        background: var(--header-bg);
        color: var(--header-text);
        padding: 0.5rem 2vw;
        border-bottom: 1px solid var(--header-border);
        box-shadow: 0 2px 12px rgba(25, 25, 35, 0.045);
        transition: all 0.3s;
    }

    .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 auto;
    }

    .brand {
        display: flex;
        align-items: center;
        font-weight: 700;
        gap: 0.5rem;
        text-decoration: none;
        color: inherit;
        font-size: 1.15rem;
    }

    .logo {
        height: 2rem;
        width: 2rem;
        margin-right: 0.25rem;
        border-radius: 20%;
        background: #fff;
        filter: drop-shadow(0 1px 2px #8884);
    }

    .nav-links {
        display: flex;
        gap: 1.2rem;
        list-style: none;
        padding-left: 0;
        margin: 0;
        align-items: center;
    }

    .theme-toggle-wrapper {
        flex-shrink: 0;
    }

    .theme-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--header-text);
        transition: all 0.3s;
        backdrop-filter: blur(10px);
    }

    .theme-toggle:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
    }

    .theme-icon {
        font-size: 16px;
    }

    .theme-text {
        font-weight: 600;
        white-space: nowrap;
    }

    .main-content {
        min-height: 72vh;
        max-width: 1080px;
        margin: 2.5rem auto 1.5rem auto;
        padding: 0 2vw;
        background: var(--bg-secondary);
        transition: background-color 0.3s;
    }

    .app-footer {
        font-size: 0.95rem;
        text-align: center;
        color: var(--footer-text);
        border-top: 1px solid var(--footer-border);
        background: var(--footer-bg);
        padding: 1.7rem 0 1.2rem 0;
        margin: 0;
        transition: all 0.3s;
    }

    @media (max-width: 600px) {
        .main-content {
            padding: 0 0.4rem;
        }

        .nav-links {
            gap: 0.7rem;
            font-size: 0.97rem;
        }

        .app-header,
        .app-footer {
            font-size: 0.99rem;
        }

        .logo {
            height: 1.45rem;
            width: 1.45rem;
        }

        .theme-toggle {
            padding: 6px 10px;
            font-size: 13px;
        }

        .theme-text {
            display: none;
        }
    }

    @media (max-width: 480px) {
        .theme-text {
            display: none;
        }

        .theme-toggle {
            padding: 8px;
        }
    }
</style>
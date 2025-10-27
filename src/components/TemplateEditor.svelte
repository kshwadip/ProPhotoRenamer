<script lang="ts">
	import { notifications } from '$lib/stores/notification';
	import { validateTemplate } from '$lib/utils/rename';
	import { onMount } from 'svelte';

	export let template = '';
	export let updatePreviews: (() => void) | undefined = undefined;

	let validationErrors: string[] = [];
	let validationWarnings: string[] = [];
	let hasSavedTemplate = false;
	let savedTemplateDate: string | null = null;

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem('savedTemplate');
			const savedDate = localStorage.getItem('savedTemplateDate');

			hasSavedTemplate = saved !== null && saved.length > 0;
			savedTemplateDate = savedDate;
		}
	});

	$: {
		if (template && template.trim().length > 0) {
			validateCurrentTemplate();
			if (updatePreviews) {
				updatePreviews();
			}
		} else {
			validationErrors = [];
			validationWarnings = [];
		}
	}

	function validateCurrentTemplate() {
		const validation = validateTemplate(template);

		validationErrors = Array.isArray(validation.errors) ? validation.errors : [];
		validationWarnings = Array.isArray(validation.warnings) ? validation.warnings : [];
	}
	
	function addToken(token: string) {
		template = template + token;
	}

	function resetTemplate() {
		template = '';
		validationErrors = [];
		validationWarnings = [];
	}

	function saveTemplate() {
		if (validationErrors.length > 0 || template.trim().length === 0) return;

		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('savedTemplate', template);
			localStorage.setItem('savedTemplateDate', new Date().toISOString());

			hasSavedTemplate = true;
			savedTemplateDate = new Date().toISOString();
		}

		notifications.show('success', 'Template saved successfully!');
	}

	function loadSavedTemplate() {
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem('savedTemplate');
			if (saved) {
				template = saved;
				notifications.show('success', 'Loaded saved template!');
			}
		}
	}

	function formatSavedDate(isoDate: string | null): string {
		if (!isoDate) return '';

		try {
			const date = new Date(isoDate);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);
			const diffDays = Math.floor(diffMs / 86400000);

			if (diffMins < 1) return 'just now';
			if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
			if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
			if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

			return date.toLocaleDateString();
		} catch {
			return '';
		}
	}
	
	const tokenGroups = [
		{
			category: 'Date & Time',
			tokens: [
				{ code: '{YYYY}', desc: 'Year (4 digits)' },
				{ code: '{YY}', desc: 'Year (2 digits)' },
				{ code: '{MM}', desc: 'Month (01-12)' },
				{ code: '{DD}', desc: 'Day (01-31)' },
				{ code: '{HH}', desc: 'Hour (00-23)' },
				{ code: '{mm}', desc: 'Minute (00-59)' },
				{ code: '{ss}', desc: 'Second (00-59)' },
				{ code: '{date}', desc: 'Full date (YYYYMMDD)' }
			]
		},
		{
			category: 'Camera & Settings',
			tokens: [
				{ code: '{make}', desc: 'Camera manufacturer' },
				{ code: '{model}', desc: 'Camera model' },
				{ code: '{iso}', desc: 'ISO value' },
				{ code: '{aperture}', desc: 'Aperture (f-number)' },
				{ code: '{focal}', desc: 'Focal length' }
			]
		},
		{
			category: 'Utility',
			tokens: [
				{ code: '{counter}', desc: 'Sequential counter (001, 002...)' },
				{ code: '{counter:3}', desc: 'Counter with 3 digits' }
			]
		}
	];
</script>

<div class="template-editor">
	<div class="editor-header">
		<label for="templateInput">Rename Template</label>
		<div class="actions">
			{#if hasSavedTemplate}
				<button
					class="btn load-btn"
					on:click={loadSavedTemplate}
					title="Load your saved template (saved {formatSavedDate(savedTemplateDate)})"
				>
					📂 Load Saved
				</button>
			{/if}

			<button class="btn secondary" on:click={resetTemplate} title="Clear template"> Reset </button>
			<button
				class="btn"
				disabled={validationErrors.length > 0 || template.trim().length === 0}
				on:click={saveTemplate}
				title="Save template to browser storage"
			>
				💾 Save Template
			</button>
		</div>
	</div>

	{#if hasSavedTemplate && template.trim().length === 0}
		<div class="saved-template-notice">
			<span class="notice-icon">💡</span>
			<span
				>You have a saved template from <strong>{formatSavedDate(savedTemplateDate)}</strong></span
			>
			<button class="link-btn" on:click={loadSavedTemplate}>Load it now →</button>
		</div>
	{/if}

	<input
		id="templateInput"
		type="text"
		bind:value={template}
		placeholder="Enter rename template, e.g. &#123;YYYY&#125;&#123;MM&#125;&#123;DD&#125;_&#123;counter:3&#125;"
		aria-describedby="validationMessages"
		spellcheck="false"
	/>

	<div
		id="validationMessages"
		class="validation-messages"
		role="alert"
		aria-live="polite"
		aria-atomic="true"
	>
		{#if validationErrors.length > 0}
			<ul class="errors">
				{#each validationErrors as error}
					<li>❌ {error}</li>
				{/each}
			</ul>
		{:else if validationWarnings.length > 0}
			<ul class="warnings">
				{#each validationWarnings as warning}
					<li>⚠️ {warning}</li>
				{/each}
			</ul>
		{:else if template.trim().length > 0}
			<p class="success">✅ Template is valid.</p>
		{/if}
	</div>

	<section class="token-help" aria-label="Template tokens reference">
		<h3>Available Template Tokens</h3>
		<p class="hint">Click any token to add it to your template</p>

		{#each tokenGroups as group}
			<div class="token-group">
				<h4>{group.category}</h4>
				<div class="token-grid">
					{#each group.tokens as token}
						<button class="token-btn" on:click={() => addToken(token.code)} title={token.desc}>
							<code>{token.code}</code>
							<span class="token-desc">{token.desc}</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</section>

	<div class="example-section">
		<h4>Example Templates</h4>
		<div class="example-list">
			<button on:click={() => (template = '{date}_{model}_{counter}')}>
				&#123;date&#125;_&#123;model&#125;_&#123;counter&#125; → 20251011_vivo1603_001.jpg
			</button>
			<button on:click={() => (template = '{YYYY}-{MM}-{DD}_{HH}{mm}{ss}')}>
				&#123;YYYY&#125;-&#123;MM&#125;-&#123;DD&#125;_&#123;HH&#125;&#123;mm&#125;&#123;ss&#125; →
				2025-10-11_142530.jpg
			</button>
			<button on:click={() => (template = '{make}_{model}_ISO{iso}_{counter:3}')}>
				&#123;make&#125;_&#123;model&#125;_ISO&#123;iso&#125;_&#123;counter:3&#125; →
				vivo_vivo1603_ISO800_001.jpg
			</button>
			<button on:click={() => (template = '{focal}mm_f{aperture}_{date}_{counter}')}>
				&#123;focal&#125;mm_f&#123;aperture&#125;_&#123;date&#125;_&#123;counter&#125; →
				3mm_f2_20251011_001.jpg
			</button>
		</div>
	</div>
</div>

<style>
    .template-editor {
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        background: white;
        color: #264653;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    :global([data-theme="dark"]) .template-editor {
        background: var(--bg-primary);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    label {
        font-weight: 700;
        font-size: 1.1rem;
        margin: 0;
        color: #264653;
    }

    :global([data-theme="dark"]) label {
        color: #ffffff;
    }

    .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    input[type='text'] {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #cbd5e0;
        border-radius: 6px;
        font-size: 15px;
        font-family: 'Courier New', monospace;
        box-sizing: border-box;
        margin-bottom: 12px;
        transition: border-color 0.2s;
        background: white;
        color: #264653;
    }

    :global([data-theme="dark"]) input[type='text'] {
        background: var(--bg-secondary);
        color: #ffffff;
        border-color: var(--border-color);
    }

    input[type='text']:focus {
        border-color: #4299e1;
        outline: none;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    :global([data-theme="dark"]) input[type='text']:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.2);
    }

    .btn {
        background: #4299e1;
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .btn:disabled {
        background: #cbd5e0;
        cursor: not-allowed;
        opacity: 0.6;
    }

    :global([data-theme="dark"]) .btn:disabled {
        background: var(--text-muted);
    }

    .btn:hover:not(:disabled) {
        background: #3182ce;
        transform: translateY(-1px);
    }

    .btn.secondary {
        background: #e2e8f0;
        color: #2d3748;
    }

    :global([data-theme="dark"]) .btn.secondary {
        background: var(--bg-tertiary);
        color: #ffffff;
    }

    .btn.secondary:hover {
        background: #cbd5e0;
    }

    :global([data-theme="dark"]) .btn.secondary:hover {
        background: var(--border-hover);
    }

    .btn.load-btn {
        background: #48bb78;
    }

    .btn.load-btn:hover {
        background: #38a169;
    }

    .saved-template-notice {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #ebf8ff;
        border: 1px solid #bee3f8;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 14px;
        color: #2c5282;
    }

    :global([data-theme="dark"]) .saved-template-notice {
        background: rgba(99, 179, 237, 0.15);
        border-color: rgba(99, 179, 237, 0.3);
        color: var(--accent);
    }

    .notice-icon {
        font-size: 20px;
    }

    .link-btn {
        background: none;
        border: none;
        color: #3182ce;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
        padding: 0;
        margin-left: auto;
    }

    :global([data-theme="dark"]) .link-btn {
        color: var(--accent);
    }

    .link-btn:hover {
        color: #2c5282;
    }

    :global([data-theme="dark"]) .link-btn:hover {
        color: var(--accent-hover);
    }

    .validation-messages {
        margin-bottom: 16px;
        min-height: 28px;
        font-size: 14px;
    }

    ul.errors,
    ul.warnings {
        margin: 0;
        padding-left: 20px;
    }

    ul.errors {
        color: #e53e3e;
    }

    :global([data-theme="dark"]) ul.errors {
        color: #fc8181;
    }

    ul.warnings {
        color: #dd6b20;
    }

    :global([data-theme="dark"]) ul.warnings {
        color: #f6ad55;
    }

    .success {
        color: #38a169;
        margin: 0;
    }

    :global([data-theme="dark"]) .success {
        color: #68d391;
    }

    .token-help {
        margin-top: 24px;
    }

    .token-help h3 {
        font-size: 18px;
        margin: 0 0 8px 0;
        color: #2d3748;
    }

    :global([data-theme="dark"]) .token-help h3 {
        color: #ffffff;
    }

    .hint {
        font-size: 13px;
        color: #718096;
        margin: 0 0 16px 0;
    }

    :global([data-theme="dark"]) .hint {
        color: var(--text-muted);
    }

    .token-group {
        margin-bottom: 20px;
    }

    .token-group h4 {
        font-size: 14px;
        margin: 0 0 12px 0;
        color: #4a5568;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 6px;
    }

    :global([data-theme="dark"]) .token-group h4 {
        color: var(--text-secondary);
        border-bottom-color: var(--border-color);
    }

    .token-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
    }

    .token-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        background: #f7fafc;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    :global([data-theme="dark"]) .token-btn {
        border-color: var(--border-color);
        background: var(--bg-secondary);
    }

    .token-btn:hover {
        border-color: #4299e1;
        background: #ebf8ff;
        transform: translateY(-1px);
    }

    :global([data-theme="dark"]) .token-btn:hover {
        border-color: var(--accent);
        background: rgba(99, 179, 237, 0.15);
    }

    .token-btn code {
        font-family: 'Courier New', monospace;
        font-size: 13px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
    }

    :global([data-theme="dark"]) .token-btn code {
        color: #ffffff;
    }

    .token-desc {
        font-size: 11px;
        color: #718096;
        line-height: 1.3;
    }

    :global([data-theme="dark"]) .token-desc {
        color: var(--text-muted);
    }

    .example-section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e2e8f0;
    }

    :global([data-theme="dark"]) .example-section {
        border-top-color: var(--border-color);
    }

    .example-section h4 {
        font-size: 16px;
        margin: 0 0 12px 0;
        color: #2d3748;
    }

    :global([data-theme="dark"]) .example-section h4 {
        color: #ffffff;
    }

    .example-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .example-list button {
        padding: 10px 14px;
        border: 1px solid #cbd5e0;
        background: white;
        border-radius: 6px;
        text-align: left;
        cursor: pointer;
        font-family: monospace;
        font-size: 13px;
        color: #2d3748;
        transition: all 0.2s;
    }

    :global([data-theme="dark"]) .example-list button {
        border-color: var(--border-color);
        background: var(--bg-secondary);
        color: #ffffff;
    }

    .example-list button:hover {
        border-color: #4299e1;
        background: #f7fafc;
    }

    :global([data-theme="dark"]) .example-list button:hover {
        border-color: var(--accent);
        background: rgba(99, 179, 237, 0.15);
    }
</style>
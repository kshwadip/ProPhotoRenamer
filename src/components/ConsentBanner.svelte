<script lang="ts">
	import { consentStore } from '$lib/stores/consent';
	import { slide } from 'svelte/transition';
	import { themeStore } from '$lib/stores/theme';

	$: showBanner = !$consentStore.hasAnswered;
	$: isDark = $themeStore === 'dark';

	function accept() {
		consentStore.acceptAnalytics();
	}

	function decline() {
		consentStore.declineAnalytics();
	}

	let showDetails = false;
</script>

{#if showBanner}
	<div class="consent-overlay" transition:slide>
		<div class="consent-modal">
			<div class="modal-header">
				<div class="privacy-icon">🛡️</div>
				<h3>Privacy & Analytics</h3>
				<p class="subtitle">Help us improve your experience</p>
			</div>

			<div class="modal-content">
				<p class="description">
					We collect <strong>anonymous usage data</strong> to make the app better. No personal information
					is stored or shared.
				</p>

				<div class="data-points">
					<div class="data-item">
						<span class="data-icon">📊</span>
						<span>Number of Photos processed & templates used</span>
					</div>
					<div class="data-item">
						<span class="data-icon">⏱️</span>
						<span>Session duration & feature usage</span>
					</div>
					<div class="data-item">
						<span class="data-icon">🔒</span>
						<span>Anonymous browser fingerprint only</span>
					</div>
				</div>

				{#if showDetails}
					<div class="details-section" transition:slide>
						<div class="detail-grid">
							<div class="detail-card">
								<h4>What we collect</h4>
								<ul>
									<li>Number of photos processed</li>
									<li>Template preferences</li>
									<li>Session duration</li>
									<li>Feature usage patterns</li>
								</ul>
							</div>
							<div class="detail-card">
								<h4>How we use it</h4>
								<ul>
									<li>Improve app performance</li>
									<li>Fix bugs and issues</li>
									<li>Understand user needs</li>
									<li>Plan new features</li>
								</ul>
							</div>
							<div class="detail-card">
								<h4>Your privacy</h4>
								<ul>
									<li>No personal data collected</li>
									<li>Anonymous fingerprinting</li>
									<li>Toggle anytime in header</li>
									<li>GDPR compliant</li>
								</ul>
							</div>
						</div>
					</div>
				{/if}

				<button class="details-toggle" on:click={() => (showDetails = !showDetails)}>
					{showDetails ? '← Less details' : 'More details →'}
				</button>
			</div>

			<div class="modal-actions">
				<button class="btn-decline" on:click={decline}>
					<span class="btn-icon">🚫</span>
					Decline
				</button>
				<button class="btn-accept" on:click={accept}>
					<span class="btn-icon">✅</span>
					Accept Analytics
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.consent-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.consent-modal {
		background: var(--bg-primary, #ffffff);
		border-radius: 16px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
		max-width: 600px;
		width: 100%;
		max-height: 85vh;
		overflow-y: auto;
		border: 1px solid var(--border-color, #e2e8f0);
		scrollbar-width: none;
		-ms-overflow-style: none;
    scroll-behavior: smooth;
	}

	.consent-modal::-webkit-scrollbar {
		display: none;
	}

	.consent-modal::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 20px;
		background: linear-gradient(to bottom, transparent, var(--bg-primary, #ffffff));
		pointer-events: none;
		border-radius: 0 0 16px 16px;
	}

	:global([data-theme='dark']) .consent-modal {
		background: var(--bg-secondary);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
	}

	:global([data-theme='dark']) .consent-modal::after {
		background: linear-gradient(to bottom, transparent, var(--bg-secondary));
	}

	.modal-header {
		text-align: center;
		padding: 24px 28px 20px;
		border-bottom: 1px solid var(--border-color, #e2e8f0);
	}

	:global([data-theme='dark']) .modal-header {
		border-bottom-color: var(--border-color);
	}

	.privacy-icon {
		font-size: 40px;
		margin-bottom: 12px;
	}

	.modal-header h3 {
		margin: 0 0 6px 0;
		font-size: 22px;
		font-weight: 600;
		color: var(--text-primary, #1a202c);
	}

	:global([data-theme='dark']) .modal-header h3 {
		color: #ffffff;
	}

	.subtitle {
		margin: 0;
		color: var(--text-secondary, #718096);
		font-size: 15px;
	}

	:global([data-theme='dark']) .subtitle {
		color: var(--text-muted);
	}

	.modal-content {
		padding: 20px 28px;
	}

	.description {
		font-size: 15px;
		line-height: 1.5;
		color: var(--text-primary, #2d3748);
		margin: 0 0 20px 0;
		text-align: center;
	}

	:global([data-theme='dark']) .description {
		color: #ffffff;
	}

	.data-points {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}

	.data-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: var(--bg-tertiary, #f7fafc);
		border-radius: 8px;
		font-size: 14px;
		color: var(--text-primary, #2d3748);
	}

	:global([data-theme='dark']) .data-item {
		background: var(--bg-tertiary);
		color: #ffffff;
	}

	.data-icon {
		font-size: 18px;
		flex-shrink: 0;
	}

	.details-toggle {
		display: block;
		margin: 0 auto 16px;
		background: none;
		border: none;
		color: var(--accent, #4299e1);
		font-size: 14px;
		cursor: pointer;
		padding: 8px 16px;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.details-toggle:hover {
		background: var(--bg-tertiary, #f7fafc);
	}

	:global([data-theme='dark']) .details-toggle:hover {
		background: var(--bg-tertiary);
	}

	.details-section {
		margin-bottom: 16px;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}

	@media (min-width: 600px) {
		.detail-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.detail-card {
		background: var(--bg-tertiary, #f7fafc);
		padding: 14px;
		border-radius: 8px;
		border: 1px solid var(--border-color, #e2e8f0);
	}

	:global([data-theme='dark']) .detail-card {
		background: var(--bg-tertiary);
		border-color: var(--border-color);
	}

	.detail-card h4 {
		margin: 0 0 10px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #2d3748);
	}

	:global([data-theme='dark']) .detail-card h4 {
		color: #ffffff;
	}

	.detail-card ul {
		margin: 0;
		padding-left: 16px;
		font-size: 13px;
		color: var(--text-secondary, #718096);
		line-height: 1.4;
	}

	:global([data-theme='dark']) .detail-card ul {
		color: var(--text-muted);
	}

	.detail-card li {
		margin-bottom: 3px;
	}

	.modal-actions {
		padding: 20px 28px 24px;
		display: flex;
		gap: 12px;
		justify-content: center;
		border-top: 1px solid var(--border-color, #e2e8f0);
	}

	:global([data-theme='dark']) .modal-actions {
		border-top-color: var(--border-color);
	}

	.btn-accept,
	.btn-decline {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 11px 22px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: all 0.2s;
		flex: 1;
		justify-content: center;
		max-width: 150px;
	}

	.btn-accept {
		background: var(--accent, #4299e1);
		color: white;
	}

	.btn-accept:hover {
		background: var(--accent-hover, #3182ce);
		transform: translateY(-1px);
	}

	.btn-decline {
		background: var(--bg-tertiary, #f7fafc);
		color: var(--text-primary, #2d3748);
		border: 1px solid var(--border-color, #e2e8f0);
	}

	:global([data-theme='dark']) .btn-decline {
		background: var(--bg-tertiary);
		color: #ffffff;
		border-color: var(--border-color);
	}

	.btn-decline:hover {
		background: var(--bg-hover, #e2e8f0);
		transform: translateY(-1px);
	}

	:global([data-theme='dark']) .btn-decline:hover {
		background: var(--border-hover);
	}

	.btn-icon {
		font-size: 16px;
	}

	@media (max-width: 500px) {
		.consent-modal {
			margin: 20px;
			border-radius: 12px;
		}

		.modal-header,
		.modal-content,
		.modal-actions {
			padding-left: 20px;
			padding-right: 20px;
		}

		.modal-actions {
			flex-direction: column;
		}

		.btn-accept,
		.btn-decline {
			max-width: 100%;
		}
	}
</style>

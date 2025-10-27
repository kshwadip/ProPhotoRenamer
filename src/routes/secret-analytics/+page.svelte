<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	let isAuthenticated = false;
	let isLoading = true;
	let username = '';
	let password = '';
	let loginError = '';

	// Simple browser detection
	let browser = false;

	// Timeline filter
	let selectedTimeframe = '7_days';
	const timeframes = [
		{ value: '24_hours', label: 'Last 24 hours', days: 1 },
		{ value: '7_days', label: 'Last 7 days', days: 7 },
		{ value: '30_days', label: 'Last 30 days', days: 30 },
		{ value: '90_days', label: 'Last 3 months', days: 90 },
		{ value: '365_days', label: 'Last 12 months', days: 365 },
		{ value: 'all_time', label: 'All time', days: 9999 }
	];

	// Type definitions
	interface DailyStats {
		date: string;
		sessions: number;
		photos: number;
		downloads: number;
	}

	interface TemplateUsage {
		template: string;
		count: number;
	}

	interface AnalyticsEvent {
		id: string;
		session_id: string;
		event_type: string;
		event_data: Record<string, any> | null;
		user_fingerprint: string;
		created_at: string;
	}

	interface AnalyticsData {
		totalSessions: number;
		totalPhotosProcessed: number;
		totalDownloads: number;
		conversionRate: string;
		avgSessionDuration: number;
		dailyStats: DailyStats[];
		templateUsage: TemplateUsage[];
		recentEvents: AnalyticsEvent[];
	}

	interface PeriodComparison {
		current: number;
		previous: number;
		change: number;
		changePercent: string;
	}

	interface AnalyticsComparison {
		sessions: PeriodComparison;
		photos: PeriodComparison;
		downloads: PeriodComparison;
		conversionRate: PeriodComparison;
	}

	// Analytics data
	let analyticsData: AnalyticsData = {
		totalSessions: 0,
		totalPhotosProcessed: 0,
		totalDownloads: 0,
		conversionRate: '0',
		avgSessionDuration: 0,
		dailyStats: [],
		templateUsage: [],
		recentEvents: []
	};

	let comparison: AnalyticsComparison = {
		sessions: { current: 0, previous: 0, change: 0, changePercent: '0' },
		photos: { current: 0, previous: 0, change: 0, changePercent: '0' },
		downloads: { current: 0, previous: 0, change: 0, changePercent: '0' },
		conversionRate: { current: 0, previous: 0, change: 0, changePercent: '0' }
	};

	let allEvents: AnalyticsEvent[] = [];

	onMount(() => {
		browser = true;
		checkAuth();
	});

	// Reactive statement to reload analytics when timeframe changes
	$: if (selectedTimeframe && browser && isAuthenticated) {
		processTimeframeData();
	}

	function checkAuth() {
		if (!browser) return;

		const auth = sessionStorage.getItem('admin_authenticated');
		if (auth === 'true') {
			isAuthenticated = true;
			loadAnalytics();
		}
		isLoading = false;
	}

	async function login() {
		if (!username || !password) {
			loginError = 'Please enter both username and password';
			return;
		}

		try {
			const { data, error } = await supabase.rpc('authenticate_admin', {
				p_username: username,
				p_password: password
			});

			if (error || !data) {
				loginError = 'Invalid credentials';
				return;
			}

			if (browser) {
				sessionStorage.setItem('admin_authenticated', 'true');
			}
			isAuthenticated = true;
			loginError = '';
			loadAnalytics();
		} catch (error) {
			loginError = 'Login failed. Please try again.';
		}
	}

	async function logout() {
		if (browser) {
			sessionStorage.removeItem('admin_authenticated');
		}
		isAuthenticated = false;
	}

	async function loadAnalytics() {
		try {
			// Load all analytics from Supabase
			const { data: events, error } = await supabase
				.from('analytics_events')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(5000); // Increased limit for better historical data

			if (error) {
				console.error('Error loading analytics:', error);
				return;
			}

			allEvents = events || [];
			processTimeframeData();
		} catch (error) {
			console.error('Error loading analytics:', error);
		}
	}

	function getDateRange(timeframe: string) {
		const now = new Date();
		const selectedRange = timeframes.find((t) => t.value === timeframe);
		const days = selectedRange?.days || 7;

		if (days === 9999) {
			return { start: new Date('2020-01-01'), end: now };
		}

		const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		return { start, end: now };
	}

	function processTimeframeData() {
		const { start: currentStart, end: currentEnd } = getDateRange(selectedTimeframe);
		const duration = currentEnd.getTime() - currentStart.getTime();
		const previousStart = new Date(currentStart.getTime() - duration);
		const previousEnd = currentStart;

		// Filter events for current period
		const currentEvents = allEvents.filter((event) => {
			const eventDate = new Date(event.created_at);
			return eventDate >= currentStart && eventDate <= currentEnd;
		});

		// Filter events for previous period (for comparison)
		const previousEvents = allEvents.filter((event) => {
			const eventDate = new Date(event.created_at);
			return eventDate >= previousStart && eventDate < previousEnd;
		});

		// Process current period
		const currentData = processAnalyticsData(currentEvents);
		const previousData = processAnalyticsData(previousEvents);

		// Calculate comparisons
		comparison = {
			sessions: calculateComparison(currentData.totalSessions, previousData.totalSessions),
			photos: calculateComparison(
				currentData.totalPhotosProcessed,
				previousData.totalPhotosProcessed
			),
			downloads: calculateComparison(currentData.totalDownloads, previousData.totalDownloads),
			conversionRate: calculateComparison(
				parseFloat(currentData.conversionRate),
				parseFloat(previousData.conversionRate)
			)
		};

		analyticsData = currentData;
	}

	function calculateComparison(current: number, previous: number): PeriodComparison {
		const change = current - previous;
		const changePercent = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0';

		return {
			current,
			previous,
			change,
			changePercent: `${change >= 0 ? '+' : ''}${changePercent}`
		};
	}

	function processAnalyticsData(events: AnalyticsEvent[]): AnalyticsData {
		const sessions = new Set<string>();
		let totalPhotos = 0;
		let totalDownloads = 0;
		const templateUsage: Record<string, number> = {};
		const dailyStats: Record<
			string,
			{
				date: string;
				sessions: Set<string>;
				photos: number;
				downloads: number;
			}
		> = {};

		events.forEach((event) => {
			sessions.add(event.session_id);

			const date = new Date(event.created_at).toISOString().split('T')[0];
			if (!dailyStats[date]) {
				dailyStats[date] = {
					date,
					sessions: new Set<string>(),
					photos: 0,
					downloads: 0
				};
			}
			dailyStats[date].sessions.add(event.session_id);

			if (event.event_type === 'photos_uploaded') {
				const count = event.event_data?.count || 1;
				totalPhotos += Number(count);
				dailyStats[date].photos += Number(count);
			}

			if (event.event_type === 'download_completed') {
				totalDownloads++;
				dailyStats[date].downloads++;
			}

			if (event.event_type === 'template_used') {
				const template = event.event_data?.template || 'Unknown';
				templateUsage[template] = (templateUsage[template] || 0) + 1;
			}
		});

		// Convert to arrays and sort
		const dailyStatsArray: DailyStats[] = Object.values(dailyStats)
			.map((day) => ({
				date: day.date,
				sessions: day.sessions.size,
				photos: day.photos,
				downloads: day.downloads
			}))
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		const templateUsageArray: TemplateUsage[] = Object.entries(templateUsage)
			.map(([template, count]) => ({ template, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			totalSessions: sessions.size,
			totalPhotosProcessed: totalPhotos,
			totalDownloads: totalDownloads,
			conversionRate: totalPhotos > 0 ? ((totalDownloads / totalPhotos) * 100).toFixed(1) : '0',
			avgSessionDuration: 0,
			dailyStats: dailyStatsArray,
			templateUsage: templateUsageArray,
			recentEvents: events.slice(0, 50)
		};
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat().format(num);
	}

	function getChangeClass(changePercent: string): string {
		if (changePercent.startsWith('+')) return 'metric-change-positive';
		if (changePercent.startsWith('-')) return 'metric-change-negative';
		return 'metric-change-neutral';
	}
</script>

<svelte:head>
	<title>Analytics Dashboard - Pro Photographer Renamer</title>
</svelte:head>

{#if isLoading}
	<div class="loading">Loading...</div>
{:else if !isAuthenticated}
	<!-- Login Form -->
	<div class="login-container">
		<div class="login-form">
			<h1>📊 Analytics Dashboard</h1>
			<p>Secure access required</p>

			<form on:submit|preventDefault={login}>
				<div class="form-group">
					<label for="username">Username</label>
					<input id="username" type="text" bind:value={username} required />
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input id="password" type="password" bind:value={password} required />
				</div>

				{#if loginError}
					<div class="error">{loginError}</div>
				{/if}

				<button type="submit" class="login-btn"> Access Dashboard </button>
			</form>
		</div>
	</div>
{:else}
	<!-- Analytics Dashboard -->
	<div class="dashboard">
		<header class="dashboard-header">
			<div class="header-content">
				<h1>📊 Analytics Dashboard</h1>
				<div class="header-controls">
					<!-- Timeline Filter -->
					<div class="timeline-filter">
						<label for="timeframe">📅 Timeline:</label>
						<select id="timeframe" bind:value={selectedTimeframe}>
							{#each timeframes as timeframe}
								<option value={timeframe.value}>{timeframe.label}</option>
							{/each}
						</select>
					</div>
					<button class="logout-btn" on:click={logout}>Logout</button>
				</div>
			</div>
		</header>

		<!-- Add this debug section after the header -->
		<div
			class="debug-info"
			style="background: #f0f0f0; padding: 20px; margin: 20px; border-radius: 8px;"
		>
			<h3>🐛 Debug Info</h3>
			<p><strong>Raw Events Count:</strong> {allEvents.length}</p>
			<p><strong>Selected Timeframe:</strong> {selectedTimeframe}</p>
			<p><strong>Date Range:</strong> {JSON.stringify(getDateRange(selectedTimeframe))}</p>
			<p><strong>Filtered Events:</strong> {analyticsData.recentEvents.length}</p>

			<details>
				<summary>Raw Events (First 5)</summary>
				<pre>{JSON.stringify(allEvents.slice(0, 5), null, 2)}</pre>
			</details>

			<details>
				<summary>Processed Analytics Data</summary>
				<pre>{JSON.stringify(analyticsData, null, 2)}</pre>
			</details>
		</div>

		<main class="dashboard-main">
			<!-- Current Period Info -->
			<div class="period-info">
				<h2>{timeframes.find((t) => t.value === selectedTimeframe)?.label || 'Selected Period'}</h2>
				<p>Comparing with previous period</p>
			</div>

			<!-- Key Metrics -->
			<section class="metrics-grid">
				<div class="metric-card">
					<div class="metric-value">{formatNumber(analyticsData.totalSessions)}</div>
					<div class="metric-label">Total Sessions</div>
					<div class="metric-change {getChangeClass(comparison.sessions.changePercent)}">
						{comparison.sessions.changePercent}% vs previous period
					</div>
				</div>

				<div class="metric-card">
					<div class="metric-value">{formatNumber(analyticsData.totalPhotosProcessed)}</div>
					<div class="metric-label">Photos Processed</div>
					<div class="metric-change {getChangeClass(comparison.photos.changePercent)}">
						{comparison.photos.changePercent}% vs previous period
					</div>
				</div>

				<div class="metric-card">
					<div class="metric-value">{formatNumber(analyticsData.totalDownloads)}</div>
					<div class="metric-label">Downloads</div>
					<div class="metric-change {getChangeClass(comparison.downloads.changePercent)}">
						{comparison.downloads.changePercent}% vs previous period
					</div>
				</div>

				<div class="metric-card">
					<div class="metric-value">{analyticsData.conversionRate}%</div>
					<div class="metric-label">Conversion Rate</div>
					<div class="metric-change {getChangeClass(comparison.conversionRate.changePercent)}">
						{comparison.conversionRate.changePercent}% vs previous period
					</div>
				</div>
			</section>

			<!-- Rest of your existing charts and activity sections -->
			<!-- Charts Section -->
			<section class="charts-section">
				<div class="chart-container">
					<h3>
						📈 Daily Sessions - {timeframes.find((t) => t.value === selectedTimeframe)?.label}
					</h3>
					<div class="chart-placeholder">
						<div class="mini-chart">
							{#each analyticsData.dailyStats.slice(-14) as day}
								<div class="chart-bar">
									<div
										class="bar"
										style="height: {analyticsData.dailyStats.length > 0
											? (day.sessions /
													Math.max(...analyticsData.dailyStats.map((d) => d.sessions), 1)) *
												100
											: 0}%"
									></div>
									<div class="bar-label">
										{formatDate(day.date).split('/')[1] || day.date.slice(-2)}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class="chart-container">
					<h3>
						📊 Template Usage - {timeframes.find((t) => t.value === selectedTimeframe)?.label}
					</h3>
					<div class="template-list">
						{#each analyticsData.templateUsage as template}
							<div class="template-item">
								<div class="template-name">{template.template}</div>
								<div class="template-bar">
									<div
										class="template-fill"
										style="width: {analyticsData.templateUsage.length > 0
											? (template.count / (analyticsData.templateUsage[0]?.count || 1)) * 100
											: 0}%"
									></div>
								</div>
								<div class="template-count">{template.count}</div>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<!-- Recent Activity -->
			<section class="activity-section">
				<h3>🎯 Recent Activity - {timeframes.find((t) => t.value === selectedTimeframe)?.label}</h3>
				<div class="activity-list">
					{#each analyticsData.recentEvents.slice(0, 20) as event}
						<div class="activity-item">
							<div class="activity-icon">
								{#if event.event_type === 'photos_uploaded'}📷
								{:else if event.event_type === 'download_completed'}⬇️
								{:else if event.event_type === 'template_used'}📝
								{:else}📊
								{/if}
							</div>
							<div class="activity-details">
								<div class="activity-type">{event.event_type.replace('_', ' ')}</div>
								<div class="activity-data">
									{JSON.stringify(event.event_data || {})}
								</div>
							</div>
							<div class="activity-time">
								{new Date(event.created_at).toLocaleString()}
							</div>
						</div>
					{/each}
				</div>
			</section>
		</main>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		font-size: 18px;
		color: #666;
	}

	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 20px;
	}

	.login-form {
		background: white;
		padding: 40px;
		border-radius: 16px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
	}

	.login-form h1 {
		text-align: center;
		margin-bottom: 8px;
		color: #333;
	}

	.login-form p {
		text-align: center;
		color: #666;
		margin-bottom: 32px;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		font-weight: 500;
		color: #333;
	}

	.form-group input {
		width: 100%;
		padding: 12px 16px;
		border: 2px solid #e1e5e9;
		border-radius: 8px;
		font-size: 16px;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #4299e1;
	}

	.error {
		color: #e53e3e;
		font-size: 14px;
		margin-bottom: 16px;
		text-align: center;
	}

	.login-btn {
		width: 100%;
		background: #4299e1;
		color: white;
		border: none;
		padding: 12px 24px;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.login-btn:hover {
		background: #3182ce;
	}

	.dashboard {
		min-height: 100vh;
		background: #f8fafc;
	}

	.dashboard-header {
		background: white;
		border-bottom: 1px solid #e2e8f0;
		padding: 20px 0;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.dashboard-header h1 {
		margin: 0;
		color: #1a202c;
		font-size: 24px;
	}

	.logout-btn {
		background: #e2e8f0;
		border: none;
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		color: #2d3748;
		font-size: 14px;
	}

	.logout-btn:hover {
		background: #cbd5e0;
	}

	.dashboard-main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 32px 20px;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 24px;
		margin-bottom: 40px;
	}

	.metric-card {
		background: white;
		padding: 24px;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 1px solid #e2e8f0;
	}

	.metric-value {
		font-size: 32px;
		font-weight: 700;
		color: #1a202c;
		margin-bottom: 8px;
	}

	.metric-label {
		color: #718096;
		font-size: 14px;
		margin-bottom: 4px;
	}

	.metric-change {
		color: #38a169;
		font-size: 12px;
		font-weight: 500;
	}

	.charts-section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-bottom: 40px;
	}

	.chart-container {
		background: white;
		padding: 24px;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 1px solid #e2e8f0;
	}

	.chart-container h3 {
		margin: 0 0 20px 0;
		color: #1a202c;
		font-size: 18px;
	}

	.mini-chart {
		display: flex;
		gap: 8px;
		align-items: end;
		height: 120px;
		padding: 20px 0;
	}

	.chart-bar {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
	}

	.bar {
		background: #4299e1;
		width: 100%;
		min-height: 4px;
		border-radius: 2px;
		margin-bottom: 8px;
	}

	.bar-label {
		font-size: 12px;
		color: #718096;
	}

	.template-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.template-item {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.template-name {
		flex: 0 0 120px;
		font-size: 12px;
		color: #2d3748;
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.template-bar {
		flex: 1;
		height: 8px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
	}

	.template-fill {
		height: 100%;
		background: #4299e1;
		border-radius: 4px;
	}

	.template-count {
		flex: 0 0 40px;
		text-align: right;
		font-size: 12px;
		color: #718096;
	}

	.activity-section {
		background: white;
		padding: 24px;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 1px solid #e2e8f0;
	}

	.activity-section h3 {
		margin: 0 0 20px 0;
		color: #1a202c;
		font-size: 18px;
	}

	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px;
		background: #f7fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.activity-icon {
		font-size: 20px;
		flex-shrink: 0;
	}

	.activity-details {
		flex: 1;
	}

	.activity-type {
		font-size: 14px;
		font-weight: 500;
		color: #2d3748;
		text-transform: capitalize;
	}

	.activity-data {
		font-size: 12px;
		color: #718096;
		font-family: monospace;
	}

	.activity-time {
		font-size: 12px;
		color: #a0aec0;
		flex-shrink: 0;
	}

	.header-controls {
		display: flex;
		gap: 20px;
		align-items: center;
	}

	.timeline-filter {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.timeline-filter label {
		font-size: 14px;
		color: #2d3748;
		font-weight: 500;
	}

	.timeline-filter select {
		padding: 6px 12px;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		background: white;
		font-size: 14px;
		color: #2d3748;
		cursor: pointer;
	}

	.timeline-filter select:focus {
		outline: none;
		border-color: #4299e1;
	}

	.period-info {
		text-align: center;
		margin-bottom: 32px;
		padding: 20px;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.period-info h2 {
		margin: 0 0 8px 0;
		color: #1a202c;
		font-size: 24px;
	}

	.period-info p {
		margin: 0;
		color: #718096;
		font-size: 14px;
	}

	.metric-change-positive {
		color: #38a169;
	}

	.metric-change-negative {
		color: #e53e3e;
	}

	.metric-change-neutral {
		color: #718096;
	}

	@media (max-width: 768px) {
		.charts-section {
			grid-template-columns: 1fr;
		}

		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

<script lang="ts">
  export let error: Error;
  export let status: number;
</script>

<div class="error-view">
  <h1>
    {status >= 400 && status < 500 ? '⚠️' : '🚨'}
    Something went wrong
  </h1>
  <p>
    <strong>Status code:</strong> {status}
    <br />
    <strong>Message:</strong> {error?.message || 'An unexpected error occurred.'}
  </p>
  {#if error && error.stack}
    <details>
      <summary>Show technical details</summary>
      <pre>{error.stack}</pre>
    </details>
  {/if}
  <a href="/" class="back-btn">Back to Home</a>
</div>

<style>
  .error-view {
    max-width: 520px;
    margin: 3rem auto 0 auto;
    background: #fff8f8;
    color: #ad2f2e;
    border-radius: 0.7rem;
    box-shadow: 0 3px 24px #a31b2e10;
    padding: 2.2rem 2.2rem 1.6rem;
    text-align: center;
    word-break: break-word;
  }
  h1 {
    font-size: 2rem;
    margin-bottom: 1.1rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .error-view strong {
    color: #6c1110;
    font-weight: 600;
  }
  .back-btn {
    display: inline-block;
    margin: 1.4rem auto 0;
    padding: 0.7rem 2.2rem;
    font-size: 1rem;
    font-weight: 600;
    background: #ffe2e2;
    color: #ad2f2e;
    border: none;
    border-radius: 24px;
    text-decoration: none;
    box-shadow: 0 1px 8px #fbb1b120;
    transition: background 0.14s;
  }
  .back-btn:hover {
    background: #ffb9b9;
  }
  details {
    margin: 1rem auto 0 auto;
    text-align: left;
    background: #faf0f0;
    color: #7b5557;
    border-radius: 0.4rem;
    padding: 0.6rem 0.88rem;
    font-size: 0.94rem;
    max-height: 220px;
    overflow: auto;
  }
  summary { cursor: pointer; font-weight: 600;}
  @media (max-width: 600px) {
    .error-view { padding: 1.1rem 0.8rem; max-width: 95vw;}
    h1 { font-size: 1.3rem; }
  }
</style>

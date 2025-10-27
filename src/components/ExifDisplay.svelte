<script lang="ts">
  export let exifData: any | null = null;

  function formatCoordinate(coord: number | undefined, label: string) {
    if (coord === undefined || coord === null) return null;
    return `${coord.toFixed(6)}° ${label}`;
  }

  function formatDate(date: Date | string | null) {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return String(date);
    }
  }
</script>

{#if !exifData}
  <p class="no-exif">No EXIF metadata available for this photo.</p>
{:else}
  <div class="exif-display" role="region" aria-label="Photo EXIF metadata">
    <h4>Photo EXIF Data</h4>
    <dl>
      <dt>Camera Make</dt>
      <dd>{exifData.make ?? 'N/A'}</dd>

      <dt>Camera Model</dt>
      <dd>{exifData.model ?? 'N/A'}</dd>

      <dt>Lens Model</dt>
      <dd>{exifData.lensModel ?? 'N/A'}</dd>

      <dt>Date Taken</dt>
      <dd>{formatDate(exifData.dateTaken ?? exifData.DateTimeOriginal)}</dd>

      <dt>Exposure Time</dt>
      <dd>{exifData.exposureTime ? `${exifData.exposureTime}s` : 'N/A'}</dd>

      <dt>Aperture (F-Number)</dt>
      <dd>{exifData.fNumber ?? 'N/A'}</dd>

      <dt>ISO</dt>
      <dd>{exifData.iso ?? 'N/A'}</dd>

      <dt>Focal Length</dt>
      <dd>{exifData.focalLength ? `${exifData.focalLength} mm` : 'N/A'}</dd>

      <dt>Orientation</dt>
      <dd>{exifData.orientation ?? 'N/A'}</dd>

      <dt>Image Dimensions</dt>
      <dd>
        {exifData.width && exifData.height
          ? `${exifData.width} × ${exifData.height}`
          : 'N/A'}
      </dd>

      <dt>GPS Latitude</dt>
      <dd>
        {formatCoordinate(exifData.gps?.lat ?? exifData.GPSLatitude, exifData.gps?.lat && exifData.gps.lat >= 0 ? 'N' : 'S') ?? 'N/A'}
      </dd>

      <dt>GPS Longitude</dt>
      <dd>
        {formatCoordinate(exifData.gps?.lng ?? exifData.GPSLongitude, exifData.gps?.lng && exifData.gps.lng >= 0 ? 'E' : 'W') ?? 'N/A'}
      </dd>

      <dt>Software</dt>
      <dd>{exifData.software ?? 'N/A'}</dd>

      <dt>Copyright</dt>
      <dd>{exifData.copyright ?? 'N/A'}</dd>
    </dl>
  </div>
{/if}

<style>
  .exif-display {
    background: #f9fafd;
    border-radius: 0.7rem;
    padding: 1rem 1.25rem;
    box-shadow: 0 2px 9px #d9e5f1;
    font-family: system-ui, sans-serif;
    overflow: auto;
    max-height: 340px;
  }

  h4 {
    font-weight: bold;
    margin-top: 0;
    margin-bottom: 1rem;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 0.4rem;
    color: #0f172a;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    row-gap: 0.38rem;
    column-gap: 0.9rem;
    font-size: 0.9rem;
    color: #475569;
  }

  dt {
    font-weight: 700;
    text-align: right;
  }

  dd {
    margin: 0;
    overflow-wrap: break-word;
  }

  .no-exif {
    font-style: italic;
    color: #94a3b8;
    font-size: 0.95rem;
    text-align: center;
    padding: 0.7rem;
  }
</style>
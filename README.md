# QD Music

QD Music is a branded downloader front end with a simple flow:

1. Paste a YouTube link.
2. Preview metadata appears.
3. Choose audio or video.
4. The browser starts the download flow.

The static front end includes an optional backend hook:

```html
<script>
  window.QD_MUSIC_DOWNLOAD_ENDPOINT = "/download";
</script>
```

When that variable is set, QD Music sends download requests to the backend endpoint with:

- `url`
- `mode`
- `filename`

The backend should only process media the user owns, has permission to download, or that is licensed for reuse.

## Railway

Railway can run this app with:

```bash
npm start
```

The server listens on `process.env.PORT`.

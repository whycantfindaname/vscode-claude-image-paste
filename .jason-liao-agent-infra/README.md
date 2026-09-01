# Cursor Image Paste Managed Sync

This directory is the single in-repository entry for the Cursor Image Paste
managed workflow. The initial contract targets `lwj_dev`; Agent Infra owns
repository convergence, and project verification compiles the extension and
runs its Node test suite through the repository `npm test` script.

```bash
npm test
```

VSIX packaging, extension installation, editor restart, and Remote-SSH
acceptance remain explicit platform operations. See [errors.md](errors.md)
after a failure.

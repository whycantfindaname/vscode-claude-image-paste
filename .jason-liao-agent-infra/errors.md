# Cursor Image Paste Managed Sync Errors

## CURSOR_IMAGE_PASTE_SOURCE_VERIFY_FAILED

- Stage: project workflow.
- Meaning: `npm test` failed during TypeScript compilation or Node tests, or
  the command timed out.
- Action: fix the reported compiler or test failure and rerun the complete
  command.
- Stop condition: do not package or install the extension until verification
  passes.

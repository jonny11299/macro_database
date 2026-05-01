import { writable } from 'svelte/store';

// Shared file list — written by UploadTab, read by LinksTab.
// Each entry: { id, name, status: 'parsing'|'ready'|'error', sheets, error, activeSheet, open }
export const fileList = writable([]);

import importedCore from '@pkistudio/pkistudiojs/core';
import importedOidResolver from '@pkistudio/pkistudiojs/oid-resolver';
import importedViewer from '@pkistudio/pkistudiojs/viewer';
import type { PkiStudioApi, PkiStudioCoreApi, PkiStudioOidResolverApi } from './pkistudio-types';

export const PkiStudioCore = importedCore as PkiStudioCoreApi;
export const PkiStudioOidResolver = importedOidResolver as PkiStudioOidResolverApi;
export const PkiStudio = importedViewer as PkiStudioApi;

PkiStudio.core ??= PkiStudioCore;

if (typeof window !== 'undefined') {
  window.PkiStudioCore = PkiStudioCore;
  window.PkiStudio = PkiStudio;
}

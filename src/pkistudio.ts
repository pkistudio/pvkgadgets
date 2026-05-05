import importedCore from 'pkistudiojs/core';
import importedOidResolver from 'pkistudiojs/oid-resolver';
import importedViewer from 'pkistudiojs/viewer';
import type { PkiStudioApi, PkiStudioCoreApi, PkiStudioOidResolverApi } from './pkistudio-types';

export const PkiStudioCore = importedCore as PkiStudioCoreApi;
export const PkiStudioOidResolver = importedOidResolver as PkiStudioOidResolverApi;
export const PkiStudio = importedViewer as PkiStudioApi;

PkiStudio.core ??= PkiStudioCore;

if (typeof window !== 'undefined') {
  window.PkiStudioCore = PkiStudioCore;
  window.PkiStudio = PkiStudio;
}

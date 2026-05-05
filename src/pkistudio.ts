import importedCore from 'pkistudiojs/core';
import importedViewer from 'pkistudiojs/viewer';
import pkistudioOidsUrl from 'virtual:pkistudiojs-oids-url';
import type { PkiStudioApi, PkiStudioCoreApi } from './pkistudio-types';

export const PkiStudioCore = importedCore as PkiStudioCoreApi;
export const PkiStudio = importedViewer as PkiStudioApi;
export const PKISTUDIO_OIDS_URL = pkistudioOidsUrl;

PkiStudio.core ??= PkiStudioCore;

if (typeof window !== 'undefined') {
  window.PkiStudioCore = PkiStudioCore;
  window.PkiStudio = PkiStudio;
}

import { PkiStudio, PkiStudioOidResolver } from './pkistudio';

window.addEventListener('DOMContentLoaded', () => {
  PkiStudio.init({
    mount: '#pkistudioViewer',
    oidResolver: PkiStudioOidResolver,
    fullscreen: true
  });
});

import { PkiStudio, PkiStudioOidResolver } from './pkistudio';

window.addEventListener('DOMContentLoaded', () => {
  PkiStudio.init({
    mount: '#pkistudio',
    oidResolver: PkiStudioOidResolver,
    fullscreen: true
  });
});

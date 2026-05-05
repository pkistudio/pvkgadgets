import { PKISTUDIO_OIDS_URL, PkiStudio } from './pkistudio';

window.addEventListener('DOMContentLoaded', () => {
  PkiStudio.init({
    mount: '#pkistudio',
    oidUrl: PKISTUDIO_OIDS_URL,
    fullscreen: true
  });
});

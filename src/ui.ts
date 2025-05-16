export function setupUI(setSetting: (type: 'blobs' | 'resolution', value: number) => void) {
  const blobSettings = [1, 10, 50, 100];
  const resSettings = [16, 32, 64, 128];

  for (let i = 0; i < blobSettings.length; ++i) {
    const elem = document.getElementById(`blobSetting${i}`) as HTMLButtonElement;
    if (elem) {
      elem.onclick = () => {
        for (let j = 0; j < blobSettings.length; ++j) {
          const e = document.getElementById(`blobSetting${j}`);
          if (e) e.classList.remove('active');
        }
        elem.classList.add('active');
        setSetting('blobs', blobSettings[i]);
      };
    }
  }

  for (let i = 0; i < resSettings.length; ++i) {
    const elem = document.getElementById(`resSetting${i}`) as HTMLButtonElement;
    if (elem) {
      elem.onclick = () => {
        for (let j = 0; j < resSettings.length; ++j) {
          const e = document.getElementById(`resSetting${j}`);
          if (e) e.classList.remove('active');
        }
        elem.classList.add('active');
        setSetting('resolution', resSettings[i]);
      };
    }
  }
}

export function setupModeToggle(onModeChange: (mode: 'cpu' | 'gpu') => void) {
  const toggle = document.getElementById('modeToggle') as HTMLInputElement;
  if (!toggle) return;
  toggle.checked = false;
  toggle.addEventListener('change', () => {
    onModeChange(toggle.checked ? 'gpu' : 'cpu');
  });
}
(() => {
  window.__benchmarkModelSourceHelper = true;

  function initModelSource(config) {
    const sourceSelect = document.getElementById(config.modelSourceSelectId);
    const openrouterFields = document.getElementById(config.openrouterFieldsId);
    const lmstudioFields = document.getElementById(config.lmstudioFieldsId);
    const llamaserverFields = document.getElementById(config.llamaserverFieldsId);
    const modelInput = document.getElementById(config.modelInputId);
    const providerInput = document.getElementById(config.providerInputId);
    const maxTokensInput = document.getElementById(config.maxTokensInputId);
    const lmstudioModelSelect = document.getElementById(config.lmstudioModelSelectId);
    const lmstudioModelNote = document.getElementById(config.lmstudioModelNoteId);
    const llamaserverModelSelect = document.getElementById(config.llamaserverModelSelectId);
    const llamaserverModelNote = document.getElementById(config.llamaserverModelNoteId);

    if (!sourceSelect || !openrouterFields || !lmstudioFields || !llamaserverFields || !lmstudioModelSelect || !llamaserverModelSelect || !modelInput) {
      return;
    }

    let openrouterModelBackup = modelInput.value || '';
    let openrouterProviderBackup = providerInput?.value || '';
    let openrouterMaxTokensBackup = maxTokensInput?.value || '';
    let inFlight = null;
    let activeLmStudioModel = '';

    async function switchLmStudioModel(modelId) {
      if (!modelId) return;

      lmstudioModelSelect.disabled = true;
      setLmStudioNote(`Loading '${modelId}' in LM Studio…`);

      try {
        const response = await fetch('/models/lmstudio/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: modelId })
        });

        if (!response.ok) {
          let detail = '';
          try {
            const payload = await response.json();
            detail = payload?.detail || '';
          } catch {
            // ignore
          }
          throw new Error(detail || response.statusText || 'Unable to switch LM Studio model');
        }

        activeLmStudioModel = modelId;
      } catch (error) {
        setLmStudioNote(error?.message || 'Unable to switch LM Studio model.');
        return;
      } finally {
        lmstudioModelSelect.disabled = false;
      }

      applyLmStudioModelSelection();
    }

    function getSource() {
      //return sourceSelect.value === 'lmstudio' ? 'lmstudio' : 'openrouter';
      const value = sourceSelect.value;
      if (value === 'llamaserver') return 'llamaserver';
      if (value === 'lmstudio') return 'lmstudio';
      return 'openrouter';
    }

    function setLmStudioNote(text) {
      if (lmstudioModelNote) lmstudioModelNote.textContent = text || '';
    }

    function setLlamaserverNote(text) {
      if (llamaserverModelNote) llamaserverModelNote.textContent = text || '';
    }
  
    function applyLmStudioModelSelection() {
      if (getSource() !== 'lmstudio') return;

      const selected = lmstudioModelSelect.value;
      if (!selected) {
        modelInput.value = '';
        setLmStudioNote('Select a model to continue.');
        return;
      }

      modelInput.value = `lmstudio/${selected}`;

      const contextRaw = lmstudioModelSelect.selectedOptions?.[0]?.dataset?.context;
      const context = contextRaw ? parseInt(contextRaw, 10) : NaN;
      if (maxTokensInput && Number.isFinite(context) && context > 0) {
        maxTokensInput.value = String(context);
        maxTokensInput.max = String(context);
      } else if (maxTokensInput) {
        maxTokensInput.removeAttribute('max');
      }

      setLmStudioNote(
        Number.isFinite(context) && context > 0
          ? `Context: ${context} tokens`
          : 'Context: unknown (adjust max tokens manually)'
      );
    }

    function applyLlamaserverModelSelection() {
      if (getSource() !== 'llamaserver') return;

      const selected = llamaserverModelSelect.value;
      if (!selected) {
        modelInput.value = '';
        setLlamaserverNote('Select a model to continue.');
        return;
      }

      modelInput.value = `llamaserver/${selected}`;

      const contextRaw = llamaserverModelSelect.selectedOptions?.[0]?.dataset?.context;
      const context = contextRaw ? parseInt(contextRaw, 10) : NaN;
      if (maxTokensInput && Number.isFinite(context) && context > 0) {
        maxTokensInput.value = String(context);
        maxTokensInput.max = String(context);
      } else if (maxTokensInput) {
        maxTokensInput.removeAttribute('max');
      }

      setLlamaserverNote(
        Number.isFinite(context) && context > 0
          ? `Context: ${context} tokens`
          : 'Context: unknown (adjust max tokens manually)'
      );
    }
  
    async function loadLmStudioModels() {
      if (inFlight) return inFlight;

      lmstudioModelSelect.disabled = true;
      lmstudioModelSelect.innerHTML = '';
      const loading = document.createElement('option');
      loading.value = '';
      loading.textContent = 'Loading…';
      lmstudioModelSelect.appendChild(loading);
      setLmStudioNote('Loading models from LM Studio…');

      inFlight = fetch('/models/lmstudio')
        .then(async (response) => {
          if (!response.ok) {
            let detail = '';
            try {
              const payload = await response.json();
              detail = payload?.detail || '';
            } catch {
              // ignore
            }
            throw new Error(detail || response.statusText || 'Unable to load models');
          }
          return response.json();
        })
        .then((data) => {
          const models = Array.isArray(data?.models) ? data.models : [];
          lmstudioModelSelect.innerHTML = '';
          if (!models.length) {
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'No models found';
            lmstudioModelSelect.appendChild(empty);
            setLmStudioNote('No LM Studio models were returned.');
            return;
          }

          models.forEach((entry) => {
            if (!entry?.id) return;
            const option = document.createElement('option');
            option.value = entry.id;
            option.textContent = entry.id;
            if (entry.context_length) option.dataset.context = String(entry.context_length);
            lmstudioModelSelect.appendChild(option);
          });

          lmstudioModelSelect.disabled = false;
          applyLmStudioModelSelection();
          activeLmStudioModel = lmstudioModelSelect.value;
        })
        .catch((error) => {
          lmstudioModelSelect.innerHTML = '';
          const failed = document.createElement('option');
          failed.value = '';
          failed.textContent = 'Unable to connect';
          lmstudioModelSelect.appendChild(failed);
          setLmStudioNote(error?.message || 'Unable to load LM Studio models.');
        })
        .finally(() => {
          inFlight = null;
        });

      return inFlight;
    }

    async function loadLlamaserverModels() {
      if (inFlight) return inFlight;

      llamaserverModelSelect.disabled = true;
      llamaserverModelSelect.innerHTML = '';
      const loading = document.createElement('option');
      loading.value = '';
      loading.textContent = 'Loading…';
      llamaserverModelSelect.appendChild(loading);
      setLlamaserverNote('Loading models from llama-server…');

      inFlight = fetch('/models/llamaserver')
        .then(async (response) => {
          if (!response.ok) {
            let detail = '';
            try {
              const payload = await response.json();
              detail = payload?.detail || '';
            } catch {
              // ignore
            }
            throw new Error(detail || response.statusText || 'Unable to load models');
          }
          return response.json();
        })
        .then((data) => {
          const models = Array.isArray(data?.models) ? data.models : [];
          llamaserverModelSelect.innerHTML = '';
          if (!models.length) {
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'No models found';
            llamaserverModelSelect.appendChild(empty);
            setLlamaserverNote('No llama-server models were returned.');
            return;
          }

          models.forEach((entry) => {
            if (!entry?.id) return;
            const option = document.createElement('option');
            option.value = entry.id;
            option.textContent = entry.id;
            if (entry.context_length) option.dataset.context = String(entry.context_length);
            llamaserverModelSelect.appendChild(option);
          });

          llamaserverModelSelect.disabled = false;
          applyLlamaserverModelSelection();
        })
        .catch((error) => {
          llamaserverModelSelect.innerHTML = '';
          const failed = document.createElement('option');
          failed.value = '';
          failed.textContent = 'Unable to connect';
          llamaserverModelSelect.appendChild(failed);
          setLlamaserverNote(error?.message || 'Unable to load llama-server models.');
        })
        .finally(() => {
          inFlight = null;
        });

      return inFlight;
    }

    async function handleLmStudioModelChange() {
      const selected = lmstudioModelSelect.value;
      applyLmStudioModelSelection();

      if (getSource() !== 'lmstudio') return;
      if (!selected) {
        activeLmStudioModel = '';
        return;
      }

      if (selected === activeLmStudioModel) return;
      await switchLmStudioModel(selected);
    }

    function handleLlamaserverModelChange() {
      const selected = llamaserverModelSelect.value;
      applyLlamaserverModelSelection();
    }
  
    function applyModelSourceUI() {
      //const isLmstudio = getSource() === 'lmstudio';
      const source = getSource();
      const isLlamaserver = source === 'llamaserver';
      const isLmstudio = source === 'lmstudio';
      //openrouterFields.hidden = isLmstudio;
      //lmstudioFields.hidden = !isLmstudio;
      llamaserverFields.hidden = !isLlamaserver;
      lmstudioFields.hidden = !isLmstudio;
      openrouterFields.hidden = isLmstudio || isLlamaserver;

      if (isLlamaserver) {
        if (!modelInput.disabled) {
          openrouterModelBackup = modelInput.value || '';
          if (providerInput) openrouterProviderBackup = providerInput.value || '';
          if (maxTokensInput) openrouterMaxTokensBackup = maxTokensInput.value || '';
        }

        modelInput.disabled = true;
        modelInput.required = false;
        modelInput.value = '';

        if (providerInput) {
          providerInput.value = '';
          providerInput.disabled = true;
        }

        loadLlamaserverModels();
        return;
      }

      if (isLmstudio) {
        if (!modelInput.disabled) {
          openrouterModelBackup = modelInput.value || '';
          if (providerInput) openrouterProviderBackup = providerInput.value || '';
          if (maxTokensInput) openrouterMaxTokensBackup = maxTokensInput.value || '';
        }

        modelInput.disabled = true;
        modelInput.required = false;
        modelInput.value = '';

        if (providerInput) {
          providerInput.value = '';
          providerInput.disabled = true;
        }

        loadLmStudioModels();
        return;
      }

      modelInput.disabled = false;
      modelInput.required = true;
      if (openrouterModelBackup) modelInput.value = openrouterModelBackup;

      if (providerInput) {
        providerInput.disabled = false;
        providerInput.value = openrouterProviderBackup;
      }

      if (maxTokensInput) {
        if (openrouterMaxTokensBackup && openrouterMaxTokensBackup.trim()) {
          maxTokensInput.value = openrouterMaxTokensBackup;
        }
        maxTokensInput.removeAttribute('max');
      }

      setLlamaserverNote('');
      setLmStudioNote('');
    }

    sourceSelect.addEventListener('change', applyModelSourceUI);
    sourceSelect.addEventListener('input', applyModelSourceUI);
    llamaserverModelSelect.addEventListener('change', handleLlamaserverModelChange);
    lmstudioModelSelect.addEventListener('change', handleLmStudioModelChange);
    applyModelSourceUI();
  }

  const configs = [
    {
      modelSourceSelectId: 'model-source-select',
      llamaserverFieldsId: 'llamaserver-fields',
      lmstudioFieldsId: 'lmstudio-fields',
      openrouterFieldsId: 'openrouter-fields',
      modelInputId: 'model-input',
      providerInputId: 'provider-input',
      maxTokensInputId: 'max-tokens-input',
      llamaserverModelSelectId: 'llamaserver-model-select',
      llamaserverModelNoteId: 'llamaserver-model-note',
      lmstudioModelSelectId: 'lmstudio-model-select',
      lmstudioModelNoteId: 'lmstudio-model-note',
    },
    {
      modelSourceSelectId: 'qa-model-source-select',
      llamaserverFieldsId: 'qa-llamaserver-fields',
      lmstudioFieldsId: 'qa-lmstudio-fields',
      openrouterFieldsId: 'qa-openrouter-fields',
      modelInputId: 'qa-model-input',
      providerInputId: 'qa-provider-input',
      maxTokensInputId: 'qa-max-tokens-input',
      llamaserverModelSelectId: 'qa-llamaserver-model-select',
      llamaserverModelNoteId: 'qa-llamaserver-model-note',
      lmstudioModelSelectId: 'qa-lmstudio-model-select',
      lmstudioModelNoteId: 'qa-lmstudio-model-note',
    },
  ];

  configs.forEach(initModelSource);
})();

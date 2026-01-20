import { showToast } from '../components.js';

const form = document.querySelector('#create-task-form');
const submitBtn = document.querySelector('#submit-btn');
const statusMessage = document.querySelector('#status-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.querySelector('#task-name').value.trim();
    const instructions = document.querySelector('#instructions').value.trim();
    const referenceAnswer = document.querySelector('#reference-answer').value.trim();

    if (!name || !instructions || !referenceAnswer) {
        showToast('すべてのフィールドを入力してください', 'warning');
        return;
    }

    submitBtn.disabled = true;
    renderStatus('タスクを作成中...', 'info');

    try {
        const response = await fetch('/tasks/nlp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                instructions,
                reference_answer: referenceAnswer
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'タスクの作成に失敗しました');
        }

        const data = await response.json();
        renderStatus(`タスク "${data.task_id}" を作成しました！`, 'success');
        showToast('タスクを作成しました', 'success');

        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/ui/nlp/index.html';
        }, 2000);

    } catch (error) {
        console.error(error);
        renderStatus(error.message, 'error');
        showToast(error.message, 'error');
        submitBtn.disabled = false;
    }
});

function renderStatus(message, level) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status ${level} pop`;
}

# Benchmark Harness

A full-stack evaluation lab for benchmarking AI code-generation models across a curated suite of programming tasks. The repository bundles:

- **FastAPI backend** that exposes run and leaderboard APIs, persists run history, and streams live attempt progress.
- **Futuristic dashboard UI** (vanilla JS + CSS) for launching runs, viewing leaderboards, and drilling into per-task telemetry with neon-themed visuals.
- **Python harness** that orchestrates task execution end-to-end: prompting models, applying patches, running task-specific test suites, and emitting rich artifacts.
- **Language-diverse task catalog** (31 tasks across Python, JavaScript, Go, Rust, C++, and HTML) geared toward expert-level reasoning and tool use.

Use the harness to compare LLM performance, then monitor results in the dashboard or consume raw artifacts for offline analysis.

---
## Table of Contents
1. [Repository Layout](#repository-layout)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Launching the Benchmark Dashboard](#launching-the-benchmark-dashboard)
5. [Running the Harness from the CLI](#running-the-harness-from-the-cli)
6. [Inspecting Runs & Artifacts](#inspecting-runs--artifacts)
7. [Task Catalog Overview](#task-catalog-overview)
8. [Per-Language Testing Notes](#per-language-testing-notes)
9. [Frontend Development Tips](#frontend-development-tips)
10. [Troubleshooting](#troubleshooting)

---
## Repository Layout

```
benchmark/
├── gui/                     # Neon dashboard front-end (index.html, run.html, style.css, main.js, run.js)
├── server/                  # FastAPI application and SQLite persistence layer
├── harness/                 # Python orchestrator for launching benchmark runs
├── tasks/                   # Task catalog (metadata, instructions, test harnesses, workspaces)
├── docs/                    # Supplementary documentation (GUI, tool-calling strategy, Go setup)
├── runs/                    # Run history, SQLite DB, per-attempt artifacts (generated)
└── README.md                # You're here 🌌
```

Key backend files:
- `server/api.py` – FastAPI app, WebSocket streaming, `/ui` and `/artifacts` mounts.
- `server/database.py` – SQLite helpers, leaderboard query tied to best-accuracy attempts.
- `harness/run_harness.py` – core orchestration logic (progress callbacks, metrics aggregation).

---
## Prerequisites

Install runtimes that match the languages in the task catalog:

| Runtime | Minimum Version | Purpose |
|---------|-----------------|---------|
| Python  | 3.11+           | FastAPI backend & harness
| Node.js | 18+             | JavaScript/HTML tasks & GUI tooling
| Go      | 1.21+           | Go tasks (`go test`)
| Rust    | 1.74+           | Rust tasks (`cargo test`)
| C++     | C++20 toolchain | C++ tasks (`g++` + `pthread`)
| SQLite  | bundled         | Run history storage

Python dependencies:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r harness/requirements.txt -r server/requirements.txt
```

Node dependencies are task-scoped: most JavaScript/HTML tasks are CLI-only and run with plain Node.js.

---
## Environment Configuration

Sensitive values live in a `.env` file (loaded automatically by both the server and harness). Populate the template:

```bash
cp .env.example .env
# then edit .env
OPENROUTER_API_KEY=sk-or-...
DEFAULT_MODEL=openrouter/google/gemini-pro
DEFAULT_TEMPERATURE=0.0
```

Environment variables present in the shell always take precedence over `.env` values.

---
## Launching the Benchmark Dashboard

### Quickstart scripts

Use the helper scripts to create/activate `.venv`, install the pinned dependencies (with hash verification), start `uvicorn`, and open the UI in your browser:

```bash
./scripts/devserver.sh
```

This serves the main dashboard at `http://127.0.0.1:8000/ui/index.html`.

For the QA dashboard (loads `OPENROUTER_API_KEY` from your shell or `.env` and supports custom host/port):

```bash
./scripts/devserver_qa.sh
```

Optional environment variables:

- `DEVSERVER_NO_REFRESH=1` (don’t auto-open the browser)
- `DEVSERVER_HOST` / `DEVSERVER_PORT` (QA script only; defaults to `127.0.0.1:8000`, and auto-selects `8001-8100` if `8000` is busy)

1. **Start the FastAPI server**
   ```bash
   uvicorn server.api:app --reload
   ```
   The app mounts static assets at `/ui` and exposes run history at `/runs`.

2. **Open the UI**
   Visit `http://127.0.0.1:8000/ui/index.html` in your browser. The neon dashboard provides:
   - **Launch Run**: configure models, tasks, sample count, and behavioral flags.
   - **Latest Run Results**: live-updating status table with PASS/FAIL chips.
   - **Leaderboard**: best-accuracy runs per model with aligned cost/duration.
   - **Recent Runs**: history of previous runs (links to detailed views).

3. **Run Detail View**
   Clicking a Run ID opens `run.html`, a two-column experience showing all attempts on the left and a detailed metrics/log explorer on the right. Logs are streamed from the `/artifacts/<run_id>/<attempt_dir>/...` endpoint.

---
## Running the Harness from the CLI

The harness lets you execute tasks against one or more models directly from the terminal.

```bash
# Dry run (no model call, just prompt generation)
python3 harness/run_harness.py --task python_expert_workflow_scheduler --dry-run

# Evaluate a single task against an OpenRouter model
python3 harness/run_harness.py \
  --task python_expert_workflow_scheduler \
  --models openrouter/google/gemini-pro \
  --include-tests \
  --install-deps

# Run multiple models across the entire catalog with two samples each
python3 harness/run_harness.py \
  --tasks all \
  --models openrouter/google/gemini-pro openrouter/anthropic/claude-3 \
  --samples 2 \
  --temperature 0.2
```

Notable CLI flags:
- `--response-file` / `--response-text`: replay stored responses offline.
- `--output-dir`: change artifact location (default `runs/`).
- `--install-deps`: install `requirements.txt` inside each sandbox (requires network access).

Harness progress is streamed to the dashboard automatically via WebSocket once you start a run.

---
## Inspecting Runs & Artifacts

Each run writes a directory under `runs/`:

```
runs/
├── history.db                  # SQLite DB backing the leaderboard & recent runs
├── latest_summary.json         # Shortcut to the most recent run
├── rust_feature_chunk_iter_latest.json
├── run_YYYYMMDDThhmmssZ_xxxxx/ # Per-run artifact bundle
│   ├── summary.json            # Aggregate metrics, attempts, token counts
│   ├── <task>__<model>__sample00/
│   │   ├── prompt.txt
│   │   ├── response.txt
│   │   ├── patch.diff
│   │   ├── stdout.log
│   │   └── stderr.log
```

Artifacts are also available over HTTP at `/artifacts/<run>/<attempt_file>`—the run-detail UI consumes the same endpoint for inline log viewers.

---
## Task Catalog Overview

The catalog now contains **31** tasks spanning six languages:

| Language    | Count | Examples |
|-------------|-------|----------|
| Python (9)  | python_expert_workflow_scheduler, python_expert_time_series_interpolator, python_tool_weather_cli |
| JavaScript (6) | javascript_expert_promise_pool, javascript_expert_markdown_toc, javascript_feature_cli_todo |
| Go (6)      | go_expert_token_bucket, go_expert_lru_cache, go_feature_wordcount |
| Rust (6)    | rust_expert_lru_cache, rust_expert_time_bucketer, rust_expert_async_rate_limiter |
| C++ (2)     | cpp_expert_thread_pool, cpp_expert_sparse_matrix |
| HTML (2)    | html_expert_form_validator, html_expert_heatmap_renderer |

Each task resides in `tasks/<task_id>/` and provides:
- `metadata.json` – evaluation command, tags, difficulty, runtime limits.
- `instructions.md` – scenario description and success criteria.
- `workspace/` – starter code (often intentionally incomplete or buggy).
- `tests/` – reference tests or harnesses used to judge success.

New expert tasks ship with scaffolding that intentionally raises `NotImplementedError`/`panic`/`throw new Error`. Implementations are left to benchmark participants.

---
## Per-Language Testing Notes

Spot-check tasks by invoking their local test harnesses:

```bash
# Python
cd tasks/python_expert_workflow_scheduler && pytest -q

# Go (cache build artifacts locally for sandboxed environments)
cd tasks/go_expert_token_bucket/workspace && GOCACHE=$(pwd)/.gocache go test ./...

# JavaScript / HTML
cd tasks/javascript_expert_promise_pool && node tests/run-tests.js
cd tasks/html_expert_heatmap_renderer && node tests/run-tests.js

# Rust
cd tasks/rust_expert_lru_cache/workspace && cargo test

# C++
cd tasks/cpp_expert_sparse_matrix && tests/run-tests.sh
```

Most tasks fail today because the reference solution is intentionally missing. The goal is to benchmark how well models can complete or repair them.

---
## Frontend Development Tips

- Static assets are served from `/ui`. Update `gui/style.css`, `gui/main.js`, and `gui/run.js` to tweak visuals or behavior.
- The neon theme uses CSS variables defined at the top of `style.css`. Animations (`@keyframes nebulaShift` & `fadeSlide`) give the dashboard a futuristic look.
- Run detail cards fetch run summaries from `/runs/<run_id>` and attempt logs from `/artifacts/...`—handy for building custom visualizations.
- The leaderboard fetch now aligns cost/duration with the best-accuracy attempt via the database CTE in `database.py`.

---
## Troubleshooting

| Symptom | Resolution |
|---------|------------|
| **Dashboard shows blank or outdated styles** | Force refresh (`Ctrl/Cmd+Shift+R`). Assets are cached aggressively by browsers. |
| **API key missing errors** | Ensure `.env` exists with `OPENROUTER_API_KEY`. The server and harness both load it automatically on startup. |
| **Go builds fail under sandbox** | Set a writable Go build cache: `GOCACHE=$(pwd)/.gocache go test ./...`. |
| **Harness run crashes on dependency install** | Use `--install-deps` only when sandboxing allows network access, or pre-install dependencies manually. |
| **Task tests import errors** | Most test suites expect their `workspace/` folder on `sys.path`/`NODE_PATH`. The provided tests already inject paths; mimic that pattern when adding new tasks. |

---
Happy benchmarking! Feel free to extend the catalog, customize the dashboard, or integrate the harness into larger evaluation pipelines.



---

## 💡 This Fork: Windows 11 & llama-server Optimization & Other

このリポジトリは [TechNavii/LLM_code_benchmark](https://github.com/TechNavii/LLM_code_benchmark) の実験的な個人用フォークです。主な目的は、Windows環境での動作と推論バックエンドの拡張他です。
This is a personal fork of [TechNavii/LLM_code_benchmark](https://github.com/TechNavii/LLM_code_benchmark), focused on **Windows 11 native optimization** and backend expansion.

素晴らしい基盤を公開されている TechNavii様 に深く感謝いたします。
Special thanks to TechNavii for this great project.

### ⚠️ 注意事項 (Important Notes)
1. **本家への配慮 (Contact Policy)**:
   - このフォーク独自の変更内容（Windows対応や独自UIなど）について、**本家リポジトリの作者様へ問い合わせることはご遠慮ください。**
   - **DO NOT** contact the original author regarding any issues or changes specific to this fork.
2. **互換性 (Compatibility)**:
   - 本家との互換性は最大限維持していますが、機能拡張のために一部で**破壊的な変更**を含む場合があります。
   - While maintaining compatibility is a priority, this fork may contain breaking changes to accommodate new features.
3. **免責事項 (No Warranty)**:
   - 本リポジトリの変更内容は [MIT License](https://mit-license.org/)のもとで提供されます。それ以外の箇所については元リポジトリの規約に従います。
   - Modifications in this repository are licensed under the [MIT License](https://mit-license.org/). Other parts follow the original project's terms.
   - 個人の実験的プロジェクトにつき、本ソフトウェアの使用に関して作者は一切の責任を負いません。また、サポートや問い合わせへの対応義務も負いかねます
   - This is an experimental personal project provided "as is." The author is not responsible for any issues arising from its use and is under no obligation to provide support.

### 🚀 主な追加・変更点 (Key Improvements)
* **Windows 11 (Non-WSL) Support**
    * Windowsネイティブ環境での動作を実験的に追加しました。
    * *Note: 当方の個人環境でのみ動作確認済みです。*
    * Added experimental support for Windows native environments (non-WSL).
    * *Note: Verified only in my personal environment.*

* **llama-server Integration**
    * 推論バックエンドとして `llama-server` を利用できるよう調整しました（実験的実装）。
    * *Note: 環境変数 `LMSTUDIO_BASE_URL` を変更することで、LM Studioとの比較・使い分けが可能です。*
    * Integrated `llama-server` as an experimental inference backend.
    * *Note: Switch between LM Studio and llama-server by modifying the `LMSTUDIO_BASE_URL` environment variable.*

* **Custom UI & Design**
    * `gui/index.html` を中心に、視認性向上のためのデザイン調整を行いました。
    * *Note: 現在は **Code Tasks** のみに最適化されており、QA Task は未対応です。*
    * Enhanced UI/UX and design tweaks for the dashboard.
    * *Note: Currently optimized for **Code Tasks** only; QA Tasks are not yet supported.*

## 📅 今後のロードマップ (Roadmap)
* **Manual Evaluation for Japanese NLP Tasks**
    * 既存の自動評価（Code Taskのdiff評価、QA TaskのJudge Model評価）に加え、日本語NLPタスクにおいてユーザー自身が回答を直接評価・採点できる**手動評価モード**の追加を検討しています。
    * Planned addition of a **Manual Evaluation Mode** for Japanese NLP tasks, complementing the existing automated evaluations (diff-based for Code Tasks and Judge Model-based for QA Tasks).

* **Web-based Task Creation Tool**
    * 必要な内容を画面から入力するだけで、新規タスクの構成ファイル生成からシステムへの自動登録までを完結させる機能を検討しています。
    * Planned development of a web-based tool to easily create, configure, and instantly register new tasks via a simple UI.

### 🛠 Tips for Windows Users
* **UI Refresh**: 変更が反映されない場合は、ブラウザで `Ctrl + F5`（キャッシュクリア）を試してください。
* If UI updates aren't visible, please use `Ctrl + F5` to bypass the browser cache.

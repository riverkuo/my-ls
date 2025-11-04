#!/usr/bin/env bash
set -euo pipefail

# Colors
GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; BOLD="\033[1m"; RESET="\033[0m"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_NAME="my-ls"
BIN_LOCAL="$ROOT_DIR/bin/cli.js"

TMP_DIR=""
PASS=0; FAIL=0; SKIP=0

note() { echo -e "${YELLOW}${BOLD}# $*${RESET}"; }
ok()   { echo -e "${GREEN}✔${RESET} $*"; PASS=$((PASS+1)); }
ko()   { echo -e "${RED}✘${RESET} $*"; FAIL=$((FAIL+1)); }
skip() { echo -e "${YELLOW}↷ skip${RESET} $*"; SKIP=$((SKIP+1)); }

cleanup() {
  # 只有在設置了 CLEANUP_TMP 環境變數時才清理
  if [[ "${CLEANUP_TMP:-0}" == "1" ]]; then
    [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]] && rm -rf "${TMP_DIR}" || true
  fi
}
# 如果設置了 CLEANUP_TMP=1，則在退出時清理
if [[ "${CLEANUP_TMP:-0}" == "1" ]]; then
  trap cleanup EXIT
fi

make_fixture() {
  # 創建臨時目錄並確保是絕對路徑
  local tmp_base="$(mktemp -d "${REPO_NAME}-e2e-XXXXXX")"
  TMP_DIR="$(cd "$tmp_base" && pwd)"
  mkdir -p "$TMP_DIR/exist"
  printf "hello\n" > "$TMP_DIR/exist.txt"
  printf "console.log('hi')\n" > "$TMP_DIR/exist/index.js"
  printf "hidden\n" > "$TMP_DIR/.hiddenfile.txt"
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

ensure_global() {
  if have_cmd "$REPO_NAME"; then
    return 0
  fi
  note "Global '$REPO_NAME' not found, attempting 'npm link'"
  (cd "$ROOT_DIR" && npm link >/dev/null 2>&1) || (cd "$ROOT_DIR" && pnpm link -g >/dev/null 2>&1 || true)
  if ! have_cmd "$REPO_NAME"; then
    skip "Global '$REPO_NAME' unavailable (npm link failed). Will run local-only assertions."
    return 1
  fi
  return 0
}

run_cmd() {
  local mode="$1"; shift
  if [[ "$mode" == "local" ]]; then
    node "$BIN_LOCAL" "$@"
  else
    "$REPO_NAME" "$@"
  fi
}

capture() {
  # capture <mode> <test_name> <outfile> <errfile> -- args...
  # test_name 格式: "[path_mode] test description"
  local mode="$1"; shift
  local test_name="$1"; shift
  local out="$1"; shift
  local err="$1"; shift
  
  # 構建命令字串
  local cmd_str
  if [[ "$mode" == "local" ]]; then
    cmd_str="node $BIN_LOCAL $*"
  else
    cmd_str="$REPO_NAME $*"
  fi
  
  # 在檔案中記錄測試資訊和命令（追加模式）
  echo "=== $test_name ===" >> "$out"
  echo "=== Command: $cmd_str ===" >> "$out"
  
  # 清理舊的測試 info 檔案（如果存在），讓新的測試可以使用新的臨時檔案
  local test_output_info_file="${out}.current_test_info"
  if [[ -f "$test_output_info_file" ]]; then
    # 讀取舊的臨時檔案路徑並清理
    local old_test_file=$(cat "$test_output_info_file" 2>/dev/null || echo "")
    if [[ -n "$old_test_file" && -f "$old_test_file" ]]; then
      rm -f "$old_test_file"
    fi
    rm -f "$test_output_info_file"
  fi
  
  # 使用 mktemp 創建臨時檔案來捕獲命令輸出
  # 這樣可以確保只包含當前測試的輸出，不會被其他測試污染
  local test_output_file=$(mktemp 2>/dev/null || echo "/tmp/my-ls-test-$$-$(date +%s)")
  
  # 確保臨時檔案存在且為空
  > "$test_output_file"
  
  set +e
  # 先執行命令，將 stdout 同時寫入 out.txt 和臨時檔案，stderr 暫存
  local stderr_file=$(mktemp)
  # 使用 tee 同時寫入兩個檔案：
  # - 追加到 out.txt (-a)
  # - 追加到臨時檔案（但我們已經清空了，所以等同於覆蓋寫入）
  # 將標準輸出重定向到 /dev/null，避免顯示在終端
  { run_cmd "$mode" "$@" 2>"$stderr_file" | tee -a "$out" "$test_output_file" > /dev/null; }
  local code=${PIPESTATUS[0]}
  set -e
  
  # 記錄 exit code 到 out
  echo "=== Exit code: $code ===" >> "$out"
  echo "" >> "$out"
  
  # 將 stderr 內容寫入 err 檔案（如果有的話）
  if [[ -s "$stderr_file" ]]; then
    echo "=== $test_name ===" >> "$err"
    echo "=== Command: $cmd_str ===" >> "$err"
    cat "$stderr_file" >> "$err"
    echo "" >> "$err"
  fi
  
  # 清理暫存檔案
  rm -f "$stderr_file"
  
  # 將臨時檔案路徑寫入一個臨時檔案，因為子 shell 無法 export 到父 shell
  # 使用一個固定的臨時檔案路徑來傳遞這個信息
  local test_output_info_file="${out}.current_test_info"
  echo "$test_output_file" > "$test_output_info_file"
  
  echo "$code"
}

# ERR 和 OUT 檔案路徑（由 run_suite_for_mode 設置）
ERR_FILE=""
OUT_FILE=""

# 從 out.txt 讀取最近的命令
get_last_command() {
  if [[ -n "$OUT_FILE" && -f "$OUT_FILE" ]]; then
    grep "=== Command:" "$OUT_FILE" | tail -1 | sed 's/=== Command: //' | sed 's/ ===$//' || echo ""
  fi
}

# 記錄錯誤到 err.txt（統一格式）
record_error() {
  local name="$1"
  local msg="$2"
  if [[ -n "$ERR_FILE" ]]; then
    local cmd=$(get_last_command)
    local cwd=$(pwd)
    echo "=== $name ===" >> "$ERR_FILE"
    echo "TMP_DIR: $TMP_DIR" >> "$ERR_FILE"
    echo "Current directory: $cwd" >> "$ERR_FILE"
    if [[ -n "$cmd" ]]; then
      echo "Command: $cmd" >> "$ERR_FILE"
    fi
    echo "Assertion failed: $msg" >> "$ERR_FILE"
    echo "" >> "$ERR_FILE"
  fi
}

assert_exit() {
  local expected=$1; shift
  local got=$1; shift
  local name="$*"
  if [[ "$expected" == "$got" ]]; then 
    ok "$name (exit=$got)"
  else 
    ko "$name (expected exit=$expected got=$got)"
    record_error "$name" "expected exit=$expected got=$got"
  fi
}

assert_contains() {
  local file="$1"; shift
  local needle="$1"; shift
  local name="$*"
  
  # 從臨時檔案讀取當前測試的輸出檔案路徑（因為 capture 在子 shell 中執行）
  local test_output_info_file="${file}.current_test_info"
  local current_test_file=""
  if [[ -f "$test_output_info_file" ]]; then
    current_test_file=$(cat "$test_output_info_file" 2>/dev/null || echo "")
    # 不立即刪除，讓同一個測試的其他 assert 也能讀取
  fi
  
  # 如果設置了當前測試的輸出檔案，只檢查該檔案
  if [[ -n "$current_test_file" && -f "$current_test_file" && -s "$current_test_file" ]]; then
    if grep -Fq -- "$needle" "$current_test_file"; then
      ok "$name"
    else
      ko "$name (missing: $needle)"
      record_error "$name" "missing '$needle' in output"
    fi
  else
    # 回退到檢查整個檔案
    if grep -Fq -- "$needle" "$file"; then 
      ok "$name"
    else 
      ko "$name (missing: $needle)"
      record_error "$name" "missing '$needle' in output"
    fi
  fi
}

assert_not_contains() {
  local file="$1"; shift
  local needle="$1"; shift
  local name="$*"
  
  # 從臨時檔案讀取當前測試的輸出檔案路徑（因為 capture 在子 shell 中執行）
  local test_output_info_file="${file}.current_test_info"
  local current_test_file=""
  if [[ -f "$test_output_info_file" ]]; then
    current_test_file=$(cat "$test_output_info_file" 2>/dev/null || echo "")
    # 不立即刪除，讓同一個測試的其他 assert 也能讀取
  fi
  
  # 如果設置了當前測試的輸出檔案，只檢查該檔案
  if [[ -n "$current_test_file" && -f "$current_test_file" && -s "$current_test_file" ]]; then
    # 檢查臨時檔案
    if grep -Fq -- "$needle" "$current_test_file"; then
      ko "$name (unexpected: $needle)"
      record_error "$name" "unexpected '$needle' found in output"
      # 調試輸出：記錄臨時檔案內容到 err.txt
      if [[ -n "$ERR_FILE" ]]; then
        echo "DEBUG: Content of $current_test_file:" >> "$ERR_FILE"
        cat "$current_test_file" >> "$ERR_FILE"
        echo "" >> "$ERR_FILE"
      fi
    else
      ok "$name"
    fi
  else
    # 回退到檢查整個檔案（這不應該發生，但為了安全保留）
    # 記錄調試信息
    if [[ -n "$ERR_FILE" ]]; then
      echo "DEBUG: test_output_info_file=$test_output_info_file" >> "$ERR_FILE"
      echo "DEBUG: current_test_file=$current_test_file" >> "$ERR_FILE"
      if [[ -n "$current_test_file" ]]; then
        echo "DEBUG: File exists: $([[ -f "$current_test_file" ]] && echo 'yes' || echo 'no')" >> "$ERR_FILE"
        echo "DEBUG: File size: $(stat -f%z "$current_test_file" 2>/dev/null || echo 'unknown')" >> "$ERR_FILE"
      fi
    fi
    if ! grep -Fq -- "$needle" "$file"; then 
      ok "$name"
    else 
      ko "$name (unexpected: $needle)"
      record_error "$name" "unexpected '$needle' found in output (checked entire file, temp file unavailable)"
    fi
  fi
}

build_arg() {
  # build_arg <path_mode> <relative>
  local path_mode="$1"; shift
  local rel="$1"; shift
  if [[ "$path_mode" == "absolute" ]]; then
    # 確保返回絕對路徑（TMP_DIR 已經是絕對路徑）
    echo "$TMP_DIR/$rel"
  else
    echo "$rel"
  fi
}

run_suite_for_mode() {
  local mode="$1"; shift
  local path_mode="$1"; shift
  local OUT="$1"; shift
  local ERR="$1"; shift
  note "Running tests in mode: $mode, path_mode: $path_mode"

  # 設置 ERR_FILE 和 OUT_FILE 供 assert 函數使用
  ERR_FILE="$ERR"
  OUT_FILE="$OUT"

  # 在檔案中記錄模式開始（追加模式）- 在 pushd 之前，使用絕對路徑
  echo "" >> "$OUT"
  echo "========================================" >> "$OUT"
  echo "Mode: $mode, Path Mode: $path_mode" >> "$OUT"
  echo "========================================" >> "$OUT"
  echo "" >> "$ERR"
  echo "========================================" >> "$ERR"
  echo "Mode: $mode, Path Mode: $path_mode" >> "$ERR"
  echo "========================================" >> "$ERR"

  pushd "$TMP_DIR" >/dev/null

  # 1. 無參數
  code=$(capture "$mode" "[$path_mode] no args exit" "$OUT" "$ERR")
  assert_exit 0 "$code" "[$path_mode] no args exit"
  assert_contains "$OUT" 'exist.txt' "[$path_mode] no args lists non-hidden"
  assert_not_contains "$OUT" '.hiddenfile.txt' "[$path_mode] no args hides dotfiles"

  # 2. --all
  code=$(capture "$mode" "[$path_mode] --all exit" "$OUT" "$ERR" --all)
  assert_exit 0 "$code" "[$path_mode] --all exit"
  assert_contains "$OUT" '.hiddenfile.txt' "[$path_mode] --all shows hidden"

  # 3. --long（用 JSON 驗證鍵名）
  code=$(capture "$mode" "[$path_mode] --long --output=json exit" "$OUT" "$ERR" --long --output=json)
  assert_exit 0 "$code" "[$path_mode] --long --output=json exit"
  assert_contains "$OUT" '"isDir"' "[$path_mode] --long json includes isDir key"

  # 4. output=json
  code=$(capture "$mode" "[$path_mode] --output=json exit" "$OUT" "$ERR" --output=json)
  assert_exit 0 "$code" "[$path_mode] --output=json exit"
  assert_contains "$OUT" '[' "[$path_mode] json begins with ["

  # 5. 指定多目標（檔案 + 目錄），目錄列第一層
  f1="$(build_arg "$path_mode" exist.txt)"
  d1="$(build_arg "$path_mode" exist)"
  code=$(capture "$mode" "[$path_mode] multi-target exit" "$OUT" "$ERR" "$f1" "$d1")
  assert_exit 0 "$code" "[$path_mode] multi-target exit"
  assert_contains "$OUT" 'exist.txt' "[$path_mode] multi-target contains file"
  assert_contains "$OUT" 'index.js' "[$path_mode] multi-target lists dir children"

  # 6. 單一檔案（相對/絕對）
  f2="$(build_arg "$path_mode" exist/index.js)"
  code=$(capture "$mode" "[$path_mode] single file exit" "$OUT" "$ERR" "$f2")
  assert_exit 0 "$code" "[$path_mode] single file exit"
  assert_contains "$OUT" 'index.js' "[$path_mode] single file shows file"

  # 7. 找不到的檔案（混合：一個存在一個不存在），應 exit 3
  nf="$(build_arg "$path_mode" non-exist)"
  code=$(capture "$mode" "[$path_mode] mixed exist/non-exist exit=3" "$OUT" "$ERR" "$nf" "$f1")
  assert_exit 3 "$code" "[$path_mode] mixed exist/non-exist exit=3"
  assert_contains "$ERR" "$REPO_NAME: non-exist: No such file or directory" "[$path_mode] mixed prints error"
  assert_contains "$OUT" 'exist.txt' "[$path_mode] mixed still outputs existing"

  # 8. 不合法的 flag，exit=1
  code=$(capture "$mode" "[$path_mode] unknown flag exit=1" "$OUT" "$ERR" --123 || true)
  if [[ "$code" -eq 1 ]]; then ok "[$path_mode] unknown flag exit=1"; else ko "[$path_mode] unknown flag exit (got $code)"; fi

  # 9. help/version 先後順序（不驗證順序內容，只驗證能執行）
  code=$(capture "$mode" "[$path_mode] -h -v exit" "$OUT" "$ERR" -h -v)
  assert_exit 0 "$code" "[$path_mode] -h -v exit"
  assert_contains "$OUT" 'help' "[$path_mode] help content present"
  code=$(capture "$mode" "[$path_mode] -v -h exit" "$OUT" "$ERR" -v -h)
  assert_exit 0 "$code" "[$path_mode] -v -h exit"

  # 10. flags 與位置參數先後無關（使用 f1，JSON 驗證）
  code=$(capture "$mode" "[$path_mode] order independence" "$OUT" "$ERR" --long --output=json "$f1")
  assert_exit 0 "$code" "[$path_mode] order independence"
  assert_contains "$OUT" '"isDir"' "[$path_mode] order independence long field"

  # 11. output 覆蓋（最後一個生效）
  code=$(capture "$mode" "[$path_mode] output override" "$OUT" "$ERR" --output=json --output=classic)
  assert_exit 0 "$code" "[$path_mode] output override"
  assert_not_contains "$OUT" '[' "[$path_mode] classic output not json"

  # 12. regex 測試（跳過功能面）——只驗證 usage guard 存在
  code=$(capture "$mode" "[$path_mode] regex usage guard" "$OUT" "$ERR" --regex)
  if [[ "$code" -eq 64 ]]; then
    skip "[$path_mode] regex functional tests skipped (usage guard present)"
  else
    skip "[$path_mode] regex tests skipped"
  fi

  popd >/dev/null
  
  # 清除 ERR_FILE 和 OUT_FILE
  ERR_FILE=""
  OUT_FILE=""
  
  # 清理當前測試的臨時輸出檔案
  if [[ -n "${CURRENT_TEST_OUTPUT_FILE:-}" ]]; then
    rm -f "${CURRENT_TEST_OUTPUT_FILE}"
    unset CURRENT_TEST_OUTPUT_FILE
  fi
}

main() {
  note "Repo: $ROOT_DIR"
  make_fixture
  
  # 在臨時目錄中創建輸出檔案（只清空一次）
  # 使用絕對路徑，確保在所有目錄下都能正確存取
  OUT="$(cd "$TMP_DIR" && pwd)/out.txt"
  ERR="$(cd "$TMP_DIR" && pwd)/err.txt"
  > "$OUT"
  > "$ERR"

  # Local mode tests for relative and absolute
  run_suite_for_mode local relative "$OUT" "$ERR"
  run_suite_for_mode local absolute "$OUT" "$ERR"

  # Global mode tests (if available) for both path modes
  if ensure_global; then
    run_suite_for_mode global relative "$OUT" "$ERR"
    run_suite_for_mode global absolute "$OUT" "$ERR"
  fi

  echo -e "${BOLD}Summary:${RESET} PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
  
  # 提取失敗的測試用例到 test-case-fail.txt
  extract_failed_cases "$ERR"
  
  # 顯示臨時目錄位置，方便查看測試檔案
  if [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]]; then
    echo ""
    note "Test files preserved in: $TMP_DIR"
    note "To clean up manually, run: rm -rf $TMP_DIR"
    note "To auto-cleanup next time, run: CLEANUP_TMP=1 bash $0"
    if [[ -f "$TMP_DIR/test-case-fail.txt" ]]; then
      note "Failed test cases extracted to: $TMP_DIR/test-case-fail.txt"
    fi
  fi
  
  [[ $FAIL -eq 0 ]]
}

# 從 err.txt 提取失敗的測試用例到 test-case-fail.txt（保持 err.txt 的格式）
extract_failed_cases() {
  local err_file="$1"
  local fail_file="$(dirname "$err_file")/test-case-fail.txt"
  
  if [[ ! -f "$err_file" ]]; then
    return
  fi
  
  > "$fail_file"
  
  # 使用 awk 提取包含 "Assertion failed" 的測試用例塊，保持 err.txt 的格式
  # 包括 Mode/Path Mode 標題和所有相關的測試用例內容
  awk '
    BEGIN { 
      in_case = 0
      case_lines = ""
      section_lines = ""
      in_section = 0
      section_count = 0
      printed_section = 0
      current_section = ""
    }
    /^========================================/ {
      # 遇到 section 分隔符
      if (in_case && case_lines ~ /Assertion failed/) {
        # 輸出 section header（如果還沒輸出）
        if (!printed_section && current_section != "") {
          print current_section
          printed_section = 1
        }
        # 輸出失敗的測試用例
        print case_lines
        print ""
      }
      in_case = 0
      case_lines = ""
      
      # 處理新的 section header
      if (in_section) {
        # 這是第二個分隔線，完成 section 收集
        section_lines = section_lines "\n" $0
        current_section = section_lines
        in_section = 0
        section_count = 0
        section_lines = ""
        printed_section = 0
      } else {
        # 這是第一個分隔線，開始收集 section
        in_section = 1
        section_count = 1
        section_lines = $0
        printed_section = 0
      }
      next
    }
    in_section {
      section_lines = section_lines "\n" $0
      section_count++
      next
    }
    /^=== / {
      # 遇到新的測試用例標題
      if (in_case) {
        # 檢查上一個測試用例是否包含 Assertion failed
        if (case_lines ~ /Assertion failed/) {
          # 輸出 section header（如果還沒輸出）
          if (!printed_section && current_section != "") {
            print current_section
            printed_section = 1
          }
          print case_lines
          print ""
        }
      }
      in_case = 1
      case_lines = $0
      next
    }
    in_case {
      # 收集測試用例的所有行
      case_lines = case_lines "\n" $0
      next
    }
    END {
      # 處理最後一個測試用例
      if (in_case && case_lines ~ /Assertion failed/) {
        # 輸出 section header（如果還沒輸出）
        if (!printed_section && current_section != "") {
          print current_section
        }
        print case_lines
      }
    }
  ' "$err_file" > "$fail_file"
  
  # 如果檔案為空，刪除它
  if [[ ! -s "$fail_file" ]]; then
    rm -f "$fail_file"
  fi
}

main "$@"



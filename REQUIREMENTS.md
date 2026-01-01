# 要件定義書：画像生成状態の永続化機能

**バージョン**: v1.0.29
**作成日**: 2025-01-02
**対象システム**: Smartphone Banana PWA

---

## 1. 機能概要

画像生成中にユーザーがアプリを閉じた場合でも、次回起動時に自動的に生成結果を取得・表示する機能。

### 1.1 背景

スマートフォンでは以下のような状況が頻繁に発生する：
- 画像生成中に他のアプリを使用するため画面を閉じる
- バッテリー節約のため自動的にスリープモードになる
- ブラウザがバックグラウンドでメモリ解放される

これらの状況でJavaScriptの実行が停止し、ポーリング処理が中断されるため、生成完了した画像を取得できない問題があった。

### 1.2 目的

ユーザー体験を向上させるため、以下を実現する：
- 画像生成の中断からの自動復旧
- ユーザーの明示的な操作を不要にする（シームレスな復元）
- 生成済み画像の重複表示を防止する

---

## 2. ユーザー要件

### 2.1 基本要件

| ID | 要件 | 優先度 |
|----|------|--------|
| UR-001 | アプリ起動時、中断された画像生成を自動的に検知する | 必須 |
| UR-002 | 生成中の場合、ポーリングを自動的に再開する | 必須 |
| UR-003 | 生成完了済みの場合、結果を自動的に表示する | 必須 |
| UR-004 | 既に表示済みの画像は再表示しない | 必須 |
| UR-005 | 失敗した生成については、エラーメッセージを表示する | 必須 |

### 2.2 動作仕様

#### 2.2.1 起動時の挙動
- **通知なし**: ユーザーに確認ダイアログを表示せず、自動的に復元を実行
- **サイレント実行**: バックグラウンドで処理を行い、完了時のみステータスメッセージを表示

#### 2.2.2 複数リクエストの扱い
- **最新のみ復元**: 複数の生成リクエストがある場合、最新のもののみを対象とする
- **上書き方式**: 新しい生成を開始すると、古い状態は自動的に上書きされる

#### 2.2.3 失敗時の挙動
- **エラー表示**: 生成失敗時は、ユーザーにエラーメッセージを表示
- **再試行可能期間**: 失敗後5分間は状態を保持し、ユーザーが手動で再試行できる
- **自動削除**: 5分経過後、失敗した状態を自動削除

---

## 3. 技術要件

### 3.1 データ構造

#### 3.1.1 localStorage キー
- **キー名**: `generation_state`
- **既存キーとの競合**: なし（独立したキーを使用）

#### 3.1.2 データスキーマ

```javascript
{
  requestId: string,           // FAL API リクエストID
  statusUrl: string,           // ステータス確認用URL
  resultUrl: string,           // 結果取得用URL
  timestamp: number,           // 保存時刻（UnixタイムスタンプMs）
  status: string,              // "pending" | "polling" | "completed" | "failed"
  displayedToUser: boolean,    // ユーザーへの表示済みフラグ
  prompt: string,              // 使用したプロンプトテキスト
  referenceImages: Array<{     // 参照画像の配列
    dataUrl: string,           // Base64エンコードされた画像データ
    fileName: string           // ファイル名
  }>,
  params: {                    // 生成パラメータ
    num_images: number,        // 生成枚数（1-4）
    aspect_ratio: string,      // アスペクト比
    resolution: string,        // 解像度
    output_format: string      // 出力フォーマット
  },
  useEditMode: boolean         // Edit mode使用フラグ
}
```

#### 3.1.3 displayedToUserフラグの役割

| 値 | 意味 | 次回起動時の動作 |
|----|------|-----------------|
| `false` | 画像生成完了したがユーザーに未表示 | サーバーまたはlocalStorageから取得して表示 |
| `true` | 既にユーザーに表示済み | 何もしない（最適化） |

**重要**: このフラグにより、通常の利用フロー（生成→表示→アプリ終了→再起動）で無駄なサーバーアクセスを防止する。

### 3.2 状態遷移

```
[初期状態: 状態なし]
    ↓
[リクエスト送信] → status="polling", displayedToUser=false で保存
    ↓
[ポーリング中]
    ├─ 完了 → status="completed" に更新
    │         displayResults()で displayedToUser=true に更新
    │
    ├─ 失敗 → status="failed" に更新
    │         5分後に状態削除
    │
    └─ 中断 → 状態保持（次回起動時に再開）
```

### 3.3 有効期限

| 条件 | 有効期限 | 削除タイミング |
|------|---------|--------------|
| 通常の状態 | 24時間 | loadGenerationState()実行時 |
| 失敗した状態 | 5分 | タイマーによる遅延削除 |
| 表示済みの状態 | 即時 | checkAndResumeGeneration()実行時 |

---

## 4. システム設計

### 4.1 新規追加関数（6個）

#### 4.1.1 saveGenerationState()
```javascript
function saveGenerationState(requestId, statusUrl, resultUrl, params, useEditMode)
```
- **目的**: リクエスト送信時に状態をlocalStorageに保存
- **呼び出し元**: `callFalAPI()` （リクエスト送信成功後）
- **初期値**: `displayedToUser = false`

#### 4.1.2 loadGenerationState()
```javascript
function loadGenerationState() → Object | null
```
- **目的**: 保存された状態を読み込み
- **処理**:
  - 24時間以上経過 → 自動削除してnull返却
  - JSON parse失敗 → null返却
  - 正常時 → 状態オブジェクト返却

#### 4.1.3 clearGenerationState()
```javascript
function clearGenerationState()
```
- **目的**: 状態を削除
- **呼び出しタイミング**:
  - 表示済みの状態を検出時
  - 24時間以上経過時
  - 失敗から5分経過時

#### 4.1.4 updateGenerationStatus()
```javascript
function updateGenerationStatus(status)
```
- **目的**: statusフィールドのみを更新（部分更新）
- **呼び出しタイミング**:
  - ポーリングで完了検知時 → "completed"
  - ポーリングで失敗検知時 → "failed"

#### 4.1.5 resumeGenerationPolling()
```javascript
async function resumeGenerationPolling(state)
```
- **目的**: 中断されたポーリングを再開
- **処理**:
  - statusUrlに5秒間隔でポーリング（最大60回）
  - 完了時: resultUrlから画像取得 → displayResults()
  - 失敗時: エラー表示 → 5分後に状態削除

#### 4.1.6 checkAndResumeGeneration()
```javascript
async function checkAndResumeGeneration()
```
- **目的**: アプリ起動時に状態をチェックして適切に処理
- **処理フロー**:
  1. loadGenerationState()で状態取得
  2. 状態なし → 終了
  3. displayedToUser=true → 削除して終了
  4. status="completed" かつ displayedToUser=false → output_imagesから復元して表示
  5. status="pending" または "polling" → resumeGenerationPolling()

### 4.2 既存関数の修正

#### 4.2.1 callFalAPI() - 3箇所
1. **リクエスト送信後**（Line 1593）
   - `saveGenerationState()` を呼び出して状態保存

2. **完了検知時**（Line 1635）
   - `updateGenerationStatus('completed')` で状態更新

3. **失敗検知時**（Line 1681）
   - `updateGenerationStatus('failed')` で状態更新

#### 4.2.2 displayResults() - 1箇所（Lines 1813-1818）
- 関数の最後で `displayedToUser = true` に更新
- これにより「画像を見た後にアプリを閉じる」という通常フローで最適化

#### 4.2.3 DOMContentLoaded - 1箇所（Line 454）
- 初期化処理の最後に `await checkAndResumeGeneration()` を追加
- アプリ起動時の自動復元を実現

---

## 5. 実装フロー

### 5.1 ケース1: 生成中にアプリを閉じた

```
[ユーザー操作]
  画像生成ボタンをクリック
    ↓
[callFalAPI()]
  リクエスト送信 → requestId取得
    ↓
[saveGenerationState()]
  status="polling", displayedToUser=false で保存
    ↓
[ポーリング開始]
  5秒ごとにステータスチェック
    ↓
[ユーザーがアプリを閉じる] ← ★中断
    ↓
[アプリ再起動]
    ↓
[DOMContentLoaded]
  checkAndResumeGeneration() 実行
    ↓
[checkAndResumeGeneration()]
  状態読み込み: status="polling", displayedToUser=false
    ↓
[resumeGenerationPolling()]
  ポーリング再開 → 完了検知
    ↓
[displayResults()]
  画像表示 → displayedToUser=true に更新
```

### 5.2 ケース2: 生成完了直後にアプリを閉じた（最重要ケース）

```
[ポーリング完了]
  status="completed" に更新
    ↓
[displayResults()]
  画像表示 → displayedToUser=true に更新
    ↓
[ユーザーがアプリを閉じる]
    ↓
[アプリ再起動]
    ↓
[checkAndResumeGeneration()]
  状態読み込み: status="completed", displayedToUser=true
    ↓
  displayedToUser=true を検出
    ↓
  状態削除して終了（何もしない）← ★最適化
```

**重要**: このケースが最も頻繁に発生するため、サーバーへの不要なアクセスを防ぐ最適化が重要。

### 5.3 ケース3: 生成完了したが表示前にクラッシュ

```
[ポーリング完了]
  status="completed" に更新
    ↓
[クラッシュ] ← ★displayResults()が呼ばれていない
    ↓
[アプリ再起動]
    ↓
[checkAndResumeGeneration()]
  状態読み込み: status="completed", displayedToUser=false
    ↓
  output_images から画像データ取得
    ↓
[displaySavedOutputImages()]
  画像表示
    ↓
  displayedToUser=true に更新
```

---

## 6. エッジケース対応

### 6.1 エッジケース一覧

| ケース | 検知方法 | 対応 |
|--------|---------|------|
| 24時間以上経過した状態 | timestamp比較 | loadGenerationState()で自動削除 |
| APIキーが無い | localStorage確認 | エラー表示して状態削除 |
| ネットワークエラー | fetch失敗 | エラー表示、状態は5分間保持 |
| 既に表示済み | displayedToUser=true | 何もせず状態削除（最適化） |
| 完了したが未表示 | status="completed", displayedToUser=false | output_imagesから復元 |
| JSON parse エラー | try-catch | null返却して続行 |
| 新規生成開始 | callFalAPI()実行 | 新規状態が古い状態を上書き |
| 同時に複数タブで起動 | 想定外 | 最後に保存した状態が優先される |

### 6.2 エラーハンドリング

#### 6.2.1 APIキー不在
```javascript
if (!apiKey) {
    showStatus('APIキーが見つかりません', 'error');
    clearGenerationState();
    return;
}
```

#### 6.2.2 ネットワークエラー
```javascript
catch (error) {
    showStatus(`再開エラー: ${error.message}`, 'error');
    updateGenerationStatus('failed');
    // 5分間保持して自動削除
    setTimeout(() => clearIfFailed(), 5 * 60 * 1000);
}
```

#### 6.2.3 JSON parseエラー
```javascript
try {
    const state = JSON.parse(stateJson);
    return state;
} catch (e) {
    console.error('Failed to load generation state:', e);
    return null;
}
```

---

## 7. テストシナリオ

### 7.1 機能テスト

| ID | テストケース | 期待結果 |
|----|------------|---------|
| TC-001 | 生成中にアプリを閉じて再起動 | 自動的にポーリング再開し、完了時に画像表示 |
| TC-002 | 画像表示後にアプリを閉じて再起動 | 何もしない（画像は既に表示済み） |
| TC-003 | 生成完了直後にクラッシュして再起動 | output_imagesから画像を復元して表示 |
| TC-004 | 24時間以上経過した状態で起動 | 状態を自動削除して何もしない |
| TC-005 | 失敗した生成で再起動 | エラーメッセージを表示 |
| TC-006 | 失敗から5分後に再起動 | 状態が削除されており、何もしない |
| TC-007 | 新規生成を開始 | 古い状態が新しい状態で上書きされる |

### 7.2 性能テスト

| ID | テストケース | 期待結果 |
|----|------------|---------|
| PT-001 | 起動時の状態チェック時間 | 100ms以内 |
| PT-002 | localStorageの読み書き時間 | 50ms以内 |
| PT-003 | 大きな画像データの復元時間 | 500ms以内 |

### 7.3 セキュリティテスト

| ID | テストケース | 期待結果 |
|----|------------|---------|
| ST-001 | 不正なJSON形式の状態データ | エラーなく処理継続（null返却） |
| ST-002 | 不正なタイムスタンプ | エラーなく処理継続 |
| ST-003 | localStorage容量超過 | エラーハンドリングされる |

---

## 8. 非機能要件

### 8.1 パフォーマンス
- 起動時の状態チェックは100ms以内に完了すること
- ポーリング間隔は5秒（既存実装と同じ）
- 最大ポーリング回数は60回（5分間）

### 8.2 可用性
- ネットワークエラー時も、アプリは正常に起動すること
- localStorage障害時も、アプリの基本機能は動作すること

### 8.3 保守性
- 既存コードへの影響を最小限にすること
- 新規関数は独立性を保ち、テスタブルであること
- ログ出力により、デバッグが容易であること

### 8.4 互換性
- 既存のlocalStorageキー（saved_prompt, reference_images, output_images等）と競合しないこと
- 既存の機能に影響を与えないこと

---

## 9. 制約事項

### 9.1 技術的制約
- localStorageの容量制限（ブラウザにより異なるが、通常5-10MB）
- ブラウザのバックグラウンド動作制限
- Service Workerのライフサイクル

### 9.2 仕様上の制約
- 最新のリクエストのみを復元（複数同時実行は非対応）
- 24時間以上経過した状態は自動削除
- 失敗した生成は5分間のみ保持

### 9.3 運用上の制約
- ユーザーがlocalStorageをクリアした場合、復元不可
- 異なるブラウザ間では状態を共有できない
- プライベートブラウジングモードでは動作が制限される可能性

---

## 10. 今後の拡張案

### 10.1 短期的な改善
- [ ] 複数リクエストの履歴管理（最新のみでなく、複数を保持）
- [ ] プログレスバーの表示（残りポーリング回数の可視化）
- [ ] 手動での再試行ボタン

### 10.2 中長期的な改善
- [ ] IndexedDBへの移行（容量制限の緩和）
- [ ] Service Workerによるバックグラウンド同期
- [ ] Push通知による生成完了の通知
- [ ] 生成履歴の一覧表示機能

---

## 11. 参考資料

### 11.1 関連ドキュメント
- [CLAUDE.md](../CLAUDE.md) - 開発者向けドキュメント
- [README.md](README.md) - ユーザー向けドキュメント
- [Implementation Plan](../.claude/plans/melodic-wandering-blossom.md) - 実装計画書

### 11.2 外部仕様
- [FAL API Documentation](https://fal.ai/models/fal-ai/nano-banana-pro)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)

---

**文書管理**
- 作成者: Keisuke
- 最終更新日: 2025-01-02
- バージョン: 1.0
- ステータス: 承認済み・実装完了

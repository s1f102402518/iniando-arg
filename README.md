# cs4-2025-class3-team2-project
# 大学掲示板型ARG（協力型謎解きWebアプリ）
3人協力型のオンラインARG（Alternate Reality Game）です。  
大学の「学内限定掲示板」という世界観の中で、プレイヤーは同時に同じ掲示板へ参加し、会話・投稿・情報共有を通じて隠された真相にたどり着きます。Discodeなどでのボイスチャットを併用するか、この掲示板上でもリアルタイムに会話することができ、非対面での3人同時プレイを想定しています。

一見すると普通の雑談掲示板ですが、実際には

- 発言傾向
- 同調性
- 思考傾向
- 行動ログ

をもとに利用者を選別するシステムが裏で動いている、という設定になっています。

プレイヤーは最初のページでアカウント登録/ログインをし、グループを作るかグループ名/IDで検索し、参加したいチームを探せます。

各プレイヤーには

- A：評価・推薦側の情報
- B：排除・不適合者側の情報
- C：システム管理仕様側の情報

がそれぞれ異なる形で提示され、共通している投稿と自分しか見られない投稿があることに気づくことで、情報の共有を促し、3人で情報を統合して初めて真実が分かる構造にしました。

また、特定ワードの送信や隠し条件の達成によって

- 誰か一人にしか表示されない裏ページ（a.html / b.html / c.html）
- 最終ページ（lastpage.html）

が段階的に解放される仕組みを実装しました。

最終的には  
「麹町中学校内申書事件」をモチーフにしたテーマへ接続される構成です。

---

## 使用技術

### バックエンド

- Python3
- Django
- Django Channels（WebSocket）
- Daphne
- Redis

### フロントエンド

- HTML
- CSS
- JavaScript

### データベース

- PostgreSQL

### インフラ・デプロイ

- Render（Web Service / PostgreSQL / Redis）
- WhiteNoise（静的ファイル配信）
- Git / GitHub

### その他

- localStorage（裏ページ解放状態の保存）
- WebSocket によるリアルタイム掲示板更新

---

## 動作環境

### ローカル開発環境

- OS：Ubuntu (Linux)
- Python：3.11以上（推奨）
- Django：5.17
- PostgreSQL
- Django Channels
- Render（デプロイ環境）

※ 開発・動作確認はUbuntu環境で行っています。
※ 本番環境は Render 上で運用しています。
※ Windows環境での動作確認は未実施です。


## 実行方法

### 1. リポジトリをクローン

git clone （GitHub URL）
cd cs4-2025-class3-team2-project

### 2. 仮想環境を作成
python -m venv venv
source venv/bin/activate

### 3. 必要パッケージをインストール
pip install -r requirements.txt

### 4. 環境変数を設定
.env を作成し、以下を設定

SECRET_KEY='your_secret_key'
DB_NAME='your_db_name'
DB_USER='your_db_user'
DB_PASSWORD='your_db_password'
DB_HOST=localhost
DB_PORT=5432

### 5. マイグレーション
python manage.py makemigrations
python manage.py migrate

### 6. サーバー起動
python manage.py runserver

### 7. アクセス
http://127.0.0.1:8000/


複数ユーザーでの挙動確認のため、

別ブラウザ
シークレットモード
別Googleアカウント

などを利用して複数ログインを行うことで、
同一パソコン上でもUSER_ORDERごとの表示差分を確認できます。

---

### 工夫した点
1. 同じ画面なのに「見えている情報が違う」体験

全員が同じURL・同じ掲示板を見ているように見せつつ、
window.USER_ORDER
を利用して

表示される文章
hint
裏ページへの導線
URL出現条件

をユーザーごとに変化させました。

これにより、「自分には見えていない情報が他人には見えている」というARGらしい違和感を演出しました。

2. WebSocketを用いたリアルタイム進行

通常の掲示板ではなく、投稿が即時反映される、NPCの投稿が流れる、特定ワード検出でイベント開始

等の工夫をし、よりリアルな謎解き体験に近づけるようにしました。

3. 実在事件との接続

最終的に「麹町中学校内申書事件」へ到達する設計にし、フィクションの大学掲示板の問題が現実社会の評価・選別・記録の問題へ繋がる構成にしました。

エンタメ性だけでなく、テーマ性のあるARGを目指しました。

## 実際の画面

### ログイン画面
![ログイン画面](image/enshu_login.png)

### メイン画面
![メイン画面](image/enshu_main1.png)
![メイン画面2](image/enshu_main.png)

### 通常の掲示板画面
![掲示板](image/enshu_talk.png)

### 裏ページ（A/B/C）
![裏ページA](image/enshu_a.png)
![裏ページB](image/enshu_b.png)
![裏ページC](image/enshu_c.png)

### 最終ワード入力時
![URLポップアップ](image/enshu_word.png)

### 最終ページ
![最終ページ](image/enshu_last.png)